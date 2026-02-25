(function (global) {
    'use strict';

    function getBattleRewardOptions(game, rewardCtx) {
        const targetCode = Number(rewardCtx?.targetCode);
        const fieldLevel = Math.max(1, Number(window.KOVFieldStateModule.getFieldLevel(game, targetCode, game.fieldLevelDeps) || 1));
        const energyGain = Math.max(5, Math.min(20, 3 + (fieldLevel * 2)));
        const chestLevel = Math.max(1, Math.min(5, Math.ceil(fieldLevel / 2)));
        
        let pool = [];
        if (targetCode && game.data && game.data.field_objects) {
            const obj = game.data.field_objects[targetCode];
            const rewardCode = obj?.reward || 0;
            const rewardTable = game.data.constants?.FIELD_OBJECT_REWARDS || {};
            const entries = rewardTable[String(rewardCode)];
            if (Array.isArray(entries)) {
                entries.forEach(e => {
                    if (e.kind === 'pool' && Array.isArray(e.pool)) {
                        pool.push(...e.pool);
                    }
                });
            }
        }

        if (!pool || pool.length === 0) {
            // Fallback to legacy
            pool = [
                { kind: 'gold', weight: 40, amount: fieldLevel * 100 },
                { kind: 'gem', weight: 20, amount: fieldLevel * 2 },
                { kind: 'energy', weight: 15, amount: energyGain },
                { kind: 'chest', weight: 15, level: chestLevel },
                { kind: 'cp', weight: 10, amount: fieldLevel * 5 }
            ];
        }

        // Pick 3 distinct rewards
        const options = [];
        const available = [...pool];
        for (let i = 0; i < 3 && available.length > 0; i++) {
            const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
            let roll = Math.random() * totalWeight;
            let selectedIndex = 0;
            for (let j = 0; j < available.length; j++) {
                roll -= available[j].weight;
                if (roll <= 0) {
                    selectedIndex = j;
                    break;
                }
            }
            const selected = available.splice(selectedIndex, 1)[0];
            options.push(selected);
        }

        // Map options to UI format
        return options.map(opt => {
            if (opt.kind === 'item_code' || opt.kind === 'item') {
                const code = opt.code;
                const def = game.data.items?.[code] || game.data.units?.[code] || game.data.buildings?.[code] || game.data.chests?.[code];
                const title = def ? (def.name_kr || def.name) : `Item ${code}`;
                
                let icon = '🎁';
                if (code >= 1801 && code <= 1810) icon = 'Gold';
                if (code >= 1811 && code <= 1820) icon = 'EN';
                if (code >= 1821 && code <= 1830) icon = 'GEM';
                if (code >= 2801 && code <= 2810) icon = 'CH';
                if (code >= 1101 && code <= 1500) icon = '⚔️';
                
                return {
                    originalOpt: opt,
                    kind: 'dynamic_item',
                    icon: icon,
                    title: game.tr('ui.battle_reward.item', { name: title }, title),
                    button: game.tr('ui.battle_reward.select', {}, 'Select')
                };
            }

            if (opt.kind === 'gold') {
                return {
                    originalOpt: opt,
                    kind: 'gold',
                    icon: 'Gold',
                    title: game.tr('ui.battle_reward.gold', { value: opt.amount }, `Gold +${opt.amount}`),
                    button: game.tr('ui.battle_reward.select', {}, 'Select'),
                    amount: opt.amount
                };
            }
            if (opt.kind === 'gem') {
                return {
                    originalOpt: opt,
                    kind: 'gem',
                    icon: 'GEM',
                    title: game.tr('ui.battle_reward.gem', { value: opt.amount }, `Gem +${opt.amount}`),
                    button: game.tr('ui.battle_reward.select', {}, 'Select'),
                    amount: opt.amount
                };
            }
            if (opt.kind === 'energy') {
                return {
                    originalOpt: opt,
                    kind: 'energy',
                    icon: 'EN',
                    title: game.tr('ui.battle_reward.energy', { value: opt.amount }, `Energy +${opt.amount}`),
                    button: game.tr('ui.battle_reward.select', {}, 'Select'),
                    energyGain: opt.amount
                };
            }
            if (opt.kind === 'chest') {
                return {
                    originalOpt: opt,
                    kind: 'chest',
                    icon: 'CH',
                    title: game.tr('ui.battle_reward.chest', { level: opt.level }, `Chest Lv.${opt.level}`),
                    button: game.tr('ui.battle_reward.select', {}, 'Select'),
                    chestLevel: opt.level
                };
            }
            if (opt.kind === 'cp') {
                return {
                    originalOpt: opt,
                    kind: 'cp',
                    icon: 'AP',
                    title: game.tr('ui.battle_reward.cp', { value: opt.amount }, `Action Point +${opt.amount}`),
                    button: game.tr('ui.battle_reward.select', {}, 'Select'),
                    amount: opt.amount
                };
            }
        });
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
            if (summary.cp > 0) lines.push(`- AP +${summary.cp}`);
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

        game.pendingBattleReward.options.forEach((opt, index) => {
            const card = document.createElement('div');
            card.className = 'battle-reward-card';
            card.innerHTML = `
                <div class="icon">${opt.icon}</div>
                <div class="title">${opt.title}</div>
            `;
            const btn = document.createElement('button');
            btn.className = 'battle-reward-btn';
            btn.innerText = opt.button;
            btn.onclick = () => claimBattleReward(game, index, { ITEM_TYPE: { BUILDING_CHEST: 4 } });
            card.appendChild(btn);
            grid.appendChild(card);
        });

        panel.appendChild(grid);
        body.appendChild(panel);
    }

    function claimBattleReward(game, index, deps) {
        const resolvedDeps = deps && deps.ITEM_TYPE ? deps : { ITEM_TYPE: { BUILDING_CHEST: 4 } };
        const state = game.pendingBattleReward;
        if (!state || state.claimed) return;
        const option = state.options[index];
        if (!option) return;

        const optData = option.originalOpt || option;
        const kind = optData.kind;

        if (kind === 'item_code' || kind === 'item') {
            if (window.KOVBattleResultModule && typeof window.KOVBattleResultModule.grantFieldObjectRewardEntry === 'function') {
                window.KOVBattleResultModule.grantFieldObjectRewardEntry(game, optData, state.targetCode || 0, resolvedDeps, null);
            } else {
                console.warn('KOVBattleResultModule missing, cannot grant item');
            }
        } else if (kind === 'energy') {
            const gain = Number(option.energyGain || optData.amount || 0);
            const real = Math.max(0, Math.min(gain, game.maxEnergy - game.energy));
            game.energy = Math.min(game.maxEnergy, game.energy + gain);
            window.KOVUiShellModule.showToast(game, game.tr('toast.energy_gain', { value: real }, `+${real}EN`));
        } else if (kind === 'chest') {
            const level = Math.max(1, Number(option.chestLevel || optData.level || 1));
            const chest = { type: resolvedDeps.ITEM_TYPE.BUILDING_CHEST, level, scale: 0, usage: 5 };
            if (!window.KOVMergeBoardModule.spawnItem(game, chest, game.spawnItemDeps)) {
                window.KOVUiShellModule.showToast(game, game.tr('toast.reward_chest_no_space', {}, 'Reward chest, but no space'));
                return;
            }
            window.KOVUiShellModule.showToast(game, game.tr('ui.battle_reward.chest_granted', { level }, `Chest Lv.${level} obtained`));
        } else if (kind === 'gold') {
            const gain = Math.max(0, Number(option.amount || optData.amount || 0));
            game.gold += gain;
            window.KOVUiShellModule.showToast(game, game.tr('ui.battle_reward.gold_granted', { value: gain }, `Gold +${gain}`));
        } else if (kind === 'gem') {
            const gain = Math.max(0, Number(option.amount || optData.amount || 0));
            game.gems += gain;
            window.KOVUiShellModule.showToast(game, game.tr('ui.battle_reward.gem_granted', { value: gain }, `Gem +${gain}`));
        } else if (kind === 'cp') {
            const gain = Math.max(0, Number(option.amount || optData.amount || 0));
            const real = Math.max(0, Math.min(gain, game.maxCp - game.cp));
            game.cp = Math.min(game.maxCp, game.cp + gain);
            window.KOVUiShellModule.showToast(game, game.tr('toast.cp_gain', { value: real }, `+${real}AP`));
        }

        state.claimed = true;
        game.pendingBattleReward = null;
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        game.requestRender();

        if (window.KOVServerApiModule && window.KOVServerApiModule.RewardApi) {
            window.KOVServerApiModule.RewardApi.claim('battle-reward').catch((err) => {
                console.warn('Failed to claim battle reward on server', err);
            });
        }

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


