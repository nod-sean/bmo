(function (global) {
    'use strict';

    function buildWorldRuntimeSlice(args) {
        const {
            requireGlobalModule,
            GAME_DATA,
            GAMEPLAY_CONSTANTS
        } = args;

        const WORLD_CONFIG_MODULE = requireGlobalModule('KOVWorldConfigModule');
        const WORLD_RUNTIME_MODULE = requireGlobalModule('KOVGameWorldRuntimeModule');
        const WORLD_RULESET_KEYS = WORLD_CONFIG_MODULE.WORLD_RULESET_KEYS;
        const normalizeWorldRuleSetName = WORLD_CONFIG_MODULE.normalizeWorldRuleSetName;
        const mergeWorldRuleConfig = WORLD_CONFIG_MODULE.mergeWorldRuleConfig;
        const parseWorldEndConditions = WORLD_CONFIG_MODULE.parseWorldEndConditions;
        const parseWorldSeasonPolicy = WORLD_CONFIG_MODULE.parseWorldSeasonPolicy;
        const parseWorldPreset = WORLD_CONFIG_MODULE.parseWorldPreset;
        const readNumberConstant = WORLD_CONFIG_MODULE.readNumberConstant;

        if (typeof normalizeWorldRuleSetName !== 'function'
            || typeof mergeWorldRuleConfig !== 'function'
            || typeof parseWorldEndConditions !== 'function'
            || typeof parseWorldSeasonPolicy !== 'function'
            || typeof parseWorldPreset !== 'function'
            || typeof readNumberConstant !== 'function') {
            throw new Error('[KOV] Invalid world config module wiring.');
        }
        if (typeof WORLD_RUNTIME_MODULE.buildWorldRuntime !== 'function') {
            throw new Error('[KOV] Invalid world runtime module wiring.');
        }

        const WORLD_RUNTIME = WORLD_RUNTIME_MODULE.buildWorldRuntime({
            gameData: GAME_DATA,
            gameplayConstants: GAMEPLAY_CONSTANTS,
            worldRuleSetKeys: WORLD_RULESET_KEYS,
            normalizeWorldRuleSetName,
            mergeWorldRuleConfig,
            parseWorldEndConditions,
            parseWorldSeasonPolicy,
            parseWorldPreset
        });

        const DEFAULT_WORLD_END_REWARD_CONFIG = Object.freeze({
            score: { gold: 1800, gem: 25, energy: 20, cp: 8, points: 40 },
            king_castle_hold: { gold: 3000, gem: 40, energy: 30, cp: 12, points: 60 },
            hybrid: { gold: 2400, gem: 32, energy: 25, cp: 10, points: 50 },
            modeMultiplier: { kind: 1.0, neutral: 1.1, cruel: 1.25 },
            scoreGoldPerPoint: 4,
            scorePointsPer100: 2
        });

        return {
            WORLD_RULESET_KEYS,
            normalizeWorldRuleSetName,
            readNumberConstant,
            WORLD_RULESETS: WORLD_RUNTIME.WORLD_RULESETS,
            DEFAULT_WORLD_RULESET: WORLD_RUNTIME.DEFAULT_WORLD_RULESET,
            WORLD_END_CONDITIONS: WORLD_RUNTIME.WORLD_END_CONDITIONS,
            WORLD_SEASON_POLICY: WORLD_RUNTIME.WORLD_SEASON_POLICY,
            WORLD_PRESETS: WORLD_RUNTIME.WORLD_PRESETS,
            DEFAULT_WORLD_PRESET_ID: WORLD_RUNTIME.DEFAULT_WORLD_PRESET_ID,
            WORLD_ADMIN_DEPS: WORLD_RUNTIME.WORLD_ADMIN_DEPS,
            DRAGON_BOSS_CONFIG: WORLD_RUNTIME.DRAGON_BOSS_CONFIG,
            DEFAULT_WORLD_END_REWARD_CONFIG
        };
    }

    global.KOVGameRuntimeWorldSliceModule = { buildWorldRuntimeSlice };
})(window);
