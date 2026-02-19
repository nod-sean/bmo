(function (global) {
    'use strict';

    const DEFAULT_FIELD_EVENT_TYPES = Object.freeze({
        BANDIT: 2001,
        BANDIT_LEADER: 2002,
        DUNGEON: 2010,
        PORTAL: 2020,
        CARAVAN: 2030,
        CROWN: 2040
    });
    const DEFAULT_DRAGON_BOSS_CONFIG = Object.freeze({
        baseRewards: Object.freeze({ gold: 3000, gem: 20, energy: 15, cp: 5, points: 25 }),
        tierMultiplier: Object.freeze({ s: 2.0, a: 1.5, b: 1.2, c: 1.0 }),
        minShareByTier: Object.freeze({ s: 0.5, a: 0.3, b: 0.15 }),
        killBonusGold: 500,
        killBonusPoints: 50
    });

    function resolveDragonBossConfig(rawConfig) {
        const raw = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
        const baseRaw = raw.baseRewards && typeof raw.baseRewards === 'object' ? raw.baseRewards : {};
        const mulRaw = raw.tierMultiplier && typeof raw.tierMultiplier === 'object' ? raw.tierMultiplier : {};
        const shareRaw = raw.minShareByTier && typeof raw.minShareByTier === 'object' ? raw.minShareByTier : {};
        const n = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
        return {
            baseRewards: {
                gold: Math.max(0, n(baseRaw.gold, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.gold)),
                gem: Math.max(0, n(baseRaw.gem, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.gem)),
                energy: Math.max(0, n(baseRaw.energy, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.energy)),
                cp: Math.max(0, n(baseRaw.cp, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.cp)),
                points: Math.max(0, n(baseRaw.points, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.points))
            },
            tierMultiplier: {
                s: Math.max(0, n(mulRaw.s, DEFAULT_DRAGON_BOSS_CONFIG.tierMultiplier.s)),
                a: Math.max(0, n(mulRaw.a, DEFAULT_DRAGON_BOSS_CONFIG.tierMultiplier.a)),
                b: Math.max(0, n(mulRaw.b, DEFAULT_DRAGON_BOSS_CONFIG.tierMultiplier.b)),
                c: Math.max(0, n(mulRaw.c, DEFAULT_DRAGON_BOSS_CONFIG.tierMultiplier.c))
            },
            minShareByTier: {
                s: Math.max(0, Math.min(1, n(shareRaw.s, DEFAULT_DRAGON_BOSS_CONFIG.minShareByTier.s))),
                a: Math.max(0, Math.min(1, n(shareRaw.a, DEFAULT_DRAGON_BOSS_CONFIG.minShareByTier.a))),
                b: Math.max(0, Math.min(1, n(shareRaw.b, DEFAULT_DRAGON_BOSS_CONFIG.minShareByTier.b)))
            },
            killBonusGold: Math.max(0, n(raw.killBonusGold, DEFAULT_DRAGON_BOSS_CONFIG.killBonusGold)),
            killBonusPoints: Math.max(0, n(raw.killBonusPoints, DEFAULT_DRAGON_BOSS_CONFIG.killBonusPoints))
        };
    }

    function resolveBattleResultDeps(game, deps) {
        const src = (deps && typeof deps === 'object')
            ? deps
            : (game?.battleResultDeps && typeof game.battleResultDeps === 'object' ? game.battleResultDeps : {});
        const eventDropTable = Object.assign({}, src.EVENT_DROP_TABLE || {});
        const itemType = src.ITEM_TYPE || {
            BUILDING_CHEST: 4
        };
        const getCode = src.getCode || game?.getCode?.bind(game) || ((type, level) => (Number(type) * 100) + Number(level || 1));
        const getInfoFromCode = src.getInfoFromCode || game?.getInfoFromCode?.bind(game) || (() => null);
        const gameplay = (src.GAMEPLAY && typeof src.GAMEPLAY === 'object') ? src.GAMEPLAY : src;
        return {
            FOG_RADIUS: Number(src.FOG_RADIUS || 8),
            PLAYER_START: src.PLAYER_START || { r: 22, c: 7 },
            EVENT_DROP_TABLE: eventDropTable,
            FIELD_EVENT_TYPES: Object.assign({}, DEFAULT_FIELD_EVENT_TYPES, src.FIELD_EVENT_TYPES || {}),
            FIELD_MAP_DATA: src.FIELD_MAP_DATA || [],
            isGateTile: src.isGateTile || game?.isGateTile?.bind(game) || (() => false),
            isDragonTile: src.isDragonTile || game?.isDragonTile?.bind(game) || (() => false),
            ITEM_TYPE: itemType,
            getCode,
            getInfoFromCode,
            FIELD_OBJECT_REWARD_TABLE: src.FIELD_OBJECT_REWARD_TABLE || {},
            DRAGON_BOSS_CONFIG: src.DRAGON_BOSS_CONFIG || {},
            GAMEPLAY: gameplay
        };
    }

    function applyDefenderLoss(game, isWin) {
        const ctx = game.battleContext;
        if (!ctx || ctx.defenderLossApplied) return;
        ctx.defenderLossApplied = true;
        if (!ctx.baseDefenders || ctx.baseDefenders.length === 0) return;

        const key = `${ctx.r},${ctx.c}`;
        const foughtCounts = {};
        const survivorCounts = {};

        ctx.defenders.forEach((unit) => {
            const code = unit.defenderCode ?? unit.classType;
            foughtCounts[code] = (foughtCounts[code] || 0) + 1;
            if (unit.hp > 0) survivorCounts[code] = (survivorCounts[code] || 0) + 1;
        });

        if (isWin) {
            game.fieldDefenderState[key] = { type: ctx.targetCode, defenders: [] };
            window.KOVPersistenceModule.saveGame(game);
            return;
        }

        const updated = ctx.baseDefenders.map((d) => {
            const fought = foughtCounts[d.code] || 0;
            const survived = survivorCounts[d.code] || 0;
            const casualties = Math.max(0, fought - survived);
            const count = Math.max(0, (d.count || 0) - casualties);
            return { code: d.code, count, slot: d.slot };
        }).filter((d) => d.count > 0);

        game.fieldDefenderState[key] = { type: ctx.targetCode, defenders: updated.length > 0 ? updated : [] };
        window.KOVPersistenceModule.saveGame(game);
    }

    function applyAllyLoss(game) {
        const ctx = game.battleContext;
        if (!ctx || ctx.allyLossApplied) return;
        ctx.allyLossApplied = true;
        if (!ctx.squadRef || !Array.isArray(ctx.squadRef) || !ctx.allies) return;

        const deadSlots = new Set();
        ctx.allies.forEach((u) => {
            if (u && u.hp <= 0) deadSlots.add(u.slot);
        });
        if (!deadSlots.size) return;

        deadSlots.forEach((slot) => {
            if (slot >= 0 && slot < ctx.squadRef.length) ctx.squadRef[slot] = null;
        });

        window.KOVPersistenceModule.saveGame(game);
        game.requestRender();
    }

    function retreatArmyToBase(game, armyId, deps) {
        const resolved = resolveBattleResultDeps(game, deps);
        const army = game.armies?.[armyId];
        if (!army) return;
        army.state = 'IDLE';
        army.target = null;
        army.path = [];
        army.stepTimes = null;
        army.nextStepIndex = 0;
        army.moveInterval = 0;
        army.lastMoveTime = 0;
        army.r = resolved.PLAYER_START.r;
        army.c = resolved.PLAYER_START.c;
        window.KOVFieldEventLogicModule.revealFog(game, army.r, army.c, resolved.FOG_RADIUS, game.revealFogDeps);
        window.KOVFieldCommandModule.updateArmies(game, game.updateArmiesDeps);
        game.requestRender();
    }

    function handleEmptySquadRetreat(game, isWin, deps) {
        const resolved = resolveBattleResultDeps(game, deps);
        if (isWin) return;
        const ctx = game.battleContext;
        if (!ctx || !Array.isArray(ctx.squadRef)) return;
        const isEmpty = ctx.squadRef.every((u) => !u);
        if (!isEmpty) return;

        const armyId = Number.isFinite(ctx.armyId) ? ctx.armyId : game.lastSelectedArmyId;
        if (!Number.isFinite(armyId)) return;
        retreatArmyToBase(game, armyId, resolved);
    }

    function getFieldObjectRewardEntries(rewardCode, deps) {
        const resolved = resolveBattleResultDeps(null, deps);
        const raw = resolved.FIELD_OBJECT_REWARD_TABLE?.[rewardCode] ?? resolved.FIELD_OBJECT_REWARD_TABLE?.[String(rewardCode)];
        if (raw !== undefined && raw !== null) {
            if (Array.isArray(raw)) return raw;
            if (Array.isArray(raw.rewards)) return raw.rewards;
            if (typeof raw === 'object') return [raw];
        }

        if (rewardCode === 4 || rewardCode === resolved.ITEM_TYPE.BUILDING_CHEST) {
            return [{ kind: 'chest', level: 1, count: 1 }];
        }
        if (resolved.getInfoFromCode(rewardCode)) return [{ kind: 'item_code', code: rewardCode, count: 1 }];
        return [];
    }

    function rollRewardValue(min, max, fallback = 0) {
        const nMin = Number(min);
        const nMax = Number(max);
        if (Number.isFinite(nMin) && Number.isFinite(nMax)) {
            const lo = Math.min(nMin, nMax);
            const hi = Math.max(nMin, nMax);
            return Math.floor(Math.random() * (hi - lo + 1)) + lo;
        }
        if (Number.isFinite(nMin)) return Math.floor(nMin);
        if (Number.isFinite(nMax)) return Math.floor(nMax);
        return Math.floor(Number(fallback) || 0);
    }

    function resolveRewardCount(game, entry) {
        if (Array.isArray(entry?.count) && entry.count.length >= 2) {
            return Math.max(1, rollRewardValue(entry.count[0], entry.count[1], 1));
        }
        if (Number.isFinite(Number(entry?.count))) {
            return Math.max(1, Math.floor(Number(entry.count)));
        }
        return Math.max(1, rollRewardValue(entry?.min_count, entry?.max_count, 1));
    }

    function pickRewardFromPool(pool) {
        if (!Array.isArray(pool) || pool.length === 0) return null;
        const weighted = pool
            .map((entry) => ({ entry, weight: Math.max(0, Number(entry?.weight) || 1) }))
            .filter((item) => item.weight > 0);
        if (!weighted.length) return null;
        const total = weighted.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * total;
        for (const item of weighted) {
            roll -= item.weight;
            if (roll <= 0) return item.entry;
        }
        return weighted[weighted.length - 1].entry;
    }

    function createFieldObjectRewardSummary(rewardCode) {
        return {
            rewardCode: Number(rewardCode) || 0,
            granted: false,
            missed: false,
            gold: 0,
            energy: 0,
            cp: 0,
            gem: 0,
            chests: [],
            items: [],
            notes: []
        };
    }

    function addSummaryCount(list, key, count) {
        const targetKey = String(key);
        const amount = Math.max(0, Number(count) || 0);
        if (!amount) return;
        const found = list.find((entry) => String(entry.key) === targetKey);
        if (found) {
            found.count += amount;
            return;
        }
        list.push({ key: targetKey, count: amount });
    }

    function grantFieldObjectRewardEntry(game, entry, rewardCode, deps, summary, depth = 0) {
        const resolved = resolveBattleResultDeps(game, deps);
        if (!entry || typeof entry !== 'object' || depth > 3) return false;
        const chance = Number(entry.chance ?? 100);
        if (Number.isFinite(chance) && chance < 100 && (Math.random() * 100) > chance) return false;

        const kind = String(entry.kind || entry.type || '').toLowerCase().trim();
        if (!kind) return false;

        if (kind === 'random_pool' || kind === 'pool') {
            const selected = pickRewardFromPool(entry.pool);
            return grantFieldObjectRewardEntry(game, selected, rewardCode, resolved, summary, depth + 1);
        }

        if (kind === 'gold') {
            const amount = rollRewardValue(entry.min, entry.max, entry.amount);
            if (amount <= 0) return false;
            game.gold += amount;
            if (summary) summary.gold += amount;
            window.KOVUiShellModule.showToast(game, game.tr('toast.event_gold_gain', { value: amount }, `Gold obtained: ${amount}`));
            return true;
        }

        if (kind === 'energy') {
            const amount = rollRewardValue(entry.min, entry.max, entry.amount);
            if (amount <= 0) return false;
            const gained = Math.max(0, Math.min(amount, game.maxEnergy - game.energy));
            game.energy = Math.min(game.maxEnergy, game.energy + amount);
            if (summary) summary.energy += gained;
            window.KOVUiShellModule.showToast(game, game.tr('toast.energy_gain', { value: gained }, `+${gained}EN`));
            return gained > 0;
        }

        if (kind === 'cp') {
            const amount = rollRewardValue(entry.min, entry.max, entry.amount);
            if (amount <= 0) return false;
            const gained = Math.max(0, Math.min(amount, game.maxCp - game.cp));
            game.cp = Math.min(game.maxCp, game.cp + amount);
            if (summary) summary.cp += gained;
            window.KOVUiShellModule.showToast(game, game.tr('toast.cp_gain', { value: gained }, `+${gained}CP`));
            return gained > 0;
        }

        if (kind === 'gem' || kind === 'crystal') {
            const amount = rollRewardValue(entry.min, entry.max, entry.amount);
            if (amount <= 0) return false;
            game.gems += amount;
            if (summary) summary.gem += amount;
            window.KOVUiShellModule.showToast(game, game.tr('toast.gem_gain', { value: amount }, `+${amount}GEM`));
            return true;
        }

        if (kind === 'chest') {
            const level = Math.max(1, Math.floor(Number(entry.level) || 1));
            const count = resolveRewardCount(game, entry);
            let success = 0;
            for (let i = 0; i < count; i++) {
                if (window.KOVMergeBoardModule.spawnItem(game, { type: resolved.ITEM_TYPE.BUILDING_CHEST, level, scale: 0 }, game.spawnItemDeps)) success += 1;
            }
            if (success > 0) {
                const code = resolved.getCode(resolved.ITEM_TYPE.BUILDING_CHEST, level);
                if (summary) addSummaryCount(summary.chests, level, success);
                if (success > 1) window.KOVUiShellModule.showToast(game, game.tr('toast.reward_item_gain_count', { code, count: success }, `Item obtained (Code ${code}) x${success}`));
                else window.KOVUiShellModule.showToast(game, game.tr('toast.event_item_gain', { code }, `Item obtained (Code ${code})`));
            }
            if (success < count) {
                if (summary) summary.notes.push('chest_no_space');
                window.KOVUiShellModule.showToast(game, game.tr('toast.reward_chest_no_space', {}, 'Reward chest, but no space'));
            }
            return success > 0;
        }

        if (kind === 'item_code' || kind === 'item') {
            const code = Number(entry.code);
            const info = resolved.getInfoFromCode(code);
            if (!info) return false;
            const count = resolveRewardCount(game, entry);
            let success = 0;
            for (let i = 0; i < count; i++) {
                if (window.KOVMergeBoardModule.spawnItem(game, { type: info.type, level: info.level, scale: 0 }, game.spawnItemDeps)) success += 1;
            }
            if (success > 0) {
                if (summary) addSummaryCount(summary.items, code, success);
                if (success > 1) window.KOVUiShellModule.showToast(game, game.tr('toast.reward_item_gain_count', { code, count: success }, `Item obtained (Code ${code}) x${success}`));
                else window.KOVUiShellModule.showToast(game, game.tr('toast.event_item_gain', { code }, `Item obtained (Code ${code})`));
            }
            if (success < count) {
                if (summary) summary.notes.push('item_no_space');
                window.KOVUiShellModule.showToast(game, game.tr('toast.reward_item_no_space', { code }, `Item obtained (Code ${code}), but no space`));
            }
            return success > 0;
        }

        if (kind === 'item_type' || kind === 'type') {
            const itemType = Number(entry.item_type ?? entry.itemType ?? entry.type_code ?? entry.typeCode);
            const level = Math.max(1, Math.floor(Number(entry.level) || 1));
            if (!Number.isFinite(itemType)) return false;
            const count = resolveRewardCount(game, entry);
            let success = 0;
            for (let i = 0; i < count; i++) {
                if (window.KOVMergeBoardModule.spawnItem(game, { type: itemType, level, scale: 0 }, game.spawnItemDeps)) success += 1;
            }
            const code = resolved.getCode(itemType, level);
            const finalCode = code || itemType;
            if (success > 0) {
                if (summary) addSummaryCount(summary.items, finalCode, success);
                if (success > 1) window.KOVUiShellModule.showToast(game, game.tr('toast.reward_item_gain_count', { code: finalCode, count: success }, `Item obtained (Code ${finalCode}) x${success}`));
                else window.KOVUiShellModule.showToast(game, game.tr('toast.event_item_gain', { code: finalCode }, `Item obtained (Code ${finalCode})`));
            }
            if (success < count) {
                if (summary) summary.notes.push('item_no_space');
                window.KOVUiShellModule.showToast(game, game.tr('toast.reward_item_no_space', { code: finalCode }, `Item obtained (Code ${finalCode}), but no space`));
            }
            return success > 0;
        }

        return false;
    }

    function applyFieldObjectReward(game, type, deps) {
        const resolved = resolveBattleResultDeps(game, deps);
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        const rewardCode = Number(data?.reward);
        if (!Number.isFinite(rewardCode) || rewardCode <= 0) {
            game.lastFieldObjectRewardSummary = null;
            return null;
        }

        const summary = createFieldObjectRewardSummary(rewardCode);

        const entries = getFieldObjectRewardEntries(rewardCode, resolved);
        if (!entries.length) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.reward_unknown', { code: rewardCode }, `Reward obtained (Code ${rewardCode})`));
            summary.missed = true;
            game.lastFieldObjectRewardSummary = summary;
            return summary;
        }

        let granted = false;
        entries.forEach((entry) => {
            if (grantFieldObjectRewardEntry(game, entry, rewardCode, resolved, summary)) granted = true;
        });
        summary.granted = granted;
        summary.missed = !granted;
        if (!granted) window.KOVUiShellModule.showToast(game, game.tr('toast.reward_missed', { code: rewardCode }, `Reward roll missed (Code ${rewardCode})`));
        game.lastFieldObjectRewardSummary = summary;
        return summary;
    }

    function handleBattleWin(game, r, c, deps) {
        const resolved = resolveBattleResultDeps(game, deps);
        const army = game.armies[game.lastSelectedArmyId] || game.armies.find((a) => game.battleContext && a.id === game.battleContext.armyId) || game.armies[0];
        if (game.lastSelectedArmyId !== null && game.lastSelectedArmyId !== undefined) {
            const a = game.armies[game.lastSelectedArmyId];
            if (a) {
                a.r = r;
                a.c = c;
                window.KOVFieldEventLogicModule.revealFog(game, r, c, resolved.FOG_RADIUS, game.revealFogDeps);
                window.KOVFieldCommandModule.updateArmies(game, game.updateArmiesDeps);
            }
        }

        const key = `${r},${c}`;
        if (game.fieldDefenderState && game.fieldDefenderState[key]) delete game.fieldDefenderState[key];

        if (game.fieldEvents[key]) {
            const evt = game.fieldEvents[key];
            const drop = resolved.EVENT_DROP_TABLE[evt.type];
            if (drop) {
                const gMin = drop.gold[0], gMax = drop.gold[1];
                const gold = Math.floor(Math.random() * (gMax - gMin + 1)) + gMin;
                game.gold += gold;
                window.KOVUiShellModule.showToast(game, game.tr('toast.event_gold_gain', { value: gold }, `Gold obtained: ${gold}`));

                drop.items.forEach((d) => {
                    if (Math.random() * 100 < d.prob) {
                        window.KOVUiShellModule.showToast(game, game.tr('toast.event_item_gain', { code: d.code }, `Item obtained (Code ${d.code})`));
                    }
                });
            }

            if (evt.type === resolved.FIELD_EVENT_TYPES.CROWN) {
                window.KOVFieldEconomyModule.onCrownCaptured(game, r, c, { GAMEPLAY: resolved.GAMEPLAY });
            }

            delete game.fieldEvents[key];
            const marker = document.querySelector(`.event-marker[data-r="${r}"][data-c="${c}"]`)
                || document.querySelector(`.event-marker[style*="left: ${50 + c * 13}px"][style*="top: ${50 + r * 13}px"]`)
                || document.querySelector(`.event-marker[style*="left: ${c * 13}px"][style*="top: ${r * 13}px"]`);
            if (marker) marker.remove();

            window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
            if (!evt.captureAfterWin) {
                window.KOVPersistenceModule.saveGame(game);
                return;
            }
        }

        if (game.occupiedTiles.has(key)) return;
        game.occupiedTiles.add(key);
        const type = resolved.FIELD_MAP_DATA?.[r]?.[c];
        if (type === undefined || type === null) return;

        if (resolved.isGateTile(type)) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.capture_gate', {}, 'Gate captured!'));
            game.sound.playUnlock();
            game.spawnParticles(game.width / 2, game.height / 2, '#FF0000', 50, 'confetti');
        } else if (resolved.isDragonTile(type)) {
            const dragonSummary = window.KOVDragonBossModule.finalizeDragonBossKill(
                game,
                resolveDragonBossConfig(resolved.DRAGON_BOSS_CONFIG)
            );
            window.KOVUiShellModule.showToast(game, game.tr('toast.dragon_kill', {}, 'Dragon defeated!'));
            if (dragonSummary) {
                const pct = Math.round(Math.max(0, Math.min(1, Number(dragonSummary.contributionShare) || 0)) * 100);
                window.KOVUiShellModule.showToast(game, game.tr('toast.dragon_contribution_tier', { tier: dragonSummary.tier, share: pct }, `Dragon contribution: ${dragonSummary.tier} (${pct}%)`));
            }
            game.sound.playUnlock();
            game.spawnParticles(game.width / 2, game.height / 2, '#ff6b6b', 50, 'confetti');
            setTimeout(() => window.KOVFieldEventUiModule.showVictoryModal(game, dragonSummary), 2000);
        } else {
            window.KOVUiShellModule.showToast(game, game.tr('toast.capture_success', {}, 'Capture successful!'));
            game.sound.playCollect();
        }

        const effectMsg = window.KOVFieldUiModule.getCaptureEffectToast(game, type, game.captureEffectDeps);
        if (effectMsg) window.KOVFieldUiModule.pushEffectLog(game, effectMsg);
        applyFieldObjectReward(game, type, resolved);

        window.KOVFieldFlowModule.updateOpenBorders(game, game.fieldFlowDeps);
        if (document.getElementById('field-modal').classList.contains('open')) {
            if (!window.KOVFieldUiModule.refreshFieldMapVisuals(game, game.fieldUiVisualDeps)) {
                window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
            } else if (game.currentFieldTargetKey === key) {
                window.KOVFieldUiModule.setFieldInfo(game, resolved.FIELD_MAP_DATA?.[r]?.[c], r, c, game.fieldInfoDeps);
            }
        }
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        window.KOVPersistenceModule.saveGame(game);
    }

    global.KOVBattleResultModule = {
        applyDefenderLoss,
        applyAllyLoss,
        handleEmptySquadRetreat,
        retreatArmyToBase,
        getFieldObjectRewardEntries,
        rollRewardValue,
        resolveRewardCount,
        pickRewardFromPool,
        createFieldObjectRewardSummary,
        grantFieldObjectRewardEntry,
        applyFieldObjectReward,
        handleBattleWin
    };
})(window);



