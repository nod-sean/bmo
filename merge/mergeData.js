(function (global) {
    'use strict';

    function buildMergeRuntime(gameData, gameplay) {
        const mergeXpData = (gameData.merge_xp && Object.keys(gameData.merge_xp).length > 0)
            ? gameData.merge_xp
            : Object.assign({}, gameplay.MERGE_XP_FALLBACK || {});

        const itemValues = {};
        Object.values(gameData.items || {}).forEach((item) => {
            if (item && item.code >= 1801 && item.code <= 1809) {
                itemValues[item.level] = item.earn;
            }
        });

        if (Object.keys(itemValues).length === 0) {
            Object.assign(itemValues, gameplay.ITEM_VALUES_FALLBACK || {});
        }

        const unlockGoldMap = gameData.unlock_conditions?.gold || [];
        const unlockLevelMap = gameData.unlock_conditions?.level || [];
        const unlockItemMap = gameData.unlock_conditions?.item || [];

        return {
            MERGE_XP_DATA: mergeXpData,
            ITEM_VALUES: itemValues,
            UNLOCK_GOLD_MAP: unlockGoldMap,
            UNLOCK_LEVEL_MAP: unlockLevelMap,
            UNLOCK_ITEM_MAP: unlockItemMap
        };
    }

    global.KOVGameMergeDataModule = {
        buildMergeRuntime
    };
})(window);
