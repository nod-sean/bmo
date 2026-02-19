(function (global) {
    'use strict';

    function findPath(start, end, mapData, occupiedTiles, isBlockedFn, deps) {
        const rows = deps.MAP_SIZE;
        const cols = deps.MAP_SIZE;
        const openSet = [];
        const closedSet = new Set();
        const startNode = { r: start.r, c: start.c, g: 0, h: 0, f: 0, parent: null };
        openSet.push(startNode);

        while (openSet.length > 0) {
            let lowInd = 0;
            for (let i = 0; i < openSet.length; i++) {
                if (openSet[i].f < openSet[lowInd].f) lowInd = i;
            }
            const current = openSet[lowInd];

            if (current.r === end.r && current.c === end.c) {
                const path = [];
                let temp = current;
                while (temp) {
                    path.push({ r: temp.r, c: temp.c });
                    temp = temp.parent;
                }
                return path.reverse();
            }

            openSet.splice(lowInd, 1);
            closedSet.add(`${current.r},${current.c}`);

            const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (let i = 0; i < neighbors.length; i++) {
                const nr = current.r + neighbors[i][0];
                const nc = current.c + neighbors[i][1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    if (closedSet.has(`${nr},${nc}`)) continue;

                    const type = mapData[nr][nc];
                    const isTarget = (nr === end.r && nc === end.c);
                    const isOccupied = occupiedTiles.has(`${nr},${nc}`);

                    let isWalkable = true;
                    if (isBlockedFn) {
                        if (isBlockedFn(current, nr, nc, type, isOccupied, isTarget)) isWalkable = false;
                    } else if (deps.isBlockingField(type) && !isOccupied && !isTarget) {
                        isWalkable = false;
                    }

                    if (!isWalkable) continue;

                    const gScore = current.g + 1;
                    let neighbor = openSet.find((n) => n.r === nr && n.c === nc);

                    if (!neighbor) {
                        neighbor = {
                            r: nr,
                            c: nc,
                            g: gScore,
                            h: Math.abs(nr - end.r) + Math.abs(nc - end.c),
                            f: 0,
                            parent: current
                        };
                        neighbor.f = neighbor.g + neighbor.h;
                        openSet.push(neighbor);
                    } else if (gScore < neighbor.g) {
                        neighbor.g = gScore;
                        neighbor.f = neighbor.g + neighbor.h;
                        neighbor.parent = current;
                    }
                }
            }
        }
        return null;
    }

    global.KOVPathfindingModule = {
        findPath
    };
})(window);
