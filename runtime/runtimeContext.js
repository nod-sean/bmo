(function (global) {
    'use strict';

    function buildRuntimeClassesBundle(requireModuleFunction, base, fieldSlice) {
        const buildRuntimeClasses = requireModuleFunction('KOVRuntimeClassesModule', 'buildRuntimeClasses');
        const runtimeClasses = buildRuntimeClasses({
            ASSET_KEYS: base.ASSET_KEYS,
            GITHUB_REPO: base.GITHUB_REPO,
            GITHUB_BRANCH: base.GITHUB_BRANCH,
            getCode: fieldSlice.getCode
        });
        return {
            AssetLoader: runtimeClasses.AssetLoader,
            SoundManager: runtimeClasses.SoundManager,
            Particle: runtimeClasses.Particle
        };
    }

    function buildRuntimeBits(requireGlobalModule, requireModuleFunction, fieldSlice, palettes) {
        const dummyChatMessages = requireGlobalModule('KOVGameDummyDataModule').DUMMY_CHAT_MESSAGES;
        const findPath = requireModuleFunction('KOVPathfindingModule', 'findPath');
        const createAStarAdapter = requireModuleFunction('KOVGameAStarModule', 'createAStarAdapter');
        const aStar = createAStarAdapter(findPath, { MAP_SIZE: fieldSlice.MAP_SIZE, isBlockingField: fieldSlice.isBlockingField });
        return {
            DUMMY_CHAT_MESSAGES: dummyChatMessages,
            TERRAIN_COLORS: palettes.TERRAIN_COLORS,
            TERRAIN_COLORS_BORDER: palettes.TERRAIN_COLORS_BORDER,
            AStar: aStar,
            BattleSimulator: global.BattleSimulator
        };
    }

    function buildGameRuntimeContext(gameData) {
        const GAME_DATA = gameData || {};
        const { requireGlobalModule, requireModuleFunction } = global.KOVModuleUtils;
        const defaultsModule = requireGlobalModule('KOVGameDefaultsModule');
        const FIELD_OBJECT_REWARD_TABLE = GAME_DATA?.constants?.FIELD_OBJECT_REWARDS || {};

        const base = global.KOVGameRuntimeBaseSliceModule.buildBaseRuntimeSlice({
            requireGlobalModule,
            requireModuleFunction,
            GAME_DATA
        });
        const GAMEPLAY = defaultsModule.buildGameplayConstants(base.GAMEPLAY_CONSTANTS);

        const worldSlice = global.KOVGameRuntimeWorldSliceModule.buildWorldRuntimeSlice({
            requireGlobalModule,
            requireModuleFunction,
            GAME_DATA,
            GAMEPLAY_CONSTANTS: base.GAMEPLAY_CONSTANTS
        });

        const mergeSlice = global.KOVGameRuntimeMergeSliceModule.buildMergeRuntimeSlice({
            requireModuleFunction,
            GAME_DATA,
            GAMEPLAY,
            ITEM_TYPE: base.ITEM_TYPE
        });

        const fieldSlice = global.KOVGameRuntimeFieldSliceModule.buildFieldRuntimeSlice({
            requireModuleFunction,
            assertObjectFunctions: global.KOVModuleUtils.assertObjectFunctions,
            GAME_DATA,
            FIELD_OBJECT_DATA: base.FIELD_OBJECT_DATA,
            FIELD_EVENT_CONFIG: base.FIELD_EVENT_CONFIG,
            ITEM_TYPE: base.ITEM_TYPE,
            UNIT_STATS: base.UNIT_STATS,
            BUILDING_DATA: mergeSlice.BUILDING_DATA,
            ITEM_VALUES: mergeSlice.ITEM_VALUES
        });

        const palettes = defaultsModule.buildTerrainPalettes(base.GAMEPLAY_CONSTANTS);
        const runtimeClasses = buildRuntimeClassesBundle(requireModuleFunction, base, fieldSlice);
        const bootstrapGameState = requireModuleFunction('KOVGameBootstrapModule', 'bootstrapGameState');
        const runtimeBits = buildRuntimeBits(requireGlobalModule, requireModuleFunction, fieldSlice, palettes);

        const {
            BOOTSTRAP_STATE_DEPS,
            METHOD_DEPS
        } = global.KOVGameRuntimeDepsAssemblerModule.buildRuntimeDepsBundle({
            requireModuleFunction,
            base,
            worldSlice,
            mergeSlice,
            fieldSlice,
            GAMEPLAY,
            runtimeBits
        });

        return global.KOVGameRuntimeGroupsModule.buildRuntimeGroups({
            base,
            mergeSlice,
            fieldSlice,
            worldSlice,
            runtimeClasses,
            bootstrapGameState,
            BOOTSTRAP_STATE_DEPS,
            METHOD_DEPS,
            GAMEPLAY,
            FIELD_OBJECT_REWARD_TABLE
        });
    }

    global.KOVGameRuntimeContextModule = { buildGameRuntimeContext };
})(window);
