(function (global) {
    'use strict';

    function renderPrepGrid(game, deps) {
        if (!game.battleContext) return;
        const ctx = game.battleContext;
        const getData = deps?.getData || game.mergeActionDeps?.getData || (() => ({ name: 'Unknown' }));

        const allyGrid = document.getElementById('prep-grid-ally');
        if (allyGrid) {
            allyGrid.innerHTML = '';
            const squad = ctx.squadRef;
            squad.forEach((unit, idx) => {
                const cell = document.createElement('div');
                cell.className = 'battle-cell ally prep';
                cell.dataset.idx = idx;
                cell.ondragover = (e) => e.preventDefault();
                cell.ondrop = (e) => window.KOVBattleFlowModule.handlePrepDrop(game, e, idx);

                if (unit) {
                    const data = getData(unit.type, unit.level);
                    cell.draggable = true;
                    cell.ondragstart = (e) => window.KOVBattleFlowModule.handlePrepDragStart(e, idx);
                    cell.innerHTML = `
                        <div class="battle-unit">
                            <div style="font-size:24px;">${getUnitIcon(unit.type)}</div>
                            <div class="text-[10px] text-white">${data.name}</div>
                        </div>
                    `;
                } else {
                    cell.classList.add('empty');
                }
                allyGrid.appendChild(cell);
            });
        }

        const enemyGrid = document.getElementById('prep-grid-enemy');
        if (enemyGrid) {
            enemyGrid.innerHTML = '';
            const enemySlots = Array(9).fill(null);
            ctx.defenders.forEach((u) => {
                if (u.slot >= 0 && u.slot < 9) enemySlots[u.slot] = u;
            });

            enemySlots.forEach((unit) => {
                const cell = document.createElement('div');
                cell.className = 'battle-cell enemy prep';
                if (unit) {
                    cell.innerHTML = `
                        <div class="battle-unit">
                            <div style="font-size:24px;">${getUnitIcon(unit.classType)}</div>
                            <div class="text-[10px] text-red-300">${unit.name}</div>
                        </div>
                    `;
                }
                enemyGrid.appendChild(cell);
            });
        }
    }

    function renderBattleModal(game) {
        if (!game.battleContext) return;
        const ctx = game.battleContext;

        const renderSide = (gridId, sideClass, units) => {
            const grid = document.getElementById(gridId);
            if (!grid) return;
            grid.innerHTML = '';
            for (let i = 0; i < 9; i++) {
                const cell = document.createElement('div');
                cell.className = `battle-cell ${sideClass}`;
                const unit = units.find((u) => u.slot === i);
                if (unit) {
                    const fx = game.battleFx;
                    const isActor = !!fx && fx.attackerId === unit.id;
                    const isTarget = !!fx && fx.defenderId === unit.id;
                    if (isActor) {
                        cell.classList.add('battle-cell-actor');
                        if (fx.phase === 'move') {
                            cell.classList.add('battle-cell-move');
                            cell.style.setProperty('--fx-move-x', `${Number(fx.moveX || 0)}px`);
                            cell.style.setProperty('--fx-move-y', `${Number(fx.moveY || 0)}px`);
                        }
                        if (fx.phase === 'projectile') {
                            cell.classList.add('battle-cell-shot');
                            cell.style.setProperty('--fx-shot-x', `${Number(fx.shotX || 0)}px`);
                            cell.style.setProperty('--fx-shot-y', `${Number(fx.shotY || 0)}px`);
                        }
                        if (fx.phase === 'impact') cell.classList.add('battle-cell-attack');
                    }
                    if (isTarget) {
                        cell.classList.add('battle-cell-target');
                        if (fx.phase === 'impact') cell.classList.add('battle-cell-hit');
                    }
                    cell.innerHTML = `
                        <div class="battle-unit">
                            <div style="font-size:20px;">${isDead(unit) ? 'DEAD' : getUnitIcon(unit.classType)}</div>
                            <div class="battle-hp-bar"><div class="battle-hp-fill" style="width:${(unit.hp / unit.maxHp) * 100}%"></div></div>
                        </div>
                    `;
                    if (isTarget && fx.phase === 'impact' && fx.damage > 0) {
                        const dmg = document.createElement('div');
                        dmg.className = `battle-dmg-float${fx.isCrit ? ' crit' : ''}`;
                        dmg.innerText = `-${fx.damage}${fx.isCrit ? ' CRIT' : ''}`;
                        cell.appendChild(dmg);
                    }
                }
                grid.appendChild(cell);
            }
        };

        renderSide('battle-grid-ally', 'ally', ctx.allies);
        renderSide('battle-grid-enemy', 'enemy', ctx.defenders);

        const logDiv = document.getElementById('battle-log');
        if (logDiv) {
            logDiv.innerHTML = ctx.log.map((l) => formatBattleLogLine(l)).join('');
            logDiv.scrollTop = logDiv.scrollHeight;
        }
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

    global.KOVBattleUiModule = {
        renderPrepGrid,
        renderBattleModal,
        resetBattleResultOverlay,
        closeBattleModal,
        escapeHtml,
        formatBattleLogLine,
        isDead,
        getUnitIcon
    };
})(window);
