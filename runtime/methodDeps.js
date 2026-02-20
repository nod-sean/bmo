(function (global) {
    'use strict';

    function buildGameMethodDeps(args) {
        const {
            CONFIG,
            MAP_SIZE,
            FIELD_MAP_DATA,
            FIELD_EVENT_TYPES,
            PLAYER_START,
            FIELD_EVENT_RATES,
            isBlockingField,
            isBorderTerrain,
            FOG_RADIUS,
            GAMEPLAY,
            DEFAULT_WORLD_PRESET_ID,
            WORLD_END_CONDITIONS,
            WORLD_SEASON_POLICY,
            DEFAULT_WORLD_RULESET,
            WORLD_ADMIN_DEPS,
            normalizeWorldRuleSetName,
            DEFAULT_LOCALE,
            ITEM_TYPE,
            LOCK_TYPE,
            UNLOCK_LEVEL_MAP,
            UNLOCK_GOLD_MAP,
            UNLOCK_ITEM_MAP,
            FIELD_OBJECT_REGEN,
            applyObjectRegenCycle,
            CAMP_CAPACITY,
            getData,
            getInfoFromCode,
            isWallTile,
            isGateTile,
            isCitadelTile,
            isDragonTile,
            isStatueTile,
            isRuinsTile,
            isFountainTile,
            isShopTile,
            isTavernTile,
            BUILDING_LIMITS,
            BUILDING_DATA,
            ITEM_VALUES,
            MERGE_XP_DATA,
            CHEST_DROP_TABLE,
            SHOP_DATA,
            ZONES,
            DUMMY_CHAT_MESSAGES,
            FIELD_TERRAIN_DATA,
            isTerrainCode,
            isCastleTile,
            isGoldMineTile,
            getTerrainBase,
            getObjectLevelFromCode,
            ABILITY_CODES,
            UNIT_STATS,
            getCode,
            getUnitClassTypeFromCode,
            BattleSimulator,
            LEVEL_COLORS,
            AStar,
            TERRAIN_COLORS,
            TERRAIN_COLORS_BORDER,
            getFieldObjectKind
        } = args;

        const BOOTSTRAP_STATE_DEPS = Object.freeze({
            CONFIG,
            MAP_SIZE,
            FIELD_MAP_DATA,
            FIELD_EVENT_TYPES,
            PLAYER_START,
            FIELD_EVENT_RATES,
            isBlockingField,
            isBorderTerrain,
            FOG_RADIUS,
            DEFAULT_WORLD_PRESET_ID,
            WORLD_END_CONDITIONS,
            WORLD_SEASON_POLICY,
            DEFAULT_WORLD_RULESET,
            WORLD_ADMIN_DEPS,
            normalizeWorldRuleSetName,
            DEFAULT_LOCALE,
            ITEM_TYPE,
            LOCK_TYPE,
            UNLOCK_LEVEL_MAP,
            UNLOCK_GOLD_MAP,
            UNLOCK_ITEM_MAP,
            FIELD_OBJECT_REGEN,
            applyObjectRegenCycle,
            CAMP_CAPACITY,
            getData,
            getInfoFromCode,
            GAMEPLAY,
            isWallTile,
            isGateTile,
            isCitadelTile,
            isDragonTile,
            isStatueTile,
            isRuinsTile,
            isFountainTile,
            isShopTile,
            isTavernTile,
            BUILDING_LIMITS,
            BUILDING_DATA,
            ITEM_VALUES,
            MERGE_XP_DATA,
            CHEST_DROP_TABLE,
            SHOP_DATA,
            ZONES,
            DUMMY_CHAT_MESSAGES,
            ABILITY_CODES
        });

        const FIELD_INFO_DEPS = Object.freeze({
            GAMEPLAY,
            isShopTile,
            isTavernTile,
            FIELD_EVENT_TYPES,
            isGateTile,
            isCitadelTile,
            isStatueTile,
            isWallTile,
            isCastleTile,
            isDragonTile,
            isGoldMineTile,
            isFountainTile,
            isRuinsTile,
            isTerrainCode,
            getTerrainBase,
            getObjectLevelFromCode,
            getInfoFromCode,
            getData,
            ABILITY_CODES
        });

        const BATTLE_PREP_DEPS = Object.freeze({
            GAMEPLAY,
            FIELD_EVENT_TYPES,
            UNIT_STATS,
            getCode,
            getUnitClassTypeFromCode,
            getData
        });
        const BATTLE_START_DEPS = Object.freeze({
            GAMEPLAY,
            FIELD_EVENT_TYPES,
            UNIT_STATS,
            BattleSimulator,
            getCode,
            getUnitClassTypeFromCode
        });

        const POPULATE_FIELD_EVENTS_DEPS = Object.freeze({
            GAMEPLAY,
            MAP_SIZE,
            FIELD_MAP_DATA,
            FIELD_EVENT_TYPES,
            PLAYER_START,
            FIELD_EVENT_RATES,
            isBlockingField,
            isBorderTerrain,
            getFieldObjectKind
        });

        const MERGE_LOOP_DEPS = Object.freeze({
            CONFIG,
            ZONES,
            LOCK_TYPE,
            LEVEL_COLORS,
            ITEM_TYPE,
            CAMP_CAPACITY,
            BUILDING_DATA,
            MERGE_XP_DATA,
            getData,
            getInfoFromCode
        });

        const FIELD_ACTION_MENU_DEPS = Object.freeze({
            GAMEPLAY,
            isGoldMineTile,
            isFountainTile,
            isShopTile,
            isTavernTile,
            FIELD_EVENT_TYPES,
            FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA,
            AStar,
            isBorderTerrain,
            isGateTile,
            isCitadelTile,
            isDragonTile,
            isTerrainCode,
            getTerrainBase,
            isWallTile,
            getFieldObjectKind
        });

        const FIELD_RENDER_BASE_DEPS = Object.freeze({
            GAMEPLAY,
            MAP_SIZE,
            FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA,
            TERRAIN_COLORS,
            TERRAIN_COLORS_BORDER,
            isTerrainCode,
            getTerrainBase,
            isWallTile,
            isCastleTile,
            isGateTile,
            isCitadelTile,
            isDragonTile,
            isGoldMineTile,
            isFountainTile,
            isShopTile,
            isTavernTile,
            isRuinsTile,
            isStatueTile,
            FIELD_EVENT_TYPES,
            PLAYER_START,
            AStar,
            isBorderTerrain
        });

        const FIELD_UI_VISUAL_DEPS = FIELD_RENDER_BASE_DEPS;
        const FIELD_MAP_RENDER_DEPS = Object.freeze(Object.assign({}, FIELD_RENDER_BASE_DEPS, { getFieldObjectKind }));

        const UPDATE_ARMIES_DEPS = Object.freeze({
            FOG_RADIUS,
            ITEM_TYPE,
            FIELD_EVENT_TYPES,
            FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA,
            MAP_SIZE,
            isWallTile,
            isBorderTerrain,
            isGateTile,
            isTerrainCode,
            getInfoFromCode
        });

        const METHOD_DEPS = Object.freeze({
            FIELD_INFO: FIELD_INFO_DEPS,
            BATTLE_PREP: BATTLE_PREP_DEPS,
            BATTLE_START: BATTLE_START_DEPS,
            POPULATE_FIELD_EVENTS: POPULATE_FIELD_EVENTS_DEPS,
            MERGE_LOOP: MERGE_LOOP_DEPS,
            FIELD_ACTION_MENU: FIELD_ACTION_MENU_DEPS,
            FIELD_UI_VISUAL: FIELD_UI_VISUAL_DEPS,
            FIELD_MAP_RENDER: FIELD_MAP_RENDER_DEPS,
            UPDATE_ARMIES: UPDATE_ARMIES_DEPS
        });

        return {
            BOOTSTRAP_STATE_DEPS,
            METHOD_DEPS
        };
    }

    global.KOVGameMethodDepsModule = { buildGameMethodDeps };
})(window);
