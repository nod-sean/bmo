(function (global) {
    'use strict';

    function buildRuntimeGroups(args) {
        const {
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
        } = args;

        const core = Object.freeze({
            t: base.t,
            AssetLoader: runtimeClasses.AssetLoader,
            SoundManager: runtimeClasses.SoundManager,
            Particle: runtimeClasses.Particle,
            bootstrapGameState,
            BOOTSTRAP_STATE_DEPS,
            METHOD_DEPS,
            DEFAULT_LOCALE: base.DEFAULT_LOCALE,
            CONFIG: base.CONFIG,
            LEVEL_DATA_BY_LEVEL: base.LEVEL_DATA_BY_LEVEL,
            MAX_LEVEL: base.MAX_LEVEL,
            REFILL_DATA: base.REFILL_DATA
        });

        const merge = Object.freeze({
            ZONES: base.ZONES,
            LOCK_TYPE: base.LOCK_TYPE,
            ITEM_TYPE: base.ITEM_TYPE,
            CAMP_CAPACITY: base.CAMP_CAPACITY,
            UNLOCK_LEVEL_MAP: mergeSlice.UNLOCK_LEVEL_MAP,
            UNLOCK_GOLD_MAP: mergeSlice.UNLOCK_GOLD_MAP
        });

        const battle = Object.freeze({
            DRAGON_BOSS_CONFIG: worldSlice.DRAGON_BOSS_CONFIG
        });

        const world = Object.freeze({
            WORLD_RULESET_KEYS: worldSlice.WORLD_RULESET_KEYS,
            WORLD_RULESETS: worldSlice.WORLD_RULESETS,
            WORLD_PRESETS: worldSlice.WORLD_PRESETS,
            WORLD_ADMIN_DEPS: worldSlice.WORLD_ADMIN_DEPS,
            WORLD_SCORE_DEPS: fieldSlice.WORLD_SCORE_DEPS,
            WORLD_NEXT_SEASON_DEPS: fieldSlice.WORLD_NEXT_SEASON_DEPS,
            DEFAULT_WORLD_END_REWARD_CONFIG: worldSlice.DEFAULT_WORLD_END_REWARD_CONFIG,
            GAMEPLAY
        });

        const field = Object.freeze({
            MAP_SIZE: fieldSlice.MAP_SIZE,
            FOG_RADIUS: fieldSlice.FOG_RADIUS,
            FIELD_MAP_DATA: fieldSlice.FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA: fieldSlice.FIELD_TERRAIN_DATA,
            FIELD_EVENT_TYPES: fieldSlice.FIELD_EVENT_TYPES,
            EVENT_DROP_TABLE: fieldSlice.EVENT_DROP_TABLE,
            getCode: fieldSlice.getCode,
            getData: fieldSlice.getData,
            getInfoFromCode: fieldSlice.getInfoFromCode,
            getFieldObjectKind: fieldSlice.getFieldObjectKind,
            getFieldObjectDataByType: fieldSlice.getFieldObjectDataByType,
            getObjectLevelFromCode: fieldSlice.getObjectLevelFromCode,
            getTerrainBase: fieldSlice.getTerrainBase,
            getStatueKind: fieldSlice.getStatueKind,
            isCapturableFieldObjectKind: fieldSlice.isCapturableFieldObjectKind,
            isBorderTerrain: fieldSlice.isBorderTerrain,
            isGateTile: fieldSlice.isGateTile,
            isStatueTile: fieldSlice.isStatueTile,
            isRuinsTile: fieldSlice.isRuinsTile,
            isCitadelTile: fieldSlice.isCitadelTile,
            isDragonTile: fieldSlice.isDragonTile,
            isWallTile: fieldSlice.isWallTile,
            isTerrainCode: fieldSlice.isTerrainCode,
            isShopTile: fieldSlice.isShopTile,
            isTavernTile: fieldSlice.isTavernTile
        });

        const shared = Object.freeze({
            ITEM_TABLE: base.ITEM_TABLE,
            UNIT_STATS: base.UNIT_STATS,
            ABILITY_CODES: base.ABILITY_CODES,
            FIELD_OBJECT_REWARD_TABLE
        });

        return Object.freeze({ core, merge, battle, world, field, shared });
    }

    global.KOVGameRuntimeGroupsModule = { buildRuntimeGroups };
})(window);
