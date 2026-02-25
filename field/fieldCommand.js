(function (global) {
    'use strict';

    function getSquadByArmyId(game, armyId) {
        if (armyId === 0) return game.squad1;
        if (armyId === 1) return game.squad2;
        return game.squad3;
    }

    function getAvailableArmies(game) {
        const available = [game.armies[0]];
        if (game.lordLevel >= 5) available.push(game.armies[1]);
        if (game.thirdSquadUnlocked) available.push(game.armies[2]);
        return available;
    }

    function isSquadDeployable(squad) {
        if (!Array.isArray(squad)) return false;
        return squad.some((unit) => unit && Number(unit.type) >= 10);
    }

    function getPreferredFieldArmyId(game) {
        const available = getAvailableArmies(game);
        if (!available.length) return null;
        const order = [0, 1, 2];
        for (const armyId of order) {
            const army = available.find((a) => a.id === armyId);
            if (!army) continue;
            const squad = getSquadByArmyId(game, army.id);
            if (isSquadDeployable(squad)) return army.id;
        }
        return null;
    }

    function resolveMoveCosts(game, tileType, deps) {
        const ruleSet = window.KOVWorldSeasonModule.getGameWorldRuleSet(game);
        const gp = deps.GAMEPLAY || deps;
        const cpCostPerCommand = Number(gp.CP_COST_PER_COMMAND);
        return window.KOVWorldSeasonModule.getMoveCostsByRule(tileType, ruleSet, cpCostPerCommand, {
            isGateTile: deps.isGateTile
        });
    }

    function resolveArmyRegionId(game, army, deps) {
        return window.KOVFieldStateModule.getArmyRegionId(game, army, {
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            isBorderTerrain: deps.isBorderTerrain
        });
    }

    function isTileBlocked(game, current, r, c, type, isOcc, isTarget, regionId, deps) {
        return window.KOVFieldStateModule.isTileBlocked(game, current, r, c, type, isOcc, isTarget, regionId, {
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            isWallTile: deps.isWallTile,
            isBorderTerrain: deps.isBorderTerrain
        });
    }

    function getArmyMoveInfo(game, armyOrId, targetR, targetC, deps) {
        const army = typeof armyOrId === 'number' ? game.armies?.[armyOrId] : armyOrId;
        if (!army) return { canMove: false, reason: 'NO_ARMY' };
        if (!Number.isFinite(targetR) || !Number.isFinite(targetC)) return { canMove: false, reason: 'INVALID_TARGET' };
        if (!deps.FIELD_MAP_DATA?.[targetR] || deps.FIELD_MAP_DATA[targetR][targetC] === undefined) return { canMove: false, reason: 'OUT_OF_MAP' };
        if (army.state !== 'IDLE') return { canMove: false, reason: 'ARMY_MOVING' };

        const tileType = deps.FIELD_MAP_DATA[targetR][targetC];
        const regionId = resolveArmyRegionId(game, army, deps);
        const squadData = getSquadByArmyId(game, army.id) || army.units || [];
        const stats = getSquadStats(game, squadData, { getData: game.mergeActionDeps?.getData || (() => ({})) });
        if (stats.power < 10) return { canMove: false, reason: 'NOT_ENOUGH_TROOPS', stats };

        const path = deps.AStar.findPath(
            { r: army.r, c: army.c },
            { r: targetR, c: targetC },
            deps.FIELD_MAP_DATA,
            game.occupiedTiles,
            (cur, nr, nc, type, isOcc, isTarget) => isTileBlocked(game, cur, nr, nc, type, isOcc, isTarget, regionId, deps)
        );
        if (!path) return { canMove: false, reason: 'NO_PATH', stats };

        const dist = Math.max(0, path.length - 1);
        if (dist > stats.range) return { canMove: false, reason: 'OUT_OF_RANGE', dist, stats };

        const moveCosts = resolveMoveCosts(game, tileType, deps);
        const summary = window.KOVFieldNavigationModule.getPathSummary(game, path, stats.speedFactor, {
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA: deps.FIELD_TERRAIN_DATA,
            isGateTile: deps.isGateTile,
            isCitadelTile: deps.isCitadelTile,
            isDragonTile: deps.isDragonTile,
            isTerrainCode: deps.isTerrainCode,
            getTerrainBase: deps.getTerrainBase,
            isWallTile: deps.isWallTile,
            getFieldObjectKind: deps.getFieldObjectKind
        });

        return {
            canMove: game.gold >= moveCosts.goldCost && game.cp >= moveCosts.cpCost,
            reason: null,
            tileType,
            path,
            dist,
            cpCost: moveCosts.cpCost,
            energyCost: 0,
            goldCost: moveCosts.goldCost,
            timeMin: summary.finalMin,
            stats
        };
    }

    async function commandArmy(game, armyId, targetR, targetC, tileType, deps) {
        if (!game.runtime || typeof game.runtime.moveArmy !== 'function') {
            console.error('Game runtime not initialized or missing moveArmy');
            return;
        }

        const result = await game.runtime.moveArmy(game, armyId, targetR, targetC, tileType, deps);
        
        if (!result.success) {
            if (result.reason === 'ARMY_MOVING') window.KOVUiShellModule.showToast(game, game.tr('toast.army_moving', {}, 'Army is already moving'));
            else if (result.reason === 'NOT_ENOUGH_TROOPS') window.KOVUiShellModule.showToast(game, game.tr('toast.army_power_short', {}, 'Not enough troops'));
            else if (result.reason === 'NO_PATH') window.KOVUiShellModule.showToast(game, game.tr('toast.no_path', {}, 'No valid route'));
            else if (result.reason === 'OUT_OF_RANGE') window.KOVUiShellModule.showToast(game, game.tr('toast.range_over', { dist: result.dist, range: result.range }, `Out of range (${result.dist}/${result.range})`));
            else if (result.reason === 'NOT_ENOUGH_CP') window.KOVUiShellModule.showToast(game, game.tr('toast.cp_short_cost', { cost: result.needed }, `Not enough AP (${result.needed})`));
            else if (result.reason === 'NOT_ENOUGH_GOLD') window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short_cost', { cost: result.needed }, `Not enough gold (${result.needed})`));
            else if (result.reason === 'NO_ARMY') console.warn('Command failed: No army found');
            else {
                window.KOVUiShellModule.showToast(game, game.tr('toast.cannot_move', {}, 'Cannot move to this tile'));
                console.warn('Command failed:', result.reason);
            }
        }
    }

    function getSquadStats(game, squadData, deps) {
        let count = 0;
        let sumMov = 0;
        let minMov = 99;
        squadData.forEach((u) => {
            if (!u) return;
            count++;
            const stats = deps.getData(u.type, u.level);
            if (stats.mov) {
                minMov = Math.min(minMov, stats.mov);
                sumMov += stats.mov;
            }
        });
        if (count === 0) return { power: 0, range: 0, speedFactor: 1 };
        
        const avgMov = Math.floor(sumMov / count);
        const baseRange = 4;
        const range = baseRange + (avgMov * 2);
        const baseSpeedFactor = Math.max(0.5, 1 - (avgMov - 1) * 0.2);
        const spdBuff = game.fieldBuffs?.spd || 0;
        const speedFactor = Math.max(0.3, baseSpeedFactor * (1 - spdBuff));
        return { power: window.KOVMergeBoardModule.getSquadPower(game, squadData, { getData: deps.getData }), range, speedFactor };
    }

    function getMovableRangeTiles(game, army, maxDist, deps) {
        const movable = new Set();
        const startR = army.r;
        const startC = army.c;
        const regionId = resolveArmyRegionId(game, army, deps);

        const queue = [{ r: startR, c: startC, dist: 0 }];
        const visited = new Set();
        visited.add(`${startR},${startC}`);
        movable.add(`${startR},${startC}`);

        // A* in this game uses 8-directional movement if aStarAdapter allows it,
        // but let's stick to 8-directions since A* usually does, or 4-directions?
        // Let's assume 8-directions with no corner cutting if we aren't sure, 
        // wait, let's use deps.AStar.findPath to be safe? 
        // No, calling AStar for every tile in range could be slow, but for range=5..15 it's fast enough.
        // Actually, BFS is exactly what we need. We'll check 8 directions.
        const dirs = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];

        while (queue.length > 0) {
            const cur = queue.shift();
            if (cur.dist >= maxDist) continue;

            for (const d of dirs) {
                const nr = cur.r + d[0];
                const nc = cur.c + d[1];
                if (nr < 0 || nr >= deps.MAP_SIZE || nc < 0 || nc >= deps.MAP_SIZE) continue;
                
                const key = `${nr},${nc}`;
                if (visited.has(key)) continue;

                const type = deps.FIELD_MAP_DATA[nr][nc];
                const isOccupied = game.occupiedTiles.has(key);
                
                // For a destination tile, it might be a target we can attack, so we pass isTarget = true
                const isTarget = window.KOVGameCoreModule ? window.KOVGameCoreModule.isHostileTarget(game, type, nr, nc, game.gameCoreDeps) : false;

                if (!isTileBlocked(game, cur, nr, nc, type, isOccupied, isTarget, regionId, deps)) {
                    visited.add(key);
                    movable.add(key);
                    
                    // Only continue pathfinding from this tile if it's not a hostile target
                    // (You can't path *through* an enemy)
                    if (!isTarget) {
                        queue.push({ r: nr, c: nc, dist: cur.dist + 1 });
                    }
                }
            }
        }
        return movable;
    }

    function getHighestBuildingLevel(game, unitType, deps) {
        let buildingType = -1;
        if (unitType === deps.ITEM_TYPE.UNIT_INFANTRY) buildingType = deps.ITEM_TYPE.BUILDING_BARRACKS;
        else if (unitType === deps.ITEM_TYPE.UNIT_ARCHER) buildingType = deps.ITEM_TYPE.BUILDING_RANGE;
        else if (unitType === deps.ITEM_TYPE.UNIT_CAVALRY) buildingType = deps.ITEM_TYPE.BUILDING_STABLE;
        if (buildingType === -1) return 10;
        let maxLvl = 0;
        for (let r = 0; r < deps.CONFIG.gridRows; r++) {
            for (let c = 0; c < deps.CONFIG.gridCols; c++) {
                const item = game.grid[r][c];
                if (item && item.type === buildingType) maxLvl = Math.max(maxLvl, item.level);
            }
        }
        return maxLvl || 1;
    }

    function enterMoveTargetMode(game, armyId, opts = {}, deps) {
        const army = game.armies[armyId];
        if (!army) return;
        if (!getAvailableArmies(game).some((a) => a.id === armyId)) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.require_citadel', {}, 'Capture a citadel to use this squad'));
            return;
        }
        if (army.state !== 'IDLE') {
            window.KOVUiShellModule.showToast(game, game.tr('toast.army_moving', {}, 'Army is already moving'));
            return;
        }
        if (!Number.isFinite(army.r) || !Number.isFinite(army.c)) {
            army.r = deps.PLAYER_START.r;
            army.c = deps.PLAYER_START.c;
        }
        const squadData = getSquadByArmyId(game, army.id);
        const stats = getSquadStats(game, squadData, { getData: game.mergeActionDeps?.getData || (() => ({})) });
        if (stats.power < 10) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.army_power_short', {}, 'Not enough troops'));
            return;
        }
        const { center = false } = opts;
        exitMoveTargetMode(game);
        game.selectedArmyId = army.id;
        game.lastSelectedArmyId = army.id;
        game.moveTargetMode = { armyId: army.id, stats };
        const squadNo = army.id + 1;
        const squadLabel = game.tr('ui.squad.label', {}, 'Squad');
        const label = game.tr('ui.field.move_preview', {}, 'ETA preview active (tap label to cancel)');
        window.KOVFieldUiModule.setMovePreview(game, `${squadLabel} ${squadNo} | ${label}`);
        if (center) window.KOVFieldCameraModule.centerCameraOnArmy(game, army.id);
        
        // Calculate and render movable range
        const movableSet = getMovableRangeTiles(game, army, stats.range, deps);
        game.moveTargetMode.movableRange = movableSet;
        if (window.KOVFieldUiModule.showMovableRange) {
            window.KOVFieldUiModule.showMovableRange(game, movableSet);
        }

        updateSelectedArmyUI(game);
    }

    function exitMoveTargetMode(game) {
        if (!game.moveTargetMode) return;
        game.moveTargetMode = null;
        window.KOVFieldUiModule.clearPathPreview(game);
        if (window.KOVFieldUiModule.hideMovableRange) {
            window.KOVFieldUiModule.hideMovableRange(game);
        }
        window.KOVFieldUiModule.setMovePreview(game, '');
    }

    function previewMoveTarget(game, r, c, deps) {
        if (!game.moveTargetMode) return;
        const gp = deps.GAMEPLAY || deps;
        const { armyId } = game.moveTargetMode;
        const army = game.armies?.[armyId];
        if (!army || army.state !== 'IDLE') return;
        const regionId = resolveArmyRegionId(game, army, deps);
        const path = deps.AStar.findPath(
            { r: army.r, c: army.c },
            { r, c },
            deps.FIELD_MAP_DATA,
            game.occupiedTiles,
            (cur, nr, nc, tileType, isOcc, isTarget) => isTileBlocked(game, cur, nr, nc, tileType, isOcc, isTarget, regionId, deps)
        );
        if (!path) {
            window.KOVFieldUiModule.clearPathPreview(game);
            const squadNo = army.id + 1;
            const squadLabel = game.tr('ui.squad.label', {}, 'Squad');
            const label = game.tr('ui.field.move_preview', {}, 'ETA preview active (tap label to cancel)');
            window.KOVFieldUiModule.setMovePreview(game, `${squadLabel} ${squadNo} | ${label}`);
            return;
        }
        const dist = Math.max(0, path.length - 1);
        if (dist > game.moveTargetMode.stats.range) {
            window.KOVFieldUiModule.clearPathPreview(game);
            const squadNo = army.id + 1;
            const squadLabel = game.tr('ui.squad.label', {}, 'Squad');
            const label = game.tr('ui.field.move_preview', {}, 'ETA preview active (tap label to cancel)');
            window.KOVFieldUiModule.setMovePreview(game, `${squadLabel} ${squadNo} | ${label}`);
            return;
        }
        window.KOVFieldUiModule.applyPathPreview(game, path);
        const squadNo = army.id + 1;
        const squadLabel = game.tr('ui.squad.label', {}, 'Squad');
        const cpLabel = game.tr('ui.field.header.cp', {}, 'AP');
        const label = game.tr('ui.field.move_preview', {}, 'ETA preview active (tap label to cancel)');
        window.KOVFieldUiModule.setMovePreview(game, `${squadLabel} ${squadNo} | ${cpLabel} ${gp.CP_COST_PER_COMMAND} | ${label}`);
    }

    function updateSelectedArmyUI(game) {
        const content = document.getElementById('modal-content');
        if (!content) return;
        getAvailableArmies(game).forEach((army) => {
            const marker = document.getElementById(`army-marker-${army.id}`);
            if (!marker) return;
            if (game.selectedArmyId === army.id) marker.classList.add('selected');
            else marker.classList.remove('selected');
        });
        document.querySelectorAll('.field-squad-tab').forEach((btn) => {
            const id = Number(btn.dataset.armyId);
            if (id === game.selectedArmyId) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    async function handleMoveTargetClick(game, r, c, type, deps) {
        if (!game.moveTargetMode) return;
        const { armyId } = game.moveTargetMode;
        
        if (!game.runtime || typeof game.runtime.moveArmy !== 'function') {
             console.error('Game runtime not initialized');
             return;
        }

        const result = await game.runtime.moveArmy(game, armyId, r, c, type, deps);

        if (result.success) {
            exitMoveTargetMode(game);
            game.selectedArmyId = armyId;
        } else {
            if (result.reason === 'ARMY_MOVING') window.KOVUiShellModule.showToast(game, game.tr('toast.army_moving', {}, 'Army is already moving'));
            else if (result.reason === 'NOT_ENOUGH_TROOPS') window.KOVUiShellModule.showToast(game, game.tr('toast.army_power_short', {}, 'Not enough troops'));
            else if (result.reason === 'NO_PATH') {
                window.KOVUiShellModule.showToast(game, game.tr('toast.no_path', {}, 'No valid route'));
                game.sound.playError();
            }
            else if (result.reason === 'OUT_OF_RANGE') {
                window.KOVUiShellModule.showToast(game, game.tr('toast.range_over', { dist: result.dist, range: result.range }, `Out of range (${result.dist}/${result.range})`));
                game.sound.playError();
            }
            else if (result.reason === 'NOT_ENOUGH_CP') window.KOVUiShellModule.showToast(game, game.tr('toast.cp_short_cost', { cost: result.needed }, `Not enough AP (${result.needed})`));
            else if (result.reason === 'NOT_ENOUGH_GOLD') window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short_cost', { cost: result.needed }, `Not enough gold (${result.needed})`));
            else console.warn('Move target click failed:', result.reason);
        }
    }

    function attackTarget(game, armyId, r, c, type, deps) {
        const army = game.armies[armyId];
        if (!army) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.select_army_first', {}, 'Select a squad first'));
            return;
        }
        const dr = Math.abs(army.r - r);
        const dc = Math.abs(army.c - c);
        
        if (dr <= 1 && dc <= 1) {
            // Use battlePrepDeps from game instance if not provided in deps, or assume deps contains it
            const battleDeps = deps.battlePrepDeps || game.battlePrepDeps;
            const opts = deps.battlePrepOpts || {};
            window.KOVBattleFlowModule.openBattlePrepModal(game, type, r, c, battleDeps, opts);
        } else {
            window.KOVUiShellModule.showToast(game, game.tr('toast.target_need_adjacent', {}, 'Target is out of range (need adjacent)'));
        }
    }

    function startMarch(game, armyId, r, c, type, goldCost, cpCost, path, speedFactor, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (window.KOVWorldSeasonModule.guardWorldAction(
            game,
            game.tr('ui.field.action.move', {}, 'Move'),
            window.KOVWorldSeasonModule.ensureWorldState(game),
            window.KOVWorldSeasonModule.getActiveWorldEndConditions(game, game.worldAdminDeps)
        )) return;
        if (game.gold < goldCost) { window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short_cost', { cost: goldCost }, `Not enough gold (${goldCost})`)); return; }
        if (game.cp < cpCost) { window.KOVUiShellModule.showToast(game, game.tr('toast.cp_short_cost', { cost: cpCost }, `Not enough AP (${cpCost})`)); return; }
        game.gold -= goldCost;
        game.cp -= cpCost;
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        window.KOVFieldUiModule.clearPathPreview(game);
        window.KOVFieldUiModule.setMovePreview(game, '');
        const army = game.armies[armyId];
        const moveMsPerMin = Number.isFinite(gp.MOVE_MS_PER_MIN) ? gp.MOVE_MS_PER_MIN : 120;
        army.state = 'MOVING_TO';
        if (window.KOVGameCoreModule.isHostileTarget(game, type, r, c, game.gameCoreDeps) && path.length > 1) path.pop();
        army.path = path;
        army.stepTimes = window.KOVFieldNavigationModule.buildStepTimes(path, speedFactor, {
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA: deps.FIELD_TERRAIN_DATA,
            MOVE_MS_PER_MIN: moveMsPerMin,
            isGateTile: deps.isGateTile,
            isCitadelTile: deps.isCitadelTile,
            isDragonTile: deps.isDragonTile,
            isTerrainCode: deps.isTerrainCode,
            getTerrainBase: deps.getTerrainBase
        });
        army.nextStepIndex = 1;
        army.moveInterval = Math.max(30, Math.floor(3 * moveMsPerMin));
        army.lastMoveTime = Date.now();
        army.target = { r, c, type };
        window.KOVUiShellModule.showToast(game, game.tr('toast.army_march_start', { army: army.name }, `${army.name} march started`));
        game.sound.playSpawn();
    }

    function updateArmies(game, deps) {
        const now = Date.now();
        const TILE_SIZE = 13;
        const resetArmyMovementState = (army) => {
            army.state = 'IDLE';
            army.path = [];
            army.stepTimes = [];
            army.nextStepIndex = 0;
            army.target = null;
        };
        const tryResumeMoveTargetMode = (preferredArmyId) => {
            if (game.moveTargetMode) return;
            const modal = document.getElementById('field-modal');
            if (!modal || !modal.classList.contains('open') || modal.dataset.mode !== 'field') return;
            if (document.getElementById('field-action-menu')) return;
            const candidateId = Number.isFinite(game.selectedArmyId) ? game.selectedArmyId : preferredArmyId;
            if (!Number.isFinite(candidateId)) return;
            const army = game.armies?.[candidateId];
            if (!army || army.state !== 'IDLE') return;
            const modeDeps = game.fieldMapRenderDeps || deps;
            window.KOVFieldCommandModule.enterMoveTargetMode(game, candidateId, { center: false }, modeDeps);
        };
        game.armies.forEach((army) => {
            const el = document.getElementById(`army-marker-${army.id}`);
            if (el) {
                const x = 50 + (army.c * TILE_SIZE);
                const y = 50 + (army.r * TILE_SIZE);
                el.style.transform = `translate(${x}px, ${y}px)`;
            }
            if (army.state === 'IDLE') return;
            if (army.state === 'MOVING_TO') {
                const hasPath = Array.isArray(army.path) && army.path.length > 0;
                const hasTarget = !!army.target && Number.isFinite(army.target.r) && Number.isFinite(army.target.c);
                if (!hasPath || !hasTarget) {
                    army.state = 'IDLE';
                    army.path = [];
                    army.stepTimes = [];
                    army.nextStepIndex = 0;
                    army.target = null;
                    return;
                }
                const stepTime = (army.stepTimes && army.stepTimes[army.nextStepIndex]) ? army.stepTimes[army.nextStepIndex] : army.moveInterval;
                if (now - army.lastMoveTime >= stepTime) {
                    army.lastMoveTime = now;
                    if (army.nextStepIndex < army.path.length) {
                        const nextPos = army.path[army.nextStepIndex];
                        army.r = nextPos.r;
                        army.c = nextPos.c;
                        army.nextStepIndex++;
                        const squadData = window.KOVFieldCommandModule.getSquadByArmyId(game, army.id);
                        const stats = window.KOVFieldCommandModule.getSquadStats(game, squadData, { getData: game.mergeActionDeps?.getData || (() => ({})) });
                        const fogRadius = stats.range || deps.FOG_RADIUS;
                        window.KOVFieldEventLogicModule.revealFog(game, army.r, army.c, fogRadius, game.revealFogDeps);
                    } else {
                        try {
                            window.KOVFieldFlowModule.handleArrival(game, army, {
                                FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES,
                                FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
                                FIELD_TERRAIN_DATA: deps.FIELD_TERRAIN_DATA,
                                MAP_SIZE: deps.MAP_SIZE,
                                ITEM_TYPE: deps.ITEM_TYPE,
                                isWallTile: deps.isWallTile,
                                isBorderTerrain: deps.isBorderTerrain,
                                isGateTile: deps.isGateTile,
                                isTerrainCode: deps.isTerrainCode,
                                getInfoFromCode: deps.getInfoFromCode
                            });
                        } catch (err) {
                            console.error('[field] handleArrival failed:', err);
                            window.KOVUiShellModule.showToast(game, game.tr('toast.cannot_move', {}, 'Cannot move to this tile'));
                            resetArmyMovementState(army);
                            window.KOVPersistenceModule.saveGame(game);
                        } finally {
                            if (army.state !== 'MOVING_TO') {
                                resetArmyMovementState(army);
                                tryResumeMoveTargetMode(army.id);
                            }
                        }
                    }
                }
            }
        });

        if (Array.isArray(game.otherArmies)) {
            game.otherArmies.forEach(otherArmy => {
                if (otherArmy.state === 'MOVING' && otherArmy.moving) {
                    if (now >= otherArmy.moving.arriveAt) {
                        otherArmy.r = otherArmy.moving.to.r;
                        otherArmy.c = otherArmy.moving.to.c;
                        otherArmy.state = 'IDLE';
                        otherArmy.moving = null;
                    } else {
                        // Simple linear interpolation could go here if we tracked start pos and start time
                        // For now, we update it at the end of the move
                    }
                }
                const el = document.getElementById(`other-army-marker-${otherArmy.userId}-${otherArmy.id}`);
                if (el) {
                    let r = otherArmy.r;
                    let c = otherArmy.c;
                    if (otherArmy.state === 'MOVING' && otherArmy.moving?.to) {
                        r = otherArmy.moving.to.r;
                        c = otherArmy.moving.to.c;
                    }
                    const x = 50 + (c * TILE_SIZE);
                    const y = 50 + (r * TILE_SIZE);
                    el.style.transform = `translate(${x}px, ${y}px)`;
                }
            });
        }
    }

    global.KOVFieldCommandModule = {
        getSquadByArmyId,
        getAvailableArmies,
        isSquadDeployable,
        getPreferredFieldArmyId,
        getArmyMoveInfo,
        commandArmy,
        getSquadStats,
        getHighestBuildingLevel,
        enterMoveTargetMode,
        exitMoveTargetMode,
        previewMoveTarget,
        updateSelectedArmyUI,
        handleMoveTargetClick,
        attackTarget,
        startMarch,
        updateArmies
    };
})(window);


