(function (global) {
    'use strict';

    function normalizeWorldRuleSetName(value, keys) {
        const mode = String(value || '').trim().toLowerCase();
        if (mode === keys.KIND) return keys.KIND;
        if (mode === keys.CRUEL) return keys.CRUEL;
        return keys.NEUTRAL;
    }

    function getWorldRuleSet(ruleSets, keys, mode) {
        const normalized = normalizeWorldRuleSetName(mode, keys);
        return ruleSets[normalized] || ruleSets[keys.NEUTRAL];
    }

    function getGameWorldRuleSetName(game) {
        const keys = game.worldRuleSetKeys || { KIND: 'kind', NEUTRAL: 'neutral', CRUEL: 'cruel' };
        return normalizeWorldRuleSetName(game.worldRuleSet, keys);
    }

    function getGameWorldRuleSet(game) {
        const keys = game.worldRuleSetKeys || { KIND: 'kind', NEUTRAL: 'neutral', CRUEL: 'cruel' };
        const sets = game.worldRuleSets || {};
        return getWorldRuleSet(sets, keys, getGameWorldRuleSetName(game));
    }

    function getWorldRuleSetLabel(game, mode, keys) {
        const normalized = normalizeWorldRuleSetName(mode, keys);
        if (normalized === keys.KIND) return game.tr('ui.world_ruleset.kind', {}, 'Kind');
        if (normalized === keys.CRUEL) return game.tr('ui.world_ruleset.cruel', {}, 'Cruel');
        return game.tr('ui.world_ruleset.neutral', {}, 'Neutral');
    }

    function setWorldRuleSet(game, mode, opts = {}, deps) {
        const next = normalizeWorldRuleSetName(
            mode,
            deps?.WORLD_RULESET_KEYS || { KIND: 'kind', NEUTRAL: 'neutral', CRUEL: 'cruel' }
        );
        const persist = opts.persist !== false;
        if (game.worldRuleSet === next) return next;
        game.worldRuleSet = next;
        window.KOVFieldStateModule.recalcFieldBonuses(game, game.fieldBonusDeps);
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        if (persist) window.KOVPersistenceModule.saveGame(game);
        return next;
    }

    function onWorldRuleSetChange(game, mode) {
        const applied = setWorldRuleSet(game, mode, { persist: true }, {
            WORLD_RULESET_KEYS: { KIND: 'kind', NEUTRAL: 'neutral', CRUEL: 'cruel' }
        });
        const label = getWorldRuleSetLabel(game, applied, { KIND: 'kind', NEUTRAL: 'neutral', CRUEL: 'cruel' });
        window.KOVUiShellModule.showToast(game, game.tr('toast.world_ruleset_changed', { mode: label }, `World ruleset: ${label}`));
        window.KOVUiShellModule.refreshLocaleControls(game, game.localeControlDeps);
    }

    function scaleWorldCost(baseCost, multiplier) {
        const base = Number(baseCost);
        if (!Number.isFinite(base) || base <= 0) return 0;
        const mult = Number.isFinite(Number(multiplier)) ? Math.max(0, Number(multiplier)) : 1;
        const scaled = Math.round(base * mult);
        if (mult > 0 && scaled <= 0) return 1;
        return Math.max(0, scaled);
    }

    function getMoveCostsByRule(tileType, ruleSet, cpCostPerCommand, deps) {
        let energyCost = 1;
        let goldCost = 0;
        if (deps.isGateTile(tileType)) {
            energyCost = 5;
            goldCost = 100;
        }
        return {
            energyCost: scaleWorldCost(energyCost, ruleSet.moveEnergyMultiplier),
            goldCost: scaleWorldCost(goldCost, ruleSet.moveGoldMultiplier),
            cpCost: scaleWorldCost(cpCostPerCommand, ruleSet.cpCostMultiplier)
        };
    }

    function getTaxRate(game, type, deps) {
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        let baseTax = 1;
        if (data) {
            const tax = window.KOVFieldStateModule.getAbilityValue(data, deps.ABILITY_CODES.TAX);
            baseTax = tax > 0 ? tax : 1;
        }
        return scaleWorldCost(baseTax, getGameWorldRuleSet(game).taxMultiplier);
    }

    function getUpkeepCost(game, type, deps) {
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        if (!data) return 0;
        const upkeep = window.KOVFieldStateModule.getAbilityValue(data, deps.ABILITY_CODES.UPKEEP);
        return scaleWorldCost(upkeep || 0, getGameWorldRuleSet(game).upkeepMultiplier);
    }

    function getFacilityHourlyGoldIncome(game, type, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (!deps.isShopTile(type) && !deps.isTavernTile(type)) return 0;
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        const taxAbility = window.KOVFieldStateModule.getAbilityValue(data, deps.ABILITY_CODES.TAX);
        if (taxAbility > 0) return taxAbility;
        if (deps.isShopTile(type)) return gp.SHOP_HOURLY_GOLD_FALLBACK;
        if (deps.isTavernTile(type)) return gp.TAVERN_HOURLY_GOLD_FALLBACK;
        return 0;
    }

    function isWorldEnded(worldState) {
        return !!worldState?.ended;
    }

    function ensureWorldState(game) {
        if (!game.worldState || typeof game.worldState !== 'object') {
            game.worldState = { season: 1, ended: false, winner: null, reason: "", endedAt: 0, score: 0, rewardPackage: null, rewardsClaimed: false, dragonBoss: { season: 1, killCount: 0, byUid: {}, lastKill: null } };
        }
        if (!Object.prototype.hasOwnProperty.call(game.worldState, 'season')) game.worldState.season = 1;
        if (!Object.prototype.hasOwnProperty.call(game.worldState, 'ended')) game.worldState.ended = false;
        if (!Object.prototype.hasOwnProperty.call(game.worldState, 'winner')) game.worldState.winner = null;
        if (!Object.prototype.hasOwnProperty.call(game.worldState, 'reason')) game.worldState.reason = "";
        if (!Object.prototype.hasOwnProperty.call(game.worldState, 'endedAt')) game.worldState.endedAt = 0;
        if (!Object.prototype.hasOwnProperty.call(game.worldState, 'score')) game.worldState.score = 0;
        if (!Object.prototype.hasOwnProperty.call(game.worldState, 'rewardPackage')) game.worldState.rewardPackage = null;
        if (!Object.prototype.hasOwnProperty.call(game.worldState, 'rewardsClaimed')) game.worldState.rewardsClaimed = false;
        if (!Object.prototype.hasOwnProperty.call(game.worldState, 'dragonBoss')) {
            game.worldState.dragonBoss = { season: Number(game.worldState.season || 1), killCount: 0, byUid: {}, lastKill: null };
        }
        ensureDragonBossState(game);
        return game.worldState;
    }

    function getLocalUid() {
        try {
            const uid = localStorage.getItem('kov_uid');
            if (uid) return uid;
        } catch (e) { }
        return 'local_player';
    }

    function ensureDragonBossState(game) {
        const world = game.worldState && typeof game.worldState === 'object' ? game.worldState : ensureWorldState(game);
        if (!world.dragonBoss || typeof world.dragonBoss !== 'object') {
            world.dragonBoss = { season: Number(world.season || 1), killCount: 0, byUid: {}, lastKill: null };
        }
        const boss = world.dragonBoss;
        if (!Object.prototype.hasOwnProperty.call(boss, 'season')) boss.season = Number(world.season || 1);
        if (!Object.prototype.hasOwnProperty.call(boss, 'killCount')) boss.killCount = 0;
        if (!Object.prototype.hasOwnProperty.call(boss, 'byUid') || typeof boss.byUid !== 'object' || Array.isArray(boss.byUid)) boss.byUid = {};
        if (!Object.prototype.hasOwnProperty.call(boss, 'lastKill')) boss.lastKill = null;

        const currentSeason = Math.max(1, Number(world.season || 1));
        if (Number(boss.season || 0) !== currentSeason) {
            world.dragonBoss = { season: currentSeason, killCount: 0, byUid: {}, lastKill: null };
            return world.dragonBoss;
        }
        return boss;
    }

    function isWorldActionsLocked(worldState, endConditions) {
        return isWorldEnded(worldState) && !!endConditions?.lockActionsOnEnd;
    }

    function guardWorldAction(game, action, worldState, endConditions) {
        if (!isWorldActionsLocked(worldState, endConditions)) return false;
        window.KOVUiShellModule.showToast(game, game.tr('toast.world_end_locked', { action }, `World ended: ${action} is locked`));
        return true;
    }

    function getWorldPresetLabel(game, presetId, config) {
        if (config?.label) return config.label;
        const key = String(presetId || '').trim().toLowerCase();
        if (key === 'hardcore') return game.tr('ui.admin.preset.hardcore', {}, 'Hardcore');
        if (key === 'seasonal') return game.tr('ui.admin.preset.seasonal', {}, 'Seasonal');
        return game.tr('ui.admin.preset.regular', {}, 'Regular');
    }

    function ensureAdminState(game, deps) {
        if (!game.adminState || typeof game.adminState !== 'object') {
            game.adminState = {};
        }
        const fallbackPreset = deps.WORLD_PRESETS[deps.DEFAULT_WORLD_PRESET_ID] ? deps.DEFAULT_WORLD_PRESET_ID : 'regular';
        const rawPresetId = String(game.adminState.presetId || fallbackPreset).trim().toLowerCase();
        game.adminState.presetId = deps.WORLD_PRESETS[rawPresetId] ? rawPresetId : fallbackPreset;
        game.adminState.worldEndConditions = deps.parseWorldEndConditions(game.adminState.worldEndConditions || deps.WORLD_END_CONDITIONS);
        game.adminState.worldSeasonPolicy = deps.parseWorldSeasonPolicy(game.adminState.worldSeasonPolicy || deps.WORLD_SEASON_POLICY);
        return game.adminState;
    }

    function getActiveWorldPresetId(game, deps) {
        return ensureAdminState(game, deps).presetId;
    }

    function getWorldPresetConfig(game, presetId, deps) {
        const key = String(presetId || '').trim().toLowerCase();
        return deps.WORLD_PRESETS[key] || null;
    }

    function getActiveWorldEndConditions(game, deps) {
        return ensureAdminState(game, deps).worldEndConditions || deps.WORLD_END_CONDITIONS;
    }

    function getActiveWorldSeasonPolicy(game, deps) {
        return ensureAdminState(game, deps).worldSeasonPolicy || deps.WORLD_SEASON_POLICY;
    }

    function applyWorldPreset(game, presetId, deps, opts = {}) {
        const config = getWorldPresetConfig(game, presetId, deps);
        if (!config) return false;
        const state = ensureAdminState(game, deps);
        const key = String(presetId || '').trim().toLowerCase();
        state.presetId = key;
        state.worldEndConditions = deps.parseWorldEndConditions(config.worldEndConditions);
        state.worldSeasonPolicy = deps.parseWorldSeasonPolicy(config.seasonPolicy);
        setWorldRuleSet(game, config.ruleSet, { persist: false }, {
            WORLD_RULESET_KEYS: { KIND: 'kind', NEUTRAL: 'neutral', CRUEL: 'cruel' }
        });
        window.KOVUiShellModule.refreshLocaleControls(game, game.localeControlDeps);
        if (opts.persist !== false) window.KOVPersistenceModule.saveGame(game);
        if (!opts.silent) {
            const label = getWorldPresetLabel(game, key, config);
            window.KOVUiShellModule.showToast(game, game.tr('toast.admin_preset_applied', { preset: label }, `Admin preset applied: ${label}`));
        }
        return true;
    }

    function getWorldScore(occupiedTiles, fieldMap, deps) {
        let score = 0;
        occupiedTiles.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            const type = fieldMap?.[r]?.[c];
            if (deps.isCitadelTile(type)) score += 25;
            else if (deps.isGateTile(type)) score += 10;
            else if (deps.isDragonTile(type)) score += 40;
            else if (deps.isShopTile(type) || deps.isTavernTile(type)) score += 6;
            else if (deps.isGoldMineTile(type) || deps.isFountainTile(type)) score += 4;
            else score += 1;
        });
        return Math.max(0, Math.floor(score));
    }

    function buildWorldEndRewardPackage(mode, reason, score, rewardConfig) {
        const modeMultiplier = Number(rewardConfig.modeMultiplier[mode] || 1);
        const reasonKey = (reason === 'score' || reason === 'king_castle_hold') ? reason : 'hybrid';
        const base = rewardConfig[reasonKey] || rewardConfig.hybrid;
        const safeScore = Math.max(0, Number(score) || 0);

        const gold = Math.floor((base.gold + (safeScore * rewardConfig.scoreGoldPerPoint)) * modeMultiplier);
        const gem = Math.max(1, Math.floor(base.gem * modeMultiplier));
        const energy = Math.max(1, Math.floor(base.energy * modeMultiplier));
        const cp = Math.max(1, Math.floor(base.cp * modeMultiplier));
        const points = Math.max(1, Math.floor((base.points + Math.floor(safeScore / 100) * rewardConfig.scorePointsPer100) * modeMultiplier));

        return { gold, gem, energy, cp, points };
    }

    function buildWorldEndRewardPackageForGame(game, reason, score, rewardConfig) {
        const mode = getGameWorldRuleSetName(game);
        const reasonKey = (reason === 'score' || reason === 'king_castle_hold') ? reason : 'hybrid';
        const safeScore = Math.max(0, Number(score) || 0);
        const reward = buildWorldEndRewardPackage(mode, reasonKey, safeScore, rewardConfig);
        return {
            reason: reasonKey,
            mode,
            score: safeScore,
            rewards: {
                gold: reward.gold,
                gem: reward.gem,
                energy: reward.energy,
                cp: reward.cp,
                points: reward.points
            }
        };
    }

    function renderWorldEndRewardRows(game, pkg) {
        if (!pkg || !pkg.rewards) return "";
        const rows = [];
        rows.push(`<div class="text-sm">- ${game.tr('ui.modal.world_end.reward_gold', { value: pkg.rewards.gold }, `Gold +${pkg.rewards.gold}`)}</div>`);
        rows.push(`<div class="text-sm">- ${game.tr('ui.modal.world_end.reward_gem', { value: pkg.rewards.gem }, `GEM +${pkg.rewards.gem}`)}</div>`);
        rows.push(`<div class="text-sm">- ${game.tr('ui.modal.world_end.reward_energy', { value: pkg.rewards.energy }, `Energy +${pkg.rewards.energy}`)}</div>`);
        rows.push(`<div class="text-sm">- ${game.tr('ui.modal.world_end.reward_cp', { value: pkg.rewards.cp }, `CP +${pkg.rewards.cp}`)}</div>`);
        rows.push(`<div class="text-sm">- ${game.tr('ui.modal.world_end.reward_points', { value: pkg.rewards.points }, `PT +${pkg.rewards.points}`)}</div>`);
        return rows.join('');
    }

    function claimWorldEndRewards(game, opts = {}) {
        const silent = !!opts.silent;
        const world = ensureWorldState(game);
        if (!world.ended) return false;
        if (world.rewardsClaimed) return false;
        const pkg = world.rewardPackage;
        if (!pkg || !pkg.rewards) return false;

        game.gold += Math.max(0, Number(pkg.rewards.gold) || 0);
        game.gem += Math.max(0, Number(pkg.rewards.gem) || 0);
        game.energy = Math.min(game.maxEnergy, game.energy + Math.max(0, Number(pkg.rewards.energy) || 0));
        game.cp = Math.min(game.maxCp, game.cp + Math.max(0, Number(pkg.rewards.cp) || 0));
        game.points = Math.max(0, Number(game.points || 0)) + Math.max(0, Number(pkg.rewards.points) || 0);

        world.rewardsClaimed = true;
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        window.KOVPersistenceModule.saveGame(game);
        if (!silent) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.world_end_rewards_claimed', {}, 'World end rewards claimed'));
            showWorldEndModal(game, world.reason || pkg.reason || 'score');
        }
        return true;
    }

    function applySeasonTransitionPolicy(game, deps) {
        const policy = getActiveWorldSeasonPolicy(game, game.worldAdminDeps);

        if (!policy.keepMergeGrid) {
            game.grid = Array(deps.CONFIG.gridRows).fill().map(() => Array(deps.CONFIG.gridCols).fill(null));
        }
        if (!policy.keepSquads) {
            game.squad1 = Array(9).fill(null);
            game.squad2 = Array(9).fill(null);
            game.squad3 = Array(9).fill(null);
        }

        if (!policy.keepResources) {
            game.gold = 3000;
            game.gem = 50;
            game.energy = game.maxEnergy;
            game.cp = game.maxCp;
        } else {
            game.gold = Math.max(0, Math.floor(game.gold * policy.resourceCarryover.gold));
            game.gem = Math.max(0, Math.floor(game.gem * policy.resourceCarryover.gem));
            game.energy = Math.max(0, Math.min(game.maxEnergy, Math.floor(game.energy * policy.resourceCarryover.energy)));
            game.cp = Math.max(0, Math.min(game.maxCp, Math.floor(game.cp * policy.resourceCarryover.cp)));
        }

        if (!policy.keepPoints) {
            game.points = 0;
        } else {
            game.points = Math.max(0, Math.floor(Number(game.points || 0) * policy.resourceCarryover.points));
        }
    }

    function getSeasonPolicyToast(game, season) {
        const policy = getActiveWorldSeasonPolicy(game, game.worldAdminDeps);
        const parts = [];
        parts.push(policy.keepMergeGrid ? game.tr('ui.season.keep.grid', {}, 'Grid kept') : game.tr('ui.season.reset.grid', {}, 'Grid reset'));
        parts.push(policy.keepSquads ? game.tr('ui.season.keep.squads', {}, 'Squads kept') : game.tr('ui.season.reset.squads', {}, 'Squads reset'));
        parts.push(policy.keepResources ? game.tr('ui.season.keep.resources', {}, 'Resources carried') : game.tr('ui.season.reset.resources', {}, 'Resources reset'));
        parts.push(policy.keepPoints ? game.tr('ui.season.keep.points', {}, 'Points carried') : game.tr('ui.season.reset.points', {}, 'Points reset'));
        return game.tr(
            'toast.next_season_policy',
            { season, policy: parts.join(', ') },
            `Season ${season} policy: ${parts.join(', ')}`
        );
    }

    function showWorldEndModal(game, reason) {
        const modal = document.getElementById('field-modal');
        const content = document.getElementById('modal-content');
        const title = document.getElementById('modal-title');
        if (!modal || !content || !title) return;
        const world = ensureWorldState(game);
        const endConditions = getActiveWorldEndConditions(game, game.worldAdminDeps);
        if (!world.rewardPackage) {
            world.rewardPackage = buildWorldEndRewardPackageForGame(game, reason, world.score, game.worldEndRewardConfig);
        }

        title.innerText = game.tr('ui.modal.world_end.title', {}, 'World Complete');
        modal.hidden = false;
        modal.classList.add('open');
        modal.dataset.mode = 'world_end';

        const reasonText = reason === 'score'
            ? game.tr(
                'ui.modal.world_end.reason_score',
                { score: ensureWorldState(game).score, target: endConditions.targetScore },
                `Target score reached (${ensureWorldState(game).score}/${endConditions.targetScore})`
            )
            : game.tr(
                'ui.modal.world_end.reason_king_castle',
                { minutes: Math.floor(endConditions.targetHoldMs / 60000) },
                `King Castle hold completed (${Math.floor(endConditions.targetHoldMs / 60000)}m)`
            );
        const rewardRows = renderWorldEndRewardRows(game, world.rewardPackage);
        const isClaimed = !!world.rewardsClaimed;
        const claimLabel = isClaimed
            ? game.tr('ui.modal.world_end.reward_claimed', {}, 'Claimed')
            : game.tr('ui.modal.world_end.claim', {}, 'Claim Rewards');
        const claimDisabled = isClaimed ? 'disabled style="opacity:0.5;cursor:default;"' : '';
        const modeLabel = getWorldRuleSetLabel(game, world.rewardPackage?.mode || getGameWorldRuleSetName(game), { KIND: 'kind', NEUTRAL: 'neutral', CRUEL: 'cruel' });

        content.innerHTML = `
            <div class="flex flex-col items-center justify-center space-y-4 p-8">
                <div class="text-6xl">C</div>
                <div class="text-2xl font-bold text-yellow-300">${game.tr('ui.modal.world_end.completed', {}, 'World Objective Complete')}</div>
                <div class="text-white text-center">${reasonText}</div>
                <div class="text-xs text-gray-300">${game.tr('ui.modal.world_end.mode', { mode: modeLabel }, `Ruleset: ${modeLabel}`)}</div>
                <div class="text-xs text-gray-300">${game.tr('ui.modal.world_end.next', {}, 'Next season rule changes can now be applied.')}</div>
                <div class="border border-yellow-600 bg-black bg-opacity-50 p-4 rounded text-left w-full">
                    <div class="text-yellow-500 font-bold mb-2">${game.tr('ui.modal.world_end.rewards', {}, 'Season Rewards')}</div>
                    ${rewardRows}
                </div>
                <button class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-8 rounded shadow-lg transform hover:scale-105 transition" onclick="window.KOVWorldSeasonModule.claimWorldEndRewards(window.game)" ${claimDisabled}>
                    ${claimLabel}
                </button>
                <button class="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-8 rounded shadow-lg transform hover:scale-105 transition" onclick="window.KOVWorldSeasonModule.startNextSeason(window.game, window.game.worldNextSeasonDeps)">
                    ${game.tr('ui.modal.world_end.next_season', {}, 'Start Next Season')}
                </button>
                <button class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-8 rounded shadow-lg transform hover:scale-105 transition" onclick="window.KOVUiShellModule.closeModal(window.game)">
                    ${game.tr('ui.common.continue', {}, 'Continue')}
                </button>
            </div>
        `;
    }

    function startNextSeason(game, deps) {
        if (!isWorldEnded(ensureWorldState(game))) return false;
        const endConditions = getActiveWorldEndConditions(game, game.worldAdminDeps);
        if (!endConditions.allowNextSeasonTransition) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.next_season_unavailable', {}, 'Next season transition is disabled'));
            return false;
        }
        const confirmText = game.tr('ui.modal.world_end.next_confirm', {}, 'Start next season now?');
        if (!window.confirm(confirmText)) return false;

        claimWorldEndRewards(game, { silent: true });

        const world = ensureWorldState(game);
        world.season = Math.max(1, Number(world.season || 1)) + 1;
        world.ended = false;
        world.winner = null;
        world.reason = "";
        world.endedAt = 0;
        world.score = 0;
        world.rewardPackage = null;
        world.rewardsClaimed = false;
        world.dragonBoss = { season: world.season, killCount: 0, byUid: {}, lastKill: null };

        applySeasonTransitionPolicy(game, deps);

        game.dungeonState = { cooldownByKey: {} };
        game.rebellionState = { lastByKey: {} };
        game.crownState = { holderKey: null, capturedAt: 0, kingCastleKey: null, promotedAt: 0 };
        game.fieldResourceState = {};
        game.fieldShopState = {};
        game.fieldDefenderState = {};
        game.fieldBuffs = { atk: 0, def: 0, hp: 0, spd: 0 };

        game.fieldEvents = {};
        window.KOVFieldEventLogicModule.populateFieldEvents(game, game.populateFieldEventsDeps);
        game.occupiedTiles = new Set([`${deps.PLAYER_START.r},${deps.PLAYER_START.c}`]);
        game.visibilityMap = new Set();
        window.KOVFieldEventLogicModule.revealFog(game, deps.PLAYER_START.r, deps.PLAYER_START.c, deps.FOG_RADIUS, game.revealFogDeps);

        game.armies.forEach((army) => {
            if (!army) return;
            army.state = 'IDLE';
            army.r = deps.PLAYER_START.r;
            army.c = deps.PLAYER_START.c;
            army.path = [];
            army.stepTimes = [];
            army.nextStepIndex = 0;
            army.target = null;
            army.lastMoveTime = 0;
            army.moveInterval = 0;
        });
        game.selectedArmyId = null;
        game.lastSelectedArmyId = null;
        game.currentFieldTargetKey = null;
        game.currentFieldTargetType = null;

        window.KOVFieldStateModule.recalcFieldBonuses(game, game.fieldBonusDeps);
        window.KOVFieldFlowModule.updateOpenBorders(game, game.fieldFlowDeps);
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        window.KOVPersistenceModule.saveGame(game);

        window.KOVUiShellModule.showToast(game, game.tr('toast.next_season_started', { season: world.season }, `Season ${world.season} started`));
        window.KOVUiShellModule.showToast(game, getSeasonPolicyToast(game, world.season));
        window.KOVUiShellModule.closeModal(game);
        if (document.getElementById('field-modal')?.dataset?.mode === 'field') {
            window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
        } else {
            game.requestRender();
        }
        return true;
    }

    function evaluateWorldEndCondition(game) {
        const world = ensureWorldState(game);
        world.score = getWorldScore(game.occupiedTiles, game.fieldMapData, game.worldScoreDeps);
        const endConditions = getActiveWorldEndConditions(game, game.worldAdminDeps);
        if (!endConditions.enabled || world.ended) return false;

        const allowKingCastle = endConditions.type === 'king_castle_hold' || endConditions.type === 'hybrid';
        const allowScore = endConditions.type === 'score' || endConditions.type === 'hybrid';

        let reason = '';
        if (allowScore && world.score >= endConditions.targetScore) {
            reason = 'score';
        } else if (allowKingCastle) {
            const crown = window.KOVFieldEconomyModule.ensureCrownState(game);
            const promotedAt = Number(crown.promotedAt || 0);
            if (crown.kingCastleKey && promotedAt > 0) {
                const heldMs = Date.now() - promotedAt;
                if (heldMs >= endConditions.targetHoldMs) {
                    reason = 'king_castle_hold';
                }
            }
        }
        if (!reason) return false;

        world.ended = true;
        world.winner = 'player';
        world.reason = reason;
        world.endedAt = Date.now();
        world.rewardPackage = buildWorldEndRewardPackageForGame(game, reason, world.score, game.worldEndRewardConfig);
        world.rewardsClaimed = false;

        if (reason === 'score') {
            window.KOVUiShellModule.showToast(game, game.tr('toast.world_end_score', { score: world.score }, `World complete by score (${world.score})`));
        } else {
            window.KOVUiShellModule.showToast(game, game.tr('toast.world_end_king_castle', {}, 'World complete by King Castle hold'));
        }
        window.KOVFieldUiModule.pushEffectLog(game, game.tr('ui.field.effect.world_end', {}, 'World objective complete'));
        showWorldEndModal(game, reason);
        return true;
    }

    global.KOVWorldSeasonModule = {
        normalizeWorldRuleSetName,
        getWorldRuleSet,
        getGameWorldRuleSetName,
        getGameWorldRuleSet,
        getWorldRuleSetLabel,
        setWorldRuleSet,
        onWorldRuleSetChange,
        scaleWorldCost,
        getMoveCostsByRule,
        getTaxRate,
        getUpkeepCost,
        getFacilityHourlyGoldIncome,
        ensureWorldState,
        getLocalUid,
        ensureDragonBossState,
        isWorldEnded,
        isWorldActionsLocked,
        guardWorldAction,
        getWorldPresetLabel,
        ensureAdminState,
        getActiveWorldPresetId,
        getWorldPresetConfig,
        getActiveWorldEndConditions,
        getActiveWorldSeasonPolicy,
        applyWorldPreset,
        getWorldScore,
        buildWorldEndRewardPackage,
        buildWorldEndRewardPackageForGame,
        renderWorldEndRewardRows,
        claimWorldEndRewards,
        applySeasonTransitionPolicy,
        getSeasonPolicyToast,
        showWorldEndModal,
        startNextSeason,
        evaluateWorldEndCondition
    };
})(window);



