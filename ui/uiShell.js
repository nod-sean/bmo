(function (global) {
    'use strict';

    function closeAllModals(game) {
        document.querySelectorAll('.modal-overlay').forEach((el) => {
            el.classList.remove('open');
            el.style.display = 'none';
        });
        window.KOVBattleCoreModule.clearBattleFxTimers(game);
        game.battleFx = null;
        game.battleContext = null;
    }

    function openSettings(game) {
        window.KOVUiShellModule.refreshLocaleControls(game, game.localeControlDeps);
        const modal = document.getElementById('modal-settings');
        if (modal) modal.classList.add('open');
    }

    function setLocale(game, locale) {
        if (!locale) return;
        game.locale = locale;
        try { localStorage.setItem('kov_locale', locale); } catch (e) { }
        refreshLocaleControls(game, game.localeControlDeps);
        showToast(game, game.tr('toast.locale_changed', { locale: locale.toUpperCase() }, `Language: ${locale}`));
    }

    function openAdminModal(game) {
        const deps = game.adminUiDeps || null;
        window.KOVAdminUiModule.renderAdminPanel(game, deps);
        const modal = document.getElementById('modal-admin');
        if (modal) modal.classList.add('open');
    }

    function closeAdminModal() {
        const modal = document.getElementById('modal-admin');
        if (modal) modal.classList.remove('open');
    }

    function closeModal(game) {
        window.KOVFieldCommandModule.exitMoveTargetMode(game);
        const fieldModal = document.getElementById('field-modal');
        const fieldMode = fieldModal?.dataset?.mode;
        if (fieldMode === 'world_end') {
            const claimed = window.KOVWorldSeasonModule.claimWorldEndRewards(game, { silent: true });
            if (claimed) showToast(game, game.tr('toast.world_end_rewards_claimed', {}, 'World end rewards claimed'));
        }
        if (fieldMode === 'caravan') {
            if (game.shopTimer) {
                clearInterval(game.shopTimer);
                game.shopTimer = null;
            }
            game.currentShopContext = null;
            document.querySelector('#modal-object .modal-content')?.classList.remove('wide');
            window.KOVFieldUiModule.clearPathPreview(game);
            window.KOVFieldUiModule.setMovePreview(game, '');
            window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
            return;
        }

        window.KOVFieldCameraModule.teardownFieldCamera(game);
        fieldModal?.classList.remove('open');
        if (fieldModal) {
            fieldModal.dataset.mode = '';
            fieldModal.hidden = true;
        }
        document.getElementById('modal-refill')?.classList.remove('open');
        document.getElementById('modal-settings')?.classList.remove('open');
        document.getElementById('modal-admin')?.classList.remove('open');
        document.getElementById('modal-lobby')?.classList.remove('open');
        document.getElementById('modal-object')?.classList.remove('open');

        if (game.shopTimer) {
            clearInterval(game.shopTimer);
            game.shopTimer = null;
        }
        game.currentShopContext = null;
        document.querySelector('#modal-object .modal-content')?.classList.remove('wide');
        window.KOVFieldUiModule.hideFieldActionMenu();
        window.KOVFieldUiModule.clearPathPreview(game);
        window.KOVFieldUiModule.setMovePreview(game, '');
        game.isDraggingMap = false;
    }

    function openObjectModal(title, bodyHtml) {
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

    function localizeToastMessage(game, msg) {
        if (typeof msg !== 'string') return msg;
        const text = msg.trim();
        if (!text) return msg;

        const exactMap = {
            'Sold out': 'toast.sold_out',
            'Not enough gold': 'toast.gold_short',
            'No space available': 'toast.space_short',
            'Purchased': 'toast.purchase_done',
            'Hired': 'toast.recruit_done',
            'Cannot move to this tile': 'toast.cannot_move',
            'No valid route': 'toast.no_path',
            'Army is already moving': 'toast.army_moving',
            'Not enough troops': 'toast.army_power_short',
            'Capture successful!': 'toast.capture_success',
            'Gate captured!': 'toast.capture_gate',
            'Dragon defeated!': 'toast.dragon_kill',
            'Message sent': 'toast.message_sent',
            'Collected': 'toast.collect_done',
            'Not enough merge slot space': 'toast.merge_slot_short',
            'Max level reached': 'toast.max_level',
            'Point shop coming soon': 'toast.point_shop_soon',
            'Coming soon': 'toast.coming_soon',
            'Capture a citadel to use this squad': 'toast.require_citadel'
        };
        if (exactMap[text]) return game.tr(exactMap[text], {}, text);

        let m = text.match(/^Not enough gold \((\d+)\)$/i);
        if (m) return game.tr('toast.gold_short_cost', { cost: m[1] }, text);
        m = text.match(/^Not enough energy \((\d+)\)$/i);
        if (m) return game.tr('toast.energy_short_cost', { cost: m[1] }, text);
        m = text.match(/^Not enough (CP|AP) \((\d+)\)$/i);
        if (m) return game.tr('toast.cp_short_cost', { cost: m[2] }, text);
        m = text.match(/^Out of range \((\d+)\s*\/\s*(\d+)\)$/i);
        if (m) return game.tr('toast.range_over', { dist: m[1], range: m[2] }, text);
        m = text.match(/^(.+)\s+march started$/i);
        if (m) return game.tr('toast.army_march_start', { army: m[1] }, text);
        m = text.match(/^(.+)\s+arrived$/i);
        if (m) return game.tr('toast.army_arrived', { army: m[1] }, text);
        m = text.match(/^Gold obtained:\s*(\d+)$/i);
        if (m) return game.tr('toast.event_gold_gain', { value: m[1] }, text);
        m = text.match(/^Item obtained \(Code (\d+)\)$/i);
        if (m) return game.tr('toast.event_item_gain', { code: m[1] }, text);

        return msg;
    }

    function showToast(game, msg) {
        const localized = localizeToastMessage(game, msg);
        if (typeof localized === 'string' && (localized.toLowerCase().includes('not enough') || localized.toLowerCase().includes('cannot'))) {
            game.sound.playError();
        }
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerText = localized;
        t.style.opacity = 1;
        setTimeout(() => {
            t.style.opacity = 0;
        }, 1000);
    }

    function showToastKey(game, key, params = {}, fallback = '') {
        showToast(game, game.tr(key, params, fallback || key));
    }

    function showFloatingImage(game, key, x, y) {
        const img = game.assets.getImage(key);
        if (!img) return;
        const el = document.createElement('img');
        el.src = img.src;
        el.className = 'float-img';
        const r = game.canvas.getBoundingClientRect();
        el.style.left = ((x / game.width) * r.width) + 'px';
        el.style.top = ((y / game.height) * r.height) + 'px';
        document.getElementById('canvas-wrapper')?.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    function showFloatingText(text, color) {
        const battleOpen = document.getElementById('modal-battle')?.classList.contains('open')
            || document.getElementById('modal-battle-prep')?.classList.contains('open');
        if (battleOpen) return;
        const el = document.createElement('div');
        el.innerText = text;
        el.id = 'income-float';
        el.style.color = color;
        el.style.left = '50%';
        el.style.top = '20%';
        el.style.transform = 'translate(-50%, 0)';
        document.getElementById('canvas-wrapper')?.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    function showJoinNotice(text) {
        const el = document.createElement('div');
        el.className = 'join-float';
        el.innerText = text;
        document.getElementById('game-container')?.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    function updateUI(game, deps) {
        document.getElementById('energy-display').innerText = `${game.energy}/${game.maxEnergy}`;
        document.getElementById('cp-display').innerText = `${game.cp}/${game.maxCp}`;
        document.getElementById('gold-display').innerText = game.gold;
        document.getElementById('gem-display').innerText = game.gem;
        document.getElementById('level-display').innerText = game.tr('ui.header.lord_level', { level: game.lordLevel }, `LORD LV.${game.lordLevel}`);
        const isMaxLevel = game.lordLevel >= deps.MAX_LEVEL || game.requiredXp <= 0;
        document.getElementById('xp-text').innerText = isMaxLevel ? game.tr('ui.header.xp_max', {}, 'MAX') : `${game.currentXp} / ${game.requiredXp}`;
        const xpWidth = isMaxLevel ? 100 : Math.max(0, Math.min(100, (game.currentXp / game.requiredXp) * 100));
        document.getElementById('xp-bar').style.width = `${xpWidth}%`;
        const fieldCp = document.getElementById('field-cp-display');
        if (fieldCp) fieldCp.innerText = `${game.cp}/${game.maxCp}`;
        window.KOVPersistenceModule.saveGame(game);
    }

    function refreshLocaleControls(game, deps) {
        const setText = (id, key, fallback) => {
            const el = document.getElementById(id);
            if (el) el.innerText = game.tr(key, {}, fallback);
        };
        const localeSelect = document.getElementById('locale-select');
        if (localeSelect) {
            localeSelect.value = game.locale || deps.DEFAULT_LOCALE;
            const optKo = localeSelect.querySelector('option[value="ko"]');
            const optEn = localeSelect.querySelector('option[value="en"]');
            if (optKo) optKo.innerText = game.tr('ui.locale.ko', {}, 'Korean');
            if (optEn) optEn.innerText = game.tr('ui.locale.en', {}, 'English');
        }
        const localeLabel = document.getElementById('locale-label');
        if (localeLabel) localeLabel.innerText = game.tr('ui.settings.language', {}, 'Language');
        const worldRuleSetLabel = document.getElementById('world-ruleset-label');
        if (worldRuleSetLabel) worldRuleSetLabel.innerText = game.tr('ui.settings.world_ruleset', {}, 'World Ruleset');

        const worldRuleSetSelect = document.getElementById('world-ruleset-select');
        if (worldRuleSetSelect) {
            worldRuleSetSelect.value = window.KOVWorldSeasonModule.getGameWorldRuleSetName(game);
            const optKind = worldRuleSetSelect.querySelector('option[value="kind"]');
            const optNeutral = worldRuleSetSelect.querySelector('option[value="neutral"]');
            const optCruel = worldRuleSetSelect.querySelector('option[value="cruel"]');
            if (optKind) optKind.innerText = game.tr('ui.world_ruleset.kind', {}, 'Kind');
            if (optNeutral) optNeutral.innerText = game.tr('ui.world_ruleset.neutral', {}, 'Neutral');
            if (optCruel) optCruel.innerText = game.tr('ui.world_ruleset.cruel', {}, 'Cruel');
        }

        document.title = game.tr('ui.page.title', {}, 'KOV');
        const settingsTitle = document.getElementById('settings-title');
        if (settingsTitle) settingsTitle.innerText = game.tr('ui.settings.title', {}, 'Settings');
        const resetBtn = document.getElementById('settings-reset-btn');
        if (resetBtn) resetBtn.innerText = game.tr('ui.settings.reset', {}, 'Reset Account');
        const closeBtn = document.getElementById('settings-close-btn');
        if (closeBtn) closeBtn.innerText = game.tr('ui.settings.close', {}, 'Close');
        const adminPresetSelect = document.getElementById('admin-preset-select');
        if (adminPresetSelect) {
            const current = window.KOVWorldSeasonModule.getActiveWorldPresetId(game, deps.WORLD_ADMIN_DEPS);
            adminPresetSelect.innerHTML = '';
            Object.keys(deps.WORLD_PRESETS).forEach((id) => {
                const opt = document.createElement('option');
                opt.value = id;
                const cfg = window.KOVWorldSeasonModule.getWorldPresetConfig(game, id, { WORLD_PRESETS: deps.WORLD_PRESETS });
                opt.innerText = window.KOVWorldSeasonModule.getWorldPresetLabel(game, id, cfg);
                if (id === current) opt.selected = true;
                adminPresetSelect.appendChild(opt);
            });
        }

        setText('footer-build-label', 'ui.footer.build', 'Build');
        setText('footer-field-label', 'ui.footer.field', 'Field');
        setText('footer-equipment-label', 'ui.footer.equipment', 'Equip');
        setText('modal-title', 'ui.modal.menu_title', 'Menu');
        setText('levelup-title', 'ui.modal.levelup.title', 'LEVEL UP!');
        setText('levelup-level-label', 'ui.modal.levelup.level', 'Level (Lord Level)');
        setText('levelup-energy-label', 'ui.modal.levelup.max_energy', 'Max Energy');
        setText('levelup-confirm-btn', 'ui.common.confirm', 'Confirm');
        setText('refill-title', 'ui.modal.refill_title', 'Refill');
        setText('settings-bgm-label', 'ui.settings.bgm', 'BGM');
        setText('settings-sfx-label', 'ui.settings.sfx', 'SFX');
        setText('settings-push-label', 'ui.settings.push', 'Push Notifications');
        setText('settings-uid-label', 'ui.settings.uid', 'UID');
        setText('settings-version-label', 'ui.settings.version', 'Version');
        setText('settings-redeem-label', 'ui.settings.redeem', 'Redeem Code');
        setText('settings-redeem-btn', 'ui.settings.apply', 'Apply');
        setText('settings-support-btn', 'ui.settings.support', 'Support');
        setText('settings-delete-btn', 'ui.settings.delete', 'Delete Account');
        setText('object-modal-title', 'ui.modal.object_title', 'Object');
        setText('object-modal-close-btn', 'ui.settings.close', 'Close');
        setText('equipment-title', 'ui.equipment.title', 'Equipment');
        setText('equipment-bag-title', 'ui.equipment.bag', 'Bag');
        setText('equipment-close-btn', 'ui.settings.close', 'Close');
        setText('battle-title-label', 'ui.battle.title', '? BATTLE');
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
        setText('battle-result-title', 'ui.battle.result.victory', 'VICTORY');
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
        setText('toast', 'ui.toast.default', 'Message');
        const redeemInput = document.getElementById('settings-redeem-input');
        if (redeemInput) redeemInput.placeholder = game.tr('ui.settings.redeem_placeholder', {}, 'Enter code');
        const lobbySelect = document.getElementById('lobby-channel-select');
        if (lobbySelect) {
            const labels = {
                alpha: game.tr('ui.lobby.channel.alpha', {}, 'Alpha'),
                beta: game.tr('ui.lobby.channel.beta', {}, 'Beta'),
                gamma: game.tr('ui.lobby.channel.gamma', {}, 'Gamma')
            };
            Array.from(lobbySelect.options).forEach((opt) => {
                const k = String(opt.value || '').toLowerCase();
                if (labels[k]) opt.innerText = labels[k];
            });
        }
        window.KOVLobbyChatModule.renderLobbyChannelStatus(game);
        window.KOVLobbyChatModule.updateChatTabUI(game);
        window.KOVAdminUiModule.renderAdminPanel(game, game.adminUiDeps || null);
        window.KOVSettingsRefillModule.applySettings(game);
    }

    global.KOVUiShellModule = {
        closeAllModals,
        openSettings,
        setLocale,
        openAdminModal,
        closeAdminModal,
        closeModal,
        openObjectModal,
        localizeToastMessage,
        showToast,
        showToastKey,
        showFloatingImage,
        showFloatingText,
        showJoinNotice,
        updateUI,
        refreshLocaleControls
    };
})(window);

