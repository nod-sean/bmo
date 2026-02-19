(function (global) {
    'use strict';

    function createAStarAdapter(findPathFn, deps) {
        return {
            findPath(start, end, mapData, occupiedTiles, isBlockedFn) {
                return findPathFn(start, end, mapData, occupiedTiles, isBlockedFn, {
                    MAP_SIZE: deps.MAP_SIZE,
                    isBlockingField: deps.isBlockingField
                });
            }
        };
    }

    global.KOVGameAStarModule = {
        createAStarAdapter
    };
})(window);

