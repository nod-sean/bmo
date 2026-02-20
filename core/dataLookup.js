(function (global) {
    'use strict';

    function buildDataLookupRuntime(deps) {
        const { ITEM_TYPE, ITEM_VALUES, BUILDING_DATA, UNIT_STATS } = deps;

        function getCode(type, level) {
            if (type === ITEM_TYPE.UNIT_INFANTRY) return 1100 + level;
            if (type === ITEM_TYPE.UNIT_ARCHER) return 1200 + level;
            if (type === ITEM_TYPE.UNIT_CAVALRY) return 1300 + level;
            if (type === ITEM_TYPE.BUILDING_BARRACKS) return 2100 + level;
            if (type === ITEM_TYPE.BUILDING_RANGE) return 2200 + level;
            if (type === ITEM_TYPE.BUILDING_STABLE) return 2300 + level;
            if (type === ITEM_TYPE.BUILDING_CHEST) return 2800 + level;
            if (type === ITEM_TYPE.BUILDING_CAMP) return 3100 + level;
            if (type === ITEM_TYPE.ITEM_GOLD) return 1800 + level;
            if (type === ITEM_TYPE.ITEM_ENERGY) return 1810 + level;
            if (type === ITEM_TYPE.ITEM_CRYSTAL) return 1820 + level;
            if (type === ITEM_TYPE.ITEM_AP) return 1830 + level;
            return 0;
        }

        function getInfoFromCode(code) {
            if (code >= 1100 && code < 1200) return { type: ITEM_TYPE.UNIT_INFANTRY, level: code % 100 };
            if (code >= 1200 && code < 1300) return { type: ITEM_TYPE.UNIT_ARCHER, level: code % 100 };
            if (code >= 1300 && code < 1400) return { type: ITEM_TYPE.UNIT_CAVALRY, level: code % 100 };
            if (code >= 2100 && code < 2110) return { type: ITEM_TYPE.BUILDING_BARRACKS, level: code - 2100 };
            if (code >= 2200 && code < 2210) return { type: ITEM_TYPE.BUILDING_RANGE, level: code - 2200 };
            if (code >= 2300 && code < 2310) return { type: ITEM_TYPE.BUILDING_STABLE, level: code - 2300 };
            if (code >= 2800 && code < 2810) return { type: ITEM_TYPE.BUILDING_CHEST, level: code - 2800 };
            if (code >= 3100 && code < 3110) return { type: ITEM_TYPE.BUILDING_CAMP, level: code - 3100 };
            if (code >= 1800 && code < 1810) return { type: ITEM_TYPE.ITEM_GOLD, level: code - 1800 };
            if (code >= 1810 && code < 1820) return { type: ITEM_TYPE.ITEM_ENERGY, level: code - 1810 };
            if (code >= 1820 && code < 1830) return { type: ITEM_TYPE.ITEM_CRYSTAL, level: code - 1820 };
            if (code >= 1830 && code < 1840) return { type: ITEM_TYPE.ITEM_AP, level: code - 1830 };
            return null;
        }

        function getUnitClassTypeFromCode(code) {
            if (code === ITEM_TYPE.UNIT_DRAGON) return ITEM_TYPE.UNIT_DRAGON;
            if (code >= 1100 && code < 1200) return ITEM_TYPE.UNIT_INFANTRY;
            if (code >= 1200 && code < 1300) return ITEM_TYPE.UNIT_ARCHER;
            if (code >= 1300 && code < 1400) return ITEM_TYPE.UNIT_CAVALRY;
            if (code >= 10 && code < 20) return code;
            return ITEM_TYPE.UNIT_INFANTRY;
        }

        function getData(type, level) {
            if (type >= 20) {
                if (type === ITEM_TYPE.ITEM_GOLD) return { name: 'Gold', earn: ITEM_VALUES[level] };
                if (type === ITEM_TYPE.ITEM_ENERGY) return { name: 'Energy', earn: ITEM_VALUES[level] };
                if (type === ITEM_TYPE.ITEM_CRYSTAL) return { name: 'Crystal', earn: ITEM_VALUES[level] };
                if (type === ITEM_TYPE.ITEM_AP) return { name: 'AP', earn: ITEM_VALUES[level] };
            }
            if (type < 10) {
                if (type === ITEM_TYPE.BUILDING_BARRACKS) return { name: 'Barracks', energy: BUILDING_DATA[ITEM_TYPE.BUILDING_BARRACKS][level]?.energy };
                if (type === ITEM_TYPE.BUILDING_RANGE) return { name: 'Range', energy: BUILDING_DATA[ITEM_TYPE.BUILDING_RANGE][level]?.energy };
                if (type === ITEM_TYPE.BUILDING_STABLE) return { name: 'Stable', energy: BUILDING_DATA[ITEM_TYPE.BUILDING_STABLE][level]?.energy };
                if (type === ITEM_TYPE.BUILDING_CHEST) return { name: 'Chest' };
                if (type === ITEM_TYPE.BUILDING_CAMP) return { name: 'Camp' };
            }
            if (type >= 10 && type < 20) {
                const unitCode = getCode(type, level);
                const stat = UNIT_STATS[unitCode];
                if (stat) {
                    return {
                        name: stat.name,
                        class: type === 10 ? 'Infantry' : (type === 11 ? 'Archer' : 'Cavalry'),
                        hp: stat.hp,
                        atk: stat.atk,
                        def: stat.def,
                        spd: stat.spd,
                        rng: stat.rng,
                        mov: stat.mov,
                        sell: stat.sell
                    };
                }
            }
            return { name: 'Unknown', earn: 0, sell: 0 };
        }

        return {
            getCode,
            getInfoFromCode,
            getUnitClassTypeFromCode,
            getData
        };
    }

    global.KOVDataLookupModule = {
        buildDataLookupRuntime
    };
})(window);
