(function (global) {
    'use strict';

    function buildFieldSpawnRuntime(deps) {
        const {
            FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA,
            isTerrainCode,
            isBorderTerrain,
            isWallTile
        } = deps;

        const FIELD_OBJECT_PROB = [
            { code: 5301, fields: [0, 50, 50, 0, 0], min: 1, max: 2 },
            { code: 5302, fields: [0, 0, 30, 70, 0], min: 1, max: 2 },
            { code: 5311, fields: [0, 50, 50, 0, 0], min: 1, max: 2 },
            { code: 5312, fields: [0, 0, 30, 70, 0], min: 1, max: 2 },
            { code: 5321, fields: [0, 50, 50, 0, 0], min: 1, max: 2 },
            { code: 5322, fields: [0, 0, 30, 70, 0], min: 1, max: 2 },
            { code: 5331, fields: [0, 50, 50, 0, 0], min: 1, max: 2 },
            { code: 5332, fields: [0, 0, 30, 70, 0], min: 1, max: 2 },
            { code: 1801, fields: [50, 50, 0, 0, 0], min: 24, max: 32 },
            { code: 1802, fields: [0, 50, 50, 0, 0], min: 12, max: 16 },
            { code: 1803, fields: [0, 0, 50, 50, 0], min: 6, max: 8 },
            { code: 1804, fields: [0, 0, 0, 50, 50], min: 3, max: 5 },
            { code: 1805, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 1811, fields: [50, 50, 0, 0, 0], min: 24, max: 32 },
            { code: 1812, fields: [0, 50, 50, 0, 0], min: 12, max: 16 },
            { code: 1813, fields: [0, 0, 50, 50, 0], min: 6, max: 8 },
            { code: 1814, fields: [0, 0, 0, 50, 50], min: 3, max: 5 },
            { code: 1815, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 1821, fields: [0, 0, 50, 50, 0], min: 8, max: 12 },
            { code: 1822, fields: [0, 0, 0, 50, 50], min: 4, max: 6 },
            { code: 1823, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 1824, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 1825, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2101, fields: [0, 20, 20, 30, 30], min: 8, max: 16 },
            { code: 2102, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2103, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2104, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2105, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2201, fields: [0, 20, 20, 30, 30], min: 8, max: 16 },
            { code: 2202, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2203, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2204, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2205, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2301, fields: [0, 20, 20, 30, 30], min: 8, max: 16 },
            { code: 2302, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2303, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2304, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2305, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2801, fields: [0, 30, 30, 40, 0], min: 10, max: 20 },
            { code: 2802, fields: [0, 10, 20, 30, 40], min: 5, max: 10 },
            { code: 2803, fields: [0, 0, 0, 30, 70], min: 2, max: 5 },
            { code: 2804, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2805, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 3101, fields: [0, 20, 20, 30, 30], min: 15, max: 30 },
            { code: 3102, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 3103, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 3104, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 3105, fields: [0, 0, 0, 0, 0], min: 0, max: 0 }
        ];

        const FIELD_OBJECT_REGEN = [
            { code: 1801, fields: [50, 50, 0, 0, 0], min: 8, max: 16 },
            { code: 1802, fields: [0, 50, 50, 0, 0], min: 4, max: 8 },
            { code: 1803, fields: [0, 0, 50, 50, 0], min: 2, max: 4 },
            { code: 1804, fields: [0, 0, 0, 50, 50], min: 1, max: 2 },
            { code: 1805, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 1811, fields: [50, 50, 0, 0, 0], min: 8, max: 16 },
            { code: 1812, fields: [0, 50, 50, 0, 0], min: 4, max: 8 },
            { code: 1813, fields: [0, 0, 50, 50, 0], min: 2, max: 4 },
            { code: 1814, fields: [0, 0, 0, 50, 50], min: 1, max: 2 },
            { code: 1815, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 1821, fields: [0, 0, 50, 50, 0], min: 1, max: 2 },
            { code: 1822, fields: [0, 0, 0, 50, 50], min: 0, max: 0 },
            { code: 1823, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 1824, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 1825, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2101, fields: [0, 20, 20, 30, 30], min: 1, max: 2 },
            { code: 2102, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2103, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2104, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2105, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2201, fields: [0, 20, 20, 30, 30], min: 1, max: 2 },
            { code: 2202, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2203, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2204, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2205, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2301, fields: [0, 20, 20, 30, 30], min: 1, max: 2 },
            { code: 2302, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2303, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2304, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2305, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2801, fields: [0, 30, 30, 40, 0], min: 4, max: 8 },
            { code: 2802, fields: [0, 10, 20, 30, 40], min: 2, max: 4 },
            { code: 2803, fields: [0, 0, 0, 30, 70], min: 1, max: 2 },
            { code: 2804, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 2805, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 3101, fields: [0, 20, 20, 30, 30], min: 2, max: 4 },
            { code: 3102, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 3103, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 3104, fields: [0, 0, 0, 0, 0], min: 0, max: 0 },
            { code: 3105, fields: [0, 0, 0, 0, 0], min: 0, max: 0 }
        ];

        const OBJECT_REGEN_INTERVAL_MIN = 10;
        const OBJECT_REGEN_INTERVAL_MS = OBJECT_REGEN_INTERVAL_MIN * 60 * 1000;

        function getTerrainGroupFromCode(code) {
            const base = Math.floor(code / 100) * 100;
            if (base === 100) return 1;
            if (base === 200) return 2;
            if (base === 300) return 3;
            if (base === 400) return 4;
            if (base === 500) return 5;
            return null;
        }

        function pickWeightedGroup(weights, pools) {
            const candidates = weights.map((weight, idx) => ({ group: idx + 1, weight, size: pools[idx + 1]?.length || 0 }));
            const eligible = candidates.filter((c) => c.weight > 0 && c.size > 0);
            if (eligible.length === 0) {
                const fallback = candidates.filter((c) => c.size > 0);
                if (fallback.length === 0) return null;
                return fallback[Math.floor(Math.random() * fallback.length)].group;
            }
            const total = eligible.reduce((sum, c) => sum + c.weight, 0);
            let roll = Math.random() * total;
            for (const c of eligible) {
                roll -= c.weight;
                if (roll <= 0) return c.group;
            }
            return eligible[eligible.length - 1].group;
        }

        function pickFromPool(group, pools) {
            const pool = pools[group];
            if (!pool || pool.length === 0) return null;
            const idx = Math.floor(Math.random() * pool.length);
            return pool.splice(idx, 1)[0];
        }

        function buildTerrainPools() {
            const pools = { 1: [], 2: [], 3: [], 4: [], 5: [] };
            for (let r = 0; r < FIELD_MAP_DATA.length; r++) {
                for (let c = 0; c < FIELD_MAP_DATA[r].length; c++) {
                    const type = FIELD_MAP_DATA[r][c];
                    if (!isTerrainCode(type) || isBorderTerrain(type)) continue;
                    const group = getTerrainGroupFromCode(type);
                    if (group) pools[group].push({ r, c });
                }
            }
            return pools;
        }

        function hasPredefinedObjectPlacement() {
            for (let r = 0; r < FIELD_MAP_DATA.length; r++) {
                for (let c = 0; c < FIELD_MAP_DATA[r].length; c++) {
                    const code = FIELD_MAP_DATA[r][c];
                    const base = FIELD_TERRAIN_DATA?.[r]?.[c];
                    if (isTerrainCode(code)) continue;
                    if (isBorderTerrain(code) || isWallTile(code)) continue;
                    if (code === 0 || code === null || code === undefined) continue;
                    // Data map already defines object placement for this tile.
                    if (!isTerrainCode(base) || code !== base) return true;
                }
            }
            return false;
        }

        function applyObjectProbPlacements() {
            const pools = buildTerrainPools();
            const placements = [];
            FIELD_OBJECT_PROB.forEach((entry) => {
                const min = entry.min || 0;
                const max = entry.max || 0;
                if (max <= 0) return;
                const count = min === max ? min : (min + Math.floor(Math.random() * (max - min + 1)));
                for (let i = 0; i < count; i++) {
                    const group = pickWeightedGroup(entry.fields, pools);
                    let cell = group ? pickFromPool(group, pools) : null;
                    if (!cell) {
                        const fallback = Object.keys(pools).map((n) => parseInt(n, 10)).filter((g) => pools[g].length > 0);
                        if (fallback.length === 0) break;
                        const g = fallback[Math.floor(Math.random() * fallback.length)];
                        cell = pickFromPool(g, pools);
                    }
                    if (!cell) break;
                    FIELD_MAP_DATA[cell.r][cell.c] = entry.code;
                    placements.push({ r: cell.r, c: cell.c, code: entry.code });
                }
            });
            return placements;
        }

        function applyObjectProbToMap() {
            if (typeof window === 'undefined') return;
            const key = 'kov_field_object_prob_v1';
            let placements = null;
            try {
                const raw = localStorage.getItem(key);
                if (raw) placements = JSON.parse(raw);
            } catch (e) { }
            if (!Array.isArray(placements)) {
                placements = applyObjectProbPlacements();
                try {
                    localStorage.setItem(key, JSON.stringify(placements));
                } catch (e) { }
            } else {
                let changed = false;
                const next = [];
                placements.forEach((p) => {
                    if (!FIELD_MAP_DATA[p.r] || typeof FIELD_MAP_DATA[p.r][p.c] === 'undefined') { changed = true; return; }
                    const base = FIELD_TERRAIN_DATA?.[p.r]?.[p.c];
                    if (isWallTile(base) || isBorderTerrain(FIELD_MAP_DATA[p.r][p.c]) || isBorderTerrain(base)) {
                        if (base !== undefined && base !== null) FIELD_MAP_DATA[p.r][p.c] = base;
                        changed = true;
                        return;
                    }
                    if (!isTerrainCode(FIELD_MAP_DATA[p.r][p.c])) { changed = true; return; }
                    FIELD_MAP_DATA[p.r][p.c] = p.code;
                    next.push(p);
                });
                if (changed) {
                    try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) { }
                }
            }
        }

        function purgeBorderObjects() {
            let changed = false;
            for (let r = 0; r < FIELD_MAP_DATA.length; r++) {
                for (let c = 0; c < FIELD_MAP_DATA[r].length; c++) {
                    const base = FIELD_TERRAIN_DATA?.[r]?.[c];
                    if (!isBorderTerrain(base) && !isWallTile(base)) continue;
                    if (isTerrainCode(FIELD_MAP_DATA[r][c])) continue;
                    FIELD_MAP_DATA[r][c] = base;
                    changed = true;
                }
            }
            return changed;
        }

        function buildRegenPools() {
            const pools = { 1: [], 2: [], 3: [], 4: [], 5: [] };
            for (let r = 0; r < FIELD_MAP_DATA.length; r++) {
                for (let c = 0; c < FIELD_MAP_DATA[r].length; c++) {
                    const base = FIELD_TERRAIN_DATA?.[r]?.[c];
                    if (!isTerrainCode(base) || isBorderTerrain(base)) continue;
                    if (!isTerrainCode(FIELD_MAP_DATA[r][c])) continue;
                    const group = getTerrainGroupFromCode(base);
                    if (group) pools[group].push({ r, c });
                }
            }
            return pools;
        }

        function countFieldObjects() {
            const counts = {};
            for (let r = 0; r < FIELD_MAP_DATA.length; r++) {
                for (let c = 0; c < FIELD_MAP_DATA[r].length; c++) {
                    const code = FIELD_MAP_DATA[r][c];
                    counts[code] = (counts[code] || 0) + 1;
                }
            }
            return counts;
        }

        function applyObjectRegenCycle(regenByCode, regenTargets, now) {
            const pools = buildRegenPools();
            const counts = countFieldObjects();
            const placements = [];
            FIELD_OBJECT_REGEN.forEach((entry) => {
                const max = entry.max || 0;
                const min = entry.min || 0;
                if (max <= 0) return;
                const current = counts[entry.code] || 0;
                if (!regenTargets[entry.code]) {
                    const span = Math.max(0, max - min);
                    regenTargets[entry.code] = min + (span > 0 ? Math.floor(Math.random() * (span + 1)) : 0);
                }
                const target = regenTargets[entry.code];
                if (current >= target) return;
                const last = regenByCode?.[entry.code] || 0;
                if (now - last < OBJECT_REGEN_INTERVAL_MS) return;

                const group = pickWeightedGroup(entry.fields, pools);
                let cell = group ? pickFromPool(group, pools) : null;
                if (!cell) {
                    const fallback = Object.keys(pools).map((n) => parseInt(n, 10)).filter((g) => pools[g].length > 0);
                    if (fallback.length === 0) return;
                    const g = fallback[Math.floor(Math.random() * fallback.length)];
                    cell = pickFromPool(g, pools);
                }
                if (!cell) return;
                FIELD_MAP_DATA[cell.r][cell.c] = entry.code;
                counts[entry.code] = current + 1;
                placements.push({ r: cell.r, c: cell.c, code: entry.code });
                if (regenByCode) regenByCode[entry.code] = now;
            });
            return placements;
        }

        function initializeFieldObjectMap() {
            if (!hasPredefinedObjectPlacement()) {
                applyObjectProbToMap();
            } else if (typeof window !== 'undefined') {
                try { localStorage.removeItem('kov_field_object_prob_v1'); } catch (e) { }
            }
            purgeBorderObjects();
        }

        return {
            FIELD_OBJECT_PROB,
            FIELD_OBJECT_REGEN,
            OBJECT_REGEN_INTERVAL_MIN,
            OBJECT_REGEN_INTERVAL_MS,
            applyObjectRegenCycle,
            initializeFieldObjectMap
        };
    }

    global.KOVFieldSpawnModule = {
        buildFieldSpawnRuntime
    };
})(window);
