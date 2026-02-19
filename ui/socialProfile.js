(function (global) {
    'use strict';

    function sanitizeProfileText(game, value, fallback, maxLen = 20) {
        let text = String(value ?? '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/[\u0000-\u001f\u007f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text) return fallback;

        // Keep profile text ASCII-only to avoid mojibake after mixed encodings.
        try { text = text.normalize('NFKD'); } catch (e) { }
        text = text
            .replace(/[^\x20-\x7E]/g, '')
            .replace(/[^A-Za-z0-9 _.'-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (text.length < 2) return fallback;
        return text.slice(0, maxLen);
    }

    function getDefaultProfileName(game) {
        return game.tr('ui.profile.unknown_user', {}, 'Unknown User');
    }

    function getDefaultProfileTitle(game) {
        return game.tr('ui.profile.commander', {}, 'Commander');
    }

    function getDefaultSquadName(game, index) {
        return game.tr('ui.squad.name', { index }, `Squad ${index}`);
    }

    function sanitizeArmyName(game, value, index) {
        return sanitizeProfileText(game, value, getDefaultSquadName(game, index + 1), 24);
    }

    function sanitizeArmies(game, deps) {
        const base = [
            { id: 0, name: getDefaultSquadName(game, 1), color: '#4caf50', state: 'IDLE', r: deps.PLAYER_START.r, c: deps.PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 },
            { id: 1, name: getDefaultSquadName(game, 2), color: '#2196f3', state: 'IDLE', r: deps.PLAYER_START.r, c: deps.PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 },
            { id: 2, name: getDefaultSquadName(game, 3), color: '#f59e0b', state: 'IDLE', r: deps.PLAYER_START.r, c: deps.PLAYER_START.c, path: [], nextStepIndex: 0, target: null, lastMoveTime: 0, moveInterval: 0 }
        ];

        const source = Array.isArray(game.armies) ? game.armies : [];
        game.armies = base.map((def, idx) => {
            const raw = source[idx] && typeof source[idx] === 'object' ? source[idx] : {};
            const army = Object.assign({}, def, raw);
            army.id = idx;
            army.name = sanitizeArmyName(game, army.name, idx);
            if (!Array.isArray(army.path)) army.path = [];
            army.nextStepIndex = Number.isFinite(Number(army.nextStepIndex)) ? Number(army.nextStepIndex) : 0;
            army.lastMoveTime = Number.isFinite(Number(army.lastMoveTime)) ? Number(army.lastMoveTime) : 0;
            army.moveInterval = Number.isFinite(Number(army.moveInterval)) ? Number(army.moveInterval) : 0;
            return army;
        });
    }

    function sanitizeUserProfile(game) {
        if (!game.userProfile || typeof game.userProfile !== 'object') game.userProfile = {};
        game.userProfile.name = sanitizeProfileText(game, game.userProfile.name, getDefaultProfileName(game), 20);
        game.userProfile.title = sanitizeProfileText(game, game.userProfile.title, getDefaultProfileTitle(game), 24);
        const avatar = Number(game.userProfile.avatar);
        game.userProfile.avatar = Number.isFinite(avatar) ? Math.max(1, Math.min(5, Math.floor(avatar))) : 1;
        game.userProfile.vip = Math.max(0, Number(game.userProfile.vip) || 0);
        const winRate = Number(game.userProfile.winRate);
        game.userProfile.winRate = Number.isFinite(winRate) ? Math.max(0, Math.min(100, winRate)) : 0;
    }

    function updateHeaderForSocial(game) {
        const headerPanel = document.querySelector('.header-panel');
        if (!headerPanel) return;
        if (document.getElementById('header-profile')) return;

        const profileIcon = document.createElement('div');
        profileIcon.id = 'header-profile';
        profileIcon.className = 'header-profile';
        profileIcon.innerHTML = `<div class="avatar">${game.tr('ui.profile.avatar_default', {}, 'Hero')}</div><div class="level-badge">${game.lordLevel}</div>`;
        profileIcon.onclick = () => openProfile(game);
        headerPanel.insertBefore(profileIcon, headerPanel.firstChild);

        const resContainer = headerPanel.querySelector('.flex.justify-between.mb-1');
        if (!resContainer) return;

        const pointShort = game.tr('ui.header.points_short', {}, 'PT');
        const settingsShort = game.tr('ui.header.settings_short', {}, 'SET');

        const pointDiv = document.createElement('div');
        pointDiv.className = 'res-pill';
        pointDiv.onclick = () => window.KOVUiShellModule.showToast(game, game.tr('toast.point_shop_soon', {}, 'Point shop coming soon'));
        pointDiv.innerHTML = `
            <span class="res-icon">${pointShort}</span>
            <span id="res-point">${game.points}</span>
            <span class="text-gray-400 text-[10px] ml-1">+</span>
        `;
        resContainer.appendChild(pointDiv);

        const settingsDiv = document.createElement('div');
        settingsDiv.className = 'res-pill settings-icon';
        settingsDiv.onclick = () => document.getElementById('modal-settings')?.classList.add('open');
        settingsDiv.innerHTML = `<span class="res-icon">${settingsShort}</span>`;
        resContainer.appendChild(settingsDiv);
    }

    function toggleChat(game) {
        game.isChatOpen = !game.isChatOpen;
        const drawer = document.getElementById('chat-drawer');
        if (!drawer) return;
        if (game.isChatOpen) {
            drawer.classList.add('open');
            window.KOVLobbyChatModule.updateChatTabUI(game);
            refreshChatUI(game);
            return;
        }
        drawer.classList.remove('open');
    }

    function sendChatMessage(game) {
        sanitizeUserProfile(game);
        const state = window.KOVLobbyChatModule.ensureChatState(game);
        const input = document.getElementById('chat-input');
        if (!input || state.activeChannel === 'system') return;
        const text = input.value.trim();
        if (!text) return;

        window.KOVLobbyChatModule.pushChatMessage(game, state.activeChannel, game.userProfile.name, text, 'me');
        input.value = '';
        refreshChatUI(game);
        window.KOVUiShellModule.showToast(game, game.tr('toast.message_sent', {}, 'Message sent'));
        window.KOVPersistenceModule.saveGame(game);
    }

    function simulateChat(game, deps) {
        const state = window.KOVLobbyChatModule.ensureChatState(game);
        const dummy = Array.isArray(deps?.DUMMY_CHAT_MESSAGES) ? deps.DUMMY_CHAT_MESSAGES : [];
        if (!dummy.length) return;
        const msg = dummy[Math.floor(Math.random() * dummy.length)];
        const sender = game.tr(msg.senderKey, {}, msg.senderFallback);
        const text = game.tr(msg.textKey, {}, msg.textFallback);
        let channel = 'world';
        if (msg.senderKey === 'ui.chat.sender.guild') channel = 'guild';
        if (msg.senderKey === 'ui.chat.sender.system') channel = 'system';
        window.KOVLobbyChatModule.pushChatMessage(game, channel, sender, text, 'other');
        game.chatLog = (state.logsByChannel.world || []).slice(-50);
        if (game.isChatOpen) refreshChatUI(game);
    }

    function refreshChatUI(game) {
        const state = window.KOVLobbyChatModule.ensureChatState(game);
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const list = Array.isArray(state.logsByChannel[state.activeChannel]) ? state.logsByChannel[state.activeChannel] : [];
        if (!list.length) {
            container.innerHTML = `<div class="chat-line other"><span class="sender">[${game.tr('ui.chat.tab.system', {}, 'System')}]</span><span class="text">${game.tr('ui.chat.empty', {}, 'No messages yet.')}</span></div>`;
            return;
        }
        container.innerHTML = list.map((log) => `
            <div class="chat-line ${log.type}">
                <span class="sender">${log.type === 'me' ? '' : `[${log.sender}]`}</span>
                <span class="text" style="color:white !important;">${log.text}</span>
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    }

    function openProfile(game) {
        sanitizeUserProfile(game);
        const modal = document.getElementById('modal-profile');
        const body = document.getElementById('profile-body');
        if (!modal || !body) return;
        modal.classList.add('open');

        const escapeHtml = (value) => String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
        const safeName = escapeHtml(game.userProfile?.name || game.tr('ui.profile.unknown_user', {}, 'Unknown User'));
        const safeTitle = escapeHtml(game.userProfile?.title || game.tr('ui.profile.commander', {}, 'Commander'));
        const winRate = Number(game.userProfile?.winRate || 0);
        const power = Number(game.cp || 0) * 100;
        const vip = Number(game.userProfile?.vip || 0);

        body.innerHTML = `
            <div class="profile-view">
                <div class="profile-header">
                    <div class="profile-avatar-lg">H</div>
                    <div class="profile-info">
                        <h3>${safeName} <button class="edit-btn" onclick="window.KOVSocialProfileModule.editName(window.game)">${game.tr('ui.profile.edit', {}, 'Edit')}</button></h3>
                        <p>${safeTitle}</p>
                    </div>
                </div>
                <div class="profile-stats">
                    <div class="stat-box"><div>${game.tr('ui.profile.win_rate', {}, 'Win Rate')}</div><span>${winRate}%</span></div>
                    <div class="stat-box"><div>${game.tr('ui.profile.power', {}, 'Power')}</div><span>${power}</span></div>
                    <div class="stat-box"><div>${game.tr('ui.profile.vip', {}, 'VIP')}</div><span>${vip}</span></div>
                </div>
                <div class="profile-actions">
                    <button class="btn-action" onclick="window.KOVSocialProfileModule.openSocialHub(window.game, 'friends')">${game.tr('ui.profile.friends', {}, 'Friends')}</button>
                    <button class="btn-action" onclick="window.KOVSocialProfileModule.openSocialHub(window.game, 'alliance')">${game.tr('ui.profile.account', {}, 'Account')}</button>
                </div>
            </div>
        `;
    }

    function isSocialFriend(game, uid) {
        const social = window.KOVLobbyChatModule.ensureSocialState(game);
        return social.friends.includes(uid);
    }

    function openSocialHub(game, tab) {
        window.KOVLobbyChatModule.ensureSocialState(game);
        renderSocialHub(game, tab || 'players');
    }

    function renderSocialHub(game, tab) {
        const social = window.KOVLobbyChatModule.ensureSocialState(game);
        const active = ['players', 'friends', 'alliance'].includes(tab) ? tab : 'players';
        const modal = document.getElementById('modal-object');
        const title = document.getElementById('object-modal-title');
        const body = document.getElementById('object-modal-body');
        if (!modal || !title || !body) return;

        modal.style.display = '';
        modal.classList.add('open');
        modal.querySelector('.modal-content')?.classList.add('wide');
        title.innerText = game.tr('ui.social.title', {}, 'Social');

        const tabBtn = (key, fallback) => {
            const label = game.tr(`ui.social.tab.${key}`, {}, fallback);
            const cls = active === key ? 'bg-blue-700 border-blue-400' : 'bg-gray-700 border-gray-500';
            return `<button class="px-2 py-1 text-xs rounded border ${cls}" onclick="window.KOVSocialProfileModule.renderSocialHub(window.game, '${key}')">${label}</button>`;
        };

        const players = social.players
            .filter((p) => p && p.uid !== window.KOVWorldSeasonModule.getLocalUid())
            .map((p) => {
                const uid = String(p.uid || '');
                const isFriend = isSocialFriend(game, uid);
                const outFriend = social.friendRequestsOut.includes(uid);
                const outAlliance = social.allianceRequestsOut.includes(uid);
                const friendAction = isFriend
                    ? game.tr('ui.social.friend.added', {}, 'Friend')
                    : (outFriend ? game.tr('ui.social.friend.pending', {}, 'Pending') : game.tr('ui.social.friend.add', {}, 'Add Friend'));
                const allianceAction = outAlliance
                    ? game.tr('ui.social.alliance.pending', {}, 'Pending')
                    : game.tr('ui.social.alliance.request', {}, 'Alliance');
                return `
                    <div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs flex items-center justify-between gap-2">
                        <div>
                            <div class="text-gray-100 font-bold">${p.name}</div>
                            <div class="text-gray-400">${uid} | ${game.tr('ui.profile.power', {}, 'Power')}: ${Number(p.power || 0)}</div>
                        </div>
                        <div class="flex gap-1">
                            <button class="px-2 py-1 rounded bg-emerald-700 border border-emerald-500 text-[11px]" ${isFriend || outFriend ? 'disabled style="opacity:.6"' : ''} onclick="window.KOVSocialProfileModule.requestFriend(window.game, '${uid}')">${friendAction}</button>
                            <button class="px-2 py-1 rounded bg-indigo-700 border border-indigo-500 text-[11px]" ${outAlliance ? 'disabled style="opacity:.6"' : ''} onclick="window.KOVSocialProfileModule.requestAlliance(window.game, '${uid}')">${allianceAction}</button>
                        </div>
                    </div>
                `;
            }).join('');

        const friendRequests = social.friendRequestsIn.map((uid) => {
            const player = social.players.find((p) => p.uid === uid);
            const name = player?.name || uid;
            return `
                <div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs flex items-center justify-between gap-2">
                    <div class="text-gray-100">${name} (${uid})</div>
                    <div class="flex gap-1">
                        <button class="px-2 py-1 rounded bg-emerald-700 border border-emerald-500 text-[11px]" onclick="window.KOVSocialProfileModule.acceptFriendRequest(window.game, '${uid}')">${game.tr('ui.common.accept', {}, 'Accept')}</button>
                        <button class="px-2 py-1 rounded bg-gray-700 border border-gray-500 text-[11px]" onclick="window.KOVSocialProfileModule.rejectFriendRequest(window.game, '${uid}')">${game.tr('ui.common.reject', {}, 'Reject')}</button>
                    </div>
                </div>
            `;
        }).join('');

        const friends = social.friends.map((uid) => {
            const player = social.players.find((p) => p.uid === uid);
            const name = player?.name || uid;
            return `<div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs text-gray-100">${name} (${uid})</div>`;
        }).join('');

        const allianceRequests = social.allianceRequestsIn.map((uid) => {
            const player = social.players.find((p) => p.uid === uid);
            const name = player?.name || uid;
            return `
                <div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs flex items-center justify-between gap-2">
                    <div class="text-gray-100">${name} (${uid})</div>
                    <div class="flex gap-1">
                        <button class="px-2 py-1 rounded bg-indigo-700 border border-indigo-500 text-[11px]" onclick="window.KOVSocialProfileModule.acceptAllianceRequest(window.game, '${uid}')">${game.tr('ui.common.accept', {}, 'Accept')}</button>
                        <button class="px-2 py-1 rounded bg-gray-700 border border-gray-500 text-[11px]" onclick="window.KOVSocialProfileModule.rejectAllianceRequest(window.game, '${uid}')">${game.tr('ui.common.reject', {}, 'Reject')}</button>
                    </div>
                </div>
            `;
        }).join('');

        let content = '';
        if (active === 'players') {
            content = players || `<div class="text-xs text-gray-300">${game.tr('ui.social.empty.players', {}, 'No players found.')}</div>`;
        } else if (active === 'friends') {
            content = `
                <div class="text-[11px] text-gray-300 mb-2">${game.tr('ui.social.section.friend_requests', {}, 'Friend Requests')}</div>
                <div class="space-y-2 mb-3">${friendRequests || `<div class="text-xs text-gray-400">${game.tr('ui.social.empty.friend_requests', {}, 'No friend requests.')}</div>`}</div>
                <div class="text-[11px] text-gray-300 mb-2">${game.tr('ui.social.section.friends', {}, 'Friends')}</div>
                <div class="space-y-2">${friends || `<div class="text-xs text-gray-400">${game.tr('ui.social.empty.friends', {}, 'No friends yet.')}</div>`}</div>
            `;
        } else {
            content = `
                <div class="text-[11px] text-gray-300 mb-2">${game.tr('ui.social.section.alliance_requests', {}, 'Alliance Requests')}</div>
                <div class="space-y-2 mb-3">${allianceRequests || `<div class="text-xs text-gray-400">${game.tr('ui.social.empty.alliance_requests', {}, 'No alliance requests.')}</div>`}</div>
                <div class="text-[11px] text-gray-300 mb-2">${game.tr('ui.social.section.outgoing', {}, 'Outgoing')}</div>
                <div class="space-y-2">${social.allianceRequestsOut.map((uid) => `<div class="bg-gray-800 p-2 rounded border border-gray-700 text-xs text-gray-100">${uid}</div>`).join('') || `<div class="text-xs text-gray-400">${game.tr('ui.social.empty.outgoing', {}, 'No pending requests.')}</div>`}</div>
            `;
        }

        body.innerHTML = `
            <div class="space-y-2">
                <div class="flex gap-1">${tabBtn('players', 'Players')}${tabBtn('friends', 'Friends')}${tabBtn('alliance', 'Alliance')}</div>
                <div class="space-y-2">${content}</div>
            </div>
        `;
    }

    function requestFriend(game, uid) {
        const social = window.KOVLobbyChatModule.ensureSocialState(game);
        if (!uid || social.friends.includes(uid) || social.friendRequestsOut.includes(uid)) return;
        social.friendRequestsOut.push(uid);
        window.KOVUiShellModule.showToast(game, game.tr('toast.social.friend_requested', {}, 'Friend request sent'));
        window.KOVPersistenceModule.saveGame(game);
        renderSocialHub(game, 'players');
    }

    function requestAlliance(game, uid) {
        const social = window.KOVLobbyChatModule.ensureSocialState(game);
        if (!uid || social.allianceRequestsOut.includes(uid)) return;
        social.allianceRequestsOut.push(uid);
        window.KOVUiShellModule.showToast(game, game.tr('toast.social.alliance_requested', {}, 'Alliance request sent'));
        window.KOVPersistenceModule.saveGame(game);
        renderSocialHub(game, 'players');
    }

    function acceptFriendRequest(game, uid) {
        const social = window.KOVLobbyChatModule.ensureSocialState(game);
        social.friendRequestsIn = social.friendRequestsIn.filter((id) => id !== uid);
        if (!social.friends.includes(uid)) social.friends.push(uid);
        window.KOVUiShellModule.showToast(game, game.tr('toast.social.friend_added', {}, 'Friend added'));
        window.KOVPersistenceModule.saveGame(game);
        renderSocialHub(game, 'friends');
    }

    function rejectFriendRequest(game, uid) {
        const social = window.KOVLobbyChatModule.ensureSocialState(game);
        social.friendRequestsIn = social.friendRequestsIn.filter((id) => id !== uid);
        window.KOVPersistenceModule.saveGame(game);
        renderSocialHub(game, 'friends');
    }

    function acceptAllianceRequest(game, uid) {
        const social = window.KOVLobbyChatModule.ensureSocialState(game);
        social.allianceRequestsIn = social.allianceRequestsIn.filter((id) => id !== uid);
        window.KOVUiShellModule.showToast(game, game.tr('toast.social.alliance_accepted', {}, 'Alliance accepted'));
        window.KOVPersistenceModule.saveGame(game);
        renderSocialHub(game, 'alliance');
    }

    function rejectAllianceRequest(game, uid) {
        const social = window.KOVLobbyChatModule.ensureSocialState(game);
        social.allianceRequestsIn = social.allianceRequestsIn.filter((id) => id !== uid);
        window.KOVPersistenceModule.saveGame(game);
        renderSocialHub(game, 'alliance');
    }

    function editName(game) {
        sanitizeUserProfile(game);
        const current = game.userProfile?.name || '';
        const next = prompt(game.tr('ui.profile.edit_prompt', {}, 'Enter a new nickname.'), current);
        if (typeof next !== 'string') return;
        const trimmed = sanitizeProfileText(game, next, '', 20);
        if (!trimmed) return;
        game.userProfile.name = trimmed;
        openProfile(game);
        window.KOVUiShellModule.showToast(game, game.tr('toast.nickname_changed', {}, 'Nickname has been changed.'));
    }

    function initSocialUI(game, deps = {}) {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;

        if (!document.getElementById('chat-drawer')) {
            const chatTitle = game.tr('ui.chat.title.world', {}, 'World Chat');
            const chatClose = game.tr('ui.chat.close', {}, 'Close');
            const chatWorld = game.tr('ui.chat.tab.world', {}, 'World');
            const chatGuild = game.tr('ui.chat.tab.guild', {}, 'Guild');
            const chatSystem = game.tr('ui.chat.tab.system', {}, 'System');
            const chatPlaceholder = game.tr('ui.chat.placeholder', {}, 'Type message...');
            const chatSend = game.tr('ui.chat.send', {}, 'Send');
            const chatDrawer = document.createElement('div');
            chatDrawer.id = 'chat-drawer';
            chatDrawer.className = 'chat-drawer';
            chatDrawer.innerHTML = `
                <div class="chat-header">
                    <span id="chat-title">${chatTitle}</span>
                    <button id="chat-close-btn" onclick="window.KOVSocialProfileModule.toggleChat(window.game)">${chatClose}</button>
                </div>
                <div class="chat-tabs">
                    <button id="chat-tab-world" data-channel="world" class="active" onclick="window.KOVLobbyChatModule.setChatChannel(window.game, 'world')">${chatWorld}</button>
                    <button id="chat-tab-guild" data-channel="guild" onclick="window.KOVLobbyChatModule.setChatChannel(window.game, 'guild')">${chatGuild}</button>
                    <button id="chat-tab-system" data-channel="system" onclick="window.KOVLobbyChatModule.setChatChannel(window.game, 'system')">${chatSystem}</button>
                </div>
                <div id="chat-messages" class="chat-messages"></div>
                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="${chatPlaceholder}">
                    <button id="chat-send-btn" onclick="window.KOVSocialProfileModule.sendChatMessage(window.game)">${chatSend}</button>
                </div>
            `;
            gameContainer.appendChild(chatDrawer);
        }

        if (!document.getElementById('modal-profile')) {
            const profileModal = document.createElement('div');
            profileModal.id = 'modal-profile';
            profileModal.className = 'modal-overlay';
            profileModal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal" onclick="document.getElementById('modal-profile').classList.remove('open')">&times;</span>
                    <div id="profile-body"></div>
                </div>
            `;
            document.body.appendChild(profileModal);
        }

        updateHeaderForSocial(game);
        window.KOVLobbyChatModule.ensureChatState(game);
        window.KOVLobbyChatModule.updateChatTabUI(game);
        refreshChatUI(game);

        setInterval(() => simulateChat(game, { DUMMY_CHAT_MESSAGES: deps.DUMMY_CHAT_MESSAGES }), 5000 + Math.random() * 10000);
    }

    global.KOVSocialProfileModule = {
        sanitizeProfileText,
        sanitizeUserProfile,
        getDefaultProfileName,
        getDefaultProfileTitle,
        getDefaultSquadName,
        sanitizeArmyName,
        sanitizeArmies,
        updateHeaderForSocial,
        toggleChat,
        sendChatMessage,
        simulateChat,
        refreshChatUI,
        openProfile,
        isSocialFriend,
        openSocialHub,
        renderSocialHub,
        requestFriend,
        requestAlliance,
        acceptFriendRequest,
        rejectFriendRequest,
        acceptAllianceRequest,
        rejectAllianceRequest,
        editName,
        initSocialUI
    };
})(window);


