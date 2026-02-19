(function (global) {
    'use strict';

    function buildLevelRuntime(gameData) {
        const levelData = gameData.level_data || [];
        const levelDataByLevel = new Map();
        let maxLevel = 1;

        levelData.forEach((entry) => {
            const level = Number(entry?.level);
            if (!Number.isFinite(level)) return;
            levelDataByLevel.set(level, entry);
            if (level > maxLevel) maxLevel = level;
        });

        if (!levelDataByLevel.has(1)) {
            levelDataByLevel.set(1, { level: 1, xp: 0, energy_max: 50, energy_regen: 1, cp_max: 20, cp_regen: 1 });
            maxLevel = Math.max(maxLevel, 1);
        }

        return {
            LEVEL_DATA: levelData,
            LEVEL_DATA_BY_LEVEL: levelDataByLevel,
            MAX_LEVEL: maxLevel
        };
    }

    global.KOVGameLevelRuntimeModule = {
        buildLevelRuntime
    };
})(window);

