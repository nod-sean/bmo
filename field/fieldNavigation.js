(function (global) {
    'use strict';

    function getTerrainBaseNameLocalized(game, code, deps) {
        const base = deps.getTerrainBase(code);
        if (base === 100) return game.tr('ui.field.terrain.plains', {}, 'Plains');
        if (base === 200) return game.tr('ui.field.terrain.forest', {}, 'Forest');
        if (base === 300) return game.tr('ui.field.terrain.highland', {}, 'Highland');
        if (base === 400) return game.tr('ui.field.terrain.swamp', {}, 'Swamp');
        if (base === 500) return game.tr('ui.field.terrain.volcano', {}, 'Volcano');
        return game.tr('ui.field.terrain.default', {}, 'Terrain');
    }

    function getTerrainNameLocalized(game, code, deps) {
        const baseName = getTerrainBaseNameLocalized(game, code, deps);
        if (code % 100 === 1) {
            return game.tr('ui.field.terrain.border', { name: baseName }, `${baseName} Border`);
        }
        return baseName;
    }

    function objectTypeNameByCode(game, type, deps) {
        if (type === 4) return game.tr('ui.field.object.road', {}, 'Road');
        if (deps.isWallTile(type)) return game.tr('ui.field.object.wall', {}, 'Wall');
        if (deps.isTerrainCode(type)) return getTerrainNameLocalized(game, type, deps);

        const kind = deps.getFieldObjectKind(type);
        if (kind === 'castle') return game.tr('ui.field.object.castle', {}, 'Castle');
        if (kind === 'gate') return game.tr('ui.field.object.gate', {}, 'Gate');
        if (kind === 'citadel') return game.tr('ui.field.object.citadel', {}, 'Citadel');
        if (kind === 'dragon') return game.tr('ui.field.object.dragon', {}, 'Dragon');
        if (kind === 'goldmine') return game.tr('ui.field.object.goldmine', {}, 'Gold Mine');
        if (kind === 'fountain') return game.tr('ui.field.object.fountain', {}, 'Fountain');
        if (kind === 'shop') return game.tr('ui.field.object.shop', {}, 'Shop');
        if (kind === 'tavern') return game.tr('ui.field.object.tavern', {}, 'Tavern');
        if (kind === 'ruins') return game.tr('ui.field.object.ruins', {}, 'Ruins');
        if (kind && kind.startsWith('statue')) return game.tr('ui.field.object.statue', {}, 'Statue');

        return game.tr('ui.field.object.unknown', {}, 'Unknown');
    }

    function getTileMoveTime(type, r, c, deps) {
        if (deps.isGateTile(type) || deps.isCitadelTile(type)) return 5;
        if (deps.isDragonTile(type)) return 6;
        if (type === 4) return 1;

        let evalType = type;
        if (!deps.isTerrainCode(type) && typeof r === 'number' && typeof c === 'number') {
            const base = deps.FIELD_TERRAIN_DATA?.[r]?.[c];
            if (deps.isTerrainCode(base)) evalType = base;
        }
        if (deps.isTerrainCode(evalType)) {
            const base = deps.getTerrainBase(evalType);
            if (base === 100) return 3;
            if (base === 200) return 5;
            if (base === 300) return 4;
            if (base === 400) return 5;
            if (base === 500) return 6;
            return 3;
        }
        return 3;
    }

    function getTileMoveMeta(game, type, r, c, deps) {
        let name = game.tr('ui.field.terrain.default', {}, 'Terrain');
        if (type === 4 || deps.isGateTile(type) || deps.isCitadelTile(type) || deps.isDragonTile(type)) {
            name = objectTypeNameByCode(game, type, deps);
        } else {
            let evalType = type;
            if (!deps.isTerrainCode(type) && typeof r === 'number' && typeof c === 'number') {
                const base = deps.FIELD_TERRAIN_DATA?.[r]?.[c];
                if (deps.isTerrainCode(base)) evalType = base;
            }
            if (deps.isTerrainCode(evalType)) name = getTerrainBaseNameLocalized(game, evalType, deps);
        }
        return { name, min: getTileMoveTime(type, r, c, deps) };
    }

    function getPathTimeMin(path, speedFactor, deps) {
        if (!path || path.length <= 1) return 0;
        let total = 0;
        for (let i = 1; i < path.length; i++) {
            const step = path[i];
            const tileType = deps.FIELD_MAP_DATA[step.r][step.c];
            total += getTileMoveTime(tileType, step.r, step.c, deps);
        }
        return total * speedFactor;
    }

    function getPathSummary(game, path, speedFactor, deps) {
        if (!path || path.length <= 1) return { dist: 0, baseMin: 0, finalMin: 0, breakdown: '' };
        const counts = {};
        let total = 0;
        for (let i = 1; i < path.length; i++) {
            const step = path[i];
            const tileType = deps.FIELD_MAP_DATA[step.r][step.c];
            const meta = getTileMoveMeta(game, tileType, step.r, step.c, deps);
            total += meta.min;
            counts[meta.name] = (counts[meta.name] || 0) + 1;
        }
        const breakdown = Object.keys(counts).map((k) => `${k}${counts[k]}`).join(' ');
        return { dist: path.length - 1, baseMin: total, finalMin: total * speedFactor, breakdown };
    }

    function buildStepTimes(path, speedFactor, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (!path || path.length <= 1) return [];
        const times = [0];
        for (let i = 1; i < path.length; i++) {
            const step = path[i];
            const tileType = deps.FIELD_MAP_DATA[step.r][step.c];
            const mins = getTileMoveTime(tileType, step.r, step.c, deps) * speedFactor;
            times[i] = Math.max(30, Math.floor(mins * gp.MOVE_MS_PER_MIN));
        }
        return times;
    }

    global.KOVFieldNavigationModule = {
        getTerrainBaseNameLocalized,
        getTerrainNameLocalized,
        objectTypeNameByCode,
        getTileMoveTime,
        getTileMoveMeta,
        getPathTimeMin,
        getPathSummary,
        buildStepTimes
    };
})(window);
