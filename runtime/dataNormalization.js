(function (global) {
    'use strict';

    function normalizeFieldObjectData(fieldObjectData) {
        Object.values(fieldObjectData || {}).forEach((obj) => {
            if (!obj.defenders) {
                obj.defenders = [];
                for (let i = 1; i <= 3; i++) {
                    const unit = obj[`unit_${i}`];
                    const count = obj[`count_${i}`];
                    if (unit && count > 0) obj.defenders.push({ code: unit, count, slot: i - 1 });
                }
            }
        });

        Object.values(fieldObjectData || {}).forEach((obj) => {
            if (!obj.abilities) {
                obj.abilities = [];
                for (let i = 1; i <= 2; i++) {
                    const code = obj[`ability_${i}`];
                    const value = obj[`value_${i}`];
                    if (code) obj.abilities.push({ code, value });
                }
            }
        });
    }

    global.KOVGameDataNormalizationModule = {
        normalizeFieldObjectData
    };
})(window);

