(function (global) {
    'use strict';

    function getLocaleTable(localizationData, locale) {
        if (!localizationData || typeof localizationData !== 'object') return {};
        if (localizationData[locale] && typeof localizationData[locale] === 'object') return localizationData[locale];
        return localizationData;
    }

    function getTextByKey(table, key) {
        if (!table || typeof table !== 'object') return undefined;
        if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
        return String(key || '').split('.').reduce((acc, part) => {
            if (!acc || typeof acc !== 'object') return undefined;
            if (!Object.prototype.hasOwnProperty.call(acc, part)) return undefined;
            return acc[part];
        }, table);
    }

    function formatLocalizedText(template, params) {
        if (typeof template !== 'string') return '';
        const safeParams = params && typeof params === 'object' ? params : {};
        return template.replace(/\{(\w+)\}/g, (_, key) => {
            const value = safeParams[key];
            return value === undefined || value === null ? `{${key}}` : String(value);
        });
    }

    function createTranslator(localizationData, fallbackLocale) {
        const fallback = String(fallbackLocale || 'en').trim().toLowerCase() || 'en';
        return function translate(locale, key, params, fallbackText) {
            const primary = getTextByKey(getLocaleTable(localizationData, locale), key);
            const secondary = getTextByKey(getLocaleTable(localizationData, fallback), key);
            const isInvalidTemplate = (value) => {
                if (typeof value !== 'string') return true;
                const text = value.trim();
                if (!text) return true;
                return text === key;
            };
            const resolveKeyLikeFallback = () => {
                if (fallbackText) return fallbackText;
                const last = String(key || '').split('.').pop() || 'text';
                return last.replaceAll('_', ' ');
            };
            const template = !isInvalidTemplate(primary)
                ? primary
                : (!isInvalidTemplate(secondary) ? secondary : resolveKeyLikeFallback());
            return formatLocalizedText(template, params || {});
        };
    }

    global.KOVLocalizationRuntimeModule = {
        createTranslator,
        getLocaleTable,
        getTextByKey,
        formatLocalizedText
    };
})(window);
