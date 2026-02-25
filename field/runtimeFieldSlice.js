(function (global) {
    'use strict';

    function buildFieldRuntimeSlice(args) {
        const {
            requireModuleFunction,
            assertObjectFunctions,
            GAME_DATA,
            FIELD_OBJECT_DATA,
            FIELD_EVENT_CONFIG,
            ITEM_TYPE,
            UNIT_STATS,
            BUILDING_DATA,
            ITEM_VALUES
        } = args;

        const createFieldRules = requireModuleFunction('KOVFieldRulesModule', 'createFieldRules');
        const FIELD_RULES = createFieldRules(FIELD_OBJECT_DATA);
        assertObjectFunctions('FIELD_RULES', FIELD_RULES, [
            'getFieldObjectKind', 'getFieldObjectDataByType', 'isTerrainCode', 'isWallTile', 'getTerrainBase',
            'isCastleTile', 'isGateTile', 'isCitadelTile', 'isDragonTile', 'isReturnGateTile', 'isGoldMineTile', 'isFountainTile',
            'isShopTile', 'isTavernTile', 'isRuinsTile', 'isStatueTile', 'isTerritoryTile', 'isBorderTerrain', 'isBlockingField',
            'getStatueKind', 'getObjectLevelFromCode', 'isCapturableFieldObjectKind'
        ]);

        const getFieldObjectKind = FIELD_RULES.getFieldObjectKind;
        const getFieldObjectDataByType = FIELD_RULES.getFieldObjectDataByType;
        const isTerrainCode = FIELD_RULES.isTerrainCode;
        const isWallTile = FIELD_RULES.isWallTile;
        const getTerrainBase = FIELD_RULES.getTerrainBase;
        const isCastleTile = FIELD_RULES.isCastleTile;
        const isGateTile = FIELD_RULES.isGateTile;
        const isCitadelTile = FIELD_RULES.isCitadelTile;
        const isDragonTile = FIELD_RULES.isDragonTile;
        const isReturnGateTile = FIELD_RULES.isReturnGateTile;
        const isGoldMineTile = FIELD_RULES.isGoldMineTile;
        const isFountainTile = FIELD_RULES.isFountainTile;
        const isShopTile = FIELD_RULES.isShopTile;
        const isTavernTile = FIELD_RULES.isTavernTile;
        const isRuinsTile = FIELD_RULES.isRuinsTile;
        const isStatueTile = FIELD_RULES.isStatueTile;
        const isTerritoryTile = FIELD_RULES.isTerritoryTile;
        const isBorderTerrain = FIELD_RULES.isBorderTerrain;
        const isBlockingField = FIELD_RULES.isBlockingField;
        const getStatueKind = FIELD_RULES.getStatueKind;
        const getObjectLevelFromCode = FIELD_RULES.getObjectLevelFromCode;
        const isCapturableFieldObjectKind = FIELD_RULES.isCapturableFieldObjectKind;

        const WORLD_SCORE_DEPS = Object.freeze({
            isCitadelTile,
            isGateTile,
            isDragonTile,
            isShopTile,
            isTavernTile,
            isGoldMineTile,
            isFountainTile
        });

        const LEVEL_COLORS = {
            1: '#FFFFFF', 2: '#BDBDBD', 3: '#6D4C41', 4: '#2E7D32', 5: '#00897B',
            6: '#1E88E5', 7: '#6A1B9A', 8: '#F57C00', 9: '#C62828', 10: '#212121'
        };

        const buildFieldConsts = requireModuleFunction('KOVFieldConstsModule', 'buildFieldConsts');
        const FIELD_CONSTS = buildFieldConsts(GAME_DATA, FIELD_EVENT_CONFIG);
        const FIELD_EVENT_TYPES = FIELD_CONSTS.FIELD_EVENT_TYPES;
        const FIELD_EVENT_RATES = FIELD_CONSTS.FIELD_EVENT_RATES;
        const EVENT_DROP_TABLE = FIELD_CONSTS.EVENT_DROP_TABLE;
        const FIELD_MAP_DATA = FIELD_CONSTS.FIELD_MAP_DATA;
        const FIELD_TERRAIN_DATA = FIELD_CONSTS.FIELD_TERRAIN_DATA;
        const MAP_SIZE = FIELD_CONSTS.MAP_SIZE;
        const PLAYER_START = FIELD_CONSTS.PLAYER_START;
        const FOG_RADIUS = FIELD_CONSTS.FOG_RADIUS;
        const WORLD_NEXT_SEASON_DEPS = Object.freeze({ PLAYER_START, FOG_RADIUS });

        const buildFieldSpawnRuntime = requireModuleFunction('KOVFieldSpawnModule', 'buildFieldSpawnRuntime');
        const FIELD_SPAWN_RUNTIME = buildFieldSpawnRuntime({
            FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA,
            isTerrainCode,
            isBorderTerrain,
            isWallTile
        });
        assertObjectFunctions('FIELD_SPAWN_RUNTIME', FIELD_SPAWN_RUNTIME, ['applyObjectRegenCycle', 'initializeFieldObjectMap']);
        const FIELD_OBJECT_REGEN = FIELD_SPAWN_RUNTIME.FIELD_OBJECT_REGEN;
        const applyObjectRegenCycle = FIELD_SPAWN_RUNTIME.applyObjectRegenCycle;
        FIELD_SPAWN_RUNTIME.initializeFieldObjectMap();

        const buildDataLookupRuntime = requireModuleFunction('KOVDataLookupModule', 'buildDataLookupRuntime');
        const DATA_LOOKUP_RUNTIME = buildDataLookupRuntime({
            ITEM_TYPE,
            ITEM_VALUES,
            BUILDING_DATA,
            UNIT_STATS
        });
        assertObjectFunctions('DATA_LOOKUP_RUNTIME', DATA_LOOKUP_RUNTIME, ['getCode', 'getInfoFromCode', 'getUnitClassTypeFromCode', 'getData']);
        const getCode = DATA_LOOKUP_RUNTIME.getCode;
        const getInfoFromCode = DATA_LOOKUP_RUNTIME.getInfoFromCode;
        const getUnitClassTypeFromCode = DATA_LOOKUP_RUNTIME.getUnitClassTypeFromCode;
        const getData = DATA_LOOKUP_RUNTIME.getData;

        return {
            getFieldObjectKind,
            getFieldObjectDataByType,
            isTerrainCode,
            isWallTile,
            getTerrainBase,
            isCastleTile,
            isGateTile,
            isCitadelTile,
            isDragonTile,
            isReturnGateTile,
            isGoldMineTile,
            isFountainTile,
            isShopTile,
            isTavernTile,
            isRuinsTile,
            isStatueTile,
            isTerritoryTile,
            isBorderTerrain,
            isBlockingField,
            getStatueKind,
            getObjectLevelFromCode,
            isCapturableFieldObjectKind,
            WORLD_SCORE_DEPS,
            LEVEL_COLORS,
            FIELD_EVENT_TYPES,
            FIELD_EVENT_RATES,
            EVENT_DROP_TABLE,
            FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA,
            MAP_SIZE,
            PLAYER_START,
            FOG_RADIUS,
            WORLD_NEXT_SEASON_DEPS,
            FIELD_OBJECT_REGEN,
            applyObjectRegenCycle,
            getCode,
            getInfoFromCode,
            getUnitClassTypeFromCode,
            getData
        };
    }

    global.KOVGameRuntimeFieldSliceModule = { buildFieldRuntimeSlice };
})(window);
