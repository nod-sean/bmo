(function (global) {
    'use strict';

    function applyFieldBuffsToStats(game, stats) {
        if (!stats) return stats;
        const buffs = game.fieldBuffs || { atk: 0, def: 0, hp: 0, spd: 0 };
        return {
            ...stats,
            hp: stats.hp ? Math.round(stats.hp * (1 + buffs.hp)) : stats.hp,
            atk: stats.atk ? Math.round(stats.atk * (1 + buffs.atk)) : stats.atk,
            def: stats.def ? Math.round(stats.def * (1 + buffs.def)) : stats.def,
            spd: stats.spd ? Math.round(stats.spd * (1 + buffs.spd)) : stats.spd
        };
    }

    function formatDefenders(defenders, deps) {
        if (!defenders || defenders.length === 0) return '-';
        return defenders.map((d) => {
            const stat = deps.UNIT_STATS[d.code];
            const nm = stat ? stat.name : d.code;
            return `${nm} x${d.count} `;
        }).join(' / ');
    }

    function getStatLabel(game, kind) {
        if (kind === 'atk') return game.tr('ui.field.stat.atk', {}, 'ATK');
        if (kind === 'def') return game.tr('ui.field.stat.def', {}, 'DEF');
        if (kind === 'hp') return game.tr('ui.field.stat.hp', {}, 'HP');
        if (kind === 'spd') return game.tr('ui.field.stat.spd', {}, 'SPD');
        return kind ? String(kind).toUpperCase() : game.tr('ui.field.stat.buff', {}, 'BUFF');
    }

    function getFieldRenderDeps(deps) {
        const gp = deps.GAMEPLAY || deps;
        return {
            MAP_SIZE: deps.MAP_SIZE,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA: deps.FIELD_TERRAIN_DATA,
            TERRAIN_COLORS: deps.TERRAIN_COLORS,
            TERRAIN_COLORS_BORDER: deps.TERRAIN_COLORS_BORDER,
            isTerrainCode: deps.isTerrainCode,
            getTerrainBase: deps.getTerrainBase,
            isWallTile: deps.isWallTile,
            isCastleTile: deps.isCastleTile,
            isGateTile: deps.isGateTile,
            isCitadelTile: deps.isCitadelTile,
            isDragonTile: deps.isDragonTile,
            isGoldMineTile: deps.isGoldMineTile,
            isFountainTile: deps.isFountainTile,
            isShopTile: deps.isShopTile,
            isTavernTile: deps.isTavernTile,
            isRuinsTile: deps.isRuinsTile,
            isStatueTile: deps.isStatueTile,
            FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES,
            PLAYER_START: deps.PLAYER_START,
            AStar: deps.AStar,
            GAMEPLAY: gp
        };
    }

    function getFieldInfoDeps(deps) {
        const gp = deps.GAMEPLAY || deps;
        return {
            GAMEPLAY: gp,
            isShopTile: deps.isShopTile,
            isTavernTile: deps.isTavernTile,
            FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES,
            DUNGEON_ENTRY_GOLD_COST: gp.DUNGEON_ENTRY_GOLD_COST,
            DUNGEON_ENTRY_ENERGY_COST: gp.DUNGEON_ENTRY_ENERGY_COST,
            DUNGEON_ENTRY_CP_COST: gp.DUNGEON_ENTRY_CP_COST,
            isGateTile: deps.isGateTile,
            isCitadelTile: deps.isCitadelTile,
            isStatueTile: deps.isStatueTile
        };
    }

    function deselectArmy(game) {
        game.selectedArmyId = null;
        window.KOVFieldCommandModule.exitMoveTargetMode(game);
        window.KOVFieldCommandModule.updateSelectedArmyUI(game);
        window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
    }

    function isHostileTarget(game, type, r, c, deps) {
        const worldRule = window.KOVWorldSeasonModule.getGameWorldRuleSet(game);
        
        let hasOtherArmy = false;
        if (Array.isArray(game.otherArmies)) {
            hasOtherArmy = game.otherArmies.some(a => {
                const targetR = a.moving?.to ? a.moving.to.r : a.r;
                const targetC = a.moving?.to ? a.moving.to.c : a.c;
                return targetR === r && targetC === c;
            });
        }
        if (hasOtherArmy) {
            return worldRule.allowPvpAttack !== false; // Allow by default unless explicitly false
        }

        if (type === deps.FIELD_EVENT_TYPES.BANDIT || type === deps.FIELD_EVENT_TYPES.BANDIT_LEADER || type === deps.FIELD_EVENT_TYPES.DUNGEON || type === deps.FIELD_EVENT_TYPES.CROWN) {
            return !!worldRule.allowHostileEventAttack;
        }
        const isCapturable = isCapturableFieldObject(game, type, deps);
        if (isCapturable && !game.occupiedTiles.has(`${r},${c}`)) {
            return !!worldRule.allowCapturableAttack;
        }
        return false;
    }

    function isCapturableFieldObject(game, type, deps) {
        const kind = deps.getFieldObjectKind(type);
        return deps.isCapturableFieldObjectKind(kind);
    }

    function getBuildingCount(game, type, deps) {
        let count = 0;
        for (let r = 0; r < deps.CONFIG.gridRows; r++) {
            for (let c = 0; c < deps.CONFIG.gridCols; c++) {
                if (game.grid[r][c] && game.grid[r][c].type === type) count++;
            }
        }
        return count;
    }

    function resize(game) {
        const wrap = document.getElementById('canvas-wrapper');
        game.canvas.width = Math.floor(wrap.clientWidth * game.dpr);
        game.canvas.height = Math.floor(wrap.clientHeight * game.dpr);
        game.canvas.style.width = `${wrap.clientWidth}px`;
        game.canvas.style.height = `${wrap.clientHeight}px`;
        game.ctx.resetTransform();
        game.ctx.scale(game.canvas.width / game.width, game.canvas.width / game.width);
        game.ctx.imageSmoothingEnabled = false;
        game.requestRender();
    }

    function addXp(game, amount) {
        game.currentXp += amount;
        if (game.currentXp >= game.requiredXp) window.KOVGameCoreModule.levelUp(game, game.levelDeps);
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
    }

    function levelUp(game, deps) {
        if (game.lordLevel >= deps.MAX_LEVEL || game.requiredXp <= 0) return;
        const nextReq = game.requiredXp;
        if (game.currentXp >= nextReq) {
            const prevLv = game.lordLevel;
            const prevEn = game.maxEnergy;
            game.currentXp -= nextReq;
            game.lordLevel++;
            window.KOVGameCoreModule.updateLevelStats(game, { LEVEL_DATA_BY_LEVEL: deps.LEVEL_DATA_BY_LEVEL, MAX_LEVEL: deps.MAX_LEVEL });
            game.energy = game.maxEnergy;
            window.KOVMergeSetupModule.refreshLockState(game, {
                CONFIG: deps.CONFIG,
                LOCK_TYPE: deps.LOCK_TYPE,
                UNLOCK_LEVEL_MAP: deps.UNLOCK_LEVEL_MAP,
                UNLOCK_GOLD_MAP: deps.UNLOCK_GOLD_MAP
            });
            game.cp = game.maxCp;
            window.KOVGameProgressionModule.showLevelUpModal(game, prevLv, prevEn, {
                LEVEL_DATA_BY_LEVEL: deps.LEVEL_DATA_BY_LEVEL
            });
            game.sound.playLevelUp();
            if (game.currentXp >= game.requiredXp) window.KOVGameCoreModule.levelUp(game, deps);
        }
    }

    function updateLevelStats(game, deps) {
        if (!Number.isFinite(game.lordLevel) || game.lordLevel < 1) game.lordLevel = 1;
        if (game.lordLevel > deps.MAX_LEVEL) game.lordLevel = deps.MAX_LEVEL;
        const d = deps.LEVEL_DATA_BY_LEVEL.get(game.lordLevel) || deps.LEVEL_DATA_BY_LEVEL.get(deps.MAX_LEVEL) || deps.LEVEL_DATA_BY_LEVEL.get(1);
        const nextD = deps.LEVEL_DATA_BY_LEVEL.get(game.lordLevel + 1);
        game.maxEnergy = Number(d?.energy_max || 50);
        game.baseEnergyRegen = Math.max(0, Number(d?.energy_regen ?? 1));
        game.baseMaxCp = Number(d?.cp_max || 20);
        game.baseCpRegen = Math.max(0, Number(d?.cp_regen ?? 1));
        const currentTotalXp = Number(d?.xp || 0);
        const nextTotalXp = Number(nextD?.xp);
        game.requiredXp = Number.isFinite(nextTotalXp) ? Math.max(1, nextTotalXp - currentTotalXp) : 0;
        if (game.requiredXp <= 0) game.currentXp = 0;
        window.KOVGameProgressionModule.applyCpBonuses(game);
    }

    global.KOVGameCoreModule = {
        applyFieldBuffsToStats,
        formatDefenders,
        getStatLabel,
        getFieldRenderDeps,
        getFieldInfoDeps,
        deselectArmy,
        isCapturableFieldObject,
        isHostileTarget,
        getBuildingCount,
        resize,
        addXp,
        levelUp,
        updateLevelStats
    };
})(window);

