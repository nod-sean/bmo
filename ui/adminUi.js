(function (global) {
    'use strict';

    function renderAdminPanel(game, deps) {
        deps = deps || game.adminUiDeps;
        if (!deps) return;
        const modal = document.getElementById('modal-admin');
        const presetSelect = document.getElementById('admin-preset-select');
        const summary = document.getElementById('admin-preset-summary');
        if (!modal || !presetSelect || !summary) return;

        const activePreset = window.KOVWorldSeasonModule.getActiveWorldPresetId(game, deps.WORLD_ADMIN_DEPS);
        presetSelect.innerHTML = '';
        Object.keys(deps.WORLD_PRESETS).forEach((id) => {
            const opt = document.createElement('option');
            opt.value = id;
            const cfg = window.KOVWorldSeasonModule.getWorldPresetConfig(game, id, { WORLD_PRESETS: deps.WORLD_PRESETS });
            opt.innerText = window.KOVWorldSeasonModule.getWorldPresetLabel(game, id, cfg);
            if (id === activePreset) opt.selected = true;
            presetSelect.appendChild(opt);
        });

        const selected = window.KOVWorldSeasonModule.getWorldPresetConfig(
            game,
            presetSelect.value || activePreset,
            { WORLD_PRESETS: deps.WORLD_PRESETS }
        ) || window.KOVWorldSeasonModule.getWorldPresetConfig(
            game,
            activePreset,
            { WORLD_PRESETS: deps.WORLD_PRESETS }
        );
        const endCfg = selected?.worldEndConditions || window.KOVWorldSeasonModule.getActiveWorldEndConditions(game, deps.WORLD_ADMIN_DEPS);
        const seasonCfg = selected?.seasonPolicy || window.KOVWorldSeasonModule.getActiveWorldSeasonPolicy(game, deps.WORLD_ADMIN_DEPS);
        const ruleLabel = window.KOVWorldSeasonModule.getWorldRuleSetLabel(game, selected?.ruleSet || window.KOVWorldSeasonModule.getGameWorldRuleSetName(game), { KIND: 'kind', NEUTRAL: 'neutral', CRUEL: 'cruel' });
        const endType = String(endCfg.type || 'king_castle_hold');
        const carry = seasonCfg.resourceCarryover || {};
        summary.innerHTML = `
            <div class="text-[12px] text-gray-200">${game.tr('ui.admin.summary.ruleset', {}, 'Ruleset')}: <b>${ruleLabel}</b></div>
            <div class="text-[12px] text-gray-200">${game.tr('ui.admin.summary.end_type', {}, 'End Type')}: <b>${endType}</b></div>
            <div class="text-[12px] text-gray-300">${game.tr('ui.admin.summary.end_target', {}, 'Targets')}: hold ${Math.floor((endCfg.targetHoldMs || 0) / 60000)}m / score ${endCfg.targetScore || 0}</div>
            <div class="text-[12px] text-gray-300">${game.tr('ui.admin.summary.season_policy', {}, 'Season Policy')}: grid=${seasonCfg.keepMergeGrid ? 'keep' : 'reset'}, squad=${seasonCfg.keepSquads ? 'keep' : 'reset'}, res=${seasonCfg.keepResources ? 'keep' : 'reset'}, pt=${seasonCfg.keepPoints ? 'keep' : 'reset'}</div>
            <div class="text-[12px] text-gray-300">${game.tr('ui.admin.summary.carryover', {}, 'Carryover')}: G ${carry.gold ?? 1}, GEM ${carry.gem ?? 1}, EN ${carry.energy ?? 1}, AP ${carry.cp ?? 1}, PT ${carry.points ?? 1}</div>
        `;
    }

    function onAdminPresetChange(game, deps) {
        deps = deps || game.adminUiDeps;
        return renderAdminPanel(game, deps);
    }

    function applyAdminPresetFromUI(game, deps) {
        deps = deps || game.adminUiDeps;
        if (!deps) return;
        const presetSelect = document.getElementById('admin-preset-select');
        const presetId = presetSelect ? presetSelect.value : window.KOVWorldSeasonModule.getActiveWorldPresetId(game, deps.WORLD_ADMIN_DEPS);
        if (!presetId) return;
        const ok = window.KOVWorldSeasonModule.applyWorldPreset(game, presetId, deps.WORLD_ADMIN_DEPS, { persist: true, silent: false });
        if (ok) renderAdminPanel(game, deps);
    }

    global.KOVAdminUiModule = {
        renderAdminPanel,
        onAdminPresetChange,
        applyAdminPresetFromUI
    };
})(window);
