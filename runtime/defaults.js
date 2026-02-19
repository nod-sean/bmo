(function (global) {
    'use strict';

    const DEFAULT_GAMEPLAY_CONSTANTS = Object.freeze({
        MOVE_MS_PER_MIN: 120,
        CP_COST_PER_TILE: 1,
        CP_COST_PER_COMMAND: 1,
        ENABLE_DUNGEON: false,
        ENABLE_REBELLION: false,
        ENABLE_PORTAL: false,
        ENABLE_CROWN_CASTLE: false,
        PORTAL_CP_COST: 1,
        DUNGEON_COOLDOWN_MS: 300000,
        DUNGEON_ENTRY_GOLD_COST: 200,
        DUNGEON_ENTRY_ENERGY_COST: 5,
        DUNGEON_ENTRY_CP_COST: 1,
        REBELLION_RANDOM_CHANCE: 0.0008,
        REBELLION_UNPAID_CHANCE: 0.2,
        REBELLION_COOLDOWN_MS: 300000,
        CROWN_HOLD_MS: 600000,
        SHOP_HOURLY_GOLD_FALLBACK: 120,
        TAVERN_HOURLY_GOLD_FALLBACK: 120,
        TERRAIN_COLORS: { 100: '#4a6e3a', 200: '#2e5a2a', 300: '#8b6f3d', 400: '#7a7a7a', 500: '#7a1f1f' },
        TERRAIN_COLORS_BORDER: { 100: '#5b7b47', 200: '#3b6a36', 300: '#9b7e4a', 400: '#8a8a8a', 500: '#8a2b2b' },
        STATUE_BUFF_FALLBACK: { 1: 0.05, 2: 0.10 },
        CITADEL_CP_BONUS: 0,
        GATE_UPKEEP_PER_LEVEL: 1,
        CITADEL_UPKEEP_PER_LEVEL: 2,
        MERGE_XP_FALLBACK: { 1: 1, 2: 2, 3: 4, 4: 5, 5: 6, 6: 8, 7: 10, 8: 15, 9: 20, 10: 0 },
        ITEM_VALUES_FALLBACK: { 1: 1, 2: 2, 3: 6, 4: 14, 5: 32 }
    });

    function readNumberConstant(raw, key, fallback) {
        const n = Number(raw && raw[key]);
        return Number.isFinite(n) ? n : fallback;
    }

    function readBooleanConstant(raw, key, fallback) {
        const value = raw && raw[key];
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
            if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
        }
        return fallback;
    }

    function buildGameplayConstants(gameplayConstants) {
        const raw = gameplayConstants || {};
        const dc = DEFAULT_GAMEPLAY_CONSTANTS;
        const cpCostPerTile = readNumberConstant(raw, 'CP_COST_PER_TILE', dc.CP_COST_PER_TILE);
        return Object.freeze({
            MOVE_MS_PER_MIN: readNumberConstant(raw, 'MOVE_MS_PER_MIN', dc.MOVE_MS_PER_MIN),
            CP_COST_PER_COMMAND: readNumberConstant(raw, 'CP_COST_PER_COMMAND', cpCostPerTile || dc.CP_COST_PER_COMMAND),
            ENABLE_DUNGEON: readBooleanConstant(raw, 'ENABLE_DUNGEON', dc.ENABLE_DUNGEON),
            ENABLE_REBELLION: readBooleanConstant(raw, 'ENABLE_REBELLION', dc.ENABLE_REBELLION),
            ENABLE_PORTAL: readBooleanConstant(raw, 'ENABLE_PORTAL', dc.ENABLE_PORTAL),
            ENABLE_CROWN_CASTLE: readBooleanConstant(raw, 'ENABLE_CROWN_CASTLE', dc.ENABLE_CROWN_CASTLE),
            PORTAL_CP_COST: readNumberConstant(raw, 'PORTAL_CP_COST', dc.PORTAL_CP_COST),
            DUNGEON_COOLDOWN_MS: readNumberConstant(raw, 'DUNGEON_COOLDOWN_MS', dc.DUNGEON_COOLDOWN_MS),
            DUNGEON_ENTRY_GOLD_COST: readNumberConstant(raw, 'DUNGEON_ENTRY_GOLD_COST', dc.DUNGEON_ENTRY_GOLD_COST),
            DUNGEON_ENTRY_ENERGY_COST: readNumberConstant(raw, 'DUNGEON_ENTRY_ENERGY_COST', dc.DUNGEON_ENTRY_ENERGY_COST),
            DUNGEON_ENTRY_CP_COST: readNumberConstant(raw, 'DUNGEON_ENTRY_CP_COST', dc.DUNGEON_ENTRY_CP_COST),
            REBELLION_RANDOM_CHANCE: readNumberConstant(raw, 'REBELLION_RANDOM_CHANCE', dc.REBELLION_RANDOM_CHANCE),
            REBELLION_UNPAID_CHANCE: readNumberConstant(raw, 'REBELLION_UNPAID_CHANCE', dc.REBELLION_UNPAID_CHANCE),
            REBELLION_COOLDOWN_MS: readNumberConstant(raw, 'REBELLION_COOLDOWN_MS', dc.REBELLION_COOLDOWN_MS),
            CROWN_HOLD_MS: readNumberConstant(raw, 'CROWN_HOLD_MS', dc.CROWN_HOLD_MS),
            CITADEL_CP_BONUS: readNumberConstant(raw, 'CITADEL_CP_BONUS', dc.CITADEL_CP_BONUS),
            GATE_UPKEEP_PER_LEVEL: readNumberConstant(raw, 'GATE_UPKEEP_PER_LEVEL', dc.GATE_UPKEEP_PER_LEVEL),
            CITADEL_UPKEEP_PER_LEVEL: readNumberConstant(raw, 'CITADEL_UPKEEP_PER_LEVEL', dc.CITADEL_UPKEEP_PER_LEVEL),
            SHOP_HOURLY_GOLD_FALLBACK: readNumberConstant(raw, 'SHOP_HOURLY_GOLD_FALLBACK', dc.SHOP_HOURLY_GOLD_FALLBACK),
            TAVERN_HOURLY_GOLD_FALLBACK: readNumberConstant(raw, 'TAVERN_HOURLY_GOLD_FALLBACK', dc.TAVERN_HOURLY_GOLD_FALLBACK),
            STATUE_BUFF_FALLBACK: Object.freeze(Object.assign({}, dc.STATUE_BUFF_FALLBACK, raw.STATUE_BUFF_FALLBACK || {})),
            MERGE_XP_FALLBACK: Object.freeze(Object.assign({}, dc.MERGE_XP_FALLBACK, raw.MERGE_XP_FALLBACK || {})),
            ITEM_VALUES_FALLBACK: Object.freeze(Object.assign({}, dc.ITEM_VALUES_FALLBACK, raw.ITEM_VALUES_FALLBACK || {}))
        });
    }

    function buildTerrainPalettes(gameplayConstants) {
        const raw = gameplayConstants || {};
        return Object.freeze({
            TERRAIN_COLORS: Object.freeze(Object.assign({}, DEFAULT_GAMEPLAY_CONSTANTS.TERRAIN_COLORS, raw.TERRAIN_COLORS || {})),
            TERRAIN_COLORS_BORDER: Object.freeze(Object.assign({}, DEFAULT_GAMEPLAY_CONSTANTS.TERRAIN_COLORS_BORDER, raw.TERRAIN_COLORS_BORDER || {}))
        });
    }

    global.KOVGameDefaultsModule = {
        DEFAULT_GAMEPLAY_CONSTANTS,
        buildGameplayConstants,
        buildTerrainPalettes
    };
})(window);
