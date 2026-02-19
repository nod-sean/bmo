(function (global) {
    'use strict';

    function openPortalModal(game, r, c, preferredArmyId, deps) {
        if (window.KOVWorldSeasonModule.guardWorldAction(
            game,
            game.tr('ui.field.action.portal', {}, 'Portal'),
            window.KOVWorldSeasonModule.ensureWorldState(game),
            window.KOVWorldSeasonModule.getActiveWorldEndConditions(game, game.worldAdminDeps)
        )) return;
        const gp = deps.GAMEPLAY || deps;
        if (!gp.ENABLE_PORTAL) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.feature_disabled_beta', {}, 'This feature is disabled in beta.'));
            return;
        }
        const cpCost = Math.max(0, Number(gp.PORTAL_CP_COST));
        if (game.cp < cpCost) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.cp_short_cost', { cost: cpCost }, `Not enough CP (${cpCost})`));
            return;
        }

        const destination = window.KOVFieldEventLogicModule.getPortalDestination(game, r, c, {
            FIELD_EVENT_TYPES: { PORTAL: 2020 }
        });
        const fallback = destination ? null : window.KOVFieldEventLogicModule.getRandomPortalFallback(game, {
            MAP_SIZE: deps.MAP_SIZE,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            isBorderTerrain: deps.isBorderTerrain
        });
        const target = destination || fallback;
        if (!target) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.portal_unavailable', {}, 'Portal destination unavailable'));
            return;
        }

        const confirmText = destination
            ? game.tr('ui.modal.portal_confirm_target', { row: target.r + 1, col: target.c + 1, cost: cpCost }, `Use portal (CP ${cpCost}) and move to (${target.r + 1}, ${target.c + 1})?`)
            : game.tr('ui.modal.portal_confirm_random_cost', { cost: cpCost }, `Use portal (CP ${cpCost}) and move to a random position?`);
        if (!window.confirm(confirmText)) return;

        const army = window.KOVFieldEventLogicModule.getPortalActorArmy(game, preferredArmyId);
        if (!army) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.select_army_first', {}, 'Select an army first from the top.'));
            return;
        }
        if (army.state !== 'IDLE') {
            window.KOVUiShellModule.showToast(game, game.tr('toast.army_moving', {}, 'Army is already moving.'));
            return;
        }

        game.cp -= cpCost;
        army.r = target.r;
        army.c = target.c;
        army.target = null;
        army.path = [];
        window.KOVFieldEventLogicModule.revealFog(game, target.r, target.c, deps.FOG_RADIUS, game.revealFogDeps);
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        window.KOVFieldCommandModule.updateArmies(game, game.updateArmiesDeps);
        window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
        window.KOVPersistenceModule.saveGame(game);
        window.KOVUiShellModule.showToast(game, game.tr('toast.portal_activated', {}, 'Portal activated!'));
    }

    function showVictoryModal(game, dragonKillSummary) {
        const modal = document.getElementById('field-modal');
        const content = document.getElementById('modal-content');
        const title = document.getElementById('modal-title');
        title.innerText = game.tr('ui.modal.victory_title', {}, 'Victory!');
        modal.hidden = false;
        modal.classList.add('open');
        modal.dataset.mode = 'victory';

        const fallbackReward = { gold: 10000, gem: 0, energy: 0, cp: 0, points: 0 };
        const reward = dragonKillSummary?.reward || fallbackReward;
        const tier = String(dragonKillSummary?.tier || 'S');
        const shareText = dragonKillSummary
            ? `${Math.round(Math.max(0, Math.min(1, Number(dragonKillSummary.contributionShare) || 0)) * 100)}%`
            : '100%';
        const rankText = dragonKillSummary ? `${dragonKillSummary.rank || 1}` : '1';

        content.innerHTML = `
            <div class="flex flex-col items-center justify-center space-y-4 p-8">
                <div class="text-6xl animate-bounce">V</div>
                <div class="text-2xl font-bold text-yellow-300">${game.tr('ui.modal.victory.boss_cleared', {}, 'Boss Raid Cleared!')}</div>
                <div class="text-white text-center">
                    ${game.tr('ui.modal.victory.desc_line1', {}, 'Peace returns to the region.')}<br>
                    ${game.tr('ui.modal.victory.desc_line2', {}, 'New threats may appear soon.')}
                </div>
                <div class="border border-yellow-600 bg-black bg-opacity-50 p-4 rounded text-center w-full">
                    <div class="text-yellow-500 font-bold mb-2">${game.tr('ui.modal.victory.rewards', {}, 'Rewards')}</div>
                    <div class="text-sm">${game.tr('ui.modal.victory.reward_tier', { tier }, `Contribution Tier: ${tier}`)}</div>
                    <div class="text-sm">${game.tr('ui.modal.victory.reward_share', { value: shareText }, `Contribution Share: ${shareText}`)}</div>
                    <div class="text-sm">${game.tr('ui.modal.victory.reward_rank', { value: rankText }, `Contribution Rank: #${rankText}`)}</div>
                    <div class="text-sm">${game.tr('ui.modal.victory.reward_gold_dynamic', { value: reward.gold }, `Gold +${reward.gold}`)}</div>
                    <div class="text-sm">${game.tr('ui.modal.victory.reward_gem_dynamic', { value: reward.gem }, `GEM +${reward.gem}`)}</div>
                    <div class="text-sm">${game.tr('ui.modal.victory.reward_energy_dynamic', { value: reward.energy }, `Energy +${reward.energy}`)}</div>
                    <div class="text-sm">${game.tr('ui.modal.victory.reward_cp_dynamic', { value: reward.cp }, `CP +${reward.cp}`)}</div>
                    <div class="text-sm">${game.tr('ui.modal.victory.reward_points_dynamic', { value: reward.points }, `PT +${reward.points}`)}</div>
                </div>
                <button class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-8 rounded shadow-lg transform hover:scale-105 transition" onclick="window.KOVUiShellModule.closeModal(window.game)">
                    ${game.tr('ui.common.continue', {}, 'Continue')}
                </button>
            </div>
        `;

        if (!dragonKillSummary) window.KOVDragonBossModule.applyDragonBossReward(game, fallbackReward);
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        window.KOVPersistenceModule.saveGame(game);

        let fireworks = 0;
        const interval = setInterval(() => {
            if (fireworks++ > 10 || !modal.classList.contains('open')) clearInterval(interval);
            const x = Math.random() * game.width;
            const y = Math.random() * game.height;
            game.spawnParticles(x, y, `hsl(${Math.random() * 360}, 100%, 50%)`, 30, 'confetti');
        }, 500);
    }

    global.KOVFieldEventUiModule = {
        openPortalModal,
        showVictoryModal
    };
})(window);



