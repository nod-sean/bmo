(function (global) {
    'use strict';
    function getDungeonEventKey(game, r, c) {
        return `dungeon:${r},${c}`;
    }

    function getDungeonCooldownRemainingMs(game, r, c, deps) {
        const gp = deps.GAMEPLAY || deps;
        const key = getDungeonEventKey(game, r, c);
        const lastAt = Number(game.dungeonState?.cooldownByKey?.[key] || 0);
        if (!lastAt) return 0;
        const cooldownMs = Number(gp.DUNGEON_COOLDOWN_MS);
        if (cooldownMs <= 0) return 0;
        return Math.max(0, (lastAt + cooldownMs) - Date.now());
    }

    function canEnterDungeon(game, r, c, showToast, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (!gp.ENABLE_DUNGEON) {
            if (showToast) window.KOVUiShellModule.showToast(game, game.tr('toast.feature_disabled_beta', {}, 'This feature is disabled in beta.'));
            return false;
        }
        const remainingMs = getDungeonCooldownRemainingMs(game, r, c, deps);
        if (remainingMs > 0) {
            if (showToast) {
                const time = window.KOVUiFormatModule.formatDurationCompact(remainingMs);
                window.KOVUiShellModule.showToast(game, game.tr('toast.dungeon_cooldown', { time }, `Dungeon cooldown: ${time}`));
            }
            return false;
        }
        if (game.gold < gp.DUNGEON_ENTRY_GOLD_COST) {
            if (showToast) window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short_cost', { cost: gp.DUNGEON_ENTRY_GOLD_COST }, `Not enough gold (${gp.DUNGEON_ENTRY_GOLD_COST})`));
            return false;
        }
        if (game.energy < gp.DUNGEON_ENTRY_ENERGY_COST) {
            if (showToast) window.KOVUiShellModule.showToast(game, game.tr('toast.energy_short_cost', { cost: gp.DUNGEON_ENTRY_ENERGY_COST }, `Not enough energy (${gp.DUNGEON_ENTRY_ENERGY_COST})`));
            return false;
        }
        if (game.cp < gp.DUNGEON_ENTRY_CP_COST) {
            if (showToast) window.KOVUiShellModule.showToast(game, game.tr('toast.cp_short_cost', { cost: gp.DUNGEON_ENTRY_CP_COST }, `Not enough CP (${gp.DUNGEON_ENTRY_CP_COST})`));
            return false;
        }
        return true;
    }

    function consumeDungeonEntry(game, r, c, deps) {
        const gp = deps.GAMEPLAY || deps;
        const key = getDungeonEventKey(game, r, c);
        if (!game.dungeonState || typeof game.dungeonState !== 'object') game.dungeonState = { cooldownByKey: {} };
        if (!game.dungeonState.cooldownByKey || typeof game.dungeonState.cooldownByKey !== 'object') game.dungeonState.cooldownByKey = {};
        game.gold = Math.max(0, game.gold - gp.DUNGEON_ENTRY_GOLD_COST);
        game.energy = Math.max(0, game.energy - gp.DUNGEON_ENTRY_ENERGY_COST);
        game.cp = Math.max(0, game.cp - gp.DUNGEON_ENTRY_CP_COST);
        game.dungeonState.cooldownByKey[key] = Date.now();
        window.KOVUiShellModule.showToast(game, game.tr(
            'toast.dungeon_entry_paid',
            { gold: gp.DUNGEON_ENTRY_GOLD_COST, energy: gp.DUNGEON_ENTRY_ENERGY_COST, cp: gp.DUNGEON_ENTRY_CP_COST },
            `Dungeon entry: -${gp.DUNGEON_ENTRY_GOLD_COST}G -${gp.DUNGEON_ENTRY_ENERGY_COST}EN -${gp.DUNGEON_ENTRY_CP_COST}CP`
        ));
    }

    function openCaravanShop(game, r, c, deps) {
        if (window.KOVWorldSeasonModule.guardWorldAction(
            game,
            game.tr('ui.field.action.caravan', {}, 'Caravan'),
            window.KOVWorldSeasonModule.ensureWorldState(game),
            window.KOVWorldSeasonModule.getActiveWorldEndConditions(game, game.worldAdminDeps)
        )) return;
        const rr = Number.isFinite(Number(r)) ? Number(r) : -1;
        const cc = Number.isFinite(Number(c)) ? Number(c) : -1;
        const key = `caravan:${rr},${cc}`;
        const state = game.fieldShopState[key] || { lastRefresh: Date.now(), items: [] };
        const interval = 3 * 60 * 60 * 1000;
        const now = Date.now();
        if (now - state.lastRefresh >= interval || !state.items || state.items.length === 0) {
            state.lastRefresh = now;
            state.items = window.KOVShopModule.buildShopCatalog(game, deps.FIELD_EVENT_TYPES.CARAVAN, game.shopDeps).map((item) => ({ ...item, sold: false, restock: false }));
        }
        game.fieldShopState[key] = state;
        game.currentShopContext = { type: deps.FIELD_EVENT_TYPES.CARAVAN, r: rr, c: cc, key };
        window.KOVShopModule.renderShopModal(game, deps.FIELD_EVENT_TYPES.CARAVAN, rr, cc, state, game.shopDeps);
    }

    function getPortalDestination(game, fromR, fromC, deps) {
        const portals = Object.values(game.fieldEvents || {})
            .filter((evt) => evt && evt.type === deps.FIELD_EVENT_TYPES.PORTAL)
            .sort((a, b) => (a.r - b.r) || (a.c - b.c));
        if (portals.length <= 1) return null;
        const idx = portals.findIndex((evt) => evt.r === fromR && evt.c === fromC);
        if (idx === -1) return portals[0];
        return portals[(idx + 1) % portals.length];
    }

    function getRandomPortalFallback(game, deps) {
        let attempts = 0;
        while (attempts < 100) {
            const r = Math.floor(Math.random() * deps.MAP_SIZE);
            const c = Math.floor(Math.random() * deps.MAP_SIZE);
            const terrain = deps.FIELD_MAP_DATA?.[r]?.[c];
            if (terrain !== 0 && !deps.isBorderTerrain(terrain)) return { r, c };
            attempts++;
        }
        return null;
    }

    function getPortalActorArmy(game, preferredArmyId = null) {
        if (preferredArmyId !== null && preferredArmyId !== undefined) {
            const byId = game.armies.find((a) => a && a.id === preferredArmyId);
            if (byId) return byId;
        }
        if (game.selectedArmyId !== null && game.selectedArmyId !== undefined) {
            const selected = game.armies[game.selectedArmyId];
            if (selected) return selected;
        }
        return game.armies.find((a) => a && a.state === 'IDLE') || null;
    }

    function populateFieldEvents(game, deps) {
        if (Object.keys(game.fieldEvents).length > 0) return;
        const gp = deps.GAMEPLAY || {};
        for (let r = 0; r < deps.MAP_SIZE; r++) {
            for (let c = 0; c < deps.MAP_SIZE; c++) {
                const terrain = deps.FIELD_MAP_DATA[r][c];
                if (terrain === 0) continue;
                if (deps.isBlockingField(terrain)) continue;
                if (deps.isBorderTerrain(terrain)) continue;
                if (Math.abs(r - deps.PLAYER_START.r) < 3 && Math.abs(c - deps.PLAYER_START.c) < 3) continue;
                const rand = Math.random() * 1000;
                let cumulative = 0;
                for (const [type, rate] of Object.entries(deps.FIELD_EVENT_RATES)) {
                    const nType = Number(type);
                    if (!gp.ENABLE_DUNGEON && nType === deps.FIELD_EVENT_TYPES.DUNGEON) continue;
                    if (!gp.ENABLE_PORTAL && nType === deps.FIELD_EVENT_TYPES.PORTAL) continue;
                    cumulative += rate;
                    if (rand < cumulative) {
                        game.fieldEvents[`${r},${c}`] = { type: nType, id: `evt_${r}_${c}`, r, c };
                        break;
                    }
                }
            }
        }
        if (gp.ENABLE_CROWN_CASTLE) window.KOVFieldEconomyModule.ensureCrownEventSpawned(game, {
            GAMEPLAY: gp,
            FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES,
            MAP_SIZE: deps.MAP_SIZE,
            FIELD_MAP_DATA: deps.FIELD_MAP_DATA,
            PLAYER_START: deps.PLAYER_START,
            isBlockingField: deps.isBlockingField,
            isBorderTerrain: deps.isBorderTerrain
        });
    }

    function revealFog(game, r, c, radius, deps) {
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                const nr = r + i;
                const nc = c + j;
                if (nr >= 0 && nr < deps.MAP_SIZE && nc >= 0 && nc < deps.MAP_SIZE) {
                    const key = `${nr},${nc}`;
                    if (!game.visibilityMap.has(key)) {
                        game.visibilityMap.add(key);
                        const cell = document.getElementById(`field-cell-${nr}-${nc}`);
                        if (cell) {
                            cell.classList.remove('field-fog');
                            if (!cell.classList.contains('field-occupied') && !cell.classList.contains('field-adjacent')) cell.style.opacity = 0.3;
                            else if (cell.classList.contains('field-adjacent')) cell.style.opacity = 0.6;
                        }
                    }
                }
            }
        }
    }

    function getFieldObjectData(game, type, deps) {
        if (type === deps.FIELD_EVENT_TYPES.BANDIT || type === deps.FIELD_EVENT_TYPES.BANDIT_LEADER || type === deps.FIELD_EVENT_TYPES.DUNGEON || type === deps.FIELD_EVENT_TYPES.CROWN) {
            const defenders = window.KOVBattleCoreModule.getFieldDefenders(type, {
                FIELD_EVENT_TYPES: deps.FIELD_EVENT_TYPES,
                ITEM_TYPE: deps.ITEM_TYPE,
                isDragonTile: deps.isDragonTile
            });
            return {
                name: type === deps.FIELD_EVENT_TYPES.BANDIT
                    ? game.tr('ui.field.event.bandit', {}, 'Bandit')
                    : (type === deps.FIELD_EVENT_TYPES.BANDIT_LEADER
                        ? game.tr('ui.field.event.bandit_leader', {}, 'Bandit Leader')
                        : (type === deps.FIELD_EVENT_TYPES.DUNGEON
                            ? game.tr('ui.field.event.dungeon', {}, 'Dungeon')
                            : game.tr('ui.field.event.crown', {}, 'Crown'))),
                level: type === deps.FIELD_EVENT_TYPES.CROWN ? 7 : (type === deps.FIELD_EVENT_TYPES.DUNGEON ? 5 : (type === deps.FIELD_EVENT_TYPES.BANDIT_LEADER ? 3 : 1)),
                defenders,
                abilities: []
            };
        }
        const data = deps.getFieldObjectDataByType(type);
        if (deps.isDragonTile(type)) {
            const defenders = Array.isArray(data?.defenders) ? window.KOVBattleCoreModule.cloneDefenders(data.defenders) : [];
            if (!defenders.length) defenders.push({ code: deps.ITEM_TYPE.UNIT_DRAGON, count: 1, slot: 4 });
            return {
                code: Number.isFinite(Number(data?.code)) ? Number(data.code) : type,
                name: data?.name || 'Ancient Dragon',
                level: Number.isFinite(Number(data?.level)) ? Number(data.level) : 99,
                defenders,
                abilities: Array.isArray(data?.abilities) ? data.abilities : []
            };
        }
        if (data) return data;
        return null;
    }

    global.KOVFieldEventLogicModule = {
        getDungeonEventKey,
        getDungeonCooldownRemainingMs,
        canEnterDungeon,
        consumeDungeonEntry,
        openCaravanShop,
        getPortalDestination,
        getRandomPortalFallback,
        getPortalActorArmy,
        populateFieldEvents,
        revealFog,
        getFieldObjectData
    };
})(window);


