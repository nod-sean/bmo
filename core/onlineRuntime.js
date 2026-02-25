(function (global) {
    'use strict';

    const { GameRuntime } = global.KOVGameRuntimeModule;

    class OnlineRuntime extends GameRuntime {
        async moveArmy(game, armyId, targetR, targetC, tileType, deps) {
            // Online logic: Call Server API
            if (!global.KOVServerApiModule || !global.KOVServerApiModule.WorldApi) {
                return { success: false, reason: 'API_NOT_AVAILABLE' };
            }

            try {
                const squadData = window.KOVFieldCommandModule.getSquadByArmyId(game, armyId);
                const stats = window.KOVFieldCommandModule.getSquadStats(game, squadData, { getData: game.mergeActionDeps?.getData || (() => ({})) });

                const response = await global.KOVServerApiModule.WorldApi.move({
                    armyId: armyId,
                    to: { r: targetR, c: targetC }, // Server expects 'to' object or r,c
                    maxDistance: stats.range || 40
                });

                const payload = (response && response.success && response.data) ? response.data : response;

                if (response && response.success) {
                    // Success on server.
                    // Now we must trigger local visualization to match.
                    // The server returns: commandId, cpAfter, etaMs, from, to
                    // We need to calculate the path locally to visualize it, 
                    // or trust the server's validation passed and we can pathfind again.
                    // Since we are "Online", we assume map data is synced.
                    
                    const gp = deps.GAMEPLAY || deps;
                    const army = game.armies[armyId];
                    
                    // We need to replicate startMarch but with server data (e.g. cp deduc already done on server?)
                    // The client usually predicts/animates.
                    // For now, let's call startMarch but override costs to 0 if we want to avoid double deduction?
                    // Wait, game.cp is local state. We should update it to match server.
                    
                    if (Number.isFinite(payload.cpAfter)) {
                        game.cp = payload.cpAfter;
                    }

                    // Pathfinding for visualization
                    // We need to find the path again to animate movement along it.
                    // Ideally server returns path, but if not, we recalculate.
                    const regionId = window.KOVFieldStateModule.getArmyRegionId(game, army, {
                        FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
                        isBorderTerrain: deps.isBorderTerrain
                    });

                    const path = deps.AStar.findPath(
                        { r: army.r, c: army.c },
                        { r: targetR, c: targetC },
                        deps.FIELD_MAP_DATA,
                        game.occupiedTiles,
                        (cur, nr, nc, type, isOcc, isTarget) => window.KOVFieldStateModule.isTileBlocked(game, cur, nr, nc, type, isOcc, isTarget, regionId, deps)
                    );

                    if (path) {
                        // Call startMarch with 0 cost because we already updated CP from server response
                        // Or pass costs but ensure they match? 
                        // startMarch subtracts locally.
                        // Let's pass 0 for costs and handle CP sync above.
                        
                        // Wait, startMarch subtracts. If we update game.cp above, startMarch will subtract AGAIN.
                        // We should let startMarch subtract? 
                        // Or pass 0 cost.
                        
                        window.KOVFieldCommandModule.startMarch(
                            game,
                            armyId,
                            targetR,
                            targetC,
                            tileType,
                            0, // goldCost handled/synced? Server response doesn't show gold, assumes we know? 
                            0, // cpCost handled by sync
                            path,
                            stats.speedFactor,
                            deps
                        );
                        
                        // Force CP sync again just in case startMarch did something weird, 
                        // but startMarch modifies game.cp directly.
                        if (Number.isFinite(payload.cpAfter)) {
                             game.cp = payload.cpAfter; // Ensure it matches server
                        }
                    }

                    return { success: true, data: payload };
                } else {
                    const error = response?.error || response?.err || {};
                    return { success: false, reason: error.code || 'SERVER_ERROR', details: error };
                }
            } catch (e) {
                console.error('Online move failed', e);
                return { success: false, reason: 'NETWORK_ERROR' };
            }
        }

        async startBattle(game, attackerArmyId, targetR, targetC, tileType, deps) {
            const api = window.KOVServerApiModule.BattleApi;
            if (!api) return { success: false, reason: 'API_MISSING' };

            const res = await api.start({
                attackerArmyId,
                target: { r: targetR, c: targetC }
            });

            const payload = (res && res.success && res.data) ? res.data : res;

            if (!res || !res.success) {
                const error = res?.error || res?.err || {};
                return { success: false, reason: error.code || 'SERVER_ERROR' };
            }

            // Trigger local animation/transition
            if (payload.status === 'started') {
                window.KOVBattleFlowModule.startBattle(game, attackerArmyId, targetR, targetC, tileType, deps);
            }
            
            return { success: true, battleId: payload.battleId };
        }

        async getWorldState(game, channelId) {
            const response = await global.KOVServerApiModule.WorldApi.getState(channelId);
            return response;
        }

        async getMergeState() {
            if (!global.KOVServerApiModule || !global.KOVServerApiModule.MergeApi) {
                return { success: false, reason: 'API_NOT_AVAILABLE' };
            }

            try {
                const response = await global.KOVServerApiModule.MergeApi.getState();
                const payload = (response && response.success && response.data) ? response.data : response;

                if (response && response.success) {
                    return { success: true, data: payload.state || payload };
                } else {
                    const error = response?.error || response?.err || {};
                    return { success: false, reason: error.code || 'SERVER_ERROR', details: error };
                }
            } catch (e) {
                console.error('Online getMergeState failed', e);
                return { success: false, reason: 'NETWORK_ERROR' };
            }
        }

        async executeMergeAction(game, payload) {
            if (!global.KOVServerApiModule || !global.KOVServerApiModule.MergeApi) {
                return { success: false, reason: 'API_NOT_AVAILABLE' };
            }

            try {
                const response = await global.KOVServerApiModule.MergeApi.executeAction(payload);
                const resPayload = (response && response.success && response.data) ? response.data : response;

                if (response && response.success) {
                    return { success: true, data: resPayload };
                } else {
                    const error = response?.error || response?.err || {};
                    return { success: false, reason: error.code || 'SERVER_ERROR', details: error };
                }
            } catch (e) {
                console.error('Online merge action failed', e);
                return { success: false, reason: 'NETWORK_ERROR' };
            }
        }

        async getProgressionState(game) {
            if (!global.KOVServerApiModule || !global.KOVServerApiModule.ProgressionApi) {
                return { success: false, reason: 'API_NOT_AVAILABLE' };
            }
            try {
                const res = await global.KOVServerApiModule.ProgressionApi.getState();
                const payload = (res && res.success && res.data) ? res.data : res;

                if (res && res.success) return { success: true, data: payload };

                const error = res?.error || res?.err || {};
                return { success: false, reason: error.code || 'SERVER_ERROR' };
            } catch (e) {
                return { success: false, reason: 'NETWORK_ERROR' };
            }
        }
    }

    global.KOVOnlineRuntimeModule = {
        OnlineRuntime
    };
})(window);
