const GITHUB_REPO = "nod-sean/bmo";
const GITHUB_BRANCH = "main";
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

const CONFIG = { gridCols: 8, gridRows: 8, gridTopY: 460, gridPadding: 20, squadCols: 3, squadRows: 3, squadTopY: 40, squadGap: 80, squadCellSize: 130, squadGap3: 24, squadCellSize3: 110 };
const ITEM_TYPE = {
    EMPTY: 0,
    BUILDING_BARRACKS: 1, BUILDING_RANGE: 2, BUILDING_STABLE: 3, BUILDING_CHEST: 4, BUILDING_CAMP: 5,
    UNIT_INFANTRY: 10, UNIT_ARCHER: 11, UNIT_CAVALRY: 12,
    UNIT_DRAGON: 9999, // Boss Unit
    ITEM_GOLD: 20, ITEM_ENERGY: 21, ITEM_CRYSTAL: 22
};
const LOCK_TYPE = { OPEN: 0, GOLD: 1, LEVEL: 2 };
const ZONES = { GRID: 'grid', SQUAD1: 'squad1', SQUAD2: 'squad2', SQUAD3: 'squad3' };

// Initialize Data from Window
const GAME_DATA = window.GAME_DATA || {};
const LEVEL_DATA = GAME_DATA.level_data || [];
const LEVEL_DATA_BY_LEVEL = new Map();
let MAX_LEVEL = 1;
LEVEL_DATA.forEach((entry) => {
    const level = Number(entry?.level);
    if (!Number.isFinite(level)) return;
    LEVEL_DATA_BY_LEVEL.set(level, entry);
    if (level > MAX_LEVEL) MAX_LEVEL = level;
});
if (!LEVEL_DATA_BY_LEVEL.has(1)) {
    LEVEL_DATA_BY_LEVEL.set(1, { level: 1, xp: 0, energy_max: 50, energy_regen: 1, cp_max: 20, cp_regen: 1 });
    MAX_LEVEL = Math.max(MAX_LEVEL, 1);
}
const REFILL_DATA = GAME_DATA.constants?.REFILL_DATA || {};
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
const FIELD_OBJECT_DATA = GAME_DATA.field_objects || {};
const LOCALIZATION_DATA = GAME_DATA.localization || {};

// Process FIELD_OBJECT_DATA to construct 'defenders' array from flat unit/count fields
Object.values(FIELD_OBJECT_DATA).forEach(obj => {
    if (!obj.defenders) {
        obj.defenders = [];
        for (let i = 1; i <= 3; i++) {
            const u = obj[`unit_${i}`];
            const c = obj[`count_${i}`];
            if (u && c > 0) {
                obj.defenders.push({ code: u, count: c, slot: i - 1 });
            }
        }
    }
});

// Process FIELD_OBJECT_DATA to construct 'abilities' array from flat ability/value fields
Object.values(FIELD_OBJECT_DATA).forEach(obj => {
    if (!obj.abilities) {
        obj.abilities = [];
        for (let i = 1; i <= 2; i++) {
            const a = obj[`ability_${i}`];
            const v = obj[`value_${i}`];
            if (a) {
                obj.abilities.push({ code: a, value: v });
            }
        }
    }
});

const ITEM_TABLE = GAME_DATA.items || {};
const UNIT_STATS = GAME_DATA.units || {};
const BUILDING_LIMITS = GAME_DATA.constants?.BUILDING_LIMITS || {};
const SHOP_DATA = GAME_DATA.constants?.SHOP_DATA || [];
const BATTLE_CONSTANTS = GAME_DATA.constants?.BATTLE_CONSTANTS || { BASE_DMG: 1, ADVANTAGE_BONUS: 1.5, DISADVANTAGE_PENALTY: 0.7, CRIT_CHANCE: 0.05, CRIT_MULT: 1.5 };
const CAMP_CAPACITY = GAME_DATA.camps ? Object.fromEntries(Object.values(GAME_DATA.camps).map(c => [c.level || 1, c.capacity])) : { 1: 4, 2: 6, 3: 8, 4: 12, 5: 16 };
const UNLOCK_CONDITIONS = GAME_DATA.unlock_conditions || { level: [], gold: [] };
const GAMEPLAY_CONSTANTS = GAME_DATA.constants?.GAMEPLAY || {};
const FIELD_EVENT_CONFIG = GAME_DATA.constants?.FIELD_EVENTS || {};

const DEFAULT_GAMEPLAY_CONSTANTS = {
    MOVE_MS_PER_MIN: 120,
    CP_COST_PER_TILE: 1,
    CP_COST_PER_COMMAND: 1,
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
    TERRAIN_COLORS: { 100: "#4a6e3a", 200: "#2e5a2a", 300: "#8b6f3d", 400: "#7a7a7a", 500: "#7a1f1f" },
    TERRAIN_COLORS_BORDER: { 100: "#5b7b47", 200: "#3b6a36", 300: "#9b7e4a", 400: "#8a8a8a", 500: "#8a2b2b" },
    STATUE_BUFF_FALLBACK: { 1: 0.05, 2: 0.10 },
    CITADEL_CP_BONUS: 0,
    GATE_UPKEEP_PER_LEVEL: 1,
    CITADEL_UPKEEP_PER_LEVEL: 2,
    MERGE_XP_FALLBACK: { 1: 1, 2: 2, 3: 4, 4: 5, 5: 6, 6: 8, 7: 10, 8: 15, 9: 20, 10: 0 },
    ITEM_VALUES_FALLBACK: { 1: 1, 2: 2, 3: 6, 4: 14, 5: 32 }
};

const WORLD_RULESET_KEYS = Object.freeze({
    KIND: "kind",
    NEUTRAL: "neutral",
    CRUEL: "cruel"
});

const DEFAULT_WORLD_RULESETS = Object.freeze({
    [WORLD_RULESET_KEYS.KIND]: Object.freeze({
        allowHostileEventAttack: true,
        allowCapturableAttack: true,
        allowRebellion: true,
        taxMultiplier: 1.0,
        upkeepMultiplier: 0.9,
        rebellionRandomMultiplier: 0.75,
        rebellionUnpaidMultiplier: 0.85,
        moveEnergyMultiplier: 0.9,
        moveGoldMultiplier: 1.0,
        cpCostMultiplier: 1.0
    }),
    [WORLD_RULESET_KEYS.NEUTRAL]: Object.freeze({
        allowHostileEventAttack: true,
        allowCapturableAttack: true,
        allowRebellion: true,
        taxMultiplier: 1.0,
        upkeepMultiplier: 1.0,
        rebellionRandomMultiplier: 1.0,
        rebellionUnpaidMultiplier: 1.0,
        moveEnergyMultiplier: 1.0,
        moveGoldMultiplier: 1.0,
        cpCostMultiplier: 1.0
    }),
    [WORLD_RULESET_KEYS.CRUEL]: Object.freeze({
        allowHostileEventAttack: true,
        allowCapturableAttack: true,
        allowRebellion: true,
        taxMultiplier: 0.9,
        upkeepMultiplier: 1.15,
        rebellionRandomMultiplier: 1.25,
        rebellionUnpaidMultiplier: 1.35,
        moveEnergyMultiplier: 1.1,
        moveGoldMultiplier: 1.1,
        cpCostMultiplier: 1.0
    })
});

function normalizeWorldRuleSetName(value) {
    const mode = String(value || "").trim().toLowerCase();
    if (mode === WORLD_RULESET_KEYS.KIND) return WORLD_RULESET_KEYS.KIND;
    if (mode === WORLD_RULESET_KEYS.CRUEL) return WORLD_RULESET_KEYS.CRUEL;
    return WORLD_RULESET_KEYS.NEUTRAL;
}

function readWorldRuleBoolean(value, fallback) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
        if (normalized === "false" || normalized === "0" || normalized === "no") return false;
    }
    return fallback;
}

function readWorldRuleMultiplier(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return fallback;
    return num;
}

function mergeWorldRuleConfig(mode, raw) {
    const base = DEFAULT_WORLD_RULESETS[mode] || DEFAULT_WORLD_RULESETS[WORLD_RULESET_KEYS.NEUTRAL];
    const source = raw && typeof raw === "object" ? raw : {};
    return Object.freeze({
        allowHostileEventAttack: readWorldRuleBoolean(source.allowHostileEventAttack, base.allowHostileEventAttack),
        allowCapturableAttack: readWorldRuleBoolean(source.allowCapturableAttack, base.allowCapturableAttack),
        allowRebellion: readWorldRuleBoolean(source.allowRebellion, base.allowRebellion),
        taxMultiplier: readWorldRuleMultiplier(source.taxMultiplier, base.taxMultiplier),
        upkeepMultiplier: readWorldRuleMultiplier(source.upkeepMultiplier, base.upkeepMultiplier),
        rebellionRandomMultiplier: readWorldRuleMultiplier(source.rebellionRandomMultiplier, base.rebellionRandomMultiplier),
        rebellionUnpaidMultiplier: readWorldRuleMultiplier(source.rebellionUnpaidMultiplier, base.rebellionUnpaidMultiplier),
        moveEnergyMultiplier: readWorldRuleMultiplier(source.moveEnergyMultiplier, base.moveEnergyMultiplier),
        moveGoldMultiplier: readWorldRuleMultiplier(source.moveGoldMultiplier, base.moveGoldMultiplier),
        cpCostMultiplier: readWorldRuleMultiplier(source.cpCostMultiplier, base.cpCostMultiplier)
    });
}

function parseWorldEndConditions(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const typeRaw = String(source.type || "king_castle_hold").trim().toLowerCase();
    const allowedTypes = new Set(["king_castle_hold", "score", "hybrid"]);
    const type = allowedTypes.has(typeRaw) ? typeRaw : "king_castle_hold";
    const targetHoldMs = Math.max(60000, Number(source.target_hold_ms ?? source.targetHoldMs) || 1800000);
    const targetScore = Math.max(1, Number(source.target_score ?? source.targetScore) || 1000);
    const enabled = source.enabled === undefined ? true : !!source.enabled;
    const lockActionsOnEnd = source.lock_actions_on_end === undefined && source.lockActionsOnEnd === undefined
        ? true
        : !!(source.lock_actions_on_end ?? source.lockActionsOnEnd);
    const allowNextSeasonTransition = source.allow_next_season_transition === undefined && source.allowNextSeasonTransition === undefined
        ? true
        : !!(source.allow_next_season_transition ?? source.allowNextSeasonTransition);
    return Object.freeze({ type, targetHoldMs, targetScore, enabled, lockActionsOnEnd, allowNextSeasonTransition });
}

function parseWorldSeasonPolicy(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const carrySource = source.resource_carryover ?? source.resourceCarryover;
    const carry = carrySource && typeof carrySource === "object" ? carrySource : {};
    const readCarry = (key, fallback) => {
        const value = Number(carry[key]);
        if (!Number.isFinite(value) || value < 0) return fallback;
        return value;
    };
    return Object.freeze({
        keepMergeGrid: source.keep_merge_grid === undefined && source.keepMergeGrid === undefined ? true : !!(source.keep_merge_grid ?? source.keepMergeGrid),
        keepSquads: source.keep_squads === undefined && source.keepSquads === undefined ? true : !!(source.keep_squads ?? source.keepSquads),
        keepResources: source.keep_resources === undefined && source.keepResources === undefined ? true : !!(source.keep_resources ?? source.keepResources),
        keepPoints: source.keep_points === undefined && source.keepPoints === undefined ? true : !!(source.keep_points ?? source.keepPoints),
        resourceCarryover: Object.freeze({
            gold: readCarry('gold', 1),
            gem: readCarry('gem', 1),
            energy: readCarry('energy', 1),
            cp: readCarry('cp', 1),
            points: readCarry('points', 1)
        })
    });
}

function parseWorldPreset(raw, fallbackRuleSet) {
    const source = raw && typeof raw === "object" ? raw : {};
    const ruleSet = normalizeWorldRuleSetName(source.rule_set || fallbackRuleSet || WORLD_RULESET_KEYS.NEUTRAL);
    const worldEndConditions = parseWorldEndConditions(source.world_end_conditions || {});
    const seasonPolicy = parseWorldSeasonPolicy(source.season_policy || {});
    const label = String(source.label || "").trim();
    return Object.freeze({
        label,
        ruleSet,
        worldEndConditions,
        seasonPolicy
    });
}

function readNumberConstant(source, key, fallback) {
    const value = source ? source[key] : undefined;
    return (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;
}

const DEFAULT_LOCALE = GAME_DATA.constants?.DEFAULT_LOCALE || 'ko';
const FALLBACK_LOCALE = 'en';

function getLocaleTable(locale) {
    if (!LOCALIZATION_DATA || typeof LOCALIZATION_DATA !== 'object') return {};
    if (LOCALIZATION_DATA[locale] && typeof LOCALIZATION_DATA[locale] === 'object') return LOCALIZATION_DATA[locale];
    // Backward compatible flat dictionary
    return LOCALIZATION_DATA;
}

function getTextByKey(table, key) {
    if (!table || typeof table !== 'object') return undefined;
    if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
    return key.split('.').reduce((acc, part) => {
        if (!acc || typeof acc !== 'object') return undefined;
        if (!Object.prototype.hasOwnProperty.call(acc, part)) return undefined;
        return acc[part];
    }, table);
}

function formatLocalizedText(template, params = {}) {
    if (typeof template !== 'string') return '';
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        const value = params[key];
        return value === undefined || value === null ? `{${key}}` : String(value);
    });
}

function t(locale, key, params = {}, fallback = '') {
    const primary = getTextByKey(getLocaleTable(locale), key);
    const secondary = getTextByKey(getLocaleTable(FALLBACK_LOCALE), key);
    const isInvalidTemplate = (value) => {
        if (typeof value !== 'string') return true;
        const text = value.trim();
        if (!text) return true;
        // Guard: some generated localization files may accidentally store key names as values.
        if (text === key) return true;
        return false;
    };
    const resolveKeyLikeFallback = () => {
        if (fallback) return fallback;
        const last = String(key || '').split('.').pop() || 'text';
        return last.replaceAll('_', ' ');
    };
    const template = !isInvalidTemplate(primary)
        ? primary
        : (!isInvalidTemplate(secondary) ? secondary : resolveKeyLikeFallback());
    return formatLocalizedText(template, params);
}

// Derived or Static
const BUILDING_TYPE_MAP = {
    [ITEM_TYPE.BUILDING_BARRACKS]: '2101',
    [ITEM_TYPE.BUILDING_RANGE]: '2201',
    [ITEM_TYPE.BUILDING_STABLE]: '2301',
    [ITEM_TYPE.BUILDING_CAMP]: '3101'
    // Chests handled separately
};

const MOVE_MS_PER_MIN = readNumberConstant(GAMEPLAY_CONSTANTS, 'MOVE_MS_PER_MIN', DEFAULT_GAMEPLAY_CONSTANTS.MOVE_MS_PER_MIN);
const CP_COST_PER_TILE = readNumberConstant(GAMEPLAY_CONSTANTS, 'CP_COST_PER_TILE', DEFAULT_GAMEPLAY_CONSTANTS.CP_COST_PER_TILE);
const CP_COST_PER_COMMAND = readNumberConstant(GAMEPLAY_CONSTANTS, 'CP_COST_PER_COMMAND', CP_COST_PER_TILE || DEFAULT_GAMEPLAY_CONSTANTS.CP_COST_PER_COMMAND);
const PORTAL_CP_COST = readNumberConstant(GAMEPLAY_CONSTANTS, 'PORTAL_CP_COST', DEFAULT_GAMEPLAY_CONSTANTS.PORTAL_CP_COST);
const DUNGEON_COOLDOWN_MS = readNumberConstant(GAMEPLAY_CONSTANTS, 'DUNGEON_COOLDOWN_MS', DEFAULT_GAMEPLAY_CONSTANTS.DUNGEON_COOLDOWN_MS);
const DUNGEON_ENTRY_GOLD_COST = readNumberConstant(GAMEPLAY_CONSTANTS, 'DUNGEON_ENTRY_GOLD_COST', DEFAULT_GAMEPLAY_CONSTANTS.DUNGEON_ENTRY_GOLD_COST);
const DUNGEON_ENTRY_ENERGY_COST = readNumberConstant(GAMEPLAY_CONSTANTS, 'DUNGEON_ENTRY_ENERGY_COST', DEFAULT_GAMEPLAY_CONSTANTS.DUNGEON_ENTRY_ENERGY_COST);
const DUNGEON_ENTRY_CP_COST = readNumberConstant(GAMEPLAY_CONSTANTS, 'DUNGEON_ENTRY_CP_COST', DEFAULT_GAMEPLAY_CONSTANTS.DUNGEON_ENTRY_CP_COST);
const REBELLION_RANDOM_CHANCE = readNumberConstant(GAMEPLAY_CONSTANTS, 'REBELLION_RANDOM_CHANCE', DEFAULT_GAMEPLAY_CONSTANTS.REBELLION_RANDOM_CHANCE);
const REBELLION_UNPAID_CHANCE = readNumberConstant(GAMEPLAY_CONSTANTS, 'REBELLION_UNPAID_CHANCE', DEFAULT_GAMEPLAY_CONSTANTS.REBELLION_UNPAID_CHANCE);
const REBELLION_COOLDOWN_MS = readNumberConstant(GAMEPLAY_CONSTANTS, 'REBELLION_COOLDOWN_MS', DEFAULT_GAMEPLAY_CONSTANTS.REBELLION_COOLDOWN_MS);
const CROWN_HOLD_MS = readNumberConstant(GAMEPLAY_CONSTANTS, 'CROWN_HOLD_MS', DEFAULT_GAMEPLAY_CONSTANTS.CROWN_HOLD_MS);
const SHOP_HOURLY_GOLD_FALLBACK = readNumberConstant(GAMEPLAY_CONSTANTS, 'SHOP_HOURLY_GOLD_FALLBACK', DEFAULT_GAMEPLAY_CONSTANTS.SHOP_HOURLY_GOLD_FALLBACK);
const TAVERN_HOURLY_GOLD_FALLBACK = readNumberConstant(GAMEPLAY_CONSTANTS, 'TAVERN_HOURLY_GOLD_FALLBACK', DEFAULT_GAMEPLAY_CONSTANTS.TAVERN_HOURLY_GOLD_FALLBACK);
const RAW_WORLD_RULESETS = (GAMEPLAY_CONSTANTS.WORLD_RULESETS && typeof GAMEPLAY_CONSTANTS.WORLD_RULESETS === "object")
    ? GAMEPLAY_CONSTANTS.WORLD_RULESETS
    : ((GAME_DATA.constants?.WORLD_RULESETS && typeof GAME_DATA.constants.WORLD_RULESETS === "object")
        ? GAME_DATA.constants.WORLD_RULESETS
        : {});
const WORLD_RULESETS = Object.freeze({
    [WORLD_RULESET_KEYS.KIND]: mergeWorldRuleConfig(WORLD_RULESET_KEYS.KIND, RAW_WORLD_RULESETS.kind),
    [WORLD_RULESET_KEYS.NEUTRAL]: mergeWorldRuleConfig(WORLD_RULESET_KEYS.NEUTRAL, RAW_WORLD_RULESETS.neutral),
    [WORLD_RULESET_KEYS.CRUEL]: mergeWorldRuleConfig(WORLD_RULESET_KEYS.CRUEL, RAW_WORLD_RULESETS.cruel)
});
const DEFAULT_WORLD_RULESET = normalizeWorldRuleSetName(
    GAMEPLAY_CONSTANTS.WORLD_RULESET_DEFAULT
    || GAME_DATA.constants?.WORLD_RULESET_DEFAULT
    || WORLD_RULESET_KEYS.NEUTRAL
);
const RAW_WORLD_END_CONDITIONS = (GAMEPLAY_CONSTANTS.WORLD_END_CONDITIONS && typeof GAMEPLAY_CONSTANTS.WORLD_END_CONDITIONS === "object")
    ? GAMEPLAY_CONSTANTS.WORLD_END_CONDITIONS
    : ((GAME_DATA.constants?.WORLD_END_CONDITIONS && typeof GAME_DATA.constants.WORLD_END_CONDITIONS === "object")
        ? GAME_DATA.constants.WORLD_END_CONDITIONS
        : {});
const WORLD_END_CONDITIONS = parseWorldEndConditions(RAW_WORLD_END_CONDITIONS);
const RAW_WORLD_SEASON_POLICY = (GAMEPLAY_CONSTANTS.WORLD_SEASON_POLICY && typeof GAMEPLAY_CONSTANTS.WORLD_SEASON_POLICY === "object")
    ? GAMEPLAY_CONSTANTS.WORLD_SEASON_POLICY
    : ((GAME_DATA.constants?.WORLD_SEASON_POLICY && typeof GAME_DATA.constants.WORLD_SEASON_POLICY === "object")
        ? GAME_DATA.constants.WORLD_SEASON_POLICY
        : {});
const WORLD_SEASON_POLICY = parseWorldSeasonPolicy(RAW_WORLD_SEASON_POLICY);
const RAW_WORLD_PRESETS = (GAMEPLAY_CONSTANTS.WORLD_PRESETS && typeof GAMEPLAY_CONSTANTS.WORLD_PRESETS === "object")
    ? GAMEPLAY_CONSTANTS.WORLD_PRESETS
    : ((GAME_DATA.constants?.WORLD_PRESETS && typeof GAME_DATA.constants.WORLD_PRESETS === "object")
        ? GAME_DATA.constants.WORLD_PRESETS
        : {});
const DEFAULT_WORLD_PRESET_ID = String(
    GAMEPLAY_CONSTANTS.WORLD_PRESET_DEFAULT
    || GAME_DATA.constants?.WORLD_PRESET_DEFAULT
    || "regular"
).trim().toLowerCase();
const WORLD_PRESETS = (() => {
    const parsed = {};
    Object.entries(RAW_WORLD_PRESETS).forEach(([id, cfg]) => {
        const key = String(id || "").trim().toLowerCase();
        if (!key) return;
        parsed[key] = parseWorldPreset(cfg, DEFAULT_WORLD_RULESET);
    });
    if (!parsed.regular) {
        parsed.regular = Object.freeze({
            label: "Regular",
            ruleSet: DEFAULT_WORLD_RULESET,
            worldEndConditions: WORLD_END_CONDITIONS,
            seasonPolicy: WORLD_SEASON_POLICY
        });
    }
    return Object.freeze(parsed);
})();
const DEFAULT_WORLD_END_REWARD_CONFIG = Object.freeze({
    score: { gold: 1800, gem: 25, energy: 20, cp: 8, points: 40 },
    king_castle_hold: { gold: 3000, gem: 40, energy: 30, cp: 12, points: 60 },
    hybrid: { gold: 2400, gem: 32, energy: 25, cp: 10, points: 50 },
    modeMultiplier: { kind: 1.0, neutral: 1.1, cruel: 1.25 },
    scoreGoldPerPoint: 4,
    scorePointsPer100: 2
});
const DEFAULT_DRAGON_BOSS_CONFIG = Object.freeze({
    baseRewards: Object.freeze({ gold: 3000, gem: 20, energy: 15, cp: 5, points: 25 }),
    tierMultiplier: Object.freeze({ s: 1.4, a: 1.15, b: 1.0, c: 0.8 }),
    minShareByTier: Object.freeze({ s: 0.5, a: 0.3, b: 0.15 }),
    killBonusGold: 500,
    killBonusPoints: 5
});
const DRAGON_BOSS_CONFIG = (() => {
    const raw = GAMEPLAY_CONSTANTS.DRAGON_BOSS && typeof GAMEPLAY_CONSTANTS.DRAGON_BOSS === 'object'
        ? GAMEPLAY_CONSTANTS.DRAGON_BOSS
        : {};
    const baseRaw = raw.baseRewards && typeof raw.baseRewards === 'object' ? raw.baseRewards : {};
    const multRaw = raw.tierMultiplier && typeof raw.tierMultiplier === 'object' ? raw.tierMultiplier : {};
    const shareRaw = raw.minShareByTier && typeof raw.minShareByTier === 'object' ? raw.minShareByTier : {};
    const readNonNegative = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
    };
    return Object.freeze({
        baseRewards: Object.freeze({
            gold: readNonNegative(baseRaw.gold, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.gold),
            gem: readNonNegative(baseRaw.gem, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.gem),
            energy: readNonNegative(baseRaw.energy, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.energy),
            cp: readNonNegative(baseRaw.cp, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.cp),
            points: readNonNegative(baseRaw.points, DEFAULT_DRAGON_BOSS_CONFIG.baseRewards.points)
        }),
        tierMultiplier: Object.freeze({
            s: Math.max(0.1, readNonNegative(multRaw.s, DEFAULT_DRAGON_BOSS_CONFIG.tierMultiplier.s)),
            a: Math.max(0.1, readNonNegative(multRaw.a, DEFAULT_DRAGON_BOSS_CONFIG.tierMultiplier.a)),
            b: Math.max(0.1, readNonNegative(multRaw.b, DEFAULT_DRAGON_BOSS_CONFIG.tierMultiplier.b)),
            c: Math.max(0.1, readNonNegative(multRaw.c, DEFAULT_DRAGON_BOSS_CONFIG.tierMultiplier.c))
        }),
        minShareByTier: Object.freeze({
            s: Math.max(0, Math.min(1, readNonNegative(shareRaw.s, DEFAULT_DRAGON_BOSS_CONFIG.minShareByTier.s))),
            a: Math.max(0, Math.min(1, readNonNegative(shareRaw.a, DEFAULT_DRAGON_BOSS_CONFIG.minShareByTier.a))),
            b: Math.max(0, Math.min(1, readNonNegative(shareRaw.b, DEFAULT_DRAGON_BOSS_CONFIG.minShareByTier.b)))
        }),
        killBonusGold: readNonNegative(raw.killBonusGold, DEFAULT_DRAGON_BOSS_CONFIG.killBonusGold),
        killBonusPoints: readNonNegative(raw.killBonusPoints, DEFAULT_DRAGON_BOSS_CONFIG.killBonusPoints)
    });
})();
const TERRAIN_COLORS = Object.assign({}, DEFAULT_GAMEPLAY_CONSTANTS.TERRAIN_COLORS, GAMEPLAY_CONSTANTS.TERRAIN_COLORS || {});
const TERRAIN_COLORS_BORDER = Object.assign({}, DEFAULT_GAMEPLAY_CONSTANTS.TERRAIN_COLORS_BORDER, GAMEPLAY_CONSTANTS.TERRAIN_COLORS_BORDER || {});

function normalizeFieldObjectName(name) {
    return String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function detectFieldObjectKindFromName(name) {
    const normalized = normalizeFieldObjectName(name);
    if (!normalized) return null;
    if (normalized.includes("castle")) return "castle";
    if (normalized.includes("gate")) return "gate";
    if (normalized.includes("citadel")) return "citadel";
    if (normalized.includes("dragon")) return "dragon";
    if (normalized.includes("gold") && normalized.includes("mine")) return "goldmine";
    if (normalized.includes("fountain")) return "fountain";
    if (normalized.includes("shop")) return "shop";
    if (normalized.includes("tavern")) return "tavern";
    if (normalized.includes("ruins")) return "ruins";
    if (normalized.includes("statue")) {
        if (normalized.includes("atk")) return "statue_atk";
        if (normalized.includes("def")) return "statue_def";
        if (normalized.includes("hp")) return "statue_hp";
        if (normalized.includes("spd")) return "statue_spd";
        return "statue";
    }
    return null;
}

function detectFieldObjectKindFromCode(code) {
    if (!Number.isFinite(code)) return null;
    if (code === 1 || code === 5100 || code === 5101) return "castle";
    if (code === 2 || code === 5141 || (code >= 5111 && code <= 5119)) return "gate";
    if (code === 3 || (code >= 5121 && code <= 5129)) return "citadel";
    if (code === 5131) return "dragon";
    if (code === 5 || code === 5200 || (code >= 5201 && code <= 5209)) return "goldmine";
    if (code === 6 || (code >= 5211 && code <= 5219)) return "fountain";
    if (code === 5221) return "shop";
    if (code === 5231) return "tavern";
    if (code >= 5241 && code <= 5249) return "ruins";
    if (code >= 5301 && code <= 5302) return "statue_atk";
    if (code >= 5311 && code <= 5312) return "statue_def";
    if (code >= 5321 && code <= 5322) return "statue_hp";
    if (code >= 5331 && code <= 5332) return "statue_spd";
    if (code >= 5300 && code < 5400) return "statue";
    return null;
}

const FIELD_OBJECT_KIND_BY_CODE = {};
const FIELD_OBJECT_DATA_BY_KIND_LEVEL = {};

Object.entries(FIELD_OBJECT_DATA).forEach(([rawCode, obj]) => {
    if (!obj || typeof obj !== 'object') return;
    const code = Number(rawCode);
    if (!Number.isFinite(code)) return;
    if (!Number.isFinite(Number(obj.code))) obj.code = code;

    const level = Number.isFinite(Number(obj.level)) ? Number(obj.level) : 1;
    const kind = detectFieldObjectKindFromName(obj.name) || detectFieldObjectKindFromCode(code);
    if (!kind) return;

    FIELD_OBJECT_KIND_BY_CODE[code] = kind;
    if (!FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind]) FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind] = {};
    const previous = FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind][level];
    if (!previous || Number(previous.code) > code) {
        FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind][level] = obj;
    }
});

function getFieldObjectKind(code) {
    return FIELD_OBJECT_KIND_BY_CODE[code] || detectFieldObjectKindFromCode(code);
}

function getFieldObjectDataByType(type) {
    if (FIELD_OBJECT_DATA[type]) return FIELD_OBJECT_DATA[type];
    const kind = getFieldObjectKind(type);
    if (!kind) return null;
    const byLevel = FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind];
    if (!byLevel || typeof byLevel !== 'object') return null;

    const level = Number.isFinite(Number(type)) ? getObjectLevelFromCode(type) : 1;
    if (byLevel[level]) return byLevel[level];

    const levels = Object.keys(byLevel).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!levels.length) return null;
    const nearestHigher = levels.find(lv => lv >= level);
    const pick = Number.isFinite(nearestHigher) ? nearestHigher : levels[levels.length - 1];
    return byLevel[pick] || null;
}

const CAPTURABLE_FIELD_OBJECT_KINDS = new Set([
    "gate",
    "citadel",
    "dragon",
    "goldmine",
    "fountain",
    "shop",
    "tavern",
    "ruins",
    "statue",
    "statue_atk",
    "statue_def",
    "statue_hp",
    "statue_spd"
]);

function isTerrainCode(code) { return code >= 100 && code < 600; }
function isWallTile(code) { return code === 0; }
function getTerrainBase(code) { return Math.floor(code / 100) * 100; }
function getTerrainName(code) {
    const base = getTerrainBase(code);
    const name = base === 100 ? "Plains" : base === 200 ? "Forest" : base === 300 ? "Highland" : base === 400 ? "Swamp" : base === 500 ? "Volcano" : "Terrain";
    return (code % 100 === 1) ? `${name} Border` : name;
}
function getTerrainBaseName(code) {
    const base = getTerrainBase(code);
    return base === 100 ? "Plains" : base === 200 ? "Forest" : base === 300 ? "Highland" : base === 400 ? "Swamp" : base === 500 ? "Volcano" : "Terrain";
}

function isCastleTile(code) { return code === 1 || code === 5100 || getFieldObjectKind(code) === "castle"; }
function isGateTile(code) { return code === 2 || getFieldObjectKind(code) === "gate"; }
function isCitadelTile(code) { return code === 3 || getFieldObjectKind(code) === "citadel"; }
function isDragonTile(code) { return getFieldObjectKind(code) === "dragon"; }
function isGoldMineTile(code) { return code === 5 || getFieldObjectKind(code) === "goldmine"; }
function isFountainTile(code) { return code === 6 || getFieldObjectKind(code) === "fountain"; }
function isShopTile(code) { return getFieldObjectKind(code) === "shop"; }
function isTavernTile(code) { return getFieldObjectKind(code) === "tavern"; }
function isRuinsTile(code) { return getFieldObjectKind(code) === "ruins"; }
function isStatueTile(code) {
    const kind = getFieldObjectKind(code);
    return kind === "statue" || kind === "statue_atk" || kind === "statue_def" || kind === "statue_hp" || kind === "statue_spd";
}
function isBorderTerrain(code) { return isTerrainCode(code) && code % 100 === 1; }
function isBlockingField(code) { return isWallTile(code) || isGateTile(code) || isCitadelTile(code) || isDragonTile(code) || isBorderTerrain(code); }
function getStatueKind(code) {
    const kind = getFieldObjectKind(code);
    if (kind === "statue_atk") return "atk";
    if (kind === "statue_def") return "def";
    if (kind === "statue_hp") return "hp";
    if (kind === "statue_spd") return "spd";
    if (code >= 5301 && code <= 5302) return "atk";
    if (code >= 5311 && code <= 5312) return "def";
    if (code >= 5321 && code <= 5322) return "hp";
    if (code >= 5331 && code <= 5332) return "spd";
    return null;
}
function getObjectLevelFromCode(type) {
    // Rely on object data if possible, fallback to calculation
    if (FIELD_OBJECT_DATA[type]) return Number(FIELD_OBJECT_DATA[type].level) || 1;
    if (isGateTile(type)) return Math.max(1, type - 5110);
    if (isCitadelTile(type)) return Math.max(1, type - 5120);
    if (isGoldMineTile(type)) return Math.max(1, type - 5200);
    if (isFountainTile(type)) return Math.max(1, type - 5210);
    if (isRuinsTile(type)) return Math.max(1, type - 5240);
    if (isStatueTile(type)) return type % 10;
    return 1;
}

const FIELD_DEFENDERS = {}; // Deprecated, use FIELD_OBJECT_DATA directly

// --- LEVEL COLORS ---
const LEVEL_COLORS = {
    1: "#FFFFFF", 2: "#BDBDBD", 3: "#6D4C41", 4: "#2E7D32", 5: "#00897B",
    6: "#1E88E5", 7: "#6A1B9A", 8: "#F57C00", 9: "#C62828", 10: "#212121"
};

const STATUE_BUFF_FALLBACK = Object.assign({}, DEFAULT_GAMEPLAY_CONSTANTS.STATUE_BUFF_FALLBACK, GAMEPLAY_CONSTANTS.STATUE_BUFF_FALLBACK || {});
const CITADEL_CP_BONUS = readNumberConstant(GAMEPLAY_CONSTANTS, 'CITADEL_CP_BONUS', DEFAULT_GAMEPLAY_CONSTANTS.CITADEL_CP_BONUS);
const GATE_UPKEEP_PER_LEVEL = readNumberConstant(GAMEPLAY_CONSTANTS, 'GATE_UPKEEP_PER_LEVEL', DEFAULT_GAMEPLAY_CONSTANTS.GATE_UPKEEP_PER_LEVEL);
const CITADEL_UPKEEP_PER_LEVEL = readNumberConstant(GAMEPLAY_CONSTANTS, 'CITADEL_UPKEEP_PER_LEVEL', DEFAULT_GAMEPLAY_CONSTANTS.CITADEL_UPKEEP_PER_LEVEL);


const UNIT_TYPE_ADVANTAGE = {
    [ITEM_TYPE.UNIT_INFANTRY]: ITEM_TYPE.UNIT_ARCHER, //  > 
    [ITEM_TYPE.UNIT_ARCHER]: ITEM_TYPE.UNIT_CAVALRY,  //  > 
    [ITEM_TYPE.UNIT_CAVALRY]: ITEM_TYPE.UNIT_INFANTRY //  > 
};



const MERGE_XP_DATA = (GAME_DATA.merge_xp && Object.keys(GAME_DATA.merge_xp).length > 0)
    ? GAME_DATA.merge_xp
    : Object.assign({}, DEFAULT_GAMEPLAY_CONSTANTS.MERGE_XP_FALLBACK, GAMEPLAY_CONSTANTS.MERGE_XP_FALLBACK || {});
const ITEM_VALUES = {};
Object.values(GAME_DATA.items || {}).forEach(item => {
    // Basic heuristics to identify gold items by code range or name if needed, assuming items table is primarily for resources
    if (item.code >= 1801 && item.code <= 1809) {
        ITEM_VALUES[item.level] = item.earn;
    }
});
if (Object.keys(ITEM_VALUES).length === 0) Object.assign(ITEM_VALUES, DEFAULT_GAMEPLAY_CONSTANTS.ITEM_VALUES_FALLBACK, GAMEPLAY_CONSTANTS.ITEM_VALUES_FALLBACK || {});
const UNLOCK_GOLD_MAP = GAME_DATA.unlock_conditions?.gold || [];
const UNLOCK_LEVEL_MAP = GAME_DATA.unlock_conditions?.level || [];

const BUILDING_DATA = {};
Object.entries(BUILDING_TYPE_MAP).forEach(([type, baseCode]) => {
    BUILDING_DATA[type] = {};
    for (let lv = 1; lv <= 10; lv++) {
        const code = parseInt(baseCode) + (lv - 1);
        const data = (GAME_DATA.buildings || {})[code];
        if (data) {
            // Construct probs array from flat fields
            const probs = [];
            for (let i = 1; i <= 10; i++) {
                probs.push(data[`prob_${i}`] || 0);
            }

            BUILDING_DATA[type][lv] = {
                merge_max: 5 + lv,
                energy: data.energy || data.Energy || 0, // Handle potential casing mismatch
                probs: probs
            };
        }
    }
});
const CHEST_DROP_TABLE = {};
Object.entries(GAME_DATA.chests || {}).forEach(([chestCode, chestData]) => {
    const drops = [];
    Object.entries(chestData).forEach(([key, val]) => {
        // Assume number keys like "1801", "1802" are item codes for drops
        const code = parseInt(key);
        if (!isNaN(code) && code >= 1800 && code < 1900 && val > 0) {
            drops.push({ code: code, prob: val });
        }
    });
    // The key in CHEST_DROP_TABLE seems to be 1-based level index in the legacy code (1, 2, 3, 4, 5)
    // Map chest level directly
    CHEST_DROP_TABLE[chestData.level] = drops;
});
// Fallback if data missing
if (Object.keys(CHEST_DROP_TABLE).length === 0) {
    Object.assign(CHEST_DROP_TABLE, { 1: [{ code: 1801, prob: 50 }, { code: 1811, prob: 50 }], 2: [{ code: 1801, prob: 25 }, { code: 1802, prob: 25 }, { code: 1811, prob: 25 }, { code: 1812, prob: 25 }] }); // Truncated fallback for safety
}

// --- PHASE 2 MAP DATA (FIELD_OBJECT_1) ---
// --- FIELD EVENT DATA ---
const FIELD_EVENT_TYPES = {
    BANDIT: 2001,       // Weak Enemy (Plains/Forest)
    BANDIT_LEADER: 2002,// Strong Enemy (Mountains)
    DUNGEON: 2010,      // Hard Mode
    PORTAL: 2020,       // Teleport
    CARAVAN: 2030,      // Shop/Trade
    CROWN: 2040         // Crown Control Point
};

// Spawn Rates (Prob per 1000 tiles, approximate)
const FIELD_EVENT_RATES = {
    [FIELD_EVENT_TYPES.BANDIT]: 15,
    [FIELD_EVENT_TYPES.BANDIT_LEADER]: 5,
    [FIELD_EVENT_TYPES.DUNGEON]: 3,
    [FIELD_EVENT_TYPES.PORTAL]: 2,
    [FIELD_EVENT_TYPES.CARAVAN]: 4,
    ...(FIELD_EVENT_CONFIG.RATES || {})
};

// Drop Tables
const DEFAULT_EVENT_DROP_TABLE = {
    [FIELD_EVENT_TYPES.BANDIT]: { gold: [50, 100], items: [{ code: 1801, prob: 20 }] }, // Low gold, low chance crop
    [FIELD_EVENT_TYPES.BANDIT_LEADER]: { gold: [200, 400], items: [{ code: 1811, prob: 30 }, { code: 1201, prob: 10 }] }, // Mid gold, Iron/Weapon
    [FIELD_EVENT_TYPES.DUNGEON]: { gold: [500, 1000], items: [{ code: 2101, prob: 50 }, { code: 1210, prob: 20 }] }, // High gold, Building/Rare
    [FIELD_EVENT_TYPES.CROWN]: { gold: [700, 1200], items: [{ code: 1812, prob: 35 }, { code: 1210, prob: 25 }] }
};
const EVENT_DROP_TABLE = Object.assign({}, DEFAULT_EVENT_DROP_TABLE, FIELD_EVENT_CONFIG.DROP_TABLE || {});
const DEFAULT_FIELD_OBJECT_REWARD_TABLE = {
    1: [{ kind: 'gold', min: 80, max: 120 }],
    2: [{ kind: 'energy', min: 15, max: 25 }],
    3: [{ kind: 'gem', min: 1, max: 2 }],
    4: [{ kind: 'chest', level: 1, count: 1 }],
    11: [{ kind: 'gold', min: 120, max: 220 }, { kind: 'energy', min: 10, max: 20 }],
    12: [{ kind: 'item_code', code: 1801, min_count: 1, max_count: 2 }],
    13: [{ kind: 'item_code', code: 1811, min_count: 1, max_count: 2 }]
};
const FIELD_OBJECT_REWARD_TABLE = Object.assign(
    {},
    DEFAULT_FIELD_OBJECT_REWARD_TABLE,
    GAME_DATA.constants?.FIELD_OBJECT_REWARDS || {}
);

const FIELD_MAP_DATA = [
    [200, 200, 200, 200, 200, 0, 100, 100, 100, 100, 100, 0, 200, 200, 200, 200, 200, 0, 100, 100, 100, 100, 100, 0, 200, 200, 200, 200, 200],
    [200, 200, 200, 200, 200, 0, 100, 5221, 100, 5231, 100, 0, 200, 200, 200, 200, 200, 0, 100, 5231, 100, 5221, 100, 0, 200, 200, 200, 200, 200],
    [200, 200, 5121, 200, 200, 0, 100, 100, 5101, 100, 100, 5111, 200, 200, 5121, 200, 200, 5111, 100, 100, 5101, 100, 100, 5111, 200, 200, 5121, 200, 200],
    [200, 200, 200, 200, 200, 0, 100, 5211, 100, 5200, 100, 0, 200, 200, 200, 200, 200, 0, 100, 5200, 100, 5211, 100, 0, 200, 200, 200, 200, 200],
    [200, 200, 200, 200, 200, 0, 100, 100, 100, 100, 100, 0, 200, 200, 200, 200, 200, 0, 100, 100, 100, 100, 100, 0, 200, 200, 200, 200, 200],
    [0, 0, 5111, 0, 0, 0, 0, 0, 5112, 0, 0, 0, 0, 0, 5113, 0, 0, 0, 0, 0, 5112, 0, 0, 0, 0, 0, 5111, 0, 0],
    [100, 100, 100, 100, 100, 0, 300, 300, 300, 300, 300, 0, 400, 400, 400, 400, 400, 0, 300, 300, 300, 300, 300, 0, 100, 100, 100, 100, 100],
    [100, 5221, 100, 5211, 100, 0, 300, 300, 300, 300, 300, 0, 400, 400, 400, 400, 400, 0, 300, 300, 300, 300, 300, 0, 100, 5211, 100, 5221, 100],
    [100, 100, 5101, 100, 100, 5112, 300, 300, 5122, 300, 300, 5113, 400, 400, 5123, 400, 400, 5113, 300, 300, 5122, 300, 300, 5112, 100, 100, 5101, 100, 100],
    [100, 5231, 100, 5200, 100, 0, 300, 300, 300, 300, 300, 0, 400, 400, 400, 400, 400, 0, 300, 300, 300, 300, 300, 0, 100, 5200, 100, 5231, 100],
    [100, 100, 100, 100, 100, 0, 300, 300, 300, 300, 300, 0, 400, 400, 400, 400, 400, 0, 300, 300, 300, 300, 300, 0, 100, 100, 100, 100, 100],
    [0, 0, 5111, 0, 0, 0, 0, 0, 5113, 0, 0, 0, 0, 0, 5114, 0, 0, 0, 0, 0, 5113, 0, 0, 0, 0, 0, 5111, 0, 0],
    [200, 200, 200, 200, 200, 0, 400, 400, 400, 400, 400, 0, 500, 500, 500, 500, 500, 0, 400, 400, 400, 400, 400, 0, 200, 200, 200, 200, 200],
    [200, 200, 200, 200, 200, 0, 400, 400, 400, 400, 400, 0, 500, 500, 500, 500, 500, 0, 400, 400, 400, 400, 400, 0, 200, 200, 200, 200, 200],
    [200, 200, 5121, 200, 200, 5113, 400, 400, 5123, 400, 400, 5114, 500, 500, 5131, 500, 500, 5114, 400, 400, 5123, 400, 400, 5113, 200, 200, 5121, 200, 200],
    [200, 200, 200, 200, 200, 0, 400, 400, 400, 400, 400, 0, 500, 500, 500, 500, 500, 0, 400, 400, 400, 400, 400, 0, 200, 200, 200, 200, 200],
    [200, 200, 200, 200, 200, 0, 400, 400, 400, 400, 400, 0, 500, 500, 500, 500, 500, 0, 400, 400, 400, 400, 400, 0, 200, 200, 200, 200, 200],
    [0, 0, 5111, 0, 0, 0, 0, 0, 5113, 0, 0, 0, 0, 0, 5114, 0, 0, 0, 0, 0, 5113, 0, 0, 0, 0, 0, 5111, 0, 0],
    [100, 100, 100, 100, 100, 0, 300, 300, 300, 300, 300, 0, 400, 400, 400, 400, 400, 0, 300, 300, 300, 300, 300, 0, 100, 100, 100, 100, 100],
    [100, 5231, 100, 5200, 100, 0, 300, 300, 300, 300, 300, 0, 400, 400, 400, 400, 400, 0, 300, 300, 300, 300, 300, 0, 100, 5200, 100, 5231, 100],
    [100, 100, 5101, 100, 100, 5112, 300, 300, 5122, 300, 300, 5113, 400, 400, 5123, 400, 400, 5113, 300, 300, 5122, 300, 300, 5112, 100, 100, 5101, 100, 100],
    [100, 5221, 100, 5211, 100, 0, 300, 300, 300, 300, 300, 0, 400, 400, 400, 400, 400, 0, 300, 300, 300, 300, 300, 0, 100, 5211, 100, 5221, 100],
    [100, 100, 100, 100, 100, 0, 300, 300, 300, 300, 300, 0, 400, 400, 400, 400, 400, 0, 300, 300, 300, 300, 300, 0, 100, 100, 100, 100, 100],
    [0, 0, 5111, 0, 0, 0, 0, 0, 5112, 0, 0, 0, 0, 0, 5113, 0, 0, 0, 0, 0, 5112, 0, 0, 0, 0, 0, 5111, 0, 0],
    [200, 200, 200, 200, 200, 0, 100, 100, 100, 100, 100, 0, 200, 200, 200, 200, 200, 0, 100, 100, 100, 100, 100, 0, 200, 200, 200, 200, 200],
    [200, 200, 200, 200, 200, 0, 100, 5211, 100, 5200, 100, 0, 200, 200, 200, 200, 200, 0, 100, 5200, 100, 5211, 100, 0, 200, 200, 200, 200, 200],
    [200, 200, 5121, 200, 200, 5111, 100, 100, 5101, 100, 100, 5111, 200, 200, 5100, 200, 200, 5111, 100, 100, 5101, 100, 100, 5111, 200, 200, 5121, 200, 200],
    [200, 200, 200, 200, 200, 0, 100, 5221, 100, 5231, 100, 0, 200, 200, 200, 200, 200, 0, 100, 5231, 100, 5221, 100, 0, 200, 200, 200, 200, 200],
    [200, 200, 200, 200, 200, 0, 100, 100, 100, 100, 100, 0, 200, 200, 200, 200, 200, 0, 100, 100, 100, 100, 100, 0, 200, 200, 200, 200, 200],
];
const DATA_FIELD_MAP = Array.isArray(GAME_DATA.field_map) ? GAME_DATA.field_map : null;
if (DATA_FIELD_MAP && DATA_FIELD_MAP.length > 0) {
    const valid = DATA_FIELD_MAP.every(row => Array.isArray(row));
    if (valid) {
        FIELD_MAP_DATA.length = 0;
        DATA_FIELD_MAP.forEach(row => FIELD_MAP_DATA.push(row.map(cell => Number(cell))));
    }
}
const FIELD_TERRAIN_DATA = FIELD_MAP_DATA.map(row => row.slice());
const MAP_SIZE = FIELD_MAP_DATA.length;
const PLAYER_START = { r: 22, c: 7 };
const FOG_RADIUS = 8;

const FIELD_OBJECT_PROB = [
    { code: 5301, fields: [0, 50, 50, 0, 0], min: 1, max: 2 },
    { code: 5302, fields: [0, 0, 30, 70, 0], min: 1, max: 2 },
    { code: 5311, fields: [0, 50, 50, 0, 0], min: 1, max: 2 },
    { code: 5312, fields: [0, 0, 30, 70, 0], min: 1, max: 2 },
    { code: 5321, fields: [0, 50, 50, 0, 0], min: 1, max: 2 },
    { code: 5322, fields: [0, 0, 30, 70, 0], min: 1, max: 2 },
    { code: 5331, fields: [0, 50, 50, 0, 0], min: 1, max: 2 },
    { code: 5332, fields: [0, 0, 30, 70, 0], min: 1, max: 2 },
    { code: 1801, fields: [50, 50, 0, 0, 0], min: 24, max: 32 },
    { code: 1802, fields: [0, 50, 50, 0, 0], min: 12, max: 16 },
    { code: 1803, fields: [0, 0, 50, 50, 0], min: 6, max: 8 },
    { code: 1804, fields: [0, 0, 0, 50, 50], min: 3, max: 5 },
    { code: 1805, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 1811, fields: [50, 50, 0, 0, 0], min: 24, max: 32 },
    { code: 1812, fields: [0, 50, 50, 0, 0], min: 12, max: 16 },
    { code: 1813, fields: [0, 0, 50, 50, 0], min: 6, max: 8 },
    { code: 1814, fields: [0, 0, 0, 50, 50], min: 3, max: 5 },
    { code: 1815, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 1821, fields: [0, 0, 50, 50, 0], min: 8, max: 12 },
    { code: 1822, fields: [0, 0, 0, 50, 50], min: 4, max: 6 },
    { code: 1823, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 1824, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 1825, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2101, fields: [0, 20, 20, 30, 30], min: 8, max: 16 },
    { code: 2102, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2103, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2104, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2105, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2201, fields: [0, 20, 20, 30, 30], min: 8, max: 16 },
    { code: 2202, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2203, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2204, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2205, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2301, fields: [0, 20, 20, 30, 30], min: 8, max: 16 },
    { code: 2302, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2303, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2304, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2305, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2801, fields: [0, 30, 30, 40, 0], min: 10, max: 20 },
    { code: 2802, fields: [0, 10, 20, 30, 40], min: 5, max: 10 },
    { code: 2803, fields: [0, 0, 0, 30, 70], min: 2, max: 5 },
    { code: 2804, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2805, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 3101, fields: [0, 20, 20, 30, 30], min: 15, max: 30 },
    { code: 3102, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 3103, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 3104, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 3105, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
];

const FIELD_OBJECT_REGEN = [
    { code: 1801, fields: [50, 50, 0, 0, 0], min: 8, max: 16 },
    { code: 1802, fields: [0, 50, 50, 0, 0], min: 4, max: 8 },
    { code: 1803, fields: [0, 0, 50, 50, 0], min: 2, max: 4 },
    { code: 1804, fields: [0, 0, 0, 50, 50], min: 1, max: 2 },
    { code: 1805, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 1811, fields: [50, 50, 0, 0, 0], min: 8, max: 16 },
    { code: 1812, fields: [0, 50, 50, 0, 0], min: 4, max: 8 },
    { code: 1813, fields: [0, 0, 50, 50, 0], min: 2, max: 4 },
    { code: 1814, fields: [0, 0, 0, 50, 50], min: 1, max: 2 },
    { code: 1815, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 1821, fields: [0, 0, 50, 50, 0], min: 1, max: 2 },
    { code: 1822, fields: [0, 0, 0, 50, 50], min: 0, max: 0 },
    { code: 1823, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 1824, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 1825, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2101, fields: [0, 20, 20, 30, 30], min: 1, max: 2 },
    { code: 2102, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2103, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2104, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2105, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2201, fields: [0, 20, 20, 30, 30], min: 1, max: 2 },
    { code: 2202, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2203, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2204, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2205, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2301, fields: [0, 20, 20, 30, 30], min: 1, max: 2 },
    { code: 2302, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2303, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2304, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2305, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2801, fields: [0, 30, 30, 40, 0], min: 4, max: 8 },
    { code: 2802, fields: [0, 10, 20, 30, 40], min: 2, max: 4 },
    { code: 2803, fields: [0, 0, 0, 30, 70], min: 1, max: 2 },
    { code: 2804, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 2805, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 3101, fields: [0, 20, 20, 30, 30], min: 2, max: 4 },
    { code: 3102, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 3103, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 3104, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
    { code: 3105, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
];

const OBJECT_REGEN_INTERVAL_MIN = 10;
const OBJECT_REGEN_INTERVAL_MS = OBJECT_REGEN_INTERVAL_MIN * 60 * 1000;


function getTerrainGroupFromCode(code) {
    const base = getTerrainBase(code);
    if (base === 100) return 1;
    if (base === 200) return 2;
    if (base === 300) return 3;
    if (base === 400) return 4;
    if (base === 500) return 5;
    return null;
}

function pickWeightedGroup(weights, pools) {
    const candidates = weights.map((weight, idx) => ({ group: idx + 1, weight, size: pools[idx + 1]?.length || 0 }));
    const eligible = candidates.filter(c => c.weight > 0 && c.size > 0);
    if (eligible.length === 0) {
        const fallback = candidates.filter(c => c.size > 0);
        if (fallback.length === 0) return null;
        return fallback[Math.floor(Math.random() * fallback.length)].group;
    }
    const total = eligible.reduce((sum, c) => sum + c.weight, 0);
    let roll = Math.random() * total;
    for (const c of eligible) {
        roll -= c.weight;
        if (roll <= 0) return c.group;
    }
    return eligible[eligible.length - 1].group;
}

function pickFromPool(group, pools) {
    const pool = pools[group];
    if (!pool || pool.length === 0) return null;
    const idx = Math.floor(Math.random() * pool.length);
    return pool.splice(idx, 1)[0];
}

function buildTerrainPools() {
    const pools = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (let r = 0; r < FIELD_MAP_DATA.length; r++) {
        for (let c = 0; c < FIELD_MAP_DATA[r].length; c++) {
            const type = FIELD_MAP_DATA[r][c];
            if (!isTerrainCode(type) || isBorderTerrain(type)) continue;
            const group = getTerrainGroupFromCode(type);
            if (group) pools[group].push({ r, c });
        }
    }
    return pools;
}

function applyObjectProbPlacements() {
    const pools = buildTerrainPools();
    const placements = [];
    FIELD_OBJECT_PROB.forEach(entry => {
        const min = entry.min || 0;
        const max = entry.max || 0;
        if (max <= 0) return;
        const count = min === max ? min : (min + Math.floor(Math.random() * (max - min + 1)));
        for (let i = 0; i < count; i++) {
            const group = pickWeightedGroup(entry.fields, pools);
            let cell = group ? pickFromPool(group, pools) : null;
            if (!cell) {
                const fallback = Object.keys(pools).map(n => parseInt(n, 10)).filter(g => pools[g].length > 0);
                if (fallback.length === 0) break;
                const g = fallback[Math.floor(Math.random() * fallback.length)];
                cell = pickFromPool(g, pools);
            }
            if (!cell) break;
            FIELD_MAP_DATA[cell.r][cell.c] = entry.code;
            placements.push({ r: cell.r, c: cell.c, code: entry.code });
        }
    });
    return placements;
}

function applyObjectProbToMap() {
    if (typeof window === 'undefined') return;
    const key = 'kov_field_object_prob_v1';
    let placements = null;
    try {
        const raw = localStorage.getItem(key);
        if (raw) placements = JSON.parse(raw);
    } catch (e) { }
    if (!Array.isArray(placements)) {
        placements = applyObjectProbPlacements();
        try {
            localStorage.setItem(key, JSON.stringify(placements));
        } catch (e) { }
    } else {
        let changed = false;
        const next = [];
        placements.forEach(p => {
            if (!FIELD_MAP_DATA[p.r] || typeof FIELD_MAP_DATA[p.r][p.c] === 'undefined') { changed = true; return; }
            const base = FIELD_TERRAIN_DATA?.[p.r]?.[p.c];
            if (isWallTile(base) || isBorderTerrain(FIELD_MAP_DATA[p.r][p.c]) || isBorderTerrain(base)) {
                if (base !== undefined && base !== null) FIELD_MAP_DATA[p.r][p.c] = base;
                changed = true;
                return;
            }
            if (!isTerrainCode(FIELD_MAP_DATA[p.r][p.c])) { changed = true; return; }
            FIELD_MAP_DATA[p.r][p.c] = p.code;
            next.push(p);
        });
        if (changed) {
            try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) { }
        }
    }
}

applyObjectProbToMap();

function purgeBorderObjects() {
    let changed = false;
    for (let r = 0; r < FIELD_MAP_DATA.length; r++) {
        for (let c = 0; c < FIELD_MAP_DATA[r].length; c++) {
            const base = FIELD_TERRAIN_DATA?.[r]?.[c];
            if (!isBorderTerrain(base) && !isWallTile(base)) continue;
            if (isTerrainCode(FIELD_MAP_DATA[r][c])) continue;
            FIELD_MAP_DATA[r][c] = base;
            changed = true;
        }
    }
    return changed;
}

purgeBorderObjects();

function buildRegenPools() {
    const pools = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (let r = 0; r < FIELD_MAP_DATA.length; r++) {
        for (let c = 0; c < FIELD_MAP_DATA[r].length; c++) {
            const base = FIELD_TERRAIN_DATA?.[r]?.[c];
            if (!isTerrainCode(base) || isBorderTerrain(base)) continue;
            if (!isTerrainCode(FIELD_MAP_DATA[r][c])) continue;
            const group = getTerrainGroupFromCode(base);
            if (group) pools[group].push({ r, c });
        }
    }
    return pools;
}

function countFieldObjects() {
    const counts = {};
    for (let r = 0; r < FIELD_MAP_DATA.length; r++) {
        for (let c = 0; c < FIELD_MAP_DATA[r].length; c++) {
            const code = FIELD_MAP_DATA[r][c];
            counts[code] = (counts[code] || 0) + 1;
        }
    }
    return counts;
}

function applyObjectRegenCycle(regenByCode, regenTargets, now) {
    const pools = buildRegenPools();
    const counts = countFieldObjects();
    const placements = [];
    FIELD_OBJECT_REGEN.forEach(entry => {
        const max = entry.max || 0;
        const min = entry.min || 0;
        if (max <= 0) return;
        const current = counts[entry.code] || 0;
        if (!regenTargets[entry.code]) {
            const span = Math.max(0, max - min);
            regenTargets[entry.code] = min + (span > 0 ? Math.floor(Math.random() * (span + 1)) : 0);
        }
        const target = regenTargets[entry.code];
        if (current >= target) return;
        const last = regenByCode?.[entry.code] || 0;
        if (now - last < OBJECT_REGEN_INTERVAL_MS) return;

        const group = pickWeightedGroup(entry.fields, pools);
        let cell = group ? pickFromPool(group, pools) : null;
        if (!cell) {
            const fallback = Object.keys(pools).map(n => parseInt(n, 10)).filter(g => pools[g].length > 0);
            if (fallback.length === 0) return;
            const g = fallback[Math.floor(Math.random() * fallback.length)];
            cell = pickFromPool(g, pools);
        }
        if (!cell) return;
        FIELD_MAP_DATA[cell.r][cell.c] = entry.code;
        counts[entry.code] = current + 1;
        placements.push({ r: cell.r, c: cell.c, code: entry.code });
        if (regenByCode) regenByCode[entry.code] = now;
    });
    return placements;
}

// Helper Functions
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
        if (type === ITEM_TYPE.ITEM_GOLD) return { name: "Gold", earn: ITEM_VALUES[level] };
        if (type === ITEM_TYPE.ITEM_ENERGY) return { name: "Energy", earn: ITEM_VALUES[level] };
        if (type === ITEM_TYPE.ITEM_CRYSTAL) return { name: "Crystal", earn: ITEM_VALUES[level] };
    }
    if (type < 10) {
        if (type === ITEM_TYPE.BUILDING_BARRACKS) return { name: "Barracks", energy: BUILDING_DATA[ITEM_TYPE.BUILDING_BARRACKS][level]?.energy };
        if (type === ITEM_TYPE.BUILDING_RANGE) return { name: "Range", energy: BUILDING_DATA[ITEM_TYPE.BUILDING_RANGE][level]?.energy };
        if (type === ITEM_TYPE.BUILDING_STABLE) return { name: "Stable", energy: BUILDING_DATA[ITEM_TYPE.BUILDING_STABLE][level]?.energy };
        if (type === ITEM_TYPE.BUILDING_CHEST) return { name: "Chest" };
        if (type === ITEM_TYPE.BUILDING_CAMP) return { name: "Camp" };
    }
    if (type >= 10 && type < 20) {
        const code = getCode(type, level);
        const stat = UNIT_STATS[code];
        if (stat) return { name: stat.name, class: type === 10 ? "Infantry" : (type === 11 ? "Archer" : "Cavalry"), hp: stat.hp, atk: stat.atk, def: stat.def, spd: stat.spd, rng: stat.rng, mov: stat.mov, sell: stat.sell };
    }
    return { name: "Unknown", earn: 0, sell: 0 };
}

// --- DUMMY DATA FOR SOCIAL ---
const DUMMY_CHAT_MESSAGES = [
    { senderKey: "ui.chat.sender.system", senderFallback: "System", textKey: "ui.chat.dummy.welcome", textFallback: "Server notice: Welcome commander." },
    { senderKey: "ui.chat.sender.world", senderFallback: "World", textKey: "ui.chat.dummy.dragon", textFallback: "Dragon status: HP remaining (3/4)." },
    { senderKey: "ui.chat.sender.guild", senderFallback: "Guild", textKey: "ui.chat.dummy.reset", textFallback: "Daily mission reset in 5 minutes." },
    { senderKey: "ui.chat.sender.world", senderFallback: "World", textKey: "ui.chat.dummy.market", textFallback: "Market notice: Gold price updated." },
    { senderKey: "ui.chat.sender.system", senderFallback: "System", textKey: "ui.chat.dummy.chest", textFallback: "User 'LegendKnight' found a chest." },
    { senderKey: "ui.chat.sender.world", senderFallback: "World", textKey: "ui.chat.dummy.scout", textFallback: "Scout report: Enemy near border." },
    { senderKey: "ui.chat.sender.guild", senderFallback: "Guild", textKey: "ui.chat.dummy.donation", textFallback: "Reminder: Check donation board." },
    { senderKey: "ui.chat.sender.system", senderFallback: "System", textKey: "ui.chat.dummy.exp", textFallback: "Event started: EXP +50%." }
];

// --- CLASSES ---
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true; this.bgmStarted = false;
        const BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/audio/`;
        this.files = { bgm: new Audio(BASE + 'bgm.mp3'), merge: new Audio(BASE + 'merge.mp3'), coin: new Audio(BASE + 'coin.mp3'), pop: new Audio(BASE + 'pop.mp3') };
        this.files.bgm.loop = true; this.files.bgm.volume = 0.5;
    }
    resume() { if (this.ctx.state === 'suspended') this.ctx.resume(); if (this.enabled && !this.bgmStarted) { this.files.bgm.play().then(() => this.bgmStarted = true).catch(() => { }); } }
    playFile(n, v = 1.0) { if (!this.enabled || !this.files[n]) return; const s = this.files[n].cloneNode(); s.crossOrigin = "anonymous"; s.volume = v; s.play().catch(() => { }); }
    playTone(f, t, d) { if (!this.enabled) return; const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(0.1, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + d); o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + d); }
    playClick() { this.playFile('pop', 0.6); }
    playError() { this.playTone(150, 'sawtooth', 0.3); }
    playSpawn() { this.playFile('pop', 0.5); }
    playMerge() { this.playFile('merge', 0.8); }
    playCollect() { this.playFile('coin', 0.6); }
    playUnlock() { this.playFile('merge', 0.8); }
    playLevelUp() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.3), i * 100)); }
}

class AssetLoader {
    constructor() { this.images = {}; }
    loadAll(cb) {
        let loaded = 0;
        ASSET_KEYS.forEach(key => {
            const img = new Image(); img.crossOrigin = "Anonymous";
            img.onload = () => { this.images[key] = img; loaded++; if (loaded === ASSET_KEYS.length) cb(); };
            img.onerror = () => {
                const ext = key === 'field_bg' ? '.jpg' : '.png';
                img.src = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/img/${key}${ext}`;
                loaded++; if (loaded === ASSET_KEYS.length) cb();
            };
            img.src = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/img/${key}.png`;
        });
        setTimeout(cb, 2000);
    }
    getImage(type, level) {
        if (typeof type === 'string') return this.images[type];
        const code = getCode(type, level);
        return this.images[code] || (level > 1 ? this.getImage(type, level - 1) : null);
    }
}

class Particle {
    constructor(x, y, color, type) {
        this.x = x; this.y = y; this.vx = (Math.random() - 0.5) * 8; this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0; this.decay = Math.random() * 0.03 + 0.02; this.color = color; this.size = Math.random() * 6 + 4; this.type = type;
        if (type === 'smoke') { this.vy = -Math.abs(this.vy) * 0.5; this.decay = 0.015; }
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= this.decay; if (this.type === 'smoke') this.size += 0.3; else this.vy += 0.2; }
    draw(ctx) { ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; if (this.type === 'confetti') { ctx.translate(this.x, this.y); ctx.rotate(this.life * 5); ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size); ctx.resetTransform(); const s = ctx.canvas.width / 1080; ctx.scale(s, s); } else if (this.type === 'smoke') { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(this.x, this.y, this.size, this.size); ctx.globalAlpha = 1.0; }
}

class AStar {
    static findPath(start, end, mapData, occupiedTiles, isBlockedFn) {
        const rows = MAP_SIZE, cols = MAP_SIZE;
        const openSet = [], closedSet = new Set();
        const startNode = { r: start.r, c: start.c, g: 0, h: 0, f: 0, parent: null };
        openSet.push(startNode);

        while (openSet.length > 0) {
            let lowInd = 0;
            for (let i = 0; i < openSet.length; i++) if (openSet[i].f < openSet[lowInd].f) lowInd = i;
            const current = openSet[lowInd];

            if (current.r === end.r && current.c === end.c) {
                const path = []; let temp = current;
                while (temp) { path.push({ r: temp.r, c: temp.c }); temp = temp.parent; }
                return path.reverse();
            }

            openSet.splice(lowInd, 1);
            closedSet.add(`${current.r},${current.c}`);

            const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (let i = 0; i < neighbors.length; i++) {
                const nr = current.r + neighbors[i][0], nc = current.c + neighbors[i][1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    if (closedSet.has(`${nr},${nc}`)) continue;

                    const type = mapData[nr][nc];
                    const isTarget = (nr === end.r && nc === end.c);
                    const isOccupied = occupiedTiles.has(`${nr},${nc}`);

                    let isWalkable = true;
                    if (isBlockedFn) {
                        if (isBlockedFn(current, nr, nc, type, isOccupied, isTarget)) isWalkable = false;
                    } else if (isBlockingField(type) && !isOccupied && !isTarget) {
                        isWalkable = false;
                    }

                    if (!isWalkable) continue;

                    const gScore = current.g + 1;
                    let neighbor = openSet.find(n => n.r === nr && n.c === nc);

                    if (!neighbor) {
                        neighbor = { r: nr, c: nc, g: gScore, h: Math.abs(nr - end.r) + Math.abs(nc - end.c), f: 0, parent: current };
                        neighbor.f = neighbor.g + neighbor.h;
                        openSet.push(neighbor);
                    } else if (gScore < neighbor.g) {
                        neighbor.g = gScore; neighbor.f = neighbor.g + neighbor.h; neighbor.parent = current;
                    }
                }
            }
        }
        return null;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas'); this.ctx = this.canvas.getContext('2d');
        this.width = 1080; this.height = 1920; this.assets = new AssetLoader(); this.sound = new SoundManager();
        this.grid = Array(CONFIG.gridRows).fill().map(() => Array(CONFIG.gridCols).fill(null));
        this.gridState = Array(CONFIG.gridRows).fill().map(() => Array(CONFIG.gridCols).fill(null));
        this.squad1 = Array(9).fill(null); this.squad2 = Array(9).fill(null); this.squad3 = Array(9).fill(null);
        this.particles = [];
        this.lordLevel = 1; this.currentXp = 0;
        this.energy = 50; this.gold = 3000; this.gems = 100; this.points = 0; // Gem/Point Added
        this.cp = 20;

        // Phase 4: Social & BM State
        this.userProfile = {
            name: this.getDefaultProfileName(),
            title: this.getDefaultProfileTitle(),
            avatar: 1, // 1~5
            vip: 0,
            winRate: 0,
            totalPVP: 0,
            totalCP: 0
        };
        this.chatLog = [];
        this.chatState = { activeChannel: 'world', logsByChannel: { world: [], guild: [], system: [] }, maxLogs: 80 };
        this.socialState = {
            players: [],
            friends: [],
            friendRequestsIn: [],
            friendRequestsOut: [],
            allianceRequestsIn: [],
            allianceRequestsOut: []
        };
        this.adWatchCount = 0;
        this.isChatOpen = false;
        this.baseEnergyRegen = 1;
        this.baseMaxCp = 20; this.baseCpRegen = 1;
        this.cpBonus = 0; this.cpRegenBonus = 0;
        this.maxCp = this.baseMaxCp; this.cpRegen = this.baseCpRegen;
        this.energyRegenAcc = 0;
        this.cpRegenAcc = 0;
        const nowTs = Date.now();
        this.energyLastRegenAt = nowTs;
        this.cpLastRegenAt = nowTs;

        this.occupiedTiles = new Set();
        this.fieldEvents = {}; // key: "r,c", value: { type, data }
        this.initFieldMap();
        this.populateFieldEvents(); // Generate Random Events
        this.occupiedTiles.add(`${PLAYER_START.r},${PLAYER_START.c}`);
        this.income = 0;
        this.hourlyIncomeRemainder = 0;
        this.dungeonState = { cooldownByKey: {} };
        this.rebellionState = { lastByKey: {} };
        this.crownState = { holderKey: null, capturedAt: 0, kingCastleKey: null, promotedAt: 0 };
        this.worldState = {
            season: 1,
            ended: false,
            winner: null,
            reason: "",
            endedAt: 0,
            score: 0,
            rewardPackage: null,
            rewardsClaimed: false,
            dragonBoss: { season: 1, killCount: 0, byUid: {}, lastKill: null }
        };
        this.worldLobbyState = { entered: false, channel: 'alpha', enteredAt: 0 };
        this.lobbyChannelStatusTable = this.buildLobbyChannelStatusTable();
        this.lobbyChannelStatusSource = 'local';
        this.lobbyChannelStatusFetchedAt = 0;
        this.lobbyChannelStatusLastAttemptAt = 0;
        this.lobbyChannelFetchPending = false;
        this.adminState = { presetId: DEFAULT_WORLD_PRESET_ID, worldEndConditions: WORLD_END_CONDITIONS, worldSeasonPolicy: WORLD_SEASON_POLICY };
        this.worldRuleSet = DEFAULT_WORLD_RULESET;

        this.selectedArmyId = null;
        this.lastSelectedArmyId = null;
        this.currentFieldTargetKey = null;
        this.currentFieldTargetType = null;
        this.fieldResourceState = {};
        this.fieldShopState = {};
        this.refillAdState = { date: "", usage: { energy: 0, gold: 0, cp: 0 } };
        this.currentShopContext = null;
        this.shopTimer = null;
        this.fieldObjectState = {};
        this.fieldDefenderState = {};
        this.fieldBuffs = { atk: 0, def: 0, hp: 0, spd: 0 };
        this.citadelCount = 0;
        this.thirdSquadUnlocked = false;
        this.moveTargetMode = null;
        this.previewPath = null;
        this.movePreviewText = "";
        this.pendingBattleReward = null;
        this.battleFx = null;
        this.battleFxPhaseTimer = null;
        this.battleFxClearTimer = null;
        this.fieldCameraCleanup = null;
        this.isResetting = false;
        this.effectLog = [];
        this.openBorderTiles = new Set();
        this.fieldRegions = null;

        this.visibilityMap = new Set();
        this.revealFog(PLAYER_START.r, PLAYER_START.c, FOG_RADIUS);

        this.grassTexture = this.createGrassPattern();

        this.settings = { bgm: true, sfx: true, push: true };
        this.locale = DEFAULT_LOCALE;
        try {
            const savedLocale = localStorage.getItem('kov_locale');
            if (savedLocale) this.locale = savedLocale;
        } catch (e) { }

        this.drag = null; this.hover = null; this.selectedItem = null; this.potentialDrag = null; this.dpr = window.devicePixelRatio || 1;

        this.armies = [
            { id: 0, name: this.getDefaultSquadName(1), color: "#4caf50", state: 'IDLE', r: PLAYER_START.r, c: PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 },
            { id: 1, name: this.getDefaultSquadName(2), color: "#2196f3", state: 'IDLE', r: PLAYER_START.r, c: PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 },
            { id: 2, name: this.getDefaultSquadName(3), color: "#f59e0b", state: 'IDLE', r: PLAYER_START.r, c: PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 }
        ];

        this.calcLayout();
        const resetFlag = localStorage.getItem('kov_force_reset') === '1';
        if (resetFlag) {
            try {
                localStorage.removeItem('kov_force_reset');
                localStorage.removeItem('kov_save_v1');
                localStorage.removeItem('kov_field_object_prob_v1');
                localStorage.removeItem('kov_uid');
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('kov_')) localStorage.removeItem(key);
                }
            } catch (e) { }
        }
        if (!resetFlag && this.loadGame()) { this.updateLevelStats(); }
        else { this.initGame(); }
        this.ensureAdminState();
        this.applyWorldPreset(this.getActiveWorldPresetId(), { persist: false, silent: true });
        this.sanitizeUserProfile();
        this.sanitizeArmies();
        this.recalcFieldBonuses();
        this.buildFieldRegions();
        this.updateOpenBorders();
        this.updateUI();

        setInterval(() => this.regenEnergy(), 1000);
        setInterval(() => this.regenCp(), 1000);
        setInterval(() => this.collectTerritoryIncome(), 3000);
        this.initObjectRegen();
        this.initSocialUI(); // Phase 4 Injection
        window.addEventListener('resize', () => { this.resize(); this.requestRender(); });
        this.resize(); this.setupInput();
        this.assets.loadAll(() => { this.requestRender(); });
        this.loop(); this.updateUI();

        if (!localStorage.getItem('kov_uid')) localStorage.setItem('kov_uid', 'U' + Math.floor(Math.random() * 1000000));
        document.getElementById('settings-uid').innerText = localStorage.getItem('kov_uid');
        this.refreshLocaleControls();
    }

    closeAllModals() {
        console.log("Force closing all modals");
        document.querySelectorAll('.modal-overlay').forEach(el => {
            el.classList.remove('open');
            el.style.display = 'none';
        });
        this.clearBattleFxTimers();
        this.battleFx = null;
        this.battleContext = null;
    }

    sanitizeProfileText(value, fallback, maxLen = 20) {
        let text = String(value ?? '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/[\u0000-\u001f\u007f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text) return fallback;

        // Use ASCII-only profile text to avoid mojibake rendering issues.
        try { text = text.normalize('NFKD'); } catch (e) { }
        text = text
            .replace(/[^\x20-\x7E]/g, '')
            .replace(/[^A-Za-z0-9 _.'-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (text.length < 2) return fallback;
        return text.slice(0, maxLen);
    }

    sanitizeUserProfile() {
        if (!this.userProfile || typeof this.userProfile !== 'object') this.userProfile = {};
        this.userProfile.name = this.sanitizeProfileText(this.userProfile.name, this.getDefaultProfileName(), 20);
        this.userProfile.title = this.sanitizeProfileText(this.userProfile.title, this.getDefaultProfileTitle(), 24);
        const avatar = Number(this.userProfile.avatar);
        this.userProfile.avatar = Number.isFinite(avatar) ? Math.max(1, Math.min(5, Math.floor(avatar))) : 1;
        this.userProfile.vip = Math.max(0, Number(this.userProfile.vip) || 0);
        const winRate = Number(this.userProfile.winRate);
        this.userProfile.winRate = Number.isFinite(winRate) ? Math.max(0, Math.min(100, winRate)) : 0;
    }

    getDefaultProfileName() {
        return this.tr('ui.profile.unknown_user', {}, 'Unknown User');
    }

    getDefaultProfileTitle() {
        return this.tr('ui.profile.commander', {}, 'Commander');
    }

    getDefaultSquadName(index) {
        return this.tr('ui.squad.name', { index }, `Squad ${index}`);
    }

    sanitizeArmyName(value, index) {
        return this.sanitizeProfileText(value, this.getDefaultSquadName(index + 1), 24);
    }

    sanitizeArmies() {
        const base = [
            { id: 0, name: this.getDefaultSquadName(1), color: "#4caf50", state: 'IDLE', r: PLAYER_START.r, c: PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 },
            { id: 1, name: this.getDefaultSquadName(2), color: "#2196f3", state: 'IDLE', r: PLAYER_START.r, c: PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 },
            { id: 2, name: this.getDefaultSquadName(3), color: "#f59e0b", state: 'IDLE', r: PLAYER_START.r, c: PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 }
        ];

        const source = Array.isArray(this.armies) ? this.armies : [];
        this.armies = base.map((def, idx) => {
            const raw = source[idx] && typeof source[idx] === 'object' ? source[idx] : {};
            const army = Object.assign({}, def, raw);
            army.id = idx;
            army.name = this.sanitizeArmyName(army.name, idx);
            if (!Array.isArray(army.path)) army.path = [];
            army.nextStepIndex = Number.isFinite(Number(army.nextStepIndex)) ? Number(army.nextStepIndex) : 0;
            army.lastMoveTime = Number.isFinite(Number(army.lastMoveTime)) ? Number(army.lastMoveTime) : 0;
            army.moveInterval = Number.isFinite(Number(army.moveInterval)) ? Number(army.moveInterval) : 0;
            return army;
        });
    }

    createGrassPattern() {
        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        const x = c.getContext('2d');
        x.fillStyle = '#4a6e3a';
        x.fillRect(0, 0, 32, 32);
        for (let i = 0; i < 30; i++) {
            x.fillStyle = Math.random() > 0.5 ? '#567d46' : '#3e5c30';
            const px = Math.floor(Math.random() * 32);
            const py = Math.floor(Math.random() * 32);
            x.fillRect(px, py, 1, 1);
        }
        return c.toDataURL();
    }

    saveGame() {
        try {
            if (this.isResetting || localStorage.getItem('kov_force_reset') === '1') return;
            const data = {
                grid: this.grid, gridState: this.gridState, squad1: this.squad1, squad2: this.squad2, squad3: this.squad3,
                lordLevel: this.lordLevel, currentXp: this.currentXp, energy: this.energy, gold: this.gold, gem: this.gem,
                cp: this.cp, maxCp: this.maxCp,
                energyRegenAcc: this.energyRegenAcc,
                cpRegenAcc: this.cpRegenAcc,
                hourlyIncomeRemainder: this.hourlyIncomeRemainder,
                energyLastRegenAt: this.energyLastRegenAt,
                cpLastRegenAt: this.cpLastRegenAt,
                occupiedTiles: Array.from(this.occupiedTiles), settings: this.settings,
                visibilityMap: Array.from(this.visibilityMap),
                lastSelectedArmyId: this.lastSelectedArmyId,
                fieldResourceState: this.fieldResourceState,
                fieldShopState: this.fieldShopState,
                refillAdState: this.refillAdState,
                fieldObjectState: this.fieldObjectState,
                fieldDefenderState: this.fieldDefenderState,
                dungeonState: this.dungeonState,
                rebellionState: this.rebellionState,
                crownState: this.crownState,
                worldState: this.worldState,
                worldLobbyState: this.worldLobbyState,
                adminState: this.adminState,
                worldRuleSet: this.getWorldRuleSetName(),
                fieldBuffs: this.fieldBuffs,
                armies: this.armies,
                chatState: this.chatState,
                socialState: this.socialState
            };
            localStorage.setItem('kov_save_v1', JSON.stringify(data));
        } catch (e) { }
    }
    loadGame() {
        try {
            const saved = localStorage.getItem('kov_save_v1'); if (!saved) return false;
            const data = JSON.parse(saved);
            const isValidGrid = (grid) => Array.isArray(grid) && grid.length === CONFIG.gridRows && grid.every(row => Array.isArray(row) && row.length === CONFIG.gridCols);
            const isValidSquad = (squad) => Array.isArray(squad) && squad.length === 9;
            const validGrid = isValidGrid(data.grid);
            const validGridState = isValidGrid(data.gridState);
            if (!validGrid) {
                try { localStorage.removeItem('kov_save_v1'); } catch (e) { }
                return false;
            }
            this.grid = data.grid;
            this.gridState = validGridState ? data.gridState : this.gridState;
            this.squad1 = isValidSquad(data.squad1) ? data.squad1 : this.squad1;
            this.squad2 = isValidSquad(data.squad2) ? data.squad2 : this.squad2;
            this.squad3 = isValidSquad(data.squad3) ? data.squad3 : this.squad3;
            this.lordLevel = data.lordLevel || 1; this.currentXp = data.currentXp || 0;
            this.energy = Number.isFinite(Number(data.energy)) ? Number(data.energy) : 50;
            this.gold = Number.isFinite(Number(data.gold)) ? Number(data.gold) : 3000;
            this.gem = Number.isFinite(Number(data.gem)) ? Number(data.gem) : 50;
            this.cp = Number.isFinite(Number(data.cp)) ? Number(data.cp) : 20;
            this.maxCp = Number.isFinite(Number(data.maxCp)) ? Number(data.maxCp) : 20;
            this.energyRegenAcc = Number.isFinite(Number(data.energyRegenAcc)) ? Number(data.energyRegenAcc) : 0;
            this.cpRegenAcc = Number.isFinite(Number(data.cpRegenAcc)) ? Number(data.cpRegenAcc) : 0;
            this.hourlyIncomeRemainder = Number.isFinite(Number(data.hourlyIncomeRemainder)) ? Number(data.hourlyIncomeRemainder) : 0;
            const nowTs = Date.now();
            this.energyLastRegenAt = Number.isFinite(Number(data.energyLastRegenAt)) ? Number(data.energyLastRegenAt) : nowTs;
            this.cpLastRegenAt = Number.isFinite(Number(data.cpLastRegenAt)) ? Number(data.cpLastRegenAt) : nowTs;
            if (data.occupiedTiles) this.occupiedTiles = new Set(data.occupiedTiles);
            if (data.visibilityMap) this.visibilityMap = new Set(data.visibilityMap);
            if (data.lastSelectedArmyId !== undefined) this.lastSelectedArmyId = data.lastSelectedArmyId;
            if (data.fieldResourceState) this.fieldResourceState = data.fieldResourceState;
            if (data.fieldShopState) this.fieldShopState = data.fieldShopState;
            if (data.refillAdState) this.refillAdState = data.refillAdState;
            if (data.fieldObjectState) this.fieldObjectState = data.fieldObjectState;
            if (data.fieldDefenderState) this.fieldDefenderState = data.fieldDefenderState;
            if (data.dungeonState && typeof data.dungeonState === 'object') this.dungeonState = data.dungeonState;
            if (data.rebellionState && typeof data.rebellionState === 'object') this.rebellionState = data.rebellionState;
            if (data.crownState && typeof data.crownState === 'object') this.crownState = data.crownState;
            if (data.worldState && typeof data.worldState === 'object') this.worldState = data.worldState;
            if (data.worldLobbyState && typeof data.worldLobbyState === 'object') this.worldLobbyState = data.worldLobbyState;
            if (data.adminState && typeof data.adminState === 'object') this.adminState = data.adminState;
            this.worldRuleSet = normalizeWorldRuleSetName(data.worldRuleSet || this.worldRuleSet);
            if (data.fieldBuffs) this.fieldBuffs = data.fieldBuffs;
            if (data.settings) { this.settings = data.settings; this.applySettings(); }
            if (data.chatState && typeof data.chatState === 'object') this.chatState = data.chatState;
            if (data.socialState && typeof data.socialState === 'object') this.socialState = data.socialState;
            if (Array.isArray(data.chatLog) && data.chatLog.length) {
                this.ensureChatState();
                this.chatState.logsByChannel.world = data.chatLog.slice(-this.chatState.maxLogs);
            }
            if (data.armies) {
                this.armies = data.armies;
                if (this.armies.length < 3) {
                    this.armies.push({ id: 2, name: this.getDefaultSquadName(3), color: "#f59e0b", state: 'IDLE', r: PLAYER_START.r, c: PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 });
                }
            }
            if (!validGridState) this.refreshLockState();
            if (!this.occupiedTiles || this.occupiedTiles.size === 0) this.occupiedTiles = new Set([`${PLAYER_START.r},${PLAYER_START.c}`]);
            else this.occupiedTiles.add(`${PLAYER_START.r},${PLAYER_START.c}`);
            this.syncCrownEventState();
            this.revealFog(PLAYER_START.r, PLAYER_START.c, FOG_RADIUS);
            return true;
        } catch (e) {
            try { localStorage.removeItem('kov_save_v1'); } catch (err) { }
            return false;
        }
    }
    resetGame() {
        if (confirm(this.tr('ui.settings.reset_confirm', {}, 'Reset all local progress?'))) {
            this.isResetting = true;
            try {
                localStorage.setItem('kov_force_reset', '1');
                localStorage.removeItem('kov_save_v1');
                localStorage.removeItem('kov_field_object_prob_v1');
                localStorage.removeItem('kov_uid');
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('kov_')) localStorage.removeItem(key);
                }
                if (localStorage.getItem('kov_save_v1')) {
                    localStorage.clear();
                }
            } catch (e) { }
            window.location.reload();
        }
    }

    openSettings() {
        this.refreshLocaleControls();
        document.getElementById('modal-settings').classList.add('open');
    }

    openAdminModal() {
        this.renderAdminPanel();
        const modal = document.getElementById('modal-admin');
        if (modal) modal.classList.add('open');
    }

    closeAdminModal() {
        const modal = document.getElementById('modal-admin');
        if (modal) modal.classList.remove('open');
    }

    renderAdminPanel() {
        const modal = document.getElementById('modal-admin');
        const presetSelect = document.getElementById('admin-preset-select');
        const summary = document.getElementById('admin-preset-summary');
        if (!modal || !presetSelect || !summary) return;

        const activePreset = this.getActiveWorldPresetId();
        presetSelect.innerHTML = '';
        Object.keys(WORLD_PRESETS).forEach((id) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.innerText = this.getWorldPresetLabel(id);
            if (id === activePreset) opt.selected = true;
            presetSelect.appendChild(opt);
        });

        const selected = this.getWorldPresetConfig(presetSelect.value || activePreset) || this.getWorldPresetConfig(activePreset);
        const endCfg = selected?.worldEndConditions || this.getActiveWorldEndConditions();
        const seasonCfg = selected?.seasonPolicy || this.getActiveWorldSeasonPolicy();
        const ruleLabel = this.getWorldRuleSetLabel(selected?.ruleSet || this.getWorldRuleSetName());
        const endType = String(endCfg.type || 'king_castle_hold');
        const carry = seasonCfg.resourceCarryover || {};
        summary.innerHTML = `
            <div class="text-[12px] text-gray-200">${this.tr('ui.admin.summary.ruleset', {}, 'Ruleset')}: <b>${ruleLabel}</b></div>
            <div class="text-[12px] text-gray-200">${this.tr('ui.admin.summary.end_type', {}, 'End Type')}: <b>${endType}</b></div>
            <div class="text-[12px] text-gray-300">${this.tr('ui.admin.summary.end_target', {}, 'Targets')}: hold ${Math.floor((endCfg.targetHoldMs || 0) / 60000)}m / score ${endCfg.targetScore || 0}</div>
            <div class="text-[12px] text-gray-300">${this.tr('ui.admin.summary.season_policy', {}, 'Season Policy')}: grid=${seasonCfg.keepMergeGrid ? 'keep' : 'reset'}, squad=${seasonCfg.keepSquads ? 'keep' : 'reset'}, res=${seasonCfg.keepResources ? 'keep' : 'reset'}, pt=${seasonCfg.keepPoints ? 'keep' : 'reset'}</div>
            <div class="text-[12px] text-gray-300">${this.tr('ui.admin.summary.carryover', {}, 'Carryover')}: G ${carry.gold ?? 1}, GEM ${carry.gem ?? 1}, EN ${carry.energy ?? 1}, CP ${carry.cp ?? 1}, PT ${carry.points ?? 1}</div>
        `;
    }

    onAdminPresetChange() {
        this.renderAdminPanel();
    }

    applyAdminPresetFromUI() {
        const presetSelect = document.getElementById('admin-preset-select');
        const presetId = presetSelect ? presetSelect.value : this.getActiveWorldPresetId();
        if (!presetId) return;
        const ok = this.applyWorldPreset(presetId, { persist: true, silent: false });
        if (ok) this.renderAdminPanel();
    }

    ensureWorldLobbyState() {
        if (!this.worldLobbyState || typeof this.worldLobbyState !== 'object') {
            this.worldLobbyState = { entered: false, channel: 'alpha', enteredAt: 0 };
        }
        if (!Object.prototype.hasOwnProperty.call(this.worldLobbyState, 'entered')) this.worldLobbyState.entered = false;
        const rawChannel = String(this.worldLobbyState.channel || 'alpha').trim().toLowerCase();
        this.worldLobbyState.channel = ['alpha', 'beta', 'gamma'].includes(rawChannel) ? rawChannel : 'alpha';
        if (!Object.prototype.hasOwnProperty.call(this.worldLobbyState, 'enteredAt')) this.worldLobbyState.enteredAt = 0;
        return this.worldLobbyState;
    }

    getApiBaseUrl() {
        const raw = String(window.KOV_API_BASE_URL || '').trim();
        return raw.replace(/\/+$/, '');
    }

    async fetchApiJson(path, options = {}) {
        const base = this.getApiBaseUrl();
        if (!base) return null;
        const method = options.method || 'GET';
        const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
        try {
            const response = await fetch(`${base}${path}`, Object.assign({}, options, { method, headers, cache: 'no-store' }));
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    async fetchLobbyChannelStatusFromApi(force = false) {
        if (this.lobbyChannelFetchPending) return;
        const now = Date.now();
        if (!force && now - this.lobbyChannelStatusLastAttemptAt < 15000) return;
        this.lobbyChannelFetchPending = true;
        this.lobbyChannelStatusLastAttemptAt = now;
        let didUpdateFromServer = false;
        try {
            const payload = await this.fetchApiJson('/v1/lobby/channels');
            if (!payload || !Array.isArray(payload.channels)) return;
            const table = {};
            payload.channels.forEach((row) => {
                const channel = String(row?.channelId || '').trim().toLowerCase();
                const cap = Math.max(1, Number(row?.capacity || 0));
                const occupied = Math.max(0, Math.min(cap, Number(row?.population || 0)));
                if (!channel) return;
                table[channel] = { channel, occupied, cap, ratio: occupied / cap };
            });
            if (!Object.keys(table).length) return;
            this.lobbyChannelStatusTable = table;
            this.lobbyChannelStatusSource = 'server';
            this.lobbyChannelStatusFetchedAt = now;
            didUpdateFromServer = true;
        } finally {
            this.lobbyChannelFetchPending = false;
            if (didUpdateFromServer) {
                const modal = document.getElementById('modal-lobby');
                if (modal?.classList?.contains('open')) this.renderLobbyChannelStatus();
            }
        }
    }

    buildLobbyChannelStatusTable() {
        const now = new Date();
        const minuteBucket = Math.floor((now.getHours() * 60 + now.getMinutes()) / 5);
        const make = (channel, basePop, cap) => {
            let hash = 0;
            for (let i = 0; i < channel.length; i++) hash += channel.charCodeAt(i) * (i + 3);
            const wave = (minuteBucket * 17 + hash * 13) % 37;
            const occupied = Math.max(1, Math.min(cap, basePop + wave));
            const ratio = occupied / cap;
            return { channel, occupied, cap, ratio };
        };
        return {
            alpha: make('alpha', 58, 120),
            beta: make('beta', 34, 100),
            gamma: make('gamma', 22, 80)
        };
    }

    getLobbyCongestionProfile(ratio) {
        if (ratio >= 0.85) return { label: 'High', cls: 'text-red-300' };
        if (ratio >= 0.55) return { label: 'Medium', cls: 'text-yellow-300' };
        return { label: 'Low', cls: 'text-emerald-300' };
    }

    renderLobbyChannelStatus() {
        const select = document.getElementById('lobby-channel-select');
        const panel = document.getElementById('lobby-channel-status');
        if (!select || !panel) return;
        const selected = String(select.value || 'alpha').trim().toLowerCase();
        const table = this.lobbyChannelStatusTable || this.buildLobbyChannelStatusTable();
        const row = table[selected] || table.alpha;
        if (!row) return;
        const profile = this.getLobbyCongestionProfile(row.ratio);
        const pct = Math.round(row.ratio * 100);
        const sourceText = this.lobbyChannelStatusSource === 'server' ? 'Server' : 'Local estimate (skeleton)';

        panel.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <span class="text-gray-300">Population</span>
                <span class="font-bold text-gray-100">${row.occupied}/${row.cap}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
                <span class="text-gray-300">Congestion</span>
                <span class="font-bold ${profile.cls}">${profile.label} (${pct}%)</span>
            </div>
            <div class="w-full h-2 rounded bg-gray-700 overflow-hidden">
                <div class="h-full ${row.ratio >= 0.85 ? 'bg-red-500' : (row.ratio >= 0.55 ? 'bg-yellow-500' : 'bg-emerald-500')}" style="width:${pct}%;"></div>
            </div>
            <div class="text-[10px] text-gray-400 mt-2">${sourceText}</div>
        `;
        if (this.lobbyChannelStatusSource !== 'server') this.fetchLobbyChannelStatusFromApi(false);
    }

    openWorldLobbyModal() {
        const modal = document.getElementById('modal-lobby');
        const select = document.getElementById('lobby-channel-select');
        if (!modal || !select) return;
        const state = this.ensureWorldLobbyState();
        select.value = state.channel || 'alpha';
        this.renderLobbyChannelStatus();
        this.fetchLobbyChannelStatusFromApi(true);
        modal.classList.add('open');
    }

    closeWorldLobbyModal() {
        const modal = document.getElementById('modal-lobby');
        if (modal) modal.classList.remove('open');
    }

    confirmWorldLobbyEntry() {
        const select = document.getElementById('lobby-channel-select');
        const channel = String(select?.value || 'alpha').trim().toLowerCase();
        const state = this.ensureWorldLobbyState();
        state.channel = ['alpha', 'beta', 'gamma'].includes(channel) ? channel : 'alpha';
        state.entered = true;
        state.enteredAt = Date.now();
        this.renderLobbyChannelStatus();
        this.closeWorldLobbyModal();
        this.saveGame();
        this.showToast(this.tr('toast.lobby_entered', { channel: state.channel.toUpperCase() }, `Entered channel ${state.channel.toUpperCase()}`));
        this.toggleField({ skipLobby: true });
    }
    setLocale(locale) {
        if (!locale || !LOCALIZATION_DATA || !LOCALIZATION_DATA[locale]) return;
        this.locale = locale;
        try { localStorage.setItem('kov_locale', locale); } catch (e) { }
        this.refreshLocaleControls();
        this.showToast(this.tr('toast.locale_changed', { locale: locale.toUpperCase() }, `Language: ${locale}`));
    }
    refreshLocaleControls() {
        const setText = (id, key, fallback) => {
            const el = document.getElementById(id);
            if (el) el.innerText = this.tr(key, {}, fallback);
        };
        const localeSelect = document.getElementById('locale-select');
        if (localeSelect) {
            localeSelect.value = this.locale || DEFAULT_LOCALE;
            const optKo = localeSelect.querySelector('option[value="ko"]');
            const optEn = localeSelect.querySelector('option[value="en"]');
            if (optKo) optKo.innerText = this.tr('ui.locale.ko', {}, 'Korean');
            if (optEn) optEn.innerText = this.tr('ui.locale.en', {}, 'English');
        }
        const localeLabel = document.getElementById('locale-label');
        if (localeLabel) localeLabel.innerText = this.tr('ui.settings.language', {}, 'Language');
        const worldRuleSetLabel = document.getElementById('world-ruleset-label');
        if (worldRuleSetLabel) worldRuleSetLabel.innerText = this.tr('ui.settings.world_ruleset', {}, 'World Ruleset');

        const worldRuleSetSelect = document.getElementById('world-ruleset-select');
        if (worldRuleSetSelect) {
            worldRuleSetSelect.value = this.getWorldRuleSetName();
            const optKind = worldRuleSetSelect.querySelector('option[value="kind"]');
            const optNeutral = worldRuleSetSelect.querySelector('option[value="neutral"]');
            const optCruel = worldRuleSetSelect.querySelector('option[value="cruel"]');
            if (optKind) optKind.innerText = this.tr('ui.world_ruleset.kind', {}, 'Kind');
            if (optNeutral) optNeutral.innerText = this.tr('ui.world_ruleset.neutral', {}, 'Neutral');
            if (optCruel) optCruel.innerText = this.tr('ui.world_ruleset.cruel', {}, 'Cruel');
        }

        const settingsTitle = document.getElementById('settings-title');
        if (settingsTitle) settingsTitle.innerText = this.tr('ui.settings.title', {}, 'Settings');
        const resetBtn = document.getElementById('settings-reset-btn');
        if (resetBtn) resetBtn.innerText = this.tr('ui.settings.reset', {}, 'Reset Account');
        const closeBtn = document.getElementById('settings-close-btn');
        if (closeBtn) closeBtn.innerText = this.tr('ui.settings.close', {}, 'Close');
        const adminPresetSelect = document.getElementById('admin-preset-select');
        if (adminPresetSelect) {
            const current = this.getActiveWorldPresetId();
            adminPresetSelect.innerHTML = '';
            Object.keys(WORLD_PRESETS).forEach((id) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.innerText = this.getWorldPresetLabel(id);
                if (id === current) opt.selected = true;
                adminPresetSelect.appendChild(opt);
            });
        }

        setText('footer-build-label', 'ui.footer.build', 'Build');
        setText('footer-field-label', 'ui.footer.field', 'Field');
        setText('levelup-title', 'ui.modal.levelup.title', 'LEVEL UP!');
        setText('levelup-level-label', 'ui.modal.levelup.level', 'Level (Lord Level)');
        setText('levelup-energy-label', 'ui.modal.levelup.max_energy', 'Max Energy');
        setText('levelup-confirm-btn', 'ui.common.confirm', 'Confirm');
        setText('settings-bgm-label', 'ui.settings.bgm', 'BGM');
        setText('settings-sfx-label', 'ui.settings.sfx', 'SFX');
        setText('settings-push-label', 'ui.settings.push', 'Push Notifications');
        setText('settings-uid-label', 'ui.settings.uid', 'UID');
        setText('settings-version-label', 'ui.settings.version', 'Version');
        setText('settings-redeem-label', 'ui.settings.redeem', 'Redeem Code');
        setText('settings-redeem-btn', 'ui.settings.apply', 'Apply');
        setText('settings-support-btn', 'ui.settings.support', 'Support');
        setText('settings-delete-btn', 'ui.settings.delete', 'Delete Account');
        setText('object-modal-close-btn', 'ui.settings.close', 'Close');
        setText('battle-title-label', 'ui.battle.title', '⚔ BATTLE');
        setText('battle-target-name', 'ui.battle.target', 'Target');
        setText('battle-allies-label', 'ui.battle.allies', 'ALLIES');
        setText('battle-enemies-label', 'ui.battle.enemies', 'ENEMIES');
        setText('battle-result-close-btn', 'ui.settings.close', 'Close');
        setText('battle-cancel-btn', 'ui.common.cancel', 'Cancel');
        setText('battle-prep-title', 'ui.battle.prep.title', 'Battle Prep');
        setText('battle-prep-subtitle', 'ui.battle.prep.subtitle', 'Drag to change formation');
        setText('battle-prep-allies-label', 'ui.battle.prep.allies', 'Allies (Drag)');
        setText('battle-prep-enemies-label', 'ui.battle.prep.enemies', 'Enemies');
        setText('battle-prep-cancel-btn', 'ui.common.cancel', 'Cancel');
        setText('battle-prep-start-btn', 'ui.battle.prep.start', 'Start Battle');
        setText('info-name', 'ui.info.no_selection', 'No selection');
        setText('info-desc', 'ui.info.select_hint', 'Select an item to see details.');
        setText('action-label', 'ui.common.none', '-');
        setText('settings-admin-btn', 'ui.settings.admin', 'Admin');
        setText('admin-title', 'ui.admin.title', 'Admin Console');
        setText('admin-preset-label', 'ui.admin.preset', 'World Preset');
        setText('admin-apply-btn', 'ui.admin.apply', 'Apply Preset');
        setText('admin-close-btn', 'ui.settings.close', 'Close');
        setText('lobby-title', 'ui.lobby.title', 'Inter-World Lobby');
        setText('lobby-close-btn', 'ui.settings.close', 'Close');
        setText('lobby-desc', 'ui.lobby.desc', 'Select a channel and enter the world map.');
        setText('lobby-channel-label', 'ui.lobby.channel', 'Channel');
        setText('lobby-enter-btn', 'ui.lobby.enter', 'Enter World');
        setText('lobby-cancel-btn', 'ui.common.cancel', 'Cancel');
        setText('chat-close-btn', 'ui.chat.close', 'Close');
        setText('chat-send-btn', 'ui.chat.send', 'Send');
        const redeemInput = document.getElementById('settings-redeem-input');
        if (redeemInput) redeemInput.placeholder = this.tr('ui.settings.redeem_placeholder', {}, 'Enter code');
        const lobbySelect = document.getElementById('lobby-channel-select');
        if (lobbySelect) {
            const labels = {
                alpha: this.tr('ui.lobby.channel.alpha', {}, 'Alpha'),
                beta: this.tr('ui.lobby.channel.beta', {}, 'Beta'),
                gamma: this.tr('ui.lobby.channel.gamma', {}, 'Gamma')
            };
            Array.from(lobbySelect.options).forEach((opt) => {
                const k = String(opt.value || '').toLowerCase();
                if (labels[k]) opt.innerText = labels[k];
            });
        }
        this.renderLobbyChannelStatus();
        this.updateChatTabUI();
        this.renderAdminPanel();
        this.applySettings();
    }
    toggleSetting(key, el) {
        if (!this.settings || typeof this.settings !== 'object') this.settings = {};
        this.settings[key] = !this.settings[key];
        if (el) {
            el.classList.toggle('on');
            const knob = el.querySelector('.toggle-knob');
            if (knob) knob.style.left = this.settings[key] ? '22px' : '2px';
        }
        if (key === 'bgm') { if (this.settings.bgm) this.sound.files.bgm.play().catch(() => { }); else this.sound.files.bgm.pause(); }
        if (key === 'push') {
            const mode = this.settings.push ? this.tr('ui.common.on', {}, 'ON') : this.tr('ui.common.off', {}, 'OFF');
            this.showToast(this.tr('toast.push_toggled', { mode }, `Push notifications: ${mode}`));
        }
        this.sound.enabled = this.settings.sfx; this.saveGame();
    }
    applySettings() {
        if (!this.settings || typeof this.settings !== 'object') this.settings = {};
        if (typeof this.settings.bgm !== 'boolean') this.settings.bgm = true;
        if (typeof this.settings.sfx !== 'boolean') this.settings.sfx = true;
        if (typeof this.settings.push !== 'boolean') this.settings.push = true;
        this.sound.enabled = this.settings.sfx;

        const syncToggle = (id, enabled) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.toggle('on', !!enabled);
            const knob = el.querySelector('.toggle-knob');
            if (knob) knob.style.left = enabled ? '22px' : '2px';
        };
        syncToggle('settings-bgm-toggle', this.settings.bgm);
        syncToggle('settings-sfx-toggle', this.settings.sfx);
        syncToggle('settings-push-toggle', this.settings.push);
    }

    getRedeemStorageKey() {
        const uid = this.getLocalUid();
        return `kov_redeem_codes_v1_${uid}`;
    }

    getRedeemedCodeMap() {
        try {
            const raw = localStorage.getItem(this.getRedeemStorageKey());
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch (e) { }
        return {};
    }

    saveRedeemedCodeMap(map) {
        try {
            localStorage.setItem(this.getRedeemStorageKey(), JSON.stringify(map || {}));
        } catch (e) { }
    }

    applyRedeemCode() {
        const input = document.getElementById('settings-redeem-input');
        if (!input) return;
        const raw = String(input.value || '').trim();
        if (!raw) {
            this.showToast(this.tr('toast.redeem_empty', {}, 'Please enter a code'));
            return;
        }
        const code = raw.toUpperCase();
        const rewardsByCode = {
            KOVWELCOME: { gold: 1000, gem: 30, energy: 10, cp: 3 },
            KOVSTARTER: { gold: 2000, gem: 50, energy: 15, cp: 5 }
        };
        const reward = rewardsByCode[code];
        if (!reward) {
            this.showToast(this.tr('toast.redeem_invalid', {}, 'Invalid code'));
            return;
        }

        const redeemed = this.getRedeemedCodeMap();
        if (redeemed[code]) {
            this.showToast(this.tr('toast.redeem_used', {}, 'Code already used'));
            return;
        }

        this.gold += Number(reward.gold || 0);
        this.gem += Number(reward.gem || 0);
        this.energy = Math.min(this.maxEnergy, this.energy + Number(reward.energy || 0));
        this.cp = Math.min(this.maxCp, this.cp + Number(reward.cp || 0));
        redeemed[code] = Date.now();
        this.saveRedeemedCodeMap(redeemed);
        input.value = '';
        this.updateUI();
        this.showToast(this.tr('toast.redeem_applied', {}, 'Code applied'));
    }

    openSupport() {
        const url = 'https://github.com/nod-sean/bmo/issues';
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) { }
        this.showToast(this.tr('toast.support_opened', {}, 'Support page opened'));
    }

    requestAccountDeletion() {
        const ok = window.confirm(this.tr('ui.settings.delete_confirm', {}, 'Delete account and all local data?'));
        if (!ok) return;
        this.resetGame();
    }
    getLocalDateKey() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    ensureRefillAdState() {
        if (!this.refillAdState || typeof this.refillAdState !== "object") {
            this.refillAdState = { date: "", usage: { energy: 0, gold: 0, cp: 0 } };
        }
        if (!this.refillAdState.usage || typeof this.refillAdState.usage !== "object") {
            this.refillAdState.usage = { energy: 0, gold: 0, cp: 0 };
        }
        const today = this.getLocalDateKey();
        if (this.refillAdState.date !== today) {
            this.refillAdState.date = today;
            this.refillAdState.usage = { energy: 0, gold: 0, cp: 0 };
        }
    }
    getRefillAdRemain(type, limit) {
        this.ensureRefillAdState();
        const used = Number(this.refillAdState.usage[type] || 0);
        if (!limit || limit <= 0) return Number.MAX_SAFE_INTEGER;
        return Math.max(0, limit - used);
    }
    consumeRefillAd(type, limit) {
        this.ensureRefillAdState();
        const remain = this.getRefillAdRemain(type, limit);
        if (remain <= 0) return false;
        this.refillAdState.usage[type] = Number(this.refillAdState.usage[type] || 0) + 1;
        return true;
    }
    applyRefillGain(type, amount) {
        const gain = Math.max(0, Number(amount) || 0);
        if (gain <= 0) return;
        if (type === 'energy') this.energy = Math.min(this.maxEnergy, this.energy + gain);
        else if (type === 'cp') this.cp = Math.min(this.maxCp, this.cp + gain);
        else if (type === 'gold') this.gold += gain;
        else if (type === 'crystal') this.gem += gain;
    }
    openRefill(type) {
        const modal = document.getElementById('modal-refill');
        const content = document.getElementById('refill-options');
        const title = document.getElementById('refill-title');
        if (!modal || !content || !title) return;

        content.innerHTML = "";
        modal.classList.add('open');

        const data = Array.isArray(REFILL_DATA[type]) ? REFILL_DATA[type] : [];
        title.innerText = type === 'energy' ? this.tr('ui.refill.energy', {}, 'Energy Refill')
            : (type === 'gold' ? this.tr('ui.refill.gold', {}, 'Gold Refill')
                : (type === 'cp' ? this.tr('ui.refill.cp', {}, 'CP Refill')
                    : this.tr('ui.refill.crystal', {}, 'Crystal Shop')));

        if (!data.length) {
            const empty = document.createElement('div');
            empty.className = "text-xs text-gray-300";
            empty.innerText = this.tr('toast.coming_soon', {}, 'Coming soon');
            content.appendChild(empty);
            return;
        }

        if (type === 'crystal') {
            data.forEach((row) => {
                const amount = Number(row.crystal_refill || 0);
                const bonus = Number(row.bonus || 0);
                const cost = Number(row.cost || 0);

                const btn = document.createElement('button');
                btn.className = "bg-gray-700 hover:bg-gray-600 p-4 rounded-lg flex justify-between items-center text-white border border-gray-600";
                const gainText = bonus > 0 ? `${amount} (+${bonus})` : `${amount}`;
                btn.innerHTML = `<span class="font-bold">GEM ${gainText}</span><span class="bg-blue-600 px-3 py-1 rounded text-sm">$${cost}</span>`;
                btn.onclick = () => {
                    this.showToast(this.tr('toast.coming_soon', {}, 'Coming soon'));
                };
                content.appendChild(btn);
            });
            return;
        }

        const refillKey = `${type}_refill`;
        data.forEach((row) => {
            const amount = Number(row[refillKey] || 0);
            const costCrystal = Number(row.crystal || 0);
            const isAd = Number(row.ad || 0) === 1;
            const limit = Number(row.limit || 0);
            const remain = isAd ? this.getRefillAdRemain(type, limit) : Number.MAX_SAFE_INTEGER;
            const canUseAd = !isAd || remain > 0;

            const btn = document.createElement('button');
            btn.className = "bg-gray-700 hover:bg-gray-600 p-4 rounded-lg flex justify-between items-center text-white border border-gray-600";
            if (isAd && !canUseAd) btn.classList.add('opacity-50', 'cursor-not-allowed');

            const leftLabel = isAd
                ? `AD +${amount}${limit > 0 ? ` (${remain}/${limit})` : ''}`
                : `+${amount}`;
            const rightLabel = isAd ? this.tr('ui.refill.watch_ad', {}, 'Watch Ad') : `GEM ${costCrystal}`;
            btn.innerHTML = `<span class="font-bold">${leftLabel}</span><span class="bg-blue-600 px-3 py-1 rounded text-sm">${rightLabel}</span>`;

            btn.onclick = () => {
                if (isAd) {
                    if (!this.consumeRefillAd(type, limit)) {
                        this.showToast(this.tr('toast.daily_limit_reached', {}, 'Daily limit reached'));
                        this.sound.playError();
                        return;
                    }
                    this.applyRefillGain(type, amount);
                    this.sound.playCollect();
                    this.updateUI();
                    this.openRefill(type);
                    return;
                }

                if (this.gem < costCrystal) {
                    this.showToast(this.tr('toast.gem_short', {}, 'Not enough crystals'));
                    this.sound.playError();
                    return;
                }

                this.gem -= costCrystal;
                this.applyRefillGain(type, amount);
                this.sound.playCollect();
                this.updateUI();
                modal.classList.remove('open');
            };

            content.appendChild(btn);
        });
    }
    showLevelUpModal(prevLv, prevEn) {
        document.getElementById('lv-old').innerText = prevLv; document.getElementById('lv-new').innerText = this.lordLevel;
        document.getElementById('en-old').innerText = prevEn; const d = LEVEL_DATA_BY_LEVEL.get(this.lordLevel); document.getElementById('en-new').innerText = d ? d.energy_max : 50;
        document.getElementById('modal-levelup').classList.add('open'); const banner = document.getElementById('levelup-banner'); banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); setTimeout(() => banner.classList.remove('show'), 2500);
    }

    requestRender() { this.isDirty = true; }
    spawnParticles(x, y, color, count, type) { for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, color, type)); this.isDirty = true; }
    regenEnergy() {
        const now = Date.now();
        if (!Number.isFinite(this.energyLastRegenAt)) this.energyLastRegenAt = now;
        const elapsedSec = Math.max(0, (now - this.energyLastRegenAt) / 1000);
        this.energyLastRegenAt = now;

        let fountainBonus = 0;
        this.occupiedTiles.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            if (isFountainTile(FIELD_MAP_DATA[r][c])) fountainBonus += 1;
        });
        const regenPer5m = Math.max(0, Number(this.baseEnergyRegen || 0) + fountainBonus);
        if (this.energy >= this.maxEnergy || regenPer5m <= 0 || elapsedSec <= 0) return;
        this.energyRegenAcc = (this.energyRegenAcc || 0) + ((regenPer5m / 300) * elapsedSec);
        const gained = Math.floor(this.energyRegenAcc);
        if (gained > 0) {
            this.energy = Math.min(this.maxEnergy, this.energy + gained);
            this.energyRegenAcc -= gained;
            this.updateUI();
        }
    }
    regenCp() {
        const now = Date.now();
        if (!Number.isFinite(this.cpLastRegenAt)) this.cpLastRegenAt = now;
        const elapsedSec = Math.max(0, (now - this.cpLastRegenAt) / 1000);
        this.cpLastRegenAt = now;

        const regenPer5m = Math.max(0, Number(this.cpRegen || 0));
        if (this.cp >= this.maxCp || regenPer5m <= 0 || elapsedSec <= 0) return;
        this.cpRegenAcc = (this.cpRegenAcc || 0) + ((regenPer5m / 300) * elapsedSec);
        const gained = Math.floor(this.cpRegenAcc);
        if (gained > 0) {
            this.cp = Math.min(this.maxCp, this.cp + gained);
            this.cpRegenAcc -= gained;
            this.updateUI();
        }
    }
    initObjectRegen() {
        if (!this.fieldObjectState) this.fieldObjectState = {};
        if (!this.fieldObjectState.regenByCode) this.fieldObjectState.regenByCode = {};
        if (!this.fieldObjectState.regenTargetByCode) this.fieldObjectState.regenTargetByCode = {};
        const now = Date.now();
        FIELD_OBJECT_REGEN.forEach(entry => {
            if ((entry.max || 0) <= 0) return;
            if (this.fieldObjectState.regenByCode[entry.code] === undefined) {
                this.fieldObjectState.regenByCode[entry.code] = now;
            }
            if (this.fieldObjectState.regenTargetByCode[entry.code] === undefined) {
                const min = entry.min || 0;
                const max = entry.max || 0;
                const span = Math.max(0, max - min);
                this.fieldObjectState.regenTargetByCode[entry.code] = min + (span > 0 ? Math.floor(Math.random() * (span + 1)) : 0);
            }
        });
        if (this.objectRegenTimer) clearInterval(this.objectRegenTimer);
        this.objectRegenTimer = setInterval(() => this.runObjectRegen(), 1000);
    }
    runObjectRegen() {
        const now = Date.now();
        if (!this.fieldObjectState.regenByCode) this.fieldObjectState.regenByCode = {};
        if (!this.fieldObjectState.regenTargetByCode) this.fieldObjectState.regenTargetByCode = {};
        const placements = applyObjectRegenCycle(this.fieldObjectState.regenByCode, this.fieldObjectState.regenTargetByCode, now);
        if (placements.length > 0) {
            if (document.getElementById('field-modal').classList.contains('open') && !this.moveTargetMode) {
                this.renderFieldMap();
            } else {
                this.requestRender();
            }
        }
        this.saveGame();
    }

    getWorldRuleSetName() {
        return normalizeWorldRuleSetName(this.worldRuleSet);
    }

    getWorldRuleSet() {
        const mode = this.getWorldRuleSetName();
        return WORLD_RULESETS[mode] || WORLD_RULESETS[WORLD_RULESET_KEYS.NEUTRAL];
    }

    setWorldRuleSet(mode, opts = {}) {
        const next = normalizeWorldRuleSetName(mode);
        const persist = opts.persist !== false;
        if (this.worldRuleSet === next) return next;
        this.worldRuleSet = next;
        this.recalcFieldBonuses();
        this.updateUI();
        if (persist) this.saveGame();
        return next;
    }

    getWorldRuleSetLabel(mode) {
        const normalized = normalizeWorldRuleSetName(mode);
        if (normalized === WORLD_RULESET_KEYS.KIND) return this.tr('ui.world_ruleset.kind', {}, 'Kind');
        if (normalized === WORLD_RULESET_KEYS.CRUEL) return this.tr('ui.world_ruleset.cruel', {}, 'Cruel');
        return this.tr('ui.world_ruleset.neutral', {}, 'Neutral');
    }

    onWorldRuleSetChange(mode) {
        const applied = this.setWorldRuleSet(mode, { persist: true });
        const label = this.getWorldRuleSetLabel(applied);
        this.showToast(this.tr('toast.world_ruleset_changed', { mode: label }, `World ruleset: ${label}`));
        this.refreshLocaleControls();
    }

    scaleWorldCost(baseCost, multiplier) {
        const base = Number(baseCost);
        if (!Number.isFinite(base) || base <= 0) return 0;
        const mult = Number.isFinite(Number(multiplier)) ? Math.max(0, Number(multiplier)) : 1;
        const scaled = Math.round(base * mult);
        if (mult > 0 && scaled <= 0) return 1;
        return Math.max(0, scaled);
    }

    getMoveCostsByRule(tileType) {
        let energyCost = 1;
        let goldCost = 0;
        if (isGateTile(tileType)) {
            energyCost = 5;
            goldCost = 100;
        }
        const rule = this.getWorldRuleSet();
        return {
            energyCost: this.scaleWorldCost(energyCost, rule.moveEnergyMultiplier),
            goldCost: this.scaleWorldCost(goldCost, rule.moveGoldMultiplier),
            cpCost: this.scaleWorldCost(CP_COST_PER_COMMAND, rule.cpCostMultiplier)
        };
    }

    getTaxRate(type) {
        const data = this.getFieldObjectData(type);
        let baseTax = 1;
        if (data) {
            const tax = this.getAbilityValue(data, ABILITY_CODES.TAX);
            baseTax = tax > 0 ? tax : 1;
        }
        return this.scaleWorldCost(baseTax, this.getWorldRuleSet().taxMultiplier);
    }

    getUpkeepCost(type) {
        const data = this.getFieldObjectData(type);
        if (!data) return 0;
        const upkeep = this.getAbilityValue(data, ABILITY_CODES.UPKEEP);
        return this.scaleWorldCost(upkeep || 0, this.getWorldRuleSet().upkeepMultiplier);
    }

    getFacilityHourlyGoldIncome(type) {
        if (!isShopTile(type) && !isTavernTile(type)) return 0;
        const data = this.getFieldObjectData(type);
        const taxAbility = this.getAbilityValue(data, ABILITY_CODES.TAX);
        if (taxAbility > 0) return taxAbility;
        if (isShopTile(type)) return SHOP_HOURLY_GOLD_FALLBACK;
        if (isTavernTile(type)) return TAVERN_HOURLY_GOLD_FALLBACK;
        return 0;
    }

    getDungeonEventKey(r, c) {
        return `dungeon:${r},${c}`;
    }

    getDungeonCooldownRemainingMs(r, c) {
        const key = this.getDungeonEventKey(r, c);
        const lastAt = Number(this.dungeonState?.cooldownByKey?.[key] || 0);
        if (!lastAt) return 0;
        return Math.max(0, (lastAt + DUNGEON_COOLDOWN_MS) - Date.now());
    }

    canEnterDungeon(r, c, showToast = true) {
        const remainingMs = this.getDungeonCooldownRemainingMs(r, c);
        if (remainingMs > 0) {
            if (showToast) {
                const time = this.formatDurationCompact(remainingMs);
                this.showToast(this.tr('toast.dungeon_cooldown', { time }, `Dungeon cooldown: ${time}`));
            }
            return false;
        }
        if (this.gold < DUNGEON_ENTRY_GOLD_COST) {
            if (showToast) this.showToast(this.tr('toast.gold_short_cost', { cost: DUNGEON_ENTRY_GOLD_COST }, `Not enough gold (${DUNGEON_ENTRY_GOLD_COST})`));
            return false;
        }
        if (this.energy < DUNGEON_ENTRY_ENERGY_COST) {
            if (showToast) this.showToast(this.tr('toast.energy_short_cost', { cost: DUNGEON_ENTRY_ENERGY_COST }, `Not enough energy (${DUNGEON_ENTRY_ENERGY_COST})`));
            return false;
        }
        if (this.cp < DUNGEON_ENTRY_CP_COST) {
            if (showToast) this.showToast(this.tr('toast.cp_short_cost', { cost: DUNGEON_ENTRY_CP_COST }, `Not enough CP (${DUNGEON_ENTRY_CP_COST})`));
            return false;
        }
        return true;
    }

    consumeDungeonEntry(r, c) {
        const key = this.getDungeonEventKey(r, c);
        if (!this.dungeonState || typeof this.dungeonState !== 'object') this.dungeonState = { cooldownByKey: {} };
        if (!this.dungeonState.cooldownByKey || typeof this.dungeonState.cooldownByKey !== 'object') this.dungeonState.cooldownByKey = {};

        this.gold = Math.max(0, this.gold - DUNGEON_ENTRY_GOLD_COST);
        this.energy = Math.max(0, this.energy - DUNGEON_ENTRY_ENERGY_COST);
        this.cp = Math.max(0, this.cp - DUNGEON_ENTRY_CP_COST);
        this.dungeonState.cooldownByKey[key] = Date.now();

        this.showToast(this.tr(
            'toast.dungeon_entry_paid',
            { gold: DUNGEON_ENTRY_GOLD_COST, energy: DUNGEON_ENTRY_ENERGY_COST, cp: DUNGEON_ENTRY_CP_COST },
            `Dungeon entry: -${DUNGEON_ENTRY_GOLD_COST}G -${DUNGEON_ENTRY_ENERGY_COST}EN -${DUNGEON_ENTRY_CP_COST}CP`
        ));
    }

    ensureWorldState() {
        if (!this.worldState || typeof this.worldState !== 'object') {
            this.worldState = { season: 1, ended: false, winner: null, reason: "", endedAt: 0, score: 0, rewardPackage: null, rewardsClaimed: false, dragonBoss: { season: 1, killCount: 0, byUid: {}, lastKill: null } };
        }
        if (!Object.prototype.hasOwnProperty.call(this.worldState, 'season')) this.worldState.season = 1;
        if (!Object.prototype.hasOwnProperty.call(this.worldState, 'ended')) this.worldState.ended = false;
        if (!Object.prototype.hasOwnProperty.call(this.worldState, 'winner')) this.worldState.winner = null;
        if (!Object.prototype.hasOwnProperty.call(this.worldState, 'reason')) this.worldState.reason = "";
        if (!Object.prototype.hasOwnProperty.call(this.worldState, 'endedAt')) this.worldState.endedAt = 0;
        if (!Object.prototype.hasOwnProperty.call(this.worldState, 'score')) this.worldState.score = 0;
        if (!Object.prototype.hasOwnProperty.call(this.worldState, 'rewardPackage')) this.worldState.rewardPackage = null;
        if (!Object.prototype.hasOwnProperty.call(this.worldState, 'rewardsClaimed')) this.worldState.rewardsClaimed = false;
        if (!Object.prototype.hasOwnProperty.call(this.worldState, 'dragonBoss')) {
            this.worldState.dragonBoss = { season: Number(this.worldState.season || 1), killCount: 0, byUid: {}, lastKill: null };
        }
        this.ensureDragonBossState();
        return this.worldState;
    }

    getLocalUid() {
        try {
            const uid = localStorage.getItem('kov_uid');
            if (uid) return uid;
        } catch (e) { }
        return 'local_player';
    }

    ensureDragonBossState() {
        const world = this.worldState && typeof this.worldState === 'object' ? this.worldState : this.ensureWorldState();
        if (!world.dragonBoss || typeof world.dragonBoss !== 'object') {
            world.dragonBoss = { season: Number(world.season || 1), killCount: 0, byUid: {}, lastKill: null };
        }
        const boss = world.dragonBoss;
        if (!Object.prototype.hasOwnProperty.call(boss, 'season')) boss.season = Number(world.season || 1);
        if (!Object.prototype.hasOwnProperty.call(boss, 'killCount')) boss.killCount = 0;
        if (!Object.prototype.hasOwnProperty.call(boss, 'byUid') || typeof boss.byUid !== 'object' || Array.isArray(boss.byUid)) boss.byUid = {};
        if (!Object.prototype.hasOwnProperty.call(boss, 'lastKill')) boss.lastKill = null;

        const currentSeason = Math.max(1, Number(world.season || 1));
        if (Number(boss.season || 0) !== currentSeason) {
            world.dragonBoss = { season: currentSeason, killCount: 0, byUid: {}, lastKill: null };
            return world.dragonBoss;
        }
        return boss;
    }

    getBattleDamageByTeam(teamCode) {
        if (!this.battleSimulation || !Array.isArray(this.battleSimulation.steps)) return 0;
        return this.battleSimulation.steps.reduce((sum, step) => {
            if (!step || step.type !== 'attack') return sum;
            if (step.attackerTeam !== teamCode) return sum;
            const damage = Number(step.damage || 0);
            if (!Number.isFinite(damage) || damage <= 0) return sum;
            return sum + damage;
        }, 0);
    }

    getDragonContributionTier(share) {
        const ratio = Math.max(0, Math.min(1, Number(share) || 0));
        const rule = DRAGON_BOSS_CONFIG.minShareByTier;
        if (ratio >= rule.s) return 'S';
        if (ratio >= rule.a) return 'A';
        if (ratio >= rule.b) return 'B';
        return 'C';
    }

    buildDragonBossReward(tier, share, didKill) {
        const normalizedTier = String(tier || 'C').trim().toUpperCase();
        const multTable = DRAGON_BOSS_CONFIG.tierMultiplier;
        const key = normalizedTier.toLowerCase();
        const mult = Number(multTable[key]) || multTable.c || 1;
        const base = DRAGON_BOSS_CONFIG.baseRewards;
        const scaledShare = Math.max(0.5, Math.min(1.5, 0.6 + (Math.max(0, Math.min(1, Number(share) || 0)) * 0.8)));
        const calc = (n) => Math.max(0, Math.floor(Number(n || 0) * mult * scaledShare));
        const reward = {
            gold: calc(base.gold),
            gem: calc(base.gem),
            energy: calc(base.energy),
            cp: calc(base.cp),
            points: calc(base.points)
        };
        if (didKill) {
            reward.gold += Math.max(0, Math.floor(Number(DRAGON_BOSS_CONFIG.killBonusGold) || 0));
            reward.points += Math.max(0, Math.floor(Number(DRAGON_BOSS_CONFIG.killBonusPoints) || 0));
        }
        return reward;
    }

    applyDragonBossReward(reward) {
        if (!reward || typeof reward !== 'object') return;
        this.gold += Math.max(0, Number(reward.gold) || 0);
        this.gem += Math.max(0, Number(reward.gem) || 0);
        this.energy = Math.min(this.maxEnergy, this.energy + Math.max(0, Number(reward.energy) || 0));
        this.cp = Math.min(this.maxCp, this.cp + Math.max(0, Number(reward.cp) || 0));
        this.points = Math.max(0, Number(this.points || 0)) + Math.max(0, Number(reward.points) || 0);
    }

    finalizeDragonBossKill() {
        const world = this.ensureWorldState();
        const boss = this.ensureDragonBossState();
        const uid = this.getLocalUid();
        const playerName = this.userProfile?.name || this.getDefaultProfileName();

        const previousPlayerDamage = Math.max(0, Number(boss.byUid?.[uid]?.damage || 0));
        const battleDamage = Math.max(0, this.getBattleDamageByTeam('A'));
        const playerDamage = previousPlayerDamage + battleDamage;

        if (!boss.byUid[uid] || typeof boss.byUid[uid] !== 'object') {
            boss.byUid[uid] = { name: playerName, damage: 0, raids: 0, lastSeenAt: 0 };
        }
        boss.byUid[uid].name = playerName;
        boss.byUid[uid].damage = playerDamage;
        boss.byUid[uid].raids = Math.max(0, Number(boss.byUid[uid].raids || 0)) + 1;
        boss.byUid[uid].lastSeenAt = Date.now();

        const totalDamage = Object.values(boss.byUid).reduce((sum, row) => {
            const value = Number(row?.damage || 0);
            return sum + (Number.isFinite(value) && value > 0 ? value : 0);
        }, 0);
        const share = totalDamage > 0 ? (playerDamage / totalDamage) : 0;
        const tier = this.getDragonContributionTier(share);
        const reward = this.buildDragonBossReward(tier, share, true);
        this.applyDragonBossReward(reward);

        boss.killCount = Math.max(0, Number(boss.killCount || 0)) + 1;
        const ranking = Object.entries(boss.byUid)
            .map(([id, row]) => ({ uid: id, name: row?.name || id, damage: Math.max(0, Number(row?.damage || 0)) }))
            .sort((a, b) => b.damage - a.damage);
        const rank = Math.max(1, ranking.findIndex((entry) => entry.uid === uid) + 1);
        boss.lastKill = {
            at: Date.now(),
            season: Math.max(1, Number(world.season || 1)),
            uid,
            name: playerName,
            damage: battleDamage,
            totalDamage,
            contributionDamage: playerDamage,
            contributionShare: share,
            tier,
            rank,
            reward
        };
        return boss.lastKill;
    }

    ensureAdminState() {
        if (!this.adminState || typeof this.adminState !== 'object') {
            this.adminState = {};
        }
        const fallbackPreset = WORLD_PRESETS[DEFAULT_WORLD_PRESET_ID] ? DEFAULT_WORLD_PRESET_ID : 'regular';
        const rawPresetId = String(this.adminState.presetId || fallbackPreset).trim().toLowerCase();
        this.adminState.presetId = WORLD_PRESETS[rawPresetId] ? rawPresetId : fallbackPreset;
        this.adminState.worldEndConditions = parseWorldEndConditions(this.adminState.worldEndConditions || WORLD_END_CONDITIONS);
        this.adminState.worldSeasonPolicy = parseWorldSeasonPolicy(this.adminState.worldSeasonPolicy || WORLD_SEASON_POLICY);
        return this.adminState;
    }

    getActiveWorldPresetId() {
        return this.ensureAdminState().presetId;
    }

    getWorldPresetConfig(presetId) {
        const key = String(presetId || '').trim().toLowerCase();
        return WORLD_PRESETS[key] || null;
    }

    getActiveWorldEndConditions() {
        return this.ensureAdminState().worldEndConditions || WORLD_END_CONDITIONS;
    }

    getActiveWorldSeasonPolicy() {
        return this.ensureAdminState().worldSeasonPolicy || WORLD_SEASON_POLICY;
    }

    getWorldPresetLabel(presetId) {
        const config = this.getWorldPresetConfig(presetId);
        if (config && config.label) return config.label;
        const key = String(presetId || '').trim().toLowerCase();
        if (key === 'hardcore') return this.tr('ui.admin.preset.hardcore', {}, 'Hardcore');
        if (key === 'seasonal') return this.tr('ui.admin.preset.seasonal', {}, 'Seasonal');
        return this.tr('ui.admin.preset.regular', {}, 'Regular');
    }

    applyWorldPreset(presetId, opts = {}) {
        const config = this.getWorldPresetConfig(presetId);
        if (!config) return false;
        const state = this.ensureAdminState();
        const key = String(presetId || '').trim().toLowerCase();
        state.presetId = key;
        state.worldEndConditions = parseWorldEndConditions(config.worldEndConditions);
        state.worldSeasonPolicy = parseWorldSeasonPolicy(config.seasonPolicy);
        this.setWorldRuleSet(config.ruleSet, { persist: false });
        this.refreshLocaleControls();
        if (opts.persist !== false) this.saveGame();
        if (!opts.silent) {
            this.showToast(this.tr('toast.admin_preset_applied', { preset: this.getWorldPresetLabel(key) }, `Admin preset applied: ${this.getWorldPresetLabel(key)}`));
        }
        return true;
    }

    isWorldEnded() {
        return !!this.ensureWorldState().ended;
    }

    isWorldActionsLocked() {
        const endConditions = this.getActiveWorldEndConditions();
        return this.isWorldEnded() && !!endConditions.lockActionsOnEnd;
    }

    guardWorldAction(action = 'action') {
        if (!this.isWorldActionsLocked()) return false;
        this.showToast(this.tr('toast.world_end_locked', { action }, `World ended: ${action} is locked`));
        return true;
    }

    getWorldScore() {
        let score = 0;
        this.occupiedTiles.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const type = FIELD_MAP_DATA?.[r]?.[c];
            if (isCitadelTile(type)) score += 25;
            else if (isGateTile(type)) score += 10;
            else if (isDragonTile(type)) score += 40;
            else if (isShopTile(type) || isTavernTile(type)) score += 6;
            else if (isGoldMineTile(type) || isFountainTile(type)) score += 4;
            else score += 1;
        });
        return Math.max(0, Math.floor(score));
    }

    buildWorldEndRewardPackage(reason, score) {
        const mode = this.getWorldRuleSetName();
        const modeMultiplier = Number(DEFAULT_WORLD_END_REWARD_CONFIG.modeMultiplier[mode] || 1);
        const reasonKey = (reason === 'score' || reason === 'king_castle_hold') ? reason : 'hybrid';
        const base = DEFAULT_WORLD_END_REWARD_CONFIG[reasonKey] || DEFAULT_WORLD_END_REWARD_CONFIG.hybrid;
        const safeScore = Math.max(0, Number(score) || 0);

        const gold = Math.floor((base.gold + (safeScore * DEFAULT_WORLD_END_REWARD_CONFIG.scoreGoldPerPoint)) * modeMultiplier);
        const gem = Math.max(1, Math.floor(base.gem * modeMultiplier));
        const energy = Math.max(1, Math.floor(base.energy * modeMultiplier));
        const cp = Math.max(1, Math.floor(base.cp * modeMultiplier));
        const points = Math.max(1, Math.floor((base.points + Math.floor(safeScore / 100) * DEFAULT_WORLD_END_REWARD_CONFIG.scorePointsPer100) * modeMultiplier));

        return {
            reason: reasonKey,
            mode,
            score: safeScore,
            rewards: { gold, gem, energy, cp, points }
        };
    }

    renderWorldEndRewardRows(pkg) {
        if (!pkg || !pkg.rewards) return "";
        const rows = [];
        rows.push(`<div class="text-sm">- ${this.tr('ui.modal.world_end.reward_gold', { value: pkg.rewards.gold }, `Gold +${pkg.rewards.gold}`)}</div>`);
        rows.push(`<div class="text-sm">- ${this.tr('ui.modal.world_end.reward_gem', { value: pkg.rewards.gem }, `GEM +${pkg.rewards.gem}`)}</div>`);
        rows.push(`<div class="text-sm">- ${this.tr('ui.modal.world_end.reward_energy', { value: pkg.rewards.energy }, `Energy +${pkg.rewards.energy}`)}</div>`);
        rows.push(`<div class="text-sm">- ${this.tr('ui.modal.world_end.reward_cp', { value: pkg.rewards.cp }, `CP +${pkg.rewards.cp}`)}</div>`);
        rows.push(`<div class="text-sm">- ${this.tr('ui.modal.world_end.reward_points', { value: pkg.rewards.points }, `PT +${pkg.rewards.points}`)}</div>`);
        return rows.join('');
    }

    claimWorldEndRewards(opts = {}) {
        const silent = !!opts.silent;
        const world = this.ensureWorldState();
        if (!world.ended) return false;
        if (world.rewardsClaimed) return false;
        const pkg = world.rewardPackage;
        if (!pkg || !pkg.rewards) return false;

        this.gold += Math.max(0, Number(pkg.rewards.gold) || 0);
        this.gem += Math.max(0, Number(pkg.rewards.gem) || 0);
        this.energy = Math.min(this.maxEnergy, this.energy + Math.max(0, Number(pkg.rewards.energy) || 0));
        this.cp = Math.min(this.maxCp, this.cp + Math.max(0, Number(pkg.rewards.cp) || 0));
        this.points = Math.max(0, Number(this.points || 0)) + Math.max(0, Number(pkg.rewards.points) || 0);

        world.rewardsClaimed = true;
        this.updateUI();
        this.saveGame();
        if (!silent) {
            this.showToast(this.tr('toast.world_end_rewards_claimed', {}, 'World end rewards claimed'));
            this.showWorldEndModal(world.reason || pkg.reason || 'score');
        }
        return true;
    }

    startNextSeason() {
        if (!this.isWorldEnded()) return false;
        const endConditions = this.getActiveWorldEndConditions();
        if (!endConditions.allowNextSeasonTransition) {
            this.showToast(this.tr('toast.next_season_unavailable', {}, 'Next season transition is disabled'));
            return false;
        }
        const confirmText = this.tr('ui.modal.world_end.next_confirm', {}, 'Start next season now?');
        if (!window.confirm(confirmText)) return false;

        this.claimWorldEndRewards({ silent: true });

        const world = this.ensureWorldState();
        world.season = Math.max(1, Number(world.season || 1)) + 1;
        world.ended = false;
        world.winner = null;
        world.reason = "";
        world.endedAt = 0;
        world.score = 0;
        world.rewardPackage = null;
        world.rewardsClaimed = false;
        world.dragonBoss = { season: world.season, killCount: 0, byUid: {}, lastKill: null };

        this.applySeasonTransitionPolicy();

        this.dungeonState = { cooldownByKey: {} };
        this.rebellionState = { lastByKey: {} };
        this.crownState = { holderKey: null, capturedAt: 0, kingCastleKey: null, promotedAt: 0 };
        this.fieldResourceState = {};
        this.fieldShopState = {};
        this.fieldDefenderState = {};
        this.fieldBuffs = { atk: 0, def: 0, hp: 0, spd: 0 };

        this.fieldEvents = {};
        this.populateFieldEvents();
        this.occupiedTiles = new Set([`${PLAYER_START.r},${PLAYER_START.c}`]);
        this.visibilityMap = new Set();
        this.revealFog(PLAYER_START.r, PLAYER_START.c, FOG_RADIUS);

        this.armies.forEach((army) => {
            if (!army) return;
            army.state = 'IDLE';
            army.r = PLAYER_START.r;
            army.c = PLAYER_START.c;
            army.path = [];
            army.stepTimes = [];
            army.nextStepIndex = 0;
            army.target = null;
            army.lastMoveTime = 0;
            army.moveInterval = 0;
        });
        this.selectedArmyId = null;
        this.lastSelectedArmyId = null;
        this.currentFieldTargetKey = null;
        this.currentFieldTargetType = null;

        this.recalcFieldBonuses();
        this.updateOpenBorders();
        this.updateUI();
        this.saveGame();

        this.showToast(this.tr('toast.next_season_started', { season: world.season }, `Season ${world.season} started`));
        this.showToast(this.getSeasonPolicyToast(world.season));
        this.closeModal();
        if (document.getElementById('field-modal')?.dataset?.mode === 'field') {
            this.renderFieldMap();
        } else {
            this.requestRender();
        }
        return true;
    }

    applySeasonTransitionPolicy() {
        const policy = this.getActiveWorldSeasonPolicy();

        if (!policy.keepMergeGrid) {
            this.grid = Array(CONFIG.gridRows).fill().map(() => Array(CONFIG.gridCols).fill(null));
        }
        if (!policy.keepSquads) {
            this.squad1 = Array(9).fill(null);
            this.squad2 = Array(9).fill(null);
            this.squad3 = Array(9).fill(null);
        }

        if (!policy.keepResources) {
            this.gold = 3000;
            this.gem = 50;
            this.energy = this.maxEnergy;
            this.cp = this.maxCp;
        } else {
            this.gold = Math.max(0, Math.floor(this.gold * policy.resourceCarryover.gold));
            this.gem = Math.max(0, Math.floor(this.gem * policy.resourceCarryover.gem));
            this.energy = Math.max(0, Math.min(this.maxEnergy, Math.floor(this.energy * policy.resourceCarryover.energy)));
            this.cp = Math.max(0, Math.min(this.maxCp, Math.floor(this.cp * policy.resourceCarryover.cp)));
        }

        if (!policy.keepPoints) {
            this.points = 0;
        } else {
            this.points = Math.max(0, Math.floor(Number(this.points || 0) * policy.resourceCarryover.points));
        }
    }

    getSeasonPolicyToast(season) {
        const policy = this.getActiveWorldSeasonPolicy();
        const parts = [];
        parts.push(policy.keepMergeGrid ? this.tr('ui.season.keep.grid', {}, 'Grid kept') : this.tr('ui.season.reset.grid', {}, 'Grid reset'));
        parts.push(policy.keepSquads ? this.tr('ui.season.keep.squads', {}, 'Squads kept') : this.tr('ui.season.reset.squads', {}, 'Squads reset'));
        parts.push(policy.keepResources ? this.tr('ui.season.keep.resources', {}, 'Resources carried') : this.tr('ui.season.reset.resources', {}, 'Resources reset'));
        parts.push(policy.keepPoints ? this.tr('ui.season.keep.points', {}, 'Points carried') : this.tr('ui.season.reset.points', {}, 'Points reset'));
        return this.tr(
            'toast.next_season_policy',
            { season, policy: parts.join(', ') },
            `Season ${season} policy: ${parts.join(', ')}`
        );
    }

    showWorldEndModal(reason) {
        const modal = document.getElementById('field-modal');
        const content = document.getElementById('modal-content');
        const title = document.getElementById('modal-title');
        if (!modal || !content || !title) return;
        const world = this.ensureWorldState();
        const endConditions = this.getActiveWorldEndConditions();
        if (!world.rewardPackage) {
            world.rewardPackage = this.buildWorldEndRewardPackage(reason, world.score);
        }

        title.innerText = this.tr('ui.modal.world_end.title', {}, 'World Complete');
        modal.hidden = false;
        modal.classList.add('open');
        modal.dataset.mode = 'world_end';

        const reasonText = reason === 'score'
            ? this.tr(
                'ui.modal.world_end.reason_score',
                { score: this.ensureWorldState().score, target: endConditions.targetScore },
                `Target score reached (${this.ensureWorldState().score}/${endConditions.targetScore})`
            )
            : this.tr(
                'ui.modal.world_end.reason_king_castle',
                { minutes: Math.floor(endConditions.targetHoldMs / 60000) },
                `King Castle hold completed (${Math.floor(endConditions.targetHoldMs / 60000)}m)`
            );
        const rewardRows = this.renderWorldEndRewardRows(world.rewardPackage);
        const isClaimed = !!world.rewardsClaimed;
        const claimLabel = isClaimed
            ? this.tr('ui.modal.world_end.reward_claimed', {}, 'Claimed')
            : this.tr('ui.modal.world_end.claim', {}, 'Claim Rewards');
        const claimDisabled = isClaimed ? 'disabled style="opacity:0.5;cursor:default;"' : '';
        const modeLabel = this.getWorldRuleSetLabel(world.rewardPackage?.mode || this.getWorldRuleSetName());

        content.innerHTML = `
            <div class="flex flex-col items-center justify-center space-y-4 p-8">
                <div class="text-6xl">C</div>
                <div class="text-2xl font-bold text-yellow-300">${this.tr('ui.modal.world_end.completed', {}, 'World Objective Complete')}</div>
                <div class="text-white text-center">${reasonText}</div>
                <div class="text-xs text-gray-300">${this.tr('ui.modal.world_end.mode', { mode: modeLabel }, `Ruleset: ${modeLabel}`)}</div>
                <div class="text-xs text-gray-300">${this.tr('ui.modal.world_end.next', {}, 'Next season rule changes can now be applied.')}</div>
                <div class="border border-yellow-600 bg-black bg-opacity-50 p-4 rounded text-left w-full">
                    <div class="text-yellow-500 font-bold mb-2">${this.tr('ui.modal.world_end.rewards', {}, 'Season Rewards')}</div>
                    ${rewardRows}
                </div>
                <button class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-8 rounded shadow-lg transform hover:scale-105 transition" onclick="game.claimWorldEndRewards()" ${claimDisabled}>
                    ${claimLabel}
                </button>
                <button class="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-8 rounded shadow-lg transform hover:scale-105 transition" onclick="game.startNextSeason()">
                    ${this.tr('ui.modal.world_end.next_season', {}, 'Start Next Season')}
                </button>
                <button class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-8 rounded shadow-lg transform hover:scale-105 transition" onclick="game.closeModal()">
                    ${this.tr('ui.common.continue', {}, 'Continue')}
                </button>
            </div>
        `;
    }

    evaluateWorldEndCondition() {
        const world = this.ensureWorldState();
        world.score = this.getWorldScore();
        const endConditions = this.getActiveWorldEndConditions();
        if (!endConditions.enabled || world.ended) return false;

        const allowKingCastle = endConditions.type === 'king_castle_hold' || endConditions.type === 'hybrid';
        const allowScore = endConditions.type === 'score' || endConditions.type === 'hybrid';

        let reason = '';
        if (allowScore && world.score >= endConditions.targetScore) {
            reason = 'score';
        } else if (allowKingCastle) {
            const crown = this.ensureCrownState();
            const promotedAt = Number(crown.promotedAt || 0);
            if (crown.kingCastleKey && promotedAt > 0) {
                const heldMs = Date.now() - promotedAt;
                if (heldMs >= endConditions.targetHoldMs) {
                    reason = 'king_castle_hold';
                }
            }
        }
        if (!reason) return false;

        world.ended = true;
        world.winner = 'player';
        world.reason = reason;
        world.endedAt = Date.now();
        world.rewardPackage = this.buildWorldEndRewardPackage(reason, world.score);
        world.rewardsClaimed = false;

        if (reason === 'score') {
            this.showToast(this.tr('toast.world_end_score', { score: world.score }, `World complete by score (${world.score})`));
        } else {
            this.showToast(this.tr('toast.world_end_king_castle', {}, 'World complete by King Castle hold'));
        }
        this.pushEffectLog(this.tr('ui.field.effect.world_end', {}, 'World objective complete'));
        this.showWorldEndModal(reason);
        return true;
    }

    ensureCrownState() {
        if (!this.crownState || typeof this.crownState !== 'object') {
            this.crownState = { holderKey: null, capturedAt: 0, kingCastleKey: null, promotedAt: 0 };
        }
        if (!Object.prototype.hasOwnProperty.call(this.crownState, 'holderKey')) this.crownState.holderKey = null;
        if (!Object.prototype.hasOwnProperty.call(this.crownState, 'capturedAt')) this.crownState.capturedAt = 0;
        if (!Object.prototype.hasOwnProperty.call(this.crownState, 'kingCastleKey')) this.crownState.kingCastleKey = null;
        if (!Object.prototype.hasOwnProperty.call(this.crownState, 'promotedAt')) this.crownState.promotedAt = 0;
        return this.crownState;
    }

    isKingCastleTile(r, c) {
        const state = this.ensureCrownState();
        return state.kingCastleKey === `${r},${c}`;
    }

    getOwnedCitadelEntries() {
        const out = [];
        this.occupiedTiles.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const type = FIELD_MAP_DATA?.[r]?.[c];
            if (!isCitadelTile(type)) return;
            out.push({
                key,
                r,
                c,
                type,
                level: this.getFieldLevel(type) || 1
            });
        });
        return out;
    }

    pickKingCastleKey(candidates, preferredKey = null) {
        if (!Array.isArray(candidates) || !candidates.length) return null;
        if (preferredKey) {
            const found = candidates.find(entry => entry.key === preferredKey);
            if (found) return found.key;
        }
        const center = (MAP_SIZE - 1) / 2;
        const sorted = [...candidates].sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            const da = Math.abs(a.r - center) + Math.abs(a.c - center);
            const db = Math.abs(b.r - center) + Math.abs(b.c - center);
            return da - db;
        });
        return sorted[0]?.key || null;
    }

    onCrownCaptured(r, c) {
        const state = this.ensureCrownState();
        const key = `${r},${c}`;
        state.holderKey = key;
        state.capturedAt = Date.now();
        state.kingCastleKey = null;
        state.promotedAt = 0;

        const holdMin = Math.max(1, Math.round(CROWN_HOLD_MS / 60000));
        this.showToast(this.tr('toast.crown_captured', { minutes: holdMin }, `Crown captured! Hold for ${holdMin}m to build King Castle.`));
        this.pushEffectLog(this.tr('ui.field.effect.crown_captured', { minutes: holdMin }, `Crown captured (${holdMin}m hold started)`));
    }

    ensureCrownEventSpawned() {
        const state = this.ensureCrownState();
        if (state.holderKey || state.kingCastleKey) return false;

        const hasCrownEvent = Object.values(this.fieldEvents || {}).some(evt => evt && evt.type === FIELD_EVENT_TYPES.CROWN);
        if (hasCrownEvent) return false;

        const candidates = [];
        for (let r = 0; r < MAP_SIZE; r++) {
            for (let c = 0; c < MAP_SIZE; c++) {
                const terrain = FIELD_MAP_DATA?.[r]?.[c];
                if (terrain === undefined) continue;
                if (terrain === 0) continue;
                if (isBlockingField(terrain)) continue;
                if (isBorderTerrain(terrain)) continue;
                if (Math.abs(r - PLAYER_START.r) < 3 && Math.abs(c - PLAYER_START.c) < 3) continue;
                const key = `${r},${c}`;
                if (this.fieldEvents[key]) continue;
                if (this.occupiedTiles.has(key)) continue;
                candidates.push({ key, r, c });
            }
        }
        if (!candidates.length) return false;

        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        this.fieldEvents[picked.key] = {
            type: FIELD_EVENT_TYPES.CROWN,
            id: `crown_${picked.r}_${picked.c}_${Date.now()}`,
            r: picked.r,
            c: picked.c,
            captureAfterWin: true
        };
        return true;
    }

    syncCrownEventState() {
        const state = this.ensureCrownState();
        const hasOwnership = !!state.holderKey || !!state.kingCastleKey;
        if (hasOwnership) {
            Object.keys(this.fieldEvents || {}).forEach(key => {
                const evt = this.fieldEvents[key];
                if (evt && evt.type === FIELD_EVENT_TYPES.CROWN) delete this.fieldEvents[key];
            });
            return;
        }
        this.ensureCrownEventSpawned();
    }

    updateCrownAndCastleState() {
        const state = this.ensureCrownState();
        let changed = false;

        if (state.kingCastleKey && !this.occupiedTiles.has(state.kingCastleKey)) {
            state.holderKey = null;
            state.capturedAt = 0;
            state.kingCastleKey = null;
            state.promotedAt = 0;
            this.showToast(this.tr('toast.king_castle_lost', {}, 'King Castle lost. Crown has returned to the field.'));
            this.pushEffectLog(this.tr('ui.field.effect.king_castle_lost', {}, 'King Castle lost'));
            changed = true;
        } else if (state.holderKey && !this.occupiedTiles.has(state.holderKey)) {
            state.holderKey = null;
            state.capturedAt = 0;
            state.kingCastleKey = null;
            state.promotedAt = 0;
            this.showToast(this.tr('toast.crown_lost', {}, 'Crown control lost.'));
            changed = true;
        }

        if (!state.holderKey) {
            if (this.ensureCrownEventSpawned()) {
                this.showToast(this.tr('toast.crown_spawned', {}, 'A Crown appeared on the field.'));
                changed = true;
            }
            return changed;
        }

        if (!state.kingCastleKey) {
            const heldMs = Date.now() - Number(state.capturedAt || 0);
            if (heldMs >= CROWN_HOLD_MS) {
                const citadels = this.getOwnedCitadelEntries();
                if (citadels.length > 0) {
                    const promotedKey = this.pickKingCastleKey(citadels, state.holderKey);
                    if (promotedKey) {
                        state.holderKey = promotedKey;
                        state.kingCastleKey = promotedKey;
                        state.promotedAt = Date.now();
                        this.showToast(this.tr('toast.king_castle_established', {}, 'King Castle established!'));
                        this.pushEffectLog(this.tr('ui.field.effect.king_castle_established', {}, 'King Castle established'));
                        changed = true;
                    }
                }
            }
        }

        return changed;
    }

    getRebellionCandidates() {
        const out = [];
        this.occupiedTiles.forEach(key => {
            if (key === `${PLAYER_START.r},${PLAYER_START.c}`) return;
            const [r, c] = key.split(',').map(Number);
            const type = FIELD_MAP_DATA?.[r]?.[c];
            if (isGateTile(type) || isCitadelTile(type)) out.push({ key, r, c, type });
        });
        return out;
    }

    triggerRebellionAt(candidate, reason = 'random') {
        if (!candidate) return false;
        const { key, r, c, type } = candidate;
        if (this.fieldEvents[key]) return false;
        if (!this.occupiedTiles.has(key)) return false;

        this.occupiedTiles.delete(key);
        if (!this.rebellionState || typeof this.rebellionState !== 'object') this.rebellionState = { lastByKey: {} };
        if (!this.rebellionState.lastByKey || typeof this.rebellionState.lastByKey !== 'object') this.rebellionState.lastByKey = {};
        this.rebellionState.lastByKey[key] = Date.now();

        this.fieldEvents[key] = {
            type: isCitadelTile(type) ? FIELD_EVENT_TYPES.BANDIT_LEADER : FIELD_EVENT_TYPES.BANDIT,
            id: `rebellion_${r}_${c}_${Date.now()}`,
            r,
            c,
            rebellion: true,
            reason,
            captureAfterWin: true
        };

        const targetName = this.isKingCastleTile(r, c)
            ? this.tr('ui.field.object.king_castle', {}, 'King Castle')
            : this.objectTypeNameByCode(type);
        if (reason === 'unpaid') {
            this.showToast(this.tr('toast.rebellion_unpaid', { name: targetName }, `Rebellion! Upkeep unpaid at ${targetName}`));
        } else {
            this.showToast(this.tr('toast.rebellion_random', { name: targetName }, `Rebellion at ${targetName}`));
        }
        this.pushEffectLog(this.tr('ui.field.effect.rebellion', { name: targetName }, `Rebellion: ${targetName}`));

        this.recalcFieldBonuses();
        this.updateOpenBorders();
        this.requestRender();
        return true;
    }

    maybeTriggerRebellion({ unpaid = false, totalUpkeep = 0, totalTax = 0 } = {}) {
        const worldRule = this.getWorldRuleSet();
        if (!worldRule.allowRebellion) return false;

        const candidates = this.getRebellionCandidates();
        if (!candidates.length) return false;

        const now = Date.now();
        if (!this.rebellionState || typeof this.rebellionState !== 'object') this.rebellionState = { lastByKey: {} };
        if (!this.rebellionState.lastByKey || typeof this.rebellionState.lastByKey !== 'object') this.rebellionState.lastByKey = {};

        const eligible = candidates.filter(c => {
            const last = Number(this.rebellionState.lastByKey[c.key] || 0);
            return now - last >= REBELLION_COOLDOWN_MS;
        });
        if (!eligible.length) return false;

        const randomMultiplier = Number.isFinite(Number(worldRule.rebellionRandomMultiplier))
            ? Math.max(0, Number(worldRule.rebellionRandomMultiplier))
            : 1;
        const unpaidMultiplier = Number.isFinite(Number(worldRule.rebellionUnpaidMultiplier))
            ? Math.max(0, Number(worldRule.rebellionUnpaidMultiplier))
            : 1;

        let chance = REBELLION_RANDOM_CHANCE * randomMultiplier;
        if (unpaid) {
            const deficitBase = Math.max(0, totalUpkeep - Math.max(0, this.gold + totalTax));
            const ratio = totalUpkeep > 0 ? Math.min(1, deficitBase / totalUpkeep) : 1;
            chance = Math.max(
                REBELLION_UNPAID_CHANCE * (0.5 + ratio * 0.5) * unpaidMultiplier,
                REBELLION_RANDOM_CHANCE * randomMultiplier
            );
        }
        chance = Math.min(1, Math.max(0, chance));

        if (Math.random() >= chance) return false;
        const pick = eligible[Math.floor(Math.random() * eligible.length)];
        return this.triggerRebellionAt(pick, unpaid ? 'unpaid' : 'random');
    }
    getTileMoveTime(type, r, c) {
        // Supports legacy field object IDs (0-6) and terrain IDs (100-599).
        if (isGateTile(type) || isCitadelTile(type)) return 5;
        if (isDragonTile(type)) return 6;
        if (type === 4) return 1; // Road

        let evalType = type;
        if (!isTerrainCode(type) && typeof r === "number" && typeof c === "number") {
            const base = FIELD_TERRAIN_DATA?.[r]?.[c];
            if (isTerrainCode(base)) evalType = base;
        }
        if (isTerrainCode(evalType)) {
            const base = getTerrainBase(evalType);
            if (base === 100) return 3; // Plains
            if (base === 200) return 5; // Forest
            if (base === 300) return 4; // Hill
            if (base === 400) return 5; // Mountain
            if (base === 500) return 6; // Water
            return 3;
        }
        return 3; // Default fallback
    }

    getTerrainBaseNameLocalized(code) {
        const base = getTerrainBase(code);
        if (base === 100) return this.tr('ui.field.terrain.plains', {}, 'Plains');
        if (base === 200) return this.tr('ui.field.terrain.forest', {}, 'Forest');
        if (base === 300) return this.tr('ui.field.terrain.highland', {}, 'Highland');
        if (base === 400) return this.tr('ui.field.terrain.swamp', {}, 'Swamp');
        if (base === 500) return this.tr('ui.field.terrain.volcano', {}, 'Volcano');
        return this.tr('ui.field.terrain.default', {}, 'Terrain');
    }

    getTerrainNameLocalized(code) {
        const baseName = this.getTerrainBaseNameLocalized(code);
        if (code % 100 === 1) {
            return this.tr('ui.field.terrain.border', { name: baseName }, `${baseName} Border`);
        }
        return baseName;
    }

    objectTypeNameByCode(type) {
        if (type === 4) return this.tr('ui.field.object.road', {}, 'Road');
        if (isWallTile(type)) return this.tr('ui.field.object.wall', {}, 'Wall');
        if (isTerrainCode(type)) return this.getTerrainNameLocalized(type);

        const kind = getFieldObjectKind(type);
        if (kind === "castle") return this.tr('ui.field.object.castle', {}, 'Castle');
        if (kind === "gate") return this.tr('ui.field.object.gate', {}, 'Gate');
        if (kind === "citadel") return this.tr('ui.field.object.citadel', {}, 'Citadel');
        if (kind === "dragon") return this.tr('ui.field.object.dragon', {}, 'Dragon');
        if (kind === "goldmine") return this.tr('ui.field.object.goldmine', {}, 'Gold Mine');
        if (kind === "fountain") return this.tr('ui.field.object.fountain', {}, 'Fountain');
        if (kind === "shop") return this.tr('ui.field.object.shop', {}, 'Shop');
        if (kind === "tavern") return this.tr('ui.field.object.tavern', {}, 'Tavern');
        if (kind === "ruins") return this.tr('ui.field.object.ruins', {}, 'Ruins');
        if (kind && kind.startsWith("statue")) return this.tr('ui.field.object.statue', {}, 'Statue');

        return this.tr('ui.field.object.unknown', {}, 'Unknown');
    }

    getTileMoveMeta(type, r, c) {
        let name = this.tr('ui.field.terrain.default', {}, 'Terrain');
        if (type === 4 || isGateTile(type) || isCitadelTile(type) || isDragonTile(type)) {
            name = this.objectTypeNameByCode(type);
        } else {
            let evalType = type;
            if (!isTerrainCode(type) && typeof r === "number" && typeof c === "number") {
                const base = FIELD_TERRAIN_DATA?.[r]?.[c];
                if (isTerrainCode(base)) evalType = base;
            }
            if (isTerrainCode(evalType)) name = this.getTerrainBaseNameLocalized(evalType);
        }
        return { name, min: this.getTileMoveTime(type, r, c) };
    }
    getPathTimeMin(path, speedFactor = 1) {
        if (!path || path.length <= 1) return 0;
        let total = 0;
        for (let i = 1; i < path.length; i++) {
            const step = path[i];
            const tileType = FIELD_MAP_DATA[step.r][step.c];
            total += this.getTileMoveTime(tileType, step.r, step.c);
        }
        return total * speedFactor;
    }
    getPathSummary(path, speedFactor = 1) {
        if (!path || path.length <= 1) return { dist: 0, baseMin: 0, finalMin: 0, breakdown: "" };
        const counts = {};
        let total = 0;
        for (let i = 1; i < path.length; i++) {
            const step = path[i];
            const tileType = FIELD_MAP_DATA[step.r][step.c];
            const meta = this.getTileMoveMeta(tileType, step.r, step.c);
            total += meta.min;
            counts[meta.name] = (counts[meta.name] || 0) + 1;
        }
        const breakdown = Object.keys(counts).map(k => `${k}${counts[k]}`).join(" ");
        return { dist: path.length - 1, baseMin: total, finalMin: total * speedFactor, breakdown };
    }
    buildStepTimes(path, speedFactor = 1) {
        if (!path || path.length <= 1) return [];
        const times = [0];
        for (let i = 1; i < path.length; i++) {
            const step = path[i];
            const tileType = FIELD_MAP_DATA[step.r][step.c];
            const mins = this.getTileMoveTime(tileType, step.r, step.c) * speedFactor;
            times[i] = Math.max(30, Math.floor(mins * MOVE_MS_PER_MIN));
        }
        return times;
    }
    collectTerritoryIncome() {
        const crownChanged = this.updateCrownAndCastleState();
        const worldEnded = this.evaluateWorldEndCondition();
        if (this.occupiedTiles.size > 0) {
            let totalTax = 0;
            let totalUpkeep = 0;
            let totalHourlyGold = 0;
            this.occupiedTiles.forEach(key => {
                const [r, c] = key.split(',').map(Number);
                const type = FIELD_MAP_DATA[r][c];
                if (isShopTile(type) || isTavernTile(type)) {
                    totalHourlyGold += this.getFacilityHourlyGoldIncome(type);
                } else {
                    totalTax += this.getTaxRate(type);
                }
                totalUpkeep += this.getUpkeepCost(type);
            });
            const baseNet = totalTax - totalUpkeep;
            const hourlyPerTick = totalHourlyGold / 1200; // 3s tick = 1200 ticks/hour
            this.hourlyIncomeRemainder = (this.hourlyIncomeRemainder || 0) + hourlyPerTick;
            const facilityGain = Math.floor(this.hourlyIncomeRemainder);
            if (facilityGain > 0) this.hourlyIncomeRemainder -= facilityGain;
            const net = baseNet + facilityGain;
            const unpaid = totalUpkeep > Math.max(0, this.gold + Math.max(0, totalTax) + Math.max(0, facilityGain));
            this.income = Math.round((baseNet + hourlyPerTick) * 100) / 100;
            this.gold += net;
            const rebellionTriggered = this.maybeTriggerRebellion({ unpaid, totalUpkeep, totalTax });
            this.updateUI();
            if (net !== 0 && document.getElementById('field-modal').classList.contains('open')) {
                const sign = net >= 0 ? "+" : "";
                this.showFloatingText(`${sign}${net} G (Tax)`, this.width / 2, this.height / 4, net >= 0 ? '#ffd700' : '#f87171');
            }
            if (crownChanged && document.getElementById('field-modal').classList.contains('open')) {
                if (!this.refreshFieldMapVisuals()) {
                    this.renderFieldMap();
                } else if (this.currentFieldTargetKey) {
                    const [tr, tc] = this.currentFieldTargetKey.split(',').map(Number);
                    if (!Number.isNaN(tr) && !Number.isNaN(tc)) {
                        const eventAtTarget = this.fieldEvents?.[`${tr},${tc}`];
                        this.setFieldInfo(eventAtTarget ? eventAtTarget.type : FIELD_MAP_DATA[tr][tc], tr, tc);
                    }
                }
            }
            if (rebellionTriggered || crownChanged || worldEnded) this.saveGame();
        } else {
            this.income = 0;
            this.hourlyIncomeRemainder = 0;
            if (crownChanged || worldEnded) this.saveGame();
        }
    }
    calcLayout() {
        const gw = this.width - (CONFIG.gridPadding * 2); this.gridTileSize = Math.floor(gw / CONFIG.gridCols);
        this.gridStartX = CONFIG.gridPadding; this.gridStartY = CONFIG.gridTopY;
        const useThird = this.thirdSquadUnlocked;
        const squadSize = useThird ? CONFIG.squadCellSize3 : CONFIG.squadCellSize;
        const squadGap = useThird ? CONFIG.squadGap3 : CONFIG.squadGap;
        this.squadCellSize = squadSize;
        const sw = this.squadCellSize * 3;
        const squadCount = useThird ? 3 : 2;
        const totalSw = (sw * squadCount) + (squadGap * (squadCount - 1));
        const sx = Math.floor((this.width - totalSw) / 2);
        this.squad1Rect = { x: sx, y: CONFIG.squadTopY, w: sw, h: sw };
        this.squad2Rect = { x: sx + sw + squadGap, y: CONFIG.squadTopY, w: sw, h: sw };
        if (useThird) {
            this.squad3Rect = { x: sx + (sw + squadGap) * 2, y: CONFIG.squadTopY, w: sw, h: sw };
        } else {
            this.squad3Rect = null;
        }
    }
    initGame() {
        this.refreshLockState(); this.grid[3][3] = { type: ITEM_TYPE.BUILDING_BARRACKS, level: 1, scale: 1 };
        this.grid[4][4] = { type: ITEM_TYPE.BUILDING_CHEST, level: 1, scale: 1, usage: 5 };
        this.grid[5][5] = { type: ITEM_TYPE.BUILDING_CAMP, level: 1, scale: 1, storedUnits: [] }; // Added storedUnits
        this.grid[5][5] = { type: ITEM_TYPE.BUILDING_CAMP, level: 1, scale: 1, storedUnits: [] }; // Added storedUnits
        this.updateLevelStats();
        this.updateInfoPanel(); // Ensure panel is visible on init
    }
    refreshLockState() {
        for (let r = 0; r < CONFIG.gridRows; r++) for (let c = 0; c < CONFIG.gridCols; c++) {
            if (this.gridState[r][c] && this.gridState[r][c].type === LOCK_TYPE.OPEN) continue;
            const lvlReq = UNLOCK_LEVEL_MAP[r][c], goldReq = UNLOCK_GOLD_MAP[r][c];
            if (this.lordLevel < lvlReq) this.gridState[r][c] = { type: LOCK_TYPE.LEVEL, value: lvlReq };
            else if (goldReq > 0) this.gridState[r][c] = { type: LOCK_TYPE.GOLD, value: goldReq };
            else this.gridState[r][c] = { type: LOCK_TYPE.OPEN };
        }
        this.requestRender();
    }
    openCaravanShop(r, c) {
        if (this.guardWorldAction(this.tr('ui.field.action.caravan', {}, 'Caravan'))) return;
        const rr = Number.isFinite(Number(r)) ? Number(r) : -1;
        const cc = Number.isFinite(Number(c)) ? Number(c) : -1;
        const key = `caravan:${rr},${cc}`;
        const state = this.fieldShopState[key] || { lastRefresh: Date.now(), items: [] };
        const interval = 3 * 60 * 60 * 1000;
        const now = Date.now();
        if (now - state.lastRefresh >= interval || !state.items || state.items.length === 0) {
            state.lastRefresh = now;
            state.items = this.buildShopCatalog(FIELD_EVENT_TYPES.CARAVAN).map(item => ({ ...item, sold: false, restock: false }));
        }
        this.fieldShopState[key] = state;
        this.currentShopContext = { type: FIELD_EVENT_TYPES.CARAVAN, r: rr, c: cc, key };
        this.renderShopModal(FIELD_EVENT_TYPES.CARAVAN, rr, cc, state);
    }

    getPortalDestination(fromR, fromC) {
        const portals = Object.values(this.fieldEvents || {})
            .filter(evt => evt && evt.type === FIELD_EVENT_TYPES.PORTAL)
            .sort((a, b) => (a.r - b.r) || (a.c - b.c));
        if (portals.length <= 1) return null;
        const idx = portals.findIndex(evt => evt.r === fromR && evt.c === fromC);
        if (idx === -1) return portals[0];
        return portals[(idx + 1) % portals.length];
    }

    getRandomPortalFallback() {
        let attempts = 0;
        while (attempts < 100) {
            const r = Math.floor(Math.random() * MAP_SIZE);
            const c = Math.floor(Math.random() * MAP_SIZE);
            const terrain = FIELD_MAP_DATA?.[r]?.[c];
            if (terrain !== 0 && !isBorderTerrain(terrain)) return { r, c };
            attempts++;
        }
        return null;
    }

    getPortalActorArmy(preferredArmyId = null) {
        if (preferredArmyId !== null && preferredArmyId !== undefined) {
            const byId = this.armies.find(a => a && a.id === preferredArmyId);
            if (byId) return byId;
        }
        if (this.selectedArmyId !== null && this.selectedArmyId !== undefined) {
            const selected = this.armies[this.selectedArmyId];
            if (selected) return selected;
        }
        return this.armies.find(a => a && a.state === 'IDLE') || null;
    }

    openPortalModal(r, c, preferredArmyId = null) {
        if (this.guardWorldAction(this.tr('ui.field.action.portal', {}, 'Portal'))) return;
        const cpCost = Math.max(0, Number(PORTAL_CP_COST || 0));
        if (this.cp < cpCost) {
            this.showToast(this.tr('toast.cp_short_cost', { cost: cpCost }, `Not enough CP (${cpCost})`));
            return;
        }

        const destination = this.getPortalDestination(r, c);
        const fallback = destination ? null : this.getRandomPortalFallback();
        const target = destination || fallback;
        if (!target) {
            this.showToast(this.tr('toast.portal_unavailable', {}, 'Portal destination unavailable'));
            return;
        }

        const confirmText = destination
            ? this.tr(
                'ui.modal.portal_confirm_target',
                { row: target.r + 1, col: target.c + 1, cost: cpCost },
                `Use portal (CP ${cpCost}) and move to (${target.r + 1}, ${target.c + 1})?`
            )
            : this.tr(
                'ui.modal.portal_confirm_random_cost',
                { cost: cpCost },
                `Use portal (CP ${cpCost}) and move to a random position?`
            );
        if (!window.confirm(confirmText)) return;

        const army = this.getPortalActorArmy(preferredArmyId);
        if (!army) {
            this.showToast(this.tr('toast.select_army_first', {}, 'Select an army first from the top.'));
            return;
        }
        if (army.state !== 'IDLE') {
            this.showToast(this.tr('toast.army_moving', {}, 'Army is already moving.'));
            return;
        }

        this.cp -= cpCost;
        army.r = target.r;
        army.c = target.c;
        army.target = null;
        army.path = [];
        this.revealFog(target.r, target.c, FOG_RADIUS);
        this.updateUI();
        this.updateArmies();
        this.renderFieldMap();
        this.saveGame();
        this.showToast(this.tr('toast.portal_activated', {}, 'Portal activated!'));
    }

    showVictoryModal(dragonKillSummary = null) {
        const modal = document.getElementById('field-modal'); const content = document.getElementById('modal-content'); const title = document.getElementById('modal-title');
        title.innerText = this.tr('ui.modal.victory_title', {}, 'Victory!');
        modal.hidden = false;
        modal.classList.add('open');
        modal.dataset.mode = 'victory';

        const fallbackReward = { gold: 10000, gem: 0, energy: 0, cp: 0, points: 0 };
        const reward = dragonKillSummary?.reward || fallbackReward;
        const tier = String(dragonKillSummary?.tier || 'S');
        const shareText = dragonKillSummary
            ? `${Math.round(Math.max(0, Math.min(1, Number(dragonKillSummary.contributionShare) || 0)) * 100)}%`
            : '100%';
        const rankText = dragonKillSummary
            ? `${dragonKillSummary.rank || 1}`
            : '1';

        content.innerHTML = `
            <div class="flex flex-col items-center justify-center space-y-4 p-8">
                <div class="text-6xl animate-bounce">V</div>
                <div class="text-2xl font-bold text-yellow-300">${this.tr('ui.modal.victory.boss_cleared', {}, 'Boss Raid Cleared!')}</div>
                <div class="text-white text-center">
                    ${this.tr('ui.modal.victory.desc_line1', {}, 'Peace returns to the region.')}<br>
                    ${this.tr('ui.modal.victory.desc_line2', {}, 'New threats may appear soon.')}
                </div>
                <div class="border border-yellow-600 bg-black bg-opacity-50 p-4 rounded text-center w-full">
                    <div class="text-yellow-500 font-bold mb-2">${this.tr('ui.modal.victory.rewards', {}, 'Rewards')}</div>
                    <div class="text-sm">${this.tr('ui.modal.victory.reward_tier', { tier }, `Contribution Tier: ${tier}`)}</div>
                    <div class="text-sm">${this.tr('ui.modal.victory.reward_share', { value: shareText }, `Contribution Share: ${shareText}`)}</div>
                    <div class="text-sm">${this.tr('ui.modal.victory.reward_rank', { value: rankText }, `Contribution Rank: #${rankText}`)}</div>
                    <div class="text-sm">${this.tr('ui.modal.victory.reward_gold_dynamic', { value: reward.gold }, `Gold +${reward.gold}`)}</div>
                    <div class="text-sm">${this.tr('ui.modal.victory.reward_gem_dynamic', { value: reward.gem }, `GEM +${reward.gem}`)}</div>
                    <div class="text-sm">${this.tr('ui.modal.victory.reward_energy_dynamic', { value: reward.energy }, `Energy +${reward.energy}`)}</div>
                    <div class="text-sm">${this.tr('ui.modal.victory.reward_cp_dynamic', { value: reward.cp }, `CP +${reward.cp}`)}</div>
                    <div class="text-sm">${this.tr('ui.modal.victory.reward_points_dynamic', { value: reward.points }, `PT +${reward.points}`)}</div>
                </div>
                <button class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-8 rounded shadow-lg transform hover:scale-105 transition" onclick="game.closeModal()">
                    ${this.tr('ui.common.continue', {}, 'Continue')}
                </button>
            </div>
        `;

        if (!dragonKillSummary) {
            this.applyDragonBossReward(fallbackReward);
        }
        this.updateUI();
        this.saveGame();

        // Fireworks Loop
        let fireworks = 0;
        const interval = setInterval(() => {
            if (fireworks++ > 10 || !modal.classList.contains('open')) clearInterval(interval);
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            this.spawnParticles(x, y, `hsl(${Math.random() * 360}, 100%, 50%)`, 30, "confetti");
        }, 500);
    }

    toggleShop() {
        const modal = document.getElementById('field-modal'); const content = document.getElementById('modal-content'); const title = document.getElementById('modal-title');
        title.innerText = this.tr('ui.modal.shop_title', {}, 'Build Shop'); content.innerHTML = "";
        if (modal.classList.contains('open') && modal.dataset.mode === 'shop') { this.closeModal(); return; }
        modal.hidden = false;
        modal.dataset.mode = 'shop'; modal.classList.add('open');
        const grid = document.createElement('div'); grid.className = 'shop-grid';
        SHOP_DATA.forEach(item => {
            const div = document.createElement('div'); div.className = 'shop-item';
            div.innerHTML = `<div class="text-2xl">${item.icon}</div><div class="font-bold text-sm text-white">${item.name}</div><button class="bg-yellow-600 text-white px-3 py-1 mt-2 rounded font-bold text-xs" onclick="game.buyBuilding(${item.type}, ${item.price})">G ${item.price}</button>`;
            grid.appendChild(div);
        });
        content.appendChild(grid);
    }
    toggleField(opts = {}) {
        const modal = document.getElementById('field-modal');
        if (modal.classList.contains('open') && modal.dataset.mode === 'field') { this.closeModal(); return; }
        const preferredArmyId = this.getPreferredFieldArmyId();
        if (preferredArmyId === null) {
            this.showToast(this.tr('toast.field_need_squad', {}, 'Deploy at least one squad before entering the field.'));
            this.sound.playError();
            return;
        }
        const skipLobby = !!opts.skipLobby;
        const lobby = this.ensureWorldLobbyState();
        if (!skipLobby && !lobby.entered) {
            this.openWorldLobbyModal();
            return;
        }
        this.exitMoveTargetMode();
        this.selectedArmyId = preferredArmyId;
        this.lastSelectedArmyId = preferredArmyId;
        this.camera = null;
        this.renderFieldMap();
    }

    initFieldMap() {
        // Initialize field specific data if needed
        // Currently FIELD_MAP_DATA is static, but we might want to deep copy if we modify it
        console.log("Field Map Initialized");
    }

    populateFieldEvents() {
        // Simple random spawner
        // Skip if already populated (e.g. load game) - TODO: Check save data
        if (Object.keys(this.fieldEvents).length > 0) return;

        for (let r = 0; r < MAP_SIZE; r++) {
            for (let c = 0; c < MAP_SIZE; c++) {
                const terrain = FIELD_MAP_DATA[r][c];
                // Skip non-walkable or already occupied logic
                if (terrain === 0) continue; // Explicit Wall Skip
                if (isBlockingField(terrain)) continue; // Skip Walls, Gates, etc.
                if (isBorderTerrain(terrain)) continue; // Skip Border
                // Skip Player Start area
                if (Math.abs(r - PLAYER_START.r) < 3 && Math.abs(c - PLAYER_START.c) < 3) continue;

                // Roll for events
                const rand = Math.random() * 1000;
                let cumulative = 0;

                for (const [type, rate] of Object.entries(FIELD_EVENT_RATES)) {
                    cumulative += rate;
                    if (rand < cumulative) {
                        this.fieldEvents[`${r},${c}`] = {
                            type: parseInt(type),
                            id: `evt_${r}_${c}`,
                            r, c
                        };
                        break;
                    }
                }
            }
        }
        this.ensureCrownEventSpawned();
        console.log(`Generated ${Object.keys(this.fieldEvents).length} field events.`);
    }

    getFieldDefenders(type) {
        if (type === FIELD_EVENT_TYPES.CROWN) {
            return [
                { code: ITEM_TYPE.UNIT_CAVALRY, count: 20, slot: 4 },
                { code: ITEM_TYPE.UNIT_INFANTRY, count: 35, slot: 1 },
                { code: ITEM_TYPE.UNIT_ARCHER, count: 35, slot: 7 }
            ];
        }

        if (type === FIELD_EVENT_TYPES.DUNGEON) {
            return [
                { code: ITEM_TYPE.UNIT_CAVALRY, count: 30, slot: 4 },
                { code: ITEM_TYPE.UNIT_INFANTRY, count: 50, slot: 1 },
                { code: ITEM_TYPE.UNIT_ARCHER, count: 50, slot: 7 }
            ];
        }

        if (type === FIELD_EVENT_TYPES.BANDIT) {
            return [
                { code: ITEM_TYPE.UNIT_INFANTRY, count: 10, slot: 4 },
                { code: ITEM_TYPE.UNIT_ARCHER, count: 5, slot: 1 }
            ];
        }

        if (type === FIELD_EVENT_TYPES.BANDIT_LEADER) {
            return [
                { code: ITEM_TYPE.UNIT_CAVALRY, count: 10, slot: 4 },
                { code: ITEM_TYPE.UNIT_INFANTRY, count: 20, slot: 1 },
                { code: ITEM_TYPE.UNIT_ARCHER, count: 20, slot: 7 }
            ];
        }

        // --- BOSS ---
        if (isDragonTile(type)) {
            return [{ code: ITEM_TYPE.UNIT_DRAGON, count: 1, slot: 4 }];
        }

        // Legacy / Standard
        return [];
    }

    getDefendersForTile(type, r, c) {
        const data = this.getFieldObjectData(type);
        const base = data && Array.isArray(data.defenders) ? this.cloneDefenders(data.defenders) : [];
        if (r === undefined || c === undefined) return base;
        const key = `${r},${c}`;
        const state = this.fieldDefenderState?.[key];
        if (state && state.type === type && Array.isArray(state.defenders)) {
            return this.cloneDefenders(state.defenders);
        }
        return base;
    }

    revealFog(r, c, radius = FOG_RADIUS) {
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                const nr = r + i, nc = c + j;
                if (nr >= 0 && nr < MAP_SIZE && nc >= 0 && nc < MAP_SIZE) {
                    const key = `${nr},${nc}`;
                    if (!this.visibilityMap.has(key)) {
                        this.visibilityMap.add(key);
                        const cell = document.getElementById(`field-cell-${nr}-${nc}`);
                        if (cell) {
                            cell.classList.remove('field-fog');
                            if (!cell.classList.contains('field-occupied') && !cell.classList.contains('field-adjacent')) cell.style.opacity = 0.3;
                            else if (cell.classList.contains('field-adjacent')) cell.style.opacity = 0.6;
                        }
                    }
                }
            }
        }
    }

    setMovePreview(text) {
        this.movePreviewText = text || "";
        const el = document.getElementById('field-move-info');
        if (el) {
            if (this.movePreviewText) {
                el.style.display = 'flex';
                el.innerText = this.movePreviewText;
            } else {
                el.style.display = 'none';
            }
        }
        this.updateFloatingPanelPositionFromSelection();
    }

    openObjectModal(title, bodyHtml) {
        const modal = document.getElementById('modal-object');
        const t = document.getElementById('object-modal-title');
        const b = document.getElementById('object-modal-body');
        if (!modal || !t || !b) return;
        modal.querySelector('.modal-content')?.classList.add('wide');
        modal.style.display = '';
        t.innerText = title;
        b.innerHTML = bodyHtml;
        modal.classList.add('open');
    }

    formatTimeLeft(ms) {
        if (ms <= 0) return "Ready";
        const totalMin = Math.ceil(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        if (h <= 0) return `${m}m`;
        return `${h}h ${m}m`;
    }

    formatDurationCompact(ms) {
        const sec = Math.max(0, Math.ceil(ms / 1000));
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    formatPercent(value) {
        return `${Math.round(value * 100)}%`;
    }

    getFieldObjectData(type) {
        // Field Events (Bandit, Dungeon, etc.)
        if (type === FIELD_EVENT_TYPES.BANDIT || type === FIELD_EVENT_TYPES.BANDIT_LEADER || type === FIELD_EVENT_TYPES.DUNGEON || type === FIELD_EVENT_TYPES.CROWN) {
            const defenders = this.getFieldDefenders(type);
            return {
                name: type === FIELD_EVENT_TYPES.BANDIT
                    ? this.tr('ui.field.event.bandit', {}, 'Bandit')
                    : (type === FIELD_EVENT_TYPES.BANDIT_LEADER
                        ? this.tr('ui.field.event.bandit_leader', {}, 'Bandit Leader')
                        : (type === FIELD_EVENT_TYPES.DUNGEON
                            ? this.tr('ui.field.event.dungeon', {}, 'Dungeon')
                            : this.tr('ui.field.event.crown', {}, 'Crown'))),
                level: type === FIELD_EVENT_TYPES.CROWN ? 7 : (type === FIELD_EVENT_TYPES.DUNGEON ? 5 : (type === FIELD_EVENT_TYPES.BANDIT_LEADER ? 3 : 1)),
                defenders: defenders,
                abilities: []
            };
        }

        const data = getFieldObjectDataByType(type);
        if (isDragonTile(type)) {
            const defenders = Array.isArray(data?.defenders) ? this.cloneDefenders(data.defenders) : [];
            if (!defenders.length) defenders.push({ code: ITEM_TYPE.UNIT_DRAGON, count: 1, slot: 4 });
            return {
                code: Number.isFinite(Number(data?.code)) ? Number(data.code) : type,
                name: data?.name || "Ancient Dragon",
                level: Number.isFinite(Number(data?.level)) ? Number(data.level) : 99,
                defenders,
                abilities: Array.isArray(data?.abilities) ? data.abilities : []
            };
        }

        if (data) return data;
        return null;
    }

    getAbilityValue(data, abilityCode) {
        if (!data || !data.abilities) return 0;
        const found = data.abilities.find(a => a.code === abilityCode);
        return found ? Number(found.value) : 0;
    }

    getFieldLevel(type) {
        const data = this.getFieldObjectData(type);
        if (data && data.level) return data.level;
        return getObjectLevelFromCode(type);
    }

    getStatueBuff(type) {
        const data = this.getFieldObjectData(type);
        if (data?.statue) return data.statue;
        const kind = getStatueKind(type);
        if (!kind) return null;
        const level = this.getFieldLevel(type);
        const value = STATUE_BUFF_FALLBACK[level] || 0;
        return value ? { kind, value } : null;
    }

    getRuinsBonus(type) {
        if (!isRuinsTile(type)) return null;
        const data = this.getFieldObjectData(type);
        if (!data) return null;
        const cpCap = this.getAbilityValue(data, ABILITY_CODES.CP_CAP);
        const cpRegen = this.getAbilityValue(data, ABILITY_CODES.CP_REGEN);
        if (!cpCap && !cpRegen) return null;
        return { level: data.level || this.getFieldLevel(type), cpCap, cpRegen };
    }

    getFieldResourceConfig(type) {
        const data = this.getFieldObjectData(type);
        if (!data) return null;
        const goldCap = this.getAbilityValue(data, ABILITY_CODES.GOLD_CAP);
        const goldRegen = this.getAbilityValue(data, ABILITY_CODES.GOLD_REGEN);
        if (goldCap || goldRegen) return { kind: "gold", cap: goldCap, regen5: goldRegen };
        const energyCap = this.getAbilityValue(data, ABILITY_CODES.ENERGY_CAP);
        const energyRegen = this.getAbilityValue(data, ABILITY_CODES.ENERGY_REGEN);
        if (energyCap || energyRegen) return { kind: "energy", cap: energyCap, regen5: energyRegen };
        return null;
    }

    getFieldResourceState(type, r, c) {
        const cfg = this.getFieldResourceConfig(type);
        if (!cfg) return null;
        const key = `${r},${c}`;
        const now = Date.now();
        const state = this.fieldResourceState[key] || { last: now, stored: 0 };
        const regenMs = cfg.regen5 / (5 * 60 * 1000);
        if (regenMs > 0) {
            const elapsed = now - state.last;
            if (elapsed > 0) {
                const gained = Math.floor(elapsed * regenMs);
                if (gained > 0) {
                    state.stored = Math.min(cfg.cap, state.stored + gained);
                    const consumedMs = gained / regenMs;
                    state.last = Math.min(now, state.last + consumedMs);
                }
            }
        }
        if (state.stored >= cfg.cap) {
            if (!state.capNotified) {
                state.capNotified = true;
                if (document.getElementById('field-modal').classList.contains('open')) {
                    const kind = cfg.kind === "gold"
                        ? this.tr('ui.field.object.goldmine', {}, 'Gold Mine')
                        : this.tr('ui.field.object.fountain', {}, 'Fountain');
                    this.showToast(this.tr('toast.storage_full', { kind }, `${kind} storage full`));
                }
            }
        } else {
            state.capNotified = false;
        }
        this.fieldResourceState[key] = state;
        return { key, state, cfg };
    }

    buildFieldRegions() {
        const regions = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(-1));
        let regionId = 0;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let r = 0; r < MAP_SIZE; r++) {
            for (let c = 0; c < MAP_SIZE; c++) {
                const type = FIELD_MAP_DATA[r][c];
                if (isWallTile(type) || isBorderTerrain(type) || isGateTile(type) || isCitadelTile(type) || isDragonTile(type)) continue;
                if (regions[r][c] !== -1) continue;
                const stack = [{ r, c }];
                regions[r][c] = regionId;
                while (stack.length) {
                    const cur = stack.pop();
                    for (const d of dirs) {
                        const nr = cur.r + d[0];
                        const nc = cur.c + d[1];
                        if (nr < 0 || nr >= MAP_SIZE || nc < 0 || nc >= MAP_SIZE) continue;
                        const ntype = FIELD_MAP_DATA[nr][nc];
                        if (isWallTile(ntype) || isBorderTerrain(ntype) || isGateTile(ntype) || isCitadelTile(ntype) || isDragonTile(ntype)) continue;
                        if (regions[nr][nc] !== -1) continue;
                        regions[nr][nc] = regionId;
                        stack.push({ r: nr, c: nc });
                    }
                }
                regionId += 1;
            }
        }
        this.fieldRegions = regions;
    }

    getRegionIdAt(r, c) {
        if (!this.fieldRegions || r < 0 || c < 0 || r >= MAP_SIZE || c >= MAP_SIZE) return -1;
        return this.fieldRegions[r][c];
    }

    getAdjacentRegionIds(r, c) {
        const ids = new Set();
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const d of dirs) {
            const nr = r + d[0];
            const nc = c + d[1];
            const id = this.getRegionIdAt(nr, nc);
            if (id !== -1) ids.add(id);
        }
        return ids;
    }

    getAdjacentRegionKey(r, c) {
        const ids = Array.from(this.getAdjacentRegionIds(r, c));
        if (ids.length === 0) return "";
        ids.sort((a, b) => a - b);
        return ids.join(",");
    }

    getArmyRegionId(army) {
        if (!army) return -1;
        const type = FIELD_MAP_DATA?.[army.r]?.[army.c];
        if (!isBorderTerrain(type)) {
            const id = this.getRegionIdAt(army.r, army.c);
            if (id !== -1) army.regionId = id;
            return id;
        }
        if (army.regionId !== undefined && army.regionId !== null) return army.regionId;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const d of dirs) {
            const nr = army.r + d[0];
            const nc = army.c + d[1];
            const id = this.getRegionIdAt(nr, nc);
            if (id !== -1) {
                army.regionId = id;
                return id;
            }
        }
        return -1;
    }

    updateOpenBorders() {
        const open = new Set();
        const visited = new Set();
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        const bfs = (sr, sc, adjKey) => {
            const stack = [{ r: sr, c: sc }];
            visited.add(`${sr},${sc}`);
            while (stack.length) {
                const cur = stack.pop();
                open.add(`${cur.r},${cur.c}`);
                for (const d of dirs) {
                    const nr = cur.r + d[0];
                    const nc = cur.c + d[1];
                    if (nr < 0 || nr >= MAP_SIZE || nc < 0 || nc >= MAP_SIZE) continue;
                    const nkey = `${nr},${nc}`;
                    if (visited.has(nkey)) continue;
                    if (!isBorderTerrain(FIELD_MAP_DATA[nr][nc])) continue;
                    const nAdjKey = this.getAdjacentRegionKey(nr, nc);
                    if (!nAdjKey || nAdjKey !== adjKey) continue;
                    visited.add(nkey);
                    stack.push({ r: nr, c: nc });
                }
            }
        };

        this.occupiedTiles.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const type = FIELD_MAP_DATA[r]?.[c];
            if (!isGateTile(type)) return;
            for (const d of dirs) {
                const nr = r + d[0];
                const nc = c + d[1];
                if (nr < 0 || nr >= MAP_SIZE || nc < 0 || nc >= MAP_SIZE) continue;
                if (!isBorderTerrain(FIELD_MAP_DATA[nr][nc])) continue;
                const nkey = `${nr},${nc}`;
                const adjKey = this.getAdjacentRegionKey(nr, nc);
                if (!adjKey) continue;
                if (!visited.has(nkey)) bfs(nr, nc, adjKey);
            }
        });

        this.openBorderTiles = open;
    }

    isBorderOpen(r, c) {
        return this.openBorderTiles?.has(`${r},${c}`);
    }

    isTileBlocked(current, r, c, type, isOccupied, isTarget, regionId) {
        if (isWallTile(type)) return true;
        if (isBorderTerrain(type)) {
            if (this.isBorderOpen(r, c)) return false;
            return true;
        }
        if (isOccupied || isTarget) return false;
        if (current && isBorderTerrain(FIELD_MAP_DATA[current.r][current.c])) {
            if (!this.isBorderOpen(current.r, current.c)) {
                const targetRegion = this.getRegionIdAt(r, c);
                if (regionId !== -1 && targetRegion !== -1 && targetRegion !== regionId) return true;
            }
        }
        if (this.isCapturableFieldObject(type)) return true;
        return false;
    }

    collectFieldResource(type, r, c) {
        if (this.guardWorldAction(this.tr('ui.info.collect', {}, 'Collect'))) return;
        const key = `${r},${c}`;
        if (!this.occupiedTiles.has(key)) { this.showToast(this.tr('toast.collect_after_capture', {}, 'Collectable after capture')); return; }
        const info = this.getFieldResourceState(type, r, c);
        if (!info || info.state.stored <= 0) { this.showToast(this.tr('toast.production_progress', {}, 'Production in progress')); return; }
        if (info.cfg.kind === "gold") {
            this.gold += info.state.stored;
            this.showToast(this.tr('toast.gold_gain', { value: info.state.stored }, `+${info.state.stored}G`));
        } else if (info.cfg.kind === "energy") {
            this.energy = Math.min(this.maxEnergy, this.energy + info.state.stored);
            this.showToast(this.tr('toast.energy_gain', { value: info.state.stored }, `+${info.state.stored}EN`));
        }
        info.state.stored = 0;
        info.state.capNotified = false;
        info.state.last = Date.now();
        this.fieldResourceState[key] = info.state;
        this.updateUI();
    }

    getCollectibleFieldItemInfo(type) {
        if (isTerrainCode(type)) return null;
        return getInfoFromCode(type);
    }

    createMergeItemFromInfo(info) {
        const item = { type: info.type, level: info.level, scale: 0 };
        if (item.type === ITEM_TYPE.BUILDING_CHEST) item.usage = 5;
        if (item.type === ITEM_TYPE.BUILDING_CAMP) item.storedUnits = [];
        return item;
    }

    removeObjectProbPlacement(r, c) {
        if (typeof window === 'undefined') return;
        const key = 'kov_field_object_prob_v1';
        let placements = null;
        try {
            const raw = localStorage.getItem(key);
            if (raw) placements = JSON.parse(raw);
        } catch (e) { }
        if (!Array.isArray(placements)) return;
        const next = placements.filter(p => !(p.r === r && p.c === c));
        if (next.length === placements.length) return;
        try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) { }
    }

    clearFieldObjectFromMap(r, c) {
        const base = FIELD_TERRAIN_DATA?.[r]?.[c];
        if (base !== undefined && base !== null) FIELD_MAP_DATA[r][c] = base;
        else FIELD_MAP_DATA[r][c] = 100;
        this.removeObjectProbPlacement(r, c);
    }

    isFieldReachable(r, c) {
        const targetKey = `${r},${c}`;
        if (this.occupiedTiles.has(targetKey)) return true;
        if (!this.occupiedTiles.size) return false;
        const queue = [];
        const visited = new Set();
        const regionByKey = {};
        this.occupiedTiles.forEach(key => {
            const [sr, sc] = key.split(',').map(Number);
            const startType = FIELD_MAP_DATA[sr][sc];
            let regionId = -1;
            if (!isBorderTerrain(startType)) {
                regionId = this.getRegionIdAt(sr, sc);
            } else {
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const d of dirs) {
                    const nr = sr + d[0];
                    const nc = sc + d[1];
                    const id = this.getRegionIdAt(nr, nc);
                    if (id !== -1) { regionId = id; break; }
                }
            }
            queue.push({ r: sr, c: sc, regionId });
            visited.add(key);
            regionByKey[key] = regionId;
        });
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        while (queue.length) {
            const cur = queue.shift();
            for (const d of dirs) {
                const nr = cur.r + d[0];
                const nc = cur.c + d[1];
                if (nr < 0 || nr >= MAP_SIZE || nc < 0 || nc >= MAP_SIZE) continue;
                const nkey = `${nr},${nc}`;
                if (visited.has(nkey)) continue;
                const type = FIELD_MAP_DATA[nr][nc];
                const isTarget = nkey === targetKey;
                const isOccupied = this.occupiedTiles.has(nkey);
                if (this.isTileBlocked(cur, nr, nc, type, isOccupied, isTarget, cur.regionId ?? -1)) continue;
                if (nkey === targetKey) return true;
                let nextRegion = cur.regionId ?? -1;
                if (!isBorderTerrain(type)) {
                    const rid = this.getRegionIdAt(nr, nc);
                    if (rid !== -1) nextRegion = rid;
                }
                visited.add(nkey);
                queue.push({ r: nr, c: nc, regionId: nextRegion });
            }
        }
        return false;
    }

    buildReachableTiles() {
        const reachable = new Set();
        if (!this.occupiedTiles.size) return reachable;
        const queue = [];
        this.occupiedTiles.forEach(key => {
            const [sr, sc] = key.split(',').map(Number);
            const startType = FIELD_MAP_DATA[sr][sc];
            let regionId = -1;
            if (!isBorderTerrain(startType)) {
                regionId = this.getRegionIdAt(sr, sc);
            } else {
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const d of dirs) {
                    const nr = sr + d[0];
                    const nc = sc + d[1];
                    const id = this.getRegionIdAt(nr, nc);
                    if (id !== -1) { regionId = id; break; }
                }
            }
            queue.push({ r: sr, c: sc, regionId });
            reachable.add(key);
        });
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        while (queue.length) {
            const cur = queue.shift();
            for (const d of dirs) {
                const nr = cur.r + d[0];
                const nc = cur.c + d[1];
                if (nr < 0 || nr >= MAP_SIZE || nc < 0 || nc >= MAP_SIZE) continue;
                const nkey = `${nr},${nc}`;
                if (reachable.has(nkey)) continue;
                const type = FIELD_MAP_DATA[nr][nc];
                const isOccupied = this.occupiedTiles.has(nkey);
                if (this.isTileBlocked(cur, nr, nc, type, isOccupied, false, cur.regionId ?? -1)) continue;
                let nextRegion = cur.regionId ?? -1;
                if (!isBorderTerrain(type)) {
                    const rid = this.getRegionIdAt(nr, nc);
                    if (rid !== -1) nextRegion = rid;
                }
                reachable.add(nkey);
                queue.push({ r: nr, c: nc, regionId: nextRegion });
            }
        }
        return reachable;
    }

    canCollectFieldObject(r, c) {
        return this.isFieldReachable(r, c);
    }

    collectFieldObjectToMerge(type, r, c) {
        if (!this.canCollectFieldObject(r, c)) { this.showToast(this.tr('toast.enter_before_collect', {}, 'Enter first before collecting')); return; }
        const info = this.getCollectibleFieldItemInfo(type);
        if (!info) { this.showToast(this.tr('toast.collect_unavailable', {}, 'Nothing to collect')); return; }
        const item = this.createMergeItemFromInfo(info);
        if (!this.spawnItem(item)) { this.showToast(this.tr('toast.merge_slot_short', {}, 'Not enough merge slot space')); return; }

        this.clearFieldObjectFromMap(r, c);
        if (this.fieldObjectState) {
            if (!this.fieldObjectState.regenByCode) this.fieldObjectState.regenByCode = {};
            this.fieldObjectState.regenByCode[type] = Date.now();
        }
        this.sound.playCollect();
        this.requestRender();
        this.updateUI();

        if (document.getElementById('field-modal').classList.contains('open')) {
            if (!this.refreshFieldMapVisuals()) {
                this.renderFieldMap();
            }
            this.setFieldInfo(FIELD_MAP_DATA[r][c], r, c);
        }
        this.showToast(this.tr('toast.collect_done', {}, 'Collected'));
    }


    applyCpBonuses() {
        const baseMax = this.baseMaxCp ?? this.maxCp ?? 20;
        const baseRegen = this.baseCpRegen ?? this.cpRegen ?? 1;
        this.maxCp = baseMax + (this.cpBonus || 0);
        this.cpRegen = Math.max(0, baseRegen + (this.cpRegenBonus || 0));
        if (this.cp > this.maxCp) this.cp = this.maxCp;
    }

    recalcFieldBonuses() {
        const buffs = { atk: 0, def: 0, hp: 0, spd: 0 };
        let cpCapBonus = 0;
        let cpRegenBonus = 0;
        let citadelCount = 0;

        this.occupiedTiles.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const type = FIELD_MAP_DATA[r][c];
            if (isStatueTile(type)) {
                const buff = this.getStatueBuff(type);
                if (buff && buff.value) buffs[buff.kind] += buff.value;
            }
            if (isRuinsTile(type)) {
                const bonus = this.getRuinsBonus(type);
                if (bonus) {
                    cpCapBonus += bonus.cpCap;
                    cpRegenBonus += bonus.cpRegen;
                }
            }
            if (isCitadelTile(type)) citadelCount += 1;
        });

        this.fieldBuffs = buffs;
        this.citadelCount = citadelCount;
        this.cpBonus = cpCapBonus + (citadelCount * CITADEL_CP_BONUS);
        this.cpRegenBonus = cpRegenBonus;
        const prevThird = this.thirdSquadUnlocked;
        this.thirdSquadUnlocked = citadelCount > 0;
        if (!this.thirdSquadUnlocked) {
            if (this.selectedArmyId === 2) this.selectedArmyId = null;
            if (this.lastSelectedArmyId === 2) this.lastSelectedArmyId = null;
        }
        if (prevThird !== this.thirdSquadUnlocked) {
            this.calcLayout();
            this.requestRender();
        }
        this.applyCpBonuses();
    }

    calcItemPrice(type, level) {
        const base = ITEM_VALUES[level] || 1;
        if (type === ITEM_TYPE.ITEM_GOLD) return base * 40;
        if (type === ITEM_TYPE.ITEM_ENERGY) return base * 50;
        if (type === ITEM_TYPE.ITEM_CRYSTAL) return base * 80;
        return base * 50;
    }

    getItemIcon(type) {
        if (type === ITEM_TYPE.ITEM_GOLD) return "G";
        if (type === ITEM_TYPE.ITEM_ENERGY) return "EN";
        if (type === ITEM_TYPE.ITEM_CRYSTAL) return "CR";
        return "IT";
    }

    getAssetSrc(type, level) {
        const img = this.assets.getImage(type, level);
        return img && img.src ? img.src : "";
    }

    placeUnitInSquad(item, squad) {
        for (let i = 0; i < squad.length; i++) {
            if (!squad[i]) { item.scale = 1.3; squad[i] = item; return i; }
        }
        return -1;
    }

    placeUnitPreferred(item) {
        let idx = this.placeUnitInSquad(item, this.squad1);
        if (idx !== -1) return { placed: true, zone: ZONES.SQUAD1, idx };
        idx = this.placeUnitInSquad(item, this.squad2);
        if (idx !== -1) return { placed: true, zone: ZONES.SQUAD2, idx };
        if (this.thirdSquadUnlocked) {
            idx = this.placeUnitInSquad(item, this.squad3);
            if (idx !== -1) return { placed: true, zone: ZONES.SQUAD3, idx };
        }
        if (this.spawnItem(item)) return { placed: true, zone: ZONES.GRID, idx: null };
        return { placed: false };
    }

    calcMercPrice(code) {
        const info = getInfoFromCode(code);
        const stats = UNIT_STATS[code];
        const lv = info.level || 1;
        if (!stats) return lv * 120;
        return Math.max(80, (stats.sell + 1) * 100);
    }

    getShopItemKey(item) {
        if (!item) return "";
        if (item.kind === "item") return `item:${item.code ?? `${item.type}:${item.level}`}`;
        return `unit:${item.code ?? `${item.name}:${item.level}`}`;
    }

    buildShopCatalog(type) {
        const level = this.getFieldLevel(type);
        if (type === FIELD_EVENT_TYPES.CARAVAN) {
            const maxUnitLevel = Math.max(2, Math.min(10, Math.floor(this.lordLevel / 20) + 3));
            const itemCodes = Object.keys(ITEM_TABLE).map(n => parseInt(n, 10))
                .filter(code => {
                    const info = getInfoFromCode(code);
                    const data = ITEM_TABLE[code];
                    return Number.isFinite(code) && !!info && !!data && info.type >= ITEM_TYPE.ITEM_GOLD && info.type <= ITEM_TYPE.ITEM_CRYSTAL;
                });
            const unitCodes = Object.keys(UNIT_STATS).map(n => parseInt(n, 10))
                .filter(code => {
                    const info = getInfoFromCode(code);
                    return Number.isFinite(code) && !!info && info.type >= ITEM_TYPE.UNIT_INFANTRY && info.type <= ITEM_TYPE.UNIT_CAVALRY && info.level <= maxUnitLevel;
                });
            itemCodes.sort(() => Math.random() - 0.5);
            unitCodes.sort(() => Math.random() - 0.5);

            const items = itemCodes.slice(0, 2).map(code => {
                const info = getInfoFromCode(code);
                const data = ITEM_TABLE[code] || {};
                const basePrice = this.calcItemPrice(info.type, info.level);
                return {
                    kind: "item",
                    code,
                    name: data.name_kr || data.name || `Item Lv.${info.level}`,
                    icon: this.getItemIcon(info.type),
                    type: info.type,
                    level: info.level,
                    earn: Number(data.earn || 0),
                    price: Math.max(1, Math.floor(basePrice * 0.85))
                };
            });
            const units = unitCodes.slice(0, 2).map(code => {
                const info = getInfoFromCode(code);
                const stat = UNIT_STATS[code] || {};
                const basePrice = this.calcMercPrice(code);
                return {
                    kind: "unit",
                    code,
                    name: stat.name || stat.name_kr || `Unit Lv.${info.level}`,
                    level: info.level,
                    price: Math.max(1, Math.floor(basePrice * 0.9))
                };
            });

            return [...items, ...units].sort(() => Math.random() - 0.5);
        }
        if (isShopTile(type)) {
            const codes = Object.keys(ITEM_TABLE).map(n => parseInt(n, 10))
                .filter(code => {
                    const info = getInfoFromCode(code);
                    const data = ITEM_TABLE[code];
                    return Number.isFinite(code) && !!info && !!data && info.type >= ITEM_TYPE.ITEM_GOLD && info.type <= ITEM_TYPE.ITEM_CRYSTAL;
                });
            codes.sort(() => Math.random() - 0.5);
            return codes.slice(0, 3).map(code => {
                const info = getInfoFromCode(code);
                const data = ITEM_TABLE[code] || {};
                return {
                    kind: "item",
                    code,
                    name: data.name_kr || data.name || `Item Lv.${info.level}`,
                    icon: this.getItemIcon(info.type),
                    type: info.type,
                    level: info.level,
                    earn: Number(data.earn || 0),
                    price: this.calcItemPrice(info.type, info.level)
                };
            });
        }
        if (isTavernTile(type)) {
            const pool = Object.keys(UNIT_STATS).map(n => parseInt(n, 10))
                .filter(code => {
                    const info = getInfoFromCode(code);
                    return Number.isFinite(code) && !!info && info.type >= ITEM_TYPE.UNIT_INFANTRY && info.type <= ITEM_TYPE.UNIT_CAVALRY && info.level <= 5;
                });
            pool.sort(() => Math.random() - 0.5);
            return pool.slice(0, 3).map(code => {
                const info = getInfoFromCode(code);
                const stat = UNIT_STATS[code] || {};
                return {
                    kind: "unit",
                    code,
                    name: stat.name || stat.name_kr || `Unit Lv.${info.level}`,
                    level: info.level,
                    price: this.calcMercPrice(code)
                };
            });
        }
        return [];
    }

    buyFieldItem(item) {
        if (item.sold) { this.showToast(this.tr('toast.sold_out', {}, 'Sold out')); return; }
        if (this.gold < item.price) { this.showToast(this.tr('toast.gold_short', {}, 'Not enough gold')); return; }
        if (!this.spawnItem({ type: item.type, level: item.level, scale: 0 })) { this.showToast(this.tr('toast.space_short', {}, 'No space available')); return; }
        this.gold -= item.price;
        this.sound.playCollect();
        this.updateUI();
        this.showToast(this.tr('toast.purchase_done', {}, 'Purchased'));
        item.sold = true;
        this.refreshShopModal();
    }

    hireMercenary(item) {
        if (item.sold) { this.showToast(this.tr('toast.sold_out', {}, 'Sold out')); return; }
        if (this.gold < item.price) { this.showToast(this.tr('toast.gold_short', {}, 'Not enough gold')); return; }
        const info = getInfoFromCode(item.code);
        const placed = this.placeUnitPreferred({ type: info.type, level: info.level, scale: 0 });
        if (!placed.placed) { this.showToast(this.tr('toast.space_short', {}, 'No space available')); return; }
        this.gold -= item.price;
        this.sound.playSpawn();
        this.updateUI();
        if (placed.zone === ZONES.SQUAD1 || placed.zone === ZONES.SQUAD2) {
            this.playSquadJoinFx(placed.zone, placed.idx);
        }
        this.showToast(this.tr('toast.recruit_done', {}, 'Hired'));
        item.sold = true;
        this.refreshShopModal();
    }

    refreshShopModal() {
        if (!this.currentShopContext) return;
        const { type, r, c, key: contextKey } = this.currentShopContext;
        const key = contextKey || `${r},${c}`;
        const state = this.fieldShopState[key];
        if (!state) return;
        if (!document.getElementById('modal-object')?.classList.contains('open')) return;
        const now = Date.now();
        const interval = 3 * 60 * 60 * 1000;
        if (now - state.lastRefresh >= interval) {
            const prevSoldKeys = new Set((state.items || []).filter(i => i.sold).map(i => this.getShopItemKey(i)));
            state.lastRefresh = now;
            state.items = this.buildShopCatalog(type).map(item => ({
                ...item,
                sold: false,
                restock: prevSoldKeys.has(this.getShopItemKey(item))
            }));
            state.justRefreshed = true;
            this.fieldShopState[key] = state;
        }
        this.renderShopModal(type, r, c, state);
    }

    openShopOrTavern(type, r, c) {
        if (this.guardWorldAction(this.tr('ui.field.action.open_shop', {}, 'Shop'))) return;
        const key = `${r},${c}`;
        if (!this.occupiedTiles.has(key)) { this.showToast(this.tr('toast.use_after_capture', {}, 'Usable after capture')); return; }
        const state = this.fieldShopState[key] || { lastRefresh: Date.now(), items: [] };
        const interval = 3 * 60 * 60 * 1000;
        const now = Date.now();
        if (now - state.lastRefresh >= interval || !state.items || state.items.length === 0) {
            state.lastRefresh = now;
            state.items = this.buildShopCatalog(type).map(item => ({ ...item, sold: false, restock: false }));
        }
        this.fieldShopState[key] = state;
        this.currentShopContext = { type, r, c };
        this.renderShopModal(type, r, c, state);
    }

    renderShopModal(type, r, c, state) {
        const interval = 3 * 60 * 60 * 1000;
        const now = Date.now();
        const next = state.lastRefresh + interval;
        const remain = this.formatTimeLeft(next - now);
        const isCaravan = type === FIELD_EVENT_TYPES.CARAVAN;
        const name = isCaravan ? this.tr('ui.modal.caravan_title', {}, 'Caravan Shop') : this.objectTypeNameByCode(type);
        const level = this.getFieldLevel(type);

        const modal = document.getElementById('modal-object');
        const t = document.getElementById('object-modal-title');
        const b = document.getElementById('object-modal-body');
        if (!modal || !t || !b) return;
        modal.style.display = '';
        modal.classList.add('open');
        t.innerText = name;
        b.innerHTML = "";
        modal.querySelector('.modal-content')?.classList.add('wide');

        const header = document.createElement('div');
        header.className = "shop-header";
        const titleText = isCaravan ? name : `${name} Lv.${level}`;
        header.innerHTML = `<div class="shop-title">${titleText}</div><div class="shop-refresh">${this.tr('ui.shop.refresh_in', {}, 'Refresh in')}: <span id="shop-refresh-timer">${remain}</span></div>`;
        b.appendChild(header);

        const list = document.createElement('div');
        list.className = "shop-list";
        const soldOutLabel = this.tr('ui.shop.sold_out', {}, 'SOLD OUT');
        const yieldLabel = this.tr('ui.shop.yield', {}, 'Yield');
        const hireUnitLabel = this.tr('ui.shop.hire_unit', {}, 'Hire unit');

        state.items.forEach(item => {
            const row = document.createElement('div');
            row.className = "shop-card";
            if (item.restock) row.classList.add('restock');

            if (item.kind === "item") {
                const imgSrc = this.getAssetSrc(item.type, item.level);
                const iconHtml = imgSrc
                    ? `<div class="shop-icon"><img class="shop-icon-img" src="${imgSrc}" alt=""></div>`
                    : `<div class="shop-icon">${item.icon || this.getItemIcon(item.type)}</div>`;
                row.innerHTML = `
                    <div class="shop-row">${iconHtml}<div><div class="name">${item.name}</div><div class="level">Lv.${item.level}</div><div class="meta">${yieldLabel} +${item.earn}</div></div></div>
                    <button class="price-btn">${item.sold ? soldOutLabel : `G ${item.price}`}</button>
                `;
                const btn = row.querySelector('.price-btn');
                const affordable = this.gold >= item.price;
                if (item.sold || !affordable) row.classList.add('disabled');
                btn.onclick = () => {
                    if (item.sold) { this.showToast(this.tr('toast.sold_out', {}, 'Sold out')); return; }
                    if (!affordable) { this.showToast(this.tr('toast.gold_short', {}, 'Not enough gold')); return; }
                    this.buyFieldItem(item);
                };
            } else {
                // Unit
                const info = getInfoFromCode(item.code);
                const imgSrc = this.getAssetSrc(info.type, info.level);
                const iconHtml = imgSrc
                    ? `<div class="shop-icon"><img class="shop-icon-img" src="${imgSrc}" alt=""></div>`
                    : `<div class="shop-icon">UN</div>`;
                row.innerHTML = `
                    <div class="shop-row">${iconHtml}<div><div class="name">${item.name}</div><div class="level">Lv.${item.level}</div><div class="meta">${hireUnitLabel}</div></div></div>
                    <button class="price-btn">${item.sold ? soldOutLabel : `G ${item.price}`}</button>
                `;
                const btn = row.querySelector('.price-btn');
                const affordable = this.gold >= item.price;
                if (item.sold || !affordable) row.classList.add('disabled');
                btn.onclick = () => {
                    if (item.sold) { this.showToast(this.tr('toast.sold_out', {}, 'Sold out')); return; }
                    if (!affordable) { this.showToast(this.tr('toast.gold_short', {}, 'Not enough gold')); return; }
                    this.hireMercenary(item);
                };
            }
            list.appendChild(row);
        });

        state.items.forEach(item => { item.restock = false; });
        state.justRefreshed = false;
        b.appendChild(list);
        modal.classList.add('open');

        if (this.shopTimer) clearInterval(this.shopTimer);
        this.shopTimer = setInterval(() => {
            if (!modal.classList.contains('open')) { clearInterval(this.shopTimer); this.shopTimer = null; return; }
            const el = document.getElementById('shop-refresh-timer');
            if (el) el.innerText = this.formatTimeLeft(next - Date.now());
            // this.refreshShopModal(); // Avoid infinite loop or flicker if logic is recursive
        }, 1000);
    }

    getBattleRewardOptions(rewardCtx) {
        const targetCode = Number(rewardCtx?.targetCode);
        const fieldLevel = Math.max(1, Number(this.getFieldLevel(targetCode) || 1));
        const energyGain = Math.max(5, Math.min(20, 3 + (fieldLevel * 2)));
        const chestLevel = Math.max(1, Math.min(5, Math.ceil(fieldLevel / 2)));
        const adGold = Math.max(150, fieldLevel * 90);
        return [
            {
                kind: 'energy',
                icon: '⚡',
                title: this.tr('ui.battle_reward.energy', { value: energyGain }, `Energy +${energyGain}`),
                button: this.tr('ui.battle_reward.select', {}, 'Select'),
                energyGain
            },
            {
                kind: 'chest',
                icon: '📦',
                title: this.tr('ui.battle_reward.chest', { level: chestLevel }, `Chest Lv.${chestLevel}`),
                button: this.tr('ui.battle_reward.select', {}, 'Select'),
                chestLevel
            },
            {
                kind: 'ad',
                icon: '▶',
                title: this.tr('ui.battle_reward.ad_gold', { value: adGold }, `Bonus Gold +${adGold}`),
                button: this.tr('ui.refill.watch_ad', {}, 'Watch Ad'),
                adGold
            }
        ];
    }

    openBattleRewardModal(rewardCtx) {
        const modal = document.getElementById('modal-object');
        const title = document.getElementById('object-modal-title');
        const body = document.getElementById('object-modal-body');
        if (!modal || !title || !body) return;

        this.pendingBattleReward = {
            ...rewardCtx,
            options: this.getBattleRewardOptions(rewardCtx),
            claimed: false
        };

        modal.style.display = '';
        modal.classList.add('open');
        modal.querySelector('.modal-content')?.classList.remove('wide');
        title.innerText = this.tr('ui.modal.battle_reward_title', {}, 'Battle Reward');
        body.innerHTML = '';

        const panel = document.createElement('div');
        panel.className = 'battle-reward-panel';

        const grid = document.createElement('div');
        grid.className = 'battle-reward-grid';

        this.pendingBattleReward.options.forEach(opt => {
            const card = document.createElement('div');
            card.className = 'battle-reward-card';
            card.innerHTML = `
                <div class="icon">${opt.icon}</div>
                <div class="title">${opt.title}</div>
            `;
            const btn = document.createElement('button');
            btn.className = 'battle-reward-btn';
            btn.innerText = opt.button;
            btn.onclick = () => this.claimBattleReward(opt.kind);
            card.appendChild(btn);
            grid.appendChild(card);
        });

        panel.appendChild(grid);
        body.appendChild(panel);
    }

    claimBattleReward(kind) {
        const state = this.pendingBattleReward;
        if (!state || state.claimed) return;
        const option = (state.options || []).find(opt => opt.kind === kind);
        if (!option) return;

        if (kind === 'energy') {
            const gain = Number(option.energyGain || 0);
            const real = Math.max(0, Math.min(gain, this.maxEnergy - this.energy));
            this.energy = Math.min(this.maxEnergy, this.energy + gain);
            this.showToast(this.tr('toast.energy_gain', { value: real }, `+${real}⚡`));
        } else if (kind === 'chest') {
            const level = Math.max(1, Number(option.chestLevel || 1));
            const chest = { type: ITEM_TYPE.BUILDING_CHEST, level, scale: 0, usage: 5 };
            if (!this.spawnItem(chest)) {
                this.showToast(this.tr('toast.reward_chest_no_space', {}, 'Reward chest, but no space'));
                return;
            }
            this.showToast(this.tr('ui.battle_reward.chest_granted', { level }, `Chest Lv.${level} obtained`));
        } else if (kind === 'ad') {
            const gain = Math.max(0, Number(option.adGold || 0));
            this.gold += gain;
            this.showToast(this.tr('ui.battle_reward.ad_granted', { value: gain }, `Bonus Gold +${gain}`));
        }

        state.claimed = true;
        this.pendingBattleReward = null;
        this.updateUI();
        this.requestRender();

        const modal = document.getElementById('modal-object');
        modal?.classList.remove('open');
        document.querySelector('#modal-object .modal-content')?.classList.remove('wide');
    }

    // --- PHASE 4: SOCIAL UI ---
    initSocialUI() {
        // Chat Button is now in Footer (HTML), so we don't create it here.
        // We only verify drawer exists.

        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;

        // 2. Chat Drawer
        if (!document.getElementById('chat-drawer')) {
            const chatTitle = this.tr('ui.chat.title.world', {}, 'World Chat');
            const chatClose = this.tr('ui.chat.close', {}, 'Close');
            const chatWorld = this.tr('ui.chat.tab.world', {}, 'World');
            const chatGuild = this.tr('ui.chat.tab.guild', {}, 'Guild');
            const chatSystem = this.tr('ui.chat.tab.system', {}, 'System');
            const chatPlaceholder = this.tr('ui.chat.placeholder', {}, 'Type message...');
            const chatSend = this.tr('ui.chat.send', {}, 'Send');
            const chatDrawer = document.createElement('div');
            chatDrawer.id = 'chat-drawer';
            chatDrawer.className = 'chat-drawer';
            chatDrawer.innerHTML = `
                <div class="chat-header">
                    <span id="chat-title">${chatTitle}</span>
                    <button id="chat-close-btn" onclick="game.toggleChat()">${chatClose}</button>
                </div>
                <div class="chat-tabs">
                    <button id="chat-tab-world" data-channel="world" class="active" onclick="game.setChatChannel('world')">${chatWorld}</button>
                    <button id="chat-tab-guild" data-channel="guild" onclick="game.setChatChannel('guild')">${chatGuild}</button>
                    <button id="chat-tab-system" data-channel="system" onclick="game.setChatChannel('system')">${chatSystem}</button>
                </div>
                <div id="chat-messages" class="chat-messages"></div>
                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="${chatPlaceholder}">
                    <button id="chat-send-btn" onclick="game.sendChatMessage()">${chatSend}</button>
                </div>
            `;
            gameContainer.appendChild(chatDrawer);
        }

        // 3. Profile Modal
        if (!document.getElementById('modal-profile')) {
            const profileModal = document.createElement('div');
            profileModal.id = 'modal-profile';
            profileModal.className = 'modal-overlay';
            profileModal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal" onclick="document.getElementById('modal-profile').classList.remove('open')">&times;</span>
                    <div id="profile-body"></div>
                </div>
            `;
            document.body.appendChild(profileModal);
        }

        // Update Header
        this.updateHeaderForSocial();

        this.ensureChatState();
        this.updateChatTabUI();
        this.refreshChatUI();

        // Start Chat Simulation
        setInterval(() => this.simulateChat(), 5000 + Math.random() * 10000);
    }

    ensureChatState() {
        if (!this.chatState || typeof this.chatState !== 'object') {
            this.chatState = { activeChannel: 'world', logsByChannel: { world: [], guild: [], system: [] }, maxLogs: 80 };
        }
        const validChannels = ['world', 'guild', 'system'];
        const current = String(this.chatState.activeChannel || 'world').toLowerCase();
        this.chatState.activeChannel = validChannels.includes(current) ? current : 'world';
        if (!this.chatState.logsByChannel || typeof this.chatState.logsByChannel !== 'object') {
            this.chatState.logsByChannel = { world: [], guild: [], system: [] };
        }
        validChannels.forEach((channel) => {
            if (!Array.isArray(this.chatState.logsByChannel[channel])) this.chatState.logsByChannel[channel] = [];
        });
        this.chatState.maxLogs = Math.max(20, Math.min(200, Number(this.chatState.maxLogs || 80)));
        return this.chatState;
    }

    ensureSocialState() {
        if (!this.socialState || typeof this.socialState !== 'object') {
            this.socialState = {};
        }
        const keys = ['players', 'friends', 'friendRequestsIn', 'friendRequestsOut', 'allianceRequestsIn', 'allianceRequestsOut'];
        keys.forEach((k) => {
            if (!Array.isArray(this.socialState[k])) this.socialState[k] = [];
        });
        if (!this.socialState.players.length) {
            this.socialState.players = [
                { uid: 'P1001', name: 'IronWolf', power: 1800 },
                { uid: 'P1002', name: 'SkyRider', power: 2200 },
                { uid: 'P1003', name: 'StoneGate', power: 1600 },
                { uid: 'P1004', name: 'NightLance', power: 2450 }
            ];
        }
        if (!this.socialState.friendRequestsIn.length) this.socialState.friendRequestsIn = ['P1003'];
        if (!this.socialState.allianceRequestsIn.length) this.socialState.allianceRequestsIn = ['P1002'];
        return this.socialState;
    }

    getChatChannelLabel(channel) {
        if (channel === 'guild') return this.tr('ui.chat.tab.guild', {}, 'Guild');
        if (channel === 'system') return this.tr('ui.chat.tab.system', {}, 'System');
        return this.tr('ui.chat.tab.world', {}, 'World');
    }

    getChatTitleForChannel(channel) {
        if (channel === 'guild') return this.tr('ui.chat.title.guild', {}, 'Guild Chat');
        if (channel === 'system') return this.tr('ui.chat.title.system', {}, 'System Chat');
        return this.tr('ui.chat.title.world', {}, 'World Chat');
    }

    updateChatTabUI() {
        const state = this.ensureChatState();
        ['world', 'guild', 'system'].forEach((channel) => {
            const tab = document.getElementById(`chat-tab-${channel}`);
            if (!tab) return;
            tab.classList.toggle('active', state.activeChannel === channel);
            tab.innerText = this.getChatChannelLabel(channel);
        });
        const title = document.getElementById('chat-title');
        if (title) title.innerText = this.getChatTitleForChannel(state.activeChannel);
        const input = document.getElementById('chat-input');
        if (input) {
            input.placeholder = this.tr('ui.chat.placeholder', {}, 'Type message...');
            input.disabled = state.activeChannel === 'system';
        }
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            sendBtn.innerText = this.tr('ui.chat.send', {}, 'Send');
            sendBtn.disabled = state.activeChannel === 'system';
        }
    }

    setChatChannel(channel) {
        const state = this.ensureChatState();
        const next = String(channel || '').toLowerCase();
        if (!['world', 'guild', 'system'].includes(next)) return;
        if (state.activeChannel === next) return;
        state.activeChannel = next;
        this.updateChatTabUI();
        this.refreshChatUI();
    }

    pushChatMessage(channel, sender, text, type = 'other') {
        const state = this.ensureChatState();
        const target = ['world', 'guild', 'system'].includes(channel) ? channel : 'world';
        const row = {
            channel: target,
            sender: String(sender || ''),
            text: String(text || ''),
            type: type === 'me' ? 'me' : 'other',
            at: Date.now()
        };
        const list = state.logsByChannel[target];
        list.push(row);
        if (list.length > state.maxLogs) list.splice(0, list.length - state.maxLogs);
        return row;
    }

    updateHeaderForSocial() {
        console.log("Updating Header for Social (v3)...");
        const header = document.getElementById('ui-header');
        // If header doesn't exist (it should, class is header-panel), try querySelector
        const headerPanel = document.querySelector('.header-panel');
        if (!headerPanel) return;

        // Check if already updated
        if (document.getElementById('header-profile')) return;

        // Inject Profile Icon at start
        const profileIcon = document.createElement('div');
        profileIcon.id = 'header-profile';
        profileIcon.className = 'header-profile';
        profileIcon.innerHTML = `<div class="avatar">${this.tr('ui.profile.avatar_default', {}, 'Hero')}</div><div class="level-badge">${this.lordLevel}</div>`;
        profileIcon.onclick = () => this.openProfile();
        headerPanel.insertBefore(profileIcon, headerPanel.firstChild);

        // Inject Point Counters (Gems are already in HTML)
        const resContainer = headerPanel.querySelector('.flex.justify-between.mb-1'); // The first row
        if (resContainer) {
            // Points (Inject only Points and Settings)
            const pointShort = this.tr('ui.header.points_short', {}, 'PT');
            const settingsShort = this.tr('ui.header.settings_short', {}, 'SET');

            // Points
            const pointDiv = document.createElement('div');
            pointDiv.className = 'res-pill';
            pointDiv.onclick = () => this.showToast(this.tr('toast.point_shop_soon', {}, 'Point shop coming soon'));
            pointDiv.innerHTML = `
                <span class="res-icon">${pointShort}</span>
                <span id="res-point">${this.points}</span>
                <span class="text-gray-400 text-[10px] ml-1">+</span>
            `;
            resContainer.appendChild(pointDiv);

            // Settings Button (Top Right)
            const settingsDiv = document.createElement('div');
            settingsDiv.className = 'res-pill settings-icon';
            settingsDiv.onclick = () => document.getElementById('modal-settings').classList.add('open');
            settingsDiv.innerHTML = `<span class="res-icon">${settingsShort}</span>`;
            resContainer.appendChild(settingsDiv);
        }
    }

    toggleChat() {
        this.isChatOpen = !this.isChatOpen;
        const drawer = document.getElementById('chat-drawer');
        if (this.isChatOpen) {
            drawer.classList.add('open');
            this.updateChatTabUI();
            this.refreshChatUI();
        } else {
            drawer.classList.remove('open');
        }
    }

    sendChatMessage() {
        this.sanitizeUserProfile();
        const state = this.ensureChatState();
        const input = document.getElementById('chat-input');
        if (!input || state.activeChannel === 'system') return;
        const text = input.value.trim();
        if (!text) return;

        this.pushChatMessage(state.activeChannel, this.userProfile.name, text, 'me');

        input.value = "";
        this.refreshChatUI();
        this.showToast(this.tr('toast.message_sent', {}, 'Message sent'));
        this.saveGame();
    }

    simulateChat() {
        const state = this.ensureChatState();
        const msg = DUMMY_CHAT_MESSAGES[Math.floor(Math.random() * DUMMY_CHAT_MESSAGES.length)];
        const sender = this.tr(msg.senderKey, {}, msg.senderFallback);
        const text = this.tr(msg.textKey, {}, msg.textFallback);
        let channel = 'world';
        if (msg.senderKey === 'ui.chat.sender.guild') channel = 'guild';
        if (msg.senderKey === 'ui.chat.sender.system') channel = 'system';
        this.pushChatMessage(channel, sender, text, 'other');
        // Backward compatibility mirror for older uses.
        this.chatLog = (state.logsByChannel.world || []).slice(-50);
        if (this.isChatOpen) this.refreshChatUI();
    }

    refreshChatUI() {
        const state = this.ensureChatState();
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const list = Array.isArray(state.logsByChannel[state.activeChannel]) ? state.logsByChannel[state.activeChannel] : [];
        if (!list.length) {
            container.innerHTML = `<div class="chat-line other"><span class="sender">[${this.tr('ui.chat.tab.system', {}, 'System')}]</span><span class="text">${this.tr('ui.chat.empty', {}, 'No messages yet.')}</span></div>`;
            return;
        }
        container.innerHTML = list.map(log => `
                <div class="chat-line ${log.type}">
                <span class="sender">${log.type === 'me' ? '' : `[${log.sender}]`}</span>
                <span class="text" style="color:white !important;">${log.text}</span>
            </div>
                `).join('');
        container.scrollTop = container.scrollHeight;
    }

    openProfile() {
        this.sanitizeUserProfile();
        const modal = document.getElementById('modal-profile');
        const body = document.getElementById('profile-body');
        if (!modal || !body) return;
        modal.classList.add('open');

        const escapeHtml = (value) => String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
        const safeName = escapeHtml(this.userProfile?.name || this.tr('ui.profile.unknown_user', {}, 'Unknown User'));
        const safeTitle = escapeHtml(this.userProfile?.title || this.tr('ui.profile.commander', {}, 'Commander'));
        const winRate = Number(this.userProfile?.winRate || 0);
        const power = Number(this.cp || 0) * 100;
        const vip = Number(this.userProfile?.vip || 0);
        const editLabel = this.tr('ui.profile.edit', {}, 'Edit');
        const winRateLabel = this.tr('ui.profile.win_rate', {}, 'Win Rate');
        const powerLabel = this.tr('ui.profile.power', {}, 'Power');
        const friendsLabel = this.tr('ui.profile.friends', {}, 'Friends');
        const accountLabel = this.tr('ui.profile.account', {}, 'Account');

        body.innerHTML = `
            <div class="profile-view">
                <div class="profile-header">
                    <div class="profile-avatar-lg">H</div>
                    <div class="profile-info">
                        <h3>${safeName} <button class="edit-btn" onclick="game.editName()">${editLabel}</button></h3>
                        <p>${safeTitle}</p>
                    </div>
                </div>
                <div class="profile-stats">
                    <div class="stat-box"><div>${winRateLabel}</div><span>${winRate}%</span></div>
                    <div class="stat-box"><div>${powerLabel}</div><span>${power}</span></div>
                    <div class="stat-box"><div>${this.tr('ui.profile.vip', {}, 'VIP')}</div><span>${vip}</span></div>
                </div>
                <div class="profile-actions">
                    <button class="btn-action" onclick="game.openSocialHub('friends')">${friendsLabel}</button>
                    <button class="btn-action" onclick="game.openSocialHub('alliance')">${accountLabel}</button>
                </div>
            </div>
        `;
    }

    isSocialFriend(uid) {
        const social = this.ensureSocialState();
        return social.friends.includes(uid);
    }

    openSocialHub(tab = 'players') {
        this.ensureSocialState();
        this.renderSocialHub(tab);
    }

    renderSocialHub(tab = 'players') {
        const social = this.ensureSocialState();
        const active = ['players', 'friends', 'alliance'].includes(tab) ? tab : 'players';
        const modal = document.getElementById('modal-object');
        const t = document.getElementById('object-modal-title');
        const b = document.getElementById('object-modal-body');
        if (!modal || !t || !b) return;
        modal.style.display = '';
        modal.classList.add('open');
        modal.querySelector('.modal-content')?.classList.add('wide');

        t.innerText = this.tr('ui.social.title', {}, 'Social');

        const tabBtn = (key, fallback) => {
            const label = this.tr(`ui.social.tab.${key}`, {}, fallback);
            const cls = active === key ? 'bg-blue-700 border-blue-400' : 'bg-gray-700 border-gray-500';
            return `<button class="px-2 py-1 text-xs rounded border ${cls}" onclick="game.renderSocialHub('${key}')">${label}</button>`;
        };

        const players = social.players
            .filter((p) => p && p.uid !== this.getLocalUid())
            .map((p) => {
                const uid = String(p.uid || '');
                const isFriend = this.isSocialFriend(uid);
                const outFriend = social.friendRequestsOut.includes(uid);
                const outAlliance = social.allianceRequestsOut.includes(uid);
                const friendAction = isFriend
                    ? this.tr('ui.social.friend.added', {}, 'Friend')
                    : (outFriend ? this.tr('ui.social.friend.pending', {}, 'Pending') : this.tr('ui.social.friend.add', {}, 'Add Friend'));
                const allianceAction = outAlliance
                    ? this.tr('ui.social.alliance.pending', {}, 'Pending')
                    : this.tr('ui.social.alliance.request', {}, 'Alliance');
                return `
                    <div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs flex items-center justify-between gap-2">
                        <div>
                            <div class="text-gray-100 font-bold">${p.name}</div>
                            <div class="text-gray-400">${uid} | ${this.tr('ui.profile.power', {}, 'Power')}: ${Number(p.power || 0)}</div>
                        </div>
                        <div class="flex gap-1">
                            <button class="px-2 py-1 rounded bg-emerald-700 border border-emerald-500 text-[11px]" ${isFriend || outFriend ? 'disabled style="opacity:.6"' : ''} onclick="game.requestFriend('${uid}')">${friendAction}</button>
                            <button class="px-2 py-1 rounded bg-indigo-700 border border-indigo-500 text-[11px]" ${outAlliance ? 'disabled style="opacity:.6"' : ''} onclick="game.requestAlliance('${uid}')">${allianceAction}</button>
                        </div>
                    </div>
                `;
            }).join('');

        const friendRequests = social.friendRequestsIn.map((uid) => {
            const player = social.players.find((p) => p.uid === uid);
            const name = player?.name || uid;
            return `
                <div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs flex items-center justify-between gap-2">
                    <div class="text-gray-100">${name} (${uid})</div>
                    <div class="flex gap-1">
                        <button class="px-2 py-1 rounded bg-emerald-700 border border-emerald-500 text-[11px]" onclick="game.acceptFriendRequest('${uid}')">${this.tr('ui.common.accept', {}, 'Accept')}</button>
                        <button class="px-2 py-1 rounded bg-gray-700 border border-gray-500 text-[11px]" onclick="game.rejectFriendRequest('${uid}')">${this.tr('ui.common.reject', {}, 'Reject')}</button>
                    </div>
                </div>
            `;
        }).join('');

        const friends = social.friends.map((uid) => {
            const player = social.players.find((p) => p.uid === uid);
            const name = player?.name || uid;
            return `<div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs text-gray-100">${name} (${uid})</div>`;
        }).join('');

        const allianceRequests = social.allianceRequestsIn.map((uid) => {
            const player = social.players.find((p) => p.uid === uid);
            const name = player?.name || uid;
            return `
                <div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs flex items-center justify-between gap-2">
                    <div class="text-gray-100">${name} (${uid})</div>
                    <div class="flex gap-1">
                        <button class="px-2 py-1 rounded bg-indigo-700 border border-indigo-500 text-[11px]" onclick="game.acceptAllianceRequest('${uid}')">${this.tr('ui.common.accept', {}, 'Accept')}</button>
                        <button class="px-2 py-1 rounded bg-gray-700 border border-gray-500 text-[11px]" onclick="game.rejectAllianceRequest('${uid}')">${this.tr('ui.common.reject', {}, 'Reject')}</button>
                    </div>
                </div>
            `;
        }).join('');

        let content = '';
        if (active === 'players') {
            content = players || `<div class="text-xs text-gray-300">${this.tr('ui.social.empty.players', {}, 'No players found.')}</div>`;
        } else if (active === 'friends') {
            content = `
                <div class="text-[11px] text-gray-300 mb-2">${this.tr('ui.social.section.friend_requests', {}, 'Friend Requests')}</div>
                <div class="space-y-2 mb-3">${friendRequests || `<div class="text-xs text-gray-400">${this.tr('ui.social.empty.friend_requests', {}, 'No friend requests.')}</div>`}</div>
                <div class="text-[11px] text-gray-300 mb-2">${this.tr('ui.social.section.friends', {}, 'Friends')}</div>
                <div class="space-y-2">${friends || `<div class="text-xs text-gray-400">${this.tr('ui.social.empty.friends', {}, 'No friends yet.')}</div>`}</div>
            `;
        } else {
            content = `
                <div class="text-[11px] text-gray-300 mb-2">${this.tr('ui.social.section.alliance_requests', {}, 'Alliance Requests')}</div>
                <div class="space-y-2 mb-3">${allianceRequests || `<div class="text-xs text-gray-400">${this.tr('ui.social.empty.alliance_requests', {}, 'No alliance requests.')}</div>`}</div>
                <div class="text-[11px] text-gray-300 mb-2">${this.tr('ui.social.section.outgoing', {}, 'Outgoing')}</div>
                <div class="space-y-2">${social.allianceRequestsOut.map((uid) => `<div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs text-gray-100">${uid}</div>`).join('') || `<div class="text-xs text-gray-400">${this.tr('ui.social.empty.outgoing', {}, 'No pending requests.')}</div>`}</div>
            `;
        }

        b.innerHTML = `
            <div class="space-y-2">
                <div class="flex gap-1">${tabBtn('players', 'Players')}${tabBtn('friends', 'Friends')}${tabBtn('alliance', 'Alliance')}</div>
                <div class="space-y-2">${content}</div>
            </div>
        `;
    }

    requestFriend(uid) {
        const social = this.ensureSocialState();
        if (!uid || social.friends.includes(uid) || social.friendRequestsOut.includes(uid)) return;
        social.friendRequestsOut.push(uid);
        this.showToast(this.tr('toast.social.friend_requested', {}, 'Friend request sent'));
        this.saveGame();
        this.renderSocialHub('players');
    }

    requestAlliance(uid) {
        const social = this.ensureSocialState();
        if (!uid || social.allianceRequestsOut.includes(uid)) return;
        social.allianceRequestsOut.push(uid);
        this.showToast(this.tr('toast.social.alliance_requested', {}, 'Alliance request sent'));
        this.saveGame();
        this.renderSocialHub('players');
    }

    acceptFriendRequest(uid) {
        const social = this.ensureSocialState();
        social.friendRequestsIn = social.friendRequestsIn.filter((id) => id !== uid);
        if (!social.friends.includes(uid)) social.friends.push(uid);
        this.showToast(this.tr('toast.social.friend_added', {}, 'Friend added'));
        this.saveGame();
        this.renderSocialHub('friends');
    }

    rejectFriendRequest(uid) {
        const social = this.ensureSocialState();
        social.friendRequestsIn = social.friendRequestsIn.filter((id) => id !== uid);
        this.saveGame();
        this.renderSocialHub('friends');
    }

    acceptAllianceRequest(uid) {
        const social = this.ensureSocialState();
        social.allianceRequestsIn = social.allianceRequestsIn.filter((id) => id !== uid);
        this.showToast(this.tr('toast.social.alliance_accepted', {}, 'Alliance accepted'));
        this.saveGame();
        this.renderSocialHub('alliance');
    }

    rejectAllianceRequest(uid) {
        const social = this.ensureSocialState();
        social.allianceRequestsIn = social.allianceRequestsIn.filter((id) => id !== uid);
        this.saveGame();
        this.renderSocialHub('alliance');
    }

    editName() {
        this.sanitizeUserProfile();
        const current = this.userProfile?.name || '';
        const next = prompt(this.tr('ui.profile.edit_prompt', {}, 'Enter a new nickname.'), current);
        if (typeof next !== 'string') return;
        const trimmed = this.sanitizeProfileText(next, '', 20);
        if (!trimmed) return;
        this.userProfile.name = trimmed;
        this.openProfile();
        this.showToast(this.tr('toast.nickname_changed', {}, 'Nickname has been changed.'));
    }

    playSquadJoinFx(zone, idx) {
        if (idx === null || idx === undefined) return;
        const rect = zone === ZONES.SQUAD1 ? this.squad1Rect : (zone === ZONES.SQUAD2 ? this.squad2Rect : this.squad3Rect);
        const size = this.squadCellSize;
        const x = rect.x + (idx % 3) * size + size / 2;
        const y = rect.y + Math.floor(idx / 3) * size + size / 2;
        this.spawnParticles(x, y, "#4ade80", 16, "spark");
        const name = zone === ZONES.SQUAD1
            ? this.tr('ui.squad.joined', { index: 1 }, 'Squad 1 joined')
            : (zone === ZONES.SQUAD2
                ? this.tr('ui.squad.joined', { index: 2 }, 'Squad 2 joined')
                : this.tr('ui.squad.joined', { index: 3 }, 'Squad 3 joined'));
        this.showJoinNotice(name);
        this.requestRender();
    }

    getSquadByArmyId(armyId) {
        if (armyId === 0) return this.squad1;
        if (armyId === 1) return this.squad2;
        return this.squad3;
    }

    getAvailableArmies() {
        return this.thirdSquadUnlocked ? this.armies : this.armies.filter(a => a.id !== 2);
    }

    isSquadDeployable(squad) {
        if (!Array.isArray(squad)) return false;
        return squad.some((unit) => unit && Number(unit.type) >= 10);
    }

    getPreferredFieldArmyId() {
        const available = this.getAvailableArmies();
        if (!available.length) return null;
        const order = [0, 1, 2];
        for (const armyId of order) {
            const army = available.find((a) => a.id === armyId);
            if (!army) continue;
            const squad = this.getSquadByArmyId(army.id);
            if (this.isSquadDeployable(squad)) return army.id;
        }
        return null;
    }

    enterMoveTargetMode(armyId, opts = {}) {
        const army = this.armies[armyId];
        if (!army) return;
        if (!this.getAvailableArmies().some(a => a.id === armyId)) { this.showToast(this.tr('toast.require_citadel', {}, 'Capture a citadel to use this squad')); return; }
        if (army.state !== 'IDLE') { this.showToast(this.tr('toast.army_moving', {}, 'Army is already moving')); return; }

        if (!Number.isFinite(army.r) || !Number.isFinite(army.c)) {
            army.r = PLAYER_START.r;
            army.c = PLAYER_START.c;
        }

        const squadData = this.getSquadByArmyId(army.id);
        const stats = this.getSquadStats(squadData);
        if (stats.power < 10) { this.showToast(this.tr('toast.army_power_short', {}, 'Not enough troops')); return; }

        const { center = false } = opts;
        this.exitMoveTargetMode();
        this.selectedArmyId = army.id;
        this.lastSelectedArmyId = army.id;
        const times = this.buildMoveTimeMap(army, stats);
        this.moveTargetMode = { armyId: army.id, stats, times };
        this.setMovePreview(this.tr('ui.field.move_preview', {}, 'ETA preview active (tap label to cancel)'));
        if (center) this.centerCameraOnArmy(army.id);
        this.updateSelectedArmyUI();
        this.renderMoveTimeOverlay();
    }

    exitMoveTargetMode() {
        if (!this.moveTargetMode) return;
        this.moveTargetMode = null;
        this.clearMoveTimeOverlay();
        this.setMovePreview("");
    }

    updateSelectedArmyUI() {
        const content = document.getElementById('modal-content');
        if (!content) return;
        this.getAvailableArmies().forEach(army => {
            const marker = document.getElementById(`army-marker-${army.id}`);
            if (!marker) return;
            if (this.selectedArmyId === army.id) marker.classList.add('selected');
            else marker.classList.remove('selected');
        });

        document.querySelectorAll('.field-squad-tab').forEach(btn => {
            const id = Number(btn.dataset.armyId);
            if (id === this.selectedArmyId) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    buildMoveTimeMap(army, stats) {
        const times = new Map();
        const origin = { r: army.r, c: army.c };
        const regionId = this.getArmyRegionId(army);
        for (let r = 0; r < MAP_SIZE; r++) {
            for (let c = 0; c < MAP_SIZE; c++) {
                const key = `${r},${c}`;
                if (!this.visibilityMap.has(key)) continue;
                if (r === origin.r && c === origin.c) continue;
                const path = AStar.findPath(
                    origin,
                    { r, c },
                    FIELD_MAP_DATA,
                    this.occupiedTiles,
                    (cur, nr, nc, type, isOcc, isTarget) => this.isTileBlocked(cur, nr, nc, type, isOcc, isTarget, regionId)
                );
                if (!path) continue;
                const dist = path.length - 1;
                if (dist <= 0 || dist > stats.range) continue;
                const summary = this.getPathSummary(path, stats.speedFactor);
                times.set(key, { timeMin: summary.finalMin, dist, cpCost: CP_COST_PER_COMMAND });
            }
        }
        return times;
    }

    clearMoveTimeOverlay() {
        document.querySelectorAll('.field-time').forEach(el => el.remove());
        document.querySelectorAll('.field-move-eligible').forEach(el => el.classList.remove('field-move-eligible'));
        document.querySelectorAll('.field-move-source').forEach(el => el.classList.remove('field-move-source'));
    }

    renderMoveTimeOverlay() {
        this.clearMoveTimeOverlay();
        if (!this.moveTargetMode) return;
        const { times, armyId } = this.moveTargetMode;
        times.forEach((info, key) => {
            const [r, c] = key.split(',').map(Number);
            const cell = document.getElementById(`field-cell-${r}-${c}`);
            if (!cell || cell.classList.contains('field-fog')) return;
            if (info.cpCost > this.cp) return;
            const label = document.createElement('div');
            label.className = 'field-time';
            const tileType = FIELD_MAP_DATA[r][c];
            const isBorderTile = this.occupiedTiles.has(key) || isGateTile(tileType);
            if (isBorderTile) label.classList.add('lower');
            const display = Math.max(1, Math.round(info.timeMin));
            label.innerText = `${display} m`;
            cell.appendChild(label);
            cell.classList.add('field-move-eligible');
        });
        const army = this.armies[armyId];
        if (army) {
            const startCell = document.getElementById(`field-cell-${army.r}-${army.c}`);
            if (startCell) startCell.classList.add('field-move-source');
        }
    }

    handleMoveTargetClick(r, c, type) {
        if (!this.moveTargetMode) return;
        const { armyId, stats, times } = this.moveTargetMode;
        const info = times.get(`${r},${c}`);
        if (!info) { this.showToast(this.tr('toast.cannot_move', {}, 'Cannot move to this tile')); this.sound.playError(); return; }

        const army = this.armies[armyId];
        if (!army || army.state !== 'IDLE') { this.showToast(this.tr('toast.army_moving', {}, 'Army is already moving')); return; }
        const regionId = this.getArmyRegionId(army);

        const path = AStar.findPath(
            { r: army.r, c: army.c },
            { r, c },
            FIELD_MAP_DATA,
            this.occupiedTiles,
            (cur, nr, nc, type, isOcc, isTarget) => this.isTileBlocked(cur, nr, nc, type, isOcc, isTarget, regionId)
        );
        if (!path) { this.showToast(this.tr('toast.no_path', {}, 'No valid route')); this.sound.playError(); return; }
        const dist = path.length - 1;
        if (dist > stats.range) { this.showToast(this.tr('toast.range_over', { dist, range: stats.range }, `Out of range (${dist}/${stats.range})`)); this.sound.playError(); return; }

        let energyCost = 1; let goldCost = 0;
        if (isGateTile(type)) { energyCost = 5; goldCost = 100; }
        const cpCost = CP_COST_PER_COMMAND;

        if (this.energy < energyCost) { this.showToast(this.tr('toast.energy_short_cost', { cost: energyCost }, `Not enough energy (${energyCost})`)); return; }
        if (this.gold < goldCost) { this.showToast(this.tr('toast.gold_short_cost', { cost: goldCost }, `Not enough gold (${goldCost})`)); return; }
        if (this.cp < cpCost) { this.showToast(this.tr('toast.cp_short_cost', { cost: cpCost }, `Not enough CP (${cpCost})`)); return; }

        this.exitMoveTargetMode();
        this.selectedArmyId = armyId;
        this.startMarch(armyId, r, c, type, energyCost, goldCost, cpCost, path, stats.speedFactor);
    }

    clearPathPreview() {
        if (!this.previewPath) return;
        this.previewPath.forEach(p => {
            const cell = document.getElementById(`field-cell-${p.r}-${p.c}`);
            if (cell) cell.classList.remove('field-path');
        });
        this.previewPath = null;
        const overlay = this.pathOverlay || document.getElementById('path-overlay');
        if (overlay) overlay.innerHTML = "";
    }

    applyPathPreview(path) {
        this.clearPathPreview();
        if (!path || path.length === 0) return;
        this.previewPath = path;
        path.forEach(p => {
            const cell = document.getElementById(`field-cell-${p.r}-${p.c}`);
            if (cell) cell.classList.add('field-path');
        });
        const overlay = this.pathOverlay || document.getElementById('path-overlay');
        if (!overlay) return;
        const points = path.map(p => `${50 + (p.c * 13) + 6.5},${50 + (p.r * 13) + 6.5} `).join(' ');
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        bg.setAttribute('points', points);
        bg.setAttribute('class', 'path-line-bg');
        overlay.appendChild(bg);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('points', points);
        line.setAttribute('class', 'path-line');
        overlay.appendChild(line);
    }

    getFieldObjectInfo(type, r, c) {
        if (isWallTile(type)) {
            return { name: this.objectTypeNameByCode(type), level: "-", owner: "-", defenders: [] };
        }
        if (isTerrainCode(type)) {
            return { name: this.objectTypeNameByCode(type), level: "-", owner: "-", defenders: [] };
        }
        let name = this.objectTypeNameByCode(type);
        let level = 1;
        let defenders = [];
        const data = this.getFieldObjectData(type);
        const overlay = data ? null : getInfoFromCode(type);
        if (data) {
            name = data.name || name;
            level = data.level || level;
            defenders = data.defenders || [];
        } else if (overlay) {
            const base = getData(overlay.type, overlay.level);
            if (base && base.name) {
                name = base.name;
                level = overlay.level ?? level;
            }
        } else {
            name = this.objectTypeNameByCode(type);
            if (type === 4) level = "-";
            else if (!isTerrainCode(type)) level = getObjectLevelFromCode(type);
        }

        // Field Events
        if (typeof FIELD_EVENT_TYPES !== 'undefined') {
            if (type === FIELD_EVENT_TYPES.BANDIT) { name = this.tr('ui.field.event.bandit', {}, 'Bandit'); level = 1; defenders = [{ code: 10, count: 5 }]; }
            else if (type === FIELD_EVENT_TYPES.BANDIT_LEADER) { name = this.tr('ui.field.event.bandit_leader', {}, 'Bandit Leader'); level = 3; defenders = [{ code: 12, count: 10 }]; }
            else if (type === FIELD_EVENT_TYPES.DUNGEON) { name = this.tr('ui.field.event.dungeon', {}, 'Dungeon'); level = 5; }
            else if (type === FIELD_EVENT_TYPES.PORTAL) { name = this.tr('ui.field.event.portal', {}, 'Portal'); level = "-"; }
            else if (type === FIELD_EVENT_TYPES.CARAVAN) { name = this.tr('ui.field.event.caravan', {}, 'Caravan'); level = "-"; }
            else if (type === FIELD_EVENT_TYPES.CROWN) { name = this.tr('ui.field.event.crown', {}, 'Crown'); level = 7; }
        }

        if (this.isKingCastleTile(r, c)) {
            name = this.tr('ui.field.object.king_castle', {}, 'King Castle');
        }

        defenders = this.getDefendersForTile(type, r, c);
        const owner = this.occupiedTiles.has(`${r},${c}`)
            ? this.tr('ui.field.owner_captured', {}, 'Captured')
            : this.tr('ui.field.owner_neutral', {}, 'Neutral');
        return { name, level, owner, defenders };
    }

    isCapturableFieldObject(type) {
        const kind = getFieldObjectKind(type);
        return !!kind && CAPTURABLE_FIELD_OBJECT_KINDS.has(kind);
    }



    formatDefenders(defenders) {
        if (!defenders || defenders.length === 0) return "-";
        return defenders.map(d => {
            const stat = UNIT_STATS[d.code];
            const nm = stat ? stat.name : d.code;
            return `${nm} x${d.count} `;
        }).join(" / ");
    }

    getStatLabel(kind) {
        if (kind === "atk") return this.tr('ui.field.stat.atk', {}, 'ATK');
        if (kind === "def") return this.tr('ui.field.stat.def', {}, 'DEF');
        if (kind === "hp") return this.tr('ui.field.stat.hp', {}, 'HP');
        if (kind === "spd") return this.tr('ui.field.stat.spd', {}, 'SPD');
        return kind ? String(kind).toUpperCase() : this.tr('ui.field.stat.buff', {}, 'BUFF');
    }

    formatStatueBuffEffect(kind, value) {
        return this.tr(
            'ui.field.effect.stat_buff',
            { stat: this.getStatLabel(kind), value: this.formatPercent(value) },
            `${this.getStatLabel(kind)} +${this.formatPercent(value)}`
        );
    }

    formatFieldAbilityEffect(code, value, opts = {}) {
        const val = Number(value);
        if (code === ABILITY_CODES.GATE_OPEN) return this.tr('ui.field.effect.gate_open', {}, 'Gate opened');
        if (code === ABILITY_CODES.SQUAD_SLOT) {
            const amount = Number.isFinite(val) && val > 0 ? val : 1;
            return this.tr('ui.field.effect.squad_slot', { value: amount }, `Squad slot +${amount}`);
        }
        if (code === ABILITY_CODES.CP_CAP) return this.tr('ui.field.effect.cp_cap', { value: val }, `CP cap +${val}`);
        if (code === ABILITY_CODES.CP_REGEN) return this.tr('ui.field.effect.cp_regen', { value: val }, `CP regen +${val}/5m`);
        if (code === ABILITY_CODES.GOLD_CAP) return this.tr('ui.field.effect.gold_cap', { value: val }, `Gold cap +${val}`);
        if (code === ABILITY_CODES.GOLD_REGEN) return this.tr('ui.field.effect.gold_regen', { value: val }, `Gold regen +${val}/5m`);
        if (code === ABILITY_CODES.ENERGY_CAP) return this.tr('ui.field.effect.energy_cap', { value: val }, `Energy cap +${val}`);
        if (code === ABILITY_CODES.ENERGY_REGEN) return this.tr('ui.field.effect.energy_regen', { value: val }, `Energy regen +${val}/5m`);
        if (code === ABILITY_CODES.TAX) {
            if (isShopTile(opts.contextType) || isTavernTile(opts.contextType)) {
                return this.tr('ui.field.effect.income_hourly', { value: val }, `Income +${val}G/h`);
            }
            if (opts.per3s) return this.tr('ui.field.effect.tax_3s', { value: val }, `Tax +${val}G/3s`);
            return this.tr('ui.field.effect.tax', { value: val }, `Tax +${val}G`);
        }
        if (code === ABILITY_CODES.UPKEEP) return this.tr('ui.field.effect.upkeep_3s', { value: val }, `Upkeep -${val}G/3s`);
        return "";
    }

    getCaptureEffectToast(type) {
        const data = this.getFieldObjectData(type);
        if (!data || !data.abilities) return "";

        const messages = [];
        data.abilities.forEach(ab => {
            const message = this.formatFieldAbilityEffect(ab.code, ab.value, { per3s: false });
            if (message) messages.push(message);
        });

        // Fallback or specific handling for Statues if they don't use abilities array yet
        if (isStatueTile(type)) {
            const buff = this.getStatueBuff(type);
            if (buff) {
                messages.push(this.formatStatueBuffEffect(buff.kind, buff.value));
            }
        }

        return messages.join(", ");
    }

    pushEffectLog(message) {
        if (!message) return;
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        this.effectLog.unshift({ time, message });
        if (this.effectLog.length > 5) this.effectLog.length = 5;
        this.renderEffectLog();
    }

    renderEffectLog() {
        const panel = document.getElementById('field-effect-log');
        if (!panel) return;
        if (!this.effectLog.length) {
            panel.style.display = 'none';
            panel.innerHTML = '';
            return;
        }
        panel.style.display = 'flex';
        panel.innerHTML = `<div class="title">${this.tr('ui.field.effects', {}, 'Effects')}</div>` + this.effectLog
            .map(entry => `<div class="entry">${entry.time} | ${entry.message}</div>`)
            .join("");
    }

    getFieldIconEmoji(type) {
        if (isWallTile(type)) return "WL";
        if (isCastleTile(type)) return "CS";
        if (isGateTile(type)) return "GT";
        if (isCitadelTile(type)) return "CT";
        if (isDragonTile(type)) return "DR";
        if (isGoldMineTile(type)) return "GM";
        if (isFountainTile(type)) return "FN";
        if (isShopTile(type)) return "SH";
        if (isTavernTile(type)) return "TV";
        if (isRuinsTile(type)) return "RU";
        if (isStatueTile(type)) return "ST";
        if (isTerrainCode(type)) return "TR";
        return "--";
    }

    buildFieldBadge(type, isOccupied, r, c) {
        let label = "";
        if (this.isKingCastleTile(r, c)) label = "KG";
        else if (isGateTile(type)) label = "GT";
        else if (isCitadelTile(type)) label = "SQ";
        else if (isRuinsTile(type)) label = "CP";
        else if (isStatueTile(type)) {
            const buff = this.getStatueBuff(type);
            const kind = buff ? buff.kind.toUpperCase() : 'BF';
            if (kind === 'ATK') label = 'AT';
            else if (kind === 'DEF') label = 'DF';
            else if (kind === 'HP') label = 'HP';
            else if (kind === 'SPD') label = 'SP';
            else label = kind.slice(0, 2);
        }
        if (!label) return null;

        const badge = document.createElement('div');
        badge.className = 'field-badge';
        badge.classList.add(isOccupied ? 'active' : 'inactive');
        if (label === 'KG') {
            badge.classList.remove('inactive');
            badge.classList.add('active');
        }
        badge.innerText = label;
        return badge;
    }

    getFieldEventMarkerMeta(type) {
        if (type === FIELD_EVENT_TYPES.BANDIT) return { key: 'bandit', text: 'BN', title: this.tr('ui.field.event.bandit', {}, 'Bandit') };
        if (type === FIELD_EVENT_TYPES.BANDIT_LEADER) return { key: 'leader', text: 'BL', title: this.tr('ui.field.event.bandit_leader', {}, 'Bandit Leader') };
        if (type === FIELD_EVENT_TYPES.DUNGEON) return { key: 'dungeon', text: 'DG', title: this.tr('ui.field.event.dungeon', {}, 'Dungeon') };
        if (type === FIELD_EVENT_TYPES.PORTAL) return { key: 'portal', text: 'PT', title: this.tr('ui.field.event.portal', {}, 'Portal') };
        if (type === FIELD_EVENT_TYPES.CARAVAN) return { key: 'caravan', text: 'CV', title: this.tr('ui.field.event.caravan', {}, 'Caravan') };
        if (type === FIELD_EVENT_TYPES.CROWN) return { key: 'crown', text: 'CR', title: this.tr('ui.field.event.crown', {}, 'Crown') };
        return { key: 'other', text: 'EV', title: this.tr('ui.field.event.default', {}, 'Event') };
    }

    getFieldEventSpriteUrl(meta) {
        if (!this.eventSpriteCache) this.eventSpriteCache = {};
        const key = meta?.key || 'other';
        if (this.eventSpriteCache[key]) return this.eventSpriteCache[key];

        let svg = '';
        if (key === 'bandit') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#7f1d1d'/><path d='M4 12L12 4M5 4L12 11' stroke='#fee2e2' stroke-width='2' stroke-linecap='round'/></svg>";
        } else if (key === 'leader') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#92400e'/><path d='M8 3l1.3 2.7 3 .4-2.2 2.1.6 3-2.7-1.4-2.7 1.4.6-3-2.2-2.1 3-.4z' fill='#fde68a'/></svg>";
        } else if (key === 'dungeon') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#4c1d95'/><rect x='4' y='5' width='8' height='7' rx='1' fill='#ddd6fe'/><rect x='7' y='8' width='2' height='4' fill='#4c1d95'/></svg>";
        } else if (key === 'portal') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#164e63'/><circle cx='8' cy='8' r='4.5' fill='none' stroke='#67e8f9' stroke-width='2'/><circle cx='8' cy='8' r='1.8' fill='#67e8f9'/></svg>";
        } else if (key === 'caravan') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#78350f'/><rect x='3' y='5' width='8' height='4' rx='1' fill='#fde68a'/><circle cx='5' cy='11' r='1.4' fill='#f8fafc'/><circle cx='10' cy='11' r='1.4' fill='#f8fafc'/></svg>";
        } else if (key === 'crown') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#7c2d12'/><path d='M3 11V6l2.3 2.1L8 4l2.7 4.1L13 6v5z' fill='#facc15'/></svg>";
        } else {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#334155'/><circle cx='8' cy='8' r='2.5' fill='#f8fafc'/></svg>";
        }

        const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        this.eventSpriteCache[key] = uri;
        return uri;
    }

    appendFieldEventMarker(cell, evt) {
        if (!cell || !evt) return;
        const meta = this.getFieldEventMarkerMeta(evt.type);
        const marker = document.createElement('div');
        marker.className = `event-marker event-marker-${meta.key}`;
        marker.dataset.r = String(evt.r);
        marker.dataset.c = String(evt.c);
        marker.dataset.type = String(evt.type);
        marker.title = meta.title;
        const sprite = document.createElement('span');
        sprite.className = 'evt-sprite';
        sprite.style.backgroundImage = `url("${this.getFieldEventSpriteUrl(meta)}")`;
        const label = document.createElement('span');
        label.className = 'evt-label';
        label.innerText = meta.text;
        marker.appendChild(sprite);
        marker.appendChild(label);
        cell.appendChild(marker);
    }

    updateFieldBottomBar(type, r, c, info) {
        const bar = document.getElementById('field-bottom-bar');
        if (!bar) return;
        const detailsEl = bar.querySelector('#field-bottom-details');
        if (!detailsEl) return;

        if (type === null || type === undefined) {
            const labelNoTarget = this.tr('ui.field.no_target_selected', {}, 'No target selected');
            const labelCoord = this.tr('ui.field.coord', {}, 'Coord');
            const labelOwner = this.tr('ui.field.owner', {}, 'Owner');
            detailsEl.innerHTML = `
                <div class="field-bottom-single">
                    <div class="field-bottom-title">
                        <div class="field-bottom-icon">--</div>
                        <div class="field-bottom-name">${labelNoTarget}</div>
                    </div>
                    <div class="field-info-row"><span>${labelCoord}</span><span>-</span></div>
                    <div class="field-info-row"><span>${labelOwner}</span><span>-</span></div>
                </div>
            `;
            return;
        }
    }

    setFieldInfo(type, r, c) {
        const panel = document.getElementById('field-info-panel');
        if (!panel) return;
        if (type === null || type === undefined) {
            const noTargetTitle = this.tr('ui.field.no_target', {}, 'No target');
            const noTargetHelp = this.tr('ui.field.no_target_help', {}, 'Select a tile on the field map.');
            panel.classList.remove('open');
            panel.innerHTML = `<div class="field-info-title">${noTargetTitle}</div><div class="field-info-small">${noTargetHelp}</div>`;
            const wrap = document.getElementById('field-floating-wrap');
            if (wrap) wrap.style.display = 'none';
            const prev = document.querySelector('.field-selected');
            if (prev) prev.classList.remove('field-selected');
            this.currentFieldTargetKey = null;
            this.currentFieldTargetType = null;
            this.updateFieldBottomBar(null);
            return;
        }
        panel.classList.remove('open');
        panel.innerHTML = "";
        const targetKey = `${r},${c}`;
        const isNewTarget = this.currentFieldTargetKey !== targetKey || this.currentFieldTargetType !== type;
        this.currentFieldTargetKey = targetKey;
        this.currentFieldTargetType = type;
        if (isNewTarget) {
            const prev = document.querySelector('.field-selected');
            if (prev) prev.classList.remove('field-selected');
            const cell = document.getElementById(`field-cell-${r}-${c}`);
            if (cell) cell.classList.add('field-selected');
        }
        const info = this.getFieldObjectInfo(type, r, c);
        const title = `${info.name}${info.level !== "-" ? ` Lv.${info.level}` : ""}`;
        const iconEmoji = this.isKingCastleTile(r, c) ? "KG" : this.getFieldIconEmoji(type);
        const labelCoord = this.tr('ui.field.coord', {}, 'Coord');
        const labelOwner = this.tr('ui.field.owner', {}, 'Owner');
        const labelDefenders = this.tr('ui.field.defenders', {}, 'Defenders');
        const labelUnits = this.tr('ui.field.units', {}, 'Units');
        const labelTotalLevel = this.tr('ui.field.total_level', {}, 'Total level');
        const labelEffects = this.tr('ui.field.effects', {}, 'Effects');
        const effectSummaryParts = [];
        const objData = this.getFieldObjectData(type);
        if (objData && objData.abilities && objData.abilities.length > 0) {
            objData.abilities.forEach(ab => {
                const effectText = this.formatFieldAbilityEffect(ab.code, ab.value, { per3s: true, contextType: type });
                if (effectText) effectSummaryParts.push(effectText);
            });
        }
        if ((isShopTile(type) || isTavernTile(type)) && !effectSummaryParts.length) {
            const hourlyIncome = this.getFacilityHourlyGoldIncome(type);
            if (hourlyIncome > 0) {
                effectSummaryParts.push(this.tr('ui.field.effect.income_hourly', { value: hourlyIncome }, `Income +${hourlyIncome}G/h`));
            }
        }
        if (type === FIELD_EVENT_TYPES.DUNGEON) {
            effectSummaryParts.push(this.tr(
                'ui.field.effect.dungeon_entry',
                { gold: DUNGEON_ENTRY_GOLD_COST, energy: DUNGEON_ENTRY_ENERGY_COST, cp: DUNGEON_ENTRY_CP_COST },
                `Entry -${DUNGEON_ENTRY_GOLD_COST}G -${DUNGEON_ENTRY_ENERGY_COST}EN -${DUNGEON_ENTRY_CP_COST}CP`
            ));
            const remainingMs = this.getDungeonCooldownRemainingMs(r, c);
            if (remainingMs > 0) {
                effectSummaryParts.push(this.tr(
                    'ui.field.effect.dungeon_cooldown',
                    { time: this.formatDurationCompact(remainingMs) },
                    `Cooldown ${this.formatDurationCompact(remainingMs)}`
                ));
            }
        }
        if (this.isKingCastleTile(r, c)) {
            effectSummaryParts.push(this.tr('ui.field.effect.king_castle_established', {}, 'King Castle established'));
        }
        if (!effectSummaryParts.length) {
            if (isGateTile(type)) effectSummaryParts.push(this.tr('ui.field.effect.gate_access_unlocked', {}, 'Gate access unlocked'));
            if (isCitadelTile(type)) effectSummaryParts.push(this.tr('ui.field.effect.squad_slot', { value: 1 }, 'Squad slot +1'));
        }
        if (isStatueTile(type)) {
            const buff = this.getStatueBuff(type);
            if (buff) {
                effectSummaryParts.push(this.formatStatueBuffEffect(buff.kind, buff.value));
            }
        }
        const bar = document.getElementById('field-bottom-bar');
        if (bar) {
            const details = bar.querySelector('#field-bottom-details');
            if (details) {
                const defenders = info.defenders || [];
                const defenderCount = defenders.reduce((sum, d) => sum + (d.count || 0), 0);
                const totalLevel = (typeof info.level === "number" ? info.level : parseInt(info.level, 10) || 0) * defenderCount;
                const rightRows = [];
                if (defenderCount > 0) {
                    rightRows.push(`<div class="field-bottom-subtitle">${labelDefenders}</div>`);
                    rightRows.push(`<div class="field-info-row"><span>${labelUnits}</span><span>${defenderCount}</span></div>`);
                    rightRows.push(`<div class="field-info-row"><span>${labelTotalLevel}</span><span>${totalLevel}</span></div>`);
                }
                if (effectSummaryParts.length > 0) {
                    rightRows.push(`<div class="field-info-row field-bottom-effect-row"><span>${labelEffects}</span><span>${effectSummaryParts.join(", ")}</span></div>`);
                }
                const rightBlock = rightRows.length
                    ? `
                        <div class="field-bottom-col field-bottom-col-right">
                            ${rightRows.join("")}
                        </div>
                    `
                    : "";
                details.innerHTML = `
                    ${rightBlock
                        ? `
                            <div class="field-bottom-columns">
                                <div class="field-bottom-col field-bottom-col-left">
                                    <div class="field-bottom-title">
                                        <div class="field-bottom-icon">${iconEmoji}</div>
                                        <div class="field-bottom-name">${title}</div>
                                    </div>
                                    <div class="field-info-row"><span>${labelCoord}</span><span>${r},${c}</span></div>
                                    <div class="field-info-row field-bottom-owner-row"><span>${labelOwner}</span><span>${info.owner}</span></div>
                                </div>
                                ${rightBlock}
                            </div>
                        `
                        : `
                            <div class="field-bottom-single">
                                <div class="field-bottom-title">
                                    <div class="field-bottom-icon">${iconEmoji}</div>
                                    <div class="field-bottom-name">${title}</div>
                                </div>
                                <div class="field-info-row"><span>${labelCoord}</span><span>${r},${c}</span></div>
                                <div class="field-info-row"><span>${labelOwner}</span><span>${info.owner}</span></div>
                            </div>
                        `}
                `;
            }
        }
        this.updateFloatingPanelPosition(r, c);
        this.updateFieldBottomBar(type, r, c, info);
    }

    updateFloatingPanelPosition(r, c) {
        const wrap = document.getElementById('field-floating-wrap');
        if (!wrap) return;
        if (!this.movePreviewText) {
            wrap.style.display = 'none';
            return;
        }
        if (typeof r !== "number" || typeof c !== "number") {
            wrap.style.display = 'none';
            return;
        }
        wrap.style.display = 'flex';
    }

    updateFloatingPanelPositionFromSelection() {
        if (!this.currentFieldTargetKey) {
            this.updateFloatingPanelPosition();
            return;
        }
        const parts = this.currentFieldTargetKey.split(',');
        if (parts.length < 2) return;
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        if (Number.isNaN(r) || Number.isNaN(c)) return;
        this.updateFloatingPanelPosition(r, c);
    }

    applyFieldBuffsToStats(stats) {
        if (!stats) return stats;
        const buffs = this.fieldBuffs || { atk: 0, def: 0, hp: 0, spd: 0 };
        return {
            ...stats,
            hp: stats.hp ? Math.round(stats.hp * (1 + buffs.hp)) : stats.hp,
            atk: stats.atk ? Math.round(stats.atk * (1 + buffs.atk)) : stats.atk,
            def: stats.def ? Math.round(stats.def * (1 + buffs.def)) : stats.def,
            spd: stats.spd ? Math.round(stats.spd * (1 + buffs.spd)) : stats.spd
        };
    }

    hideFieldActionMenu() {
        const menu = document.getElementById('field-action-menu');
        if (menu) menu.remove();
    }

    showFieldActionMenu(r, c, type, clientX, clientY) {
        this.hideFieldActionMenu();
        const viewport = document.getElementById('map-viewport');
        if (!viewport) return;

        const moveBtn = document.createElement('button');
        moveBtn.className = 'field-action-btn';
        moveBtn.innerText = this.tr('ui.field.action.move', {}, 'Move');
        moveBtn.onclick = (e) => {
            e.stopPropagation();
            this.hideFieldActionMenu();
            if (this.selectedArmyId !== null) {
                this.exitMoveTargetMode();
                this.commandArmy(this.selectedArmyId, r, c, type);
            } else {
                this.showToast(this.tr('toast.select_army_first', {}, 'Select a squad first'));
            }
        };

        const key = `${r},${c}`;
        const menu = document.createElement('div');
        menu.id = 'field-action-menu';
        menu.className = 'field-action-menu';
        menu.appendChild(moveBtn);

        let extraActionCount = 0;
        if (isGoldMineTile(type)) {
            const btn = document.createElement('button');
            btn.className = 'field-action-btn';
            btn.innerText = this.tr('ui.field.action.collect_gold', {}, 'Collect Gold');
            btn.onclick = (e) => { e.stopPropagation(); this.collectFieldResource(type, r, c); };
            if (!this.occupiedTiles.has(key)) btn.classList.add('disabled');
            menu.appendChild(btn);
            extraActionCount++;
        }
        if (isFountainTile(type)) {
            const btn = document.createElement('button');
            btn.className = 'field-action-btn';
            btn.innerText = this.tr('ui.field.action.collect_energy', {}, 'Collect Energy');
            btn.onclick = (e) => { e.stopPropagation(); this.collectFieldResource(type, r, c); };
            if (!this.occupiedTiles.has(key)) btn.classList.add('disabled');
            menu.appendChild(btn);
            extraActionCount++;
        }
        if (isShopTile(type)) {
            const btn = document.createElement('button');
            btn.className = 'field-action-btn';
            btn.innerText = this.tr('ui.field.action.open_shop', {}, 'Open Shop');
            btn.onclick = (e) => { e.stopPropagation(); this.openShopOrTavern(type, r, c); };
            if (!this.occupiedTiles.has(key)) btn.classList.add('disabled');
            menu.appendChild(btn);
            extraActionCount++;
        }
        if (isTavernTile(type)) {
            const btn = document.createElement('button');
            btn.className = 'field-action-btn';
            btn.innerText = this.tr('ui.field.action.open_tavern', {}, 'Open Tavern');
            btn.onclick = (e) => { e.stopPropagation(); this.openShopOrTavern(type, r, c); };
            if (!this.occupiedTiles.has(key)) btn.classList.add('disabled');
            menu.appendChild(btn);
            extraActionCount++;
        }

        if (type === FIELD_EVENT_TYPES.CARAVAN) {
            const btn = document.createElement('button');
            btn.className = 'field-action-btn';
            btn.innerText = this.tr('ui.field.action.caravan', {}, 'Caravan');
            btn.onclick = (e) => { e.stopPropagation(); this.openCaravanShop(r, c); };
            menu.appendChild(btn);
            extraActionCount++;
        }
        if (type === FIELD_EVENT_TYPES.PORTAL) {
            const btn = document.createElement('button');
            btn.className = 'field-action-btn';
            btn.innerText = this.tr('ui.field.action.portal', {}, 'Portal');
            btn.onclick = (e) => { e.stopPropagation(); this.openPortalModal(r, c); };
            menu.appendChild(btn);
            extraActionCount++;
        }
        const canAttackTarget = this.isHostileTarget(type, r, c);
        if (canAttackTarget) {
            const btn = document.createElement('button');
            btn.className = 'field-action-btn';
            btn.innerText = this.tr('ui.field.action.attack', {}, 'Attack');
            btn.onclick = (e) => {
                e.stopPropagation();
                this.hideFieldActionMenu();

                // If no army selected, try to select the nearest available army? 
                // Currently prompts user to select.
                if (this.selectedArmyId !== null) {
                    const army = this.armies[this.selectedArmyId];
                    const dr = Math.abs(army.r - r);
                    const dc = Math.abs(army.c - c);
                    // CHANGED: Allow diagonal attack (Chebyshev distance <= 1)
                    if (dr <= 1 && dc <= 1) {
                        this.openBattlePrepModal(type, r, c);
                    } else {
                        this.showToast(this.tr('toast.target_need_adjacent', {}, 'Target is out of range (need adjacent)'));
                    }
                } else {
                    this.showToast(this.tr('toast.select_army_first', {}, 'Select a squad first'));
                }
            };
            menu.appendChild(btn);
            extraActionCount++;
        }

        if (extraActionCount === 0) {
            moveBtn.onclick({ stopPropagation: () => { } });
            return;
        }
        viewport.appendChild(menu);

        const rect = viewport.getBoundingClientRect();
        let x = clientX - rect.left;
        let y = clientY - rect.top;
        const menuW = 110, menuH = 80;
        const clampPos = (pos) => ({
            x: Math.min(rect.width - menuW - 8, Math.max(8, pos.x)),
            y: Math.min(rect.height - menuH - 8, Math.max(8, pos.y))
        });

        const candidates = [
            { x: x + 8, y: y - 8 },
            { x: x - menuW - 8, y: y - 8 },
            { x: x - menuW / 2, y: y + 10 },
            { x: x - menuW / 2, y: y - menuH - 10 }
        ];

        let finalPos = clampPos(candidates[0]);
        const wrap = document.getElementById('field-floating-wrap');
        if (wrap && wrap.style.display !== 'none') {
            const wrapRect = wrap.getBoundingClientRect();
            const wr = {
                left: wrapRect.left - rect.left,
                top: wrapRect.top - rect.top,
                right: wrapRect.right - rect.left,
                bottom: wrapRect.bottom - rect.top
            };
            const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            for (const cand of candidates) {
                const pos = clampPos(cand);
                const mr = { left: pos.x, top: pos.y, right: pos.x + menuW, bottom: pos.y + menuH };
                if (!intersects(mr, wr)) { finalPos = pos; break; }
            }
        }

        menu.style.left = `${finalPos.x}px`;
        menu.style.top = `${finalPos.y}px`;
    }

    refreshFieldMapVisuals() {
        const mapLayer = document.getElementById('map-layer');
        if (!mapLayer) return false;
        const reachable = this.buildReachableTiles();
        const appendCloudLayer = (cell, r, c, type) => {
            if (isGateTile(type) || isCitadelTile(type) || isWallTile(type)) return;
            const layer = document.createElement('div');
            layer.className = 'field-cloud-layer';
            cell.appendChild(layer);
        };

        for (let r = 0; r < MAP_SIZE; r++) {
            for (let c = 0; c < MAP_SIZE; c++) {
                const cell = document.getElementById(`field-cell-${r}-${c}`);
                if (!cell) continue;
                const type = FIELD_MAP_DATA[r][c];
                const key = `${r},${c}`;
                const isOccupied = this.occupiedTiles.has(key);
                const evt = this.fieldEvents[key];
                const isVisible = this.visibilityMap.has(key) || !!evt || isDragonTile(type);
                const isReachable = reachable.has(key);
                let isAdjacent = false;
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                if (!isOccupied) {
                    for (let d of dirs) {
                        const nr = r + d[0], nc = c + d[1];
                        if (this.occupiedTiles.has(`${nr},${nc}`)) { isAdjacent = true; break; }
                    }
                }

                cell.className = 'field-cell';
                cell.innerHTML = '';
                cell.style.backgroundImage = '';
                cell.style.backgroundSize = '';
                cell.style.backgroundRepeat = '';
                cell.style.backgroundPosition = '';
                cell.style.opacity = '';

                if (!isVisible) {
                    cell.classList.add('field-fog');
                    appendCloudLayer(cell, r, c, type);
                    continue;
                }

                let color = 'rgba(0, 0, 0, 0)';
                if (isWallTile(type)) { color = '#2b2b2b'; cell.classList.add('field-wall'); }
                else if (isCastleTile(type)) { color = '#4285f4'; cell.classList.add('field-castle'); }
                else if (isGateTile(type)) { color = '#ea4335'; cell.classList.add('field-gate'); if (isOccupied) cell.classList.add('unlocked'); else cell.classList.add('locked'); }
                else if (isCitadelTile(type)) { color = '#fbbc05'; cell.classList.add('field-citadel'); }
                else if (isDragonTile(type)) { color = '#b71c1c'; cell.classList.add('field-dragon'); }
                else if (isGoldMineTile(type)) { color = '#6d4c41'; cell.classList.add('field-goldmine'); }
                else if (isFountainTile(type)) { color = '#0ea5e9'; cell.classList.add('field-fountain'); }
                else if (isShopTile(type)) { color = '#2563eb'; cell.classList.add('field-shop'); }
                else if (isTavernTile(type)) { color = '#7c3aed'; cell.classList.add('field-tavern'); }
                else if (isRuinsTile(type)) { color = '#9ca3af'; cell.classList.add('field-ruins'); }
                else if (isStatueTile(type)) { color = '#94a3b8'; cell.classList.add('field-statue'); }
                else if (isTerrainCode(type)) {
                    const base = getTerrainBase(type);
                    const isBorder = type % 100 === 1;
                    color = (isBorder ? TERRAIN_COLORS_BORDER[base] : TERRAIN_COLORS[base]) || '#2e3b23';
                } else if (type === 4) {
                    color = 'rgba(139, 69, 19, 0.4)';
                } else {
                    const base = FIELD_TERRAIN_DATA?.[r]?.[c];
                    if (isTerrainCode(base)) {
                        const baseType = getTerrainBase(base);
                        const isBorder = base % 100 === 1;
                        color = (isBorder ? TERRAIN_COLORS_BORDER[baseType] : TERRAIN_COLORS[baseType]) || '#2e3b23';
                    } else {
                        color = 'transparent';
                    }
                }

                cell.style.backgroundColor = color;

                const isKnownObject = isWallTile(type) || isCastleTile(type) || isGateTile(type) || isCitadelTile(type) || isDragonTile(type)
                    || isGoldMineTile(type) || isFountainTile(type) || isShopTile(type) || isTavernTile(type)
                    || isRuinsTile(type) || isStatueTile(type);
                if (!isTerrainCode(type) && !isKnownObject) {
                    const icon = this.assets.getImage(String(type));
                    if (icon && icon.src) {
                        cell.style.backgroundImage = `url(${icon.src})`;
                        cell.style.backgroundSize = 'contain';
                        cell.style.backgroundRepeat = 'no-repeat';
                        cell.style.backgroundPosition = 'center';
                    }
                }

                if (isOccupied) {
                    cell.classList.add('field-occupied');
                    cell.style.opacity = 1.0;
                } else if (isAdjacent) {
                    cell.classList.add('field-adjacent');
                    cell.style.opacity = 0.6;
                } else {
                    cell.style.opacity = 1.0;
                }

                if (!isReachable && !isOccupied) {
                    cell.classList.add('field-cloud-blocked');
                    appendCloudLayer(cell, r, c, type);
                }

                if (this.currentFieldTargetKey === key) cell.classList.add('field-selected');

                const badge = this.buildFieldBadge(type, isOccupied, r, c);
                if (badge) cell.appendChild(badge);
                this.appendFieldEventMarker(cell, evt);
            }
        }

        if (this.previewPath) this.applyPathPreview(this.previewPath);
        if (this.moveTargetMode) this.renderMoveTimeOverlay();
        this.updateFloatingPanelPositionFromSelection();
        return true;
    }
    renderFieldMap() {
        const modal = document.getElementById('field-modal'); const content = document.getElementById('modal-content'); const title = document.getElementById('modal-title');
        modal.hidden = false;
        modal.dataset.mode = 'field'; modal.classList.add('open'); title.innerText = this.tr('ui.modal.field_title', {}, "World Map (Field)"); content.innerHTML = ""; content.style.overflow = "hidden";
        content.style.position = "relative";
        content.style.display = "block";
        content.style.height = "100%";

        const viewport = document.createElement('div'); viewport.id = 'map-viewport'; viewport.style.position = 'absolute'; viewport.style.inset = '0'; viewport.style.width = '100%'; viewport.style.height = '100%'; viewport.style.overflow = 'hidden';
        viewport.style.backgroundColor = '#2e3b23';
        viewport.style.touchAction = 'none';
        viewport.onclick = (e) => { if (e.target === viewport) this.hideFieldActionMenu(); };
        content.appendChild(viewport);

        const overlay = document.createElement('div');
        overlay.className = 'field-overlay';

        const headerDiv = document.createElement('div'); headerDiv.className = "flex justify-between items-center bg-gray-700 px-2 py-1 rounded text-[11px] shadow-md";
        const incomeSign = this.income >= 0 ? "+" : "";
        const occupiedLabel = this.tr('ui.field.header.occupied', {}, 'Occupied');
        const incomeLabel = this.tr('ui.field.header.income', {}, 'Income');
        const cpLabel = this.tr('ui.field.header.cp', {}, 'CP');
        const per3secLabel = this.tr('ui.field.header.per_3sec', {}, '/3sec');
        headerDiv.innerHTML = `<div>${occupiedLabel}: <span class="text-white font-bold">${this.occupiedTiles.size}</span></div><div>${incomeLabel}: <span class="text-yellow-400 font-bold">${incomeSign}${this.income}${per3secLabel}</span></div><div>${cpLabel}: <span id="field-cp-display" class="text-white font-bold">${this.cp}/${this.maxCp}</span></div>`;
        overlay.appendChild(headerDiv);

        const squadTabs = document.createElement('div');
        squadTabs.className = 'field-squad-tabs';
        this.getAvailableArmies().forEach(army => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'field-squad-tab';
            btn.dataset.armyId = String(army.id);
            if (this.selectedArmyId === army.id) btn.classList.add('active');
            btn.style.borderColor = army.color;
            const squadLabel = this.tr('ui.squad.label', {}, 'Squad');
            btn.innerText = `${squadLabel} ${army.id + 1}`;
            btn.onclick = (e) => {
                e.stopPropagation();
                this.hideFieldActionMenu();
                this.enterMoveTargetMode(army.id, { center: true });
            };
            squadTabs.appendChild(btn);
        });
        overlay.appendChild(squadTabs);

        const effectLog = document.createElement('div');
        effectLog.id = 'field-effect-log';
        effectLog.className = 'field-effect-log';
        overlay.appendChild(effectLog);

        const floatingWrap = document.createElement('div');
        floatingWrap.id = 'field-floating-wrap';
        floatingWrap.className = 'field-floating-wrap';

        const moveInfo = document.createElement('div'); moveInfo.id = 'field-move-info'; moveInfo.className = 'field-move-info';
        moveInfo.style.display = 'none';
        moveInfo.onclick = () => { if (this.moveTargetMode) this.exitMoveTargetMode(); };
        floatingWrap.appendChild(moveInfo);

        const infoPanel = document.createElement('div'); infoPanel.id = 'field-info-panel'; infoPanel.className = 'field-info-panel';
        infoPanel.style.display = 'none';
        floatingWrap.appendChild(infoPanel);

        overlay.appendChild(floatingWrap);
        content.appendChild(overlay);

        const mapLayer = document.createElement('div'); mapLayer.id = 'map-layer'; mapLayer.style.position = 'absolute'; mapLayer.style.transformOrigin = '0 0'; mapLayer.style.display = 'grid'; mapLayer.style.gridTemplateColumns = `repeat(${MAP_SIZE}, 12px)`; mapLayer.style.gap = '1px'; mapLayer.style.padding = '50px';
        const mapSizePx = (MAP_SIZE * 13 - 1) + 100;
        const pathOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        pathOverlay.setAttribute('id', 'path-overlay');
        pathOverlay.setAttribute('width', mapSizePx);
        pathOverlay.setAttribute('height', mapSizePx);
        pathOverlay.setAttribute('viewBox', `0 0 ${mapSizePx} ${mapSizePx}`);
        mapLayer.appendChild(pathOverlay);
        this.pathOverlay = pathOverlay;

        const bgImg = this.assets.getImage('field_bg');
        if (bgImg && bgImg.src) {
            mapLayer.style.backgroundImage = `url(${bgImg.src})`;
        } else {
            mapLayer.style.backgroundImage = `url(${this.grassTexture})`;
        }
        mapLayer.style.backgroundRepeat = 'repeat';

        const armyLayer = document.createElement('div'); armyLayer.id = 'army-layer'; armyLayer.style.position = 'absolute'; armyLayer.style.top = '0'; armyLayer.style.left = '0'; armyLayer.style.width = '100%'; armyLayer.style.height = '100%'; armyLayer.style.pointerEvents = 'none'; armyLayer.style.zIndex = '50'; mapLayer.appendChild(armyLayer);

        this.getAvailableArmies().forEach(army => {
            const marker = document.createElement('div');
            marker.className = 'army-marker';
            if (this.selectedArmyId === army.id) marker.classList.add('selected');
            marker.id = `army-marker-${army.id}`;

            const squadData = this.getSquadByArmyId(army.id);
            let maxLevel = -1;
            let bestUnit = null;

            squadData.forEach(u => {
                if (u && u.level > maxLevel) {
                    maxLevel = u.level;
                    bestUnit = u;
                }
            });

            if (bestUnit) {
                const img = this.assets.getImage(bestUnit.type, bestUnit.level);
                if (img && img.src) {
                    marker.style.backgroundImage = `url(${img.src})`;
                    marker.innerText = "";
                } else {
                    marker.style.backgroundColor = army.color;
                    marker.innerText = army.id + 1;
                }
            } else {
                marker.style.backgroundColor = army.color;
                marker.innerText = army.id + 1;
            }

            const TILE_SIZE = 13, x = 50 + (army.c * TILE_SIZE), y = 50 + (army.r * TILE_SIZE); marker.style.transform = `translate(${x}px, ${y}px)`; armyLayer.appendChild(marker);
        });

        const reachable = this.buildReachableTiles();

        const appendCloudLayer = (cell, r, c, type) => {
            const evt = this.fieldEvents[`${r},${c}`];
            if (isGateTile(type) || isCitadelTile(type) || isWallTile(type) || isDragonTile(type)) return; // Fix: Dragon is static, explicit check needed
            if (evt) return; // VISIBILITY FIX: Reveal all known events through cloud.

            const layer = document.createElement('div');
            layer.className = 'field-cloud-layer';
            cell.appendChild(layer);
        };

        for (let r = 0; r < MAP_SIZE; r++) {
            for (let c = 0; c < MAP_SIZE; c++) {
                const cell = document.createElement('div'); cell.className = 'field-cell'; cell.id = `field-cell-${r}-${c}`;
                const type = FIELD_MAP_DATA[r][c], key = `${r},${c}`, isOccupied = this.occupiedTiles.has(key);
                const evt = this.fieldEvents[key];
                // Fix: Events and Dragon are always visible
                const isVisible = this.visibilityMap.has(key) || !!evt || isDragonTile(type);

                const isReachable = reachable.has(key);
                let isAdjacent = false; const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                if (!isOccupied) { for (let d of dirs) { const nr = r + d[0], nc = c + d[1]; if (this.occupiedTiles.has(`${nr},${nc}`)) { isAdjacent = true; break; } } }

                if (!isVisible) {
                    cell.classList.add('field-fog');
                    appendCloudLayer(cell, r, c, type);
                    mapLayer.appendChild(cell);
                    continue;
                }

                let color = 'rgba(0, 0, 0, 0)';
                if (isWallTile(type)) { color = '#2b2b2b'; cell.classList.add('field-wall'); }
                else if (isCastleTile(type)) { color = '#4285f4'; cell.classList.add('field-castle'); }
                else if (isGateTile(type)) { color = '#ea4335'; cell.classList.add('field-gate'); if (isOccupied) cell.classList.add('unlocked'); else cell.classList.add('locked'); }
                else if (isCitadelTile(type)) { color = '#fbbc05'; cell.classList.add('field-citadel'); }
                else if (isDragonTile(type)) { color = '#b71c1c'; cell.classList.add('field-dragon'); }
                else if (isGoldMineTile(type)) { color = '#6d4c41'; cell.classList.add('field-goldmine'); }
                else if (isFountainTile(type)) { color = '#0ea5e9'; cell.classList.add('field-fountain'); }
                else if (isShopTile(type)) { color = '#2563eb'; cell.classList.add('field-shop'); }
                else if (isTavernTile(type)) { color = '#7c3aed'; cell.classList.add('field-tavern'); }
                else if (isRuinsTile(type)) { color = '#9ca3af'; cell.classList.add('field-ruins'); }
                else if (isStatueTile(type)) { color = '#94a3b8'; cell.classList.add('field-statue'); }
                else if (isTerrainCode(type)) {
                    const base = getTerrainBase(type);
                    const isBorder = type % 100 === 1;
                    color = (isBorder ? TERRAIN_COLORS_BORDER[base] : TERRAIN_COLORS[base]) || '#2e3b23';
                } else if (type === 4) { color = 'rgba(139, 69, 19, 0.4)'; }
                else {
                    const base = FIELD_TERRAIN_DATA?.[r]?.[c];
                    if (isTerrainCode(base)) {
                        const baseType = getTerrainBase(base);
                        const isBorder = base % 100 === 1;
                        color = (isBorder ? TERRAIN_COLORS_BORDER[baseType] : TERRAIN_COLORS[baseType]) || '#2e3b23';
                    } else {
                        color = 'transparent';
                    }
                }

                cell.style.backgroundColor = color;

                const isKnownObject = isWallTile(type) || isCastleTile(type) || isGateTile(type) || isCitadelTile(type) || isDragonTile(type)
                    || isGoldMineTile(type) || isFountainTile(type) || isShopTile(type) || isTavernTile(type)
                    || isRuinsTile(type) || isStatueTile(type);
                if (!isTerrainCode(type) && !isKnownObject) {
                    const icon = this.assets.getImage(String(type));
                    if (icon && icon.src) {
                        cell.style.backgroundImage = `url(${icon.src})`;
                        cell.style.backgroundSize = 'contain';
                        cell.style.backgroundRepeat = 'no-repeat';
                        cell.style.backgroundPosition = 'center';
                    }
                }

                if (isOccupied) {
                    cell.classList.add('field-occupied');
                    cell.style.opacity = 1.0;
                } else if (isAdjacent) {
                    cell.classList.add('field-adjacent');
                    cell.style.opacity = 0.6;
                } else {
                    cell.style.opacity = 1.0;
                }

                if (!isReachable && !isOccupied) {
                    cell.classList.add('field-cloud-blocked');
                    appendCloudLayer(cell, r, c, type);
                }

                if (this.currentFieldTargetKey === key) cell.classList.add('field-selected');

                const badge = this.buildFieldBadge(type, isOccupied, r, c);
                if (badge) cell.appendChild(badge);
                this.appendFieldEventMarker(cell, evt);

                // Additional marker classes handled above

                cell.onclick = (e) => {
                    e.stopPropagation();
                    if (!this.isDraggingMap) {
                        if (this.moveTargetMode) {
                            this.handleMoveTargetClick(r, c, type);
                            return;
                        }
                        const displayType = evt ? evt.type : type;
                        this.setFieldInfo(displayType, r, c);
                        this.showFieldActionMenu(r, c, displayType, e.clientX, e.clientY);
                    }
                };

                mapLayer.appendChild(cell);
            }
        }
        viewport.appendChild(mapLayer);

        const bottomBar = document.createElement('div');
        bottomBar.id = 'field-bottom-bar';
        bottomBar.className = 'field-bottom-bar';
        const chatLabel = this.tr('ui.footer.chat', {}, 'Chat');
        const mergeLabel = this.tr('ui.footer.merge', {}, 'Merge');
        bottomBar.innerHTML = `
            <button class="action-btn field-footer-btn chat-btn" onclick="game.toggleChat()">
                <span class="btn-icon">&#128172;</span>
                <span class="btn-label">${chatLabel}</span>
            </button>
            <div class="field-bottom-center">
                <div id="field-bottom-details" class="field-bottom-details"></div>
            </div>
            <button class="action-btn field-footer-btn build-btn" onclick="game.toggleField()">
                <span class="btn-icon">&#127968;</span>
                <span class="btn-label">${mergeLabel}</span>
            </button>
        `;
        viewport.appendChild(bottomBar);
        this.setMovePreview(this.movePreviewText);
        this.renderEffectLog();
        if (this.currentFieldTargetKey) {
            const [tr, tc] = this.currentFieldTargetKey.split(',').map(Number);
            if (!Number.isNaN(tr) && !Number.isNaN(tc) && FIELD_MAP_DATA?.[tr]?.[tc] !== undefined) {
                this.setFieldInfo(FIELD_MAP_DATA[tr][tc], tr, tc);
            } else {
                this.setFieldInfo(null);
            }
        } else {
            this.setFieldInfo(null);
        }
        if (this.previewPath) this.applyPathPreview(this.previewPath);
        if (this.moveTargetMode) this.renderMoveTimeOverlay();
        this.initFieldCamera(viewport, mapLayer);
    }

    deselectArmy() {
        this.selectedArmyId = null;
        this.exitMoveTargetMode();
        this.updateSelectedArmyUI();
        this.renderFieldMap();
    }

    getArmyMoveInfo(armyOrId, targetR, targetC) {
        const army = typeof armyOrId === 'number' ? this.armies?.[armyOrId] : armyOrId;
        if (!army) return { canMove: false, reason: 'NO_ARMY' };
        if (!Number.isFinite(targetR) || !Number.isFinite(targetC)) return { canMove: false, reason: 'INVALID_TARGET' };
        if (!FIELD_MAP_DATA?.[targetR] || FIELD_MAP_DATA[targetR][targetC] === undefined) return { canMove: false, reason: 'OUT_OF_MAP' };
        if (army.state !== 'IDLE') return { canMove: false, reason: 'ARMY_MOVING' };

        const tileType = FIELD_MAP_DATA[targetR][targetC];
        const regionId = this.getArmyRegionId(army);
        const squadData = this.getSquadByArmyId(army.id) || army.units || [];
        const stats = this.getSquadStats(squadData);
        if (stats.power < 10) return { canMove: false, reason: 'NOT_ENOUGH_TROOPS', stats };

        const path = AStar.findPath(
            { r: army.r, c: army.c },
            { r: targetR, c: targetC },
            FIELD_MAP_DATA,
            this.occupiedTiles,
            (cur, nr, nc, type, isOcc, isTarget) => this.isTileBlocked(cur, nr, nc, type, isOcc, isTarget, regionId)
        );
        if (!path) return { canMove: false, reason: 'NO_PATH', stats };

        const dist = Math.max(0, path.length - 1);
        if (dist > stats.range) return { canMove: false, reason: 'OUT_OF_RANGE', dist, stats };

        const moveCosts = this.getMoveCostsByRule(tileType);
        const summary = this.getPathSummary(path, stats.speedFactor);

        return {
            canMove: this.energy >= moveCosts.energyCost && this.gold >= moveCosts.goldCost && this.cp >= moveCosts.cpCost,
            reason: null,
            tileType,
            path,
            dist,
            cpCost: moveCosts.cpCost,
            energyCost: moveCosts.energyCost,
            goldCost: moveCosts.goldCost,
            timeMin: summary.finalMin,
            stats
        };
    }

    commandArmy(armyId, targetR, targetC, tileType) {
        if (this.guardWorldAction(this.tr('ui.field.action.move', {}, 'Move'))) return;
        const army = this.armies[armyId];
        if (army.state !== 'IDLE') { this.showToast(this.tr('toast.army_moving', {}, 'Army is already moving')); return; }
        const regionId = this.getArmyRegionId(army);
        this.lastSelectedArmyId = armyId;
        const moveCosts = this.getMoveCostsByRule(tileType);

        const squadData = this.getSquadByArmyId(army.id);
        const stats = this.getSquadStats(squadData);

        if (stats.power < 10) { this.showToast(this.tr('toast.army_power_short', {}, 'Not enough troops')); return; }

        const path = AStar.findPath(
            { r: army.r, c: army.c },
            { r: targetR, c: targetC },
            FIELD_MAP_DATA,
            this.occupiedTiles,
            (cur, nr, nc, type, isOcc, isTarget) => this.isTileBlocked(cur, nr, nc, type, isOcc, isTarget, regionId)
        );

        if (!path) { this.showToast(this.tr('toast.no_path', {}, 'No valid route')); return; }
        const dist = path.length - 1;
        if (dist > stats.range) { this.showToast(this.tr('toast.range_over', { dist, range: stats.range }, `Out of range (${dist}/${stats.range})`)); return; }
        if (this.cp < moveCosts.cpCost) { this.showToast(this.tr('toast.cp_short_cost', { cost: moveCosts.cpCost }, `Not enough CP (${moveCosts.cpCost})`)); return; }

        this.startMarch(
            armyId,
            targetR,
            targetC,
            tileType,
            moveCosts.energyCost,
            moveCosts.goldCost,
            moveCosts.cpCost,
            path,
            stats.speedFactor
        );
    }

    getSquadStats(squadData) {
        let count = 0, totalMov = 0, minMov = 99;
        squadData.forEach(u => {
            if (u) {
                count++;
                const stats = getData(u.type, u.level);
                if (stats.mov) {
                    totalMov += stats.mov;
                    minMov = Math.min(minMov, stats.mov);
                }
            }
        });
        if (count === 0) return { power: 0, range: 0, speedFactor: 1 };

        const baseRange = 4;
        const range = baseRange + (minMov * 2);
        const baseSpeedFactor = Math.max(0.5, 1 - (minMov - 1) * 0.2);
        const spdBuff = this.fieldBuffs?.spd || 0;
        const speedFactor = Math.max(0.3, baseSpeedFactor * (1 - spdBuff));

        return { power: this.getSquadPower(squadData), range, speedFactor };
    }

    getHighestBuildingLevel(unitType) {
        let buildingType = -1;
        if (unitType === ITEM_TYPE.UNIT_INFANTRY) buildingType = ITEM_TYPE.BUILDING_BARRACKS;
        else if (unitType === ITEM_TYPE.UNIT_ARCHER) buildingType = ITEM_TYPE.BUILDING_RANGE;
        else if (unitType === ITEM_TYPE.UNIT_CAVALRY) buildingType = ITEM_TYPE.BUILDING_STABLE;

        if (buildingType === -1) return 10;

        let maxLvl = 0;
        for (let r = 0; r < CONFIG.gridRows; r++) {
            for (let c = 0; c < CONFIG.gridCols; c++) {
                const item = this.grid[r][c];
                if (item && item.type === buildingType) {
                    maxLvl = Math.max(maxLvl, item.level);
                }
            }
        }
        return maxLvl || 1;
    }

    isHostileTarget(type, r, c) {
        const worldRule = this.getWorldRuleSet();
        if (type === FIELD_EVENT_TYPES.BANDIT || type === FIELD_EVENT_TYPES.BANDIT_LEADER || type === FIELD_EVENT_TYPES.DUNGEON || type === FIELD_EVENT_TYPES.CROWN) {
            return !!worldRule.allowHostileEventAttack;
        }
        const isCapturable = this.isCapturableFieldObject(type);
        if (isCapturable && !this.occupiedTiles.has(`${r},${c}`)) {
            return !!worldRule.allowCapturableAttack;
        }
        return false;
    }

    startMarch(armyId, r, c, type, energyCost, goldCost, cpCost, path, speedFactor) {
        if (this.guardWorldAction(this.tr('ui.field.action.move', {}, 'Move'))) return;
        if (this.energy < energyCost) { this.showToast(this.tr('toast.energy_short_cost', { cost: energyCost }, `Not enough energy (${energyCost})`)); return; }
        if (this.gold < goldCost) { this.showToast(this.tr('toast.gold_short_cost', { cost: goldCost }, `Not enough gold (${goldCost})`)); return; }
        if (this.cp < cpCost) { this.showToast(this.tr('toast.cp_short_cost', { cost: cpCost }, `Not enough CP (${cpCost})`)); return; }

        this.energy -= energyCost; this.gold -= goldCost; this.cp -= cpCost; this.updateUI();
        this.clearPathPreview();
        this.setMovePreview("");

        const army = this.armies[armyId];
        army.state = 'MOVING_TO';

        // Attack Move Logic: If hostile, stop 1 tile short
        if (this.isHostileTarget(type, r, c) && path.length > 1) {
            // Keep the full path in a temp prop if needed, or just pop
            // army.target still holds the real destination
            path.pop();
        }

        army.path = path;
        army.stepTimes = this.buildStepTimes(path, speedFactor);
        army.nextStepIndex = 1; // Start from 1 (0 is current pos)
        army.moveInterval = Math.max(30, Math.floor(3 * MOVE_MS_PER_MIN));
        army.lastMoveTime = Date.now();
        army.target = { r, c, type };

        this.showToast(this.tr('toast.army_march_start', { army: army.name }, `${army.name} march started`));
        this.sound.playSpawn();
    }

    updateArmies() {
        const now = Date.now();
        const TILE_SIZE = 13;

        this.armies.forEach(army => {
            const el = document.getElementById(`army-marker-${army.id}`);
            if (el) {
                const x = 50 + (army.c * TILE_SIZE);
                const y = 50 + (army.r * TILE_SIZE);
                el.style.transform = `translate(${x}px, ${y}px)`;
            }

            if (army.state === 'IDLE') return;

            if (army.state === 'MOVING_TO') {
                const stepTime = (army.stepTimes && army.stepTimes[army.nextStepIndex]) ? army.stepTimes[army.nextStepIndex] : army.moveInterval;
                if (now - army.lastMoveTime >= stepTime) {
                    army.lastMoveTime = now;
                    if (army.nextStepIndex < army.path.length) {
                        const nextPos = army.path[army.nextStepIndex];
                        army.r = nextPos.r;
                        army.c = nextPos.c;
                        army.nextStepIndex++;
                        this.revealFog(army.r, army.c, FOG_RADIUS);
                    } else {
                        this.handleArrival(army);
                    }
                }
            }
        });
    }

    handleArrival(army) {
        if (!army || !army.target) return;
        const { r, c, type } = army.target;

        // Check if we stopped at adjacent tile for attack
        // REMOVED: Auto-battle triggering. Instead, we let it fall through to open the Menu.

        // --- FIELD EVENT INTERACTION ---
        const eventKey = `${r},${c}`;
        const event = this.fieldEvents[eventKey];
        if (event) {
            army.state = 'IDLE';
            this.saveGame();

            if (event.type === FIELD_EVENT_TYPES.BANDIT || event.type === FIELD_EVENT_TYPES.BANDIT_LEADER || event.type === FIELD_EVENT_TYPES.DUNGEON || event.type === FIELD_EVENT_TYPES.CROWN) {
                // Open Menu instead of auto-battle
                setTimeout(() => {
                    const cell = document.getElementById(`field-cell-${r}-${c}`);
                    if (cell) {
                        const rect = cell.getBoundingClientRect();
                        this.setFieldInfo(event.type, r, c);
                        this.showFieldActionMenu(r, c, event.type, rect.left + rect.width / 2, rect.top + rect.height / 2);
                    }
                }, 100);
                return;
            } else if (event.type === FIELD_EVENT_TYPES.PORTAL) {
                this.openPortalModal(r, c, army.id);
                return;
            } else if (event.type === FIELD_EVENT_TYPES.CARAVAN) {
                this.openCaravanShop(r, c);
                return;
            }
            // Caravan opens menu via click usually, but if arrival triggers it?
            // Only auto-trigger for Hostile.
        }

        let mapChanged = false;
        if (isBorderTerrain(type)) {
            this.showToast(this.tr('toast.reached_border', {}, 'Reached border'));
        } else if (this.isHostileTarget(type, r, c)) {
            army.state = 'IDLE'; // Stop moving
            this.saveGame();

            // Open Floating Menu at cell position
            setTimeout(() => {
                const cell = document.getElementById(`field-cell-${r}-${c}`);
                if (cell) {
                    const rect = cell.getBoundingClientRect();
                    this.setFieldInfo(type, r, c);
                    this.showFieldActionMenu(r, c, type, rect.left + rect.width / 2, rect.top + rect.height / 2);
                }
            }, 100);
            return;
        } else if (this.isCapturableFieldObject(type)) {
            this.showToast(this.tr('toast.army_arrived', { army: army.name }, `${army.name} arrived`));
        } else {
            this.showToast(this.tr('toast.army_arrived', { army: army.name }, `${army.name} arrived`));
        }

        const collectibleInfo = this.getCollectibleFieldItemInfo(type);
        if (collectibleInfo && this.canCollectFieldObject(r, c)) {
            const item = this.createMergeItemFromInfo(collectibleInfo);
            if (this.spawnItem(item)) {
                this.clearFieldObjectFromMap(r, c);
                if (this.fieldObjectState) {
                    if (!this.fieldObjectState.regenByCode) this.fieldObjectState.regenByCode = {};
                    this.fieldObjectState.regenByCode[type] = Date.now();
                }
                mapChanged = true;
                this.sound.playCollect();
                this.showToast(this.tr('toast.collect_done', {}, 'Collected'));
            } else {
                this.showToast(this.tr('toast.merge_slot_short', {}, 'Not enough merge slot space'));
                this.setMovePreview(this.tr('ui.field.merge_slots_full', {}, 'Merge slots are full'));
                setTimeout(() => {
                    if (!this.moveTargetMode) this.setMovePreview("");
                }, 1500);
            }
        }

        if (mapChanged) this.updateOpenBorders();
        if (mapChanged && document.getElementById('field-modal').classList.contains('open')) {
            if (!this.refreshFieldMapVisuals()) {
                this.renderFieldMap();
            } else if (this.currentFieldTargetKey === `${r},${c}`) {
                this.setFieldInfo(FIELD_MAP_DATA[r][c], r, c);
            }
        }
        army.state = 'IDLE';
        this.updateUI(); this.saveGame();
    }


    moveCameraTo(targetX, targetY, viewport, mapLayer) {
        const viewportWidth = viewport.clientWidth; const viewportHeight = viewport.clientHeight;
        const newX = (viewportWidth / 2) - (targetX * this.camera.scale); const newY = (viewportHeight / 2) - (targetY * this.camera.scale);
        mapLayer.style.transition = 'transform 0.3s ease-out';
        this.camera.x = newX; this.camera.y = newY;
        mapLayer.style.transform = `translate(${this.camera.x}px, ${this.camera.y}px) scale(${this.camera.scale})`;
        const labelScale = Math.max(0.5, Math.min(1.15, 1 / this.camera.scale));
        mapLayer.style.setProperty('--label-scale', labelScale.toFixed(3));
        this.updateFloatingPanelPositionFromSelection();
        setTimeout(() => { mapLayer.style.transition = 'none'; }, 300);
    }

    centerCameraOnArmy(armyId) {
        const army = this.armies[armyId];
        const viewport = document.getElementById('map-viewport');
        const mapLayer = document.getElementById('map-layer');
        if (!army || !viewport || !mapLayer || !this.camera) return;
        const TILE_SIZE = 13;
        const tx = 50 + (army.c * TILE_SIZE) + (TILE_SIZE / 2);
        const ty = 50 + (army.r * TILE_SIZE) + (TILE_SIZE / 2);
        this.moveCameraTo(tx, ty, viewport, mapLayer);
    }

    teardownFieldCamera() {
        if (typeof this.fieldCameraCleanup === 'function') {
            this.fieldCameraCleanup();
            this.fieldCameraCleanup = null;
        }
    }

    initFieldCamera(viewport, mapLayer) {
        this.teardownFieldCamera();
        const TILE_SIZE = 13; const VIEW_TILES = 9;
        const vw = viewport.clientWidth || 300; const vh = viewport.clientHeight || 300;
        let scale; if (this.camera && this.camera.scale) scale = this.camera.scale; else scale = vw / (TILE_SIZE * VIEW_TILES);
        let targetR, targetC; let shouldRecenter = false;
        if (!this.camera) {
            const army0 = this.armies && this.armies[0];
            targetR = army0 ? army0.r : PLAYER_START.r;
            targetC = army0 ? army0.c : PLAYER_START.c;
            shouldRecenter = true;
        }
        if (shouldRecenter) {
            const targetX = 50 + (targetC * TILE_SIZE) + (TILE_SIZE / 2); const targetY = 50 + (targetR * TILE_SIZE) + (TILE_SIZE / 2);
            const x = (vw / 2) - (targetX * scale); const y = (vh / 2) - (targetY * scale);
            this.camera = { x, y, scale };
        }
        const updateTransform = () => {
            mapLayer.style.transform = `translate(${this.camera.x}px, ${this.camera.y}px) scale(${this.camera.scale})`;
            const labelScale = Math.max(0.5, Math.min(1.15, 1 / this.camera.scale));
            mapLayer.style.setProperty('--label-scale', labelScale.toFixed(3));
            this.updateFloatingPanelPositionFromSelection();
        };
        setTimeout(updateTransform, 0);

        let isDragging = false, lastX = 0, lastY = 0, initialPinchDist = 0, initialPinchScale = 1;
        const onWheel = (e) => {
            e.preventDefault(); const zoomSpeed = 0.1; const newScale = this.camera.scale + (e.deltaY > 0 ? -zoomSpeed : zoomSpeed) * this.camera.scale;
            if (newScale > 0.2 && newScale < 5) {
                const centerX = viewport.clientWidth / 2; const centerY = viewport.clientHeight / 2;
                const scaleRatio = newScale / this.camera.scale;
                this.camera.x = centerX - (centerX - this.camera.x) * scaleRatio; this.camera.y = centerY - (centerY - this.camera.y) * scaleRatio;
                this.camera.scale = newScale; updateTransform();
            }
        };
        const onMouseDown = (e) => { isDragging = true; this.isDraggingMap = false; lastX = e.clientX; lastY = e.clientY; };
        const onMouseMove = (e) => {
            if (!isDragging) return;
            if (Math.abs(e.clientX - lastX) > 5 || Math.abs(e.clientY - lastY) > 5) this.isDraggingMap = true;
            this.camera.x += e.clientX - lastX; this.camera.y += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; updateTransform();
        };
        const onMouseUp = () => { isDragging = false; };
        const onTouchStart = (e) => {
            if (e.touches.length === 1) { isDragging = true; this.isDraggingMap = false; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
            else if (e.touches.length === 2) { isDragging = false; initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); initialPinchScale = this.camera.scale; }
        };
        const onTouchMove = (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && isDragging) {
                if (Math.abs(e.touches[0].clientX - lastX) > 5 || Math.abs(e.touches[0].clientY - lastY) > 5) this.isDraggingMap = true;
                this.camera.x += e.touches[0].clientX - lastX; this.camera.y += e.touches[0].clientY - lastY; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; updateTransform();
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const newScale = initialPinchScale * (dist / initialPinchDist);
                if (newScale > 0.2 && newScale < 5) {
                    const centerX = viewport.clientWidth / 2; const centerY = viewport.clientHeight / 2;
                    const scaleRatio = newScale / this.camera.scale;
                    this.camera.x = centerX - (centerX - this.camera.x) * scaleRatio; this.camera.y = centerY - (centerY - this.camera.y) * scaleRatio;
                    this.camera.scale = newScale; updateTransform();
                }
            }
        };
        const onTouchEnd = () => { isDragging = false; };

        viewport.addEventListener('wheel', onWheel);
        viewport.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        viewport.addEventListener('touchstart', onTouchStart, { passive: false });
        viewport.addEventListener('touchmove', onTouchMove, { passive: false });
        viewport.addEventListener('touchend', onTouchEnd);

        this.fieldCameraCleanup = () => {
            viewport.removeEventListener('wheel', onWheel);
            viewport.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            viewport.removeEventListener('touchstart', onTouchStart);
            viewport.removeEventListener('touchmove', onTouchMove);
            viewport.removeEventListener('touchend', onTouchEnd);
        };
    }

    closeModal() {
        this.exitMoveTargetMode();
        const fieldModal = document.getElementById('field-modal');
        const fieldMode = fieldModal?.dataset?.mode;
        if (fieldMode === 'world_end') {
            const claimed = this.claimWorldEndRewards({ silent: true });
            if (claimed) this.showToast(this.tr('toast.world_end_rewards_claimed', {}, 'World end rewards claimed'));
        }
        if (fieldMode === 'caravan') {
            if (this.shopTimer) { clearInterval(this.shopTimer); this.shopTimer = null; }
            this.currentShopContext = null;
            document.querySelector('#modal-object .modal-content')?.classList.remove('wide');
            this.clearPathPreview();
            this.setMovePreview("");
            this.renderFieldMap();
            return;
        }
        this.teardownFieldCamera();
        fieldModal?.classList.remove('open');
        if (fieldModal) {
            fieldModal.dataset.mode = '';
            fieldModal.hidden = true;
        }
        document.getElementById('modal-refill').classList.remove('open');
        document.getElementById('modal-settings').classList.remove('open');
        document.getElementById('modal-admin')?.classList.remove('open');
        document.getElementById('modal-lobby')?.classList.remove('open');
        document.getElementById('modal-object').classList.remove('open');
        if (this.shopTimer) { clearInterval(this.shopTimer); this.shopTimer = null; }
        this.currentShopContext = null;
        document.querySelector('#modal-object .modal-content')?.classList.remove('wide');
        this.hideFieldActionMenu();
        this.clearPathPreview();
        this.setMovePreview("");
        this.isDraggingMap = false;
    }
    buyBuilding(type, price) {
        if (this.gold < price) { this.showToast(this.tr('toast.gold_short', {}, 'Not enough gold')); return; }
        const limit = BUILDING_LIMITS[type] || 999; const current = this.getBuildingCount(type);
        if (current >= limit) { this.showToast(this.tr('toast.build_limit_reached', { limit }, `Build limit reached (${limit})`)); return; }
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (this.gridState[r][c].type === LOCK_TYPE.OPEN && !this.grid[r][c]) {
                this.gold -= price; const newItem = { type: type, level: 1, scale: 0 };
                if (type === ITEM_TYPE.BUILDING_CHEST) newItem.usage = 5; if (type === ITEM_TYPE.BUILDING_CAMP) newItem.storedUnits = [];
                this.grid[r][c] = newItem; this.updateUI(); this.requestRender(); this.showToast(this.tr('toast.build_done', {}, 'Built')); this.closeModal();
                const cx = this.gridStartX + c * this.gridTileSize + this.gridTileSize / 2, cy = this.gridStartY + r * this.gridTileSize + this.gridTileSize / 2;
                this.spawnParticles(cx, cy, "#FFD700", 20, "confetti"); this.sound.playSpawn(); return;
            }
        }
        this.showToast(this.tr('toast.space_short', {}, 'No empty slot'));
    }
    getBuildingCount(type) { let count = 0; for (let r = 0; r < CONFIG.gridRows; r++) for (let c = 0; c < CONFIG.gridCols; c++) { if (this.grid[r][c] && this.grid[r][c].type === type) count++; } return count; }
    getHighestBuildingLevel(unitType) {
        let bType = -1; if (unitType === ITEM_TYPE.UNIT_INFANTRY) bType = ITEM_TYPE.BUILDING_BARRACKS; else if (unitType === ITEM_TYPE.UNIT_ARCHER) bType = ITEM_TYPE.BUILDING_RANGE; else if (unitType === ITEM_TYPE.UNIT_CAVALRY) bType = ITEM_TYPE.BUILDING_STABLE;
        if (bType === -1) return 10; let maxLvl = 0; for (let r = 0; r < CONFIG.gridRows; r++) for (let c = 0; c < CONFIG.gridCols; c++) if (this.grid[r][c] && this.grid[r][c].type === bType) maxLvl = Math.max(maxLvl, this.grid[r][c].level); return maxLvl;
    }
    resize() {
        const wrap = document.getElementById('canvas-wrapper'); this.canvas.width = Math.floor(wrap.clientWidth * this.dpr); this.canvas.height = Math.floor(wrap.clientHeight * this.dpr);
        this.canvas.style.width = `${wrap.clientWidth}px`; this.canvas.style.height = `${wrap.clientHeight}px`; this.ctx.resetTransform(); this.ctx.scale(this.canvas.width / this.width, this.canvas.width / this.width); this.ctx.imageSmoothingEnabled = false; this.requestRender();
    }
    addXp(amount) { this.currentXp += amount; if (this.currentXp >= this.requiredXp) this.levelUp(); this.updateUI(); }
    levelUp() {
        if (this.lordLevel >= MAX_LEVEL || this.requiredXp <= 0) return;
        const nextReq = this.requiredXp;
        if (this.currentXp >= nextReq) {
            const prevLv = this.lordLevel;
            const prevEn = this.maxEnergy;
            this.currentXp -= nextReq; this.lordLevel++; this.updateLevelStats(); this.energy = this.maxEnergy; this.refreshLockState();
            this.cp = this.maxCp;
            this.showLevelUpModal(prevLv, prevEn);
            this.sound.playLevelUp();
            if (this.currentXp >= this.requiredXp) this.levelUp();
        }
    }
    updateLevelStats() {
        if (!Number.isFinite(this.lordLevel) || this.lordLevel < 1) this.lordLevel = 1;
        if (this.lordLevel > MAX_LEVEL) this.lordLevel = MAX_LEVEL;
        const d = LEVEL_DATA_BY_LEVEL.get(this.lordLevel) || LEVEL_DATA_BY_LEVEL.get(MAX_LEVEL) || LEVEL_DATA_BY_LEVEL.get(1);
        const nextD = LEVEL_DATA_BY_LEVEL.get(this.lordLevel + 1);
        this.maxEnergy = Number(d?.energy_max || 50);
        this.baseEnergyRegen = Math.max(0, Number(d?.energy_regen ?? 1));
        this.baseMaxCp = Number(d?.cp_max || 20);
        this.baseCpRegen = Math.max(0, Number(d?.cp_regen ?? 1));
        const currentTotalXp = Number(d?.xp || 0);
        const nextTotalXp = Number(nextD?.xp);
        this.requiredXp = Number.isFinite(nextTotalXp) ? Math.max(1, nextTotalXp - currentTotalXp) : 0;
        if (this.requiredXp <= 0) this.currentXp = 0;
        this.applyCpBonuses();
    }
    selectItem(item, location) { if (this.selectedItem?.item !== item) this.sound.playClick(); this.selectedItem = item ? { item, location } : null; this.updateInfoPanel(); this.requestRender(); }
    updateInfoPanel() {
        const els = { name: document.getElementById('info-name'), desc: document.getElementById('info-desc'), cls: document.getElementById('info-class'), stats: document.getElementById('unit-stats-grid'), btn: document.getElementById('btn-action'), lbl: document.getElementById('action-label'), icon: document.getElementById('action-icon'), panel: document.getElementById('info-panel') };

        if (!this.selectedItem) {
            // Hide panel if nothing selected (or show default message?)
            // Design choice: Show panel with default "Select Object" text
            if (els.panel) els.panel.style.display = 'flex';
            els.stats.classList.add('hidden'); els.cls.innerText = ""; els.btn.style.opacity = 0.5; els.lbl.innerText = this.tr('ui.common.none', {}, '-');
            els.name.innerText = this.tr('ui.info.no_selection', {}, 'No selection');
            els.desc.innerText = this.tr('ui.info.select_hint', {}, 'Select an item to see details.');
            return;
        }

        if (els.panel) els.panel.style.display = 'flex';
        els.stats.classList.add('hidden'); els.cls.innerText = ""; els.btn.style.opacity = 0.5; els.lbl.innerText = this.tr('ui.common.none', {}, '-');

        const item = this.selectedItem.item; const data = getData(item.type, item.level); els.name.innerText = `${data.name} LV.${item.level}`;
        if (item.type < 10) {
            if (item.type === ITEM_TYPE.BUILDING_CHEST) els.desc.innerText = this.tr('ui.info.chest_uses_left', { value: item.usage }, `Uses left: ${item.usage}`);
            else if (item.type === ITEM_TYPE.BUILDING_CAMP) els.desc.innerText = this.tr('ui.info.camp_stored', { current: item.storedUnits ? item.storedUnits.length : 0, cap: CAMP_CAPACITY[item.level] }, `Stored: ${item.storedUnits ? item.storedUnits.length : 0} / ${CAMP_CAPACITY[item.level]}`); // Modified here
            else { els.desc.innerText = this.tr('ui.info.produces_units', {}, 'Produces units'); const cost = data.energy || 1; els.lbl.innerText = `-${cost}EN`; els.btn.style.opacity = 1; els.icon.innerText = ""; }
        } else if (item.type >= 20) { els.desc.innerText = this.tr('ui.info.tap_to_collect', {}, 'Tap to collect'); els.lbl.innerText = this.tr('ui.info.collect', {}, 'Collect'); els.btn.style.opacity = 1; }
        else {
            els.cls.innerText = data.class; els.desc.innerText = ""; els.stats.classList.remove('hidden');
            document.getElementById('st-hp').innerText = data.hp; document.getElementById('st-atk').innerText = data.atk; document.getElementById('st-def').innerText = data.def;
            document.getElementById('st-spd').innerText = data.spd;
            document.getElementById('st-rng').innerText = data.range || data.rng || 0;
            document.getElementById('st-mov').innerText = data.move || data.mov || 0;
            els.lbl.innerText = `+${data.sell}`; els.icon.innerText = "G"; els.btn.style.opacity = 1;
        }
    }

    // ... (rest of file)

    async confirmBattleStart() {
        try {
            console.log("Confirming Battle Start...");

            // Safety Check: If no context, check if we can recover or just close
            if (!this.battleContext) {
                console.error("No Battle Context found during confirm!");
                // Try to recover? No, just close to avoid stuck state
                alert(this.tr('ui.alert.battle_data_missing', {}, 'Battle data is missing. Closing battle modal.'));
                this.closeBattlePrepModal();
                return;
            }

            // Close Prep, Open Battle
            const prep = document.getElementById('modal-battle-prep');
            if (prep) {
                prep.classList.remove('open');
                prep.style.display = 'none';
            }

            const modal = document.getElementById('modal-battle');
            if (modal) {
                modal.style.display = '';
                modal.classList.add('open');
            }

            // Need to regenerate 'allies' list from the updated squadRef
            this.battleContext.allies = this.getSquadUnits(this.battleContext.squadRef);

            // Start Sim
            this.startBattleSimulation();
        } catch (e) {
            console.error("Battle Start Error:", e);
            alert(this.tr('ui.alert.battle_error', { message: e.message }, `Battle error: ${e.message}`));
            this.closeAllModals();
        }
    }
    handleAction() {
        if (!this.selectedItem) return; const { item, location } = this.selectedItem;
        if (item.type >= 10 && item.type < 20) {
            if (location.zone === ZONES.GRID) this.grid[location.r][location.c] = null; else if (location.zone === ZONES.SQUAD1) this.squad1[location.idx] = null; else if (location.zone === ZONES.SQUAD2) this.squad2[location.idx] = null; else this.squad3[location.idx] = null;
            const val = getData(item.type, item.level).sell; this.gold += val; this.showToast(this.tr('toast.gold_gain', { value: val }, `+${val} G`)); this.sound.playCollect(); this.selectItem(null); this.updateUI(); this.requestRender();
        } else if (item.type < 10 && item.type !== ITEM_TYPE.BUILDING_CHEST && item.type !== ITEM_TYPE.BUILDING_CAMP) this.produce(item);
    }
    setupInput() {
        const getPos = e => { const r = this.canvas.getBoundingClientRect(); return { x: ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * (this.width / r.width), y: ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) * (this.width / r.width) }; };
        const start = e => {
            this.sound.resume(); const p = getPos(e); const hit = this.getZoneAt(p.x, p.y);
            if (hit) {
                if (hit.zone === ZONES.GRID && this.gridState[hit.r][hit.c].type !== LOCK_TYPE.OPEN) { this.tryUnlock(hit.r, hit.c); return; }
                let item = hit.zone === ZONES.GRID ? this.grid[hit.r][hit.c] : (hit.zone === ZONES.SQUAD1 ? this.squad1[hit.idx] : (hit.zone === ZONES.SQUAD2 ? this.squad2[hit.idx] : this.squad3[hit.idx]));
                this.potentialDrag = { startPos: p, item, hit };
            } else this.selectItem(null);
        };
        const move = e => {
            if (this.potentialDrag && !this.drag) { const p = getPos(e); if (Math.hypot(p.x - this.potentialDrag.startPos.x, p.y - this.potentialDrag.startPos.y) > 10 && this.potentialDrag.item) this.startDrag(this.potentialDrag.item, this.potentialDrag.hit, p); }
            if (this.drag) { this.drag.x = getPos(e).x; this.drag.y = getPos(e).y; this.hover = this.getZoneAt(this.drag.x, this.drag.y); this.requestRender(); }
        };
        const end = e => { if (this.drag) this.endDrag(); else if (this.potentialDrag) this.handleClick(this.potentialDrag.item, this.potentialDrag.hit); this.potentialDrag = null; this.drag = null; };
        this.canvas.onmousedown = start; window.onmousemove = move; window.onmouseup = end;
        this.canvas.ontouchstart = e => { start(e); e.preventDefault(); }; window.ontouchmove = e => { move(e); e.preventDefault(); }; window.ontouchend = end;
    }
    startDrag(item, hit, pos) {
        let cx, cy; if (hit.zone === ZONES.GRID) { cx = this.gridStartX + hit.c * this.gridTileSize; cy = this.gridStartY + hit.r * this.gridTileSize; } else if (hit.zone === ZONES.SQUAD1) { cx = this.squad1Rect.x + (hit.idx % 3) * this.squadCellSize; cy = this.squad1Rect.y + Math.floor(hit.idx / 3) * this.squadCellSize; } else if (hit.zone === ZONES.SQUAD2) { cx = this.squad2Rect.x + (hit.idx % 3) * this.squadCellSize; cy = this.squad2Rect.y + Math.floor(hit.idx / 3) * this.squadCellSize; } else { cx = this.squad3Rect.x + (hit.idx % 3) * this.squadCellSize; cy = this.squad3Rect.y + Math.floor(hit.idx / 3) * this.squadCellSize; }
        this.drag = { item, startZone: hit, x: pos.x, y: pos.y, offsetX: pos.x - cx, offsetY: pos.y - cy, size: hit.zone === ZONES.GRID ? this.gridTileSize : this.squadCellSize };
        if (hit.zone === ZONES.GRID) this.grid[hit.r][hit.c] = null; else if (hit.zone === ZONES.SQUAD1) this.squad1[hit.idx] = null; else if (hit.zone === ZONES.SQUAD2) this.squad2[hit.idx] = null; else this.squad3[hit.idx] = null;
        this.selectItem(item, hit); this.requestRender();
    }
    endDrag() {
        const hit = this.getZoneAt(this.drag.x, this.drag.y); let returned = false;
        if (hit) {
            let target = null; if (hit.zone === ZONES.GRID) { if (this.gridState[hit.r][hit.c].type !== LOCK_TYPE.OPEN) returned = true; else target = this.grid[hit.r][hit.c]; } else if (hit.zone === ZONES.SQUAD1) target = this.squad1[hit.idx]; else if (hit.zone === ZONES.SQUAD2) target = this.squad2[hit.idx]; else target = this.squad3[hit.idx];
            if (!returned) {
                if (!target) { if (hit.zone === ZONES.GRID) this.grid[hit.r][hit.c] = this.drag.item; else if (hit.zone === ZONES.SQUAD1) this.squad1[hit.idx] = this.drag.item; else if (hit.zone === ZONES.SQUAD2) this.squad2[hit.idx] = this.drag.item; else this.squad3[hit.idx] = this.drag.item; this.selectItem(this.drag.item, hit); }
                else if (target.type === ITEM_TYPE.BUILDING_CAMP && this.drag.item.type >= 10 && this.drag.item.type < 20 && hit.zone === ZONES.GRID) {
                    if (!target.storedUnits) target.storedUnits = [];
                    const cap = CAMP_CAPACITY[target.level] || 4;
                    if (target.storedUnits.length < cap) {
                        target.storedUnits.push(this.drag.item);
                        this.showToast(this.tr('toast.stored', { current: target.storedUnits.length, cap }, `Stored (${target.storedUnits.length}/${cap})`));
                        this.sound.playClick();
                    } else {
                        this.showToast(this.tr('toast.camp_storage_full', {}, 'Camp storage is full.'));
                        returned = true;
                    }
                }
                else if (target.type === this.drag.item.type && target.level === this.drag.item.level) {
                    const isUnit = target.type >= 10 && target.type < 20; const maxLvl = isUnit ? 10 : 5; let canMerge = true;

                    if (isUnit) {
                        const bLvl = this.getHighestBuildingLevel(target.type);
                        if (target.level >= bLvl + 5) {
                            this.showToast(this.tr('toast.require_building_level', { level: target.level - 4 }, `Requires building level ${target.level - 4}`));
                            canMerge = false; returned = true;
                        }
                    }

                    if (canMerge && target.level < maxLvl) {
                        target.level++; target.scale = 1.3;
                        if (target.type === ITEM_TYPE.BUILDING_CHEST) {
                            target.usage = Math.floor((target.usage + this.drag.item.usage) * 0.5);
                        }
                        const xp = MERGE_XP_DATA[target.level - 1] || 1;
                        this.addXp(xp); this.showFloatingImage('xp', hit.zone === ZONES.GRID ? this.gridStartX + hit.c * this.gridTileSize : this.drag.x, this.drag.y);
                        this.spawnParticles(this.drag.x, this.drag.y, "#FFD700", 30, "spark"); this.sound.playMerge();
                    } else if (canMerge) { this.showToast(this.tr('toast.max_level', {}, 'Max level reached')); returned = true; }
                } else returned = true;
            }
        } else returned = true;
        if (returned) { const s = this.drag.startZone; if (s.zone === ZONES.GRID) this.grid[s.r][s.c] = this.drag.item; else if (s.zone === ZONES.SQUAD1) this.squad1[s.idx] = this.drag.item; else if (s.zone === ZONES.SQUAD2) this.squad2[s.idx] = this.drag.item; else this.squad3[s.idx] = this.drag.item; }
        this.hover = null; this.updateUI(); this.requestRender(); this.drag = null;
    }
    handleClick(item, hit) {
        if (!item) { this.selectItem(null); return; }
        this.selectItem(item, hit);
        if (item.type >= 20) this.collectResource(item, hit.r, hit.c);
        else if (item.type === ITEM_TYPE.BUILDING_CAMP) this.ejectCamp(item, hit.r, hit.c);
        else if (item.type < 10 && item.type !== ITEM_TYPE.BUILDING_CAMP) {
            if (item.type === ITEM_TYPE.BUILDING_CHEST) this.produceFromChest(item, hit.r, hit.c);
            else this.produce(item);
        }
    }
    getZoneAt(x, y) {
        const check = (rect, rows, cols, size) => { if (x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h) { const c = Math.floor((x - rect.x) / size), r = Math.floor((y - rect.y) / size); if (c >= 0 && c < cols && r >= 0 && r < rows) return { c, r, idx: r * 3 + c }; } return null; };
        let res = check(this.squad1Rect, CONFIG.squadRows, CONFIG.squadCols, this.squadCellSize); if (res) return { zone: ZONES.SQUAD1, ...res };
        res = check(this.squad2Rect, CONFIG.squadRows, CONFIG.squadCols, this.squadCellSize); if (res) return { zone: ZONES.SQUAD2, ...res };
        if (this.thirdSquadUnlocked && this.squad3Rect) { res = check(this.squad3Rect, CONFIG.squadRows, CONFIG.squadCols, this.squadCellSize); if (res) return { zone: ZONES.SQUAD3, ...res }; }
        if (x >= this.gridStartX && x < this.gridStartX + this.gridTileSize * CONFIG.gridCols && y >= this.gridStartY && y < this.gridStartY + this.gridTileSize * CONFIG.gridRows) { const c = Math.floor((x - this.gridStartX) / this.gridTileSize), r = Math.floor((y - this.gridStartY) / this.gridTileSize); if (c >= 0 && c < CONFIG.gridCols && r >= 0 && r < CONFIG.gridRows) return { zone: ZONES.GRID, r, c, idx: r * 8 + c }; }
        return null;
    }
    produce(building) {
        const buildingData = BUILDING_DATA[building.type];
        const stats = buildingData ? buildingData[building.level] : BUILDING_DATA[ITEM_TYPE.BUILDING_BARRACKS][1]; // Default fallback

        if (this.energy < stats.energy) { this.showToast(this.tr('toast.energy_short_cost', { cost: stats.energy }, `Not enough energy (${stats.energy})`)); return; }

        let unitType = ITEM_TYPE.UNIT_INFANTRY;
        if (building.type === ITEM_TYPE.BUILDING_RANGE) unitType = ITEM_TYPE.UNIT_ARCHER;
        else if (building.type === ITEM_TYPE.BUILDING_STABLE) unitType = ITEM_TYPE.UNIT_CAVALRY;

        let lvl = 1;
        const r = Math.random() * 100;
        let sum = 0;
        for (let i = 0; i < stats.probs.length; i++) {
            sum += stats.probs[i];
            if (r <= sum) { lvl = i + 1; break; }
        }

        if (this.spawnItem({ type: unitType, level: lvl, scale: 0 })) {
            this.energy -= stats.energy;
            this.updateUI();
            this.requestRender();
            this.sound.playSpawn();
        } else {
            this.showToast(this.tr('toast.space_short', {}, 'No space available'));
        }
    }
    produceFromChest(chest, r, c) {
        if (this.energy < 1) { this.showToast(this.tr('toast.energy_short_cost', { cost: 1 }, 'Not enough energy')); return; }

        // Drop logic
        const table = CHEST_DROP_TABLE[chest.level] || CHEST_DROP_TABLE[1];
        let total = 0;
        table.forEach(e => total += e.prob);
        let rnd = Math.random() * total, code = table[0].code;
        for (let e of table) { if (rnd < e.prob) { code = e.code; break; } rnd -= e.prob; }
        const info = getInfoFromCode(code);

        if (this.spawnItem({ type: info.type, level: info.level, scale: 0 })) {
            this.energy--;
            chest.usage--;
            chest.scale = 1.2;

            // Check usage
            if (chest.usage <= 0) {
                this.grid[r][c] = null; // Remove from grid
                if (this.selectedItem && this.selectedItem.item === chest) {
                    this.selectItem(null); // Deselect
                }
                this.showToast(this.tr('toast.chest_gone', {}, 'Chest expired.'));
            }

            this.updateUI();
            this.requestRender();
            this.sound.playSpawn();
        } else {
            this.showToast(this.tr('toast.space_short', {}, 'No space available'));
        }
    }
    spawnItem(item) {
        for (let r = 0; r < CONFIG.gridRows; r++) for (let c = 0; c < CONFIG.gridCols; c++) if (this.gridState[r][c].type === LOCK_TYPE.OPEN && !this.grid[r][c]) { this.grid[r][c] = item; const cx = this.gridStartX + c * this.gridTileSize + this.gridTileSize / 2, cy = this.gridStartY + r * this.gridTileSize + this.gridTileSize / 2; this.spawnParticles(cx, cy, "#EEE", 10, "smoke"); return true; }
        return false;
    }
    ejectCamp(camp, r, c) {
        if (!camp.storedUnits || camp.storedUnits.length === 0) { this.showToast(this.tr('toast.empty', {}, 'Camp is empty')); return; }
        const moves = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let m of moves) {
            const nr = r + m[0], nc = c + m[1];
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this.gridState[nr][nc].type === LOCK_TYPE.OPEN && !this.grid[nr][nc]) {
                const unit = camp.storedUnits.pop(); // Take last added unit (LIFO)
                this.grid[nr][nc] = unit;
                this.requestRender();
                this.sound.playClick();
                this.showToast(this.tr('toast.withdrawn', { remain: camp.storedUnits.length }, `Released (${camp.storedUnits.length} left)`));
                return;
            }
        }
        this.showToast(this.tr('toast.no_adjacent_space', {}, 'No adjacent empty slot'));
    }
    collectResource(item, r, c) {
        const val = ITEM_VALUES[item.level] || 1; let pColor = "#fff";
        if (item.type === ITEM_TYPE.ITEM_GOLD) { this.gold += val; this.showToast(this.tr('toast.gold_gain', { value: val }, `+${val}G`)); pColor = "#FFD700"; } else if (item.type === ITEM_TYPE.ITEM_ENERGY) { this.energy = Math.min(this.energy + val, this.maxEnergy); this.showToast(this.tr('toast.energy_gain', { value: val }, `+${val}EN`)); pColor = "#00FFFF"; } else { this.gem += val; this.showToast(this.tr('toast.gem_gain', { value: val }, `+${val}GEM`)); pColor = "#FF00FF"; }
        const cx = this.gridStartX + c * this.gridTileSize + this.gridTileSize / 2, cy = this.gridStartY + r * this.gridTileSize + this.gridTileSize / 2; this.spawnParticles(cx, cy, pColor, 15, "spark"); this.sound.playCollect(); this.grid[r][c] = null; this.updateUI(); this.requestRender();
    }
    tryUnlock(r, c) {
        const l = this.gridState[r][c];
        if (l.type === LOCK_TYPE.GOLD) { if (this.gold >= l.value) { this.gold -= l.value; this.gridState[r][c] = { type: LOCK_TYPE.OPEN }; this.showToast(this.tr('toast.unlock_done', {}, 'Unlocked')); this.spawnParticles(this.gridStartX + c * this.gridTileSize + this.gridTileSize / 2, this.gridStartY + r * this.gridTileSize + this.gridTileSize / 2, "#FFF", 20, "confetti"); this.sound.playUnlock(); } else { this.showToast(this.tr('toast.gold_short', {}, 'Not enough gold')); this.sound.playError(); } }
        else if (l.type === LOCK_TYPE.LEVEL) { if (this.lordLevel >= l.value) { this.gridState[r][c] = { type: LOCK_TYPE.OPEN }; this.showToast(this.tr('toast.unlock_done', {}, 'Unlocked')); this.spawnParticles(this.gridStartX + c * this.gridTileSize + this.gridTileSize / 2, this.gridStartY + r * this.gridTileSize + this.gridTileSize / 2, "#FFF", 20, "confetti"); this.sound.playUnlock(); } else { this.showToast(this.tr('toast.require_level', { level: l.value }, `Requires LV.${l.value}`)); this.sound.playError(); } }
        this.updateUI(); this.requestRender();
    }
    loop() {
        // Main game loop (includes field army updates).
        this.updateArmies();

        if (this.isDirty || this.drag) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            const squadLabel = this.tr('ui.squad.label', {}, 'Squad');
            this.drawSquad(this.squad1, this.squad1Rect, `${squadLabel} 1`, "#4caf50", ZONES.SQUAD1); this.drawSquad(this.squad2, this.squad2Rect, `${squadLabel} 2`, "#2196f3", ZONES.SQUAD2);
            if (this.thirdSquadUnlocked && this.squad3Rect) this.drawSquad(this.squad3, this.squad3Rect, `${squadLabel} 3`, "#f59e0b", ZONES.SQUAD3);
            for (let r = 0; r < CONFIG.gridRows; r++) for (let c = 0; c < CONFIG.gridCols; c++) {
                const x = this.gridStartX + c * this.gridTileSize, y = this.gridStartY + r * this.gridTileSize;
                const isHover = this.hover && this.hover.zone === ZONES.GRID && this.hover.r === r && this.hover.c === c, isSel = this.selectedItem && this.selectedItem.location.zone === ZONES.GRID && this.selectedItem.location.r === r && this.selectedItem.location.c === c;
                this.drawCell(x, y, this.gridTileSize, this.grid[r][c], this.gridState[r][c], isHover, isSel);
            }
            if (this.drag) this.drawItem(this.drag.x - this.drag.size / 2, this.drag.y - this.drag.size / 2, this.drag.size, this.drag.item, true);
            for (let i = this.particles.length - 1; i >= 0; i--) { this.particles[i].update(); this.particles[i].draw(this.ctx); if (this.particles[i].life <= 0) this.particles.splice(i, 1); }
            let anim = false; this.grid.flat().concat(this.squad1).concat(this.squad2).concat(this.squad3).forEach(i => { if (i && i.scale !== 1) { i.scale += (i.scale < 1 ? 0.1 : -0.05); if (Math.abs(i.scale - 1) < 0.05) i.scale = 1; anim = true; } });
            this.isDirty = anim || !!this.drag || this.particles.length > 0;
        }
        requestAnimationFrame(() => this.loop());
    }
    getSquadPower(s) {
        let p = 0;
        for (let u of s) {
            if (!u || u.type < 10 || u.type >= 20) continue;
            const base = getData(u.type, u.level);
            const d = this.applyFieldBuffsToStats(base);
            if (d && d.hp) p += (d.hp + d.atk + d.def);
        }
        return p;
    }
    drawSquad(data, rect, label, color, zone) {
        const cp = this.getSquadPower(data);
        this.ctx.fillStyle = color; this.ctx.font = "bold 40px sans-serif"; this.ctx.textAlign = "center"; this.ctx.fillText(`${label}`, rect.x + rect.w / 2, rect.y - 22);
        this.ctx.fillStyle = color + "11"; this.ctx.fillRect(rect.x - 5, rect.y - 5, rect.w + 10, rect.h + 10);
        const powerShort = this.tr('ui.squad.power_short', {}, 'PWR');
        this.ctx.font = "bold 34px sans-serif"; this.ctx.fillStyle = "#fff"; this.ctx.fillText(`${powerShort} ${cp}`, rect.x + rect.w / 2, rect.y + rect.h + 39);
        for (let i = 0; i < 9; i++) {
            const x = rect.x + (i % 3) * this.squadCellSize, y = rect.y + Math.floor(i / 3) * this.squadCellSize;
            const isHover = this.hover && this.hover.zone === zone && this.hover.idx === i, isSel = this.selectedItem && this.selectedItem.location.zone === zone && this.selectedItem.location.idx === i;
            this.drawCell(x, y, this.squadCellSize, data[i], { type: LOCK_TYPE.OPEN }, isHover, isSel);
        }
    }
    drawCell(x, y, s, item, lock, isHover, isSel) {
        const p = 2, size = s - p * 2;
        this.ctx.fillStyle = lock.type === LOCK_TYPE.OPEN ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.5)"; this.ctx.fillRect(x + p, y + p, size, size);
        if (isSel) { this.ctx.lineWidth = 6; this.ctx.strokeStyle = "#0f0"; this.ctx.strokeRect(x + p, y + p, size, size); }
        else if (isHover) { this.ctx.lineWidth = 4; this.ctx.strokeStyle = "#ff0"; this.ctx.strokeRect(x + p, y + p, size, size); }
        else { this.ctx.lineWidth = 2; this.ctx.strokeStyle = "rgba(0,0,0,0.3)"; this.ctx.strokeRect(x + p, y + p, size, size); }
        if (lock.type !== LOCK_TYPE.OPEN) {
            const img = this.assets.getImage(lock.type === LOCK_TYPE.GOLD ? '1804' : 'lock');
            if (img && img.complete && img.naturalWidth > 0) { const isz = size * 0.6; this.ctx.drawImage(img, x + (s - isz) / 2, y + (s - isz) / 2, isz, isz); this.ctx.fillStyle = lock.type === LOCK_TYPE.GOLD ? "#ffd700" : "#fff"; this.ctx.font = "bold 20px sans-serif"; this.ctx.textAlign = "center"; this.ctx.strokeStyle = "black"; this.ctx.lineWidth = 4; const txt = lock.type === LOCK_TYPE.GOLD ? ` ${lock.value}` : `LV.${lock.value}`; this.ctx.strokeText(txt, x + s / 2, y + s / 2); this.ctx.fillText(txt, x + s / 2, y + s / 2); }
        } else if (item && item !== this.drag?.item) this.drawItem(x, y, s, item);
    }
    drawItem(x, y, s, item, isDrag = false) {
        const sc = isDrag ? 1.1 : item.scale, p = 4, ds = (s - p * 2) * sc, offset = (s - ds) / 2; const img = this.assets.getImage(item.type, item.level);

        // --- ADDED: LEVEL COLOR BORDER ---
        const lvColor = LEVEL_COLORS[item.level] || "#fff";

        if (img && img.complete && img.naturalWidth > 0) {
            if (isDrag) { this.ctx.shadowColor = "black"; this.ctx.shadowBlur = 15; }
            const drawSize = ds * 1.2; const drawOffset = (s - drawSize) / 2;
            this.ctx.drawImage(img, x + drawOffset, y + drawOffset, drawSize, drawSize); this.ctx.shadowBlur = 0;
        } else {
            let c = "#cfd8dc"; let sym = "Info";
            if (item.type === ITEM_TYPE.BUILDING_BARRACKS) { c = "#795548"; sym = "BK"; }
            else if (item.type === ITEM_TYPE.BUILDING_RANGE) { c = "#388e3c"; sym = "RG"; }
            else if (item.type === ITEM_TYPE.BUILDING_STABLE) { c = "#1976d2"; sym = "ST"; }
            else if (item.type === ITEM_TYPE.BUILDING_CHEST) { c = "#ffa000"; sym = "CH"; }
            else if (item.type === ITEM_TYPE.BUILDING_CAMP) { c = "#5d4037"; sym = "CP"; }
            else if (item.type === ITEM_TYPE.UNIT_INFANTRY) { c = "#eeeeee"; sym = "IN"; }
            else if (item.type === ITEM_TYPE.UNIT_ARCHER) { c = "#c8e6c9"; sym = "AR"; }
            else if (item.type === ITEM_TYPE.UNIT_CAVALRY) { c = "#bbdefb"; sym = "CV"; }
            else if (item.type === ITEM_TYPE.ITEM_GOLD) { c = "#fff176"; sym = "G"; }
            else if (item.type === ITEM_TYPE.ITEM_ENERGY) { c = "#80deea"; sym = "E"; }
            else if (item.type === ITEM_TYPE.ITEM_CRYSTAL) { c = "#e1bee7"; sym = "GM"; }
            const drawSize = ds * 1.2; const drawOffset = (s - drawSize) / 2;
            this.ctx.fillStyle = c; this.roundRect(x + drawOffset, y + drawOffset, drawSize, drawSize, 12); this.ctx.fill(); this.ctx.strokeStyle = "rgba(0,0,0,0.4)"; this.ctx.lineWidth = 2; this.ctx.stroke(); this.ctx.fillStyle = "rgba(0,0,0,0.6)"; this.ctx.font = `${Math.floor(drawSize * 0.5)}px sans-serif`; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle"; this.ctx.fillText(sym, x + s / 2, y + s / 2);
        }

        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = lvColor;
        this.ctx.strokeRect(x + p, y + p, ds, ds);

        const bx = x + s / 2, by = y + ds;
        if (item.type >= 10 || item.type < 10) {
            this.ctx.fillStyle = "rgba(0,0,0,0.8)"; this.ctx.beginPath(); this.ctx.arc(bx, by - 10, 10, 0, Math.PI * 2); this.ctx.fill(); this.ctx.strokeStyle = "#fff"; this.ctx.lineWidth = 1; this.ctx.stroke(); this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 12px sans-serif"; this.ctx.textAlign = "center"; this.ctx.fillText(item.level, bx, by - 6);
        }

        // --- MODIFIED: Camp Storage Display ---
        if (item.type === ITEM_TYPE.BUILDING_CAMP) {
            const count = item.storedUnits ? item.storedUnits.length : 0;
            const cap = CAMP_CAPACITY[item.level] || 4;

            // Styled Text Box
            const text = `${count}/${cap}`;
            this.ctx.font = "bold 16px sans-serif";
            const textW = this.ctx.measureText(text).width + 8;

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; // Semi-transparent black bg
            this.ctx.beginPath();
            this.ctx.roundRect(bx - textW / 2, y + s / 2 - 10, textW, 20, 4);
            this.ctx.fill();

            this.ctx.fillStyle = "#fff"; // White text
            this.ctx.shadowColor = "black";
            this.ctx.shadowBlur = 2;
            this.ctx.fillText(text, bx, y + s / 2 + 6);
            this.ctx.shadowBlur = 0; // Reset shadow
        }
    }
    roundRect(x, y, w, h, r) { this.ctx.beginPath(); this.ctx.moveTo(x + r, y); this.ctx.arcTo(x + w, y, x + w, y + h, r); this.ctx.arcTo(x + w, y + h, x, y + h, r); this.ctx.arcTo(x, y + h, x, y, r); this.ctx.arcTo(x, y, x + w, y, r); this.ctx.closePath(); }
    tr(key, params = {}, fallback = '') {
        return t(this.locale, key, params, fallback);
    }
    showToastKey(key, params = {}, fallback = '') {
        this.showToast(this.tr(key, params, fallback || key));
    }

    localizeToastMessage(msg) {
        if (typeof msg !== 'string') return msg;
        const text = msg.trim();
        if (!text) return msg;

        const exactMap = {
            "Sold out": "toast.sold_out",
            "Not enough gold": "toast.gold_short",
            "No space available": "toast.space_short",
            "Purchased": "toast.purchase_done",
            "Hired": "toast.recruit_done",
            "Cannot move to this tile": "toast.cannot_move",
            "No valid route": "toast.no_path",
            "Army is already moving": "toast.army_moving",
            "Not enough troops": "toast.army_power_short",
            "Capture successful!": "toast.capture_success",
            "Gate captured!": "toast.capture_gate",
            "Dragon defeated!": "toast.dragon_kill",
            "Message sent": "toast.message_sent",
            "Collected": "toast.collect_done",
            "Not enough merge slot space": "toast.merge_slot_short",
            "Max level reached": "toast.max_level",
            "Point shop coming soon": "toast.point_shop_soon",
            "Coming soon": "toast.coming_soon",
            "Capture a citadel to use this squad": "toast.require_citadel"
        };
        if (exactMap[text]) return this.tr(exactMap[text], {}, text);

        let m = text.match(/^Not enough gold \((\d+)\)$/i);
        if (m) return this.tr('toast.gold_short_cost', { cost: m[1] }, text);
        m = text.match(/^Not enough energy \((\d+)\)$/i);
        if (m) return this.tr('toast.energy_short_cost', { cost: m[1] }, text);
        m = text.match(/^Not enough CP \((\d+)\)$/i);
        if (m) return this.tr('toast.cp_short_cost', { cost: m[1] }, text);
        m = text.match(/^Out of range \((\d+)\s*\/\s*(\d+)\)$/i);
        if (m) return this.tr('toast.range_over', { dist: m[1], range: m[2] }, text);
        m = text.match(/^(.+)\s+march started$/i);
        if (m) return this.tr('toast.army_march_start', { army: m[1] }, text);
        m = text.match(/^(.+)\s+arrived$/i);
        if (m) return this.tr('toast.army_arrived', { army: m[1] }, text);
        m = text.match(/^Gold obtained:\s*(\d+)$/i);
        if (m) return this.tr('toast.event_gold_gain', { value: m[1] }, text);
        m = text.match(/^Item obtained \(Code (\d+)\)$/i);
        if (m) return this.tr('toast.event_item_gain', { code: m[1] }, text);

        return msg;
    }

    showToast(msg) {
        const localized = this.localizeToastMessage(msg);
        if (typeof localized === "string" && (localized.toLowerCase().includes("not enough") || localized.toLowerCase().includes("cannot"))) {
            this.sound.playError();
        }
        const t = document.getElementById('toast');
        t.innerText = localized;
        t.style.opacity = 1;
        setTimeout(() => t.style.opacity = 0, 1000);
    }
    showFloatingImage(key, x, y) {
        const img = this.assets.getImage(key); if (!img) return; const el = document.createElement('img'); el.src = img.src; el.className = 'float-img';
        const r = this.canvas.getBoundingClientRect(); el.style.left = ((x / this.width) * r.width) + "px"; el.style.top = ((y / this.height) * r.height) + "px"; document.getElementById('canvas-wrapper').appendChild(el); setTimeout(() => el.remove(), 1000);
    }
    showFloatingText(text, x, y, color) {
        const el = document.createElement('div');
        el.innerText = text; el.id = 'income-float'; el.style.color = color;
        // Simple positioning relative to container
        el.style.left = '50%'; el.style.top = '20%'; el.style.transform = 'translate(-50%, 0)';
        document.getElementById('canvas-wrapper').appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    showJoinNotice(text) {
        const el = document.createElement('div');
        el.className = 'join-float';
        el.innerText = text;
        document.getElementById('game-container').appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
    updateUI() {
        document.getElementById('energy-display').innerText = `${this.energy}/${this.maxEnergy}`;
        document.getElementById('cp-display').innerText = `${this.cp}/${this.maxCp}`;
        document.getElementById('gold-display').innerText = this.gold; document.getElementById('gem-display').innerText = this.gem; document.getElementById('level-display').innerText = this.tr('ui.header.lord_level', { level: this.lordLevel }, `LORD LV.${this.lordLevel}`);
        const isMaxLevel = this.lordLevel >= MAX_LEVEL || this.requiredXp <= 0;
        document.getElementById('xp-text').innerText = isMaxLevel ? this.tr('ui.header.xp_max', {}, 'MAX') : `${this.currentXp} / ${this.requiredXp}`;
        const xpWidth = isMaxLevel ? 100 : Math.max(0, Math.min(100, (this.currentXp / this.requiredXp) * 100));
        document.getElementById('xp-bar').style.width = `${xpWidth}%`;
        const fieldCp = document.getElementById('field-cp-display'); if (fieldCp) fieldCp.innerText = `${this.cp}/${this.maxCp}`;
        this.saveGame();
    }
    // --- BATTLE SYSTEM ---


    // --- BATTLE PREP & SIMULATION ---

    openBattlePrepModal(targetType, r, c) {
        if (this.guardWorldAction(this.tr('ui.field.action.attack', {}, 'Attack'))) return;
        // ... (data fetching)
        const meta = this.getTileMoveMeta(targetType, r, c);
        const objData = this.getFieldObjectData(targetType);
        const baseDefenders = this.getDefendersForTile(targetType, r, c);
        if (targetType === FIELD_EVENT_TYPES.DUNGEON && !this.canEnterDungeon(r, c, true)) {
            return;
        }
        if (!objData || !baseDefenders || baseDefenders.length === 0) {
            this.handleBattleWin(r, c);
            return;
        }

        // ... (context setup)
        const armyId = (this.selectedArmyId !== null && this.selectedArmyId !== undefined)
            ? this.selectedArmyId
            : this.lastSelectedArmyId;
        this.battleContext = {
            targetCode: targetType,
            r: r, c: c,
            armyId,
            baseDefenders: this.cloneDefenders(baseDefenders),
            defenders: this.parseDefenders(baseDefenders, objData.level),
            squadRef: this.lastSelectedArmyId !== null ? this.getSquadByArmyId(this.armies[this.lastSelectedArmyId].id) : this.squad1,
            allies: [],
            log: [],
            active: false,
            dungeonEntryConsumed: false
        };
        this.resetBattleResultOverlay();

        const modal = document.getElementById('modal-battle-prep');
        if (modal) {
            modal.style.display = ''; // Reset inline display: none
            modal.classList.add('open');
        }

        this.renderPrepGrid();
    }

    renderPrepGrid() {
        if (!this.battleContext) return;
        const ctx = this.battleContext;

        // Ally Grid (Draggable)
        const allyGrid = document.getElementById('prep-grid-ally');
        if (allyGrid) {
            allyGrid.innerHTML = '';
            // Render 9 slots
            const squad = ctx.squadRef; // Array(9)
            squad.forEach((unit, idx) => {
                const cell = document.createElement('div');
                cell.className = 'battle-cell ally prep';
                cell.dataset.idx = idx;

                // Drag Events
                cell.ondragover = (e) => e.preventDefault();
                cell.ondrop = (e) => this.handlePrepDrop(e, idx);

                if (unit) {
                    const data = getData(unit.type, unit.level);
                    cell.draggable = true;
                    cell.ondragstart = (e) => this.handlePrepDragStart(e, idx);
                    cell.innerHTML = `
                        <div class="battle-unit">
                            <div style="font-size:24px;">${this.getUnitIcon(unit.type)}</div>
                            <div class="text-[10px] text-white">${data.name}</div>
                        </div>
                    `;
                } else {
                    cell.classList.add('empty');
                }
                allyGrid.appendChild(cell);
            });
        }

        // Enemy Grid (Static)
        const enemyGrid = document.getElementById('prep-grid-enemy');
        if (enemyGrid) {
            enemyGrid.innerHTML = '';
            // Defenders are List of {slot, ...}. Create 9-slot array wrapper for rendering
            const enemySlots = Array(9).fill(null);
            ctx.defenders.forEach(u => {
                if (u.slot >= 0 && u.slot < 9) enemySlots[u.slot] = u;
            });

            enemySlots.forEach((unit, idx) => {
                const cell = document.createElement('div');
                cell.className = 'battle-cell enemy prep';
                if (unit) {
                    cell.innerHTML = `
                        <div class="battle-unit">
                            <div style="font-size:24px;">${this.getUnitIcon(unit.classType)}</div>
                            <div class="text-[10px] text-red-300">${unit.name}</div>
                        </div>
                    `;
                }
                enemyGrid.appendChild(cell);
            });
        }
    }

    handlePrepDragStart(e, idx) {
        e.dataTransfer.setData('text/plain', idx);
        e.dataTransfer.effectAllowed = 'move';
    }

    handlePrepDrop(e, targetIdx) {
        e.preventDefault();
        const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'));
        if (isNaN(sourceIdx) || sourceIdx === targetIdx) return;

        // Swap in squadRef
        const squad = this.battleContext.squadRef;
        const temp = squad[sourceIdx];
        squad[sourceIdx] = squad[targetIdx];
        squad[targetIdx] = temp;

        this.renderPrepGrid();
        this.saveGame(); // Save formation changes immediately
    }

    async confirmBattleStart() {
        try {
            console.log("Confirming Battle Start...");

            // Safety Check: If no context, check if we can recover or just close
            if (!this.battleContext) {
                console.error("No Battle Context found during confirm!");
                // Try to recover? No, just close to avoid stuck state
                alert(this.tr('ui.alert.battle_context_missing', {}, 'Battle context is missing. Closing battle setup.'));
                this.closeBattlePrepModal();
                return;
            }

            if (this.battleContext.targetCode === FIELD_EVENT_TYPES.DUNGEON && !this.battleContext.dungeonEntryConsumed) {
                const { r, c } = this.battleContext;
                if (!this.canEnterDungeon(r, c, true)) return;
                this.consumeDungeonEntry(r, c);
                this.battleContext.dungeonEntryConsumed = true;
                this.updateUI();
                this.saveGame();
            }

            // Close Prep, Open Battle
            const prep = document.getElementById('modal-battle-prep');
            if (prep) {
                prep.classList.remove('open');
                prep.style.display = 'none';
            }

            const modal = document.getElementById('modal-battle');
            if (modal) {
                modal.style.display = '';
                modal.classList.add('open');
            }

            // Need to regenerate 'allies' list from the updated squadRef
            this.battleContext.allies = this.getSquadUnits(this.battleContext.squadRef);

            // Start Sim
            this.startBattleSimulation();
        } catch (e) {
            console.error("Battle Start Error:", e);
            alert(this.tr('ui.alert.battle_error', { message: e.message }, `Battle error: ${e.message}`));
            this.closeAllModals();
        }
    }

    startBattleSimulation() {
        if (!this.battleContext) return;
        this.battleContext.active = true;

        if (typeof BattleSimulator === 'undefined') {
            console.error("BattleSimulator module not loaded.");
            this.addBattleLog(this.tr('battle.error.simulator_missing', {}, 'Error: Battle Simulator missing.'));
            return;
        }

        const controls = document.getElementById('battle-controls');
        if (controls) controls.style.display = 'none';

        const sim = new BattleSimulator();
        const result = sim.simulate(this.battleContext.allies, this.battleContext.defenders);

        this.battleSimulation = result;
        this.battleStepIndex = 0;
        this.battleContext.log = [];

        this.battleTimer = setInterval(() => this.battleTick(), 800);
    }

    resetBattleResultOverlay() {
        const overlay = document.getElementById('battle-result-overlay');
        const title = document.getElementById('battle-result-title');
        if (overlay) overlay.style.display = 'none';
        if (title) {
            title.innerText = "";
            title.className = "battle-result-text";
        }
    }

    closeBattleModal() {
        console.log("Closing Battle Modal (Inline)");
        const battleModal = document.getElementById('modal-battle');
        if (battleModal) {
            battleModal.classList.remove('open');
            battleModal.style.display = 'none';
        }
        const prepModal = document.getElementById('modal-battle-prep');
        if (prepModal) {
            prepModal.classList.remove('open');
            prepModal.style.display = 'none';
        }
        this.resetBattleResultOverlay();
        this.clearBattleFxTimers();
        this.battleFx = null;
        if (this.battleTimer) clearInterval(this.battleTimer);
        this.battleContext = null;
    }

    closeBattlePrepModal() {
        console.log("Closing Battle Prep Modal (Inline)");
        try {
            // Clear Army Targets to prevent loop
            this.armies.forEach(army => {
                if (army.state === 'IDLE' || army.state === 'MOVING_TO') {
                    army.target = null;
                    army.path = [];
                }
            });

            const prepModal = document.getElementById('modal-battle-prep');
            if (prepModal) {
                prepModal.classList.remove('open');
                prepModal.style.display = 'none';
            }
            const battleModal = document.getElementById('modal-battle');
            if (battleModal) {
                battleModal.classList.remove('open');
                battleModal.style.display = 'none';
            }
            this.clearBattleFxTimers();
            this.battleFx = null;
            this.battleContext = null;
            this.saveGame();
        } catch (e) {
            console.error("Critical Error closing prep:", e);
            // Absolute Emergency Fallback
            document.getElementById('modal-battle-prep').style.display = 'none';
            document.getElementById('modal-battle').style.display = 'none';
        }
    }

    cloneDefenders(defenders) {
        if (!defenders) return [];
        return defenders.map(d => ({ code: d.code, count: d.count, slot: d.slot }));
    }

    parseDefenders(defenders, level) {
        const result = [];
        // Fixed slot assignment if provided, otherwise sequential filling?
        // Logic: if defender has 'slot', use it. Else fill 0..
        // But the input 'defenders' from FIELD_OBJECT_DATA is usually [{code, count, slot}, ...]
        // The slot in JSON is just 'slot': 0, 1, 2... 
        // We should map them.

        const slotsUsed = new Set();

        defenders.forEach(d => {
            for (let i = 0; i < d.count; i++) {
                let currentSlot = (d.slot !== undefined) ? (d.slot + i) : 0;
                // If collision, find next empty?
                while (slotsUsed.has(currentSlot) && currentSlot < 9) currentSlot++;
                if (currentSlot >= 9) break;

                slotsUsed.add(currentSlot);

                const lv = typeof level === "string" ? parseInt(level, 10) : level;
                const lookupCode = (d.code >= 10 && d.code < 20 && lv)
                    ? getCode(d.code, lv)
                    : d.code;
                const stats = UNIT_STATS[d.code] || UNIT_STATS[lookupCode] || { name: "Enemy", hp: 20, atk: 5, def: 2, spd: 5 };
                const classType = getUnitClassTypeFromCode(d.code);
                const spd = Number(stats.spd || 5);
                const range = Number(stats.range || stats.rng || 1);
                const move = Number(stats.move || stats.mov || 1);
                result.push({
                    id: `enemy-${currentSlot}`,
                    name: stats.name,
                    hp: stats.hp,
                    maxHp: stats.hp,
                    atk: stats.atk,
                    def: stats.def,
                    spd,
                    range,
                    move,
                    classType,
                    defenderCode: d.code,
                    slot: currentSlot,
                    isEnemy: true
                });
            }
        });
        return result;
    }

    // Note: unit keys might be strings in UNIT_STATS, so we handle that if needed, 
    // but usually they are accessed by code.
    // If UNIT_STATS is { '10': {...}, ... }
    getSquadUnits(squad) {
        const units = [];

        // Local helper for safe data retrieval including Dragon
        const getUnitDataSafe = (type, level) => {
            if (type === ITEM_TYPE.UNIT_DRAGON) {
                return { name: "Ancient Dragon", power: 9999, hp: 5000, atk: 300, def: 50, spd: 50, rng: 3, mov: 0 };
            }
            if (BUILDING_DATA[type] && BUILDING_DATA[type][level]) return BUILDING_DATA[type][level];

            // Prefer direct unit code lookup
            if (UNIT_STATS[type]) return UNIT_STATS[type];
            if (typeof level === "string") level = parseInt(level, 10);
            if (type >= 10 && type < 20 && level) {
                const code = getCode(type, level);
                if (UNIT_STATS[code]) return UNIT_STATS[code];
            }

            return { name: "Unknown Unit", hp: 10, atk: 1, def: 1, spd: 1 };
        };

        squad.forEach((u, i) => {
            if (u && u.type >= 10 && (u.type < 20 || u.type === ITEM_TYPE.UNIT_DRAGON)) {
                const data = getUnitDataSafe(u.type, u.level);
                const stats = this.applyFieldBuffsToStats(data);
                units.push({
                    id: `ally-${i}`,
                    name: data.name,
                    hp: stats.hp,
                    maxHp: stats.hp,
                    atk: stats.atk,
                    def: stats.def,
                    spd: stats.spd || 5, // Ensure SPD exists
                    range: Number(stats.range || stats.rng || 1),
                    move: Number(stats.move || stats.mov || 1),
                    classType: getUnitClassTypeFromCode(u.type),
                    slot: i,
                    isEnemy: false
                });
            }
        });
        return units;
    }

    getSquadByArmyId(id) {
        if (id === 0) return this.squad1;
        if (id === 1) return this.squad2;
        return this.squad3;
    }

    clearBattleFxTimers() {
        if (this.battleFxPhaseTimer) {
            clearTimeout(this.battleFxPhaseTimer);
            this.battleFxPhaseTimer = null;
        }
        if (this.battleFxClearTimer) {
            clearTimeout(this.battleFxClearTimer);
            this.battleFxClearTimer = null;
        }
    }

    triggerBattleFx(step) {
        if (!step || step.type !== 'attack') return;
        this.clearBattleFxTimers();
        const move = this.getBattleMoveOffset(step);
        const shot = this.getBattleShotOffset(step);
        const hasProjectile = !!step.rangedShot;
        this.battleFx = {
            attackerId: step.attackerId,
            defenderId: step.defenderId,
            moved: !!step.moved,
            damage: Number(step.damage || 0),
            isCrit: !!step.isCrit,
            phase: step.moved ? 'move' : (hasProjectile ? 'projectile' : 'impact'),
            moveX: move.x,
            moveY: move.y,
            pathSteps: move.steps,
            shotX: shot.x,
            shotY: shot.y,
            hasProjectile
        };
        const advanceTo = (phase) => {
            if (!this.battleFx || this.battleFx.attackerId !== step.attackerId || this.battleFx.defenderId !== step.defenderId) return;
            this.battleFx.phase = phase;
            this.renderBattleModal();
        };
        let delay = 0;
        if (step.moved) {
            delay += 190;
            this.battleFxPhaseTimer = setTimeout(() => {
                if (hasProjectile) {
                    advanceTo('projectile');
                    this.battleFxPhaseTimer = setTimeout(() => advanceTo('impact'), 160);
                } else {
                    advanceTo('impact');
                }
            }, delay);
        } else if (hasProjectile) {
            delay += 170;
            this.battleFxPhaseTimer = setTimeout(() => advanceTo('impact'), delay);
        }

        const clearDelay = step.moved
            ? (hasProjectile ? 700 : 560)
            : (hasProjectile ? 580 : 440);
        this.battleFxClearTimer = setTimeout(() => {
            this.battleFx = null;
            this.renderBattleModal();
        }, clearDelay);
    }

    getBattleMoveOffset(step) {
        const movedSteps = Math.max(0, Number(step?.requiredMove || 0));
        if (!movedSteps) return { x: 0, y: 0, steps: 0 };

        const a = step?.attackerPos || { r: 1, c: 1 };
        const d = step?.defenderPos || { r: 1, c: 1 };
        const rowDir = Math.sign((d.r ?? 1) - (a.r ?? 1));
        const colDir = Math.sign((d.c ?? 1) - (a.c ?? 1));
        const sideDir = step?.attackerTeam === 'B' ? -1 : 1;
        const steps = Math.max(1, Math.min(3, movedSteps));
        const horizontal = (5 + (steps * 3)) * sideDir;
        const vertical = ((rowDir * 3) + (colDir * 1)) * steps;
        return { x: horizontal, y: vertical, steps };
    }

    getBattleShotOffset(step) {
        const dist = Math.max(1, Number(step?.distance || 1));
        const a = step?.attackerPos || { r: 1, c: 1 };
        const d = step?.defenderPos || { r: 1, c: 1 };
        const sideDir = step?.attackerTeam === 'B' ? -1 : 1;
        const rowDelta = (d.r ?? 1) - (a.r ?? 1);
        const colDelta = (d.c ?? 1) - (a.c ?? 1);
        const travel = Math.max(14, Math.min(28, 8 + (dist * 4)));
        const x = travel * sideDir;
        const y = Math.max(-10, Math.min(10, (rowDelta * 4) + (colDelta * 1.5)));
        return { x, y };
    }

    escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatBattleLogLine(msg) {
        const safe = this.escapeHtml(msg);
        let line = safe;
        line = line.replace(/\[CRIT\]/g, '<span class="battle-log-crit">[CRIT]</span>');
        line = line.replace(/(\d+\s*dmg)/gi, '<span class="battle-log-dmg">$1</span>');
        line = line.replace(/hp\s*(\d+\s*->\s*\d+)/gi, 'hp <span class="battle-log-hp">$1</span>');
        line = line.replace(/\((x\d+,y\d+)\)/gi, '(<span class="battle-log-coord">$1</span>)');
        const isHit = /-&gt;|->|dmg/i.test(safe);
        const cls = isHit ? 'battle-log-line hit' : 'battle-log-line';
        return `<div class="${cls}">${line}</div>`;
    }

    localizeBattleSide(side) {
        if (side === 'allies') return this.tr('battle.side.allies', {}, 'Allies');
        if (side === 'defenders') return this.tr('battle.side.defenders', {}, 'Defenders');
        return side;
    }

    localizeBattleLogMessage(msg) {
        if (typeof msg !== 'string') return msg;
        const text = msg.trim();
        if (!text) return msg;

        if (text === 'Battle simulation start') {
            return this.tr('battle.log.start', {}, 'Battle started!');
        }

        let m = text.match(/^\[Turn\s+(\d+)\]$/i);
        if (m) {
            return this.tr('battle.log.turn', { turn: m[1] }, `[Turn ${m[1]}]`);
        }

        m = text.match(/^(.+)\s+cannot reach a target$/i);
        if (m) {
            return this.tr('battle.log.cannot_reach', { name: m[1] }, `${m[1]} cannot reach a target`);
        }

        m = text.match(/^Winner:\s*(allies|defenders)$/i);
        if (m) {
            const side = this.localizeBattleSide(m[1].toLowerCase());
            return this.tr('battle.log.winner', { winner: side }, `Winner: ${side}`);
        }

        m = text.match(/^Max turns reached,\s*winner by remaining HP:\s*(allies|defenders)$/i);
        if (m) {
            const side = this.localizeBattleSide(m[1].toLowerCase());
            return this.tr('battle.log.max_turns_winner', { winner: side }, `Max turns reached, winner by remaining HP: ${side}`);
        }

        m = text.match(/^(.+)\s+defeated$/i);
        if (m) {
            return this.tr('battle.log.kill', { name: m[1] }, `${m[1]} defeated!`);
        }

        return msg;
    }

    renderBattleModal() {
        if (!this.battleContext) return;
        const ctx = this.battleContext;

        const allyGrid = document.getElementById('battle-grid-ally');
        // ... (Keep existing Battle Modal Logic, but ensure it handles 9 slots correctly)
        // Previous generic logic:
        // if (allyGrid) { ... loop 9 ... } 
        // We must preserve that.

        if (allyGrid) {
            allyGrid.innerHTML = '';
            for (let i = 0; i < 9; i++) {
                const cell = document.createElement('div');
                cell.className = 'battle-cell ally';

                // Find unit by SLOT, not just push order
                const unit = ctx.allies.find(u => u.slot === i);

                if (unit) {
                    const fx = this.battleFx;
                    const isActor = !!fx && fx.attackerId === unit.id;
                    const isTarget = !!fx && fx.defenderId === unit.id;
                    if (isActor) {
                        cell.classList.add('battle-cell-actor');
                        if (fx.phase === 'move') {
                            cell.classList.add('battle-cell-move');
                            cell.style.setProperty('--fx-move-x', `${Number(fx.moveX || 0)}px`);
                            cell.style.setProperty('--fx-move-y', `${Number(fx.moveY || 0)}px`);
                        }
                        if (fx.phase === 'projectile') {
                            cell.classList.add('battle-cell-shot');
                            cell.style.setProperty('--fx-shot-x', `${Number(fx.shotX || 0)}px`);
                            cell.style.setProperty('--fx-shot-y', `${Number(fx.shotY || 0)}px`);
                        }
                        if (fx.phase === 'impact') cell.classList.add('battle-cell-attack');
                    }
                    if (isTarget) {
                        cell.classList.add('battle-cell-target');
                        if (fx.phase === 'impact') cell.classList.add('battle-cell-hit');
                    }
                    cell.innerHTML = `
                        <div class="battle-unit">
                            <div style="font-size:20px;">${this.isDead(unit) ? 'DEAD' : this.getUnitIcon(unit.classType)}</div>
                            <div class="battle-hp-bar"><div class="battle-hp-fill" style="width:${(unit.hp / unit.maxHp) * 100}%"></div></div>
                        </div>
                    `;
                    if (isTarget && fx.phase === 'impact' && fx.damage > 0) {
                        const dmg = document.createElement('div');
                        dmg.className = `battle-dmg-float${fx.isCrit ? ' crit' : ''}`;
                        dmg.innerText = `-${fx.damage}${fx.isCrit ? ' CRIT' : ''}`;
                        cell.appendChild(dmg);
                    }
                }
                allyGrid.appendChild(cell);
            }
        }

        const enemyGrid = document.getElementById('battle-grid-enemy');
        if (enemyGrid) {
            enemyGrid.innerHTML = '';
            for (let i = 0; i < 9; i++) {
                const cell = document.createElement('div');
                cell.className = 'battle-cell enemy';
                const unit = ctx.defenders.find(u => u.slot === i);
                if (unit) {
                    const fx = this.battleFx;
                    const isActor = !!fx && fx.attackerId === unit.id;
                    const isTarget = !!fx && fx.defenderId === unit.id;
                    if (isActor) {
                        cell.classList.add('battle-cell-actor');
                        if (fx.phase === 'move') {
                            cell.classList.add('battle-cell-move');
                            cell.style.setProperty('--fx-move-x', `${Number(fx.moveX || 0)}px`);
                            cell.style.setProperty('--fx-move-y', `${Number(fx.moveY || 0)}px`);
                        }
                        if (fx.phase === 'projectile') {
                            cell.classList.add('battle-cell-shot');
                            cell.style.setProperty('--fx-shot-x', `${Number(fx.shotX || 0)}px`);
                            cell.style.setProperty('--fx-shot-y', `${Number(fx.shotY || 0)}px`);
                        }
                        if (fx.phase === 'impact') cell.classList.add('battle-cell-attack');
                    }
                    if (isTarget) {
                        cell.classList.add('battle-cell-target');
                        if (fx.phase === 'impact') cell.classList.add('battle-cell-hit');
                    }
                    cell.innerHTML = `
                        <div class="battle-unit">
                            <div style="font-size:20px;">${this.isDead(unit) ? 'DEAD' : this.getUnitIcon(unit.classType)}</div>
                            <div class="battle-hp-bar"><div class="battle-hp-fill" style="width:${(unit.hp / unit.maxHp) * 100}%"></div></div>
                        </div>
                    `;
                    if (isTarget && fx.phase === 'impact' && fx.damage > 0) {
                        const dmg = document.createElement('div');
                        dmg.className = `battle-dmg-float${fx.isCrit ? ' crit' : ''}`;
                        dmg.innerText = `-${fx.damage}${fx.isCrit ? ' CRIT' : ''}`;
                        cell.appendChild(dmg);
                    }
                }
                enemyGrid.appendChild(cell);
            }
        }

        const logDiv = document.getElementById('battle-log');
        if (logDiv) {
            logDiv.innerHTML = ctx.log.map(l => this.formatBattleLogLine(l)).join('');
            logDiv.scrollTop = logDiv.scrollHeight;
        }
    }

    startBattleSimulation() {
        console.log("Starting Battle Simulation...");
        if (!this.battleContext) { console.error("No battle context starting sim"); return; }
        // Force Active
        this.battleContext.active = true;
        this.resetBattleResultOverlay();

        if (typeof BattleSimulator === 'undefined') {
            console.error("BattleSimulator module not loaded.");
            this.addBattleLog(this.tr('battle.error.simulator_missing', {}, 'Error: Battle Simulator missing.'));
            return;
        }

        // Force Close Controls
        const controls = document.getElementById('battle-controls');
        if (controls) controls.style.display = 'none';

        try {
            const sim = new BattleSimulator();
            console.log("Simulating result...");
            const result = sim.simulate(this.battleContext.allies, this.battleContext.defenders);
            console.log("Simulation Result:", result);

            this.battleSimulation = result;
            this.battleStepIndex = 0;
            this.battleContext.log = [];

            console.log("Starting Battle Timer...");
            if (this.battleTimer) clearInterval(this.battleTimer);
            this.battleTick(); // Run first tick immediately
            this.battleTimer = setInterval(() => this.battleTick(), 800);
        } catch (e) {
            console.error("Simulation Initialization Error:", e);
            this.addBattleLog(this.tr('battle.error.simulation', { message: e.message }, `Simulation Error: ${e.message}`));
        }
    }

    battleTick() {
        // console.log("Battle Tick", this.battleStepIndex);
        if (!this.battleContext || !this.battleContext.active || !this.battleSimulation) {
            // console.warn("Battle Tick skipped: Invalid State");
            return;
        }

        const steps = this.battleSimulation.steps;
        if (this.battleStepIndex >= steps.length) {
            console.log("Battle Ended via Steps");
            const winner = this.battleSimulation.winner;
            if (winner === 'allies') this.endBattle(true);
            else this.endBattle(false);
            return;
        }

        const step = steps[this.battleStepIndex];
        this.battleStepIndex++;

        if (step.type === 'log') {
            this.addBattleLog(step.msg);
        } else if (step.type === 'attack') {
            this.addBattleLog(step.msg);
            // Update HP
            const targetId = step.defenderId;
            let unit = this.battleContext.allies.find(u => u.id === targetId);
            if (!unit) unit = this.battleContext.defenders.find(u => u.id === targetId);

            if (unit) {
                unit.hp = step.targetHp;
                // Don't full re-render here if possible, but renderBattleModal does it safest.
            }
            this.triggerBattleFx(step);
        }

        this.renderBattleModal();
    }

    addBattleLog(msg) {
        if (this.battleContext) {
            this.battleContext.log.push(this.localizeBattleLogMessage(msg));
            this.renderBattleModal();
        }
    }

    endBattle(isWin) {
        clearInterval(this.battleTimer);
        this.battleContext.active = false;
        this.clearBattleFxTimers();
        this.battleFx = null;
        this.applyDefenderLoss(isWin);
        this.applyAllyLoss();
        this.handleEmptySquadRetreat(isWin);
        const rewardCtx = this.battleContext
            ? { targetCode: this.battleContext.targetCode, r: this.battleContext.r, c: this.battleContext.c }
            : null;

        const title = document.getElementById('battle-result-title');
        const overlay = document.getElementById('battle-result-overlay');
        if (overlay) overlay.style.display = 'flex';

        if (isWin) {
            if (title) {
                title.innerText = this.tr('battle.result.victory', {}, 'VICTORY');
                title.className = "battle-result-text win";
            }
            this.sound.playLevelUp();
            this.addBattleLog(this.tr('battle.log.victory_capture', {}, 'Battle won! Capturing tile.'));
            setTimeout(() => {
                if (rewardCtx) this.handleBattleWin(rewardCtx.r, rewardCtx.c);
                this.closeBattleModal();
                if (rewardCtx) this.openBattleRewardModal(rewardCtx);
            }, 1500);
        } else {
            if (title) {
                title.innerText = this.tr('battle.result.defeat', {}, 'DEFEAT');
                title.className = "battle-result-text lose";
            }
            this.sound.playError();
            this.addBattleLog(this.tr('battle.log.defeat_retreat', {}, 'Battle lost. Army retreats.'));
            // Retreat logic if needed
        }
    }

    applyDefenderLoss(isWin) {
        const ctx = this.battleContext;
        if (!ctx || ctx.defenderLossApplied) return;
        ctx.defenderLossApplied = true;
        if (!ctx.baseDefenders || ctx.baseDefenders.length === 0) return;

        const key = `${ctx.r},${ctx.c}`;
        const foughtCounts = {};
        const survivorCounts = {};

        ctx.defenders.forEach(unit => {
            const code = unit.defenderCode ?? unit.classType;
            foughtCounts[code] = (foughtCounts[code] || 0) + 1;
            if (unit.hp > 0) {
                survivorCounts[code] = (survivorCounts[code] || 0) + 1;
            }
        });

        if (isWin) {
            this.fieldDefenderState[key] = { type: ctx.targetCode, defenders: [] };
            this.saveGame();
            return;
        }

        const updated = ctx.baseDefenders.map(d => {
            const fought = foughtCounts[d.code] || 0;
            const survived = survivorCounts[d.code] || 0;
            const casualties = Math.max(0, fought - survived);
            const count = Math.max(0, (d.count || 0) - casualties);
            return { code: d.code, count, slot: d.slot };
        }).filter(d => d.count > 0);

        if (updated.length > 0) {
            this.fieldDefenderState[key] = { type: ctx.targetCode, defenders: updated };
        } else {
            this.fieldDefenderState[key] = { type: ctx.targetCode, defenders: [] };
        }
        this.saveGame();
    }

    applyAllyLoss() {
        const ctx = this.battleContext;
        if (!ctx || ctx.allyLossApplied) return;
        ctx.allyLossApplied = true;
        if (!ctx.squadRef || !Array.isArray(ctx.squadRef) || !ctx.allies) return;

        const deadSlots = new Set();
        ctx.allies.forEach(u => {
            if (u && u.hp <= 0) deadSlots.add(u.slot);
        });
        if (!deadSlots.size) return;

        deadSlots.forEach(slot => {
            if (slot >= 0 && slot < ctx.squadRef.length) ctx.squadRef[slot] = null;
        });

        this.saveGame();
        this.requestRender();
    }

    handleEmptySquadRetreat(isWin) {
        if (isWin) return;
        const ctx = this.battleContext;
        if (!ctx || !Array.isArray(ctx.squadRef)) return;
        const isEmpty = ctx.squadRef.every(u => !u);
        if (!isEmpty) return;

        const armyId = Number.isFinite(ctx.armyId) ? ctx.armyId : this.lastSelectedArmyId;
        if (!Number.isFinite(armyId)) return;
        this.retreatArmyToBase(armyId);
    }

    retreatArmyToBase(armyId) {
        const army = this.armies?.[armyId];
        if (!army) return;
        army.state = 'IDLE';
        army.target = null;
        army.path = [];
        army.stepTimes = null;
        army.nextStepIndex = 0;
        army.moveInterval = 0;
        army.lastMoveTime = 0;
        army.r = PLAYER_START.r;
        army.c = PLAYER_START.c;
        this.revealFog(army.r, army.c, FOG_RADIUS);
        this.updateArmies();
        this.requestRender();
    }

    getFieldObjectRewardEntries(rewardCode) {
        const raw = FIELD_OBJECT_REWARD_TABLE?.[rewardCode] ?? FIELD_OBJECT_REWARD_TABLE?.[String(rewardCode)];
        if (raw !== undefined && raw !== null) {
            if (Array.isArray(raw)) return raw;
            if (Array.isArray(raw.rewards)) return raw.rewards;
            if (typeof raw === 'object') return [raw];
        }

        if (rewardCode === 4 || rewardCode === ITEM_TYPE.BUILDING_CHEST) {
            return [{ kind: 'chest', level: 1, count: 1 }];
        }
        if (getInfoFromCode(rewardCode)) {
            return [{ kind: 'item_code', code: rewardCode, count: 1 }];
        }
        return [];
    }

    rollRewardValue(min, max, fallback = 0) {
        const nMin = Number(min);
        const nMax = Number(max);
        if (Number.isFinite(nMin) && Number.isFinite(nMax)) {
            const lo = Math.min(nMin, nMax);
            const hi = Math.max(nMin, nMax);
            return Math.floor(Math.random() * (hi - lo + 1)) + lo;
        }
        if (Number.isFinite(nMin)) return Math.floor(nMin);
        if (Number.isFinite(nMax)) return Math.floor(nMax);
        return Math.floor(Number(fallback) || 0);
    }

    resolveRewardCount(entry) {
        if (Array.isArray(entry?.count) && entry.count.length >= 2) {
            return Math.max(1, this.rollRewardValue(entry.count[0], entry.count[1], 1));
        }
        if (Number.isFinite(Number(entry?.count))) {
            return Math.max(1, Math.floor(Number(entry.count)));
        }
        return Math.max(1, this.rollRewardValue(entry?.min_count, entry?.max_count, 1));
    }

    pickRewardFromPool(pool) {
        if (!Array.isArray(pool) || pool.length === 0) return null;
        const weighted = pool
            .map((entry) => ({ entry, weight: Math.max(0, Number(entry?.weight) || 1) }))
            .filter((item) => item.weight > 0);
        if (!weighted.length) return null;
        const total = weighted.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * total;
        for (const item of weighted) {
            roll -= item.weight;
            if (roll <= 0) return item.entry;
        }
        return weighted[weighted.length - 1].entry;
    }

    grantFieldObjectRewardEntry(entry, rewardCode, depth = 0) {
        if (!entry || typeof entry !== 'object' || depth > 3) return false;
        const chance = Number(entry.chance ?? 100);
        if (Number.isFinite(chance) && chance < 100 && (Math.random() * 100) > chance) return false;

        const kind = String(entry.kind || entry.type || '').toLowerCase().trim();
        if (!kind) return false;

        if (kind === 'random_pool' || kind === 'pool') {
            const selected = this.pickRewardFromPool(entry.pool);
            return this.grantFieldObjectRewardEntry(selected, rewardCode, depth + 1);
        }

        if (kind === 'gold') {
            const amount = this.rollRewardValue(entry.min, entry.max, entry.amount);
            if (amount <= 0) return false;
            this.gold += amount;
            this.showToast(this.tr('toast.event_gold_gain', { value: amount }, `Gold obtained: ${amount}`));
            return true;
        }

        if (kind === 'energy') {
            const amount = this.rollRewardValue(entry.min, entry.max, entry.amount);
            if (amount <= 0) return false;
            const gained = Math.max(0, Math.min(amount, this.maxEnergy - this.energy));
            this.energy = Math.min(this.maxEnergy, this.energy + amount);
            this.showToast(this.tr('toast.energy_gain', { value: gained }, `+${gained}EN`));
            return gained > 0;
        }

        if (kind === 'cp') {
            const amount = this.rollRewardValue(entry.min, entry.max, entry.amount);
            if (amount <= 0) return false;
            const gained = Math.max(0, Math.min(amount, this.maxCp - this.cp));
            this.cp = Math.min(this.maxCp, this.cp + amount);
            this.showToast(this.tr('toast.cp_gain', { value: gained }, `+${gained}CP`));
            return gained > 0;
        }

        if (kind === 'gem' || kind === 'crystal') {
            const amount = this.rollRewardValue(entry.min, entry.max, entry.amount);
            if (amount <= 0) return false;
            this.gem += amount;
            this.showToast(this.tr('toast.gem_gain', { value: amount }, `+${amount}GEM`));
            return true;
        }

        if (kind === 'chest') {
            const level = Math.max(1, Math.floor(Number(entry.level) || 1));
            const count = this.resolveRewardCount(entry);
            let success = 0;
            for (let i = 0; i < count; i++) {
                if (this.spawnItem({ type: ITEM_TYPE.BUILDING_CHEST, level, scale: 0 })) success += 1;
            }
            if (success > 0) {
                const code = getCode(ITEM_TYPE.BUILDING_CHEST, level);
                if (success > 1) {
                    this.showToast(this.tr('toast.reward_item_gain_count', { code, count: success }, `Item obtained (Code ${code}) x${success}`));
                } else {
                    this.showToast(this.tr('toast.event_item_gain', { code }, `Item obtained (Code ${code})`));
                }
            }
            if (success < count) this.showToast(this.tr('toast.reward_chest_no_space', {}, 'Reward chest, but no space'));
            return success > 0;
        }

        if (kind === 'item_code' || kind === 'item') {
            const code = Number(entry.code);
            const info = getInfoFromCode(code);
            if (!info) return false;
            const count = this.resolveRewardCount(entry);
            let success = 0;
            for (let i = 0; i < count; i++) {
                if (this.spawnItem({ type: info.type, level: info.level, scale: 0 })) success += 1;
            }
            if (success > 0) {
                if (success > 1) this.showToast(this.tr('toast.reward_item_gain_count', { code, count: success }, `Item obtained (Code ${code}) x${success}`));
                else this.showToast(this.tr('toast.event_item_gain', { code }, `Item obtained (Code ${code})`));
            }
            if (success < count) this.showToast(this.tr('toast.reward_item_no_space', { code }, `Item obtained (Code ${code}), but no space`));
            return success > 0;
        }

        if (kind === 'item_type' || kind === 'type') {
            const itemType = Number(entry.item_type ?? entry.itemType ?? entry.type_code ?? entry.typeCode);
            const level = Math.max(1, Math.floor(Number(entry.level) || 1));
            if (!Number.isFinite(itemType)) return false;
            const count = this.resolveRewardCount(entry);
            let success = 0;
            for (let i = 0; i < count; i++) {
                if (this.spawnItem({ type: itemType, level, scale: 0 })) success += 1;
            }
            const code = getCode(itemType, level);
            const finalCode = code || itemType;
            if (success > 0) {
                if (success > 1) this.showToast(this.tr('toast.reward_item_gain_count', { code: finalCode, count: success }, `Item obtained (Code ${finalCode}) x${success}`));
                else this.showToast(this.tr('toast.event_item_gain', { code: finalCode }, `Item obtained (Code ${finalCode})`));
            }
            if (success < count) this.showToast(this.tr('toast.reward_item_no_space', { code: finalCode }, `Item obtained (Code ${finalCode}), but no space`));
            return success > 0;
        }

        return false;
    }

    applyFieldObjectReward(type) {
        const data = this.getFieldObjectData(type);
        const rewardCode = Number(data?.reward);
        if (!Number.isFinite(rewardCode) || rewardCode <= 0) return;

        const entries = this.getFieldObjectRewardEntries(rewardCode);
        if (!entries.length) {
            this.showToast(this.tr('toast.reward_unknown', { code: rewardCode }, `Reward obtained (Code ${rewardCode})`));
            return;
        }

        let granted = false;
        entries.forEach((entry) => {
            if (this.grantFieldObjectRewardEntry(entry, rewardCode)) granted = true;
        });
        if (!granted) this.showToast(this.tr('toast.reward_missed', { code: rewardCode }, `Reward roll missed (Code ${rewardCode})`));
    }

    handleBattleWin(r, c) {
        // Move victorious army to target
        const army = this.armies[this.lastSelectedArmyId] || this.armies.find(a => this.battleContext && a.id === this.battleContext.armyId) || this.armies[0];
        // Note: lastSelectedArmyId should be reliable as battle prep sets it. Better: use battleContext army?
        // battleContext doesn't store armyId explicitly yet, but we can infer or add it. 
        // Providing fallback to lastSelectedArmyId which is set in openBattlePrep
        if (this.lastSelectedArmyId !== null && this.lastSelectedArmyId !== undefined) {
            const a = this.armies[this.lastSelectedArmyId];
            if (a) {
                a.r = r; a.c = c;
                this.revealFog(r, c, FOG_RADIUS);
                this.updateArmies();
            }
        }

        const key = `${r},${c}`;
        if (this.fieldDefenderState && this.fieldDefenderState[key]) delete this.fieldDefenderState[key];

        // --- EVENT BATTLE WIN ---
        if (this.fieldEvents[key]) {
            const evt = this.fieldEvents[key];
            const drop = EVENT_DROP_TABLE[evt.type];
            if (drop) {
                // Gold Reward
                const gMin = drop.gold[0], gMax = drop.gold[1];
                const gold = Math.floor(Math.random() * (gMax - gMin + 1)) + gMin;
                this.gold += gold;
                this.showToast(this.tr('toast.event_gold_gain', { value: gold }, `Gold obtained: ${gold}`));

                // Item Reward
                drop.items.forEach(d => {
                    if (Math.random() * 100 < d.prob) {
                        // Assuming code fits ITEM_TABLE logic or simple resource
                        // TODO: Generalized Item Add
                        this.showToast(this.tr('toast.event_item_gain', { code: d.code }, `Item obtained (Code ${d.code})`));
                        // Implementation of adding to inventory/grid needed here or existing spawnItem
                    }
                });
            }

            if (evt.type === FIELD_EVENT_TYPES.CROWN) {
                this.onCrownCaptured(r, c);
            }

            // Remove Event
            delete this.fieldEvents[key];
            const marker = document.querySelector(`.event-marker[data-r="${r}"][data-c="${c}"]`)
                || document.querySelector(`.event-marker[style*="left: ${50 + c * 13}px"][style*="top: ${50 + r * 13}px"]`)
                || document.querySelector(`.event-marker[style*="left: ${c * 13}px"][style*="top: ${r * 13}px"]`);
            if (marker) marker.remove();

            this.updateUI();
            if (!evt.captureAfterWin) {
                this.saveGame();
                return; // Don't process tile capture for transient events
            }
        }

        if (this.occupiedTiles.has(key)) return;
        this.occupiedTiles.add(key);
        const type = FIELD_MAP_DATA[r][c];

        if (isGateTile(type)) {
            this.showToast(this.tr('toast.capture_gate', {}, 'Gate captured!'));
            this.sound.playUnlock();
            this.spawnParticles(this.width / 2, this.height / 2, "#FF0000", 50, "confetti");
        } else if (isDragonTile(type)) {
            const dragonSummary = this.finalizeDragonBossKill();
            this.showToast(this.tr('toast.dragon_kill', {}, 'Dragon defeated!'));
            if (dragonSummary) {
                const pct = Math.round(Math.max(0, Math.min(1, Number(dragonSummary.contributionShare) || 0)) * 100);
                this.showToast(this.tr('toast.dragon_contribution_tier', { tier: dragonSummary.tier, share: pct }, `Dragon contribution: ${dragonSummary.tier} (${pct}%)`));
            }
            this.sound.playUnlock();
            this.spawnParticles(this.width / 2, this.height / 2, "#ff6b6b", 50, "confetti");
            setTimeout(() => this.showVictoryModal(dragonSummary), 2000); // Trigger Victory after delay
        } else {
            this.showToast(this.tr('toast.capture_success', {}, 'Capture successful!'));
            this.sound.playCollect();
        }

        const effectMsg = this.getCaptureEffectToast(type);
        if (effectMsg) this.pushEffectLog(effectMsg);
        this.applyFieldObjectReward(type);

        this.updateOpenBorders();
        if (document.getElementById('field-modal').classList.contains('open')) {
            if (!this.refreshFieldMapVisuals()) {
                this.renderFieldMap();
            } else if (this.currentFieldTargetKey === key) {
                this.setFieldInfo(FIELD_MAP_DATA[r][c], r, c);
            }
        }
        this.updateUI(); this.saveGame();
    }

    isDead(unit) { return unit.hp <= 0; }
    getUnitIcon(type) {
        // Simplified icon logic
        if (type === ITEM_TYPE.UNIT_INFANTRY || (type >= 1100 && type < 1200)) return 'IN';
        if (type === ITEM_TYPE.UNIT_ARCHER || (type >= 1200 && type < 1300)) return 'AR';
        if (type === ITEM_TYPE.UNIT_CAVALRY || (type >= 1300 && type < 1400)) return 'CV';
        return '--';
    }
}
const game = new Game();
window.game = game;



