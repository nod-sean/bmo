(function (global) {
    'use strict';

    const WORLD_RULESET_KEYS = Object.freeze({
        KIND: 'kind',
        NEUTRAL: 'neutral',
        CRUEL: 'cruel'
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
        const mode = String(value || '').trim().toLowerCase();
        if (mode === WORLD_RULESET_KEYS.KIND) return WORLD_RULESET_KEYS.KIND;
        if (mode === WORLD_RULESET_KEYS.CRUEL) return WORLD_RULESET_KEYS.CRUEL;
        return WORLD_RULESET_KEYS.NEUTRAL;
    }

    function readWorldRuleBoolean(value, fallback) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
            if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
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
        const source = raw && typeof raw === 'object' ? raw : {};
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
        const source = raw && typeof raw === 'object' ? raw : {};
        const typeRaw = String(source.type || 'king_castle_hold').trim().toLowerCase();
        const allowedTypes = new Set(['king_castle_hold', 'score', 'hybrid']);
        const type = allowedTypes.has(typeRaw) ? typeRaw : 'king_castle_hold';
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
        const source = raw && typeof raw === 'object' ? raw : {};
        const carrySource = source.resource_carryover ?? source.resourceCarryover;
        const carry = carrySource && typeof carrySource === 'object' ? carrySource : {};
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
        const source = raw && typeof raw === 'object' ? raw : {};
        const ruleSet = normalizeWorldRuleSetName(source.rule_set || fallbackRuleSet || WORLD_RULESET_KEYS.NEUTRAL);
        const worldEndConditions = parseWorldEndConditions(source.world_end_conditions || {});
        const seasonPolicy = parseWorldSeasonPolicy(source.season_policy || {});
        const label = String(source.label || '').trim();
        return Object.freeze({ label, ruleSet, worldEndConditions, seasonPolicy });
    }

    function readNumberConstant(source, key, fallback) {
        const value = source ? source[key] : undefined;
        return (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;
    }

    global.KOVWorldConfigModule = {
        WORLD_RULESET_KEYS,
        DEFAULT_WORLD_RULESETS,
        normalizeWorldRuleSetName,
        mergeWorldRuleConfig,
        parseWorldEndConditions,
        parseWorldSeasonPolicy,
        parseWorldPreset,
        readNumberConstant
    };
})(window);
