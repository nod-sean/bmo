(function (global) {
    'use strict';

    function buildMergeRuntimeSlice(args) {
        const {
            requireModuleFunction,
            GAME_DATA,
            GAMEPLAY,
            ITEM_TYPE
        } = args;

        const buildMergeRuntime = requireModuleFunction('KOVGameMergeDataModule', 'buildMergeRuntime');
        const MERGE_RUNTIME = buildMergeRuntime(GAME_DATA, GAMEPLAY);
        const MERGE_XP_DATA = MERGE_RUNTIME.MERGE_XP_DATA;
        const ITEM_VALUES = MERGE_RUNTIME.ITEM_VALUES;
        const UNLOCK_GOLD_MAP = MERGE_RUNTIME.UNLOCK_GOLD_MAP;
        const UNLOCK_LEVEL_MAP = MERGE_RUNTIME.UNLOCK_LEVEL_MAP;
        const UNLOCK_ITEM_MAP = MERGE_RUNTIME.UNLOCK_ITEM_MAP;

        const buildBuildingData = requireModuleFunction('KOVGameDataTransformsModule', 'buildBuildingData');
        const buildChestDropTable = requireModuleFunction('KOVGameDataTransformsModule', 'buildChestDropTable');
        const BUILDING_DATA = buildBuildingData(GAME_DATA, ITEM_TYPE);
        const CHEST_DROP_TABLE = buildChestDropTable(GAME_DATA);

        return {
            MERGE_XP_DATA,
            ITEM_VALUES,
            UNLOCK_GOLD_MAP,
            UNLOCK_LEVEL_MAP,
            UNLOCK_ITEM_MAP,
            BUILDING_DATA,
            CHEST_DROP_TABLE
        };
    }

    global.KOVGameRuntimeMergeSliceModule = { buildMergeRuntimeSlice };
})(window);
