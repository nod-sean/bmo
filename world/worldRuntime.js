(function (global) {
    'use strict';

    const DEFAULT_DRAGON_BOSS_CONFIG = Object.freeze({
        baseRewards: Object.freeze({ gold: 3000, gem: 20, energy: 15, cp: 5, points: 25 }),
        tierMultiplier: Object.freeze({ s: 1.4, a: 1.15, b: 1.0, c: 0.8 }),
        minShareByTier: Object.freeze({ s: 0.5, a: 0.3, b: 0.15 }),
        killBonusGold: 500,
        killBonusPoints: 5
    });

    function pickObject(primary, fallback) {
        if (primary && typeof primary === 'object') return primary;
        if (fallback && typeof fallback === 'object') return fallback;
        return {};
    }

    function readNonNegative(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
    }

    function buildDragonBossConfig(gameplayConstants) {
        const raw = (gameplayConstants.DRAGON_BOSS && typeof gameplayConstants.DRAGON_BOSS === 'object')
            ? gameplayConstants.DRAGON_BOSS
            : {};
        const baseRaw = raw.baseRewards && typeof raw.baseRewards === 'object' ? raw.baseRewards : {};
        const multRaw = raw.tierMultiplier && typeof raw.tierMultiplier === 'object' ? raw.tierMultiplier : {};
        const shareRaw = raw.minShareByTier && typeof raw.minShareByTier === 'object' ? raw.minShareByTier : {};

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
    }

    function buildWorldRuntime(opts) {
        const {
            gameData,
            gameplayConstants,
            worldRuleSetKeys,
            normalizeWorldRuleSetName,
            mergeWorldRuleConfig,
            parseWorldEndConditions,
            parseWorldSeasonPolicy,
            parseWorldPreset,
            scoreDeps
        } = opts;

        const rawWorldRuleSets = pickObject(gameplayConstants.WORLD_RULESETS, gameData.constants?.WORLD_RULESETS);
        const worldRuleSets = Object.freeze({
            [worldRuleSetKeys.KIND]: mergeWorldRuleConfig(worldRuleSetKeys.KIND, rawWorldRuleSets.kind),
            [worldRuleSetKeys.NEUTRAL]: mergeWorldRuleConfig(worldRuleSetKeys.NEUTRAL, rawWorldRuleSets.neutral),
            [worldRuleSetKeys.CRUEL]: mergeWorldRuleConfig(worldRuleSetKeys.CRUEL, rawWorldRuleSets.cruel)
        });

        const defaultWorldRuleSet = normalizeWorldRuleSetName(
            gameplayConstants.WORLD_RULESET_DEFAULT
            || gameData.constants?.WORLD_RULESET_DEFAULT
            || worldRuleSetKeys.NEUTRAL
        );

        const rawWorldEndConditions = pickObject(gameplayConstants.WORLD_END_CONDITIONS, gameData.constants?.WORLD_END_CONDITIONS);
        const worldEndConditions = parseWorldEndConditions(rawWorldEndConditions);

        const rawWorldSeasonPolicy = pickObject(gameplayConstants.WORLD_SEASON_POLICY, gameData.constants?.WORLD_SEASON_POLICY);
        const worldSeasonPolicy = parseWorldSeasonPolicy(rawWorldSeasonPolicy);

        const rawWorldPresets = pickObject(gameplayConstants.WORLD_PRESETS, gameData.constants?.WORLD_PRESETS);
        const defaultWorldPresetId = String(
            gameplayConstants.WORLD_PRESET_DEFAULT
            || gameData.constants?.WORLD_PRESET_DEFAULT
            || 'regular'
        ).trim().toLowerCase();

        const parsedPresets = {};
        Object.entries(rawWorldPresets).forEach(([id, cfg]) => {
            const key = String(id || '').trim().toLowerCase();
            if (!key) return;
            parsedPresets[key] = parseWorldPreset(cfg, defaultWorldRuleSet);
        });
        if (!parsedPresets.regular) {
            parsedPresets.regular = Object.freeze({
                label: 'Regular',
                ruleSet: defaultWorldRuleSet,
                worldEndConditions,
                seasonPolicy: worldSeasonPolicy
            });
        }

        const worldAdminDeps = Object.freeze({
            WORLD_PRESETS: Object.freeze(parsedPresets),
            DEFAULT_WORLD_PRESET_ID: defaultWorldPresetId,
            WORLD_END_CONDITIONS: worldEndConditions,
            WORLD_SEASON_POLICY: worldSeasonPolicy,
            parseWorldEndConditions,
            parseWorldSeasonPolicy
        });

        const worldScoreDeps = Object.freeze({
            isCitadelTile: scoreDeps?.isCitadelTile || null,
            isGateTile: scoreDeps?.isGateTile || null,
            isDragonTile: scoreDeps?.isDragonTile || null,
            isShopTile: scoreDeps?.isShopTile || null,
            isTavernTile: scoreDeps?.isTavernTile || null,
            isGoldMineTile: scoreDeps?.isGoldMineTile || null,
            isFountainTile: scoreDeps?.isFountainTile || null
        });

        return {
            WORLD_RULESETS: worldRuleSets,
            DEFAULT_WORLD_RULESET: defaultWorldRuleSet,
            WORLD_END_CONDITIONS: worldEndConditions,
            WORLD_SEASON_POLICY: worldSeasonPolicy,
            WORLD_PRESETS: Object.freeze(parsedPresets),
            DEFAULT_WORLD_PRESET_ID: defaultWorldPresetId,
            DRAGON_BOSS_CONFIG: buildDragonBossConfig(gameplayConstants),
            WORLD_ADMIN_DEPS: worldAdminDeps,
            WORLD_SCORE_DEPS: worldScoreDeps
        };
    }

    global.KOVGameWorldRuntimeModule = {
        buildWorldRuntime
    };
})(window);
