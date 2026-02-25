(function (global) {
    'use strict';

    const { GameRuntime } = global.KOVGameRuntimeModule;

    class OfflineRuntime extends GameRuntime {
        async moveArmy(game, armyId, targetR, targetC, tileType, deps) {
            // Local logic: validation + execution immediately
            // Logic adapted from fieldCommand.js commandArmy/handleMoveTargetClick
            
            const gp = deps.GAMEPLAY || deps;
            const army = game.armies[armyId];

            if (!army) return { success: false, reason: 'NO_ARMY' };
            if (army.state !== 'IDLE') return { success: false, reason: 'ARMY_MOVING' };

            // 1. Resolve Region & Costs
            const regionId = window.KOVFieldStateModule.getArmyRegionId(game, army, {
                FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
                isBorderTerrain: deps.isBorderTerrain
            });

            const ruleSet = window.KOVWorldSeasonModule.getGameWorldRuleSet(game);
            const cpCostPerCommand = Number(gp.CP_COST_PER_COMMAND);
            const moveCosts = window.KOVWorldSeasonModule.getMoveCostsByRule(tileType, ruleSet, cpCostPerCommand, {
                isGateTile: deps.isGateTile
            });
            
            // Gate extra gold cost logic from fieldCommand
            let goldCost = moveCosts.goldCost;
            if (deps.isGateTile(tileType)) { goldCost = Math.max(goldCost, 100); }
            const cpCost = moveCosts.cpCost;

            // 2. Resource Checks
            if (game.gold < goldCost) return { success: false, reason: 'NOT_ENOUGH_GOLD', needed: goldCost };
            if (game.cp < cpCost) return { success: false, reason: 'NOT_ENOUGH_CP', needed: cpCost };

            // 3. Stats & Range
            const squadData = window.KOVFieldCommandModule.getSquadByArmyId(game, army.id);
            const stats = window.KOVFieldCommandModule.getSquadStats(game, squadData, { getData: game.mergeActionDeps?.getData || (() => ({})) });
            
            if (stats.power < 10) return { success: false, reason: 'NOT_ENOUGH_TROOPS' };

            // 4. Pathfinding
            const path = deps.AStar.findPath(
                { r: army.r, c: army.c },
                { r: targetR, c: targetC },
                deps.FIELD_MAP_DATA,
                game.occupiedTiles,
                (cur, nr, nc, type, isOcc, isTarget) => window.KOVFieldStateModule.isTileBlocked(game, cur, nr, nc, type, isOcc, isTarget, regionId, deps)
            );

            if (!path) return { success: false, reason: 'NO_PATH' };

            const dist = path.length - 1;
            if (dist > stats.range) return { success: false, reason: 'OUT_OF_RANGE', dist, range: stats.range };

            // 5. Execution (Start March)
            // We use the existing module to start the march animation and state update
            window.KOVFieldCommandModule.startMarch(
                game,
                armyId,
                targetR,
                targetC,
                tileType,
                goldCost,
                cpCost,
                path,
                stats.speedFactor,
                deps
            );

            return { success: true };
        }

        async startBattle(game, attackerArmyId, targetR, targetC, tileType, deps) {
            // Offline: delegate to existing BattleFlow
            window.KOVBattleFlowModule.startBattle(game, attackerArmyId, targetR, targetC, tileType, deps);
            return { success: true };
        }

        async resolveBattle(game, battleId, winner, deps) {
            // Offline: delegate to existing BattleFlow/Result
            // This might be tricky as existing logic is event-driven
            return { success: true };
        }

        async startBattle(game, attackerArmyId, targetR, targetC, tileType, deps) {
            // Offline: delegate to existing BattleFlow
            window.KOVBattleFlowModule.startBattle(game, attackerArmyId, targetR, targetC, tileType, deps);
            return { success: true };
        }

        async executeMergeAction(game, payload) {
            // Offline mode: rely on client-side state
            return { success: true, mode: 'offline', payload };
        }

        async getWorldState(game, channelId) {
            // Offline mode: state is local, maybe just return true or local data
            return { success: true, mode: 'offline' };
        }

        async getMergeState() {
            // Offline mode: load from localStorage
            try {
                const saved = localStorage.getItem('kov_merge_state');
                if (saved) {
                    return { success: true, data: JSON.parse(saved) };
                }
            } catch (e) {
                console.error('Failed to load local merge state:', e);
            }
            return { success: false, reason: 'NO_LOCAL_STATE' };
        }

        async executeMergeAction(game, payload) {
            // Offline mode: rely on client-side state
            return { success: true, mode: 'offline', payload };
        }

        async getProgressionState(game) {
            return { success: true, mode: 'offline' };
        }
    }

    global.KOVOfflineRuntimeModule = {
        OfflineRuntime
    };
})(window);
