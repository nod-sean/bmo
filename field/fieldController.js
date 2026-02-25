(function (global) {
    'use strict';

    class KOVFieldController {
        constructor(game) {
            this.game = game;
        }

        toggleField(opts = {}) {
            const game = this.game;
            const modal = document.getElementById('field-modal');
            if (modal.classList.contains('open') && modal.dataset.mode === 'field') {
                window.KOVUiShellModule.closeModal(game);
                return;
            }
            const preferredArmyId = window.KOVFieldCommandModule.getPreferredFieldArmyId(game);
            if (preferredArmyId === null) {
                window.KOVUiShellModule.showToast(game, game.tr('toast.field_need_squad', {}, 'Deploy at least one squad before entering the field.'));
                game.sound.playError();
                return;
            }
            const skipLobby = !!opts.skipLobby;
            const lobby = window.KOVLobbyChatModule.ensureWorldLobbyState(game);
            const user = game.authSession?.user;
            const tutorialCompleted = user ? !!user.tutorialCompleted : false;

            if (!tutorialCompleted) {
                // Auto enter map_0 and skip lobby
                if (!lobby.entered || lobby.channel !== 'map_0') {
                    this.autoEnterTutorialLobby();
                    return;
                }
            } else if (!skipLobby && !lobby.entered) {
                this.openWorldLobbyModal();
                return;
            }
            window.KOVFieldCommandModule.exitMoveTargetMode(game);
            game.selectedArmyId = preferredArmyId;
            game.lastSelectedArmyId = preferredArmyId;
            game.camera = null;
            window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
            window.KOVFieldCommandModule.enterMoveTargetMode(
                game,
                preferredArmyId,
                { center: true },
                game.fieldMapRenderDeps
            );

            // Fetch initial world state for other players' armies
            if (game.runtime && game.runtime.getWorldState) {
                game.runtime.getWorldState(game, lobby.channel).then(res => {
                    const payload = (res && res.success && res.data) ? res.data : res;
                    if (payload && Array.isArray(payload.armies)) {
                        const myUserId = game.authSession?.user?.uid;
                        game.otherArmies = payload.armies
                            .filter(a => a.userId && a.userId !== myUserId)
                            .map(a => ({
                                id: a.armyId,
                                userId: a.userId,
                                r: a.r,
                                c: a.c,
                                state: a.state,
                                moving: a.moving
                            }));
                        // Re-render to show other armies immediately
                        if (window.KOVFieldRenderModule && typeof window.KOVFieldRenderModule.renderFieldMap === 'function') {
                            window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
                        }
                    }
                }).catch(e => console.error("Failed to get world state:", e));
            }
        }

        openWorldLobbyModal() {
            const game = this.game;
            const modal = document.getElementById('modal-lobby');
            const select = document.getElementById('lobby-channel-select');
            if (!modal || !select) return;
            const state = window.KOVLobbyChatModule.ensureWorldLobbyState(game);
            select.value = state.channel || 'alpha';
            window.KOVLobbyChatModule.renderLobbyChannelStatus(game);
            window.KOVLobbyChatModule.fetchLobbyChannelStatusFromApi(game, true);
            modal.classList.add('open');
        }

        closeWorldLobbyModal() {
            const modal = document.getElementById('modal-lobby');
            if (modal) modal.classList.remove('open');
        }

        async autoEnterTutorialLobby() {
            const game = this.game;
            const state = window.KOVLobbyChatModule.ensureWorldLobbyState(game);
            let acceptedChannel = 'map_0';
            try {
                const result = await window.KOVLobbyChatModule.enterLobbyChannelViaApi(game, 'map_0');
                if (result && result.channel) acceptedChannel = result.channel;
            } catch (e) { }
            state.channel = acceptedChannel;
            state.entered = true;
            state.enteredAt = Date.now();
            window.KOVLobbyChatModule.renderLobbyChannelStatus(game);
            this.closeWorldLobbyModal();
            window.KOVPersistenceModule.saveGame(game);
            window.KOVUiShellModule.showToast(game, game.tr('toast.tutorial_entered', {}, `Entered Tutorial World`));
            window.location.reload();
        }

        async confirmWorldLobbyEntry() {
            const game = this.game;
            const select = document.getElementById('lobby-channel-select');
            const channel = String(select?.value || 'map_0').trim().toLowerCase();
            const state = window.KOVLobbyChatModule.ensureWorldLobbyState(game);
            let acceptedChannel = ['map_0', 'map_1'].includes(channel) ? channel : 'map_0';
            try {
                const result = await window.KOVLobbyChatModule.enterLobbyChannelViaApi(game, acceptedChannel);
                if (result && result.channel) acceptedChannel = result.channel;
            } catch (e) { }
            state.channel = acceptedChannel;
            state.entered = true;
            state.enteredAt = Date.now();
            window.KOVLobbyChatModule.renderLobbyChannelStatus(game);
            this.closeWorldLobbyModal();
            window.KOVPersistenceModule.saveGame(game);
            window.KOVUiShellModule.showToast(game, game.tr('toast.lobby_entered', { channel: state.channel.toUpperCase() }, `Entered channel ${state.channel.toUpperCase()}`));
            window.location.reload();
        }
    }

    const KOVFieldControllerModule = {
        handleSocketWorldEvent: function(game, eventName, payload) {
            console.log('[Socket] World Event:', eventName, payload);
            if (!game) return;
            const modal = document.getElementById('field-modal');
            
            // Handle other players' army movements
            if (eventName === 'world.army_march_started' && payload) {
                const myUserId = game.authSession?.user?.uid;
                if (payload.userId && payload.userId !== myUserId) {
                    if (!game.otherArmies) game.otherArmies = [];
                    const existingIdx = game.otherArmies.findIndex(a => a.id === payload.armyId && a.userId === payload.userId);
                    const newArmyData = {
                        id: payload.armyId,
                        userId: payload.userId,
                        r: payload.from.r,
                        c: payload.from.c,
                        state: 'MOVING',
                        moving: {
                            arriveAt: Date.now() + (payload.etaMs || 0),
                            to: payload.to
                        }
                    };
                    if (existingIdx >= 0) {
                        game.otherArmies[existingIdx] = newArmyData;
                    } else {
                        game.otherArmies.push(newArmyData);
                    }
                }
            }

            if (modal && modal.classList.contains('open') && modal.dataset.mode === 'field') {
                // If it's a world event, and we are looking at the field map, we should re-render or update state.
                // In a fully implemented system, we'd fetch the latest world state from the server here or apply delta
                if (eventName === 'world.tile_updated' || eventName === 'world.army_march_started' || eventName === 'battle.started') {
                    if (window.KOVFieldRenderModule && typeof window.KOVFieldRenderModule.renderFieldMap === 'function') {
                        // Debounce re-render slightly to avoid thrashing on multiple rapid events
                        if (game._worldSyncTimer) clearTimeout(game._worldSyncTimer);
                        game._worldSyncTimer = setTimeout(() => {
                            // Render field map again to show updated tiles / armies
                            window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps || window.KOVMethodDeps?.getFieldMapRenderDeps?.(game));
                        }, 100);
                    }
                }
            }
        }
    };

    global.KOVFieldController = KOVFieldController;
    global.KOVFieldControllerModule = KOVFieldControllerModule;
})(window);


