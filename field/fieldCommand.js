(function (global) {
    'use strict';

    function getSquadByArmyId(game, armyId) {
        if (armyId === 0) return game.squad1;
        if (armyId === 1) return game.squad2;
        return game.squad3;
    }

    function getAvailableArmies(game) {
        return game.thirdSquadUnlocked ? game.armies : game.armies.filter((a) => a.id !== 2);
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

    function commandArmy(game, armyId, targetR, targetC, tileType, deps) {
        if (window.KOVWorldSeasonModule.guardWorldAction(
            game,
            game.tr('ui.field.action.move', {}, 'Move'),
            window.KOVWorldSeasonModule.ensureWorldState(game),
            window.KOVWorldSeasonModule.getActiveWorldEndConditions(game, game.worldAdminDeps)
        )) return;
        const army = game.armies[armyId];
        if (!army || army.state !== 'IDLE') {
            window.KOVUiShellModule.showToast(game, game.tr('toast.army_moving', {}, 'Army is already moving'));
            return;
        }

        const regionId = resolveArmyRegionId(game, army, deps);
        game.lastSelectedArmyId = armyId;
        const moveCosts = resolveMoveCosts(game, tileType, deps);

        const squadData = getSquadByArmyId(game, army.id);
        const stats = getSquadStats(game, squadData, { getData: game.mergeActionDeps?.getData || (() => ({})) });
        if (stats.power < 10) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.army_power_short', {}, 'Not enough troops'));
            return;
        }

        const path = deps.AStar.findPath(
            { r: army.r, c: army.c },
            { r: targetR, c: targetC },
            deps.FIELD_MAP_DATA,
            game.occupiedTiles,
            (cur, nr, nc, type, isOcc, isTarget) => isTileBlocked(game, cur, nr, nc, type, isOcc, isTarget, regionId, deps)
        );

        if (!path) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.no_path', {}, 'No valid route'));
            return;
        }

        const dist = path.length - 1;
        if (dist > stats.range) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.range_over', { dist, range: stats.range }, `Out of range (${dist}/${stats.range})`));
            return;
        }
        if (game.cp < moveCosts.cpCost) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.cp_short_cost', { cost: moveCosts.cpCost }, `Not enough CP (${moveCosts.cpCost})`));
            return;
        }

        startMarch(
            game,
            armyId,
            targetR,
            targetC,
            tileType,
            0,
            moveCosts.goldCost,
            moveCosts.cpCost,
            path,
            stats.speedFactor,
            deps
        );
    }

    function getSquadStats(game, squadData, deps) {
        let count = 0;
        let minMov = 99;
        squadData.forEach((u) => {
            if (!u) return;
            count++;
            const stats = deps.getData(u.type, u.level);
            if (stats.mov) minMov = Math.min(minMov, stats.mov);
        });
        if (count === 0) return { power: 0, range: 0, speedFactor: 1 };
        const baseRange = 4;
        const range = baseRange + (minMov * 2);
        const baseSpeedFactor = Math.max(0.5, 1 - (minMov - 1) * 0.2);
        const spdBuff = game.fieldBuffs?.spd || 0;
        const speedFactor = Math.max(0.3, baseSpeedFactor * (1 - spdBuff));
        return { power: window.KOVMergeBoardModule.getSquadPower(game, squadData, { getData: deps.getData }), range, speedFactor };
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
        updateSelectedArmyUI(game);
    }

    function exitMoveTargetMode(game) {
        if (!game.moveTargetMode) return;
        game.moveTargetMode = null;
        window.KOVFieldUiModule.clearPathPreview(game);
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
        const cpLabel = game.tr('ui.field.header.cp', {}, 'CP');
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

    function handleMoveTargetClick(game, r, c, type, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (!game.moveTargetMode) return;
        const { armyId, stats } = game.moveTargetMode;
        const army = game.armies[armyId];
        if (!army || army.state !== 'IDLE') {
            window.KOVUiShellModule.showToast(game, game.tr('toast.army_moving', {}, 'Army is already moving'));
            return;
        }
        const regionId = resolveArmyRegionId(game, army, deps);
        const path = deps.AStar.findPath(
            { r: army.r, c: army.c },
            { r, c },
            deps.FIELD_MAP_DATA,
            game.occupiedTiles,
            (cur, nr, nc, tileType, isOcc, isTarget) => isTileBlocked(game, cur, nr, nc, tileType, isOcc, isTarget, regionId, deps)
        );
        if (!path) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.no_path', {}, 'No valid route'));
            game.sound.playError();
            return;
        }
        const dist = path.length - 1;
        if (dist > stats.range) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.range_over', { dist, range: stats.range }, `Out of range (${dist}/${stats.range})`));
            game.sound.playError();
            return;
        }
        let goldCost = 0;
        if (deps.isGateTile(type)) { goldCost = 100; }
        const cpCost = gp.CP_COST_PER_COMMAND;
        if (game.gold < goldCost) { window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short_cost', { cost: goldCost }, `Not enough gold (${goldCost})`)); return; }
        if (game.cp < cpCost) { window.KOVUiShellModule.showToast(game, game.tr('toast.cp_short_cost', { cost: cpCost }, `Not enough CP (${cpCost})`)); return; }
        exitMoveTargetMode(game);
        game.selectedArmyId = armyId;
        startMarch(game, armyId, r, c, type, goldCost, cpCost, path, stats.speedFactor, deps);
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
        if (game.cp < cpCost) { window.KOVUiShellModule.showToast(game, game.tr('toast.cp_short_cost', { cost: cpCost }, `Not enough CP (${cpCost})`)); return; }
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
                        window.KOVFieldEventLogicModule.revealFog(game, army.r, army.c, deps.FOG_RADIUS, game.revealFogDeps);
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
        startMarch,
        updateArmies
    };
})(window);


