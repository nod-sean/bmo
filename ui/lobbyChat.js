(function (global) {
    'use strict';

    const VALID_LOBBY_CHANNELS = ['alpha', 'beta', 'gamma'];
    const VALID_CHAT_CHANNELS = ['world', 'guild', 'system'];

    function ensureWorldLobbyState(game) {
        if (!game.worldLobbyState || typeof game.worldLobbyState !== 'object') {
            game.worldLobbyState = { entered: false, channel: 'alpha', enteredAt: 0 };
        }
        if (!Object.prototype.hasOwnProperty.call(game.worldLobbyState, 'entered')) game.worldLobbyState.entered = false;
        const rawChannel = String(game.worldLobbyState.channel || 'alpha').trim().toLowerCase();
        game.worldLobbyState.channel = VALID_LOBBY_CHANNELS.includes(rawChannel) ? rawChannel : 'alpha';
        if (!Object.prototype.hasOwnProperty.call(game.worldLobbyState, 'enteredAt')) game.worldLobbyState.enteredAt = 0;
        return game.worldLobbyState;
    }

    function buildLobbyChannelStatusTable() {
        const now = new Date();
        const minuteBucket = Math.floor((now.getHours() * 60 + now.getMinutes()) / 5);
        const make = (channel, basePop, cap) => {
            let hash = 0;
            for (let i = 0; i < channel.length; i++) hash += channel.charCodeAt(i) * (i + 3);
            const wave = (minuteBucket * 17 + hash * 13) % 37;
            const occupied = Math.max(1, Math.min(cap, basePop + wave));
            const ratio = occupied / cap;
            return { channel, occupied, cap, ratio };
        };
        return {
            alpha: make('alpha', 58, 120),
            beta: make('beta', 34, 100),
            gamma: make('gamma', 22, 80)
        };
    }

    function getLobbyCongestionProfile(ratio) {
        if (ratio >= 0.85) return { label: 'High', cls: 'text-red-300' };
        if (ratio >= 0.55) return { label: 'Medium', cls: 'text-yellow-300' };
        return { label: 'Low', cls: 'text-emerald-300' };
    }

    function ensureChatState(game) {
        if (!game.chatState || typeof game.chatState !== 'object') {
            game.chatState = { activeChannel: 'world', logsByChannel: { world: [], guild: [], system: [] }, maxLogs: 80 };
        }
        const current = String(game.chatState.activeChannel || 'world').toLowerCase();
        game.chatState.activeChannel = VALID_CHAT_CHANNELS.includes(current) ? current : 'world';
        if (!game.chatState.logsByChannel || typeof game.chatState.logsByChannel !== 'object') {
            game.chatState.logsByChannel = { world: [], guild: [], system: [] };
        }
        VALID_CHAT_CHANNELS.forEach((channel) => {
            if (!Array.isArray(game.chatState.logsByChannel[channel])) game.chatState.logsByChannel[channel] = [];
        });
        game.chatState.maxLogs = Math.max(20, Math.min(200, Number(game.chatState.maxLogs || 80)));
        return game.chatState;
    }

    function ensureSocialState(game) {
        if (!game.socialState || typeof game.socialState !== 'object') {
            game.socialState = {};
        }
        const keys = ['players', 'friends', 'friendRequestsIn', 'friendRequestsOut', 'allianceRequestsIn', 'allianceRequestsOut'];
        keys.forEach((k) => {
            if (!Array.isArray(game.socialState[k])) game.socialState[k] = [];
        });
        if (!game.socialState.players.length) {
            game.socialState.players = [
                { uid: 'P1001', name: 'IronWolf', power: 1800 },
                { uid: 'P1002', name: 'SkyRider', power: 2200 },
                { uid: 'P1003', name: 'StoneGate', power: 1600 },
                { uid: 'P1004', name: 'NightLance', power: 2450 }
            ];
        }
        if (!game.socialState.friendRequestsIn.length) game.socialState.friendRequestsIn = ['P1003'];
        if (!game.socialState.allianceRequestsIn.length) game.socialState.allianceRequestsIn = ['P1002'];
        return game.socialState;
    }

    function getChatChannelLabel(game, channel) {
        if (channel === 'guild') return game.tr('ui.chat.tab.guild', {}, 'Guild');
        if (channel === 'system') return game.tr('ui.chat.tab.system', {}, 'System');
        return game.tr('ui.chat.tab.world', {}, 'World');
    }

    function getChatTitleForChannel(game, channel) {
        if (channel === 'guild') return game.tr('ui.chat.title.guild', {}, 'Guild Chat');
        if (channel === 'system') return game.tr('ui.chat.title.system', {}, 'System Chat');
        return game.tr('ui.chat.title.world', {}, 'World Chat');
    }

    function updateChatTabUI(game) {
        const state = ensureChatState(game);
        ['world', 'guild', 'system'].forEach((channel) => {
            const tab = document.getElementById(`chat-tab-${channel}`);
            if (!tab) return;
            tab.classList.toggle('active', state.activeChannel === channel);
            tab.innerText = getChatChannelLabel(game, channel);
        });
        const title = document.getElementById('chat-title');
        if (title) title.innerText = getChatTitleForChannel(game, state.activeChannel);
        const input = document.getElementById('chat-input');
        if (input) {
            input.placeholder = game.tr('ui.chat.placeholder', {}, 'Type message...');
            input.disabled = state.activeChannel === 'system';
        }
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            sendBtn.innerText = game.tr('ui.chat.send', {}, 'Send');
            sendBtn.disabled = state.activeChannel === 'system';
        }
    }

    function setChatChannel(game, channel) {
        const state = ensureChatState(game);
        const next = String(channel || '').toLowerCase();
        if (!VALID_CHAT_CHANNELS.includes(next)) return;
        if (state.activeChannel === next) return;
        state.activeChannel = next;
        updateChatTabUI(game);
        window.KOVSocialProfileModule.refreshChatUI(game);
    }

    function pushChatMessage(game, channel, sender, text, type = 'other') {
        const state = ensureChatState(game);
        const target = VALID_CHAT_CHANNELS.includes(channel) ? channel : 'world';
        const row = {
            channel: target,
            sender: String(sender || ''),
            text: String(text || ''),
            type: type === 'me' ? 'me' : 'other',
            at: Date.now()
        };
        const list = state.logsByChannel[target];
        list.push(row);
        if (list.length > state.maxLogs) list.splice(0, list.length - state.maxLogs);
        return row;
    }

    function renderLobbyChannelStatus(game) {
        const select = document.getElementById('lobby-channel-select');
        const panel = document.getElementById('lobby-channel-status');
        if (!select || !panel) return;
        const selected = String(select.value || 'alpha').trim().toLowerCase();
        const table = game.lobbyChannelStatusTable || buildLobbyChannelStatusTable();
        const row = table[selected] || table.alpha;
        if (!row) return;
        const profile = getLobbyCongestionProfile(row.ratio);
        const pct = Math.round(row.ratio * 100);
        const sourceText = game.lobbyChannelStatusSource === 'server' ? 'Server' : 'Local estimate (skeleton)';

        panel.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <span class="text-gray-300">Population</span>
                <span class="font-bold text-gray-100">${row.occupied}/${row.cap}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
                <span class="text-gray-300">Congestion</span>
                <span class="font-bold ${profile.cls}">${profile.label} (${pct}%)</span>
            </div>
            <div class="w-full h-2 rounded bg-gray-700 overflow-hidden">
                <div class="h-full ${row.ratio >= 0.85 ? 'bg-red-500' : (row.ratio >= 0.55 ? 'bg-yellow-500' : 'bg-emerald-500')}" style="width:${pct}%;"></div>
            </div>
            <div class="text-[10px] text-gray-400 mt-2">${sourceText}</div>
        `;
        if (game.lobbyChannelStatusSource !== 'server') fetchLobbyChannelStatusFromApi(game, false);
    }

    function getApiBaseUrl() {
        const raw = String(window.KOV_API_BASE_URL || '').trim();
        return raw.replace(/\/+$/, '');
    }

    async function fetchApiJson(path, options = {}) {
        const base = getApiBaseUrl();
        if (!base) return null;
        const method = options.method || 'GET';
        const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
        try {
            const response = await fetch(`${base}${path}`, Object.assign({}, options, { method, headers, cache: 'no-store' }));
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    async function fetchLobbyChannelStatusFromApi(game, force = false) {
        if (game.lobbyChannelFetchPending) return;
        const now = Date.now();
        if (!force && now - game.lobbyChannelStatusLastAttemptAt < 15000) return;
        game.lobbyChannelFetchPending = true;
        game.lobbyChannelStatusLastAttemptAt = now;
        let didUpdateFromServer = false;
        try {
            const payload = await fetchApiJson('/v1/lobby/channels');
            if (!payload || !Array.isArray(payload.channels)) return;
            const table = {};
            payload.channels.forEach((row) => {
                const channel = String(row?.channelId || '').trim().toLowerCase();
                const cap = Math.max(1, Number(row?.capacity || 0));
                const occupied = Math.max(0, Math.min(cap, Number(row?.population || 0)));
                if (!channel) return;
                table[channel] = { channel, occupied, cap, ratio: occupied / cap };
            });
            if (!Object.keys(table).length) return;
            game.lobbyChannelStatusTable = table;
            game.lobbyChannelStatusSource = 'server';
            game.lobbyChannelStatusFetchedAt = now;
            didUpdateFromServer = true;
        } finally {
            game.lobbyChannelFetchPending = false;
            if (didUpdateFromServer) {
                const modal = document.getElementById('modal-lobby');
                if (modal?.classList?.contains('open')) renderLobbyChannelStatus(game);
            }
        }
    }

    global.KOVLobbyChatModule = {
        VALID_LOBBY_CHANNELS,
        VALID_CHAT_CHANNELS,
        ensureWorldLobbyState,
        buildLobbyChannelStatusTable,
        getLobbyCongestionProfile,
        ensureChatState,
        ensureSocialState,
        getChatChannelLabel,
        getChatTitleForChannel,
        updateChatTabUI,
        setChatChannel,
        pushChatMessage,
        renderLobbyChannelStatus,
        getApiBaseUrl,
        fetchApiJson,
        fetchLobbyChannelStatusFromApi
    };
})(window);
