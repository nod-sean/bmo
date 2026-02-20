(function (global) {
    'use strict';

    function requireRuntimeGroup(runtime, key) {
        if (!runtime || typeof runtime !== 'object' || !runtime[key] || typeof runtime[key] !== 'object') {
            throw new Error(`[KOV] Missing runtime group: ${key}`);
        }
        return runtime[key];
    }

    function applyGameInstanceSetup(game, runtime) {
        const core = requireRuntimeGroup(runtime, 'core');
        const merge = requireRuntimeGroup(runtime, 'merge');
        const world = requireRuntimeGroup(runtime, 'world');
        const field = requireRuntimeGroup(runtime, 'field');
        const battle = requireRuntimeGroup(runtime, 'battle');
        const shared = requireRuntimeGroup(runtime, 'shared');

        game.adminUiDeps = { WORLD_PRESETS: world.WORLD_PRESETS, WORLD_ADMIN_DEPS: world.WORLD_ADMIN_DEPS };
        game.localeControlDeps = { DEFAULT_LOCALE: core.DEFAULT_LOCALE, WORLD_PRESETS: world.WORLD_PRESETS, WORLD_ADMIN_DEPS: world.WORLD_ADMIN_DEPS };
        game.uiShellDeps = { MAX_LEVEL: core.MAX_LEVEL };
        game.mergeActionDeps = { ZONES: merge.ZONES, ITEM_TYPE: merge.ITEM_TYPE, CAMP_CAPACITY: merge.CAMP_CAPACITY, getData: field.getData };
        game.refillDeps = { REFILL_DATA: core.REFILL_DATA };
        game.levelDeps = {
            LEVEL_DATA_BY_LEVEL: core.LEVEL_DATA_BY_LEVEL,
            MAX_LEVEL: core.MAX_LEVEL,
            CONFIG: core.CONFIG,
            LOCK_TYPE: merge.LOCK_TYPE,
            UNLOCK_LEVEL_MAP: merge.UNLOCK_LEVEL_MAP,
            UNLOCK_GOLD_MAP: merge.UNLOCK_GOLD_MAP
        };
        game.spawnItemDeps = { CONFIG: core.CONFIG, LOCK_TYPE: merge.LOCK_TYPE };
        game.mergeLoopDeps = core.METHOD_DEPS.MERGE_LOOP;
        game.battlePrepDeps = core.METHOD_DEPS.BATTLE_PREP;
        game.battleStartDeps = core.METHOD_DEPS.BATTLE_START;
        game.battleResultDeps = {
            FOG_RADIUS: field.FOG_RADIUS,
            PLAYER_START: world.WORLD_NEXT_SEASON_DEPS?.PLAYER_START || { r: 22, c: 7 },
            EVENT_DROP_TABLE: field.EVENT_DROP_TABLE,
            FIELD_EVENT_TYPES: field.FIELD_EVENT_TYPES,
            FIELD_MAP_DATA: field.FIELD_MAP_DATA,
            isGateTile: field.isGateTile,
            isDragonTile: field.isDragonTile,
            ITEM_TYPE: merge.ITEM_TYPE,
            getCode: field.getCode,
            getInfoFromCode: field.getInfoFromCode,
            FIELD_OBJECT_REWARD_TABLE: shared.FIELD_OBJECT_REWARD_TABLE,
            DRAGON_BOSS_CONFIG: battle.DRAGON_BOSS_CONFIG,
            GAMEPLAY: world.GAMEPLAY
        };
        game.worldRuleSetKeys = world.WORLD_RULESET_KEYS;
        game.worldRuleSets = world.WORLD_RULESETS;
        game.worldAdminDeps = world.WORLD_ADMIN_DEPS;
        game.worldScoreDeps = world.WORLD_SCORE_DEPS;
        game.worldEndRewardConfig = world.DEFAULT_WORLD_END_REWARD_CONFIG;
        game.worldNextSeasonDeps = world.WORLD_NEXT_SEASON_DEPS;
        game.populateFieldEventsDeps = core.METHOD_DEPS.POPULATE_FIELD_EVENTS;
        game.fieldBonusDeps = {
            CONFIG: core.CONFIG,
            FIELD_MAP_DATA: field.FIELD_MAP_DATA,
            GAMEPLAY: world.GAMEPLAY,
            ABILITY_CODES: shared.ABILITY_CODES,
            isStatueTile: field.isStatueTile,
            isRuinsTile: field.isRuinsTile,
            isCitadelTile: field.isCitadelTile
        };
        game.fieldMapData = field.FIELD_MAP_DATA;
        game.shopDeps = {
            FIELD_EVENT_TYPES: field.FIELD_EVENT_TYPES,
            ITEM_TABLE: shared.ITEM_TABLE,
            UNIT_STATS: shared.UNIT_STATS,
            ITEM_TYPE: merge.ITEM_TYPE,
            ZONES: merge.ZONES,
            getInfoFromCode: field.getInfoFromCode,
            isShopTile: field.isShopTile,
            isTavernTile: field.isTavernTile
        };
        game.portalDeps = {
            GAMEPLAY: world.GAMEPLAY,
            FOG_RADIUS: field.FOG_RADIUS,
            MAP_SIZE: field.MAP_SIZE,
            FIELD_MAP_DATA: field.FIELD_MAP_DATA,
            isBorderTerrain: field.isBorderTerrain
        };
        game.fieldFlowDeps = {
            FIELD_EVENT_TYPES: field.FIELD_EVENT_TYPES,
            FIELD_MAP_DATA: field.FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA: field.FIELD_TERRAIN_DATA,
            MAP_SIZE: field.MAP_SIZE,
            isBorderTerrain: field.isBorderTerrain,
            isGateTile: field.isGateTile,
            isTerrainCode: field.isTerrainCode,
            getInfoFromCode: field.getInfoFromCode
        };
        game.fieldInfoDeps = core.METHOD_DEPS.FIELD_INFO;
        game.fieldActionMenuDeps = core.METHOD_DEPS.FIELD_ACTION_MENU;
        game.fieldUiVisualDeps = core.METHOD_DEPS.FIELD_UI_VISUAL;
        game.fieldMapRenderDeps = core.METHOD_DEPS.FIELD_MAP_RENDER;
        game.updateArmiesDeps = core.METHOD_DEPS.UPDATE_ARMIES;
        game.revealFogDeps = { MAP_SIZE: field.MAP_SIZE };
        game.gameCoreDeps = {
            FIELD_EVENT_TYPES: field.FIELD_EVENT_TYPES,
            getFieldObjectKind: field.getFieldObjectKind,
            isCapturableFieldObjectKind: field.isCapturableFieldObjectKind
        };
        game.fieldObjectDataDeps = {
            FIELD_EVENT_TYPES: field.FIELD_EVENT_TYPES,
            ITEM_TYPE: merge.ITEM_TYPE,
            isDragonTile: field.isDragonTile,
            getFieldObjectDataByType: field.getFieldObjectDataByType
        };
        game.fieldLevelDeps = { getObjectLevelFromCode: field.getObjectLevelFromCode };
        game.fieldNavDeps = {
            isWallTile: field.isWallTile,
            isTerrainCode: field.isTerrainCode,
            getTerrainBase: field.getTerrainBase,
            getFieldObjectKind: field.getFieldObjectKind
        };
        game.captureEffectDeps = {
            isStatueTile: field.isStatueTile,
            ABILITY_CODES: shared.ABILITY_CODES,
            isShopTile: field.isShopTile,
            isTavernTile: field.isTavernTile
        };
        game.statueBuffDeps = {
            getStatueKind: field.getStatueKind,
            GAMEPLAY: world.GAMEPLAY,
            getObjectLevelFromCode: field.getObjectLevelFromCode
        };
    }

    global.KOVGameInstanceSetupModule = { applyGameInstanceSetup };
})(window);
