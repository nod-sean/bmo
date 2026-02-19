(function (global) {
    'use strict';

    function buildBuildingData(gameData, itemType) {
        const result = {};
        const buildings = gameData.buildings || {};
        const baseByType = {
            [itemType.BUILDING_BARRACKS]: 2101,
            [itemType.BUILDING_RANGE]: 2201,
            [itemType.BUILDING_STABLE]: 2301
        };

        Object.keys(baseByType).forEach((typeKey) => {
            const type = Number(typeKey);
            const baseCode = baseByType[type];
            result[type] = {};
            for (let lv = 1; lv <= 10; lv++) {
                const code = baseCode + (lv - 1);
                const data = buildings[code];
                if (!data) continue;
                const probs = [];
                for (let i = 1; i <= 10; i++) probs.push(data[`prob_${i}`] || 0);
                result[type][lv] = {
                    merge_max: 5 + lv,
                    energy: data.energy || data.Energy || 0,
                    probs
                };
            }
        });

        return result;
    }

    function buildChestDropTable(gameData) {
        const table = {};
        Object.entries(gameData.chests || {}).forEach(([, chestData]) => {
            const drops = [];
            Object.entries(chestData || {}).forEach(([key, val]) => {
                const code = parseInt(key, 10);
                if (!Number.isNaN(code) && code >= 1800 && code < 1900 && Number(val) > 0) {
                    drops.push({ code, prob: Number(val) });
                }
            });
            if (Number.isFinite(chestData?.level)) table[chestData.level] = drops;
        });

        if (Object.keys(table).length === 0) {
            table[1] = [{ code: 1801, prob: 50 }, { code: 1811, prob: 50 }];
            table[2] = [
                { code: 1801, prob: 25 }, { code: 1802, prob: 25 },
                { code: 1811, prob: 25 }, { code: 1812, prob: 25 }
            ];
        }
        return table;
    }

    global.KOVGameDataTransformsModule = {
        buildBuildingData,
        buildChestDropTable
    };
})(window);

