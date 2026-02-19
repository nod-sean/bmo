(function (global) {
    'use strict';

    function formatTimeLeft(ms) {
        if (ms <= 0) return 'Ready';
        const totalMin = Math.ceil(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        if (h <= 0) return `${m}m`;
        return `${h}h ${m}m`;
    }

    function formatDurationCompact(ms) {
        const sec = Math.max(0, Math.ceil(ms / 1000));
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    function formatPercent(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return '0%';
        return `${Math.round(num * 100)}%`;
    }

    global.KOVUiFormatModule = {
        formatTimeLeft,
        formatDurationCompact,
        formatPercent
    };
})(window);
