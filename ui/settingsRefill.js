(function (global) {
    'use strict';

    function toggleSetting(game, key, el) {
        if (!game.settings || typeof game.settings !== 'object') game.settings = {};
        game.settings[key] = !game.settings[key];
        if (el) {
            el.classList.toggle('on');
            const knob = el.querySelector('.toggle-knob');
            if (knob) knob.style.left = game.settings[key] ? '22px' : '2px';
        }
        if (key === 'bgm') {
            if (game.settings.bgm) game.sound.files.bgm.play().catch(() => { });
            else game.sound.files.bgm.pause();
        }
        if (key === 'push') {
            const mode = game.settings.push ? game.tr('ui.common.on', {}, 'ON') : game.tr('ui.common.off', {}, 'OFF');
            window.KOVUiShellModule.showToast(game, game.tr('toast.push_toggled', { mode }, `Push notifications: ${mode}`));
        }
        game.sound.enabled = game.settings.sfx;
        window.KOVPersistenceModule.saveGame(game);
    }

    function applySettings(game) {
        if (!game.settings || typeof game.settings !== 'object') game.settings = {};
        if (typeof game.settings.bgm !== 'boolean') game.settings.bgm = true;
        if (typeof game.settings.sfx !== 'boolean') game.settings.sfx = true;
        if (typeof game.settings.push !== 'boolean') game.settings.push = true;
        game.sound.enabled = game.settings.sfx;

        const syncToggle = (id, enabled) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.toggle('on', !!enabled);
            const knob = el.querySelector('.toggle-knob');
            if (knob) knob.style.left = enabled ? '22px' : '2px';
        };
        syncToggle('settings-bgm-toggle', game.settings.bgm);
        syncToggle('settings-sfx-toggle', game.settings.sfx);
        syncToggle('settings-push-toggle', game.settings.push);
    }

    function getRedeemStorageKey(game) {
        const uid = window.KOVWorldSeasonModule.getLocalUid();
        return `kov_redeem_codes_v1_${uid}`;
    }

    function getRedeemedCodeMap(game) {
        try {
            const raw = localStorage.getItem(getRedeemStorageKey(game));
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch (e) { }
        return {};
    }

    function saveRedeemedCodeMap(game, map) {
        try {
            localStorage.setItem(getRedeemStorageKey(game), JSON.stringify(map || {}));
        } catch (e) { }
    }

    function applyRedeemCode(game) {
        const input = document.getElementById('settings-redeem-input');
        if (!input) return;
        const raw = String(input.value || '').trim();
        if (!raw) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.redeem_empty', {}, 'Please enter a code'));
            return;
        }
        const code = raw.toUpperCase();
        const rewardsByCode = {
            KOVWELCOME: { gold: 1000, gem: 30, energy: 10, cp: 3 },
            KOVSTARTER: { gold: 2000, gem: 50, energy: 15, cp: 5 }
        };
        const reward = rewardsByCode[code];
        if (!reward) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.redeem_invalid', {}, 'Invalid code'));
            return;
        }

        const redeemed = getRedeemedCodeMap(game);
        if (redeemed[code]) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.redeem_used', {}, 'Code already used'));
            return;
        }

        game.gold += Number(reward.gold || 0);
        game.gem += Number(reward.gem || 0);
        game.energy = Math.min(game.maxEnergy, game.energy + Number(reward.energy || 0));
        game.cp = Math.min(game.maxCp, game.cp + Number(reward.cp || 0));
        redeemed[code] = Date.now();
        saveRedeemedCodeMap(game, redeemed);
        input.value = '';
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        window.KOVUiShellModule.showToast(game, game.tr('toast.redeem_applied', {}, 'Code applied'));
    }

    function openSupport(game) {
        const url = 'https://github.com/nod-sean/bmo/issues';
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) { }
        window.KOVUiShellModule.showToast(game, game.tr('toast.support_opened', {}, 'Support page opened'));
    }

    function requestAccountDeletion(game) {
        const ok = window.confirm(game.tr('ui.settings.delete_confirm', {}, 'Delete account and all local data?'));
        if (!ok) return;
        window.KOVPersistenceModule.resetGame(game);
    }

    function getLocalDateKey() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function ensureRefillAdState(game) {
        if (!game.refillAdState || typeof game.refillAdState !== 'object') {
            game.refillAdState = { date: '', usage: { energy: 0, gold: 0, cp: 0 } };
        }
        if (!game.refillAdState.usage || typeof game.refillAdState.usage !== 'object') {
            game.refillAdState.usage = { energy: 0, gold: 0, cp: 0 };
        }
        const today = getLocalDateKey();
        if (game.refillAdState.date !== today) {
            game.refillAdState.date = today;
            game.refillAdState.usage = { energy: 0, gold: 0, cp: 0 };
        }
    }

    function getRefillAdRemain(game, type, limit) {
        ensureRefillAdState(game);
        const used = Number(game.refillAdState.usage[type] || 0);
        if (!limit || limit <= 0) return Number.MAX_SAFE_INTEGER;
        return Math.max(0, limit - used);
    }

    function consumeRefillAd(game, type, limit) {
        ensureRefillAdState(game);
        const remain = getRefillAdRemain(game, type, limit);
        if (remain <= 0) return false;
        game.refillAdState.usage[type] = Number(game.refillAdState.usage[type] || 0) + 1;
        return true;
    }

    function applyRefillGain(game, type, amount) {
        const gain = Math.max(0, Number(amount) || 0);
        if (gain <= 0) return;
        if (type === 'energy') game.energy = Math.min(game.maxEnergy, game.energy + gain);
        else if (type === 'cp') game.cp = Math.min(game.maxCp, game.cp + gain);
        else if (type === 'gold') game.gold += gain;
        else if (type === 'crystal') game.gem += gain;
    }

    function openRefill(game, type, deps) {
        const modal = document.getElementById('modal-refill');
        const content = document.getElementById('refill-options');
        const title = document.getElementById('refill-title');
        if (!modal || !content || !title) return;

        content.innerHTML = '';
        modal.classList.add('open');

        const sourceKey = (type === 'cp' && Array.isArray(deps.REFILL_DATA.ap)) ? 'ap' : type;
        const data = Array.isArray(deps.REFILL_DATA[sourceKey]) ? deps.REFILL_DATA[sourceKey] : [];
        title.innerText = type === 'energy' ? game.tr('ui.refill.energy', {}, 'Energy Refill')
            : (type === 'gold' ? game.tr('ui.refill.gold', {}, 'Gold Refill')
                : (type === 'cp' ? game.tr('ui.refill.ap', {}, 'AP Refill')
                    : game.tr('ui.refill.crystal', {}, 'Crystal Shop')));

        if (!data.length) {
            const empty = document.createElement('div');
            empty.className = 'text-xs text-gray-300';
            empty.innerText = game.tr('toast.coming_soon', {}, 'Coming soon');
            content.appendChild(empty);
            return;
        }

        if (type === 'crystal') {
            data.forEach((row) => {
                const amount = Number(row.crystal_refill || 0);
                const bonus = Number(row.bonus || 0);
                const cost = Number(row.cost || 0);

                const btn = document.createElement('button');
                btn.className = 'bg-gray-700 hover:bg-gray-600 p-4 rounded-lg flex justify-between items-center text-white border border-gray-600';
                const gainText = bonus > 0 ? `${amount} (+${bonus})` : `${amount}`;
                btn.innerHTML = `<span class="font-bold">GEM ${gainText}</span><span class="bg-blue-600 px-3 py-1 rounded text-sm">$${cost}</span>`;
                btn.onclick = () => {
                    window.KOVUiShellModule.showToast(game, game.tr('toast.coming_soon', {}, 'Coming soon'));
                };
                content.appendChild(btn);
            });
            return;
        }

        const refillKey = `${sourceKey}_refill`;
        data.forEach((row) => {
            const amount = Number(row[refillKey] || 0);
            const costCrystal = Number(row.crystal || 0);
            const isAd = Number(row.ad || 0) === 1;
            const limit = Number(row.limit || 0);
            const remain = isAd ? getRefillAdRemain(game, type, limit) : Number.MAX_SAFE_INTEGER;
            const canUseAd = !isAd || remain > 0;

            const btn = document.createElement('button');
            btn.className = 'bg-gray-700 hover:bg-gray-600 p-4 rounded-lg flex justify-between items-center text-white border border-gray-600';
            if (isAd && !canUseAd) btn.classList.add('opacity-50', 'cursor-not-allowed');

            const leftLabel = isAd ? `AD +${amount}${limit > 0 ? ` (${remain}/${limit})` : ''}` : `+${amount}`;
            const rightLabel = isAd ? game.tr('ui.refill.watch_ad', {}, 'Watch Ad') : `GEM ${costCrystal}`;
            btn.innerHTML = `<span class="font-bold">${leftLabel}</span><span class="bg-blue-600 px-3 py-1 rounded text-sm">${rightLabel}</span>`;

            btn.onclick = () => {
                if (isAd) {
                    if (!consumeRefillAd(game, type, limit)) {
                        window.KOVUiShellModule.showToast(game, game.tr('toast.daily_limit_reached', {}, 'Daily limit reached'));
                        game.sound.playError();
                        return;
                    }

                    if (game.onlineMode && window.KOVServerApiModule?.EconomyApi) {
                        window.KOVServerApiModule.EconomyApi.refillResource({ type, amount, cost: 0, ad: 1 })
                            .then(res => {
                                if (res && res.success) {
                                    applyRefillGain(game, type, amount);
                                    const data = res.data || {};
                                    if (data.gem !== undefined) game.gem = data.gem;
                                    if (data.energy !== undefined && type === 'energy') game.energy = data.energy;
                                    if (data.cp !== undefined && type === 'cp') game.cp = data.cp;
                                    if (data.gold !== undefined && type === 'gold') game.gold = data.gold;

                                    game.sound.playCollect();
                                    window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
                                    openRefill(game, type, deps);
                                } else {
                                    window.KOVUiShellModule.showToast(game, res?.error?.message || res?.err?.msg || 'Failed');
                                }
                            }).catch(() => {
                                window.KOVUiShellModule.showToast(game, 'Network error');
                            });
                        return;
                    }

                    applyRefillGain(game, type, amount);
                    game.sound.playCollect();
                    window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
                    openRefill(game, type, deps);
                    return;
                }

                if (game.gem < costCrystal) {
                    window.KOVUiShellModule.showToast(game, game.tr('toast.gem_short', {}, 'Not enough crystals'));
                    game.sound.playError();
                    return;
                }

                if (game.onlineMode && window.KOVServerApiModule?.EconomyApi) {
                    window.KOVServerApiModule.EconomyApi.refillResource({ type, amount, cost: costCrystal })
                        .then(res => {
                            if (res && res.success) {
                                applyRefillGain(game, type, amount);
                                const data = res.data || {};
                                if (data.gem !== undefined) game.gem = data.gem;
                                if (data.energy !== undefined && type === 'energy') game.energy = data.energy;
                                if (data.cp !== undefined && type === 'cp') game.cp = data.cp;
                                if (data.gold !== undefined && type === 'gold') game.gold = data.gold;

                                game.sound.playCollect();
                                window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
                                modal.classList.remove('open');
                            } else {
                                window.KOVUiShellModule.showToast(game, res?.error?.message || res?.err?.msg || 'Failed');
                            }
                        }).catch(() => {
                            window.KOVUiShellModule.showToast(game, 'Network error');
                        });
                    return;
                }

                game.gem -= costCrystal;
                applyRefillGain(game, type, amount);
                game.sound.playCollect();
                window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
                modal.classList.remove('open');
            };

            content.appendChild(btn);
        });
    }

    global.KOVSettingsRefillModule = {
        toggleSetting,
        applySettings,
        getRedeemStorageKey,
        getRedeemedCodeMap,
        saveRedeemedCodeMap,
        applyRedeemCode,
        openSupport,
        requestAccountDeletion,
        getLocalDateKey,
        ensureRefillAdState,
        getRefillAdRemain,
        consumeRefillAd,
        applyRefillGain,
        openRefill
    };
})(window);



