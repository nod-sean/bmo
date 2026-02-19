(function (global) {
    'use strict';

    function saveGame(game) {
        try {
            if (game.isResetting || localStorage.getItem('kov_force_reset') === '1') return;
            const data = {
                grid: game.grid,
                gridState: game.gridState,
                squad1: game.squad1,
                squad2: game.squad2,
                squad3: game.squad3,
                lordLevel: game.lordLevel,
                currentXp: game.currentXp,
                energy: game.energy,
                gold: game.gold,
                gem: game.gem,
                cp: game.cp,
                maxCp: game.maxCp,
                energyRegenAcc: game.energyRegenAcc,
                cpRegenAcc: game.cpRegenAcc,
                hourlyIncomeRemainder: game.hourlyIncomeRemainder,
                energyLastRegenAt: game.energyLastRegenAt,
                cpLastRegenAt: game.cpLastRegenAt,
                occupiedTiles: Array.from(game.occupiedTiles),
                settings: game.settings,
                visibilityMap: Array.from(game.visibilityMap),
                lastSelectedArmyId: game.lastSelectedArmyId,
                fieldResourceState: game.fieldResourceState,
                fieldShopState: game.fieldShopState,
                refillAdState: game.refillAdState,
                fieldObjectState: game.fieldObjectState,
                fieldDefenderState: game.fieldDefenderState,
                dungeonState: game.dungeonState,
                rebellionState: game.rebellionState,
                crownState: game.crownState,
                worldState: game.worldState,
                worldLobbyState: game.worldLobbyState,
                adminState: game.adminState,
                worldRuleSet: window.KOVWorldSeasonModule.getGameWorldRuleSetName(game),
                fieldBuffs: game.fieldBuffs,
                armies: game.armies,
                chatState: game.chatState,
                socialState: game.socialState
            };
            localStorage.setItem('kov_save_v1', JSON.stringify(data));
        } catch (e) { }
    }

    function loadGame(game, deps) {
        try {
            const saved = localStorage.getItem('kov_save_v1');
            if (!saved) return false;
            const data = JSON.parse(saved);
            const isValidGrid = (grid) => Array.isArray(grid) && grid.length === deps.CONFIG.gridRows && grid.every((row) => Array.isArray(row) && row.length === deps.CONFIG.gridCols);
            const isValidSquad = (squad) => Array.isArray(squad) && squad.length === 9;
            const validGrid = isValidGrid(data.grid);
            const validGridState = isValidGrid(data.gridState);
            if (!validGrid) {
                try { localStorage.removeItem('kov_save_v1'); } catch (e) { }
                return false;
            }
            game.grid = data.grid;
            game.gridState = validGridState ? data.gridState : game.gridState;
            game.squad1 = isValidSquad(data.squad1) ? data.squad1 : game.squad1;
            game.squad2 = isValidSquad(data.squad2) ? data.squad2 : game.squad2;
            game.squad3 = isValidSquad(data.squad3) ? data.squad3 : game.squad3;
            game.lordLevel = data.lordLevel || 1;
            game.currentXp = data.currentXp || 0;
            game.energy = Number.isFinite(Number(data.energy)) ? Number(data.energy) : 50;
            game.gold = Number.isFinite(Number(data.gold)) ? Number(data.gold) : 3000;
            game.gem = Number.isFinite(Number(data.gem)) ? Number(data.gem) : 50;
            game.cp = Number.isFinite(Number(data.cp)) ? Number(data.cp) : 20;
            game.maxCp = Number.isFinite(Number(data.maxCp)) ? Number(data.maxCp) : 20;
            game.energyRegenAcc = Number.isFinite(Number(data.energyRegenAcc)) ? Number(data.energyRegenAcc) : 0;
            game.cpRegenAcc = Number.isFinite(Number(data.cpRegenAcc)) ? Number(data.cpRegenAcc) : 0;
            game.hourlyIncomeRemainder = Number.isFinite(Number(data.hourlyIncomeRemainder)) ? Number(data.hourlyIncomeRemainder) : 0;
            const nowTs = Date.now();
            game.energyLastRegenAt = Number.isFinite(Number(data.energyLastRegenAt)) ? Number(data.energyLastRegenAt) : nowTs;
            game.cpLastRegenAt = Number.isFinite(Number(data.cpLastRegenAt)) ? Number(data.cpLastRegenAt) : nowTs;
            if (data.occupiedTiles) game.occupiedTiles = new Set(data.occupiedTiles);
            if (data.visibilityMap) game.visibilityMap = new Set(data.visibilityMap);
            if (data.lastSelectedArmyId !== undefined) game.lastSelectedArmyId = data.lastSelectedArmyId;
            if (data.fieldResourceState) game.fieldResourceState = data.fieldResourceState;
            if (data.fieldShopState) game.fieldShopState = data.fieldShopState;
            if (data.refillAdState) game.refillAdState = data.refillAdState;
            if (data.fieldObjectState) game.fieldObjectState = data.fieldObjectState;
            if (data.fieldDefenderState) game.fieldDefenderState = data.fieldDefenderState;
            if (data.dungeonState && typeof data.dungeonState === 'object') game.dungeonState = data.dungeonState;
            if (data.rebellionState && typeof data.rebellionState === 'object') game.rebellionState = data.rebellionState;
            if (data.crownState && typeof data.crownState === 'object') game.crownState = data.crownState;
            if (data.worldState && typeof data.worldState === 'object') game.worldState = data.worldState;
            if (data.worldLobbyState && typeof data.worldLobbyState === 'object') game.worldLobbyState = data.worldLobbyState;
            if (data.adminState && typeof data.adminState === 'object') game.adminState = data.adminState;
            game.worldRuleSet = deps.normalizeWorldRuleSetName(data.worldRuleSet || game.worldRuleSet);
            if (data.fieldBuffs) game.fieldBuffs = data.fieldBuffs;
            if (data.settings) { game.settings = data.settings; window.KOVSettingsRefillModule.applySettings(game); }
            if (data.chatState && typeof data.chatState === 'object') game.chatState = data.chatState;
            if (data.socialState && typeof data.socialState === 'object') game.socialState = data.socialState;
            if (Array.isArray(data.chatLog) && data.chatLog.length) {
                window.KOVLobbyChatModule.ensureChatState(game);
                game.chatState.logsByChannel.world = data.chatLog.slice(-game.chatState.maxLogs);
            }
            if (data.armies) {
                game.armies = data.armies;
                if (game.armies.length < 3) {
                    game.armies.push({
                        id: 2,
                        name: window.KOVSocialProfileModule.getDefaultSquadName(game, 3),
                        color: '#f59e0b',
                        state: 'IDLE',
                        r: deps.PLAYER_START.r,
                        c: deps.PLAYER_START.c,
                        path: [],
                        nextStepIndex: 0,
                        target: null,
                        lastMoveTime: 0,
                        moveInterval: 0
                    });
                }
                game.armies.forEach((army) => {
                    if (!army || typeof army !== 'object') return;
                    if (army.state !== 'IDLE') {
                        army.state = 'IDLE';
                        army.path = [];
                        army.stepTimes = [];
                        army.nextStepIndex = 0;
                        army.target = null;
                        army.lastMoveTime = 0;
                        army.moveInterval = 0;
                    }
                });
            }
            if (!validGridState) {
                window.KOVMergeSetupModule.refreshLockState(game, {
                    CONFIG: deps.CONFIG,
                    LOCK_TYPE: deps.LOCK_TYPE,
                    UNLOCK_LEVEL_MAP: deps.UNLOCK_LEVEL_MAP,
                    UNLOCK_GOLD_MAP: deps.UNLOCK_GOLD_MAP
                });
            }
            if (!game.occupiedTiles || game.occupiedTiles.size === 0) game.occupiedTiles = new Set([`${deps.PLAYER_START.r},${deps.PLAYER_START.c}`]);
            else game.occupiedTiles.add(`${deps.PLAYER_START.r},${deps.PLAYER_START.c}`);
            window.KOVFieldEconomyModule.syncCrownEventState(game, {
                FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES || { CROWN: 2040 }
            });
            window.KOVFieldEventLogicModule.revealFog(game, deps.PLAYER_START.r, deps.PLAYER_START.c, deps.FOG_RADIUS, game.revealFogDeps);
            return true;
        } catch (e) {
            try { localStorage.removeItem('kov_save_v1'); } catch (err) { }
            return false;
        }
    }

    function resetGame(game) {
        if (confirm(game.tr('ui.settings.reset_confirm', {}, 'Reset all local progress?'))) {
            game.isResetting = true;
            try {
                localStorage.setItem('kov_force_reset', '1');
                localStorage.removeItem('kov_save_v1');
                localStorage.removeItem('kov_field_object_prob_v1');
                localStorage.removeItem('kov_uid');
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('kov_')) localStorage.removeItem(key);
                }
                if (localStorage.getItem('kov_save_v1')) {
                    localStorage.clear();
                }
            } catch (e) { }
            window.location.reload();
        }
    }

    global.KOVPersistenceModule = {
        saveGame,
        loadGame,
        resetGame
    };
})(window);
