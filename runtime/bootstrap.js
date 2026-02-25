(function (global) {
    'use strict';

    async function bootstrapGameState(game, deps) {
        game.grid = Array(deps.CONFIG.gridRows).fill().map(() => Array(deps.CONFIG.gridCols).fill(null));
        game.gridState = Array(deps.CONFIG.gridRows).fill().map(() => Array(deps.CONFIG.gridCols).fill(null));
        game.squad1 = Array(9).fill(null);
        game.squad2 = Array(9).fill(null);
        game.squad3 = Array(9).fill(null);
        game.particles = [];
        game.lordLevel = 1;
        game.currentXp = 0;
        game.energy = 50;
        game.gold = 3000;
        game.gem = 100;
        game.points = 0;
        game.cp = 20;

        game.userProfile = {
            name: window.KOVSocialProfileModule.getDefaultProfileName(game),
            title: window.KOVSocialProfileModule.getDefaultProfileTitle(game),
            avatar: 1,
            vip: 0,
            winRate: 0,
            totalPVP: 0,
            totalCP: 0
        };
        game.chatLog = [];
        game.chatState = { activeChannel: 'world', logsByChannel: { world: [], guild: [], system: [] }, maxLogs: 80 };
        game.socialState = {
            players: [],
            friends: [],
            friendRequestsIn: [],
            friendRequestsOut: [],
            allianceRequestsIn: [],
            allianceRequestsOut: []
        };
        game.adWatchCount = 0;
        game.isChatOpen = false;
        game.baseEnergyRegen = 1;
        game.baseMaxCp = 20;
        game.baseCpRegen = 1;
        game.cpBonus = 0;
        game.cpRegenBonus = 0;
        game.maxCp = game.baseMaxCp;
        game.cpRegen = game.baseCpRegen;
        game.energyRegenAcc = 0;
        game.cpRegenAcc = 0;
        const nowTs = Date.now();
        game.energyLastRegenAt = nowTs;
        game.cpLastRegenAt = nowTs;

        game.occupiedTiles = new Set();
        game.fieldEvents = {};
        window.KOVFieldStateModule.initFieldMap(game);
        window.KOVFieldEventLogicModule.populateFieldEvents(game, {
            MAP_SIZE: deps.MAP_SIZE,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES,
            PLAYER_START: deps.PLAYER_START,
            FIELD_EVENT_RATES: deps.FIELD_EVENT_RATES,
            isBlockingField: deps.isBlockingField,
            isBorderTerrain: deps.isBorderTerrain,
            getFieldObjectKind: deps.getFieldObjectKind
        });
        game.occupiedTiles.add(`${deps.PLAYER_START.r},${deps.PLAYER_START.c}`);
        game.income = 0;
        game.hourlyIncomeRemainder = 0;
        game.dungeonState = { cooldownByKey: {} };
        game.rebellionState = { lastByKey: {} };
        game.crownState = { holderKey: null, capturedAt: 0, kingCastleKey: null, promotedAt: 0 };
        game.worldState = {
            season: 1,
            ended: false,
            winner: null,
            reason: "",
            endedAt: 0,
            score: 0,
            rewardPackage: null,
            rewardsClaimed: false,
            dragonBoss: { season: 1, killCount: 0, byUid: {}, lastKill: null }
        };
        game.worldLobbyState = { entered: false, channel: 'map_0', enteredAt: 0 };
        game.lobbyChannelStatusTable = window.KOVLobbyChatModule.buildLobbyChannelStatusTable();
        game.lobbyChannelStatusSource = 'local';
        game.lobbyChannelStatusFetchedAt = 0;
        game.lobbyChannelStatusLastAttemptAt = 0;
        game.lobbyChannelFetchPending = false;
        game.adminState = {
            presetId: deps.DEFAULT_WORLD_PRESET_ID,
            worldEndConditions: deps.WORLD_END_CONDITIONS,
            worldSeasonPolicy: deps.WORLD_SEASON_POLICY
        };
        game.worldRuleSet = deps.DEFAULT_WORLD_RULESET;

        game.selectedArmyId = null;
        game.lastSelectedArmyId = null;
        game.currentFieldTargetKey = null;
        game.currentFieldTargetType = null;
        game.fieldResourceState = {};
        game.fieldShopState = {};
        game.refillAdState = { date: "", usage: { energy: 0, gold: 0, cp: 0 } };
        game.currentShopContext = null;
        game.shopTimer = null;
        game.fieldObjectState = {};
        game.fieldDefenderState = {};
        game.fieldBuffs = { atk: 0, def: 0, hp: 0, spd: 0 };
        game.citadelCount = 0;
        game.thirdSquadUnlocked = false;
        game.moveTargetMode = null;
        game.previewPath = null;
        game.movePreviewText = "";
        game.pendingBattleReward = null;
        game.battleFx = null;
        game.battleFxPhaseTimer = null;
        game.battleFxClearTimer = null;
        game.fieldCameraCleanup = null;
        game.isResetting = false;
        game.effectLog = [];
        game.openBorderTiles = new Set();
        game.fieldRegions = null;

        game.visibilityMap = new Set();
        window.KOVFieldEventLogicModule.revealFog(game, deps.PLAYER_START.r, deps.PLAYER_START.c, deps.FOG_RADIUS, game.revealFogDeps);

        game.grassTexture = window.KOVMergeSetupModule.createGrassPattern();
        game.settings = { bgm: true, sfx: true, push: true };
        game.locale = deps.DEFAULT_LOCALE;
        try {
            const savedLocale = localStorage.getItem('kov_locale');
            if (savedLocale) game.locale = savedLocale;
        } catch (e) { }

        game.drag = null;
        game.hover = null;
        game.selectedItem = null;
        game.potentialDrag = null;
        game.dpr = window.devicePixelRatio || 1;
        game.runtimeConfig = Object.freeze({
            CONFIG: deps.CONFIG,
            ITEM_TYPE: deps.ITEM_TYPE,
            LOCK_TYPE: deps.LOCK_TYPE,
            BUILDING_LIMITS: deps.BUILDING_LIMITS,
            SHOP_DATA: deps.SHOP_DATA
        });
        game.mergeController = (typeof window !== 'undefined' && typeof window.KOVMergeController === 'function')
            ? new window.KOVMergeController(game)
            : null;
        game.fieldController = (typeof window !== 'undefined' && typeof window.KOVFieldController === 'function')
            ? new window.KOVFieldController(game)
            : null;
        game.cheatEnergy = () => {
            game.energy = Math.min(game.maxEnergy, game.energy + 30);
            window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
            window.KOVUiShellModule.showToast(game, game.tr('toast.energy_gain', { value: 30 }, '+30 Energy'));
        };
        game.cheatLevelUp = () => {
            window.KOVGameCoreModule.levelUp(game, game.levelDeps);
        };
        game.spawnChest = () => {
            const ok = window.KOVMergeBoardModule.spawnItem(
                game,
                { type: deps.ITEM_TYPE.BUILDING_CHEST, level: 1, scale: 0 },
                game.spawnItemDeps
            );
            if (!ok) {
                window.KOVUiShellModule.showToast(game, game.tr('toast.space_short', {}, 'No space available'));
                return;
            }
            window.KOVUiShellModule.showToast(game, game.tr('toast.stored', {}, 'Stored'));
            game.requestRender();
        };

        game.armies = [
            { id: 0, name: window.KOVSocialProfileModule.getDefaultSquadName(game, 1), color: "#4caf50", state: 'IDLE', r: deps.PLAYER_START.r, c: deps.PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 },
            { id: 1, name: window.KOVSocialProfileModule.getDefaultSquadName(game, 2), color: "#2196f3", state: 'IDLE', r: deps.PLAYER_START.r, c: deps.PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 },
            { id: 2, name: window.KOVSocialProfileModule.getDefaultSquadName(game, 3), color: "#f59e0b", state: 'IDLE', r: deps.PLAYER_START.r, c: deps.PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 }
        ];

        window.KOVMergeSetupModule.calcLayout(game, { CONFIG: deps.CONFIG });
        const resetFlag = localStorage.getItem('kov_force_reset') === '1';
        if (resetFlag) {
            try {
                localStorage.removeItem('kov_force_reset');
                localStorage.removeItem('kov_save_v1');
                localStorage.removeItem('kov_field_object_prob_v1');
                localStorage.removeItem('kov_uid');
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('kov_')) localStorage.removeItem(key);
                }
            } catch (e) { }
        }

        let loadedLocalState = false;
        
        // 1. Try to load local state first (for settings, currency, etc.)
        if (!resetFlag) {
            loadedLocalState = window.KOVPersistenceModule.loadGame(game, {
                CONFIG: deps.CONFIG,
                LOCK_TYPE: deps.LOCK_TYPE,
                UNLOCK_LEVEL_MAP: deps.UNLOCK_LEVEL_MAP,
                UNLOCK_GOLD_MAP: deps.UNLOCK_GOLD_MAP,
                UNLOCK_ITEM_MAP: deps.UNLOCK_ITEM_MAP,
                PLAYER_START: deps.PLAYER_START,
                FOG_RADIUS: deps.FOG_RADIUS,
                FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES,
                normalizeWorldRuleSetName: deps.normalizeWorldRuleSetName
            });
        }

        let loadedRuntimeState = false;
        let needsInit = false;

        // 2. Overwrite State from runtime (Online)
        if (!resetFlag && game.runtime) {
            if (game.runtime.getMergeState) {
                const res = await game.runtime.getMergeState();
                if (res && res.success && res.data) {
                    const state = res.data;
                    const hasGridData = state.grid && (
                        (Array.isArray(state.grid) && state.grid.some(row => row && row.some(cell => cell))) ||
                        (typeof state.grid === 'object' && Object.keys(state.grid).length > 0)
                    );
                    
                    if (hasGridData) {
                        if (Array.isArray(state.grid)) {
                            game.grid = state.grid;
                        } else {
                            // Dict mapping "grid_r_c" -> item
                            game.grid = Array(deps.CONFIG.gridRows).fill().map(() => Array(deps.CONFIG.gridCols).fill(null));
                            for (const key in state.grid) {
                                const item = state.grid[key];
                                if (key.startsWith('grid_')) {
                                    const parts = key.split('_');
                                    const r = parseInt(parts[1], 10);
                                    const c = parseInt(parts[2], 10);
                                    if (r >= 0 && r < deps.CONFIG.gridRows && c >= 0 && c < deps.CONFIG.gridCols) {
                                        game.grid[r][c] = { type: item.type, level: item.level, scale: 1, ...item };
                                    }
                                } else if (key.includes(',')) {
                                    const [r, c] = key.split(',').map(Number);
                                    if (r >= 0 && r < deps.CONFIG.gridRows && c >= 0 && c < deps.CONFIG.gridCols) {
                                        game.grid[r][c] = { type: item.type, level: item.level, scale: 1, ...item };
                                    }
                                }
                            }
                        }
                        if (state.gridState && Array.isArray(state.gridState)) {
                            game.gridState = state.gridState;
                        } else {
                            for (let r = 0; r < deps.CONFIG.gridRows; r++) {
                                for (let c = 0; c < deps.CONFIG.gridCols; c++) {
                                    if (!game.gridState[r][c]) {
                                        game.gridState[r][c] = { type: deps.LOCK_TYPE.OPEN };
                                    }
                                }
                            }
                        }
                        if (state.squad1 && Array.isArray(state.squad1)) game.squad1 = state.squad1;
                        if (state.squad2 && Array.isArray(state.squad2)) game.squad2 = state.squad2;
                        if (state.squad3 && Array.isArray(state.squad3)) game.squad3 = state.squad3;
                        
                        loadedRuntimeState = true;
                    } else {
                        needsInit = true;
                    }
                } else {
                    needsInit = true;
                }
            }

            if (game.runtime.getProgressionState) {
                const progRes = await game.runtime.getProgressionState(game);
                if (progRes && progRes.success && progRes.data) {
                    const pd = progRes.data;
                    if (Number.isFinite(pd.level)) game.lordLevel = pd.level;
                    if (Number.isFinite(pd.xp)) game.currentXp = pd.xp;
                    if (Number.isFinite(pd.energy)) game.energy = pd.energy;
                    if (Number.isFinite(pd.cp)) game.cp = pd.cp;
                    if (Array.isArray(pd.unlockedUnits)) game.unlockedUnits = pd.unlockedUnits;
                    loadedRuntimeState = true;
                }
            }
        }

        if ((loadedLocalState || loadedRuntimeState) && !needsInit) {
            window.KOVGameCoreModule.updateLevelStats(game, game.levelDeps);
        } else {
            window.KOVMergeSetupModule.initGame(game, {
                CONFIG: deps.CONFIG,
                LOCK_TYPE: deps.LOCK_TYPE,
                UNLOCK_LEVEL_MAP: deps.UNLOCK_LEVEL_MAP,
                UNLOCK_GOLD_MAP: deps.UNLOCK_GOLD_MAP,
                UNLOCK_ITEM_MAP: deps.UNLOCK_ITEM_MAP,
                ITEM_TYPE: deps.ITEM_TYPE,
                CAMP_CAPACITY: deps.CAMP_CAPACITY,
                getData: deps.getData,
                getInfoFromCode: deps.getInfoFromCode
            });
            
            // Sync initial board to server if online
            if (game.runtime && game.runtime.executeMergeAction) {
                const gridPayload = {};
                for (let r = 0; r < deps.CONFIG.gridRows; r++) {
                    for (let c = 0; c < deps.CONFIG.gridCols; c++) {
                        if (game.grid[r][c]) {
                            gridPayload[`grid_${r}_${c}`] = game.grid[r][c];
                        }
                    }
                }
                game.runtime.executeMergeAction(game, {
                    type: 'sync_board',
                    payload: { grid: gridPayload }
                }).catch(e => console.error("Initial board sync failed", e));
            }
        }

        window.KOVWorldSeasonModule.ensureAdminState(game, deps.WORLD_ADMIN_DEPS);
        const activePresetId = window.KOVWorldSeasonModule.getActiveWorldPresetId(game, deps.WORLD_ADMIN_DEPS);
        window.KOVWorldSeasonModule.applyWorldPreset(game, activePresetId, deps.WORLD_ADMIN_DEPS, { persist: false, silent: true });
        window.KOVSocialProfileModule.sanitizeUserProfile(game);
        window.KOVSocialProfileModule.sanitizeArmies(game, { PLAYER_START: deps.PLAYER_START });
        window.KOVFieldStateModule.recalcFieldBonuses(game, {
            CONFIG: deps.CONFIG,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            GAMEPLAY: deps.GAMEPLAY,
            ABILITY_CODES: deps.ABILITY_CODES,
            isStatueTile: deps.isStatueTile,
            isRuinsTile: deps.isRuinsTile,
            isCitadelTile: deps.isCitadelTile
        });
        window.KOVFieldStateModule.buildFieldRegions(game, {
            MAP_SIZE: deps.MAP_SIZE,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            isWallTile: deps.isWallTile,
            isBorderTerrain: deps.isBorderTerrain,
            isGateTile: deps.isGateTile,
            isCitadelTile: deps.isCitadelTile,
            isDragonTile: deps.isDragonTile
        });
        window.KOVFieldFlowModule.updateOpenBorders(game, game.fieldFlowDeps);
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);

        setInterval(() => window.KOVGameProgressionModule.regenEnergy(game, {
            isFountainTile: deps.isFountainTile,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA
        }), 1000);
        setInterval(() => window.KOVGameProgressionModule.regenCp(game), 1000);
        setInterval(() => window.KOVFieldEconomyModule.collectTerritoryIncome(game, {
            FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES,
            MAP_SIZE: deps.MAP_SIZE,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            PLAYER_START: deps.PLAYER_START,
            ABILITY_CODES: deps.ABILITY_CODES,
            GAMEPLAY: deps.GAMEPLAY,
            isBlockingField: deps.isBlockingField,
            isBorderTerrain: deps.isBorderTerrain,
            isGateTile: deps.isGateTile,
            isCitadelTile: deps.isCitadelTile,
            isShopTile: deps.isShopTile,
            isTavernTile: deps.isTavernTile
        }), 3000);
        window.KOVGameProgressionModule.initObjectRegen(game, {
            FIELD_OBJECT_REGEN: deps.FIELD_OBJECT_REGEN,
            applyObjectRegenCycle: deps.applyObjectRegenCycle
        });
        window.KOVSocialProfileModule.initSocialUI(game, { DUMMY_CHAT_MESSAGES: deps.DUMMY_CHAT_MESSAGES || [] });
        window.addEventListener('resize', () => { window.KOVGameCoreModule.resize(game); game.requestRender(); });
        window.KOVGameCoreModule.resize(game);
        window.KOVMergeBoardModule.setupInput(game, {
            ZONES: deps.ZONES,
            LOCK_TYPE: deps.LOCK_TYPE,
            CONFIG: deps.CONFIG,
            ITEM_TYPE: deps.ITEM_TYPE,
            CAMP_CAPACITY: deps.CAMP_CAPACITY,
            BUILDING_DATA: deps.BUILDING_DATA,
            ITEM_VALUES: deps.ITEM_VALUES,
            MERGE_XP_DATA: deps.MERGE_XP_DATA,
            CHEST_DROP_TABLE: deps.CHEST_DROP_TABLE,
            getData: deps.getData,
            getInfoFromCode: deps.getInfoFromCode
        });
        game.assets.loadAll(() => { game.requestRender(); });
        window.KOVMergeBoardModule.loop(game, game.mergeLoopDeps);
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);

        if (!localStorage.getItem('kov_uid')) localStorage.setItem('kov_uid', `U${Math.floor(Math.random() * 1000000)}`);
        document.getElementById('settings-uid').innerText = localStorage.getItem('kov_uid');
        window.KOVUiShellModule.refreshLocaleControls(game, game.localeControlDeps);
 
        if (window.gachaUi) {
            window.gachaUi.init();
        }

        if (window.KOVAuthSessionModule && typeof window.KOVAuthSessionModule.ensureGuestSession === 'function') {
            window.KOVAuthSessionModule.ensureGuestSession(game).catch(() => { });
        }
    }

    global.KOVGameBootstrapModule = {
        bootstrapGameState
    };
})(window);

