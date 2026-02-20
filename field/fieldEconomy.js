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

    function resolveFieldEventTypes(deps) {
        const raw = deps?.FIELD_EVENT_TYPES;
        if (raw && typeof raw === 'object') return Object.assign({}, DEFAULT_FIELD_EVENT_TYPES, raw);
        return DEFAULT_FIELD_EVENT_TYPES;
    }

    function ensureCrownState(game) {
        if (!game.crownState || typeof game.crownState !== 'object') {
            game.crownState = { holderKey: null, capturedAt: 0, kingCastleKey: null, promotedAt: 0 };
        }
        if (!Object.prototype.hasOwnProperty.call(game.crownState, 'holderKey')) game.crownState.holderKey = null;
        if (!Object.prototype.hasOwnProperty.call(game.crownState, 'capturedAt')) game.crownState.capturedAt = 0;
        if (!Object.prototype.hasOwnProperty.call(game.crownState, 'kingCastleKey')) game.crownState.kingCastleKey = null;
        if (!Object.prototype.hasOwnProperty.call(game.crownState, 'promotedAt')) game.crownState.promotedAt = 0;
        return game.crownState;
    }

    function isKingCastleTile(game, r, c) {
        const state = ensureCrownState(game);
        return state.kingCastleKey === `${r},${c}`;
    }

    function getOwnedCitadelEntries(game, deps) {
        const out = [];
        game.occupiedTiles.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            const type = deps.FIELD_MAP_DATA?.[r]?.[c];
            if (!deps.isCitadelTile(type)) return;
            out.push({
                key,
                r,
                c,
                type,
                level: window.KOVFieldStateModule.getFieldLevel(game, type, game.fieldLevelDeps) || 1
            });
        });
        return out;
    }

    function pickKingCastleKey(candidates, preferredKey, mapSize) {
        if (!Array.isArray(candidates) || !candidates.length) return null;
        if (preferredKey) {
            const found = candidates.find((entry) => entry.key === preferredKey);
            if (found) return found.key;
        }
        const center = (mapSize - 1) / 2;
        const sorted = [...candidates].sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            const da = Math.abs(a.r - center) + Math.abs(a.c - center);
            const db = Math.abs(b.r - center) + Math.abs(b.c - center);
            return da - db;
        });
        return sorted[0]?.key || null;
    }

    function onCrownCaptured(game, r, c, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (!gp.ENABLE_CROWN_CASTLE) return;
        const state = ensureCrownState(game);
        const key = `${r},${c}`;
        state.holderKey = key;
        state.capturedAt = Date.now();
        state.kingCastleKey = null;
        state.promotedAt = 0;

        const holdMin = Math.max(1, Math.round(gp.CROWN_HOLD_MS / 60000));
        window.KOVUiShellModule.showToast(game, game.tr('toast.crown_captured', { minutes: holdMin }, `Crown captured! Hold for ${holdMin}m to build King Castle.`));
        window.KOVFieldUiModule.pushEffectLog(game, game.tr('ui.field.effect.crown_captured', { minutes: holdMin }, `Crown captured (${holdMin}m hold started)`));
    }

    function ensureCrownEventSpawned(game, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (!gp.ENABLE_CROWN_CASTLE) return false;
        const FIELD_EVENT_TYPES = resolveFieldEventTypes(deps);
        const state = ensureCrownState(game);
        if (state.holderKey || state.kingCastleKey) return false;

        const hasCrownEvent = Object.values(game.fieldEvents || {}).some((evt) => evt && evt.type === FIELD_EVENT_TYPES.CROWN);
        if (hasCrownEvent) return false;

        const candidates = [];
        for (let r = 0; r < deps.MAP_SIZE; r++) {
            for (let c = 0; c < deps.MAP_SIZE; c++) {
                const terrain = deps.FIELD_MAP_DATA?.[r]?.[c];
                if (terrain === undefined) continue;
                if (terrain === 0) continue;
                if (deps.isBlockingField(terrain)) continue;
                if (deps.isBorderTerrain(terrain)) continue;
                if (Math.abs(r - deps.PLAYER_START.r) < 3 && Math.abs(c - deps.PLAYER_START.c) < 3) continue;
                const key = `${r},${c}`;
                if (game.fieldEvents[key]) continue;
                if (game.occupiedTiles.has(key)) continue;
                candidates.push({ key, r, c });
            }
        }
        if (!candidates.length) return false;

        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        game.fieldEvents[picked.key] = {
            type: FIELD_EVENT_TYPES.CROWN,
            id: `crown_${picked.r}_${picked.c}_${Date.now()}`,
            r: picked.r,
            c: picked.c,
            captureAfterWin: true
        };
        return true;
    }

    function syncCrownEventState(game, deps) {
        const gp = deps.GAMEPLAY || deps;
        const FIELD_EVENT_TYPES = resolveFieldEventTypes(deps);
        if (!gp.ENABLE_CROWN_CASTLE) {
            const state = ensureCrownState(game);
            state.holderKey = null;
            state.capturedAt = 0;
            state.kingCastleKey = null;
            state.promotedAt = 0;
            Object.keys(game.fieldEvents || {}).forEach((key) => {
                const evt = game.fieldEvents[key];
                if (evt && evt.type === FIELD_EVENT_TYPES.CROWN) delete game.fieldEvents[key];
            });
            return;
        }
        const state = ensureCrownState(game);
        const hasOwnership = !!state.holderKey || !!state.kingCastleKey;
        if (hasOwnership) {
            Object.keys(game.fieldEvents || {}).forEach((key) => {
                const evt = game.fieldEvents[key];
                if (evt && evt.type === FIELD_EVENT_TYPES.CROWN) delete game.fieldEvents[key];
            });
            return;
        }
        ensureCrownEventSpawned(game, deps);
    }

    function updateCrownAndCastleState(game, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (!gp.ENABLE_CROWN_CASTLE) return false;
        const state = ensureCrownState(game);
        let changed = false;

        if (state.kingCastleKey && !game.occupiedTiles.has(state.kingCastleKey)) {
            state.holderKey = null;
            state.capturedAt = 0;
            state.kingCastleKey = null;
            state.promotedAt = 0;
            window.KOVUiShellModule.showToast(game, game.tr('toast.king_castle_lost', {}, 'King Castle lost. Crown has returned to the field.'));
            window.KOVFieldUiModule.pushEffectLog(game, game.tr('ui.field.effect.king_castle_lost', {}, 'King Castle lost'));
            changed = true;
        } else if (state.holderKey && !game.occupiedTiles.has(state.holderKey)) {
            state.holderKey = null;
            state.capturedAt = 0;
            state.kingCastleKey = null;
            state.promotedAt = 0;
            window.KOVUiShellModule.showToast(game, game.tr('toast.crown_lost', {}, 'Crown control lost.'));
            changed = true;
        }

        if (!state.holderKey) {
            if (ensureCrownEventSpawned(game, deps)) {
                window.KOVUiShellModule.showToast(game, game.tr('toast.crown_spawned', {}, 'A Crown appeared on the field.'));
                changed = true;
            }
            return changed;
        }

        if (!state.kingCastleKey) {
            const heldMs = Date.now() - Number(state.capturedAt || 0);
            if (heldMs >= gp.CROWN_HOLD_MS) {
                const citadels = getOwnedCitadelEntries(game, deps);
                if (citadels.length > 0) {
                    const promotedKey = pickKingCastleKey(citadels, state.holderKey, deps.MAP_SIZE);
                    if (promotedKey) {
                        state.holderKey = promotedKey;
                        state.kingCastleKey = promotedKey;
                        state.promotedAt = Date.now();
                        window.KOVUiShellModule.showToast(game, game.tr('toast.king_castle_established', {}, 'King Castle established!'));
                        window.KOVFieldUiModule.pushEffectLog(game, game.tr('ui.field.effect.king_castle_established', {}, 'King Castle established'));
                        changed = true;
                    }
                }
            }
        }

        return changed;
    }

    function getRebellionCandidates(game, deps) {
        const out = [];
        game.occupiedTiles.forEach((key) => {
            if (key === `${deps.PLAYER_START.r},${deps.PLAYER_START.c}`) return;
            const [r, c] = key.split(',').map(Number);
            const type = deps.FIELD_MAP_DATA?.[r]?.[c];
            if (deps.isGateTile(type) || deps.isCitadelTile(type)) out.push({ key, r, c, type });
        });
        return out;
    }

    function triggerRebellionAt(game, candidate, reason, deps) {
        const FIELD_EVENT_TYPES = resolveFieldEventTypes(deps);
        if (!candidate) return false;
        const { key, r, c, type } = candidate;
        if (game.fieldEvents[key]) return false;
        if (!game.occupiedTiles.has(key)) return false;

        game.occupiedTiles.delete(key);
        if (!game.rebellionState || typeof game.rebellionState !== 'object') game.rebellionState = { lastByKey: {} };
        if (!game.rebellionState.lastByKey || typeof game.rebellionState.lastByKey !== 'object') game.rebellionState.lastByKey = {};
        game.rebellionState.lastByKey[key] = Date.now();

        game.fieldEvents[key] = {
            type: deps.isCitadelTile(type) ? FIELD_EVENT_TYPES.BANDIT_LEADER : FIELD_EVENT_TYPES.BANDIT,
            id: `rebellion_${r}_${c}_${Date.now()}`,
            r,
            c,
            rebellion: true,
            reason,
            captureAfterWin: true
        };

        const targetName = isKingCastleTile(game, r, c)
            ? game.tr('ui.field.object.king_castle', {}, 'King Castle')
            : window.KOVFieldNavigationModule.objectTypeNameByCode(game, type, game.fieldNavDeps);
        if (reason === 'unpaid') {
            window.KOVUiShellModule.showToast(game, game.tr('toast.rebellion_unpaid', { name: targetName }, `Rebellion! Upkeep unpaid at ${targetName}`));
        } else {
            window.KOVUiShellModule.showToast(game, game.tr('toast.rebellion_random', { name: targetName }, `Rebellion at ${targetName}`));
        }
        window.KOVFieldUiModule.pushEffectLog(game, game.tr('ui.field.effect.rebellion', { name: targetName }, `Rebellion: ${targetName}`));

        window.KOVFieldStateModule.recalcFieldBonuses(game, game.fieldBonusDeps);
        window.KOVFieldFlowModule.updateOpenBorders(game, game.fieldFlowDeps);
        game.requestRender();
        return true;
    }

    function maybeTriggerRebellion(game, options, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (!gp.ENABLE_REBELLION) return false;
        const params = options || {};
        const unpaid = !!params.unpaid;
        const totalUpkeep = Number(params.totalUpkeep || 0);
        const totalTax = Number(params.totalTax || 0);

        const worldRule = window.KOVWorldSeasonModule.getGameWorldRuleSet(game);
        if (!worldRule.allowRebellion) return false;

        const candidates = getRebellionCandidates(game, deps);
        if (!candidates.length) return false;

        const now = Date.now();
        if (!game.rebellionState || typeof game.rebellionState !== 'object') game.rebellionState = { lastByKey: {} };
        if (!game.rebellionState.lastByKey || typeof game.rebellionState.lastByKey !== 'object') game.rebellionState.lastByKey = {};

        const eligible = candidates.filter((c) => {
            const last = Number(game.rebellionState.lastByKey[c.key] || 0);
            return now - last >= gp.REBELLION_COOLDOWN_MS;
        });
        if (!eligible.length) return false;

        const randomMultiplier = Number.isFinite(Number(worldRule.rebellionRandomMultiplier))
            ? Math.max(0, Number(worldRule.rebellionRandomMultiplier))
            : 1;
        const unpaidMultiplier = Number.isFinite(Number(worldRule.rebellionUnpaidMultiplier))
            ? Math.max(0, Number(worldRule.rebellionUnpaidMultiplier))
            : 1;

        let chance = gp.REBELLION_RANDOM_CHANCE * randomMultiplier;
        if (unpaid) {
            const deficitBase = Math.max(0, totalUpkeep - Math.max(0, game.gold + totalTax));
            const ratio = totalUpkeep > 0 ? Math.min(1, deficitBase / totalUpkeep) : 1;
            chance = Math.max(
                gp.REBELLION_UNPAID_CHANCE * (0.5 + ratio * 0.5) * unpaidMultiplier,
                gp.REBELLION_RANDOM_CHANCE * randomMultiplier
            );
        }
        chance = Math.min(1, Math.max(0, chance));

        if (Math.random() >= chance) return false;
        const pick = eligible[Math.floor(Math.random() * eligible.length)];
        return triggerRebellionAt(game, pick, unpaid ? 'unpaid' : 'random', deps);
    }

    function collectTerritoryIncome(game, deps) {
        const gp = deps.GAMEPLAY || deps;
        const crownChanged = updateCrownAndCastleState(game, deps);
        const worldEnded = window.KOVWorldSeasonModule.evaluateWorldEndCondition(game);
        if (game.occupiedTiles.size > 0) {
            let totalTax = 0;
            let totalUpkeep = 0;
            let totalHourlyGold = 0;
            game.occupiedTiles.forEach((key) => {
                const [r, c] = key.split(',').map(Number);
                const type = deps.FIELD_MAP_DATA[r][c];
                if (deps.isShopTile(type) || deps.isTavernTile(type)) {
                    totalHourlyGold += window.KOVWorldSeasonModule.getFacilityHourlyGoldIncome(game, type, {
                        GAMEPLAY: gp,
                        ABILITY_CODES: deps.ABILITY_CODES,
                        isShopTile: deps.isShopTile,
                        isTavernTile: deps.isTavernTile,
                        SHOP_HOURLY_GOLD_FALLBACK: gp.SHOP_HOURLY_GOLD_FALLBACK,
                        TAVERN_HOURLY_GOLD_FALLBACK: gp.TAVERN_HOURLY_GOLD_FALLBACK
                    });
                } else {
                    totalTax += window.KOVWorldSeasonModule.getTaxRate(game, type, {
                        ABILITY_CODES: deps.ABILITY_CODES
                    });
                }
                totalUpkeep += window.KOVWorldSeasonModule.getUpkeepCost(game, type, {
                    ABILITY_CODES: deps.ABILITY_CODES
                });
            });
            const baseNet = totalTax - totalUpkeep;
            const hourlyPerTick = totalHourlyGold / 1200;
            game.hourlyIncomeRemainder = (game.hourlyIncomeRemainder || 0) + hourlyPerTick;
            const facilityGain = Math.floor(game.hourlyIncomeRemainder);
            if (facilityGain > 0) game.hourlyIncomeRemainder -= facilityGain;
            const net = baseNet + facilityGain;
            const unpaid = totalUpkeep > Math.max(0, game.gold + Math.max(0, totalTax) + Math.max(0, facilityGain));
            game.income = Math.round((baseNet + hourlyPerTick) * 100) / 100;
            game.gold += net;
            const rebellionTriggered = maybeTriggerRebellion(game, { unpaid, totalUpkeep, totalTax }, deps);
            window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
            const isFieldOpen = document.getElementById('field-modal')?.classList.contains('open');
            const isBattleOpen = document.getElementById('modal-battle')?.classList.contains('open')
                || document.getElementById('modal-battle-prep')?.classList.contains('open');
            if (net !== 0 && isFieldOpen && !isBattleOpen) {
                const sign = net >= 0 ? '+' : '';
                window.KOVUiShellModule.showFloatingText(`${sign}${net} G (Tax)`, net >= 0 ? '#ffd700' : '#f87171');
            }
            if (crownChanged && document.getElementById('field-modal').classList.contains('open')) {
                if (!window.KOVFieldUiModule.refreshFieldMapVisuals(game, game.fieldUiVisualDeps)) {
                    window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
                } else if (game.currentFieldTargetKey) {
                    const [tr, tc] = game.currentFieldTargetKey.split(',').map(Number);
                    if (!Number.isNaN(tr) && !Number.isNaN(tc)) {
                        const eventAtTarget = game.fieldEvents?.[`${tr},${tc}`];
                        window.KOVFieldUiModule.setFieldInfo(game, eventAtTarget ? eventAtTarget.type : deps.FIELD_MAP_DATA[tr][tc], tr, tc, game.fieldInfoDeps);
                    }
                }
            }
            if (rebellionTriggered || crownChanged || worldEnded) window.KOVPersistenceModule.saveGame(game);
        } else {
            game.income = 0;
            game.hourlyIncomeRemainder = 0;
            if (crownChanged || worldEnded) window.KOVPersistenceModule.saveGame(game);
        }
    }

    global.KOVFieldEconomyModule = {
        ensureCrownState,
        isKingCastleTile,
        getOwnedCitadelEntries,
        pickKingCastleKey,
        onCrownCaptured,
        ensureCrownEventSpawned,
        syncCrownEventState,
        updateCrownAndCastleState,
        getRebellionCandidates,
        triggerRebellionAt,
        maybeTriggerRebellion,
        collectTerritoryIncome
    };
})(window);



