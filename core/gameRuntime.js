(function (global) {
    'use strict';

    class GameRuntime {
        constructor() {
            if (new.target === GameRuntime) {
                throw new TypeError("Cannot construct Abstract instances directly");
            }
        }

        /**
         * Move an army to a target location.
         * @param {Object} game - Game instance
         * @param {number} armyId - ID of the army
         * @param {number} targetR - Target Row
         * @param {number} targetC - Target Column
         * @param {number} tileType - Type of tile at target
         * @param {Object} deps - Dependencies (AStar, FIELD_MAP_DATA, etc.)
         * @returns {Promise<Object>} Result { success: boolean, reason: string, ... }
         */
        async moveArmy(game, armyId, targetR, targetC, tileType, deps) {
            throw new Error("Method 'moveArmy' must be implemented.");
        }

        async startBattle(game, attackerArmyId, targetR, targetC, tileType, deps) {
            throw new Error("Method 'startBattle' must be implemented.");
        }

        async executeMergeAction(game, payload) {
            throw new Error("Method 'executeMergeAction' must be implemented.");
        }

        /**
         * Get current world state (for sync).
         * @param {Object} game 
         * @param {string} channelId 
         */
        async getWorldState(game, channelId) {
            throw new Error("Method 'getWorldState' must be implemented.");
        }

        /**
         * Get current merge state (for sync).
         */
        async getMergeState() {
            throw new Error("Method 'getMergeState' must be implemented.");
        }

        async executeMergeAction(game, payload) {
            throw new Error("Method 'executeMergeAction' must be implemented.");
        }

        async getProgressionState(game) {
            throw new Error("Method 'getProgressionState' must be implemented.");
        }
    }

    global.KOVGameRuntimeModule = {
        GameRuntime
    };
})(window);
