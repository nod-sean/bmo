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
            if (!skipLobby && !lobby.entered) {
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

        async confirmWorldLobbyEntry() {
            const game = this.game;
            const select = document.getElementById('lobby-channel-select');
            const channel = String(select?.value || 'alpha').trim().toLowerCase();
            const state = window.KOVLobbyChatModule.ensureWorldLobbyState(game);
            let acceptedChannel = ['alpha', 'beta', 'gamma'].includes(channel) ? channel : 'alpha';
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
            this.toggleField({ skipLobby: true });
        }
    }

    global.KOVFieldController = KOVFieldController;
})(window);


