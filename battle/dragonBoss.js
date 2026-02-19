(function (global) {
    'use strict';

    function getBattleDamageByTeam(game, teamCode) {
        if (!game.battleSimulation || !Array.isArray(game.battleSimulation.steps)) return 0;
        return game.battleSimulation.steps.reduce((sum, step) => {
            if (!step || step.type !== 'attack') return sum;
            if (step.attackerTeam !== teamCode) return sum;
            const damage = Number(step.damage || 0);
            if (!Number.isFinite(damage) || damage <= 0) return sum;
            return sum + damage;
        }, 0);
    }

    function getDragonContributionTier(share, config) {
        const ratio = Math.max(0, Math.min(1, Number(share) || 0));
        const rule = config.minShareByTier;
        if (ratio >= rule.s) return 'S';
        if (ratio >= rule.a) return 'A';
        if (ratio >= rule.b) return 'B';
        return 'C';
    }

    function buildDragonBossReward(tier, share, didKill, config) {
        const normalizedTier = String(tier || 'C').trim().toUpperCase();
        const multTable = config.tierMultiplier;
        const key = normalizedTier.toLowerCase();
        const mult = Number(multTable[key]) || multTable.c || 1;
        const base = config.baseRewards;
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
            reward.gold += Math.max(0, Math.floor(Number(config.killBonusGold) || 0));
            reward.points += Math.max(0, Math.floor(Number(config.killBonusPoints) || 0));
        }
        return reward;
    }

    function applyDragonBossReward(game, reward) {
        if (!reward || typeof reward !== 'object') return;
        game.gold += Math.max(0, Number(reward.gold) || 0);
        game.gem += Math.max(0, Number(reward.gem) || 0);
        game.energy = Math.min(game.maxEnergy, game.energy + Math.max(0, Number(reward.energy) || 0));
        game.cp = Math.min(game.maxCp, game.cp + Math.max(0, Number(reward.cp) || 0));
        game.points = Math.max(0, Number(game.points || 0)) + Math.max(0, Number(reward.points) || 0);
    }

    function finalizeDragonBossKill(game, config) {
        const world = window.KOVWorldSeasonModule.ensureWorldState(game);
        const boss = window.KOVWorldSeasonModule.ensureDragonBossState(game);
        const uid = window.KOVWorldSeasonModule.getLocalUid();
        const playerName = game.userProfile?.name || window.KOVSocialProfileModule.getDefaultProfileName(game);

        const previousPlayerDamage = Math.max(0, Number(boss.byUid?.[uid]?.damage || 0));
        const battleDamage = Math.max(0, getBattleDamageByTeam(game, 'A'));
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
        const tier = getDragonContributionTier(share, config);
        const reward = buildDragonBossReward(tier, share, true, config);
        applyDragonBossReward(game, reward);

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

    global.KOVDragonBossModule = {
        getBattleDamageByTeam,
        getDragonContributionTier,
        buildDragonBossReward,
        applyDragonBossReward,
        finalizeDragonBossKill
    };
})(window);
