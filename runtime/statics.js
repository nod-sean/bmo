(function (global) {
    'use strict';

    const GITHUB_REPO = 'nod-sean/bmo';
    const GITHUB_BRANCH = 'main';

    const ASSET_KEYS = [
        '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109', '1110',
        '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', '1210',
        '1301', '1302', '1303', '1304', '1305', '1306', '1307', '1308', '1309', '1310',
        '2101', '2102', '2103', '2104', '2105', '2201', '2204', '2205',
        '2301', '2302', '2303', '2304', '2801', '2802', '2803', '2804', '2805',
        '3101', '3102', '3103', '3104', '3105',
        '1801', '1802', '1803', '1804', '1805', '1811', '1812', '1813', '1814', '1815',
        '1821', '1822', '1823', '1824', '1825', 'lock', 'gold', 'energy', 'crystal', 'xp', 'levelup', 'field_bg'
    ];

    const CONFIG = Object.freeze({
        gridCols: 8,
        gridRows: 8,
        gridTopY: 460,
        gridPadding: 20,
        squadCols: 3,
        squadRows: 3,
        squadTopY: 40,
        squadGap: 80,
        squadCellSize: 130,
        squadGap3: 24,
        squadCellSize3: 110
    });

    const ITEM_TYPE = Object.freeze({
        EMPTY: 0,
        BUILDING_BARRACKS: 1,
        BUILDING_RANGE: 2,
        BUILDING_STABLE: 3,
        BUILDING_CHEST: 4,
        BUILDING_CAMP: 5,
        UNIT_INFANTRY: 10,
        UNIT_ARCHER: 11,
        UNIT_CAVALRY: 12,
        UNIT_DRAGON: 9999,
        ITEM_GOLD: 20,
        ITEM_ENERGY: 21,
        ITEM_CRYSTAL: 22
    });

    const LOCK_TYPE = Object.freeze({ OPEN: 0, GOLD: 1, LEVEL: 2 });
    const ZONES = Object.freeze({ GRID: 'grid', SQUAD1: 'squad1', SQUAD2: 'squad2', SQUAD3: 'squad3' });

    global.KOVGameStaticsModule = {
        GITHUB_REPO,
        GITHUB_BRANCH,
        ASSET_KEYS,
        CONFIG,
        ITEM_TYPE,
        LOCK_TYPE,
        ZONES
    };
})(window);

