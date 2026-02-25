(function (global) {
    'use strict';

    const API_PREFIX = '/api';

    function request(cfg) {
        const client = global.KOVApiClientModule;
        if (!client || typeof client.request !== 'function') return Promise.resolve(null);
        return client.request(cfg);
    }

    function requestWrite(cfg) {
        const client = global.KOVApiClientModule;
        if (!client || typeof client.requestWithIdempotency !== 'function') return Promise.resolve(null);
        return client.requestWithIdempotency(cfg);
    }

    function getTokenFromPayload(payload) {
        if (!payload || typeof payload !== 'object') return '';
        const token = payload.token || payload.accessToken || (payload.data && (payload.data.token || payload.data.accessToken)) || '';
        return String(token).trim();
    }

    const SystemApi = Object.freeze({
        health() {
            return request({ method: 'GET', path: `${API_PREFIX}/health` });
        },
        ping(seq) {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/ping`, body: { seq: Number(seq || 0) } });
        }
    });

    const AuthApi = Object.freeze({
        async login(payload) {
            const body = Object.assign({}, payload || {});
            if (!body.authType) return null;
            const response = await requestWrite({
                method: 'POST',
                path: `${API_PREFIX}/auth/login`,
                body
            });
            const token = getTokenFromPayload(response);
            if (token && global.KOVApiClientModule?.setAuthToken) {
                global.KOVApiClientModule.setAuthToken(token);
            }
            return response;
        },
        async loginGuest(deviceId) {
            return AuthApi.login({ authType: 'guest', deviceId: deviceId || undefined });
        },
        async joinGuest(deviceId, nickname) {
            return requestWrite({
                method: 'POST',
                path: `${API_PREFIX}/auth/join/guest`,
                body: { deviceId, nickname }
            });
        },
        async loginGoogle(idToken) {
            return AuthApi.login({ authType: 'google', idToken: String(idToken || '') });
        },
        async loginApple(identityToken) {
            return AuthApi.login({ authType: 'apple', identityToken: String(identityToken || '') });
        },
        async loginFacebook(accessToken) {
            return AuthApi.login({ authType: 'facebook', accessToken: String(accessToken || '') });
        },
        async loginEmail(email, password) {
            return AuthApi.login({ authType: 'email', email, password });
        },
        me(token) {
            return request({ method: 'GET', path: `${API_PREFIX}/auth/me`, token });
        }
    });

    // Current server/game may not expose these endpoints yet.
    // Keep wrapper methods for forward compatibility during migration.
    const LobbyApi = Object.freeze({
        getChannels() {
            return request({ method: 'GET', path: `${API_PREFIX}/lobby/channels` });
        },
        enter(channelId) {
            return requestWrite({
                method: 'POST',
                path: `${API_PREFIX}/lobby/enter`,
                body: { channelId: String(channelId || 'alpha').toLowerCase() }
            });
        }
    });

    const WorldApi = Object.freeze({
        getState(channelId) {
            return request({ method: 'GET', path: `${API_PREFIX}/world/state`, query: { channelId } });
        },
        move(payload) {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/world/move`, body: payload || {} });
        },
        interact(payload) {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/world/interact`, body: payload || {} });
        },
        clear() {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/world/clear`, body: {} });
        }
    });

    const BattleApi = Object.freeze({
        start(payload) {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/battle/start`, body: payload || {} });
        },
        finish(payload) {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/battle/finish`, body: payload || {} });
        }
    });

    const SocialApi = Object.freeze({
        getState() {
            return request({ method: 'GET', path: `${API_PREFIX}/social/state` });
        },
        getChatMessages(channel) {
            return request({ method: 'GET', path: `${API_PREFIX}/chat/messages`, query: { channel } });
        },
        sendChat(channel, text) {
            return requestWrite({
                method: 'POST',
                path: `${API_PREFIX}/chat/send`,
                body: { channel, text }
            });
        }
    });

    const RewardApi = Object.freeze({
        getPending() {
            return request({ method: 'GET', path: `${API_PREFIX}/rewards/pending` });
        },
        claim(rewardId) {
            return requestWrite({
                method: 'POST',
                path: `${API_PREFIX}/rewards/claim`,
                body: { rewardId }
            });
        }
    });

    const MergeApi = Object.freeze({
        getState() {
            return request({ method: 'GET', path: `${API_PREFIX}/merge/state` });
        },
        executeAction(payload) {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/merge/action`, body: payload || {} });
        },
        produce(payload) {
            return this.executeAction({ type: 'produce', payload });
        }
    });

    const ProgressionApi = Object.freeze({
        getState() {
            return request({ method: 'GET', path: `${API_PREFIX}/progression/state` });
        }
    });

    const EconomyApi = Object.freeze({
        buyShopItem(payload) {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/economy/buy`, body: payload || {} });
        },
        refillResource(payload) {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/economy/refill`, body: payload || {} });
        }
    });

    const GachaApi = Object.freeze({
        pull(payload) {
            return requestWrite({ method: 'POST', path: `${API_PREFIX}/gacha/pull`, body: payload || {} });
        }
    });

    global.KOVServerApiModule = {
        SystemApi,
        AuthApi,
        LobbyApi,
        WorldApi,
        BattleApi,
        SocialApi,
        RewardApi,
        MergeApi,
        ProgressionApi,
        EconomyApi,
        GachaApi
    };
})(window);
