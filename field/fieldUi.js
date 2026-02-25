(function (global) {
    'use strict';
    const effects = global.KOVFieldUiEffectsModule;
    if (!effects) throw new Error('KOVFieldUiEffectsModule is required');
    const formatStatueBuffEffect = effects.formatStatueBuffEffect;
    const formatFieldAbilityEffect = effects.formatFieldAbilityEffect;
    const getCaptureEffectToast = effects.getCaptureEffectToast;
    const pushEffectLog = effects.pushEffectLog;
    const renderEffectLog = effects.renderEffectLog;

    function setMovePreview(game, text) {
        game.movePreviewText = text || '';
        const el = document.getElementById('field-move-info');
        if (el) {
            if (game.movePreviewText) {
                el.style.display = 'flex';
                el.innerText = game.movePreviewText;
            } else {
                el.style.display = 'none';
            }
        }
        updateFloatingPanelPositionFromSelection(game);
    }

    function clearPathPreview(game) {
        if (!game.previewPath) return;
        game.previewPath.forEach((p) => {
            const cell = document.getElementById(`field-cell-${p.r}-${p.c}`);
            if (cell) cell.classList.remove('field-path');
        });
        game.previewPath = null;
        const overlay = game.pathOverlay || document.getElementById('path-overlay');
        if (overlay) overlay.innerHTML = '';
    }

    function applyPathPreview(game, path) {
        clearPathPreview(game);
        if (!path || path.length === 0) return;
        game.previewPath = path;
        path.forEach((p) => {
            const cell = document.getElementById(`field-cell-${p.r}-${p.c}`);
            if (cell) cell.classList.add('field-path');
        });
        const overlay = game.pathOverlay || document.getElementById('path-overlay');
        if (!overlay) return;
        const points = path.map((p) => `${50 + (p.c * 13) + 6.5},${50 + (p.r * 13) + 6.5} `).join(' ');
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        bg.setAttribute('points', points);
        bg.setAttribute('class', 'path-line-bg');
        overlay.appendChild(bg);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('points', points);
        line.setAttribute('class', 'path-line');
        overlay.appendChild(line);
    }

    function hideMovableRange(game) {
        if (!game.movableRangeTiles) return;
        game.movableRangeTiles.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            const cell = document.getElementById(`field-cell-${r}-${c}`);
            if (cell) cell.classList.remove('field-movable');
        });
        game.movableRangeTiles = null;
    }

    function showMovableRange(game, movableSet) {
        hideMovableRange(game);
        if (!movableSet || movableSet.size === 0) return;
        game.movableRangeTiles = movableSet;
        movableSet.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            const cell = document.getElementById(`field-cell-${r}-${c}`);
            if (cell) cell.classList.add('field-movable');
        });
    }

    function hideFieldActionMenu(game) {
        const menu = document.getElementById('field-action-menu');
        if (menu) menu.remove();
        if (game && game.lockedPathPreviewTarget) {
            game.lockedPathPreviewTarget = null;
            clearPathPreview(game);
        }
    }

    function getCombatDifficulty(game, allyTotalLevel, enemyTotalLevel) {
        if (!allyTotalLevel || !enemyTotalLevel) return null;
        const ratio = enemyTotalLevel / allyTotalLevel;
        if (ratio <= 0.4) return { label: 'Easy', color: '#4ade80' };
        if (ratio <= 0.7) return { label: 'Normal', color: '#fbbf24' };
        if (ratio <= 1.0) return { label: 'Hard', color: '#f87171' };
        return { label: 'Hell', color: '#dc2626' };
    }

    function showFieldActionMenu(game, r, c, type, clientX, clientY, deps) {
        const gp = deps.GAMEPLAY || deps;
        hideFieldActionMenu(game);
        game.lockedPathPreviewTarget = { r, c };
        if (game.moveTargetMode) {
            window.KOVFieldCommandModule.previewMoveTarget(game, r, c, deps);
        }
        
        const viewport = document.getElementById('map-viewport');
        if (!viewport) return;
        const key = `${r},${c}`;
        const isCaptured = game.occupiedTiles.has(key);

        const menu = document.createElement('div');
        menu.id = 'field-action-menu';
        menu.className = 'field-action-menu';

        let hasOtherArmy = false;
        let otherArmyObj = null;
        if (Array.isArray(game.otherArmies)) {
            otherArmyObj = game.otherArmies.find(a => {
                const targetR = a.moving?.to ? a.moving.to.r : a.r;
                const targetC = a.moving?.to ? a.moving.to.c : a.c;
                return targetR === r && targetC === c;
            });
            if (otherArmyObj) hasOtherArmy = true;
        }

        const info = getFieldObjectInfo(game, type, r, c, deps);
        let titleText = `${info.name}${info.level !== '-' ? ` Lv.${info.level}` : ''}`;
        if (hasOtherArmy) {
            titleText = game.tr('ui.field.enemy_player', {}, 'Enemy Player');
        }
        
        let headerHtml = `<div class="action-menu-header">
            <div class="action-menu-title">${titleText}</div>`;
        
        let moveInfo = null;
        let allyTotalLevel = 0;
        
        if (game.selectedArmyId !== null && game.armies && game.armies[game.selectedArmyId]) {
            moveInfo = window.KOVFieldCommandModule.getArmyMoveInfo(game, game.selectedArmyId, r, c, deps);
            if (moveInfo && moveInfo.stats) {
                // power is essentially the sum of stats, we can use it as a proxy for total level, 
                // but let's get actual levels from squad
                const squadData = window.KOVFieldCommandModule.getSquadByArmyId(game, game.selectedArmyId) || [];
                allyTotalLevel = squadData.reduce((sum, u) => sum + (u ? (u.level || 1) : 0), 0);
            }
        }

        const canAttackTarget = window.KOVGameCoreModule.isHostileTarget(game, type, r, c, game.gameCoreDeps) || hasOtherArmy;
        let difficultyBadge = '';
        if (canAttackTarget && allyTotalLevel > 0) {
            const defenders = info.defenders || [];
            const enemyTotalLevel = defenders.reduce((sum, d) => {
                let lvl = typeof info.level === 'number' ? info.level : parseInt(info.level, 10) || 1;
                if (d.code >= 1000) {
                    lvl = d.code % 100;
                }
                return sum + (d.count * lvl);
            }, 0);
            const diff = getCombatDifficulty(game, allyTotalLevel, enemyTotalLevel);
            if (diff) {
                difficultyBadge = `<span class="action-menu-difficulty" style="background-color: ${diff.color}22; color: ${diff.color}; border: 1px solid ${diff.color};">${diff.label}</span>`;
            }
        }
        
        if (difficultyBadge) {
            headerHtml += difficultyBadge;
        }
        headerHtml += `</div>`;
        
        menu.innerHTML = headerHtml;

        function createActionButton(text, onClick, options = {}) {
            const btn = document.createElement('button');
            btn.className = 'field-action-btn';
            btn.type = 'button';
            
            let innerHtml = `<span>${text}</span>`;
            if (options.cost !== undefined) {
                innerHtml += `<span class="action-btn-cost">-${options.cost}AP</span>`;
            }
            btn.innerHTML = innerHtml;
            
            const isDisabled = !!options.disabled;
            if (isDisabled) {
                btn.classList.add('disabled');
                btn.disabled = true;
            }
            btn.onclick = (e) => {
                e.stopPropagation();
                if (isDisabled) return;
                onClick(e);
            };
            return btn;
        }

        let extraActionCount = 0;
        
        const isMoveTargetActive = !!game.moveTargetMode;
        
        if (canAttackTarget) {
            const attackCost = gp.CP_COST_PER_COMMAND || 1; // Assuming same cost as move, or adjust if distinct
            const btn = createActionButton(game.tr('ui.field.action.attack', {}, 'Attack'), () => {
                hideFieldActionMenu(game);
                const opts = hasOtherArmy ? { pvpTarget: otherArmyObj } : {};
                window.KOVFieldCommandModule.attackTarget(game, game.selectedArmyId, r, c, type, { ...deps, battlePrepOpts: opts });
            }, { cost: attackCost });
            menu.appendChild(btn);
            extraActionCount++;
        }

        const actualCpCost = moveInfo ? moveInfo.cpCost : (gp.CP_COST_PER_COMMAND || 1);
        const moveBtn = createActionButton(game.tr('ui.field.action.move', {}, 'Move'), () => {
            hideFieldActionMenu(game);
            if (game.selectedArmyId !== null) {
                window.KOVFieldCommandModule.exitMoveTargetMode(game);
                window.KOVFieldCommandModule.commandArmy(game, game.selectedArmyId, r, c, type, {
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
                });
            } else {
                window.KOVUiShellModule.showToast(game, game.tr('toast.select_army_first', {}, 'Select a squad first'));
            }
        }, { cost: actualCpCost });
        
        menu.appendChild(moveBtn);

        if (deps.isGoldMineTile(type)) {
            const btn = createActionButton(
                game.tr('ui.field.action.collect_gold', {}, 'Collect Gold'),
                () => { hideFieldActionMenu(game); window.KOVFieldStateModule.collectFieldResource(game, type, r, c, game.fieldInfoDeps); },
                { disabled: !isCaptured }
            );
            menu.appendChild(btn);
            extraActionCount++;
        }
        if (deps.isFountainTile(type)) {
            const btn = createActionButton(
                game.tr('ui.field.action.collect_energy', {}, 'Collect Energy'),
                () => { hideFieldActionMenu(game); window.KOVFieldStateModule.collectFieldResource(game, type, r, c, game.fieldInfoDeps); },
                { disabled: !isCaptured }
            );
            menu.appendChild(btn);
            extraActionCount++;
        }
        if (deps.isShopTile(type)) {
            const btn = createActionButton(
                game.tr('ui.field.action.open_shop', {}, 'Open Shop'),
                () => { hideFieldActionMenu(game); window.KOVShopModule.openShopOrTavern(game, type, r, c, game.shopDeps); },
                { disabled: !isCaptured }
            );
            menu.appendChild(btn);
            extraActionCount++;
        }
        if (deps.isTavernTile(type)) {
            const btn = createActionButton(
                game.tr('ui.field.action.open_tavern', {}, 'Open Tavern'),
                () => { hideFieldActionMenu(game); window.KOVShopModule.openShopOrTavern(game, type, r, c, game.shopDeps); },
                { disabled: !isCaptured }
            );
            menu.appendChild(btn);
            extraActionCount++;
        }
        if (deps.isReturnGateTile(type)) {
            const btn = createActionButton(
                game.tr('ui.field.action.enter_gate', {}, 'Enter'),
                () => { 
                    hideFieldActionMenu(game); 
                    window.KOVFieldInteractionModule.interactWithObject(game, type, r, c, 'enter', game.fieldInfoDeps); 
                },
                { disabled: !isCaptured }
            );
            menu.appendChild(btn);
            extraActionCount++;
        }

        if (type === deps.FIELD_EVENT_TYPES.CARAVAN) {
            const btn = createActionButton(
                game.tr('ui.field.action.caravan', {}, 'Caravan'),
                () => { hideFieldActionMenu(game); window.KOVFieldEventLogicModule.openCaravanShop(game, r, c, { FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES }); }
            );
            menu.appendChild(btn);
            extraActionCount++;
        }
        if (type === deps.FIELD_EVENT_TYPES.PORTAL) {
            const btn = createActionButton(
                game.tr('ui.field.action.portal', {}, 'Portal'),
                () => { hideFieldActionMenu(game); window.KOVFieldEventUiModule.openPortalModal(game, r, c, null, game.portalDeps); }
            );
            menu.appendChild(btn);
            extraActionCount++;
        }

        const cancelBtn = createActionButton(game.tr('ui.field.action.cancel', {}, 'Cancel'), () => {
            hideFieldActionMenu(game);
        });
        cancelBtn.classList.add('action-btn-cancel');
        menu.appendChild(cancelBtn);

        viewport.appendChild(menu);

        const rect = viewport.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const menuW = 140; // Increased width for header
        const menuH = menu.offsetHeight || 120; // Dynamic height or rough estimate
        const clampPos = (pos) => ({
            x: Math.min(rect.width - menuW - 8, Math.max(8, pos.x)),
            y: Math.min(rect.height - menuH - 8, Math.max(8, pos.y))
        });

        const candidates = [
            { x: x + 8, y: y - 8 },
            { x: x - menuW - 8, y: y - 8 },
            { x: x - menuW / 2, y: y + 20 },
            { x: x - menuW / 2, y: y - menuH - 20 }
        ];

        let finalPos = clampPos(candidates[0]);
        // ... Wait, the DOM hasn't fully layed out but we can check offsets
        
        menu.style.left = `${finalPos.x}px`;
        menu.style.top = `${finalPos.y}px`;
        
        // Setup outside click to close
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target)) {
                    hideFieldActionMenu(game);
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    }

    function setFieldInfo(game, type, r, c, deps) {
        const gp = deps.GAMEPLAY || deps;
        const panel = document.getElementById('field-info-panel');
        if (!panel) return;
        if (type === null || type === undefined) {
            const noTargetTitle = game.tr('ui.field.no_target', {}, 'No target');
            const noTargetHelp = game.tr('ui.field.no_target_help', {}, 'Select a tile on the field map.');
            panel.classList.remove('open');
            panel.innerHTML = `<div class="field-info-title">${noTargetTitle}</div><div class="field-info-small">${noTargetHelp}</div>`;
            const wrap = document.getElementById('field-floating-wrap');
            if (wrap) wrap.style.display = 'none';
            const prev = document.querySelector('.field-selected');
            if (prev) prev.classList.remove('field-selected');
            game.currentFieldTargetKey = null;
            game.currentFieldTargetType = null;
            updateFieldBottomBar(game, null);
            return;
        }

        panel.classList.remove('open');
        panel.innerHTML = '';
        const targetKey = `${r},${c}`;
        const isNewTarget = game.currentFieldTargetKey !== targetKey || game.currentFieldTargetType !== type;
        game.currentFieldTargetKey = targetKey;
        game.currentFieldTargetType = type;
        if (isNewTarget) {
            const prev = document.querySelector('.field-selected');
            if (prev) prev.classList.remove('field-selected');
            const cell = document.getElementById(`field-cell-${r}-${c}`);
            if (cell) cell.classList.add('field-selected');
        }

        const info = getFieldObjectInfo(game, type, r, c, deps);
        const title = `${info.name}${info.level !== '-' ? ` Lv.${info.level}` : ''}`;
        const iconEmoji = window.KOVFieldEconomyModule.isKingCastleTile(game, r, c) ? 'KG' : getFieldIconEmoji(type, deps);
        const labelCoord = game.tr('ui.field.coord', {}, 'Coord');
        const labelOwner = game.tr('ui.field.owner', {}, 'Owner');
        const labelDefenders = game.tr('ui.field.defenders', {}, 'Defenders');
        const labelUnits = game.tr('ui.field.units', {}, 'Units');
        const labelTotalLevel = game.tr('ui.field.total_level', {}, 'Total level');
        const labelEffects = game.tr('ui.field.effects', {}, 'Effects');

        const effectSummaryParts = [];
        const objData = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        if (objData && objData.abilities && objData.abilities.length > 0) {
            objData.abilities.forEach((ab) => {
                const effectText = formatFieldAbilityEffect(game, ab.code, ab.value, { per3s: true, contextType: type }, deps);
                if (effectText) effectSummaryParts.push(effectText);
            });
        }
        if ((deps.isShopTile(type) || deps.isTavernTile(type)) && !effectSummaryParts.length) {
            const hourlyIncome = window.KOVWorldSeasonModule.getFacilityHourlyGoldIncome(game, type, {
                GAMEPLAY: gp,
                ABILITY_CODES: deps.ABILITY_CODES,
                isShopTile: deps.isShopTile,
                isTavernTile: deps.isTavernTile,
                SHOP_HOURLY_GOLD_FALLBACK: gp.SHOP_HOURLY_GOLD_FALLBACK,
                TAVERN_HOURLY_GOLD_FALLBACK: gp.TAVERN_HOURLY_GOLD_FALLBACK
            });
            if (hourlyIncome > 0) {
                effectSummaryParts.push(game.tr('ui.field.effect.income_hourly', { value: hourlyIncome }, `Income +${hourlyIncome}G/h`));
            }
        }
        if (type === deps.FIELD_EVENT_TYPES.DUNGEON) {
            effectSummaryParts.push(game.tr(
                'ui.field.effect.dungeon_entry',
                { gold: gp.DUNGEON_ENTRY_GOLD_COST, energy: gp.DUNGEON_ENTRY_ENERGY_COST, cp: gp.DUNGEON_ENTRY_CP_COST },
                `Entry -${gp.DUNGEON_ENTRY_GOLD_COST}G -${gp.DUNGEON_ENTRY_ENERGY_COST}EN -${gp.DUNGEON_ENTRY_CP_COST}AP`
            ));
            const remainingMs = window.KOVFieldEventLogicModule.getDungeonCooldownRemainingMs(game, r, c, deps);
            if (remainingMs > 0) {
                const timeText = window.KOVUiFormatModule.formatDurationCompact(remainingMs);
                effectSummaryParts.push(game.tr('ui.field.effect.dungeon_cooldown', { time: timeText }, `Cooldown ${timeText}`));
            }
        }
        if (window.KOVFieldEconomyModule.isKingCastleTile(game, r, c)) {
            effectSummaryParts.push(game.tr('ui.field.effect.king_castle_established', {}, 'King Castle established'));
        }
        if (!effectSummaryParts.length) {
            if (deps.isGateTile(type)) effectSummaryParts.push(game.tr('ui.field.effect.gate_access_unlocked', {}, 'Gate access unlocked'));
            if (deps.isCitadelTile(type)) effectSummaryParts.push(game.tr('ui.field.effect.squad_slot', { value: 1 }, 'Squad slot +1'));
        }
        if (deps.isStatueTile(type)) {
            const buff = window.KOVFieldStateModule.getStatueBuff(game, type, game.statueBuffDeps);
            if (buff) effectSummaryParts.push(formatStatueBuffEffect(game, buff.kind, buff.value));
        }

        const bar = document.getElementById('field-bottom-bar');
        if (bar) {
            const details = bar.querySelector('#field-bottom-details');
            if (details) {
                const defenders = info.defenders || [];
                const defenderCount = defenders.reduce((sum, d) => sum + (d.count || 0), 0);
                const totalLevel = (typeof info.level === 'number' ? info.level : parseInt(info.level, 10) || 0) * defenderCount;
                const coordText = formatFieldCoord(r, c);
                const effectSummary = formatEffectSummary(effectSummaryParts);
                const rightRows = [];
                if (defenderCount > 0) {
                    rightRows.push(`<div class="field-bottom-subtitle">${labelDefenders}</div>`);
                    rightRows.push(`<div class="field-info-row"><span>${labelUnits}</span><span>${defenderCount}</span></div>`);
                    rightRows.push(`<div class="field-info-row"><span>${labelTotalLevel}</span><span>${totalLevel}</span></div>`);
                }
                if (effectSummary) {
                    rightRows.push(`<div class="field-info-row field-bottom-effect-row"><span>${labelEffects}</span><span>${effectSummary}</span></div>`);
                }
                const rightBlock = rightRows.length
                    ? `<div class="field-bottom-col field-bottom-col-right">${rightRows.join('')}</div>`
                    : '';
                details.innerHTML = rightBlock
                    ? `
                        <div class="field-bottom-columns">
                            <div class="field-bottom-col field-bottom-col-left">
                                <div class="field-bottom-title">
                                    <div class="field-bottom-icon">${iconEmoji}</div>
                                    <div class="field-bottom-name">${title}</div>
                                </div>
                                <div class="field-info-row"><span>${labelCoord}</span><span>${coordText}</span></div>
                                <div class="field-info-row field-bottom-owner-row"><span>${labelOwner}</span><span>${info.owner}</span></div>
                            </div>
                            ${rightBlock}
                        </div>
                    `
                    : `
                        <div class="field-bottom-single">
                            <div class="field-bottom-title">
                                <div class="field-bottom-icon">${iconEmoji}</div>
                                <div class="field-bottom-name">${title}</div>
                            </div>
                            <div class="field-info-row"><span>${labelCoord}</span><span>${coordText}</span></div>
                            <div class="field-info-row"><span>${labelOwner}</span><span>${info.owner}</span></div>
                        </div>
                    `;
            }
        }
        updateFloatingPanelPosition(game, r, c);
        updateFieldBottomBar(game, type, r, c, info);
    }

    function getFieldIconEmoji(type, deps) {
        if (deps.isWallTile(type)) return 'WL';
        if (deps.isCastleTile(type)) return 'CS';
        if (deps.isGateTile(type)) return 'GT';
        if (deps.isCitadelTile(type)) return 'CT';
        if (deps.isDragonTile(type)) return 'DR';
        if (deps.isGoldMineTile(type)) return 'GM';
        if (deps.isFountainTile(type)) return 'FN';
        if (deps.isShopTile(type)) return 'SH';
        if (deps.isTavernTile(type)) return 'TV';
        if (deps.isRuinsTile(type)) return 'RU';
        if (deps.isTerritoryTile && deps.isTerritoryTile(type)) return 'TR';
        if (deps.isStatueTile(type)) return 'ST';
        if (deps.isTerrainCode(type)) return '--';
        return '--';
    }

    function updateFieldBottomBar(game, type) {
        const bar = document.getElementById('field-bottom-bar');
        if (!bar) return;
        const detailsEl = bar.querySelector('#field-bottom-details');
        if (!detailsEl) return;
        if (type === null || type === undefined) {
            const labelNoTarget = game.tr('ui.field.no_target_selected', {}, 'No target selected');
            const labelCoord = game.tr('ui.field.coord', {}, 'Coord');
            const labelOwner = game.tr('ui.field.owner', {}, 'Owner');
            detailsEl.innerHTML = `
                <div class="field-bottom-single">
                    <div class="field-bottom-title">
                        <div class="field-bottom-icon">--</div>
                        <div class="field-bottom-name">${labelNoTarget}</div>
                    </div>
                    <div class="field-info-row"><span>${labelCoord}</span><span>-</span></div>
                    <div class="field-info-row"><span>${labelOwner}</span><span>-</span></div>
                </div>
            `;
        }
    }

    function formatFieldCoord(r, c) {
        if (!Number.isFinite(r) || !Number.isFinite(c)) return '-';
        return `${r + 1},${c + 1}`;
    }

    function formatEffectSummary(parts) {
        const list = Array.isArray(parts) ? parts.filter(Boolean) : [];
        if (!list.length) return '';
        const visible = list.slice(0, 2);
        if (list.length <= 2) return visible.join(' · ');
        return `${visible.join(' · ')} +${list.length - 2}`;
    }

    function updateFloatingPanelPosition(game, r, c) {
        const wrap = document.getElementById('field-floating-wrap');
        if (!wrap) return;
        if (!game.movePreviewText) {
            wrap.style.display = 'none';
            return;
        }
        if (typeof r !== 'number' || typeof c !== 'number') {
            wrap.style.display = 'none';
            return;
        }
        wrap.style.display = 'flex';
    }

    function updateFloatingPanelPositionFromSelection(game) {
        if (!game.currentFieldTargetKey) {
            updateFloatingPanelPosition(game);
            return;
        }
        const parts = game.currentFieldTargetKey.split(',');
        if (parts.length < 2) return;
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        if (Number.isNaN(r) || Number.isNaN(c)) return;
        updateFloatingPanelPosition(game, r, c);
    }

    function buildFieldBadge(game, type, isOccupied, r, c, deps, hasEvent = false) {
        if (hasEvent) return null;
        let label = '';
        if (window.KOVFieldEconomyModule.isKingCastleTile(game, r, c)) label = 'KG';
        if (!label) return null;

        const badge = document.createElement('div');
        badge.className = 'field-badge';
        badge.classList.add(isOccupied ? 'active' : 'inactive');
        badge.classList.add('strategic');
        if (label === 'KG') {
            badge.classList.remove('inactive');
            badge.classList.add('active');
        }
        badge.innerText = label;
        return badge;
    }

    function getFieldEventMarkerMeta(game, type, deps) {
        if (type === deps.FIELD_EVENT_TYPES.BANDIT) return { key: 'bandit', text: 'BN', title: game.tr('ui.field.event.bandit', {}, 'Bandit') };
        if (type === deps.FIELD_EVENT_TYPES.BANDIT_LEADER) return { key: 'leader', text: 'BL', title: game.tr('ui.field.event.bandit_leader', {}, 'Bandit Leader') };
        if (type === deps.FIELD_EVENT_TYPES.DUNGEON) return { key: 'dungeon', text: 'DG', title: game.tr('ui.field.event.dungeon', {}, 'Dungeon') };
        if (type === deps.FIELD_EVENT_TYPES.PORTAL) return { key: 'portal', text: 'PT', title: game.tr('ui.field.event.portal', {}, 'Portal') };
        if (type === deps.FIELD_EVENT_TYPES.CARAVAN) return { key: 'caravan', text: 'CV', title: game.tr('ui.field.event.caravan', {}, 'Caravan') };
        if (type === deps.FIELD_EVENT_TYPES.CROWN) return { key: 'crown', text: 'CR', title: game.tr('ui.field.event.crown', {}, 'Crown') };
        return { key: 'other', text: 'EV', title: game.tr('ui.field.event.default', {}, 'Event') };
    }

    function getFieldEventSpriteUrl(game, meta) {
        if (!game.eventSpriteCache) game.eventSpriteCache = {};
        const key = meta?.key || 'other';
        if (game.eventSpriteCache[key]) return game.eventSpriteCache[key];
        let svg = '';
        if (key === 'bandit') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#7f1d1d'/><path d='M4 12L12 4M5 4L12 11' stroke='#fee2e2' stroke-width='2' stroke-linecap='round'/></svg>";
        } else if (key === 'leader') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#92400e'/><path d='M8 3l1.3 2.7 3 .4-2.2 2.1.6 3-2.7-1.4-2.7 1.4.6-3-2.2-2.1 3-.4z' fill='#fde68a'/></svg>";
        } else if (key === 'dungeon') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#4c1d95'/><rect x='4' y='5' width='8' height='7' rx='1' fill='#ddd6fe'/><rect x='7' y='8' width='2' height='4' fill='#4c1d95'/></svg>";
        } else if (key === 'portal') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#164e63'/><circle cx='8' cy='8' r='4.5' fill='none' stroke='#67e8f9' stroke-width='2'/><circle cx='8' cy='8' r='1.8' fill='#67e8f9'/></svg>";
        } else if (key === 'caravan') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#78350f'/><rect x='3' y='5' width='8' height='4' rx='1' fill='#fde68a'/><circle cx='5' cy='11' r='1.4' fill='#f8fafc'/><circle cx='10' cy='11' r='1.4' fill='#f8fafc'/></svg>";
        } else if (key === 'crown') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#7c2d12'/><path d='M3 11V6l2.3 2.1L8 4l2.7 4.1L13 6v5z' fill='#facc15'/></svg>";
        } else {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='3' fill='#334155'/><circle cx='8' cy='8' r='2.5' fill='#f8fafc'/></svg>";
        }
        const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        game.eventSpriteCache[key] = uri;
        return uri;
    }

    function appendFieldEventMarker(game, cell, evt, deps) {
        if (!cell || !evt) return;
        const meta = getFieldEventMarkerMeta(game, evt.type, deps);
        const marker = document.createElement('div');
        marker.className = `event-marker event-marker-${meta.key}`;
        marker.dataset.r = String(evt.r);
        marker.dataset.c = String(evt.c);
        marker.dataset.type = String(evt.type);
        marker.title = meta.title;
        const sprite = document.createElement('span');
        sprite.className = 'evt-sprite';
        sprite.style.backgroundImage = `url("${getFieldEventSpriteUrl(game, meta)}")`;
        const label = document.createElement('span');
        label.className = 'evt-label';
        label.innerText = meta.text;
        marker.appendChild(sprite);
        marker.appendChild(label);
        cell.appendChild(marker);
    }

    function getFieldObjectInfo(game, type, r, c, deps) {
        if (deps.isWallTile(type) || deps.isTerrainCode(type)) {
            return { name: window.KOVFieldNavigationModule.objectTypeNameByCode(game, type, game.fieldNavDeps), level: '-', owner: '-', defenders: [] };
        }
        let name = window.KOVFieldNavigationModule.objectTypeNameByCode(game, type, game.fieldNavDeps);
        let level = 1;
        let defenders = [];
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        const overlay = data ? null : deps.getInfoFromCode(type);
        if (data) {
            name = data.name || name;
            level = data.level || level;
            defenders = data.defenders || [];
        } else if (overlay) {
            const base = deps.getData(overlay.type, overlay.level);
            if (base && base.name) {
                name = base.name;
                level = overlay.level ?? level;
            }
        } else {
            name = window.KOVFieldNavigationModule.objectTypeNameByCode(game, type, game.fieldNavDeps);
            if (type === 4) level = '-';
            else if (!deps.isTerrainCode(type)) level = deps.getObjectLevelFromCode(type);
        }

        if (type === deps.FIELD_EVENT_TYPES.BANDIT) { name = game.tr('ui.field.event.bandit', {}, 'Bandit'); level = 1; defenders = [{ code: 10, count: 5 }]; }
        else if (type === deps.FIELD_EVENT_TYPES.BANDIT_LEADER) { name = game.tr('ui.field.event.bandit_leader', {}, 'Bandit Leader'); level = 3; defenders = [{ code: 12, count: 10 }]; }
        else if (type === deps.FIELD_EVENT_TYPES.DUNGEON) { name = game.tr('ui.field.event.dungeon', {}, 'Dungeon'); level = 5; }
        else if (type === deps.FIELD_EVENT_TYPES.PORTAL) { name = game.tr('ui.field.event.portal', {}, 'Portal'); level = '-'; }
        else if (type === deps.FIELD_EVENT_TYPES.CARAVAN) { name = game.tr('ui.field.event.caravan', {}, 'Caravan'); level = '-'; }
        else if (type === deps.FIELD_EVENT_TYPES.CROWN) { name = game.tr('ui.field.event.crown', {}, 'Crown'); level = 7; }

        if (window.KOVFieldEconomyModule.isKingCastleTile(game, r, c)) name = game.tr('ui.field.object.king_castle', {}, 'King Castle');

        defenders = window.KOVBattleCoreModule.getDefendersForTile(game, type, r, c);
        const owner = game.occupiedTiles.has(`${r},${c}`)
            ? game.tr('ui.field.owner_captured', {}, 'Captured')
            : game.tr('ui.field.owner_neutral', {}, 'Neutral');
        return { name, level, owner, defenders };
    }

    function refreshFieldMapVisuals(game, deps) {
        const mapLayer = document.getElementById('map-layer');
        if (!mapLayer) return false;
        const reachable = window.KOVFieldFlowModule.buildReachableTiles(game, {
            MAP_SIZE: deps.MAP_SIZE,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            isBorderTerrain: deps.isBorderTerrain,
            isWallTile: deps.isWallTile
        });
        const appendCloudLayer = (cell, type) => {
            if (deps.isGateTile(type) || deps.isCitadelTile(type) || deps.isWallTile(type)) return;
            const layer = document.createElement('div');
            layer.className = 'field-cloud-layer';
            cell.appendChild(layer);
        };

        for (let r = 0; r < deps.MAP_SIZE; r++) {
            for (let c = 0; c < deps.MAP_SIZE; c++) {
                const cell = document.getElementById(`field-cell-${r}-${c}`);
                if (!cell) continue;
                const type = deps.FIELD_MAP_DATA[r][c];
                const key = `${r},${c}`;
                const isOccupied = game.occupiedTiles.has(key);
                const evt = game.fieldEvents[key];
                const isVisible = game.visibilityMap.has(key) || !!evt || deps.isDragonTile(type);
                const isReachable = reachable.has(key);
                let isAdjacent = false;
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                if (!isOccupied) {
                    for (const d of dirs) {
                        const nr = r + d[0];
                        const nc = c + d[1];
                        if (game.occupiedTiles.has(`${nr},${nc}`)) { isAdjacent = true; break; }
                    }
                }

                cell.className = 'field-cell';
                cell.innerHTML = '';
                cell.style.backgroundImage = '';
                cell.style.backgroundSize = '';
                cell.style.backgroundRepeat = '';
                cell.style.backgroundPosition = '';
                cell.style.opacity = '';

                if (!isVisible) {
                    cell.classList.add('field-fog');
                    appendCloudLayer(cell, type);
                    continue;
                }

                let color = 'rgba(0, 0, 0, 0)';
                if (deps.isWallTile(type)) { color = '#2b2b2b'; cell.classList.add('field-wall'); }
                else if (deps.isCastleTile(type)) { color = '#4285f4'; cell.classList.add('field-castle'); }
                else if (deps.isGateTile(type)) { color = '#ea4335'; cell.classList.add('field-gate'); if (isOccupied) cell.classList.add('unlocked'); else cell.classList.add('locked'); }
                else if (deps.isCitadelTile(type)) { color = '#fbbc05'; cell.classList.add('field-citadel'); }
                else if (deps.isDragonTile(type)) { color = '#b71c1c'; cell.classList.add('field-dragon'); }
                else if (deps.isGoldMineTile(type)) { color = '#6d4c41'; cell.classList.add('field-goldmine'); }
                else if (deps.isFountainTile(type)) { color = '#0ea5e9'; cell.classList.add('field-fountain'); }
                else if (deps.isShopTile(type)) { color = '#2563eb'; cell.classList.add('field-shop'); }
                else if (deps.isTavernTile(type)) { color = '#7c3aed'; cell.classList.add('field-tavern'); }
                else if (deps.isRuinsTile(type)) { color = '#9ca3af'; cell.classList.add('field-ruins'); }
                else if (deps.isTerritoryTile && deps.isTerritoryTile(type)) { color = '#4ade80'; cell.classList.add('field-territory'); }
                else if (deps.isStatueTile(type)) { color = '#94a3b8'; cell.classList.add('field-statue'); }
                else if (deps.isTerrainCode(type)) {
                    const base = deps.getTerrainBase(type);
                    const isBorder = type % 100 === 1;
                    color = (isBorder ? deps.TERRAIN_COLORS_BORDER[base] : deps.TERRAIN_COLORS[base]) || '#2e3b23';
                } else if (type === 4) {
                    color = 'rgba(139, 69, 19, 0.4)';
                } else {
                    const base = deps.FIELD_TERRAIN_DATA?.[r]?.[c];
                    if (deps.isTerrainCode(base)) {
                        const baseType = deps.getTerrainBase(base);
                        const isBorder = base % 100 === 1;
                        color = (isBorder ? deps.TERRAIN_COLORS_BORDER[baseType] : deps.TERRAIN_COLORS[baseType]) || '#2e3b23';
                    } else {
                        color = 'transparent';
                    }
                }

                cell.style.backgroundColor = color;
                if (!deps.isTerrainCode(type)) {
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
                            'field-territory',
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
                    appendCloudLayer(cell, type);
                }
                if (game.currentFieldTargetKey === key) cell.classList.add('field-selected');

                const badge = buildFieldBadge(game, type, isOccupied, r, c, deps, !!evt);
                if (badge) cell.appendChild(badge);
                appendFieldEventMarker(game, cell, evt, deps);
            }
        }
        if (game.previewPath) applyPathPreview(game, game.previewPath);
        if (game.movableRangeTiles && game.movableRangeTiles.size > 0) {
            game.movableRangeTiles.forEach((key) => {
                const [r, c] = key.split(',').map(Number);
                const cell = document.getElementById(`field-cell-${r}-${c}`);
                if (cell) cell.classList.add('field-movable');
            });
        }
        updateFloatingPanelPositionFromSelection(game);
        return true;
    }
    global.KOVFieldUiModule = {
        setMovePreview,
        clearPathPreview,
        applyPathPreview,
        showMovableRange,
        hideMovableRange,
        hideFieldActionMenu,
        showFieldActionMenu,
        formatStatueBuffEffect,
        formatFieldAbilityEffect,
        getCaptureEffectToast,
        pushEffectLog,
        renderEffectLog,
        getFieldObjectInfo,
        getFieldIconEmoji,
        buildFieldBadge,
        getFieldEventMarkerMeta,
        getFieldEventSpriteUrl,
        appendFieldEventMarker,
        updateFieldBottomBar,
        updateFloatingPanelPosition,
        updateFloatingPanelPositionFromSelection,
        setFieldInfo,
        refreshFieldMapVisuals
    };
})(window);



