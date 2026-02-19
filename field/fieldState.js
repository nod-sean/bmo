(function (global) {
    'use strict';

    function getCitadelCpBonusFromDeps(deps) {
        if (deps && deps.GAMEPLAY && Number.isFinite(Number(deps.GAMEPLAY.CITADEL_CP_BONUS))) {
            return Number(deps.GAMEPLAY.CITADEL_CP_BONUS);
        }
        return 0;
    }

    function getFieldResourceState(game, type, r, c, deps) {
        const cfg = getFieldResourceConfig(game, type, deps);
        if (!cfg) return null;
        const key = `${r},${c}`;
        const now = Date.now();
        const state = game.fieldResourceState[key] || { last: now, stored: 0 };
        const regenMs = cfg.regen5 / (5 * 60 * 1000);
        if (regenMs > 0) {
            const elapsed = now - state.last;
            if (elapsed > 0) {
                const gained = Math.floor(elapsed * regenMs);
                if (gained > 0) {
                    state.stored = Math.min(cfg.cap, state.stored + gained);
                    const consumedMs = gained / regenMs;
                    state.last = Math.min(now, state.last + consumedMs);
                }
            }
        }
        if (state.stored >= cfg.cap) {
            if (!state.capNotified) {
                state.capNotified = true;
                if (document.getElementById('field-modal').classList.contains('open')) {
                    const kind = cfg.kind === 'gold'
                        ? game.tr('ui.field.object.goldmine', {}, 'Gold Mine')
                        : game.tr('ui.field.object.fountain', {}, 'Fountain');
                    window.KOVUiShellModule.showToast(game, game.tr('toast.storage_full', { kind }, `${kind} storage full`));
                }
            }
        } else {
            state.capNotified = false;
        }
        game.fieldResourceState[key] = state;
        return { key, state, cfg };
    }

    function getAbilityValue(data, abilityCode) {
        if (!data || !data.abilities) return 0;
        const found = data.abilities.find((a) => a.code === abilityCode);
        return found ? Number(found.value) : 0;
    }

    function getFieldLevel(game, type, deps) {
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        if (data && data.level) return data.level;
        return deps.getObjectLevelFromCode(type);
    }

    function getStatueBuff(game, type, deps) {
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        if (data?.statue) return data.statue;
        const kind = deps.getStatueKind(type);
        if (!kind) return null;
        const level = getFieldLevel(game, type, deps);
        const statueFallback = deps.GAMEPLAY?.STATUE_BUFF_FALLBACK || {};
        const value = statueFallback[level] || 0;
        return value ? { kind, value } : null;
    }

    function getRuinsBonus(game, type, deps) {
        if (!deps.isRuinsTile(type)) return null;
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        if (!data) return null;
        const cpCap = getAbilityValue(data, deps.ABILITY_CODES.CP_CAP);
        const cpRegen = getAbilityValue(data, deps.ABILITY_CODES.CP_REGEN);
        if (!cpCap && !cpRegen) return null;
        return { level: data.level || getFieldLevel(game, type, deps), cpCap, cpRegen };
    }

    function getFieldResourceConfig(game, type, deps) {
        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        if (!data) return null;
        const goldCap = getAbilityValue(data, deps.ABILITY_CODES.GOLD_CAP);
        const goldRegen = getAbilityValue(data, deps.ABILITY_CODES.GOLD_REGEN);
        if (goldCap || goldRegen) return { kind: 'gold', cap: goldCap, regen5: goldRegen };
        const energyCap = getAbilityValue(data, deps.ABILITY_CODES.ENERGY_CAP);
        const energyRegen = getAbilityValue(data, deps.ABILITY_CODES.ENERGY_REGEN);
        if (energyCap || energyRegen) return { kind: 'energy', cap: energyCap, regen5: energyRegen };
        return null;
    }

    function buildFieldRegions(game, deps) {
        const regions = Array.from({ length: deps.MAP_SIZE }, () => Array(deps.MAP_SIZE).fill(-1));
        let regionId = 0;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let r = 0; r < deps.MAP_SIZE; r++) {
            for (let c = 0; c < deps.MAP_SIZE; c++) {
                const type = deps.FIELD_MAP_DATA[r][c];
                if (deps.isWallTile(type) || deps.isBorderTerrain(type) || deps.isGateTile(type) || deps.isCitadelTile(type) || deps.isDragonTile(type)) continue;
                if (regions[r][c] !== -1) continue;
                const stack = [{ r, c }];
                regions[r][c] = regionId;
                while (stack.length) {
                    const cur = stack.pop();
                    for (const d of dirs) {
                        const nr = cur.r + d[0];
                        const nc = cur.c + d[1];
                        if (nr < 0 || nr >= deps.MAP_SIZE || nc < 0 || nc >= deps.MAP_SIZE) continue;
                        const ntype = deps.FIELD_MAP_DATA[nr][nc];
                        if (deps.isWallTile(ntype) || deps.isBorderTerrain(ntype) || deps.isGateTile(ntype) || deps.isCitadelTile(ntype) || deps.isDragonTile(ntype)) continue;
                        if (regions[nr][nc] !== -1) continue;
                        regions[nr][nc] = regionId;
                        stack.push({ r: nr, c: nc });
                    }
                }
                regionId += 1;
            }
        }
        game.fieldRegions = regions;
    }

    function getRegionIdAt(game, r, c, deps) {
        if (!game.fieldRegions || r < 0 || c < 0 || r >= deps.MAP_SIZE || c >= deps.MAP_SIZE) return -1;
        return game.fieldRegions[r][c];
    }

    function getAdjacentRegionIds(game, r, c, deps) {
        const ids = new Set();
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const d of dirs) {
            const nr = r + d[0];
            const nc = c + d[1];
            const id = getRegionIdAt(game, nr, nc, deps);
            if (id !== -1) ids.add(id);
        }
        return ids;
    }

    function getAdjacentRegionKey(game, r, c, deps) {
        const ids = Array.from(getAdjacentRegionIds(game, r, c, deps));
        if (ids.length === 0) return '';
        ids.sort((a, b) => a - b);
        return ids.join(',');
    }

    function getArmyRegionId(game, army, deps) {
        if (!army) return -1;
        const type = deps.FIELD_MAP_DATA?.[army.r]?.[army.c];
        if (!deps.isBorderTerrain(type)) {
            const id = getRegionIdAt(game, army.r, army.c, deps);
            if (id !== -1) army.regionId = id;
            return id;
        }
        if (army.regionId !== undefined && army.regionId !== null) return army.regionId;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const d of dirs) {
            const nr = army.r + d[0];
            const nc = army.c + d[1];
            const id = getRegionIdAt(game, nr, nc, deps);
            if (id !== -1) {
                army.regionId = id;
                return id;
            }
        }
        return -1;
    }

    function isBorderOpen(game, r, c) {
        return game.openBorderTiles?.has(`${r},${c}`);
    }

    function isTileBlocked(game, current, r, c, type, isOccupied, isTarget, regionId, deps) {
        if (deps.isWallTile(type)) return true;
        if (deps.isBorderTerrain(type)) return !isBorderOpen(game, r, c);
        if (isOccupied || isTarget) return false;
        if (current && deps.isBorderTerrain(deps.FIELD_MAP_DATA[current.r][current.c])) {
            if (!isBorderOpen(game, current.r, current.c)) {
                const targetRegion = getRegionIdAt(game, r, c, deps);
                if (regionId !== -1 && targetRegion !== -1 && targetRegion !== regionId) return true;
            }
        }
        if (window.KOVGameCoreModule.isCapturableFieldObject(game, type, game.gameCoreDeps)) return true;
        return false;
    }

    function recalcFieldBonuses(game, deps) {
        const buffs = { atk: 0, def: 0, hp: 0, spd: 0 };
        let cpCapBonus = 0;
        let cpRegenBonus = 0;
        let citadelCount = 0;

        game.occupiedTiles.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            const type = deps.FIELD_MAP_DATA[r][c];
            if (deps.isStatueTile(type)) {
                const buff = window.KOVFieldStateModule.getStatueBuff(game, type, game.statueBuffDeps);
                if (buff && buff.value) buffs[buff.kind] += buff.value;
            }
            if (deps.isRuinsTile(type)) {
                const bonus = getRuinsBonus(game, type, deps);
                if (bonus) {
                    cpCapBonus += bonus.cpCap;
                    cpRegenBonus += bonus.cpRegen;
                }
            }
            if (deps.isCitadelTile(type)) citadelCount += 1;
        });

        game.fieldBuffs = buffs;
        game.citadelCount = citadelCount;
        const citadelCpBonus = getCitadelCpBonusFromDeps(deps);
        game.cpBonus = cpCapBonus + (citadelCount * citadelCpBonus);
        game.cpRegenBonus = cpRegenBonus;
        const prevThird = game.thirdSquadUnlocked;
        game.thirdSquadUnlocked = citadelCount > 0;
        if (!game.thirdSquadUnlocked) {
            if (game.selectedArmyId === 2) game.selectedArmyId = null;
            if (game.lastSelectedArmyId === 2) game.lastSelectedArmyId = null;
        }
        if (prevThird !== game.thirdSquadUnlocked) {
            window.KOVMergeSetupModule.calcLayout(game, { CONFIG: deps.CONFIG });
            game.requestRender();
        }
        window.KOVGameProgressionModule.applyCpBonuses(game);
    }

    function collectFieldResource(game, type, r, c, deps) {
        if (window.KOVWorldSeasonModule.guardWorldAction(
            game,
            game.tr('ui.info.collect', {}, 'Collect'),
            window.KOVWorldSeasonModule.ensureWorldState(game),
            window.KOVWorldSeasonModule.getActiveWorldEndConditions(game, game.worldAdminDeps)
        )) return;
        const key = `${r},${c}`;
        if (!game.occupiedTiles.has(key)) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.collect_after_capture', {}, 'Collectable after capture'));
            return;
        }
        const info = getFieldResourceState(game, type, r, c, deps);
        if (!info || info.state.stored <= 0) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.production_progress', {}, 'Production in progress'));
            return;
        }
        if (info.cfg.kind === 'gold') {
            game.gold += info.state.stored;
            window.KOVUiShellModule.showToast(game, game.tr('toast.gold_gain', { value: info.state.stored }, `+${info.state.stored}G`));
        } else if (info.cfg.kind === 'energy') {
            game.energy = Math.min(game.maxEnergy, game.energy + info.state.stored);
            window.KOVUiShellModule.showToast(game, game.tr('toast.energy_gain', { value: info.state.stored }, `+${info.state.stored}EN`));
        }
        info.state.stored = 0;
        info.state.capNotified = false;
        info.state.last = Date.now();
        game.fieldResourceState[key] = info.state;
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
    }

    function collectFieldObjectToMerge(game, type, r, c, deps) {
        const canCollect = window.KOVFieldFlowModule.canCollectFieldObject(game, r, c, {
            MAP_SIZE: deps.MAP_SIZE,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            isBorderTerrain: deps.isBorderTerrain,
            isWallTile: deps.isWallTile
        });
        if (!canCollect) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.enter_before_collect', {}, 'Enter first before collecting'));
            return;
        }
        const info = getCollectibleFieldItemInfo(game, type, deps);
        if (!info) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.collect_unavailable', {}, 'Nothing to collect'));
            return;
        }
        const item = createMergeItemFromInfo(game, info, { ITEM_TYPE: deps.ITEM_TYPE });
        if (!window.KOVMergeBoardModule.spawnItem(game, item, game.spawnItemDeps)) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.merge_slot_short', {}, 'Not enough merge slot space'));
            return;
        }

        clearFieldObjectFromMap(game, r, c, {
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            FIELD_TERRAIN_DATA: deps.FIELD_TERRAIN_DATA
        });
        if (game.fieldObjectState) {
            if (!game.fieldObjectState.regenByCode) game.fieldObjectState.regenByCode = {};
            game.fieldObjectState.regenByCode[type] = Date.now();
        }
        game.sound.playCollect();
        game.requestRender();
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);

        if (document.getElementById('field-modal').classList.contains('open')) {
            if (!window.KOVFieldUiModule.refreshFieldMapVisuals(game, game.fieldUiVisualDeps)) {
                window.KOVFieldRenderModule.renderFieldMap(game, game.fieldMapRenderDeps);
            }
            window.KOVFieldUiModule.setFieldInfo(game, deps.FIELD_MAP_DATA[r][c], r, c, game.fieldInfoDeps);
        }
        window.KOVUiShellModule.showToast(game, game.tr('toast.collect_done', {}, 'Collected'));
    }

    function getCollectibleFieldItemInfo(game, type, deps) {
        if (deps.isTerrainCode(type)) return null;
        return deps.getInfoFromCode(type);
    }

    function createMergeItemFromInfo(game, info, deps) {
        const item = { type: info.type, level: info.level, scale: 0 };
        const itemType = deps.ITEM_TYPE;
        if (item.type === itemType.BUILDING_CHEST) item.usage = 5;
        if (item.type === itemType.BUILDING_CAMP) item.storedUnits = [];
        return item;
    }

    function removeObjectProbPlacement(game, r, c) {
        if (typeof window === 'undefined') return;
        const key = 'kov_field_object_prob_v1';
        let placements = null;
        try {
            const raw = localStorage.getItem(key);
            if (raw) placements = JSON.parse(raw);
        } catch (e) { }
        if (!Array.isArray(placements)) return;
        const next = placements.filter((p) => !(p.r === r && p.c === c));
        if (next.length === placements.length) return;
        try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) { }
    }

    function clearFieldObjectFromMap(game, r, c, deps) {
        const base = deps.FIELD_TERRAIN_DATA?.[r]?.[c];
        if (base !== undefined && base !== null) deps.FIELD_MAP_DATA[r][c] = base;
        else deps.FIELD_MAP_DATA[r][c] = 100;
        removeObjectProbPlacement(game, r, c);
    }

    function initFieldMap() {
        console.log('Field Map Initialized');
    }

    global.KOVFieldStateModule = {
        getFieldResourceState,
        getAbilityValue,
        getFieldLevel,
        getStatueBuff,
        getRuinsBonus,
        getFieldResourceConfig,
        buildFieldRegions,
        getRegionIdAt,
        getAdjacentRegionIds,
        getAdjacentRegionKey,
        getArmyRegionId,
        isBorderOpen,
        isTileBlocked,
        recalcFieldBonuses,
        collectFieldResource,
        collectFieldObjectToMerge,
        getCollectibleFieldItemInfo,
        createMergeItemFromInfo,
        removeObjectProbPlacement,
        clearFieldObjectFromMap,
        initFieldMap
    };
})(window);


