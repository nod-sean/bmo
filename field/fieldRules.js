(function (global) {
    'use strict';

    function createFieldRules(fieldObjectData) {
        const FIELD_OBJECT_DATA = fieldObjectData || {};
        const FIELD_OBJECT_KIND_BY_CODE = {};
        const FIELD_OBJECT_DATA_BY_KIND_LEVEL = {};

        function detectFieldObjectKindFromName(name) {
            const text = String(name || '').toLowerCase();
            if (!text) return null;
            if (text.includes('castle')) return 'castle';
            if (text.includes('gate')) return 'gate';
            if (text.includes('citadel')) return 'citadel';
            if (text.includes('dragon')) return 'dragon';
            if (text.includes('gold mine') || text.includes('goldmine')) return 'goldmine';
            if (text.includes('fountain')) return 'fountain';
            if (text.includes('shop')) return 'shop';
            if (text.includes('tavern')) return 'tavern';
            if (text.includes('ruins')) return 'ruins';
            if (text.includes('territory') || text.includes('conquest')) return 'territory';
            if (text.includes('statue atk') || (text.includes('statue') && text.includes('atk'))) return 'statue_atk';
            if (text.includes('statue def') || (text.includes('statue') && text.includes('def'))) return 'statue_def';
            if (text.includes('statue hp') || (text.includes('statue') && text.includes('hp'))) return 'statue_hp';
            if (text.includes('statue spd') || (text.includes('statue') && text.includes('spd'))) return 'statue_spd';
            if (text.includes('statue')) return 'statue';
            return null;
        }

        function detectFieldObjectKindFromCode(code) {
            if (code === 1 || code === 5100) return 'castle';
            if (code >= 5111 && code <= 5119) return 'gate';
            if (code >= 5121 && code <= 5129) return 'citadel';
            if (code === 5131) return 'dragon';
            if (code >= 5200 && code <= 5209) return 'goldmine';
            if (code >= 5211 && code <= 5219) return 'fountain';
            if (code === 5221) return 'shop';
            if (code === 5231) return 'tavern';
            if (code >= 5241 && code <= 5249) return 'ruins';
            if (code >= 5301 && code <= 5302) return 'statue_atk';
            if (code >= 5311 && code <= 5312) return 'statue_def';
            if (code >= 5321 && code <= 5322) return 'statue_hp';
            if (code >= 5331 && code <= 5332) return 'statue_spd';
            if (code >= 5300 && code < 5400) return 'statue';
            if (code >= 5400 && code <= 5499) return 'territory';
            return null;
        }

        Object.entries(FIELD_OBJECT_DATA).forEach(([rawCode, obj]) => {
            if (!obj || typeof obj !== 'object') return;
            const code = Number(rawCode);
            if (!Number.isFinite(code)) return;
            if (!Number.isFinite(Number(obj.code))) obj.code = code;

            const level = Number.isFinite(Number(obj.level)) ? Number(obj.level) : 1;
            const kind = detectFieldObjectKindFromName(obj.name) || detectFieldObjectKindFromCode(code);
            if (!kind) return;

            FIELD_OBJECT_KIND_BY_CODE[code] = kind;
            if (!FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind]) FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind] = {};
            const previous = FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind][level];
            if (!previous || Number(previous.code) > code) {
                FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind][level] = obj;
            }
        });

        function getFieldObjectKind(code) {
            return FIELD_OBJECT_KIND_BY_CODE[code] || detectFieldObjectKindFromCode(code);
        }

        function isTerrainCode(code) { return code >= 100 && code < 600; }
        function isWallTile(code) { return code === 0; }
        function getTerrainBase(code) { return Math.floor(code / 100) * 100; }
        function getTerrainName(code) {
            const base = getTerrainBase(code);
            const name = base === 100 ? 'Plains' : base === 200 ? 'Forest' : base === 300 ? 'Highland' : base === 400 ? 'Swamp' : base === 500 ? 'Volcano' : 'Terrain';
            return (code % 100 === 1) ? `${name} Border` : name;
        }
        function getTerrainBaseName(code) {
            const base = getTerrainBase(code);
            return base === 100 ? 'Plains' : base === 200 ? 'Forest' : base === 300 ? 'Highland' : base === 400 ? 'Swamp' : base === 500 ? 'Volcano' : 'Terrain';
        }

        function isCastleTile(code) { return code === 1 || code === 5100 || getFieldObjectKind(code) === 'castle'; }
        function isGateTile(code) { return code === 2 || getFieldObjectKind(code) === 'gate'; }
        function isCitadelTile(code) { return code === 3 || getFieldObjectKind(code) === 'citadel'; }
        function isDragonTile(code) { return getFieldObjectKind(code) === 'dragon'; }
        function isReturnGateTile(code) { return code === 5151; }
        function isGoldMineTile(code) { return code === 5 || getFieldObjectKind(code) === 'goldmine'; }
        function isFountainTile(code) { return code === 6 || getFieldObjectKind(code) === 'fountain'; }
        function isShopTile(code) { return getFieldObjectKind(code) === 'shop'; }
        function isTavernTile(code) { return getFieldObjectKind(code) === 'tavern'; }
        function isRuinsTile(code) { return getFieldObjectKind(code) === 'ruins'; }
        function isStatueTile(code) {
            const kind = getFieldObjectKind(code);
            return kind === 'statue' || kind === 'statue_atk' || kind === 'statue_def' || kind === 'statue_hp' || kind === 'statue_spd';
        }
        function isTerritoryTile(code) { return getFieldObjectKind(code) === 'territory'; }
        function isBorderTerrain(code) { return isTerrainCode(code) && code % 100 === 1; }
        function isBlockingField(code) { return isWallTile(code) || isGateTile(code) || isCitadelTile(code) || isDragonTile(code) || isBorderTerrain(code); }
        function getStatueKind(code) {
            const kind = getFieldObjectKind(code);
            if (kind === 'statue_atk') return 'atk';
            if (kind === 'statue_def') return 'def';
            if (kind === 'statue_hp') return 'hp';
            if (kind === 'statue_spd') return 'spd';
            if (code >= 5301 && code <= 5302) return 'atk';
            if (code >= 5311 && code <= 5312) return 'def';
            if (code >= 5321 && code <= 5322) return 'hp';
            if (code >= 5331 && code <= 5332) return 'spd';
            return null;
        }

        function getObjectLevelFromCode(type) {
            if (FIELD_OBJECT_DATA[type]) return Number(FIELD_OBJECT_DATA[type].level) || 1;
            if (isGateTile(type)) return Math.max(1, type - 5110);
            if (isCitadelTile(type)) return Math.max(1, type - 5120);
            if (isGoldMineTile(type)) return Math.max(1, type - 5200);
            if (isFountainTile(type)) return Math.max(1, type - 5210);
            if (isRuinsTile(type)) return Math.max(1, type - 5240);
            if (isStatueTile(type)) return type % 10;
            return 1;
        }

        function getFieldObjectDataByType(type) {
            if (FIELD_OBJECT_DATA[type]) return FIELD_OBJECT_DATA[type];
            const kind = getFieldObjectKind(type);
            if (!kind) return null;
            const byLevel = FIELD_OBJECT_DATA_BY_KIND_LEVEL[kind];
            if (!byLevel || typeof byLevel !== 'object') return null;

            const level = Number.isFinite(Number(type)) ? getObjectLevelFromCode(type) : 1;
            if (byLevel[level]) return byLevel[level];

            const levels = Object.keys(byLevel).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
            if (!levels.length) return null;
            const nearestHigher = levels.find((lv) => lv >= level);
            const pick = Number.isFinite(nearestHigher) ? nearestHigher : levels[levels.length - 1];
            return byLevel[pick] || null;
        }

        const CAPTURABLE_FIELD_OBJECT_KINDS = new Set([
            'gate',
            'citadel',
            'dragon',
            'goldmine',
            'fountain',
            'shop',
            'tavern',
            'ruins',
            'territory',
            'statue',
            'statue_atk',
            'statue_def',
            'statue_hp',
            'statue_spd'
        ]);

        function isCapturableFieldObjectKind(kind) {
            return !!kind && CAPTURABLE_FIELD_OBJECT_KINDS.has(kind);
        }

        return {
            detectFieldObjectKindFromName,
            detectFieldObjectKindFromCode,
            getFieldObjectKind,
            getFieldObjectDataByType,
            isTerrainCode,
            isWallTile,
            getTerrainBase,
            getTerrainName,
            getTerrainBaseName,
            isCastleTile,
            isGateTile,
            isCitadelTile,
            isDragonTile,
            isReturnGateTile,
            isGoldMineTile,
            isFountainTile,
            isShopTile,
            isTavernTile,
            isRuinsTile,
            isStatueTile,
            isTerritoryTile,
            isBorderTerrain,
            isBlockingField,
            getStatueKind,
            getObjectLevelFromCode,
            isCapturableFieldObjectKind
        };
    }

    global.KOVFieldRulesModule = {
        createFieldRules
    };
})(window);
