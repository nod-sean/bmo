(function (global) {
    'use strict';

    function calcItemPrice(type, level) {
        if (type >= 0 && type < 10) return Math.max(5, 5 + (Number(level || 1) - 1) * 5);
        return 20;
    }

    function getItemIcon(type) {
        if (type === 1 || type === 20) return 'G';
        if (type === 2 || type === 21) return 'EN';
        if (type === 3 || type === 22) return 'CR';
        if (type === 4) return 'CP';
        if (type === 5 || type === 23) return 'AP';
        return '?';
    }

    function getAssetSrc(game, type, level) {
        const img = game.assets.getImage(type, level);
        return img && img.src ? img.src : '';
    }

    function placeUnitInSquad(item, squad) {
        for (let i = 0; i < squad.length; i++) {
            if (!squad[i]) {
                item.scale = 1.3;
                squad[i] = item;
                return i;
            }
        }
        return -1;
    }

    function placeUnitPreferred(game, item, deps) {
        const Z = deps?.ZONES || { SQUAD1: 'SQUAD1', SQUAD2: 'SQUAD2', SQUAD3: 'SQUAD3', GRID: 'GRID' };
        let idx = placeUnitInSquad(item, game.squad1);
        if (idx !== -1) return { placed: true, zone: Z.SQUAD1, idx };
        idx = placeUnitInSquad(item, game.squad2);
        if (idx !== -1) return { placed: true, zone: Z.SQUAD2, idx };
        if (game.thirdSquadUnlocked) {
            idx = placeUnitInSquad(item, game.squad3);
            if (idx !== -1) return { placed: true, zone: Z.SQUAD3, idx };
        }
        if (window.KOVMergeBoardModule.spawnItem(game, item, game.spawnItemDeps)) return { placed: true, zone: Z.GRID, idx: null };
        return { placed: false };
    }

    function calcMercPrice(code, deps) {
        const info = deps.getInfoFromCode(code);
        const stats = deps.UNIT_STATS[code];
        const lv = info.level || 1;
        if (!stats) return lv * 120;
        return Math.max(80, (stats.sell + 1) * 100);
    }

    function getShopItemKey(item) {
        if (!item) return '';
        if (item.kind === 'item') return `item:${item.code ?? `${item.type}:${item.level}`}`;
        return `unit:${item.code ?? `${item.name}:${item.level}`}`;
    }

    function buildShopCatalog(game, type, deps) {
        const level = window.KOVFieldStateModule.getFieldLevel(game, type, game.fieldLevelDeps);
        if (type === deps.FIELD_EVENT_TYPES.CARAVAN) {
            const maxUnitLevel = Math.max(2, Math.min(10, Math.floor(game.lordLevel / 20) + 3));
            const itemCodes = Object.keys(deps.ITEM_TABLE).map((n) => parseInt(n, 10))
                .filter((code) => {
                    const info = deps.getInfoFromCode(code);
                    const data = deps.ITEM_TABLE[code];
                    return Number.isFinite(code) && !!info && !!data && info.type >= deps.ITEM_TYPE.ITEM_GOLD && info.type <= deps.ITEM_TYPE.ITEM_AP;
                });
            const unitCodes = Object.keys(deps.UNIT_STATS).map((n) => parseInt(n, 10))
                .filter((code) => {
                    const info = deps.getInfoFromCode(code);
                    const isUnlocked = game.progressionState && game.progressionState.unlockedUnits && game.progressionState.unlockedUnits.includes(code);
                    return Number.isFinite(code) && !!info && info.type >= deps.ITEM_TYPE.UNIT_INFANTRY && info.type <= deps.ITEM_TYPE.UNIT_CAVALRY && info.level <= maxUnitLevel && isUnlocked;
                });
            itemCodes.sort(() => Math.random() - 0.5);
            unitCodes.sort(() => Math.random() - 0.5);

            const items = itemCodes.slice(0, 2).map((code) => {
                const info = deps.getInfoFromCode(code);
                const data = deps.ITEM_TABLE[code] || {};
                const basePrice = calcItemPrice(info.type, info.level);
                return {
                    kind: 'item',
                    code,
                    name: data.name_kr || data.name || `Item Lv.${info.level}`,
                    icon: getItemIcon(info.type),
                    type: info.type,
                    level: info.level,
                    earn: Number(data.earn || 0),
                    price: Math.max(1, Math.floor(basePrice * 0.85))
                };
            });
            const units = unitCodes.slice(0, 2).map((code) => {
                const info = deps.getInfoFromCode(code);
                const stat = deps.UNIT_STATS[code] || {};
                const basePrice = calcMercPrice(code, deps);
                return {
                    kind: 'unit',
                    code,
                    name: stat.name || stat.name_kr || `Unit Lv.${info.level}`,
                    level: info.level,
                    price: Math.max(1, Math.floor(basePrice * 0.9))
                };
            });
            return [...items, ...units].sort(() => Math.random() - 0.5);
        }

        if (deps.isShopTile(type)) {
            const codes = Object.keys(deps.ITEM_TABLE).map((n) => parseInt(n, 10))
                .filter((code) => {
                    const info = deps.getInfoFromCode(code);
                    const data = deps.ITEM_TABLE[code];
                    return Number.isFinite(code) && !!info && !!data && info.type >= deps.ITEM_TYPE.ITEM_GOLD && info.type <= deps.ITEM_TYPE.ITEM_AP;
                });
            codes.sort(() => Math.random() - 0.5);
            return codes.slice(0, 3).map((code) => {
                const info = deps.getInfoFromCode(code);
                const data = deps.ITEM_TABLE[code] || {};
                return {
                    kind: 'item',
                    code,
                    name: data.name_kr || data.name || `Item Lv.${info.level}`,
                    icon: getItemIcon(info.type),
                    type: info.type,
                    level: info.level,
                    earn: Number(data.earn || 0),
                    price: calcItemPrice(info.type, info.level)
                };
            });
        }

        if (deps.isTavernTile(type)) {
            const pool = Object.keys(deps.UNIT_STATS).map((n) => parseInt(n, 10))
                .filter((code) => {
                    const info = deps.getInfoFromCode(code);
                    const isUnlocked = game.progressionState && game.progressionState.unlockedUnits && game.progressionState.unlockedUnits.includes(code);
                    return Number.isFinite(code) && !!info && info.type >= deps.ITEM_TYPE.UNIT_INFANTRY && info.type <= deps.ITEM_TYPE.UNIT_CAVALRY && info.level <= 5 && isUnlocked;
                });
            pool.sort(() => Math.random() - 0.5);
            return pool.slice(0, 3).map((code) => {
                const info = deps.getInfoFromCode(code);
                const stat = deps.UNIT_STATS[code] || {};
                return {
                    kind: 'unit',
                    code,
                    name: stat.name || stat.name_kr || `Unit Lv.${info.level}`,
                    level: info.level,
                    price: calcMercPrice(code, deps)
                };
            });
        }

        return [];
    }

    function buyFieldItem(game, item, deps) {
        if (item.sold) { window.KOVUiShellModule.showToast(game, game.tr('toast.sold_out', {}, 'Sold out')); return; }
        if (game.gold < item.price) { window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short', {}, 'Not enough gold')); return; }

        if (game.onlineMode && window.KOVServerApiModule?.EconomyApi) {
            window.KOVServerApiModule.EconomyApi.buyShopItem({
                type: item.type,
                level: item.level,
                cost: item.price,
                kind: item.kind,
                code: item.code
            }).then(res => {
                if (res && res.success) {
                    const data = res.data || {};
                    if (data.resources) game.gold = data.resources.gold;
                    
                    // Use local spawn logic to show visual effect
                    // Ideally we should use res.targetId to force location, but spawnItem is deterministic
                    window.KOVMergeBoardModule.spawnItem(game, { type: item.type, level: item.level, scale: 0 }, game.spawnItemDeps);
                    
                    game.sound.playCollect();
                    window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
                    window.KOVUiShellModule.showToast(game, game.tr('toast.purchase_done', {}, 'Purchased'));
                    item.sold = true;
                    refreshShopModal(game, deps);
                } else {
                    const msg = res?.error?.message || res?.err?.msg || 'Purchase failed';
                    const code = res?.error?.code || res?.err?.code;
                    if (code === 'inventory_full') window.KOVUiShellModule.showToast(game, game.tr('toast.space_short', {}, 'No space available'));
                    else window.KOVUiShellModule.showToast(game, msg);
                }
            }).catch(err => {
                 window.KOVUiShellModule.showToast(game, 'Network error');
            });
            return;
        }

        if (!window.KOVMergeBoardModule.spawnItem(game, { type: item.type, level: item.level, scale: 0 }, game.spawnItemDeps)) { window.KOVUiShellModule.showToast(game, game.tr('toast.space_short', {}, 'No space available')); return; }
        game.gold -= item.price;
        game.sound.playCollect();
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        window.KOVUiShellModule.showToast(game, game.tr('toast.purchase_done', {}, 'Purchased'));
        item.sold = true;
        refreshShopModal(game, deps);
    }

    function hireMercenary(game, item, deps) {
        if (item.sold) { window.KOVUiShellModule.showToast(game, game.tr('toast.sold_out', {}, 'Sold out')); return; }
        if (game.gold < item.price) { window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short', {}, 'Not enough gold')); return; }
        const info = deps.getInfoFromCode(item.code);
        const placed = placeUnitPreferred(game, { type: info.type, level: info.level, scale: 0 }, deps);
        if (!placed.placed) { window.KOVUiShellModule.showToast(game, game.tr('toast.space_short', {}, 'No space available')); return; }
        game.gold -= item.price;
        game.sound.playSpawn();
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        if (placed.zone === deps.ZONES.SQUAD1 || placed.zone === deps.ZONES.SQUAD2) {
            playSquadJoinFx(game, placed.zone, placed.idx, deps);
        }
        window.KOVUiShellModule.showToast(game, game.tr('toast.recruit_done', {}, 'Hired'));
        item.sold = true;
        refreshShopModal(game, deps);
    }

    function playSquadJoinFx(game, zone, idx, deps) {
        if (idx === null || idx === undefined) return;
        const Z = deps?.ZONES || { SQUAD1: 'SQUAD1', SQUAD2: 'SQUAD2', SQUAD3: 'SQUAD3' };
        const rect = zone === Z.SQUAD1 ? game.squad1Rect : (zone === Z.SQUAD2 ? game.squad2Rect : game.squad3Rect);
        const size = game.squadCellSize;
        const x = rect.x + (idx % 3) * size + size / 2;
        const y = rect.y + Math.floor(idx / 3) * size + size / 2;
        game.spawnParticles(x, y, '#4ade80', 16, 'spark');
        const name = zone === Z.SQUAD1
            ? game.tr('ui.squad.joined', { index: 1 }, 'Squad 1 joined')
            : (zone === Z.SQUAD2
                ? game.tr('ui.squad.joined', { index: 2 }, 'Squad 2 joined')
                : game.tr('ui.squad.joined', { index: 3 }, 'Squad 3 joined'));
        window.KOVUiShellModule.showJoinNotice(name);
        game.requestRender();
    }

    function openShopOrTavern(game, type, r, c, deps = game?.shopDeps || {}) {
        if (window.KOVWorldSeasonModule.guardWorldAction(
            game,
            game.tr('ui.field.action.open_shop', {}, 'Shop'),
            window.KOVWorldSeasonModule.ensureWorldState(game),
            window.KOVWorldSeasonModule.getActiveWorldEndConditions(game, game.worldAdminDeps)
        )) return;
        const key = `${r},${c}`;
        if (!game.occupiedTiles.has(key)) { window.KOVUiShellModule.showToast(game, game.tr('toast.use_after_capture', {}, 'Usable after capture')); return; }
        const state = game.fieldShopState[key] || { lastRefresh: Date.now(), items: [] };
        const interval = 3 * 60 * 60 * 1000;
        const now = Date.now();
        if (now - state.lastRefresh >= interval || !state.items || state.items.length === 0) {
            state.lastRefresh = now;
            state.items = buildShopCatalog(game, type, deps).map((item) => ({ ...item, sold: false, restock: false }));
        }
        game.fieldShopState[key] = state;
        game.currentShopContext = { type, r, c };
        renderShopModal(game, type, r, c, state, deps);
    }

    function refreshShopModal(game, deps) {
        if (!game.currentShopContext) return;
        const { type, r, c, key: contextKey } = game.currentShopContext;
        const key = contextKey || `${r},${c}`;
        const state = game.fieldShopState[key];
        if (!state) return;
        if (!document.getElementById('modal-object')?.classList.contains('open')) return;

        const now = Date.now();
        const interval = 3 * 60 * 60 * 1000;
        if (now - state.lastRefresh >= interval) {
            const prevSoldKeys = new Set((state.items || []).filter((i) => i.sold).map((i) => getShopItemKey(i)));
            state.lastRefresh = now;
            state.items = buildShopCatalog(game, type, deps).map((item) => ({
                ...item,
                sold: false,
                restock: prevSoldKeys.has(getShopItemKey(item))
            }));
            state.justRefreshed = true;
            game.fieldShopState[key] = state;
        }
        renderShopModal(game, type, r, c, state, deps);
    }

    function renderShopModal(game, type, r, c, state, deps) {
        const interval = 3 * 60 * 60 * 1000;
        const now = Date.now();
        const next = state.lastRefresh + interval;
        const remain = window.KOVUiFormatModule.formatTimeLeft(next - now);
        const isCaravan = type === deps.FIELD_EVENT_TYPES.CARAVAN;
        const name = isCaravan ? game.tr('ui.modal.caravan_title', {}, 'Caravan Shop') : window.KOVFieldNavigationModule.objectTypeNameByCode(game, type, game.fieldNavDeps);
        const level = window.KOVFieldStateModule.getFieldLevel(game, type, game.fieldLevelDeps);

        const modal = document.getElementById('modal-object');
        const title = document.getElementById('object-modal-title');
        const body = document.getElementById('object-modal-body');
        if (!modal || !title || !body) return;
        modal.style.display = '';
        modal.classList.add('open');
        title.innerText = name;
        body.innerHTML = '';
        modal.querySelector('.modal-content')?.classList.add('wide');

        const header = document.createElement('div');
        header.className = 'shop-header';
        const titleText = isCaravan ? name : `${name} Lv.${level}`;
        header.innerHTML = `<div class="shop-title">${titleText}</div><div class="shop-refresh">${game.tr('ui.shop.refresh_in', {}, 'Refresh in')}: <span id="shop-refresh-timer">${remain}</span></div>`;
        body.appendChild(header);

        const list = document.createElement('div');
        list.className = 'shop-list';
        const soldOutLabel = game.tr('ui.shop.sold_out', {}, 'SOLD OUT');
        const yieldLabel = game.tr('ui.shop.yield', {}, 'Yield');
        const hireUnitLabel = game.tr('ui.shop.hire_unit', {}, 'Hire unit');

        state.items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'shop-card';
            if (item.restock) row.classList.add('restock');

            if (item.kind === 'item') {
                const imgSrc = getAssetSrc(game, item.type, item.level);
                const iconHtml = imgSrc
                    ? `<div class="shop-icon"><img class="shop-icon-img" src="${imgSrc}" alt=""></div>`
                    : `<div class="shop-icon">${item.icon || getItemIcon(item.type)}</div>`;
                row.innerHTML = `
                    <div class="shop-row">${iconHtml}<div><div class="name">${item.name}</div><div class="level">Lv.${item.level}</div><div class="meta">${yieldLabel} +${item.earn}</div></div></div>
                    <button class="price-btn">${item.sold ? soldOutLabel : `G ${item.price}`}</button>
                `;
                const btn = row.querySelector('.price-btn');
                const affordable = game.gold >= item.price;
                const isUnlocked = game.progressionState && game.progressionState.unlockedUnits && game.progressionState.unlockedUnits.includes(item.code);
                if (item.sold || !affordable || !isUnlocked) row.classList.add('disabled');
                btn.onclick = () => {
                    if (item.sold) { window.KOVUiShellModule.showToast(game, game.tr('toast.sold_out', {}, 'Sold out')); return; }
                    if (!affordable) { window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short', {}, 'Not enough gold')); return; }
                    if (!isUnlocked) { window.KOVUiShellModule.showToast(game, game.tr('toast.unit_locked', {}, 'Unit not unlocked')); return; }
                    buyFieldItem(game, item, deps);
                };
            } else {
                const info = deps.getInfoFromCode(item.code);
                const imgSrc = getAssetSrc(game, info.type, info.level);
                const iconHtml = imgSrc
                    ? `<div class="shop-icon"><img class="shop-icon-img" src="${imgSrc}" alt=""></div>`
                    : '<div class="shop-icon">UN</div>';
                row.innerHTML = `
                    <div class="shop-row">${iconHtml}<div><div class="name">${item.name}</div><div class="level">Lv.${item.level}</div><div class="meta">${hireUnitLabel}</div></div></div>
                    <button class="price-btn">${item.sold ? soldOutLabel : `G ${item.price}`}</button>
                `;
                const btn = row.querySelector('.price-btn');
                const affordable = game.gold >= item.price;
                if (item.sold || !affordable) row.classList.add('disabled');
                btn.onclick = () => {
                    if (item.sold) { window.KOVUiShellModule.showToast(game, game.tr('toast.sold_out', {}, 'Sold out')); return; }
                    if (!affordable) { window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short', {}, 'Not enough gold')); return; }
                    hireMercenary(game, item, deps);
                };
            }
            list.appendChild(row);
        });

        state.items.forEach((item) => { item.restock = false; });
        state.justRefreshed = false;
        body.appendChild(list);
        modal.classList.add('open');

        if (game.shopTimer) clearInterval(game.shopTimer);
        game.shopTimer = setInterval(() => {
            if (!modal.classList.contains('open')) { clearInterval(game.shopTimer); game.shopTimer = null; return; }
            const el = document.getElementById('shop-refresh-timer');
            if (el) el.innerText = window.KOVUiFormatModule.formatTimeLeft(next - Date.now());
        }, 1000);
    }

    global.KOVShopModule = {
        calcItemPrice,
        getItemIcon,
        getAssetSrc,
        placeUnitInSquad,
        placeUnitPreferred,
        calcMercPrice,
        getShopItemKey,
        buildShopCatalog,
        buyFieldItem,
        hireMercenary,
        playSquadJoinFx,
        refreshShopModal,
        openShopOrTavern,
        renderShopModal
    };
})(window);


