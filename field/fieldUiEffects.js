(function (global) {
    'use strict';

    function formatStatueBuffEffect(game, kind, value) {
        let stat = '';
        if (kind === 'atk') stat = game.tr('ui.field.stat.atk', {}, 'ATK');
        else if (kind === 'def') stat = game.tr('ui.field.stat.def', {}, 'DEF');
        else if (kind === 'hp') stat = game.tr('ui.field.stat.hp', {}, 'HP');
        else if (kind === 'spd') stat = game.tr('ui.field.stat.spd', {}, 'SPD');
        else stat = kind ? String(kind).toUpperCase() : game.tr('ui.field.stat.buff', {}, 'BUFF');
        const percent = window.KOVUiFormatModule.formatPercent(value);
        return game.tr('ui.field.effect.stat_buff', { stat, value: percent }, `${stat} +${percent}`);
    }

    function formatFieldAbilityEffect(game, code, value, opts, deps) {
        const options = opts || {};
        const val = Number(value);
        if (code === deps.ABILITY_CODES.GATE_OPEN) return game.tr('ui.field.effect.gate_open', {}, 'Gate opened');
        if (code === deps.ABILITY_CODES.SQUAD_SLOT) {
            const amount = Number.isFinite(val) && val > 0 ? val : 1;
            return game.tr('ui.field.effect.squad_slot', { value: amount }, `Squad slot +${amount}`);
        }
        if (code === deps.ABILITY_CODES.CP_CAP) return game.tr('ui.field.effect.cp_cap', { value: val }, `AP cap +${val}`);
        if (code === deps.ABILITY_CODES.CP_REGEN) return game.tr('ui.field.effect.cp_regen', { value: val }, `AP regen +${val}/5m`);
        if (code === deps.ABILITY_CODES.GOLD_CAP) return game.tr('ui.field.effect.gold_cap', { value: val }, `Gold cap +${val}`);
        if (code === deps.ABILITY_CODES.GOLD_REGEN) return game.tr('ui.field.effect.gold_regen', { value: val }, `Gold regen +${val}/5m`);
        if (code === deps.ABILITY_CODES.ENERGY_CAP) return game.tr('ui.field.effect.energy_cap', { value: val }, `Energy cap +${val}`);
        if (code === deps.ABILITY_CODES.ENERGY_REGEN) return game.tr('ui.field.effect.energy_regen', { value: val }, `Energy regen +${val}/5m`);
        if (code === deps.ABILITY_CODES.TAX) {
            if (deps.isShopTile(options.contextType) || deps.isTavernTile(options.contextType)) {
                return game.tr('ui.field.effect.income_hourly', { value: val }, `Income +${val}G/h`);
            }
            if (options.per3s) return game.tr('ui.field.effect.tax_3s', { value: val }, `Tax +${val}G/3s`);
            return game.tr('ui.field.effect.tax', { value: val }, `Tax +${val}G`);
        }
        if (code === deps.ABILITY_CODES.UPKEEP) return game.tr('ui.field.effect.upkeep_3s', { value: val }, `Upkeep -${val}G/3s`);
        return '';
    }

    function getCaptureEffectToast(game, type, deps) {
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        if (!data || !data.abilities) return '';
        const messages = [];
        data.abilities.forEach((ab) => {
            const message = formatFieldAbilityEffect(game, ab.code, ab.value, { per3s: false }, deps);
            if (message) messages.push(message);
        });
        if (deps.isStatueTile(type)) {
            const buff = window.KOVFieldStateModule.getStatueBuff(game, type, game.statueBuffDeps);
            if (buff) messages.push(formatStatueBuffEffect(game, buff.kind, buff.value));
        }
        return messages.join(', ');
    }

    function pushEffectLog(game, message) {
        if (!message) return;
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        game.effectLog.unshift({ time, message });
        if (game.effectLog.length > 5) game.effectLog.length = 5;
        renderEffectLog(game);
    }

    function renderEffectLog(game) {
        const panel = document.getElementById('field-effect-log');
        if (!panel) return;
        if (!game.effectLog.length) {
            panel.style.display = 'none';
            panel.innerHTML = '';
            return;
        }
        panel.style.display = 'flex';
        panel.innerHTML = `<div class=\"title\">${game.tr('ui.field.effects', {}, 'Effects')}</div>` + game.effectLog
            .map((entry) => `<div class=\"entry\">${entry.time} | ${entry.message}</div>`)
            .join('');
    }

    global.KOVFieldUiEffectsModule = {
        formatStatueBuffEffect,
        formatFieldAbilityEffect,
        getCaptureEffectToast,
        pushEffectLog,
        renderEffectLog
    };
})(window);
