(function (global) {
    'use strict';

    function applyCpBonuses(game) {
        const baseMax = game.baseMaxCp ?? game.maxCp ?? 20;
        const baseRegen = game.baseCpRegen ?? game.cpRegen ?? 1;
        game.maxCp = baseMax + (game.cpBonus || 0);
        game.cpRegen = Math.max(0, baseRegen + (game.cpRegenBonus || 0));
        if (game.cp > game.maxCp) game.cp = game.maxCp;
    }

    function showLevelUpModal(game, prevLv, prevEn, deps) {
        document.getElementById('lv-old').innerText = prevLv;
        document.getElementById('lv-new').innerText = game.lordLevel;
        document.getElementById('en-old').innerText = prevEn;
        const d = deps.LEVEL_DATA_BY_LEVEL.get(game.lordLevel);
        document.getElementById('en-new').innerText = d ? d.energy_max : 50;
        document.getElementById('modal-levelup').classList.add('open');
        const banner = document.getElementById('levelup-banner');
        banner.classList.remove('show');
        void banner.offsetWidth;
        banner.classList.add('show');
        setTimeout(() => banner.classList.remove('show'), 2500);
    }

    function regenEnergy(game, deps) {
        const now = Date.now();
        if (!Number.isFinite(game.energyLastRegenAt)) game.energyLastRegenAt = now;
        const elapsedSec = Math.max(0, (now - game.energyLastRegenAt) / 1000);
        game.energyLastRegenAt = now;

        let fountainBonus = 0;
        game.occupiedTiles.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            if (deps.isFountainTile(deps.FIELD_MAP_DATA[r][c])) fountainBonus += 1;
        });

        const regenPer5m = Math.max(0, Number(game.baseEnergyRegen || 0) + fountainBonus);
        if (game.energy >= game.maxEnergy || regenPer5m <= 0 || elapsedSec <= 0) return;
        game.energyRegenAcc = (game.energyRegenAcc || 0) + ((regenPer5m / 300) * elapsedSec);
        const gained = Math.floor(game.energyRegenAcc);
        if (gained > 0) {
            game.energy = Math.min(game.maxEnergy, game.energy + gained);
            game.energyRegenAcc -= gained;
            window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        }
    }

    function regenCp(game) {
        const now = Date.now();
        if (!Number.isFinite(game.cpLastRegenAt)) game.cpLastRegenAt = now;
        const elapsedSec = Math.max(0, (now - game.cpLastRegenAt) / 1000);
        game.cpLastRegenAt = now;

        const regenPer5m = Math.max(0, Number(game.cpRegen || 0));
        if (game.cp >= game.maxCp || regenPer5m <= 0 || elapsedSec <= 0) return;
        game.cpRegenAcc = (game.cpRegenAcc || 0) + ((regenPer5m / 300) * elapsedSec);
        const gained = Math.floor(game.cpRegenAcc);
        if (gained > 0) {
            game.cp = Math.min(game.maxCp, game.cp + gained);
            game.cpRegenAcc -= gained;
            window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        }
    }

    function initObjectRegen(game, deps) {
        if (!game.fieldObjectState) game.fieldObjectState = {};
        if (!game.fieldObjectState.regenByCode) game.fieldObjectState.regenByCode = {};
        if (!game.fieldObjectState.regenTargetByCode) game.fieldObjectState.regenTargetByCode = {};
        const now = Date.now();
        deps.FIELD_OBJECT_REGEN.forEach((entry) => {
            if ((entry.max || 0) <= 0) return;
            if (game.fieldObjectState.regenByCode[entry.code] === undefined) {
                game.fieldObjectState.regenByCode[entry.code] = now;
            }
            if (game.fieldObjectState.regenTargetByCode[entry.code] === undefined) {
                const min = entry.min || 0;
                const max = entry.max || 0;
                const span = Math.max(0, max - min);
                game.fieldObjectState.regenTargetByCode[entry.code] = min + (span > 0 ? Math.floor(Math.random() * (span + 1)) : 0);
            }
        });
        if (game.objectRegenTimer) clearInterval(game.objectRegenTimer);
        game.objectRegenTimer = setInterval(() => runObjectRegen(game, { applyObjectRegenCycle: deps.applyObjectRegenCycle }), 1000);
    }

    function runObjectRegen(game, deps) {
        const now = Date.now();
        if (!game.fieldObjectState.regenByCode) game.fieldObjectState.regenByCode = {};
        if (!game.fieldObjectState.regenTargetByCode) game.fieldObjectState.regenTargetByCode = {};
        const placements = deps.applyObjectRegenCycle(game.fieldObjectState.regenByCode, game.fieldObjectState.regenTargetByCode, now);
        if (placements.length > 0) {
            if (document.getElementById('field-modal').classList.contains('open') && !game.moveTargetMode) {
                window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
            } else {
                game.requestRender();
            }
        }
        window.KOVPersistenceModule.saveGame(game);
    }

    global.KOVGameProgressionModule = {
        applyCpBonuses,
        showLevelUpModal,
        regenEnergy,
        regenCp,
        initObjectRegen,
        runObjectRegen
    };
})(window);


