(function (global) {
    'use strict';

    function buildMethodDepsInput(args) {
        const { base, worldSlice, mergeSlice, fieldSlice, GAMEPLAY, runtimeBits } = args;
        return {
            CONFIG: base.CONFIG,
            MAP_SIZE: fieldSlice.MAP_SIZE,
            FIELD_MAP_DATA: fieldSlice.FIELD_MAP_DATA,
            FIELD_EVENT_TYPES: fieldSlice.FIELD_EVENT_TYPES,
            PLAYER_START: fieldSlice.PLAYER_START,
            FIELD_EVENT_RATES: fieldSlice.FIELD_EVENT_RATES,
            isBlockingField: fieldSlice.isBlockingField,
            isBorderTerrain: fieldSlice.isBorderTerrain,
            FOG_RADIUS: fieldSlice.FOG_RADIUS,
            GAMEPLAY,
            DEFAULT_WORLD_PRESET_ID: worldSlice.DEFAULT_WORLD_PRESET_ID,
            WORLD_END_CONDITIONS: worldSlice.WORLD_END_CONDITIONS,
            WORLD_SEASON_POLICY: worldSlice.WORLD_SEASON_POLICY,
            DEFAULT_WORLD_RULESET: worldSlice.DEFAULT_WORLD_RULESET,
            WORLD_ADMIN_DEPS: worldSlice.WORLD_ADMIN_DEPS,
            normalizeWorldRuleSetName: worldSlice.normalizeWorldRuleSetName,
            DEFAULT_LOCALE: base.DEFAULT_LOCALE,
            ITEM_TYPE: base.ITEM_TYPE,
            LOCK_TYPE: base.LOCK_TYPE,
            UNLOCK_LEVEL_MAP: mergeSlice.UNLOCK_LEVEL_MAP,
            UNLOCK_GOLD_MAP: mergeSlice.UNLOCK_GOLD_MAP,
            FIELD_OBJECT_REGEN: fieldSlice.FIELD_OBJECT_REGEN,
            applyObjectRegenCycle: fieldSlice.applyObjectRegenCycle,
            CAMP_CAPACITY: base.CAMP_CAPACITY,
            getData: fieldSlice.getData,
            getInfoFromCode: fieldSlice.getInfoFromCode,
            isWallTile: fieldSlice.isWallTile,
            isGateTile: fieldSlice.isGateTile,
            isCitadelTile: fieldSlice.isCitadelTile,
            isDragonTile: fieldSlice.isDragonTile,
            isStatueTile: fieldSlice.isStatueTile,
            isRuinsTile: fieldSlice.isRuinsTile,
            isFountainTile: fieldSlice.isFountainTile,
            isShopTile: fieldSlice.isShopTile,
            isTavernTile: fieldSlice.isTavernTile,
            BUILDING_LIMITS: base.BUILDING_LIMITS,
            BUILDING_DATA: mergeSlice.BUILDING_DATA,
            ITEM_VALUES: mergeSlice.ITEM_VALUES,
            MERGE_XP_DATA: mergeSlice.MERGE_XP_DATA,
            CHEST_DROP_TABLE: mergeSlice.CHEST_DROP_TABLE,
            SHOP_DATA: base.SHOP_DATA,
            ZONES: base.ZONES,
            DUMMY_CHAT_MESSAGES: runtimeBits.DUMMY_CHAT_MESSAGES,
            FIELD_TERRAIN_DATA: fieldSlice.FIELD_TERRAIN_DATA,
            isTerrainCode: fieldSlice.isTerrainCode,
            isCastleTile: fieldSlice.isCastleTile,
            isGoldMineTile: fieldSlice.isGoldMineTile,
            getTerrainBase: fieldSlice.getTerrainBase,
            getObjectLevelFromCode: fieldSlice.getObjectLevelFromCode,
            ABILITY_CODES: base.ABILITY_CODES,
            UNIT_STATS: base.UNIT_STATS,
            getCode: fieldSlice.getCode,
            getUnitClassTypeFromCode: fieldSlice.getUnitClassTypeFromCode,
            BattleSimulator: runtimeBits.BattleSimulator,
            LEVEL_COLORS: fieldSlice.LEVEL_COLORS,
            AStar: runtimeBits.AStar,
            TERRAIN_COLORS: runtimeBits.TERRAIN_COLORS,
            TERRAIN_COLORS_BORDER: runtimeBits.TERRAIN_COLORS_BORDER,
            getFieldObjectKind: fieldSlice.getFieldObjectKind
        };
    }

    function buildRuntimeDepsBundle(args) {
        const {
            requireModuleFunction,
            base,
            worldSlice,
            mergeSlice,
            fieldSlice,
            GAMEPLAY,
            runtimeBits
        } = args;

        const buildGameMethodDeps = requireModuleFunction('KOVGameMethodDepsModule', 'buildGameMethodDeps');
        return buildGameMethodDeps(buildMethodDepsInput({
            base,
            worldSlice,
            mergeSlice,
            fieldSlice,
            GAMEPLAY,
            runtimeBits
        }));
    }

    global.KOVGameRuntimeDepsAssemblerModule = { buildRuntimeDepsBundle };
})(window);
