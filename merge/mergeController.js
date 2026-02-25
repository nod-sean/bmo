(function (global) {
    'use strict';

    class KOVMergeController {
        constructor(game) {
            this.game = game;
        }

        toggleShop() {
            const game = this.game;
            const modal = document.getElementById('field-modal');
            if (modal && modal.classList.contains('open') && modal.dataset.mode === 'shop') {
                window.KOVUiShellModule.closeModal(game);
            }
        }
    }

    function applyMergeState(game, state) {
        if (!state) return;
        const config = game.runtimeConfig?.CONFIG || window.RUNTIME?.core?.CONFIG;
        if (!config) return;

        const hasGridData = state.grid && (
            (Array.isArray(state.grid) && state.grid.some(row => row && row.some(cell => cell))) ||
            (typeof state.grid === 'object' && Object.keys(state.grid).length > 0)
        );

        if (hasGridData) {
            if (Array.isArray(state.grid)) {
                game.grid = state.grid;
            } else {
                game.grid = Array(config.gridRows).fill().map(() => Array(config.gridCols).fill(null));
                for (const key in state.grid) {
                    const item = state.grid[key];
                    if (key.startsWith('grid_')) {
                        const parts = key.split('_');
                        const r = parseInt(parts[1], 10);
                        const c = parseInt(parts[2], 10);
                        if (r >= 0 && r < config.gridRows && c >= 0 && c < config.gridCols) {
                            game.grid[r][c] = { type: item.type, level: item.level, scale: 1, ...item };
                        }
                    } else if (key.includes(',')) {
                        const [r, c] = key.split(',').map(Number);
                        if (r >= 0 && r < config.gridRows && c >= 0 && c < config.gridCols) {
                            game.grid[r][c] = { type: item.type, level: item.level, scale: 1, ...item };
                        }
                    }
                }
            }
            if (state.gridState && Array.isArray(state.gridState)) {
                 game.gridState = state.gridState;
            } else {
                 for (let r = 0; r < config.gridRows; r++) {
                     for (let c = 0; c < config.gridCols; c++) {
                         if (!game.gridState[r][c]) {
                             game.gridState[r][c] = { type: window.RUNTIME?.core?.LOCK_TYPE?.OPEN || 0 };
                         }
                     }
                 }
            }
            if (state.squad1 && Array.isArray(state.squad1)) game.squad1 = state.squad1;
            if (state.squad2 && Array.isArray(state.squad2)) game.squad2 = state.squad2;
            if (state.squad3 && Array.isArray(state.squad3)) game.squad3 = state.squad3;

            if (game.requestRender) game.requestRender();
        }
    }

    global.KOVMergeControllerModule = {
        applyMergeState
    };
    global.KOVMergeController = KOVMergeController;
})(window);


