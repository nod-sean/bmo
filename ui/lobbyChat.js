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

    function getLobbyCongestionProfile(game, ratio) {
        if (ratio >= 0.85) return { label: game.tr('ui.lobby.congestion.high', {}, 'High'), cls: 'text-red-300' };
        if (ratio >= 0.55) return { label: game.tr('ui.lobby.congestion.medium', {}, 'Medium'), cls: 'text-yellow-300' };
        return { label: game.tr('ui.lobby.congestion.low', {}, 'Low'), cls: 'text-emerald-300' };
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

    function normalizeSocialStatePayload(payload) {
        if (!payload || typeof payload !== 'object') return null;
        const src = (payload.social && typeof payload.social === 'object') ? payload.social : payload;
        const toUidList = (value) => {
            if (!Array.isArray(value)) return [];
            return value
                .map((item) => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') return String(item.uid || item.id || '').trim();
                    return '';
                })
                .filter(Boolean);
        };
        const playersRaw = Array.isArray(src.players) ? src.players : [];
        const players = playersRaw
            .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const uid = String(item.uid || item.id || '').trim();
                if (!uid) return null;
                return {
                    uid,
                    name: String(item.name || uid),
                    power: Math.max(0, Number(item.power || 0))
                };
            })
            .filter(Boolean);
        return {
            players,
            friends: toUidList(src.friends),
            friendRequestsIn: toUidList(src.friendRequestsIn || src.friend_requests_in),
            friendRequestsOut: toUidList(src.friendRequestsOut || src.friend_requests_out),
            allianceRequestsIn: toUidList(src.allianceRequestsIn || src.alliance_requests_in),
            allianceRequestsOut: toUidList(src.allianceRequestsOut || src.alliance_requests_out)
        };
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
        fetchChatMessagesFromApi(game, next, false).then((updated) => {
            if (updated) window.KOVSocialProfileModule.refreshChatUI(game);
        }).catch(() => { });
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

    function normalizeChatMessagesPayload(payload, fallbackChannel) {
        const channel = VALID_CHAT_CHANNELS.includes(String(fallbackChannel || '').toLowerCase())
            ? String(fallbackChannel).toLowerCase()
            : 'world';
        if (!payload) return [];
        const list = Array.isArray(payload)
            ? payload
            : (Array.isArray(payload.messages) ? payload.messages : (Array.isArray(payload.logs) ? payload.logs : []));
        return list
            .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const rowChannel = String(item.channel || item.channelId || channel).trim().toLowerCase();
                const sender = String(item.sender || item.user || item.uid || '');
                const text = String(item.text || item.message || '');
                if (!text.trim()) return null;
                const at = Number(item.at || item.timestamp || Date.now());
                const typeRaw = String(item.type || '').toLowerCase();
                const type = typeRaw === 'me' ? 'me' : 'other';
                return {
                    channel: VALID_CHAT_CHANNELS.includes(rowChannel) ? rowChannel : channel,
                    sender: sender || 'System',
                    text,
                    type,
                    at: Number.isFinite(at) ? at : Date.now()
                };
            })
            .filter(Boolean);
    }

    function renderLobbyChannelStatus(game) {
        const select = document.getElementById('lobby-channel-select');
        const panel = document.getElementById('lobby-channel-status');
        if (!select || !panel) return;
        const selected = String(select.value || 'alpha').trim().toLowerCase();
        const table = game.lobbyChannelStatusTable || buildLobbyChannelStatusTable();
        const row = table[selected] || table.alpha;
        if (!row) return;
        const profile = getLobbyCongestionProfile(game, row.ratio);
        const pct = Math.round(row.ratio * 100);
        const sourceText = game.lobbyChannelStatusSource === 'server'
            ? game.tr('ui.lobby.sync.server', {}, 'Server')
            : game.tr('ui.lobby.sync.local', {}, 'Local estimate (skeleton)');
        const fetchedAt = Number(game.lobbyChannelStatusFetchedAt || 0);
        const syncText = fetchedAt > 0
            ? `${sourceText} · ${formatSyncAge(game, fetchedAt)}`
            : sourceText;

        panel.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <span class="text-gray-300">${game.tr('ui.lobby.population', {}, 'Population')}</span>
                <span class="font-bold text-gray-100">${row.occupied}/${row.cap}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
                <span class="text-gray-300">${game.tr('ui.lobby.congestion', {}, 'Congestion')}</span>
                <span class="font-bold ${profile.cls}">${profile.label} (${pct}%)</span>
            </div>
            <div class="w-full h-2 rounded bg-gray-700 overflow-hidden">
                <div class="h-full ${row.ratio >= 0.85 ? 'bg-red-500' : (row.ratio >= 0.55 ? 'bg-yellow-500' : 'bg-emerald-500')}" style="width:${pct}%;"></div>
            </div>
            <div class="text-[10px] text-gray-400 mt-2">${syncText}</div>
        `;
        if (game.lobbyChannelStatusSource !== 'server') fetchLobbyChannelStatusFromApi(game, false);
    }

    function formatSyncAge(game, timestamp) {
        const ts = Number(timestamp || 0);
        if (!Number.isFinite(ts) || ts <= 0) return game.tr('ui.sync.not_synced', {}, 'not synced');
        const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
        if (diffSec < 5) return game.tr('ui.sync.just_now', {}, 'just now');
        if (diffSec < 60) return game.tr('ui.sync.seconds_ago', { value: diffSec }, '{value}s ago');
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return game.tr('ui.sync.minutes_ago', { value: diffMin }, '{value}m ago');
        const diffHour = Math.floor(diffMin / 60);
        return game.tr('ui.sync.hours_ago', { value: diffHour }, '{value}h ago');
    }

    function getSocialSyncStatus(game) {
        return {
            source: String(game.socialStateSource || 'local'),
            fetchedAt: Number(game.socialStateFetchedAt || 0)
        };
    }

    function getChatSyncStatus(game, channel) {
        const state = ensureChatState(game);
        const target = VALID_CHAT_CHANNELS.includes(String(channel || '').toLowerCase())
            ? String(channel).toLowerCase()
            : state.activeChannel;
        const fetchedAt = Number(game?.chatStateMeta?.lastFetchedAt?.[target] || 0);
        const source = fetchedAt > 0 ? 'server' : String(game.chatStateSource || 'local');
        return { source, fetchedAt, channel: target };
    }

    function getApiBaseUrl() {
        const raw = String(window.KOV_API_BASE_URL || '').trim();
        return raw.replace(/\/+$/, '');
    }

    function getChatWsUrl() {
        const raw = String(window.KOV_CHAT_WS_URL || '').trim();
        if (!raw) return '';
        return raw.replace(/\/+$/, '');
    }

    function normalizeChatSocketEvent(payload) {
        if (!payload || typeof payload !== 'object') return null;
        const channelRaw = String(payload.channel || payload.channelId || '').trim().toLowerCase();
        const channel = VALID_CHAT_CHANNELS.includes(channelRaw) ? channelRaw : 'world';
        const sender = String(payload.sender || payload.user || payload.uid || '').trim();
        const text = String(payload.text || payload.message || '').trim();
        if (!text) return null;
        const at = Number(payload.at || payload.timestamp || Date.now());
        return {
            channel,
            sender: sender || 'System',
            text,
            type: payload.type === 'me' ? 'me' : 'other',
            at: Number.isFinite(at) ? at : Date.now()
        };
    }

    function applySocketChatEvent(game, payload) {
        const row = normalizeChatSocketEvent(payload);
        if (!row) return false;
        const state = ensureChatState(game);
        const list = state.logsByChannel[row.channel];
        list.push(row);
        if (list.length > state.maxLogs) list.splice(0, list.length - state.maxLogs);
        if (!game.chatStateMeta || typeof game.chatStateMeta !== 'object') game.chatStateMeta = {};
        if (!game.chatStateMeta.lastFetchedAt || typeof game.chatStateMeta.lastFetchedAt !== 'object') {
            game.chatStateMeta.lastFetchedAt = {};
        }
        game.chatStateMeta.lastFetchedAt[row.channel] = Date.now();
        game.chatStateSource = 'socket';
        return true;
    }

    function ensureChatSocket(game) {
        if (game.chatSocket && game.chatSocket.readyState === WebSocket.OPEN) return game.chatSocket;
        if (game.chatSocket && game.chatSocket.readyState === WebSocket.CONNECTING) return game.chatSocket;
        const wsUrl = getChatWsUrl();
        if (!wsUrl || typeof WebSocket === 'undefined') return null;
        let socket = null;
        try {
            socket = new WebSocket(wsUrl);
        } catch (e) {
            return null;
        }
        game.chatSocket = socket;
        socket.onopen = () => {
            try {
                const state = ensureChatState(game);
                socket.send(JSON.stringify({
                    type: 'subscribe',
                    channels: VALID_CHAT_CHANNELS.filter((ch) => ch !== 'system'),
                    active: state.activeChannel
                }));
            } catch (e) { }
        };
        socket.onmessage = (event) => {
            let payload = null;
            try {
                payload = JSON.parse(String(event?.data || '{}'));
            } catch (e) {
                return;
            }
            const data = payload && payload.type === 'chat_message'
                ? payload.message
                : payload;
            if (!applySocketChatEvent(game, data)) return;
            if (game.isChatOpen && window.KOVSocialProfileModule && typeof window.KOVSocialProfileModule.refreshChatUI === 'function') {
                window.KOVSocialProfileModule.refreshChatUI(game);
            }
        };
        socket.onclose = () => {
            if (game.chatSocket === socket) game.chatSocket = null;
        };
        socket.onerror = () => { };
        return socket;
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

    async function enterLobbyChannelViaApi(game, channel) {
        const requested = String(channel || 'alpha').trim().toLowerCase();
        const fallbackChannel = VALID_LOBBY_CHANNELS.includes(requested) ? requested : 'alpha';
        const payload = await fetchApiJson('/v1/lobby/enter', {
            method: 'POST',
            body: JSON.stringify({ channel: fallbackChannel })
        });
        if (!payload || typeof payload !== 'object') {
            return { ok: false, channel: fallbackChannel };
        }
        const acceptedRaw = String(payload.channelId || payload.channel || fallbackChannel).trim().toLowerCase();
        const accepted = VALID_LOBBY_CHANNELS.includes(acceptedRaw) ? acceptedRaw : fallbackChannel;
        game.lobbyChannelStatusSource = 'server';
        game.lobbyChannelStatusFetchedAt = Date.now();
        fetchLobbyChannelStatusFromApi(game, true).catch(() => { });
        return { ok: true, channel: accepted };
    }

    async function fetchSocialStateFromApi(game, force = false) {
        const now = Date.now();
        if (!force && Number(game.socialStateFetchedAt || 0) > 0 && now - Number(game.socialStateFetchedAt) < 15000) {
            return false;
        }
        if (game.socialStateFetchPending) return false;
        game.socialStateFetchPending = true;
        let updated = false;
        try {
            const payload = await fetchApiJson('/v1/social/state');
            const normalized = normalizeSocialStatePayload(payload);
            if (!normalized) return false;
            game.socialState = normalized;
            game.socialStateSource = 'server';
            game.socialStateFetchedAt = now;
            updated = true;
            return true;
        } finally {
            game.socialStateFetchPending = false;
            if (!updated && !game.socialStateSource) game.socialStateSource = 'local';
        }
    }

    async function fetchChatMessagesFromApi(game, channel, force = false) {
        const state = ensureChatState(game);
        const target = VALID_CHAT_CHANNELS.includes(String(channel || '').toLowerCase())
            ? String(channel).toLowerCase()
            : state.activeChannel;
        if (target === 'system') return false;
        if (!game.chatStateMeta || typeof game.chatStateMeta !== 'object') game.chatStateMeta = {};
        if (!game.chatStateMeta.lastFetchedAt || typeof game.chatStateMeta.lastFetchedAt !== 'object') {
            game.chatStateMeta.lastFetchedAt = {};
        }
        if (!game.chatStateMeta.fetchPending || typeof game.chatStateMeta.fetchPending !== 'object') {
            game.chatStateMeta.fetchPending = {};
        }
        const now = Date.now();
        const lastFetched = Number(game.chatStateMeta.lastFetchedAt[target] || 0);
        if (!force && lastFetched > 0 && now - lastFetched < 5000) return false;
        if (game.chatStateMeta.fetchPending[target]) return false;
        game.chatStateMeta.fetchPending[target] = true;
        try {
            const payload = await fetchApiJson(`/v1/chat/messages?channel=${encodeURIComponent(target)}`);
            const rows = normalizeChatMessagesPayload(payload, target);
            if (!rows.length) return false;
            state.logsByChannel[target] = rows.slice(-state.maxLogs);
            game.chatStateMeta.lastFetchedAt[target] = now;
            game.chatStateSource = 'server';
            return true;
        } finally {
            game.chatStateMeta.fetchPending[target] = false;
        }
    }

    async function sendChatMessageToApi(game, channel, text) {
        const target = VALID_CHAT_CHANNELS.includes(String(channel || '').toLowerCase())
            ? String(channel).toLowerCase()
            : 'world';
        if (target === 'system') return false;
        const socket = ensureChatSocket(game);
        if (socket && socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(JSON.stringify({
                    type: 'chat_send',
                    channel: target,
                    text: String(text || '')
                }));
                return true;
            } catch (e) { }
        }
        const body = {
            channel: target,
            text: String(text || '')
        };
        const payload = await fetchApiJson('/v1/chat/send', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        return !!payload;
    }

    global.KOVLobbyChatModule = {
        VALID_LOBBY_CHANNELS,
        VALID_CHAT_CHANNELS,
        ensureWorldLobbyState,
        buildLobbyChannelStatusTable,
        getLobbyCongestionProfile,
        ensureChatState,
        ensureSocialState,
        normalizeSocialStatePayload,
        getChatChannelLabel,
        getChatTitleForChannel,
        updateChatTabUI,
        setChatChannel,
        pushChatMessage,
        normalizeChatMessagesPayload,
        renderLobbyChannelStatus,
        getApiBaseUrl,
        getChatWsUrl,
        ensureChatSocket,
        fetchApiJson,
        fetchLobbyChannelStatusFromApi,
        enterLobbyChannelViaApi,
        fetchSocialStateFromApi,
        fetchChatMessagesFromApi,
        sendChatMessageToApi,
        formatSyncAge,
        getSocialSyncStatus,
        getChatSyncStatus
    };
})(window);
