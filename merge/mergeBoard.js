(function (global) {
    'use strict';

    function locationToId(loc, deps) {
        if (!loc) return null;
        if (loc.zone === deps.ZONES.GRID) return `grid_${loc.r}_${loc.c}`;
        if (loc.zone === deps.ZONES.SQUAD1) return `squad1_${loc.idx}`;
        if (loc.zone === deps.ZONES.SQUAD2) return `squad2_${loc.idx}`;
        if (loc.zone === deps.ZONES.SQUAD3) return `squad3_${loc.idx}`;
        return null;
    }

    async function syncAction(game, type, payload) {
        if (game.isOfflineMode || !window.KOVServerApiModule?.MergeApi) return true;
        try {
            const res = await window.KOVServerApiModule.MergeApi.executeAction({ type, payload });
            
            if (res && res.xpGained && game.runtime && game.runtime.getProgressionState) {
                // Background sync progression to catch level ups
                game.runtime.getProgressionState(game).then(progRes => {
                    if (progRes && progRes.success && progRes.data) {
                        const pd = progRes.data;
                        if (Number.isFinite(pd.level)) game.lordLevel = pd.level;
                        if (Number.isFinite(pd.xp)) game.currentXp = pd.xp;
                        if (Number.isFinite(pd.energy)) game.energy = pd.energy;
                        if (Number.isFinite(pd.cp)) game.cp = pd.cp;
                        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
                    }
                }).catch(() => {});
            }
            
            return true;
        } catch (err) {
            console.error(`Merge action ${type} failed:`, err);
            try {
                const stateRes = await window.KOVServerApiModule.MergeApi.getState();
                if (stateRes && stateRes.data && window.KOVMergeControllerModule?.applyMergeState) {
                    window.KOVMergeControllerModule.applyMergeState(game, stateRes.data);
                }
            } catch (rErr) {
                console.error('Rollback fetch failed:', rErr);
            }
            return false;
        }
    }

    function selectItem(game, item, location, deps) {
        if (game.selectedItem?.item !== item) game.sound.playClick();
        game.selectedItem = item ? { item, location } : null;
        updateInfoPanel(game, deps);
        game.requestRender();
    }

    function updateInfoPanel(game, deps) {
        const els = {
            name: document.getElementById('info-name'),
            desc: document.getElementById('info-desc'),
            cls: document.getElementById('info-class'),
            stats: document.getElementById('unit-stats-grid'),
            btn: document.getElementById('btn-action'),
            lbl: document.getElementById('action-label'),
            icon: document.getElementById('action-icon'),
            panel: document.getElementById('info-panel')
        };

        if (!game.selectedItem) {
            if (els.panel) els.panel.style.display = 'flex';
            els.stats.classList.add('hidden');
            els.cls.innerText = '';
            els.btn.style.opacity = 0.5;
            els.lbl.innerText = game.tr('ui.common.none', {}, '-');
            els.name.innerText = game.tr('ui.info.no_selection', {}, 'No selection');
            els.desc.innerText = game.tr('ui.info.select_hint', {}, 'Select an item to see details.');
            return;
        }

        if (els.panel) els.panel.style.display = 'flex';
        els.stats.classList.add('hidden');
        els.cls.innerText = '';
        els.btn.style.opacity = 0.5;
        els.lbl.innerText = game.tr('ui.common.none', {}, '-');

        const item = game.selectedItem.item;
        const data = deps.getData(item.type, item.level);
        els.name.innerText = `${data.name} LV.${item.level}`;
        if (item.type < 10) {
            if (item.type === deps.ITEM_TYPE.BUILDING_CHEST) {
                els.desc.innerText = game.tr('ui.info.chest_uses_left', { value: item.usage }, `Uses left: ${item.usage}`);
            } else if (item.type === deps.ITEM_TYPE.BUILDING_CAMP) {
                const current = item.storedUnits ? item.storedUnits.length : 0;
                const cap = deps.CAMP_CAPACITY[item.level];
                els.desc.innerText = game.tr('ui.info.camp_stored', { current, cap }, `Stored: ${current} / ${cap}`);
            } else {
                els.desc.innerText = game.tr('ui.info.produces_units', {}, 'Produces units');
                const cost = data.energy || 1;
                els.lbl.innerText = `-${cost}EN`;
                els.btn.style.opacity = 1;
                els.icon.innerText = '';
            }
        } else if (item.type >= 20) {
            els.desc.innerText = game.tr('ui.info.tap_to_collect', {}, 'Tap to collect');
            els.lbl.innerText = game.tr('ui.info.collect', {}, 'Collect');
            els.btn.style.opacity = 1;
        } else {
            els.cls.innerText = data.class;
            els.desc.innerText = '';
            els.stats.classList.remove('hidden');
            document.getElementById('st-hp').innerText = data.hp;
            document.getElementById('st-atk').innerText = data.atk;
            document.getElementById('st-def').innerText = data.def;
            document.getElementById('st-spd').innerText = data.spd;
            document.getElementById('st-rng').innerText = data.range || data.rng || 0;
            document.getElementById('st-mov').innerText = data.move || data.mov || 0;
            els.lbl.innerText = `+${data.sell}`;
            els.icon.innerText = 'G';
            els.btn.style.opacity = 1;
        }
    }

    function handleAction(game, deps) {
        if (!game.selectedItem) return;
        const { item, location } = game.selectedItem;
        if (item.type >= 10 && item.type < 20) {
            if (location.zone === deps.ZONES.GRID) game.grid[location.r][location.c] = null;
            else if (location.zone === deps.ZONES.SQUAD1) game.squad1[location.idx] = null;
            else if (location.zone === deps.ZONES.SQUAD2) game.squad2[location.idx] = null;
            else game.squad3[location.idx] = null;
            const val = deps.getData(item.type, item.level).sell;
            game.gold += val;
            window.KOVUiShellModule.showToast(game, game.tr('toast.gold_gain', { value: val }, `+${val} G`));
            game.sound.playCollect();
            selectItem(game, null, null, deps);
            window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
            game.requestRender();
            syncAction(game, 'sell', { targetId: locationToId(location, deps) });
        } else if (item.type < 10 && item.type !== deps.ITEM_TYPE.BUILDING_CHEST && item.type !== deps.ITEM_TYPE.BUILDING_CAMP) {
            produce(game, item, deps);
        }
    }

    function getZoneAt(game, x, y, deps) {
        const check = (rect, rows, cols, size) => {
            if (x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h) {
                const c = Math.floor((x - rect.x) / size);
                const r = Math.floor((y - rect.y) / size);
                if (c >= 0 && c < cols && r >= 0 && r < rows) return { c, r, idx: r * 3 + c };
            }
            return null;
        };
        let res = check(game.squad1Rect, deps.CONFIG.squadRows, deps.CONFIG.squadCols, game.squadCellSize);
        if (res) return { zone: deps.ZONES.SQUAD1, ...res };
        
        if (game.lordLevel >= 5) {
            res = check(game.squad2Rect, deps.CONFIG.squadRows, deps.CONFIG.squadCols, game.squadCellSize);
            if (res) return { zone: deps.ZONES.SQUAD2, ...res };
        }
        
        if (game.thirdSquadUnlocked && game.squad3Rect) {
            res = check(game.squad3Rect, deps.CONFIG.squadRows, deps.CONFIG.squadCols, game.squadCellSize);
            if (res) return { zone: deps.ZONES.SQUAD3, ...res };
        }
        if (
            x >= game.gridStartX && x < game.gridStartX + game.gridTileSize * deps.CONFIG.gridCols &&
            y >= game.gridStartY && y < game.gridStartY + game.gridTileSize * deps.CONFIG.gridRows
        ) {
            const c = Math.floor((x - game.gridStartX) / game.gridTileSize);
            const r = Math.floor((y - game.gridStartY) / game.gridTileSize);
            if (c >= 0 && c < deps.CONFIG.gridCols && r >= 0 && r < deps.CONFIG.gridRows) return { zone: deps.ZONES.GRID, r, c, idx: r * 8 + c };
        }
        return null;
    }

    function setupInput(game, deps) {
        const getPos = (e) => {
            const r = game.canvas.getBoundingClientRect();
            return {
                x: ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * (game.width / r.width),
                y: ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) * (game.width / r.width)
            };
        };
        const start = (e) => {
            game.sound.resume();
            const p = getPos(e);
            const hit = getZoneAt(game, p.x, p.y, deps);
            if (hit) {
                if (hit.zone === deps.ZONES.GRID && game.gridState[hit.r][hit.c].type !== deps.LOCK_TYPE.OPEN) {
                    tryUnlock(game, hit.r, hit.c, deps);
                    return;
                }
                const item = hit.zone === deps.ZONES.GRID
                    ? game.grid[hit.r][hit.c]
                    : (hit.zone === deps.ZONES.SQUAD1 ? game.squad1[hit.idx] : (hit.zone === deps.ZONES.SQUAD2 ? game.squad2[hit.idx] : game.squad3[hit.idx]));
                game.potentialDrag = { startPos: p, item, hit };
            } else {
                selectItem(game, null, null, deps);
            }
        };
        const move = (e) => {
            if (game.potentialDrag && !game.drag) {
                const p = getPos(e);
                if (Math.hypot(p.x - game.potentialDrag.startPos.x, p.y - game.potentialDrag.startPos.y) > 10 && game.potentialDrag.item) {
                    startDrag(game, game.potentialDrag.item, game.potentialDrag.hit, p, deps);
                }
            }
            if (game.drag) {
                game.drag.x = getPos(e).x;
                game.drag.y = getPos(e).y;
                game.hover = getZoneAt(game, game.drag.x, game.drag.y, deps);
                game.requestRender();
            }
        };
        const end = () => {
            if (game.drag) endDrag(game, deps);
            else if (game.potentialDrag) handleClick(game, game.potentialDrag.item, game.potentialDrag.hit, deps);
            game.potentialDrag = null;
            game.drag = null;
        };
        game.canvas.onmousedown = start;
        window.onmousemove = move;
        window.onmouseup = end;
        game.canvas.ontouchstart = (e) => { start(e); e.preventDefault(); };
        window.ontouchmove = (e) => { move(e); e.preventDefault(); };
        window.ontouchend = end;
    }

    function startDrag(game, item, hit, pos, deps) {
        let cx;
        let cy;
        if (hit.zone === deps.ZONES.GRID) {
            cx = game.gridStartX + hit.c * game.gridTileSize;
            cy = game.gridStartY + hit.r * game.gridTileSize;
        } else if (hit.zone === deps.ZONES.SQUAD1) {
            cx = game.squad1Rect.x + (hit.idx % 3) * game.squadCellSize;
            cy = game.squad1Rect.y + Math.floor(hit.idx / 3) * game.squadCellSize;
        } else if (hit.zone === deps.ZONES.SQUAD2) {
            cx = game.squad2Rect.x + (hit.idx % 3) * game.squadCellSize;
            cy = game.squad2Rect.y + Math.floor(hit.idx / 3) * game.squadCellSize;
        } else {
            cx = game.squad3Rect.x + (hit.idx % 3) * game.squadCellSize;
            cy = game.squad3Rect.y + Math.floor(hit.idx / 3) * game.squadCellSize;
        }
        game.drag = {
            item,
            startZone: hit,
            x: pos.x,
            y: pos.y,
            offsetX: pos.x - cx,
            offsetY: pos.y - cy,
            size: hit.zone === deps.ZONES.GRID ? game.gridTileSize : game.squadCellSize
        };
        if (hit.zone === deps.ZONES.GRID) game.grid[hit.r][hit.c] = null;
        else if (hit.zone === deps.ZONES.SQUAD1) game.squad1[hit.idx] = null;
        else if (hit.zone === deps.ZONES.SQUAD2) game.squad2[hit.idx] = null;
        else game.squad3[hit.idx] = null;
        selectItem(game, item, hit, deps);
        game.requestRender();
    }

    function endDrag(game, deps) {
        const hit = getZoneAt(game, game.drag.x, game.drag.y, deps);
        let returned = false;
        let actionPayload = null;
        if (hit) {
            let target = null;
            if (hit.zone === deps.ZONES.GRID) {
                if (game.gridState[hit.r][hit.c].type !== deps.LOCK_TYPE.OPEN) returned = true;
                else target = game.grid[hit.r][hit.c];
            } else if (hit.zone === deps.ZONES.SQUAD1) target = game.squad1[hit.idx];
            else if (hit.zone === deps.ZONES.SQUAD2) target = game.squad2[hit.idx];
            else target = game.squad3[hit.idx];
            if (!returned) {
                if (!target) {
                    if (hit.zone === deps.ZONES.GRID) game.grid[hit.r][hit.c] = game.drag.item;
                    else if (hit.zone === deps.ZONES.SQUAD1) game.squad1[hit.idx] = game.drag.item;
                    else if (hit.zone === deps.ZONES.SQUAD2) game.squad2[hit.idx] = game.drag.item;
                    else game.squad3[hit.idx] = game.drag.item;
                    selectItem(game, game.drag.item, hit, deps);
                    actionPayload = { type: 'move', fromId: locationToId(game.drag.startZone, deps), toId: locationToId(hit, deps) };
                } else if (target.type === deps.ITEM_TYPE.BUILDING_CAMP && game.drag.item.type >= 10 && game.drag.item.type < 20 && hit.zone === deps.ZONES.GRID) {
                    if (!target.storedUnits) target.storedUnits = [];
                    const cap = deps.CAMP_CAPACITY[target.level] || 4;
                    if (target.storedUnits.length < cap) {
                        target.storedUnits.push(game.drag.item);
                        window.KOVUiShellModule.showToast(game, game.tr('toast.stored', { current: target.storedUnits.length, cap }, `Stored (${target.storedUnits.length}/${cap})`));
                        game.sound.playClick();
                        actionPayload = { type: 'move', fromId: locationToId(game.drag.startZone, deps), toId: locationToId(hit, deps) };
                    } else {
                        window.KOVUiShellModule.showToast(game, game.tr('toast.camp_storage_full', {}, 'Camp storage is full.'));
                        returned = true;
                    }
                } else if (target.type === game.drag.item.type && target.level === game.drag.item.level) {
                    const isUnit = target.type >= 10 && target.type < 20;
                    const maxLvl = isUnit ? 10 : 5;
                    let canMerge = true;
                    if (isUnit) {
                        const bLvl = window.KOVFieldCommandModule.getHighestBuildingLevel(game, target.type, {
                            ITEM_TYPE: deps.ITEM_TYPE,
                            CONFIG: deps.CONFIG
                        });
                        if (target.level >= bLvl + 5) {
                            window.KOVUiShellModule.showToast(game, game.tr('toast.require_building_level', { level: target.level - 4 }, `Requires building level ${target.level - 4}`));
                            canMerge = false;
                            returned = true;
                        }
                    }
                    if (canMerge && target.level < maxLvl) {
                        target.level++;
                        target.scale = 1.3;
                        if (target.type === deps.ITEM_TYPE.BUILDING_CHEST) {
                            target.usage = Math.floor((target.usage + game.drag.item.usage) * 0.5);
                        }
                        const xp = deps.MERGE_XP_DATA[target.level - 1] || 1;
                        window.KOVGameCoreModule.addXp(game, xp);
                        window.KOVUiShellModule.showFloatingImage(game, 'xp', hit.zone === deps.ZONES.GRID ? game.gridStartX + hit.c * game.gridTileSize : game.drag.x, game.drag.y);
                        game.spawnParticles(game.drag.x, game.drag.y, '#FFD700', 30, 'spark');
                        game.sound.playMerge();
                        actionPayload = { type: 'move', fromId: locationToId(game.drag.startZone, deps), toId: locationToId(hit, deps) };
                    } else if (canMerge) {
                        window.KOVUiShellModule.showToast(game, game.tr('toast.max_level', {}, 'Max level reached'));
                        returned = true;
                    }
                } else {
                    returned = true;
                }
            }
        } else {
            returned = true;
        }
        if (returned) {
            const s = game.drag.startZone;
            if (s.zone === deps.ZONES.GRID) game.grid[s.r][s.c] = game.drag.item;
            else if (s.zone === deps.ZONES.SQUAD1) game.squad1[s.idx] = game.drag.item;
            else if (s.zone === deps.ZONES.SQUAD2) game.squad2[s.idx] = game.drag.item;
            else game.squad3[s.idx] = game.drag.item;
        } else if (actionPayload) {
            syncAction(game, actionPayload.type, actionPayload);
        }
        game.hover = null;
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        game.requestRender();
        game.drag = null;
    }

    function handleClick(game, item, hit, deps) {
        if (!item) {
            selectItem(game, null, null, deps);
            return;
        }
        selectItem(game, item, hit, deps);
        if (item.type >= 20) collectResource(game, item, hit.r, hit.c, deps);
        else if (item.type === deps.ITEM_TYPE.BUILDING_CAMP) ejectCamp(game, item, hit.r, hit.c, deps);
        else if (item.type < 10 && item.type !== deps.ITEM_TYPE.BUILDING_CAMP) {
            if (item.type === deps.ITEM_TYPE.BUILDING_CHEST) produceFromChest(game, item, hit.r, hit.c, deps);
            else produce(game, item, deps);
        }
    }

    function getSquadPower(game, squad, deps) {
        let p = 0;
        for (const u of squad) {
            if (!u || u.type < 10 || u.type >= 20) continue;
            const base = deps.getData(u.type, u.level);
            const d = window.KOVGameCoreModule.applyFieldBuffsToStats(game, base);
            if (d && d.hp) p += (d.hp + d.atk + d.def);
        }
        return p;
    }

    function drawSquad(game, data, rect, label, color, zone, deps) {
        let isLocked = false;
        let lockReason = '';
        if (zone === deps.ZONES.SQUAD2 && game.lordLevel < 5) {
            isLocked = true;
            lockReason = game.tr('ui.squad.unlock_lv', { level: 5 }, 'Unlock at Lv.5');
        }
        if (zone === deps.ZONES.SQUAD3 && !game.thirdSquadUnlocked) {
            isLocked = true;
            lockReason = game.tr('ui.squad.unlock_citadel', {}, 'Capture Citadel');
        }

        const cp = isLocked ? 0 : getSquadPower(game, data, deps);
        game.ctx.fillStyle = isLocked ? '#666' : color;
        game.ctx.font = 'bold 40px sans-serif';
        game.ctx.textAlign = 'center';
        game.ctx.fillText(`${label}`, rect.x + rect.w / 2, rect.y - 22);
        game.ctx.fillStyle = isLocked ? 'rgba(0,0,0,0.5)' : `${color}11`;
        game.ctx.fillRect(rect.x - 5, rect.y - 5, rect.w + 10, rect.h + 10);
        
        if (isLocked) {
            game.ctx.fillStyle = '#ff6b6b';
            game.ctx.font = 'bold 24px sans-serif';
            game.ctx.fillText(lockReason, rect.x + rect.w / 2, rect.y + rect.h / 2);
            return;
        }

        const powerShort = game.tr('ui.squad.power_short', {}, 'PWR');
        game.ctx.font = 'bold 34px sans-serif';
        game.ctx.fillStyle = '#fff';
        game.ctx.fillText(`${powerShort} ${cp}`, rect.x + rect.w / 2, rect.y + rect.h + 39);
        for (let i = 0; i < 9; i++) {
            const x = rect.x + (i % 3) * game.squadCellSize;
            const y = rect.y + Math.floor(i / 3) * game.squadCellSize;
            const isHover = game.hover && game.hover.zone === zone && game.hover.idx === i;
            const isSel = game.selectedItem && game.selectedItem.location.zone === zone && game.selectedItem.location.idx === i;
            drawCell(game, x, y, game.squadCellSize, data[i], { type: deps.LOCK_TYPE.OPEN }, isHover, isSel, deps);
        }
    }

    function drawCell(game, x, y, s, item, lock, isHover, isSel, deps) {
        const p = 2;
        const size = s - p * 2;
        game.ctx.fillStyle = lock.type === deps.LOCK_TYPE.OPEN ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.5)';
        game.ctx.fillRect(x + p, y + p, size, size);
        if (isSel) {
            game.ctx.lineWidth = 6;
            game.ctx.strokeStyle = '#0f0';
            game.ctx.strokeRect(x + p, y + p, size, size);
        } else if (isHover) {
            game.ctx.lineWidth = 4;
            game.ctx.strokeStyle = '#ff0';
            game.ctx.strokeRect(x + p, y + p, size, size);
        } else {
            game.ctx.lineWidth = 2;
            game.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            game.ctx.strokeRect(x + p, y + p, size, size);
        }
        if (lock.type !== deps.LOCK_TYPE.OPEN) {
            const img = game.assets.getImage(lock.type === deps.LOCK_TYPE.GOLD ? '1804' : 'lock');
            if (img && img.complete && img.naturalWidth > 0) {
                const isz = size * 0.6;
                game.ctx.drawImage(img, x + (s - isz) / 2, y + (s - isz) / 2, isz, isz);
                game.ctx.fillStyle = lock.type === deps.LOCK_TYPE.GOLD ? '#ffd700' : '#fff';
                game.ctx.font = 'bold 20px sans-serif';
                game.ctx.textAlign = 'center';
                game.ctx.strokeStyle = 'black';
                game.ctx.lineWidth = 4;
                const txt = lock.type === deps.LOCK_TYPE.GOLD ? ` ${lock.value}` : `LV.${lock.value}`;
                game.ctx.strokeText(txt, x + s / 2, y + s / 2);
                game.ctx.fillText(txt, x + s / 2, y + s / 2);
            }
        } else if (item && item !== game.drag?.item) {
            drawItem(game, x, y, s, item, false, deps);
        }
    }

    function drawItem(game, x, y, s, item, isDrag, deps) {
        const sc = isDrag ? 1.1 : item.scale;
        const p = 4;
        const ds = (s - p * 2) * sc;
        const img = game.assets.getImage(item.type, item.level);
        const lvColor = deps.LEVEL_COLORS[item.level] || '#fff';
        if (img && img.complete && img.naturalWidth > 0) {
            if (isDrag) {
                game.ctx.shadowColor = 'black';
                game.ctx.shadowBlur = 15;
            }
            const drawSize = ds * 1.2;
            const drawOffset = (s - drawSize) / 2;
            game.ctx.drawImage(img, x + drawOffset, y + drawOffset, drawSize, drawSize);
            game.ctx.shadowBlur = 0;
        } else {
            let c = '#cfd8dc';
            let sym = 'Info';
            if (item.type === deps.ITEM_TYPE.BUILDING_BARRACKS) { c = '#795548'; sym = 'BK'; }
            else if (item.type === deps.ITEM_TYPE.BUILDING_RANGE) { c = '#388e3c'; sym = 'RG'; }
            else if (item.type === deps.ITEM_TYPE.BUILDING_STABLE) { c = '#1976d2'; sym = 'ST'; }
            else if (item.type === deps.ITEM_TYPE.BUILDING_CHEST) { c = '#ffa000'; sym = 'CH'; }
            else if (item.type === deps.ITEM_TYPE.BUILDING_CAMP) { c = '#5d4037'; sym = 'CP'; }
            else if (item.type === deps.ITEM_TYPE.UNIT_INFANTRY) { c = '#eeeeee'; sym = 'IN'; }
            else if (item.type === deps.ITEM_TYPE.UNIT_ARCHER) { c = '#c8e6c9'; sym = 'AR'; }
            else if (item.type === deps.ITEM_TYPE.UNIT_CAVALRY) { c = '#bbdefb'; sym = 'CV'; }
            else if (item.type === deps.ITEM_TYPE.ITEM_GOLD) { c = '#fff176'; sym = 'G'; }
            else if (item.type === deps.ITEM_TYPE.ITEM_ENERGY) { c = '#80deea'; sym = 'E'; }
            else if (item.type === deps.ITEM_TYPE.ITEM_CRYSTAL) { c = '#e1bee7'; sym = 'GM'; }
            else if (item.type === deps.ITEM_TYPE.ITEM_AP) { c = '#b39ddb'; sym = 'AP'; }
            const drawSize = ds * 1.2;
            const drawOffset = (s - drawSize) / 2;
            game.ctx.fillStyle = c;
            roundRect(game, x + drawOffset, y + drawOffset, drawSize, drawSize, 12);
            game.ctx.fill();
            game.ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            game.ctx.lineWidth = 2;
            game.ctx.stroke();
            game.ctx.fillStyle = 'rgba(0,0,0,0.6)';
            game.ctx.font = `${Math.floor(drawSize * 0.5)}px sans-serif`;
            game.ctx.textAlign = 'center';
            game.ctx.textBaseline = 'middle';
            game.ctx.fillText(sym, x + s / 2, y + s / 2);
        }

        game.ctx.lineWidth = 3;
        game.ctx.strokeStyle = lvColor;
        game.ctx.strokeRect(x + p, y + p, ds, ds);

        const bx = x + s / 2;
        const by = y + ds;
        if (item.type >= 10 || item.type < 10) {
            game.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            game.ctx.beginPath();
            game.ctx.arc(bx, by - 10, 10, 0, Math.PI * 2);
            game.ctx.fill();
            game.ctx.strokeStyle = '#fff';
            game.ctx.lineWidth = 1;
            game.ctx.stroke();
            game.ctx.fillStyle = '#fff';
            game.ctx.font = 'bold 12px sans-serif';
            game.ctx.textAlign = 'center';
            game.ctx.fillText(item.level, bx, by - 6);
        }

        if (item.type === deps.ITEM_TYPE.BUILDING_CAMP) {
            const count = item.storedUnits ? item.storedUnits.length : 0;
            const cap = deps.CAMP_CAPACITY[item.level] || 4;
            const text = `${count}/${cap}`;
            game.ctx.font = 'bold 16px sans-serif';
            const textW = game.ctx.measureText(text).width + 8;
            game.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            game.ctx.beginPath();
            game.ctx.roundRect(bx - textW / 2, y + s / 2 - 10, textW, 20, 4);
            game.ctx.fill();
            game.ctx.fillStyle = '#fff';
            game.ctx.shadowColor = 'black';
            game.ctx.shadowBlur = 2;
            game.ctx.fillText(text, bx, y + s / 2 + 6);
            game.ctx.shadowBlur = 0;
        }
    }

    function roundRect(game, x, y, w, h, r) {
        game.ctx.beginPath();
        game.ctx.moveTo(x + r, y);
        game.ctx.arcTo(x + w, y, x + w, y + h, r);
        game.ctx.arcTo(x + w, y + h, x, y + h, r);
        game.ctx.arcTo(x, y + h, x, y, r);
        game.ctx.arcTo(x, y, x + w, y, r);
        game.ctx.closePath();
    }

    function loop(game, deps) {
        window.KOVFieldCommandModule.updateArmies(game, game.updateArmiesDeps);
        if (game.isDirty || game.drag) {
            game.ctx.clearRect(0, 0, game.width, game.height);
            const squadLabel = game.tr('ui.squad.label', {}, 'Squad');
            drawSquad(game, game.squad1, game.squad1Rect, `${squadLabel} 1`, '#4caf50', deps.ZONES.SQUAD1, deps);
            drawSquad(game, game.squad2, game.squad2Rect, `${squadLabel} 2`, '#2196f3', deps.ZONES.SQUAD2, deps);
            if (game.squad3Rect) drawSquad(game, game.squad3, game.squad3Rect, `${squadLabel} 3`, '#f59e0b', deps.ZONES.SQUAD3, deps);
            for (let r = 0; r < deps.CONFIG.gridRows; r++) for (let c = 0; c < deps.CONFIG.gridCols; c++) {
                const x = game.gridStartX + c * game.gridTileSize;
                const y = game.gridStartY + r * game.gridTileSize;
                const isHover = game.hover && game.hover.zone === deps.ZONES.GRID && game.hover.r === r && game.hover.c === c;
                const isSel = game.selectedItem && game.selectedItem.location.zone === deps.ZONES.GRID && game.selectedItem.location.r === r && game.selectedItem.location.c === c;
                drawCell(game, x, y, game.gridTileSize, game.grid[r][c], game.gridState[r][c], isHover, isSel, deps);
            }
            if (game.drag) drawItem(game, game.drag.x - game.drag.size / 2, game.drag.y - game.drag.size / 2, game.drag.size, game.drag.item, true, deps);
            for (let i = game.particles.length - 1; i >= 0; i--) {
                game.particles[i].update();
                game.particles[i].draw(game.ctx);
                if (game.particles[i].life <= 0) game.particles.splice(i, 1);
            }
            let anim = false;
            game.grid.flat().concat(game.squad1).concat(game.squad2).concat(game.squad3).forEach((i) => {
                if (i && i.scale !== 1) {
                    i.scale += (i.scale < 1 ? 0.1 : -0.05);
                    if (Math.abs(i.scale - 1) < 0.05) i.scale = 1;
                    anim = true;
                }
            });
            game.isDirty = anim || !!game.drag || game.particles.length > 0;
        }
        requestAnimationFrame(() => window.KOVMergeBoardModule.loop(game, game.mergeLoopDeps));
    }

    function produce(game, building, deps) {
        const buildingData = deps.BUILDING_DATA[building.type];
        const stats = buildingData ? buildingData[building.level] : deps.BUILDING_DATA[deps.ITEM_TYPE.BUILDING_BARRACKS][1];
        if (game.energy < stats.energy) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.energy_short_cost', { cost: stats.energy }, `Not enough energy (${stats.energy})`));
            return;
        }
        let unitType = deps.ITEM_TYPE.UNIT_INFANTRY;
        if (building.type === deps.ITEM_TYPE.BUILDING_RANGE) unitType = deps.ITEM_TYPE.UNIT_ARCHER;
        else if (building.type === deps.ITEM_TYPE.BUILDING_STABLE) unitType = deps.ITEM_TYPE.UNIT_CAVALRY;

        let lvl = 1;
        const r = Math.random() * 100;
        let sum = 0;
        for (let i = 0; i < stats.probs.length; i++) {
            sum += stats.probs[i];
            if (r <= sum) { lvl = i + 1; break; }
        }

        const spawnPos = window.KOVMergeBoardModule.spawnItem(game, { type: unitType, level: lvl, scale: 0 }, game.spawnItemDeps);
        if (spawnPos) {
            game.energy -= stats.energy;
            window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
            game.requestRender();
            game.sound.playSpawn();
            syncAction(game, 'produce', { targetId: locationToId({ zone: deps.ZONES.GRID, r: spawnPos.r, c: spawnPos.c }, deps), itemType: unitType, level: lvl });
        } else {
            window.KOVUiShellModule.showToast(game, game.tr('toast.space_short', {}, 'No space available'));
        }
    }

    function produceFromChest(game, chest, r, c, deps) {
        if (!Number.isFinite(Number(chest.usage))) {
            chest.usage = 5;
        }
        if (game.energy < 1) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.energy_short_cost', { cost: 1 }, 'Not enough energy'));
            return;
        }
        const table = deps.CHEST_DROP_TABLE[chest.level] || deps.CHEST_DROP_TABLE[1];
        let total = 0;
        table.forEach((e) => { total += e.prob; });
        let rnd = Math.random() * total;
        let code = table[0].code;
        for (const e of table) {
            if (rnd < e.prob) { code = e.code; break; }
            rnd -= e.prob;
        }
        const info = (typeof deps.getInfoFromCode === 'function') ? deps.getInfoFromCode(code) : null;
        if (!info || !Number.isFinite(info.type) || !Number.isFinite(info.level)) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.chest_reward_invalid', {}, 'Invalid chest reward data'));
            return;
        }
        const spawnPos = window.KOVMergeBoardModule.spawnItem(game, { type: info.type, level: info.level, scale: 0 }, game.spawnItemDeps);
        if (spawnPos) {
            game.energy--;
            chest.usage--;
            chest.scale = 1.2;
            if (chest.usage <= 0) {
                game.grid[r][c] = null;
                if (game.selectedItem && game.selectedItem.item === chest) selectItem(game, null, null, deps);
                window.KOVUiShellModule.showToast(game, game.tr('toast.chest_gone', {}, 'Chest expired.'));
            }
            window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
            game.requestRender();
            game.sound.playSpawn();
            syncAction(game, 'produce', { targetId: locationToId({ zone: deps.ZONES.GRID, r: spawnPos.r, c: spawnPos.c }, deps), itemType: info.type, level: info.level });
        } else {
            window.KOVUiShellModule.showToast(game, game.tr('toast.space_short', {}, 'No space available'));
        }
    }

    function spawnItem(game, item, deps) {
        for (let r = 0; r < deps.CONFIG.gridRows; r++) for (let c = 0; c < deps.CONFIG.gridCols; c++) {
            if (game.gridState[r][c].type === deps.LOCK_TYPE.OPEN && !game.grid[r][c]) {
                game.grid[r][c] = item;
                const cx = game.gridStartX + c * game.gridTileSize + game.gridTileSize / 2;
                const cy = game.gridStartY + r * game.gridTileSize + game.gridTileSize / 2;
                game.spawnParticles(cx, cy, '#EEE', 10, 'smoke');
                game.requestRender();
                return { r, c };
            }
        }
        return false;
    }

    function ejectCamp(game, camp, r, c, deps) {
        if (!camp.storedUnits || camp.storedUnits.length === 0) {
            window.KOVUiShellModule.showToast(game, game.tr('toast.empty', {}, 'Camp is empty'));
            return;
        }
        const moves = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const m of moves) {
            const nr = r + m[0];
            const nc = c + m[1];
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && game.gridState[nr][nc].type === deps.LOCK_TYPE.OPEN && !game.grid[nr][nc]) {
                const unit = camp.storedUnits.pop();
                game.grid[nr][nc] = unit;
                game.requestRender();
                game.sound.playClick();
                window.KOVUiShellModule.showToast(game, game.tr('toast.withdrawn', { remain: camp.storedUnits.length }, `Released (${camp.storedUnits.length} left)`));
                syncAction(game, 'eject', { fromId: locationToId({ zone: deps.ZONES.GRID, r, c }, deps), toId: locationToId({ zone: deps.ZONES.GRID, r: nr, c: nc }, deps) });
                return;
            }
        }
        window.KOVUiShellModule.showToast(game, game.tr('toast.no_adjacent_space', {}, 'No adjacent empty slot'));
    }

    function collectResource(game, item, r, c, deps) {
        const val = deps.ITEM_VALUES[item.level] || 1;
        let pColor = '#fff';
        if (item.type === deps.ITEM_TYPE.ITEM_GOLD) {
            game.gold += val;
            window.KOVUiShellModule.showToast(game, game.tr('toast.gold_gain', { value: val }, `+${val}G`));
            pColor = '#FFD700';
        } else if (item.type === deps.ITEM_TYPE.ITEM_ENERGY) {
            game.energy = Math.min(game.energy + val, game.maxEnergy);
            window.KOVUiShellModule.showToast(game, game.tr('toast.energy_gain', { value: val }, `+${val}EN`));
            pColor = '#00FFFF';
        } else if (item.type === deps.ITEM_TYPE.ITEM_AP) {
            game.cp = Math.min(game.cp + val, game.maxCp);
            window.KOVUiShellModule.showToast(game, game.tr('toast.cp_gain', { value: val }, `+${val}AP`));
            pColor = '#b39ddb';
        } else {
            game.gem += val;
            window.KOVUiShellModule.showToast(game, game.tr('toast.gem_gain', { value: val }, `+${val}GEM`));
            pColor = '#FF00FF';
        }
        const cx = game.gridStartX + c * game.gridTileSize + game.gridTileSize / 2;
        const cy = game.gridStartY + r * game.gridTileSize + game.gridTileSize / 2;
        game.spawnParticles(cx, cy, pColor, 15, 'spark');
        game.sound.playCollect();
        game.grid[r][c] = null;
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        game.requestRender();
        syncAction(game, 'collect', { targetId: locationToId({ zone: deps.ZONES.GRID, r, c }, deps) });
    }

    function tryUnlock(game, r, c, deps) {
        const showUnlockItemFx = () => {
            const unlockedItem = game.grid?.[r]?.[c];
            if (!unlockedItem) return;
            const itemInfo = (typeof deps.getData === 'function')
                ? deps.getData(unlockedItem.type, unlockedItem.level)
                : null;
            const itemName = itemInfo?.name || `${unlockedItem.type}${unlockedItem.level || 1}`;
            window.KOVUiShellModule.showToast(
                game,
                game.tr('toast.unlock_item_ready', { name: itemName }, `${itemName} unlocked`)
            );
            const cx = game.gridStartX + c * game.gridTileSize + game.gridTileSize / 2;
            const cy = game.gridStartY + r * game.gridTileSize + game.gridTileSize / 2;
            window.KOVUiShellModule.showFloatingImage(
                game,
                `${unlockedItem.type}${unlockedItem.level || 1}`,
                cx,
                cy
            );
        };

        const l = game.gridState[r][c];
        if (l.type === deps.LOCK_TYPE.GOLD) {
            if (game.gold >= l.value) {
                game.gold -= l.value;
                game.gridState[r][c] = { type: deps.LOCK_TYPE.OPEN };
                window.KOVUiShellModule.showToast(game, game.tr('toast.unlock_done', {}, 'Unlocked'));
                game.spawnParticles(game.gridStartX + c * game.gridTileSize + game.gridTileSize / 2, game.gridStartY + r * game.gridTileSize + game.gridTileSize / 2, '#FFF', 20, 'confetti');
                game.sound.playUnlock();
                showUnlockItemFx();
                syncAction(game, 'unlock', { r, c });
            } else {
                window.KOVUiShellModule.showToast(game, game.tr('toast.gold_short', {}, 'Not enough gold'));
                game.sound.playError();
            }
        } else if (l.type === deps.LOCK_TYPE.LEVEL) {
            if (game.lordLevel >= l.value) {
                game.gridState[r][c] = { type: deps.LOCK_TYPE.OPEN };
                window.KOVUiShellModule.showToast(game, game.tr('toast.unlock_done', {}, 'Unlocked'));
                game.spawnParticles(game.gridStartX + c * game.gridTileSize + game.gridTileSize / 2, game.gridStartY + r * game.gridTileSize + game.gridTileSize / 2, '#FFF', 20, 'confetti');
                game.sound.playUnlock();
                showUnlockItemFx();
                syncAction(game, 'unlock', { r, c });
            } else {
                window.KOVUiShellModule.showToast(game, game.tr('toast.require_level', { level: l.value }, `Requires LV.${l.value}`));
                game.sound.playError();
            }
        }
        window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
        game.requestRender();
    }

    global.KOVMergeBoardModule = {
        selectItem,
        updateInfoPanel,
        handleAction,
        getZoneAt,
        setupInput,
        startDrag,
        endDrag,
        handleClick,
        getSquadPower,
        drawSquad,
        drawCell,
        drawItem,
        roundRect,
        loop,
        produce,
        produceFromChest,
        spawnItem,
        ejectCamp,
        collectResource,
        tryUnlock
    };
})(window);




