(function (global) {
    'use strict';

    function buildBaseRuntimeSlice(args) {
        const {
            requireGlobalModule,
            requireModuleFunction,
            GAME_DATA
        } = args;

        const buildLevelRuntime = requireModuleFunction('KOVGameLevelRuntimeModule', 'buildLevelRuntime');
        const LEVEL_RUNTIME = buildLevelRuntime(GAME_DATA);
        const LEVEL_DATA_BY_LEVEL = LEVEL_RUNTIME.LEVEL_DATA_BY_LEVEL;
        const MAX_LEVEL = LEVEL_RUNTIME.MAX_LEVEL;
        const REFILL_DATA = GAME_DATA.constants?.REFILL_DATA || {};
        const FIELD_OBJECT_DATA = GAME_DATA.field_objects || {};
        const LOCALIZATION_DATA = GAME_DATA.localization || {};

        const DEFAULT_ABILITY_CODES = {
            GOLD_CAP: 1,
            GOLD_REGEN: 2,
            ENERGY_CAP: 3,
            ENERGY_REGEN: 4,
            CP_CAP: 5,
            CP_REGEN: 6,
            GATE_OPEN: 101,
            SQUAD_SLOT: 102,
            TAX: 201,
            UPKEEP: 202
        };
        const ABILITY_CODES = Object.assign({}, DEFAULT_ABILITY_CODES, GAME_DATA.constants?.ABILITY_CODES || {});
        const ITEM_TABLE = GAME_DATA.items || {};
        const UNIT_STATS = GAME_DATA.units || {};
        const BUILDING_LIMITS = GAME_DATA.constants?.BUILDING_LIMITS || {};
        const SHOP_DATA = GAME_DATA.constants?.SHOP_DATA || [];
        const CAMP_CAPACITY = GAME_DATA.camps
            ? Object.fromEntries(Object.values(GAME_DATA.camps).map((c) => [c.level || 1, c.capacity]))
            : { 1: 4, 2: 6, 3: 8, 4: 12, 5: 16 };

        const GAMEPLAY_CONSTANTS = GAME_DATA.constants?.GAMEPLAY || {};
        const FIELD_EVENT_CONFIG = GAME_DATA.constants?.FIELD_EVENTS || {};
        const DEFAULT_LOCALE = GAME_DATA.constants?.DEFAULT_LOCALE || 'ko';

        const GAME_STATICS = requireGlobalModule('KOVGameStaticsModule');
        const GITHUB_REPO = GAME_STATICS.GITHUB_REPO;
        const GITHUB_BRANCH = GAME_STATICS.GITHUB_BRANCH;
        const ASSET_KEYS = GAME_STATICS.ASSET_KEYS;
        const CONFIG = GAME_STATICS.CONFIG;
        const ITEM_TYPE = GAME_STATICS.ITEM_TYPE;
        const LOCK_TYPE = GAME_STATICS.LOCK_TYPE;
        const ZONES = GAME_STATICS.ZONES;

        const normalizeFieldObjectData = requireModuleFunction('KOVGameDataNormalizationModule', 'normalizeFieldObjectData');
        normalizeFieldObjectData(FIELD_OBJECT_DATA);

        const createTranslator = requireModuleFunction('KOVLocalizationRuntimeModule', 'createTranslator');
        const t = createTranslator(LOCALIZATION_DATA, 'en');

        return {
            LEVEL_DATA_BY_LEVEL,
            MAX_LEVEL,
            REFILL_DATA,
            FIELD_OBJECT_DATA,
            LOCALIZATION_DATA,
            ABILITY_CODES,
            ITEM_TABLE,
            UNIT_STATS,
            BUILDING_LIMITS,
            SHOP_DATA,
            CAMP_CAPACITY,
            GAMEPLAY_CONSTANTS,
            FIELD_EVENT_CONFIG,
            DEFAULT_LOCALE,
            GITHUB_REPO,
            GITHUB_BRANCH,
            ASSET_KEYS,
            CONFIG,
            ITEM_TYPE,
            LOCK_TYPE,
            ZONES,
            t
        };
    }

    global.KOVGameRuntimeBaseSliceModule = { buildBaseRuntimeSlice };
})(window);
