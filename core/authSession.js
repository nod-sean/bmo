(function (global) {
    'use strict';

    function getDeviceId() {
        try {
            const key = 'kov_guest_device_id';
            const saved = localStorage.getItem(key);
            if (saved && String(saved).trim()) return String(saved).trim();
            const created = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem(key, created);
            return created;
        } catch (e) {
            return `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }
    }

    async function restoreSession() {
        const api = global.KOVServerApiModule?.AuthApi;
        const client = global.KOVApiClientModule;
        if (!api || !client || typeof api.me !== 'function') return null;

        const token = client.getAuthToken();
        if (!token) return null;

        try {
            const me = await api.me(token);
            const isSuccess = me && (me.success === true || (me.data && Object.keys(me.data).length > 0));
            if (!isSuccess) {
                return null;
            }
            const data = me.data || me;
            return data.user || { uid: 'unknown', name: 'Unknown' };
        } catch (e) {
            console.warn('Session restore failed', e);
            return null;
        }
    }

    async function loginGuest(nickname) {
        const api = global.KOVServerApiModule?.AuthApi;
        const client = global.KOVApiClientModule;
        if (!api || !client) return null;

        try {
            let result;
            if (nickname) {
                // Register mode
                result = await api.joinGuest(getDeviceId(), nickname);
            } else {
                // Login mode
                result = await api.loginGuest(getDeviceId());
            }
            
            const err = result?.err || result?.error || (result?.data && (result.data.err || result.data.error));
            if (err?.code === 'user_not_found') {
                return { error: 'user_not_found' };
            }

            if (err) {
                return { error: err.code || 'login_failed', details: err };
            }

            const data = result?.data || result;
            const token = String(data?.token || '').trim();
            if (!token) return { error: 'no_token' };
            
            client.setAuthToken(token);
            const sessionData = await restoreSession();
            if (sessionData && data.spawnLocation) {
                sessionData.spawnLocation = data.spawnLocation;
            }
            return sessionData;
        } catch (e) {
            console.error('Guest login failed', e);
            return { error: 'network_error' };
        }
    }

    async function ensureGuestSession(game) {
        // Legacy support wrapper
        const user = await restoreSession();
        if (user) {
            if (!game.authSession) game.authSession = {};
            game.authSession.user = user;
            return user;
        }
        return await loginGuest();
    }

    async function logout() {
        const client = global.KOVApiClientModule;
        if (client) {
            client.setAuthToken(null);
            localStorage.removeItem('kov_auth_token');
        }
        window.location.reload();
    }

    global.KOVAuthSessionModule = {
        ensureGuestSession,
        loginGuest,
        restoreSession,
        logout
    };
})(window);
