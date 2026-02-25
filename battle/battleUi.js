(function (global) {
    'use strict';

    function renderPrepGrid(game, deps) {
        if (!game.battleContext) return;
        const ctx = game.battleContext;
        const getData = deps?.getData || game.mergeActionDeps?.getData || (() => ({ name: 'Unknown' }));

        const grid = document.getElementById('prep-grid-unified');
        if (!grid) return;

        if (!grid.dataset.initialized) {
            grid.innerHTML = '';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const bg = document.createElement('div');
                    bg.className = 'battle-cell-bg prep';
                    bg.style.gridRow = r + 1;
                    bg.style.gridColumn = c + 1;
                    grid.appendChild(bg);
                }
            }
            grid.dataset.initialized = "true";
        }

        // Remove old dynamic units
        grid.querySelectorAll('.battle-cell').forEach(el => el.remove());

        const getPos = (slot, team) => {
            const clamped = Math.max(0, Math.min(8, Number.isFinite(slot) ? slot : 0));
            const r = 2 + (clamped % 3);
            const c = team === 'A' ? 2 - Math.floor(clamped / 3) : 5 + Math.floor(clamped / 3);
            return { r, c };
        };

        const squad = ctx.squadRef;
        squad.forEach((unit, idx) => {
            const pos = getPos(idx, 'A');
            const cell = document.createElement('div');
            cell.className = 'battle-cell ally prep';
            cell.style.gridRow = pos.r + 1;
            cell.style.gridColumn = pos.c + 1;
            cell.dataset.idx = idx;
            cell.ondragover = (e) => e.preventDefault();
            cell.ondrop = (e) => window.KOVBattleFlowModule.handlePrepDrop(game, e, idx);

            if (unit) {
                const data = getData(unit.type, unit.level);
                cell.draggable = true;
                cell.ondragstart = (e) => window.KOVBattleFlowModule.handlePrepDragStart(e, idx);
                const iconHtml = getUnitSpriteHtml(game, { type: unit.type, level: unit.level, classType: unit.type }, '100%');
                cell.innerHTML = `
                    <div class="battle-unit">
                        <div class="battle-unit-icon">${iconHtml}</div>
                        <div class="battle-prep-name text-[10px] text-white">${data.name}</div>
                    </div>
                `;
            } else {
                cell.classList.add('empty');
            }
            grid.appendChild(cell);
        });

        const enemySlots = Array(9).fill(null);
        ctx.defenders.forEach((u) => {
            if (u.slot >= 0 && u.slot < 9) enemySlots[u.slot] = u;
        });

        enemySlots.forEach((unit, idx) => {
            if (!unit) return;
            const pos = getPos(idx, 'B');
            const cell = document.createElement('div');
            cell.className = 'battle-cell enemy prep';
            cell.style.gridRow = pos.r + 1;
            cell.style.gridColumn = pos.c + 1;

            const iconHtml = getUnitSpriteHtml(game, unit, '100%');
            cell.innerHTML = `
                <div class="battle-unit">
                    <div class="battle-unit-icon">${iconHtml}</div>
                    <div class="battle-prep-name text-[10px] text-red-300">${unit.name}</div>
                </div>
            `;
            grid.appendChild(cell);
        });
    }

    function renderBattleModal(game) {
        if (!game.battleContext) return;
        const ctx = game.battleContext;
        updateBattleStageImpactFx(game);
        const isFxActor = (fx, unit, sideClass) => {
            if (!fx || !unit) return false;
            if (fx.attackerId && (fx.attackerId === unit.id || fx.attackerId === unit.sourceId)) return true;
            const team = sideClass === 'ally' ? 'A' : 'B';
            return fx.attackerTeam === team && Number.isFinite(Number(fx.attackerSlot)) && Number(unit.slot) === Number(fx.attackerSlot);
        };
        const isFxTarget = (fx, unit) => {
            if (!fx || !unit) return false;
            if (fx.defenderId && (fx.defenderId === unit.id || fx.defenderId === unit.sourceId)) return true;
            return fx.defenderTeam === (unit.isEnemy ? 'B' : 'A') && Number.isFinite(Number(fx.defenderSlot)) && Number(unit.slot) === Number(fx.defenderSlot);
        };

        const getPos = (unit) => {
            if (unit.pos) return unit.pos;
            const slot = unit.slot || 0;
            const clamped = Math.max(0, Math.min(8, Number.isFinite(slot) ? slot : 0));
            const r = 2 + (clamped % 3);
            let c;
            if (!unit.isEnemy) {
                c = 2 - Math.floor(clamped / 3);
            } else {
                c = 5 + Math.floor(clamped / 3);
            }
            return { r, c };
        };

        const grid = document.getElementById('battle-grid-container');
        if (!grid) return;

        if (!grid.dataset.initialized) {
            grid.innerHTML = '';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const bg = document.createElement('div');
                    bg.className = 'battle-cell-bg';
                    bg.style.gridRow = r + 1;
                    bg.style.gridColumn = c + 1;
                    grid.appendChild(bg);
                }
            }
            grid.dataset.initialized = "true";
        }

        // Map-based pooling to prevent image flicker
        const existingCells = Array.from(grid.querySelectorAll('.battle-cell'));
        const cellPool = {};
        const unusedCells = [];
        existingCells.forEach(cell => {
            if (cell.dataset.unitId) {
                cellPool[cell.dataset.unitId] = cell;
            } else {
                unusedCells.push(cell);
            }
        });

        const allUnits = [...(ctx.allies || []), ...(ctx.defenders || [])];
        const cellMap = {};

        allUnits.forEach(unit => {
            const p = getPos(unit);
            const key = `${p.r},${p.c}`;
            if (!cellMap[key]) cellMap[key] = [];
            cellMap[key].push(unit);
        });

        const usedUnitIds = new Set();

        Object.keys(cellMap).forEach(key => {
            const unitsInCell = cellMap[key];
            // Sort: Dead units first (z-index base), then by team or id to stabilize
            unitsInCell.sort((a, b) => {
                const aDead = isDead(a) ? 0 : 1;
                const bDead = isDead(b) ? 0 : 1;
                return aDead - bDead;
            });

            const [r, c] = key.split(',').map(Number);

            unitsInCell.forEach((unit, idx) => {
                const uid = unit.id || `slot-${unit.isEnemy ? 'B' : 'A'}-${unit.slot}`;
                usedUnitIds.add(uid);

                let cell = cellPool[uid];
                if (!cell) {
                    if (unusedCells.length > 0) {
                        cell = unusedCells.pop();
                        cell.querySelectorAll('.battle-dmg-float, .battle-hit-particle').forEach(e => e.remove());
                    } else {
                        cell = document.createElement('div');
                        cell.innerHTML = `
                            <div class="battle-unit">
                                <div class="battle-unit-icon"></div>
                                <div class="battle-hp-bar"><div class="battle-hp-fill"></div></div>
                            </div>
                        `;
                        grid.appendChild(cell);
                    }
                    cell.dataset.unitId = uid;
                }

                // Clean inline styles but keep element alive
                cell.className = '';
                cell.style.cssText = '';

                const sideClass = unit.isEnemy ? 'enemy' : 'ally';
                cell.className = `battle-cell ${sideClass}`;
                cell.style.gridRow = r + 1;
                cell.style.gridColumn = c + 1;

                if (unitsInCell.length > 1) {
                    const isUnitDead = isDead(unit);
                    const livingUnits = unitsInCell.filter(u => !isDead(u));
                    const deadUnits = unitsInCell.filter(u => isDead(u));
                    
                    let offX = 0;
                    let offY = 0;

                    if (!isUnitDead) {
                        if (livingUnits.length > 1) {
                            const liveIdx = livingUnits.indexOf(unit);
                            const offset = (liveIdx - (livingUnits.length - 1) / 2) * 12;
                            offX = offset;
                            offY = offset;
                        }
                    } else {
                        // Dead unit scatter
                        if (deadUnits.length > 1) {
                            const deadIdx = deadUnits.indexOf(unit);
                            // Stable scatter based on index
                            const scatter = (deadIdx % 2 === 0 ? 1 : -1) * ((deadIdx + 1) * 2);
                            offX = scatter;
                            offY = -scatter;
                        }
                    }

                    cell.style.setProperty('--overlap-x', `${offX}px`);
                    cell.style.setProperty('--overlap-y', `${offY}px`);
                    cell.style.zIndex = 10 + idx;
                }

                const iconEl = cell.querySelector('.battle-unit-icon');
                const hpBarEl = cell.querySelector('.battle-hp-bar');
                const hpFillEl = cell.querySelector('.battle-hp-fill');
                
                const fx = game.battleFx;
                const isActor = isFxActor(fx, unit, sideClass);
                const isTarget = isFxTarget(fx, unit);

                if (isActor) {
                    cell.classList.add('battle-cell-actor');
                    if (fx.moved) {
                        const isPostMove = fx.phase === 'impact' || fx.phase === 'projectile' || fx.phase === 'done';
                        const xVal = isPostMove ? (fx.lungeX || 0) : (fx.moveX || 0);
                        const yVal = isPostMove ? (fx.lungeY || 0) : (fx.moveY || 0);
                        cell.style.setProperty('--fx-move-x', typeof xVal === 'string' ? xVal : `${Number(xVal)}%`);
                        cell.style.setProperty('--fx-move-y', typeof yVal === 'string' ? yVal : `${Number(yVal)}%`);
                        cell.style.setProperty('--fx-move-ms', `${Math.max(120, Number(fx.moveDuration || 190))}ms`);
                        if (isPostMove) {
                            cell.classList.add('battle-cell-forward');
                        }
                    }
                    if (fx.phase === 'move') {
                        cell.classList.add('battle-cell-move');
                    }
                    if (fx.phase === 'projectile') {
                        cell.classList.add('battle-cell-shot');
                        cell.style.setProperty('--fx-shot-x', `${Number(fx.shotX || 0)}px`);
                        cell.style.setProperty('--fx-shot-y', `${Number(fx.shotY || 0)}px`);
                    }
                    if (fx.phase === 'impact') {
                        if (fx.hasProjectile) {
                            cell.classList.add('battle-cell-shot');
                            cell.style.setProperty('--fx-shot-x', `${Number(fx.shotX || 0)}px`);
                            cell.style.setProperty('--fx-shot-y', `${Number(fx.shotY || 0)}px`);
                        }
                        cell.classList.add('battle-cell-attack', 'battle-cell-lunge');
                        let lungeDir = fx.attackerTeam === 'B' ? '-1' : '1';
                        if (fx.attackerPos && fx.defenderPos) {
                            if (fx.defenderPos.c < fx.attackerPos.c) lungeDir = '-1';
                            else if (fx.defenderPos.c > fx.attackerPos.c) lungeDir = '1';
                        }
                        cell.style.setProperty('--fx-lunge-dir', lungeDir);
                    }
                }

                if (isTarget) {
                    cell.classList.add('battle-cell-target');
                    if (fx.phase === 'impact') cell.classList.add('battle-cell-hit');
                }

                const sprite = isDead(unit)
                    ? { key: 'dead', html: '<span class="battle-dead-label">DEAD</span>' }
                    : getUnitSpriteRenderData(game, unit, '100%');

                if (iconEl) {
                    if (iconEl.dataset.spriteKey !== sprite.key) {
                        iconEl.innerHTML = sprite.html;
                        iconEl.dataset.spriteKey = sprite.key;
                    }
                }

                if (hpBarEl) hpBarEl.style.display = '';
                if (hpFillEl) hpFillEl.style.width = `${(unit.hp / unit.maxHp) * 100}%`;

                if (isTarget && fx.phase === 'impact' && fx.damage > 0) {
                    const hitKey = `${fx.attackerId}-${fx.defenderId}-${fx.damage}-${fx.phase}`;
                    if (cell.dataset.lastHit !== hitKey) {
                        const dmg = document.createElement('div');
                        dmg.className = `battle-dmg-float${fx.isCrit ? ' crit' : ''}`;
                        dmg.innerText = `-${fx.damage}${fx.isCrit ? ' CRIT' : ''}`;
                        dmg.style.color = '#ef4444';
                        if (fx.isCrit) {
                            dmg.style.textShadow = '0 1px 0 rgba(0,0,0,0.98), 0 0 14px rgba(239,68,68,1), 0 0 26px rgba(248,113,113,0.92)';
                        }
                        cell.appendChild(dmg);
                        for (let p = 0; p < 16; p++) {
                            const particle = document.createElement('span');
                            particle.className = 'battle-hit-particle';
                            particle.style.setProperty('--p-x', `${Math.round((Math.random() * 52) - 26)}px`);
                            particle.style.setProperty('--p-y', `${Math.round((Math.random() * -44) - 10)}px`);
                            particle.style.setProperty('--p-d', `${180 + Math.round(Math.random() * 260)}ms`);
                            particle.style.setProperty('--p-s', `${5 + Math.round(Math.random() * 4)}px`);
                            cell.appendChild(particle);
                        }
                        cell.dataset.lastHit = hitKey;

                        setTimeout(() => {
                            if (dmg && dmg.parentNode === cell) dmg.remove();
                        }, 2000);
                    }
                }
            });
        });

        // Cleanup unused cells
        Object.keys(cellPool).forEach(uid => {
            if (!usedUnitIds.has(uid)) {
                cellPool[uid].remove();
            }
        });
        unusedCells.forEach(cell => cell.remove());

        renderBattleLog(game);
    }

    function renderBattleLog(game) {
        if (!game?.battleContext) return;
        const logDiv = document.getElementById('battle-log');
        if (!logDiv) return;
        logDiv.innerHTML = game.battleContext.log.map((l) => formatBattleLogLine(l)).join('');
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    function updateBattleStageImpactFx(game) {
        const stage = document.getElementById('battle-stage');
        if (!stage) return;
        // Disable stage flash/shake to avoid battle flicker.
        stage.classList.remove('battle-stage-impact', 'battle-stage-impact-ally', 'battle-stage-impact-enemy');
    }

    function resetBattleResultOverlay() {
        const overlay = document.getElementById('battle-result-overlay');
        const title = document.getElementById('battle-result-title');
        if (overlay) overlay.style.display = 'none';
        if (title) {
            title.innerText = '';
            title.className = 'battle-result-text';
        }
    }

    function closeBattleModal(game) {
        const battleModal = document.getElementById('modal-battle');
        if (battleModal) {
            battleModal.classList.remove('open');
            battleModal.style.display = 'none';
        }
        const prepModal = document.getElementById('modal-battle-prep');
        if (prepModal) {
            prepModal.classList.remove('open');
            prepModal.style.display = 'none';
        }
        resetBattleResultOverlay();
        window.KOVBattleCoreModule.clearBattleFxTimers(game);
        game.battleFx = null;
        if (game.battleTimer) clearInterval(game.battleTimer);
        game.battleContext = null;
    }

    function escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatBattleLogLine(msg) {
        const safe = escapeHtml(msg);
        let line = safe;
        line = line.replace(/\[CRIT\]/g, '<span class="battle-log-crit">[CRIT]</span>');
        line = line.replace(/(\d+\s*dmg)/gi, '<span class="battle-log-dmg">$1</span>');
        line = line.replace(/hp\s*(\d+\s*->\s*\d+)/gi, 'hp <span class="battle-log-hp">$1</span>');
        line = line.replace(/\((x\d+,y\d+)\)/gi, '(<span class="battle-log-coord">$1</span>)');
        const isHit = /-&gt;|->|dmg/i.test(safe);
        const cls = isHit ? 'battle-log-line hit' : 'battle-log-line';
        return `<div class="${cls}">${line}</div>`;
    }

    function isDead(unit) {
        return unit.hp <= 0;
    }

    function getUnitIcon(type) {
        if (type === 10 || (type >= 1100 && type < 1200)) return 'IN';
        if (type === 11 || (type >= 1200 && type < 1300)) return 'AR';
        if (type === 12 || (type >= 1300 && type < 1400)) return 'CV';
        return '--';
    }

    function resolveRepresentativeCode(unit) {
        const directCode = Number(unit?.defenderCode || unit?.code || 0);
        if (Number.isFinite(directCode) && directCode >= 1000) return String(directCode);
        const classType = Number(unit?.classType || unit?.type || 0);
        if (classType === 10 || (classType >= 1100 && classType < 1200)) return '1101';
        if (classType === 11 || (classType >= 1200 && classType < 1300)) return '1201';
        if (classType === 12 || (classType >= 1300 && classType < 1400)) return '1301';
        return '';
    }

    function getUnitSpriteHtml(game, unit, sizePx = 20) {
        return getUnitSpriteRenderData(game, unit, sizePx).html;
    }

    function getUnitSpriteRenderData(game, unit, sizePx = 20) {
        const sizeValue = (typeof sizePx === 'number') ? `${sizePx}px` : String(sizePx || '100%');
        const assets = game?.assets;
        if (assets && typeof assets.getImage === 'function') {
            const directType = Number(unit?.type);
            const directLevel = Number(unit?.level);
            if (Number.isFinite(directType) && Number.isFinite(directLevel)) {
                const direct = assets.getImage(directType, directLevel);
                if (direct && direct.src) {
                    return {
                        key: `t:${directType}:l:${directLevel}`,
                        html: `<img class="battle-unit-sprite" style="width:${sizeValue};height:${sizeValue}" src="${direct.src}" alt="">`
                    };
                }
            }
            const repCode = resolveRepresentativeCode(unit);
            if (repCode) {
                const rep = assets.getImage(repCode);
                if (rep && rep.src) {
                    return {
                        key: `c:${repCode}`,
                        html: `<img class="battle-unit-sprite" style="width:${sizeValue};height:${sizeValue}" src="${rep.src}" alt="">`
                    };
                }
            }
        }
        return {
            key: `icon:${Number(unit?.classType || unit?.type || 0)}`,
            html: getUnitIcon(Number(unit?.classType || unit?.type || 0))
        };
    }

    global.KOVBattleUiModule = {
        renderPrepGrid,
        renderBattleModal,
        renderBattleLog,
        resetBattleResultOverlay,
        closeBattleModal,
        escapeHtml,
        formatBattleLogLine,
        updateBattleStageImpactFx,
        isDead,
        getUnitIcon
    };
})(window);
