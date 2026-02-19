(function (global) {
    'use strict';

    function getBattleRewardOptions(game, rewardCtx) {
        const targetCode = Number(rewardCtx?.targetCode);
        const fieldLevel = Math.max(1, Number(window.KOVFieldStateModule.getFieldLevel(game, targetCode, game.fieldLevelDeps) || 1));
        const energyGain = Math.max(5, Math.min(20, 3 + (fieldLevel * 2)));
        const chestLevel = Math.max(1, Math.min(5, Math.ceil(fieldLevel / 2)));
        const adGold = Math.max(150, fieldLevel * 90);
        return [
            {
                kind: 'energy',
                icon: 'EN',
                title: game.tr('ui.battle_reward.energy', { value: energyGain }, `Energy +${energyGain}`),
                button: game.tr('ui.battle_reward.select', {}, 'Select'),
                energyGain
            },
            {
                kind: 'chest',
                icon: 'CH',
                title: game.tr('ui.battle_reward.chest', { level: chestLevel }, `Chest Lv.${chestLevel}`),
                button: game.tr('ui.battle_reward.select', {}, 'Select'),
                chestLevel
            },
            {
                kind: 'ad',
                icon: 'AD',
                title: game.tr('ui.battle_reward.ad_gold', { value: adGold }, `Bonus Gold +${adGold}`),
                button: game.tr('ui.refill.watch_ad', {}, 'Watch Ad'),
                adGold
            }
        ];
    }

    function openBattleRewardModal(game, rewardCtx) {
        const modal = document.getElementById('modal-object');
        const title = document.getElementById('object-modal-title');
        const body = document.getElementById('object-modal-body');
        if (!modal || !title || !body) return;

        game.pendingBattleReward = {
            ...rewardCtx,
            options: getBattleRewardOptions(game, rewardCtx),
            claimed: false
        };

        modal.style.display = '';
        modal.classList.add('open');
        modal.querySelector('.modal-content')?.classList.remove('wide');
        title.innerText = game.tr('ui.modal.battle_reward_title', {}, 'Battle Reward');
        body.innerHTML = '';

        const panel = document.createElement('div');
        panel.className = 'battle-reward-panel';

        const summary = game.lastFieldObjectRewardSummary;
        if (summary && (summary.granted || summary.missed)) {
            const summaryBox = document.createElement('div');
            summaryBox.className = 'battle-reward-summary mb-3 p-2 rounded bg-slate-700/60 text-xs text-white';
            const lines = [];
            lines.push(game.tr('ui.battle_reward.object_reward_title', { code: summary.rewardCode }, `Object Reward (Code ${summary.rewardCode})`));
            if (summary.gold > 0) lines.push(`- Gold +${summary.gold}`);
            if (summary.energy > 0) lines.push(`- Energy +${summary.energy}`);
            if (summary.cp > 0) lines.push(`- CP +${summary.cp}`);
            if (summary.gem > 0) lines.push(`- GEM +${summary.gem}`);
            if (Array.isArray(summary.chests)) {
                summary.chests.forEach((entry) => {
                    lines.push(`- Chest Lv.${entry.key} x${entry.count}`);
                });
            }
            if (Array.isArray(summary.items)) {
                summary.items.forEach((entry) => {
                    lines.push(`- Item Code ${entry.key} x${entry.count}`);
                });
            }
            if (!summary.granted) {
                lines.push(game.tr('toast.reward_missed', { code: summary.rewardCode }, `Reward roll missed (Code ${summary.rewardCode})`));
            }
            summaryBox.innerHTML = lines.map((line) => `<div>${line}</div>`).join('');
            panel.appendChild(summaryBox);
            game.lastFieldObjectRewardSummary = null;
        }

        const grid = document.createElement('div');
        grid.className = 'battle-reward-grid';

        game.pendingBattleReward.options.forEach((opt) => {
            const card = document.createElement('div');
            card.className = 'battle-reward-card';
            card.innerHTML = `
                <div class="icon">${opt.icon}</div>
                <div class="title">${opt.title}</div>
            `;
            const btn = document.createElement('button');
            btn.className = 'battle-reward-btn';
            btn.innerText = opt.button;
            btn.onclick = () => claimBattleReward(game, opt.kind, { ITEM_TYPE: { BUILDING_CHEST: 4 } });
            card.appendChild(btn);
            grid.appendChild(card);
        });

        panel.appendChild(grid);
        body.appendChild(panel);
    }

    function claimBattleReward(game, kind, deps) {
        const resolvedDeps = deps && deps.ITEM_TYPE ? deps : { ITEM_TYPE: { BUILDING_CHEST: 4 } };
        const state = game.pendingBattleReward;
        if (!state || state.claimed) return;
        const option = (state.options || []).find((opt) => opt.kind === kind);
        if (!option) return;

        if (kind === 'energy') {
            const gain = Number(option.energyGain || 0);
            const real = Math.max(0, Math.min(gain, game.maxEnergy - game.energy));
            game.energy = Math.min(game.maxEnergy, game.energy + gain);
            window.KOVUiShellModule.showToast(game, game.tr('toast.energy_gain', { value: real }, `+${real}EN`));
        } else if (kind === 'chest') {
            const level = Math.max(1, Number(option.chestLevel || 1));
            const chest = { type: resolvedDeps.ITEM_TYPE.BUILDING_CHEST, level, scale: 0, usage: 5 };
            if (!window.KOVMergeBoardModule.spawnItem(game, chest, game.spawnItemDeps)) {
                window.KOVUiShellModule.showToast(game, game.tr('toast.reward_chest_no_space', {}, 'Reward chest, but no space'));
                return;
            }
            window.KOVUiShellModule.showToast(game, game.tr('ui.battle_reward.chest_granted', { level }, `Chest Lv.${level} obtained`));
        } else if (kind === 'ad') {
            const gain = Math.max(0, Number(option.adGold || 0));
            game.gold += gain;
            window.KOVUiShellModule.showToast(game, game.tr('ui.battle_reward.ad_granted', { value: gain }, `Bonus Gold +${gain}`));
        }

        state.claimed = true;
        game.pendingBattleReward = null;
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        game.requestRender();

        const modal = document.getElementById('modal-object');
        modal?.classList.remove('open');
        document.querySelector('#modal-object .modal-content')?.classList.remove('wide');
    }

    global.KOVBattleRewardModule = {
        getBattleRewardOptions,
        openBattleRewardModal,
        claimBattleReward
    };
})(window);


