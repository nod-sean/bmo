(function (global) {
    'use strict';

    function getStartRegionId(game, sr, sc, deps) {
        const startType = deps.FIELD_MAP_DATA[sr][sc];
        if (!deps.isBorderTerrain(startType)) {
            return window.KOVFieldStateModule.getRegionIdAt(game, sr, sc, { MAP_SIZE: deps.MAP_SIZE });
        }
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const d of dirs) {
            const nr = sr + d[0];
            const nc = sc + d[1];
            const id = window.KOVFieldStateModule.getRegionIdAt(game, nr, nc, { MAP_SIZE: deps.MAP_SIZE });
            if (id !== -1) return id;
        }
        return -1;
    }

    function isFieldReachable(game, r, c, deps) {
        const targetKey = `${r},${c}`;
        if (game.occupiedTiles.has(targetKey)) return true;
        if (!game.occupiedTiles.size) return false;

        const queue = [];
        const visited = new Set();
        game.occupiedTiles.forEach((key) => {
            const [sr, sc] = key.split(',').map(Number);
            const regionId = getStartRegionId(game, sr, sc, deps);
            queue.push({ r: sr, c: sc, regionId });
            visited.add(key);
        });

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        while (queue.length) {
            const cur = queue.shift();
            for (const d of dirs) {
                const nr = cur.r + d[0];
                const nc = cur.c + d[1];
                if (nr < 0 || nr >= deps.MAP_SIZE || nc < 0 || nc >= deps.MAP_SIZE) continue;
                const nkey = `${nr},${nc}`;
                if (visited.has(nkey)) continue;
                const type = deps.FIELD_MAP_DATA[nr][nc];
                const isTarget = nkey === targetKey;
                const isOccupied = game.occupiedTiles.has(nkey);
                if (window.KOVFieldStateModule.isTileBlocked(game, cur, nr, nc, type, isOccupied, isTarget, cur.regionId ?? -1, {
                    FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
                    isWallTile: deps.isWallTile,
                    isBorderTerrain: deps.isBorderTerrain
                })) continue;
                if (isTarget) return true;

                let nextRegion = cur.regionId ?? -1;
                if (!deps.isBorderTerrain(type)) {
                    const rid = window.KOVFieldStateModule.getRegionIdAt(game, nr, nc, { MAP_SIZE: deps.MAP_SIZE });
                    if (rid !== -1) nextRegion = rid;
                }
                visited.add(nkey);
                queue.push({ r: nr, c: nc, regionId: nextRegion });
            }
        }
        return false;
    }

    function buildReachableTiles(game, deps) {
        const reachable = new Set();
        if (!game.occupiedTiles.size) return reachable;

        const queue = [];
        game.occupiedTiles.forEach((key) => {
            const [sr, sc] = key.split(',').map(Number);
            const regionId = getStartRegionId(game, sr, sc, deps);
            queue.push({ r: sr, c: sc, regionId });
            reachable.add(key);
        });

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        while (queue.length) {
            const cur = queue.shift();
            for (const d of dirs) {
                const nr = cur.r + d[0];
                const nc = cur.c + d[1];
                if (nr < 0 || nr >= deps.MAP_SIZE || nc < 0 || nc >= deps.MAP_SIZE) continue;
                const nkey = `${nr},${nc}`;
                if (reachable.has(nkey)) continue;
                const type = deps.FIELD_MAP_DATA[nr][nc];
                const isOccupied = game.occupiedTiles.has(nkey);
                if (window.KOVFieldStateModule.isTileBlocked(game, cur, nr, nc, type, isOccupied, false, cur.regionId ?? -1, {
                    FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
                    isWallTile: deps.isWallTile,
                    isBorderTerrain: deps.isBorderTerrain
                })) continue;

                let nextRegion = cur.regionId ?? -1;
                if (!deps.isBorderTerrain(type)) {
                    const rid = window.KOVFieldStateModule.getRegionIdAt(game, nr, nc, { MAP_SIZE: deps.MAP_SIZE });
                    if (rid !== -1) nextRegion = rid;
                }
                reachable.add(nkey);
                queue.push({ r: nr, c: nc, regionId: nextRegion });
            }
        }
        return reachable;
    }

    function canCollectFieldObject(game, r, c, deps) {
        return isFieldReachable(game, r, c, deps);
    }

    function updateOpenBorders(game, deps) {
        const open = new Set();
        const visited = new Set();
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        const bfs = (sr, sc, adjKey) => {
            const stack = [{ r: sr, c: sc }];
            visited.add(`${sr},${sc}`);
            while (stack.length) {
                const cur = stack.pop();
                open.add(`${cur.r},${cur.c}`);
                for (const d of dirs) {
                    const nr = cur.r + d[0];
                    const nc = cur.c + d[1];
                    if (nr < 0 || nr >= deps.MAP_SIZE || nc < 0 || nc >= deps.MAP_SIZE) continue;
                    const nkey = `${nr},${nc}`;
                    if (visited.has(nkey)) continue;
                    if (!deps.isBorderTerrain(deps.FIELD_MAP_DATA[nr][nc])) continue;
                    const nAdjKey = window.KOVFieldStateModule.getAdjacentRegionKey(game, nr, nc, { MAP_SIZE: deps.MAP_SIZE });
                    if (!nAdjKey || nAdjKey !== adjKey) continue;
                    visited.add(nkey);
                    stack.push({ r: nr, c: nc });
                }
            }
        };

        game.occupiedTiles.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            const type = deps.FIELD_MAP_DATA[r]?.[c];
            if (!deps.isGateTile(type)) return;
            for (const d of dirs) {
                const nr = r + d[0];
                const nc = c + d[1];
                if (nr < 0 || nr >= deps.MAP_SIZE || nc < 0 || nc >= deps.MAP_SIZE) continue;
                if (!deps.isBorderTerrain(deps.FIELD_MAP_DATA[nr][nc])) continue;
                const nkey = `${nr},${nc}`;
                const adjKey = window.KOVFieldStateModule.getAdjacentRegionKey(game, nr, nc, { MAP_SIZE: deps.MAP_SIZE });
                if (!adjKey) continue;
                if (!visited.has(nkey)) bfs(nr, nc, adjKey);
            }
        });

        game.openBorderTiles = open;
    }

    function handleArrival(game, army, deps) {
        if (!army || !army.target) return;
        const { r, c, type } = army.target;

        const eventKey = `${r},${c}`;
        const event = game.fieldEvents[eventKey];
        if (event) {
            army.state = 'IDLE';
            window.KOVPersistenceModule.saveGame(game);

            if (event.type === deps.FIELD_EVENT_TYPES.BANDIT || event.type === deps.FIELD_EVENT_TYPES.BANDIT_LEADER || event.type === deps.FIELD_EVENT_TYPES.DUNGEON || event.type === deps.FIELD_EVENT_TYPES.CROWN) {
                setTimeout(() => {
                    const cell = document.getElementById(`field-cell-${r}-${c}`);
                    if (cell) {
                        const rect = cell.getBoundingClientRect();
                        window.KOVFieldUiModule.setFieldInfo(game, event.type, r, c, game.fieldInfoDeps);
                        window.KOVFieldUiModule.showFieldActionMenu(game, r, c, event.type, rect.left + rect.width / 2, rect.top + rect.height / 2, game.fieldActionMenuDeps);
                    }
                }, 100);
                return;
            }
            if (event.type === deps.FIELD_EVENT_TYPES.PORTAL) {
                window.KOVFieldEventUiModule.openPortalModal(game, r, c, army.id, game.portalDeps);
                return;
            }
            if (event.type === deps.FIELD_EVENT_TYPES.CARAVAN) {
                window.KOVFieldEventLogicModule.openCaravanShop(game, r, c, { FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES });
                return;
            }
        }

        let mapChanged = false;
        if (deps.isBorderTerrain(type)) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.reached_border', {}, 'Reached border'));
        } else if (window.KOVGameCoreModule.isHostileTarget(game, type, r, c, game.gameCoreDeps)) {
            army.state = 'IDLE';
            window.KOVPersistenceModule.saveGame(game);
            setTimeout(() => {
                const cell = document.getElementById(`field-cell-${r}-${c}`);
                if (cell) {
                    const rect = cell.getBoundingClientRect();
                    window.KOVFieldUiModule.setFieldInfo(game, type, r, c, game.fieldInfoDeps);
                    window.KOVFieldUiModule.showFieldActionMenu(game, r, c, type, rect.left + rect.width / 2, rect.top + rect.height / 2, game.fieldActionMenuDeps);
                }
            }, 100);
            return;
        } else {
            window.KOVUiShellModule.showToast(game, game.tr('toast.army_arrived', { army: army.name }, `${army.name} arrived`));
        }

        const collectibleInfo = window.KOVFieldStateModule.getCollectibleFieldItemInfo(game, type, {
            isTerrainCode: deps.isTerrainCode,
            getInfoFromCode: deps.getInfoFromCode
        });
        if (collectibleInfo && canCollectFieldObject(game, r, c, deps)) {
            const item = window.KOVFieldStateModule.createMergeItemFromInfo(game, collectibleInfo, { ITEM_TYPE: deps.ITEM_TYPE });
            if (window.KOVMergeBoardModule.spawnItem(game, item, game.spawnItemDeps)) {
                window.KOVFieldStateModule.clearFieldObjectFromMap(game, r, c, {
                    FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
                    FIELD_TERRAIN_DATA: deps.FIELD_TERRAIN_DATA
                });
                if (game.fieldObjectState) {
                    if (!game.fieldObjectState.regenByCode) game.fieldObjectState.regenByCode = {};
                    game.fieldObjectState.regenByCode[type] = Date.now();
                }
                mapChanged = true;
                game.sound.playCollect();
                window.KOVUiShellModule.showToast(game, game.tr('toast.collect_done', {}, 'Collected'));
            } else {
                window.KOVUiShellModule.showToast(game, game.tr('toast.merge_slot_short', {}, 'Not enough merge slot space'));
                window.KOVFieldUiModule.setMovePreview(game, game.tr('ui.field.merge_slots_full', {}, 'Merge slots are full'));
                setTimeout(() => {
                    if (!game.moveTargetMode) window.KOVFieldUiModule.setMovePreview(game, '');
                }, 1500);
            }
        }

        if (mapChanged) window.KOVFieldFlowModule.updateOpenBorders(game, game.fieldFlowDeps);
        if (mapChanged && document.getElementById('field-modal').classList.contains('open')) {
            if (!window.KOVFieldUiModule.refreshFieldMapVisuals(game, game.fieldUiVisualDeps)) {
                window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
            }
            else if (game.currentFieldTargetKey === `${r},${c}`) window.KOVFieldUiModule.setFieldInfo(game, deps.FIELD_MAP_DATA[r][c], r, c, game.fieldInfoDeps);
        }

        army.state = 'IDLE';
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        window.KOVPersistenceModule.saveGame(game);
    }

    global.KOVFieldFlowModule = {
        isFieldReachable,
        buildReachableTiles,
        canCollectFieldObject,
        updateOpenBorders,
        handleArrival
    };
})(window);



