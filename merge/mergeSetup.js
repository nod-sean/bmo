(function (global) {
    'use strict';

    function createGrassPattern() {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const x = c.getContext('2d');
        x.fillStyle = '#4a6e3a';
        x.fillRect(0, 0, 32, 32);
        for (let i = 0; i < 30; i++) {
            x.fillStyle = Math.random() > 0.5 ? '#567d46' : '#3e5c30';
            const px = Math.floor(Math.random() * 32);
            const py = Math.floor(Math.random() * 32);
            x.fillRect(px, py, 1, 1);
        }
        return c.toDataURL();
    }

    function calcLayout(game, deps) {
        const gw = game.width - (deps.CONFIG.gridPadding * 2);
        game.gridTileSize = Math.floor(gw / deps.CONFIG.gridCols);
        game.gridStartX = deps.CONFIG.gridPadding;
        game.gridStartY = deps.CONFIG.gridTopY;
        const useThird = game.thirdSquadUnlocked;
        const squadSize = useThird ? deps.CONFIG.squadCellSize3 : deps.CONFIG.squadCellSize;
        const squadGap = useThird ? deps.CONFIG.squadGap3 : deps.CONFIG.squadGap;
        game.squadCellSize = squadSize;
        const sw = game.squadCellSize * 3;
        const squadCount = useThird ? 3 : 2;
        const totalSw = (sw * squadCount) + (squadGap * (squadCount - 1));
        const sx = Math.floor((game.width - totalSw) / 2);
        game.squad1Rect = { x: sx, y: deps.CONFIG.squadTopY, w: sw, h: sw };
        game.squad2Rect = { x: sx + sw + squadGap, y: deps.CONFIG.squadTopY, w: sw, h: sw };
        game.squad3Rect = useThird
            ? { x: sx + (sw + squadGap) * 2, y: deps.CONFIG.squadTopY, w: sw, h: sw }
            : null;
    }

    function refreshLockState(game, deps) {
        for (let r = 0; r < deps.CONFIG.gridRows; r++) {
            for (let c = 0; c < deps.CONFIG.gridCols; c++) {
                if (game.gridState[r][c] && game.gridState[r][c].type === deps.LOCK_TYPE.OPEN) continue;
                const lvlReq = deps.UNLOCK_LEVEL_MAP[r][c];
                const goldReq = deps.UNLOCK_GOLD_MAP[r][c];
                if (game.lordLevel < lvlReq) game.gridState[r][c] = { type: deps.LOCK_TYPE.LEVEL, value: lvlReq };
                else if (goldReq > 0) game.gridState[r][c] = { type: deps.LOCK_TYPE.GOLD, value: goldReq };
                else game.gridState[r][c] = { type: deps.LOCK_TYPE.OPEN };
            }
        }
        game.requestRender();
    }

    function initGame(game, deps) {
        refreshLockState(game, deps);
        game.grid[3][3] = { type: deps.ITEM_TYPE.BUILDING_BARRACKS, level: 1, scale: 1 };
        game.grid[4][4] = { type: deps.ITEM_TYPE.BUILDING_CHEST, level: 1, scale: 1, usage: 5 };
        game.grid[5][5] = { type: deps.ITEM_TYPE.BUILDING_CAMP, level: 1, scale: 1, storedUnits: [] };

        // Seed locked slots with design-specified unlock items.
        // Items become visible/collectable after the slot is unlocked.
        const unlockItemMap = Array.isArray(deps.UNLOCK_ITEM_MAP) ? deps.UNLOCK_ITEM_MAP : [];
        const decode = typeof deps.getInfoFromCode === 'function' ? deps.getInfoFromCode : null;
        if (decode) {
            for (let r = 0; r < deps.CONFIG.gridRows; r++) {
                const row = unlockItemMap[r];
                if (!Array.isArray(row)) continue;
                for (let c = 0; c < deps.CONFIG.gridCols; c++) {
                    const code = Number(row[c] || 0);
                    if (!Number.isFinite(code) || code <= 0) continue;
                    if (game.grid[r][c]) continue;
                    const lock = game.gridState[r][c];
                    if (!lock || lock.type === deps.LOCK_TYPE.OPEN) continue;
                    const info = decode(code);
                    if (!info || !Number.isFinite(info.type) || !Number.isFinite(info.level)) continue;
                    game.grid[r][c] = { type: info.type, level: info.level, scale: 1 };
                }
            }
        }

        window.KOVGameCoreModule.updateLevelStats(game, game.levelDeps);
        window.KOVMergeBoardModule.updateInfoPanel(game, {
            ITEM_TYPE: deps.ITEM_TYPE,
            CAMP_CAPACITY: deps.CAMP_CAPACITY,
            getData: deps.getData
        });
    }

    global.KOVMergeSetupModule = {
        createGrassPattern,
        calcLayout,
        initGame,
        refreshLockState
    };
})(window);
