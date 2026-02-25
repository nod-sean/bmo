(function (global) {
    'use strict';

    function buildFieldCommandDeps(deps) {
        const gp = deps.GAMEPLAY || deps;
        return {
            PLAYER_START: deps.PLAYER_START,
            MAP_SIZE: deps.MAP_SIZE,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA: deps.FIELD_TERRAIN_DATA,
            AStar: deps.AStar,
            GAMEPLAY: gp,
            isBorderTerrain: deps.isBorderTerrain,
            isGateTile: deps.isGateTile,
            isCitadelTile: deps.isCitadelTile,
            isDragonTile: deps.isDragonTile,
            isTerrainCode: deps.isTerrainCode,
            getTerrainBase: deps.getTerrainBase,
            isWallTile: deps.isWallTile,
            getFieldObjectKind: deps.getFieldObjectKind
        };
    }

    function isKnownFieldObjectType(type, deps) {
        return deps.isWallTile(type)
            || deps.isCastleTile(type)
            || deps.isGateTile(type)
            || deps.isCitadelTile(type)
            || deps.isDragonTile(type)
            || deps.isGoldMineTile(type)
            || deps.isFountainTile(type)
            || deps.isShopTile(type)
            || deps.isTavernTile(type)
            || deps.isRuinsTile(type)
            || deps.isStatueTile(type);
    }

    function renderFieldMap(game, deps) {
        const {
            MAP_SIZE,
            FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA,
            TERRAIN_COLORS,
            TERRAIN_COLORS_BORDER,
            isTerrainCode,
            getTerrainBase,
            isWallTile,
            isCastleTile,
            isGateTile,
            isCitadelTile,
            isDragonTile,
            isGoldMineTile,
            isFountainTile,
            isShopTile,
            isTavernTile,
            isRuinsTile,
            isStatueTile,
            isBorderTerrain
        } = deps;

        const commandDeps = buildFieldCommandDeps(deps);
        const modal = document.getElementById('field-modal');
        const content = document.getElementById('modal-content');
        const title = document.getElementById('modal-title');
        modal.hidden = false;
        modal.dataset.mode = 'field';
        modal.classList.add('open');
        title.innerText = game.tr('ui.modal.field_title', {}, "World Map (Field)");
        content.innerHTML = "";
        content.style.overflow = "hidden";
        content.style.position = "relative";
        content.style.display = "block";
        content.style.height = "100%";

        const viewport = document.createElement('div');
        viewport.id = 'map-viewport';
        viewport.style.position = 'absolute';
        viewport.style.inset = '0';
        viewport.style.width = '100%';
        viewport.style.height = '100%';
        viewport.style.overflow = 'hidden';
        viewport.style.backgroundColor = '#2e3b23';
        viewport.style.touchAction = 'none';
        let lastCellClickTime = 0;
        let lastCellClickKey = null;
        const DOUBLE_CLICK_TIME = 300;

        viewport.onclick = (e) => {
            if (e.target === viewport) {
                const now = Date.now();
                const isDoubleClick = (lastCellClickKey === 'viewport' && now - lastCellClickTime < DOUBLE_CLICK_TIME);
                lastCellClickTime = now;
                lastCellClickKey = 'viewport';

                window.KOVFieldUiModule.hideFieldActionMenu(game);
                
                if (game.moveTargetMode && isDoubleClick) {
                    window.KOVFieldCommandModule.exitMoveTargetMode(game);
                    lastCellClickTime = 0;
                }
            }
        };
        content.appendChild(viewport);

        const overlay = document.createElement('div');
        overlay.className = 'field-overlay';

        const headerDiv = document.createElement('div');
        headerDiv.className = "flex justify-between items-center bg-gray-700 px-2 py-1 rounded text-[11px] shadow-md";
        const incomeSign = game.income >= 0 ? "+" : "";
        const occupiedLabel = game.tr('ui.field.header.occupied', {}, 'Occupied');
        const incomeLabel = game.tr('ui.field.header.income', {}, 'Income');
        const cpLabel = game.tr('ui.field.header.cp', {}, 'AP');
        const per3secLabel = game.tr('ui.field.header.per_3sec', {}, '/3sec');
        
        const currentChannel = game.worldLobbyState?.channel || 'map_0';
        
        headerDiv.innerHTML = `<div class="text-blue-300 font-bold mr-2">Map: ${currentChannel}</div><div>${occupiedLabel}: <span class="text-white font-bold">${game.occupiedTiles.size}</span></div><div>${incomeLabel}: <span class="text-yellow-400 font-bold">${incomeSign}${game.income}${per3secLabel}</span></div><div>${cpLabel}: <span id="field-cp-display" class="text-white font-bold">${game.cp}/${game.maxCp}</span></div>`;
        overlay.appendChild(headerDiv);

        const squadTabs = document.createElement('div');
        squadTabs.className = 'field-squad-tabs';
        window.KOVFieldCommandModule.getAvailableArmies(game).forEach((army) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'field-squad-tab';
            btn.dataset.armyId = String(army.id);
            if (game.selectedArmyId === army.id) btn.classList.add('active');
            btn.style.borderColor = army.color;
            const squadLabel = game.tr('ui.squad.label', {}, 'Squad');
            btn.innerText = `${squadLabel} ${army.id + 1}`;
            btn.onclick = (e) => {
                e.stopPropagation();
                window.KOVFieldUiModule.hideFieldActionMenu(game);
                window.KOVFieldCommandModule.enterMoveTargetMode(game, army.id, { center: true }, commandDeps);
            };
            squadTabs.appendChild(btn);
        });
        overlay.appendChild(squadTabs);

        const effectLog = document.createElement('div');
        effectLog.id = 'field-effect-log';
        effectLog.className = 'field-effect-log';
        overlay.appendChild(effectLog);

        const floatingWrap = document.createElement('div');
        floatingWrap.id = 'field-floating-wrap';
        floatingWrap.className = 'field-floating-wrap';

        const moveInfo = document.createElement('div');
        moveInfo.id = 'field-move-info';
        moveInfo.className = 'field-move-info';
        moveInfo.style.display = 'none';
        moveInfo.onclick = () => {
            if (game.moveTargetMode) window.KOVFieldCommandModule.exitMoveTargetMode(game);
        };
        floatingWrap.appendChild(moveInfo);

        const infoPanel = document.createElement('div');
        infoPanel.id = 'field-info-panel';
        infoPanel.className = 'field-info-panel';
        infoPanel.style.display = 'none';
        floatingWrap.appendChild(infoPanel);

        overlay.appendChild(floatingWrap);
        content.appendChild(overlay);

        const mapLayer = document.createElement('div');
        mapLayer.id = 'map-layer';
        mapLayer.style.position = 'absolute';
        mapLayer.style.transformOrigin = '0 0';
        mapLayer.style.display = 'grid';
        mapLayer.style.gridTemplateColumns = `repeat(${MAP_SIZE}, 12px)`;
        mapLayer.style.gap = '1px';
        mapLayer.style.padding = '50px';
        const mapSizePx = (MAP_SIZE * 13 - 1) + 100;
        const pathOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        pathOverlay.setAttribute('id', 'path-overlay');
        pathOverlay.setAttribute('width', mapSizePx);
        pathOverlay.setAttribute('height', mapSizePx);
        pathOverlay.setAttribute('viewBox', `0 0 ${mapSizePx} ${mapSizePx}`);
        mapLayer.appendChild(pathOverlay);
        game.pathOverlay = pathOverlay;

        const bgImg = game.assets.getImage('field_bg');
        if (bgImg && bgImg.src) {
            mapLayer.style.backgroundImage = `url(${bgImg.src})`;
        } else {
            mapLayer.style.backgroundImage = `url(${game.grassTexture})`;
        }
        mapLayer.style.backgroundRepeat = 'repeat';

        const armyLayer = document.createElement('div');
        armyLayer.id = 'army-layer';
        armyLayer.style.position = 'absolute';
        armyLayer.style.top = '0';
        armyLayer.style.left = '0';
        armyLayer.style.width = '100%';
        armyLayer.style.height = '100%';
        armyLayer.style.pointerEvents = 'none';
        armyLayer.style.zIndex = '50';
        mapLayer.appendChild(armyLayer);

        window.KOVFieldCommandModule.getAvailableArmies(game).forEach((army) => {
            const marker = document.createElement('div');
            marker.className = 'army-marker';
            if (game.selectedArmyId === army.id) marker.classList.add('selected');
            marker.id = `army-marker-${army.id}`;

            const squadData = window.KOVFieldCommandModule.getSquadByArmyId(game, army.id);
            let maxLevel = -1;
            let bestUnit = null;

            squadData.forEach((u) => {
                if (u && u.level > maxLevel) {
                    maxLevel = u.level;
                    bestUnit = u;
                }
            });

            if (bestUnit) {
                const img = game.assets.getImage(bestUnit.type, bestUnit.level);
                if (img && img.src) {
                    marker.style.backgroundImage = `url(${img.src})`;
                    marker.innerText = "";
                } else {
                    marker.style.backgroundColor = army.color;
                    marker.innerText = army.id + 1;
                }
            } else {
                marker.style.backgroundColor = army.color;
                marker.innerText = army.id + 1;
            }

            const TILE_SIZE = 13;
            const x = 50 + (army.c * TILE_SIZE);
            const y = 50 + (army.r * TILE_SIZE);
            marker.style.transform = `translate(${x}px, ${y}px)`;
            armyLayer.appendChild(marker);
        });

        // Render other players' armies
        if (Array.isArray(game.otherArmies)) {
            game.otherArmies.forEach((otherArmy) => {
                const marker = document.createElement('div');
                marker.className = 'army-marker other-army';
                marker.id = `other-army-marker-${otherArmy.userId}-${otherArmy.id}`;
                marker.style.backgroundColor = '#9ca3af'; // Gray color for other armies
                marker.style.border = '2px solid #ef4444'; // Red border for enemy
                
                // Use a default hero sprite (e.g. infantry level 1 = 1101)
                const avatarCode = otherArmy.avatar || '1101';
                const img = game.assets.getImage(String(avatarCode));
                if (img && img.src) {
                    marker.style.backgroundImage = `url(${img.src})`;
                    marker.innerText = '';
                } else {
                    marker.innerText = '!';
                }

                // Determine position based on whether it's moving
                let r = otherArmy.r;
                let c = otherArmy.c;
                if (otherArmy.state === 'MOVING' && otherArmy.moving?.to) {
                    // For simplicity, just place them at the destination, or use the source
                    r = otherArmy.moving.to.r;
                    c = otherArmy.moving.to.c;
                }

                const TILE_SIZE = 13;
                const x = 50 + (c * TILE_SIZE);
                const y = 50 + (r * TILE_SIZE);
                marker.style.transform = `translate(${x}px, ${y}px)`;
                armyLayer.appendChild(marker);
            });
        }

        const reachable = window.KOVFieldFlowModule.buildReachableTiles(game, {
            MAP_SIZE: MAP_SIZE,
            FIELD_MAP_DATA: FIELD_MAP_DATA,
            isBorderTerrain: isBorderTerrain,
            isWallTile: isWallTile
        });

        const appendCloudLayer = (cell, r, c, type) => {
            const evt = game.fieldEvents[`${r},${c}`];
            if (isGateTile(type) || isCitadelTile(type) || isWallTile(type) || isDragonTile(type)) return;
            if (evt) return;

            const layer = document.createElement('div');
            layer.className = 'field-cloud-layer';
            cell.appendChild(layer);
        };

        for (let r = 0; r < MAP_SIZE; r++) {
            for (let c = 0; c < MAP_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'field-cell';
                cell.id = `field-cell-${r}-${c}`;
                const type = FIELD_MAP_DATA[r][c];
                const key = `${r},${c}`;
                const isOccupied = game.occupiedTiles.has(key);
                const evt = game.fieldEvents[key];
                const isVisible = game.visibilityMap.has(key) || !!evt || isDragonTile(type);

                const isReachable = reachable.has(key);
                let isAdjacent = false;
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                if (!isOccupied) {
                    for (const d of dirs) {
                        const nr = r + d[0];
                        const nc = c + d[1];
                        if (game.occupiedTiles.has(`${nr},${nc}`)) {
                            isAdjacent = true;
                            break;
                        }
                    }
                }

                if (!isVisible) {
                    cell.classList.add('field-fog');
                    appendCloudLayer(cell, r, c, type);
                    mapLayer.appendChild(cell);
                    continue;
                }

                let color = 'rgba(0, 0, 0, 0)';
                if (isWallTile(type)) {
                    color = '#2b2b2b';
                    cell.classList.add('field-wall');
                } else if (isCastleTile(type)) {
                    color = '#4285f4';
                    cell.classList.add('field-castle');
                } else if (isGateTile(type)) {
                    color = '#ea4335';
                    cell.classList.add('field-gate');
                    if (isOccupied) cell.classList.add('unlocked');
                    else cell.classList.add('locked');
                } else if (isCitadelTile(type)) {
                    color = '#fbbc05';
                    cell.classList.add('field-citadel');
                } else if (isDragonTile(type)) {
                    color = '#b71c1c';
                    cell.classList.add('field-dragon');
                } else if (isGoldMineTile(type)) {
                    color = '#6d4c41';
                    cell.classList.add('field-goldmine');
                } else if (isFountainTile(type)) {
                    color = '#0ea5e9';
                    cell.classList.add('field-fountain');
                } else if (isShopTile(type)) {
                    color = '#2563eb';
                    cell.classList.add('field-shop');
                } else if (isTavernTile(type)) {
                    color = '#7c3aed';
                    cell.classList.add('field-tavern');
                } else if (isRuinsTile(type)) {
                    color = '#9ca3af';
                    cell.classList.add('field-ruins');
                } else if (isStatueTile(type)) {
                    color = '#94a3b8';
                    cell.classList.add('field-statue');
                } else if (isTerrainCode(type)) {
                    const base = getTerrainBase(type);
                    const isBorder = type % 100 === 1;
                    color = (isBorder ? TERRAIN_COLORS_BORDER[base] : TERRAIN_COLORS[base]) || '#2e3b23';
                } else if (type === 4) {
                    color = 'rgba(139, 69, 19, 0.4)';
                } else {
                    const base = FIELD_TERRAIN_DATA?.[r]?.[c];
                    if (isTerrainCode(base)) {
                        const baseType = getTerrainBase(base);
                        const isBorder = base % 100 === 1;
                        color = (isBorder ? TERRAIN_COLORS_BORDER[baseType] : TERRAIN_COLORS[baseType]) || '#2e3b23';
                    } else {
                        color = 'transparent';
                    }
                }

                cell.style.backgroundColor = color;

                if (!isTerrainCode(type)) {
                    const icon = game.assets.getImage(String(type));
                    if (icon && icon.src) {
                        cell.classList.remove(
                            'field-wall',
                            'field-castle',
                            'field-gate',
                            'field-citadel',
                            'field-dragon',
                            'field-goldmine',
                            'field-fountain',
                            'field-shop',
                            'field-tavern',
                            'field-ruins',
                            'field-statue',
                            'locked',
                            'unlocked'
                        );
                        cell.style.backgroundColor = 'transparent';
                        cell.style.backgroundImage = `url(${icon.src})`;
                        cell.style.backgroundSize = 'contain';
                        cell.style.backgroundRepeat = 'no-repeat';
                        cell.style.backgroundPosition = 'center';
                    }
                }

                if (isOccupied) {
                    cell.classList.add('field-occupied');
                    cell.style.opacity = 1.0;
                } else if (isAdjacent) {
                    cell.classList.add('field-adjacent');
                    cell.style.opacity = 0.6;
                } else {
                    cell.style.opacity = 1.0;
                }

                if (!isReachable && !isOccupied) {
                    cell.classList.add('field-cloud-blocked');
                    appendCloudLayer(cell, r, c, type);
                }

                if (game.currentFieldTargetKey === key) cell.classList.add('field-selected');

                const badge = window.KOVFieldUiModule.buildFieldBadge(game, type, isOccupied, r, c, deps, !!evt);
                if (badge) cell.appendChild(badge);
                window.KOVFieldUiModule.appendFieldEventMarker(game, cell, evt, deps);

                cell.onclick = (e) => {
                    e.stopPropagation();
                    if (!game.isDraggingMap) {
                        const now = Date.now();
                        const isDoubleClick = (lastCellClickKey === key && now - lastCellClickTime < DOUBLE_CLICK_TIME);
                        lastCellClickTime = now;
                        lastCellClickKey = key;

                        const displayType = evt ? evt.type : type;
                        if (game.moveTargetMode) {
                            const isMovable = game.moveTargetMode.movableRange && game.moveTargetMode.movableRange.has(key);
                            if (isDoubleClick && !isMovable) {
                                window.KOVFieldUiModule.hideFieldActionMenu(game);
                                window.KOVFieldCommandModule.exitMoveTargetMode(game);
                                lastCellClickTime = 0; // reset
                                return;
                            }
                            // Instead of moving instantly, show the action menu
                            // The Action Menu has the actual Execute (Move/Battle) buttons now
                            window.KOVFieldUiModule.setFieldInfo(game, displayType, r, c, game.fieldInfoDeps);
                            window.KOVFieldUiModule.showFieldActionMenu(game, r, c, displayType, e.clientX, e.clientY, game.fieldActionMenuDeps);
                            return;
                        }
                        window.KOVFieldUiModule.setFieldInfo(game, displayType, r, c, game.fieldInfoDeps);
                        window.KOVFieldUiModule.showFieldActionMenu(game, r, c, displayType, e.clientX, e.clientY, game.fieldActionMenuDeps);
                    }
                };
                cell.onmouseenter = () => {
                    if (!game.moveTargetMode || game.isDraggingMap) return;
                    if (game.lockedPathPreviewTarget) return; // Don't preview if an action menu is open
                    window.KOVFieldCommandModule.previewMoveTarget(game, r, c, commandDeps);
                };
                cell.onmouseleave = () => {
                    if (!game.moveTargetMode || game.isDraggingMap) return;
                    if (game.lockedPathPreviewTarget) return; // Don't clear preview if an action menu is open
                    window.KOVFieldUiModule.clearPathPreview(game);
                    const armyId = game.moveTargetMode.armyId;
                    const squadNo = Number(armyId) + 1;
                    const squadLabel = game.tr('ui.squad.label', {}, 'Squad');
                    const label = game.tr('ui.field.move_preview', {}, 'ETA preview active (tap label to cancel)');
                    window.KOVFieldUiModule.setMovePreview(game, `${squadLabel} ${squadNo} | ${label}`);
                };

                mapLayer.appendChild(cell);
            }
        }
        viewport.appendChild(mapLayer);

        const bottomBar = document.createElement('div');
        bottomBar.id = 'field-bottom-bar';
        bottomBar.className = 'field-bottom-bar';
        const chatLabel = game.tr('ui.footer.chat', {}, 'Chat');
        const mergeLabel = game.tr('ui.footer.merge', {}, 'Merge');
        bottomBar.innerHTML = `
            <button class="action-btn field-footer-btn chat-btn" onclick="window.KOVSocialProfileModule.toggleChat(window.game)">
                <span class="btn-icon">&#128172;</span>
                <span class="btn-label">${chatLabel}</span>
            </button>
            <div class="field-bottom-center">
                <div id="field-bottom-details" class="field-bottom-details"></div>
            </div>
            <button class="action-btn field-footer-btn build-btn" onclick="window.game.fieldController.toggleField()">
                <span class="btn-icon">&#127968;</span>
                <span class="btn-label">${mergeLabel}</span>
            </button>
        `;
        viewport.appendChild(bottomBar);
        window.KOVFieldUiModule.setMovePreview(game, game.movePreviewText);
        window.KOVFieldUiModule.renderEffectLog(game);
        if (game.currentFieldTargetKey) {
            const [tr, tc] = game.currentFieldTargetKey.split(',').map(Number);
            if (!Number.isNaN(tr) && !Number.isNaN(tc) && FIELD_MAP_DATA?.[tr]?.[tc] !== undefined) {
                window.KOVFieldUiModule.setFieldInfo(game, FIELD_MAP_DATA[tr][tc], tr, tc, game.fieldInfoDeps);
            } else {
                window.KOVFieldUiModule.setFieldInfo(game, null, undefined, undefined, game.fieldInfoDeps);
            }
        } else {
            window.KOVFieldUiModule.setFieldInfo(game, null, undefined, undefined, game.fieldInfoDeps);
        }
        if (game.previewPath) window.KOVFieldUiModule.applyPathPreview(game, game.previewPath);
        if (game.movableRangeTiles && window.KOVFieldUiModule.showMovableRange) window.KOVFieldUiModule.showMovableRange(game, game.movableRangeTiles);
        window.KOVFieldCameraModule.initFieldCamera(game, viewport, mapLayer, { PLAYER_START: deps.PLAYER_START });
    }

    global.KOVFieldRenderModule = {
        renderFieldMap
    };
})(window);
