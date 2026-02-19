(function (global) {
    'use strict';

    class KOVMergeController {
        constructor(game) {
            this.game = game;
        }

        toggleShop() {
            const game = this.game;
            const modal = document.getElementById('field-modal');
            const content = document.getElementById('modal-content');
            const title = document.getElementById('modal-title');
            title.innerText = game.tr('ui.modal.shop_title', {}, 'Build Shop');
            content.innerHTML = '';
            if (modal.classList.contains('open') && modal.dataset.mode === 'shop') {
                window.KOVUiShellModule.closeModal(game);
                return;
            }
            modal.hidden = false;
            modal.dataset.mode = 'shop';
            modal.classList.add('open');

            const grid = document.createElement('div');
            grid.className = 'shop-grid';
            const shopData = game.runtimeConfig?.SHOP_DATA || [];
            shopData.forEach((item) => {
                const div = document.createElement('div');
                div.className = 'shop-item';
                div.innerHTML = `<div class="text-2xl">${item.icon}</div><div class="font-bold text-sm text-white">${item.name}</div><button class="bg-yellow-600 text-white px-3 py-1 mt-2 rounded font-bold text-xs" onclick="window.game.mergeController.buyBuilding(${item.type}, ${item.price})">G ${item.price}</button>`;
                grid.appendChild(div);
            });
            content.appendChild(grid);
        }

        buyBuilding(type, price) {
            const game = this.game;
            const runtimeCfg = game.runtimeConfig || {};
            const BUILDING_LIMITS = runtimeCfg.BUILDING_LIMITS || {};
            const LOCK_TYPE = runtimeCfg.LOCK_TYPE || {};
            const ITEM_TYPE = runtimeCfg.ITEM_TYPE || {};
            const CONFIG = runtimeCfg.CONFIG || {
                gridRows: Array.isArray(game.grid) ? game.grid.length : 8,
                gridCols: Array.isArray(game.grid?.[0]) ? game.grid[0].length : 8
            };

            if (game.gold < price) {
                window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short', {}, 'Not enough gold'));
                return;
            }
            const limit = BUILDING_LIMITS[type] || 999;
            const current = window.KOVGameCoreModule.getBuildingCount(game, type, { CONFIG });
            if (current >= limit) {
                window.KOVUiShellModule.showToast(game, game.tr('toast.build_limit_reached', { limit }, `Build limit reached (${limit})`));
                return;
            }

            for (let r = 0; r < CONFIG.gridRows; r++) for (let c = 0; c < CONFIG.gridCols; c++) {
                if (game.gridState[r][c].type === LOCK_TYPE.OPEN && !game.grid[r][c]) {
                    game.gold -= price;
                    const newItem = { type: type, level: 1, scale: 0 };
                    if (type === ITEM_TYPE.BUILDING_CHEST) newItem.usage = 5;
                    if (type === ITEM_TYPE.BUILDING_CAMP) newItem.storedUnits = [];
                    game.grid[r][c] = newItem;
                    window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
                    game.requestRender();
                    window.KOVUiShellModule.showToast(game, game.tr('toast.build_done', {}, 'Built'));
                    window.KOVUiShellModule.closeModal(game);
                    const cx = game.gridStartX + c * game.gridTileSize + game.gridTileSize / 2;
                    const cy = game.gridStartY + r * game.gridTileSize + game.gridTileSize / 2;
                    game.spawnParticles(cx, cy, '#FFD700', 20, 'confetti');
                    game.sound.playSpawn();
                    return;
                }
            }
            window.KOVUiShellModule.showToast(game, game.tr('toast.space_short', {}, 'No empty slot'));
        }
    }

    global.KOVMergeController = KOVMergeController;
})(window);


