(function (global) {
    'use strict';

    function trimTrailingSlash(url) {
        return String(url || '').trim().replace(/\/+$/, '');
    }

    function getApiBaseUrl() {
        return trimTrailingSlash(global.KOV_API_BASE_URL || '');
    }

    function genRequestId() {
        const rand = Math.random().toString(36).slice(2, 10);
        return `req-${Date.now()}-${rand}`;
    }

    function buildUrl(baseUrl, path, query) {
        const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
        const url = `${trimTrailingSlash(baseUrl)}${normalizedPath}`;
        if (!query || typeof query !== 'object') return url;
        const params = new URLSearchParams();
        Object.entries(query).forEach(([k, v]) => {
            if (v === undefined || v === null || v === '') return;
            params.set(k, String(v));
        });
        const qs = params.toString();
        return qs ? `${url}?${qs}` : url;
    }

    function getAuthToken() {
        if (typeof global.KOV_AUTH_TOKEN === 'string' && global.KOV_AUTH_TOKEN.trim()) {
            return global.KOV_AUTH_TOKEN.trim();
        }
        try {
            const saved = localStorage.getItem('kov_auth_token');
            return saved ? String(saved).trim() : '';
        } catch (e) {
            return '';
        }
    }

    function setAuthToken(token) {
        const normalized = String(token || '').trim();
        global.KOV_AUTH_TOKEN = normalized;
        try {
            if (normalized) localStorage.setItem('kov_auth_token', normalized);
            else localStorage.removeItem('kov_auth_token');
        } catch (e) { }
    }

    async function request(config) {
        const baseUrl = trimTrailingSlash(config?.baseUrl || getApiBaseUrl());
        if (!baseUrl) return null;
        const method = String(config?.method || 'GET').toUpperCase();
        const url = buildUrl(baseUrl, config?.path || '/', config?.query);
        const headers = Object.assign({ 'Content-Type': 'application/json' }, config?.headers || {});
        const token = config?.token || getAuthToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
            headers['x-access-token'] = token;
        }

        const opts = {
            method,
            headers,
            cache: 'no-store'
        };

        if (config?.body !== undefined && config?.body !== null) {
            opts.body = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, opts);
            const text = await response.text();
            let json = null;
            try { json = JSON.parse(text); } catch (e) { }

            // Return JSON body even on error status (400, 500) if valid JSON exists
            // This allows handling business errors like 'user_not_found'
            if (json) return json;
            
            if (!response.ok) return null;
            return {};
        } catch (e) {
            return null;
        }
    }

    async function requestWithIdempotency(config) {
        const method = String(config?.method || 'GET').toUpperCase();
        if (method === 'GET') return request(config);
        
        const requestId = genRequestId();
        const body = Object.assign({}, config?.body || {});
        // Keep body.requestId for legacy/fallback, but prefer header
        if (!body.requestId) body.requestId = requestId;
        
        const headers = Object.assign({
            'x-request-id': requestId,
            'x-trace-id': `trace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        }, config?.headers || {});

        return request(Object.assign({}, config, { body, headers }));
    }

    global.KOVApiClientModule = {
        getApiBaseUrl,
        genRequestId,
        getAuthToken,
        setAuthToken,
        request,
        requestWithIdempotency
    };
})(window);
