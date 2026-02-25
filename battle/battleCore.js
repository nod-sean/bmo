(function (global) {
    'use strict';

    function parseDefenders(game, defenders, level, deps) {
        const result = [];
        const slotsUsed = new Set();

        defenders.forEach((d) => {
            for (let i = 0; i < d.count; i++) {
                let currentSlot = (d.slot !== undefined) ? (d.slot + i) : 0;
                while (slotsUsed.has(currentSlot) && currentSlot < 9) currentSlot++;
                if (currentSlot >= 9) break;

                slotsUsed.add(currentSlot);

                const lv = typeof level === 'string' ? parseInt(level, 10) : level;
                const lookupCode = (d.code >= 10 && d.code < 20 && lv)
                    ? deps.getCode(d.code, lv)
                    : d.code;
                const parsedType = (Number.isFinite(Number(lookupCode)) && Number(lookupCode) >= 1000)
                    ? Math.floor(Number(lookupCode) / 100)
                    : Number(d.code);
                const parsedLevel = (Number.isFinite(Number(lookupCode)) && Number(lookupCode) >= 1000)
                    ? Math.max(1, Number(lookupCode) % 100)
                    : Math.max(1, Number(lv || 1));
                const stats = deps.UNIT_STATS[d.code] || deps.UNIT_STATS[lookupCode] || { name: 'Enemy', hp: 20, atk: 5, def: 2, spd: 5 };
                const classType = deps.getUnitClassTypeFromCode(d.code);
                const spd = Number(stats.spd || 5);
                const range = Number(stats.range || stats.rng || 1);
                const move = Number(stats.move || stats.mov || 1);

                result.push({
                    id: `enemy-${currentSlot}`,
                    name: stats.name,
                    hp: stats.hp,
                    maxHp: stats.hp,
                    atk: stats.atk,
                    def: stats.def,
                    spd,
                    range,
                    move,
                    type: parsedType,
                    level: parsedLevel,
                    code: Number.isFinite(Number(lookupCode)) ? Number(lookupCode) : Number(d.code),
                    classType,
                    defenderCode: Number.isFinite(Number(lookupCode)) ? Number(lookupCode) : d.code,
                    slot: currentSlot,
                    isEnemy: true
                });
            }
        });

        return result;
    }

    function getSquadUnits(game, squad, deps) {
        const units = [];
        const getUnitDataSafe = (type, level) => {
            if (type === deps.ITEM_TYPE.UNIT_DRAGON) {
                return { name: 'Ancient Dragon', power: 9999, hp: 5000, atk: 300, def: 50, spd: 50, rng: 3, mov: 0 };
            }
            if (deps.BUILDING_DATA[type] && deps.BUILDING_DATA[type][level]) return deps.BUILDING_DATA[type][level];
            if (deps.UNIT_STATS[type]) return deps.UNIT_STATS[type];
            if (typeof level === 'string') level = parseInt(level, 10);
            if (type >= 10 && type < 20 && level) {
                const code = deps.getCode(type, level);
                if (deps.UNIT_STATS[code]) return deps.UNIT_STATS[code];
            }
            return { name: 'Unknown Unit', hp: 10, atk: 1, def: 1, spd: 1 };
        };

        squad.forEach((u, i) => {
            if (u && u.type >= 10 && (u.type < 20 || u.type === deps.ITEM_TYPE.UNIT_DRAGON)) {
                const data = getUnitDataSafe(u.type, u.level);
                const stats = window.KOVGameCoreModule.applyFieldBuffsToStats(game, data);
                units.push({
                    id: `ally-${i}`,
                    type: Number(u.type),
                    level: Math.max(1, Number(u.level || 1)),
                    code: Number(u.type) >= 1000 ? Number(u.type) : Number(deps.getCode(u.type, u.level)),
                    name: data.name,
                    hp: stats.hp,
                    maxHp: stats.hp,
                    atk: stats.atk,
                    def: stats.def,
                    spd: stats.spd || 5,
                    range: Number(stats.range || stats.rng || 1),
                    move: Number(stats.move || stats.mov || 1),
                    classType: deps.getUnitClassTypeFromCode(u.type),
                    slot: i,
                    isEnemy: false
                });
            }
        });
        return units;
    }

    function getFieldDefenders(type, deps) {
        if (type === deps.FIELD_EVENT_TYPES.CROWN) {
            return [
                { code: deps.ITEM_TYPE.UNIT_CAVALRY, count: 20, slot: 4 },
                { code: deps.ITEM_TYPE.UNIT_INFANTRY, count: 35, slot: 1 },
                { code: deps.ITEM_TYPE.UNIT_ARCHER, count: 35, slot: 7 }
            ];
        }

        if (type === deps.FIELD_EVENT_TYPES.DUNGEON) {
            return [
                { code: deps.ITEM_TYPE.UNIT_CAVALRY, count: 30, slot: 4 },
                { code: deps.ITEM_TYPE.UNIT_INFANTRY, count: 50, slot: 1 },
                { code: deps.ITEM_TYPE.UNIT_ARCHER, count: 50, slot: 7 }
            ];
        }

        if (type === deps.FIELD_EVENT_TYPES.BANDIT) {
            return [
                { code: deps.ITEM_TYPE.UNIT_INFANTRY, count: 10, slot: 4 },
                { code: deps.ITEM_TYPE.UNIT_ARCHER, count: 5, slot: 1 }
            ];
        }

        if (type === deps.FIELD_EVENT_TYPES.BANDIT_LEADER) {
            return [
                { code: deps.ITEM_TYPE.UNIT_CAVALRY, count: 10, slot: 4 },
                { code: deps.ITEM_TYPE.UNIT_INFANTRY, count: 20, slot: 1 },
                { code: deps.ITEM_TYPE.UNIT_ARCHER, count: 20, slot: 7 }
            ];
        }

        if (deps.isDragonTile(type)) {
            return [{ code: deps.ITEM_TYPE.UNIT_DRAGON, count: 1, slot: 4 }];
        }

        return [];
    }

    function cloneDefenders(defenders) {
        if (!defenders) return [];
        return defenders.map((d) => ({ code: d.code, count: d.count, slot: d.slot }));
    }

    function getDefendersForTile(game, type, r, c) {
        // Check for other armies (PvP)
        if (Array.isArray(game.otherArmies) && r !== undefined && c !== undefined) {
             const otherArmy = game.otherArmies.find(a => {
                const targetR = a.moving?.to ? a.moving.to.r : a.r;
                const targetC = a.moving?.to ? a.moving.to.c : a.c;
                return targetR === r && targetC === c;
            });
            if (otherArmy && Array.isArray(otherArmy.units)) {
                 const units = otherArmy.units.map((u, i) => {
                     if (!u) return null;
                     const code = (Number(u.type) * 100) + Number(u.level);
                     return { code, count: 1, slot: i };
                 }).filter(Boolean);
                 if (units.length > 0) return units;
            }
        }

        const data = window.KOVFieldEventLogicModule.getFieldObjectData(game, type, game.fieldObjectDataDeps);
        const base = data && Array.isArray(data.defenders) ? cloneDefenders(data.defenders) : [];
        if (r === undefined || c === undefined) return base;
        const key = `${r},${c}`;
        const state = game.fieldDefenderState?.[key];
        if (state && state.type === type && Array.isArray(state.defenders)) {
            return cloneDefenders(state.defenders);
        }
        return base;
    }

    function triggerBattleFx(game, step) {
        if (!step || (step.type !== 'attack' && step.type !== 'move')) return;
        clearBattleFxTimers(game);
        const move = getBattleMoveOffset(game, step);
        const shot = step.type === 'attack' ? getBattleShotOffset(game, step) : { x: 0, y: 0 };
        const hasProjectile = step.type === 'attack' && !!step.rangedShot;
        const moveDuration = getBattleMoveDuration(step, move.steps);
        const shotDuration = 320;
        const impactDuration = 260;
        const impactDelayNoTravel = 180;

        game.battleFx = {
            attackerId: step.attackerId,
            defenderId: step.defenderId,
            attackerTeam: step.attackerTeam,
            defenderTeam: step.defenderTeam,
            attackerSlot: Number(step.attackerSlot),
            defenderSlot: Number(step.defenderSlot),
            attackerPos: step.attackerPos,
            defenderPos: step.defenderPos,
            moved: !!step.moved,
            damage: Number(step.damage || 0),
            isCrit: !!step.isCrit,
            phase: step.moved ? 'move' : (hasProjectile ? 'projectile' : 'impact'),
            moveX: move.x,
            moveY: move.y,
            lungeX: move.lungeX || 0,
            lungeY: move.lungeY || 0,
            pathSteps: move.steps,
            shotX: shot.x,
            shotY: shot.y,
            hasProjectile,
            moveDuration,
            shotDuration
        };

        const advanceTo = (phase) => {
            if (!game.battleFx || game.battleFx.attackerId !== step.attackerId) return;
            if (phase === 'impact' || phase === 'done') applyStepDamage(game, step);
            game.battleFx.phase = phase;
            window.KOVBattleUiModule.renderBattleModal(game);
        };

        let delay = 0;
        if (step.moved) {
            delay += moveDuration;
            game.battleFxPhaseTimer = setTimeout(() => {
                advanceTo(step.type === 'move' ? 'done' : 'impact');
            }, delay);
        } else if (hasProjectile) {
            delay += shotDuration;
            game.battleFxPhaseTimer = setTimeout(() => advanceTo('impact'), delay);
        } else {
            game.battleFxPhaseTimer = setTimeout(() => advanceTo('impact'), impactDelayNoTravel);
        }

        const clearDelay = step.moved
            ? (moveDuration + (step.type === 'move' ? 100 : impactDuration + 180))
            : ((hasProjectile ? shotDuration : 0) + impactDuration + 300);
        game.battleFxClearTimer = setTimeout(() => {
            game.battleFx = null;
        }, clearDelay);
        return clearDelay;
    }

    function applyStepDamage(game, step) {
        if (!game?.battleContext) return;
        
        // Update attacker position if moved
        if (step.attackerPos) {
            let attacker = null;
            if (step.attackerTeam === 'A') {
                attacker = game.battleContext.allies?.find((u) => u.id === step.attackerId || Number(u.slot) === Number(step.attackerSlot));
            } else if (step.attackerTeam === 'B') {
                attacker = game.battleContext.defenders?.find((u) => u.id === step.attackerId || Number(u.slot) === Number(step.attackerSlot));
            }
            if (attacker) {
                attacker.pos = { r: step.attackerPos.r, c: step.attackerPos.c };
            }
        }

        let unit = null;
        const targetId = step?.defenderId;
        const targetTeam = step?.defenderTeam;
        const targetSlot = Number(step?.defenderSlot);

        if (targetTeam === 'A') {
            unit = game.battleContext.allies?.find((u) => u.id === targetId || u.sourceId === targetId || (Number.isFinite(targetSlot) && Number(u.slot) === targetSlot));
        } else if (targetTeam === 'B') {
            unit = game.battleContext.defenders?.find((u) => u.id === targetId || u.sourceId === targetId || (Number.isFinite(targetSlot) && Number(u.slot) === targetSlot));
        } else if (targetId) {
            unit = game.battleContext.allies?.find((u) => u.id === targetId || u.sourceId === targetId);
            if (!unit) unit = game.battleContext.defenders?.find((u) => u.id === targetId || u.sourceId === targetId);
        }
        
        if (!unit && Number.isFinite(targetSlot)) {
            if (targetTeam === 'A') {
                unit = game.battleContext.allies?.find((u) => Number(u.slot) === targetSlot) || null;
            } else if (targetTeam === 'B') {
                unit = game.battleContext.defenders?.find((u) => Number(u.slot) === targetSlot) || null;
            }
        }
        if (!unit) return;
        unit.hp = Number.isFinite(Number(step?.targetHp)) ? Number(step.targetHp) : unit.hp;
    }

    function getBattleMoveDuration(step, movedSteps) {
        const steps = Math.max(1, Number(movedSteps || step?.requiredMove || 1));
        const spd = Math.max(1, Number(step?.attackerSpd || 5));
        const speedScale = 6 / Math.min(20, spd); // higher spd => shorter duration
        const ms = Math.round(steps * 260 * speedScale);
        return Math.max(260, Math.min(1200, ms));
    }

    function getUnitPos(unit) {
        if (!unit) return { r: 1, c: 1 };
        if (unit.pos) return unit.pos;
        const slot = unit.slot || 0;
        const clamped = Math.max(0, Math.min(8, Number.isFinite(slot) ? slot : 0));
        const r = 2 + Math.floor(clamped / 3);
        const c = unit.isEnemy ? 5 + (2 - (clamped % 3)) : (clamped % 3);
        return { r, c };
    }

    function getBattleMoveOffset(game, step) {
        let unit = null;
        if (game && game.battleContext) {
            if (step.attackerTeam === 'A') {
                unit = game.battleContext.allies?.find(u => u.id === step.attackerId || Number(u.slot) === Number(step.attackerSlot));
            } else {
                unit = game.battleContext.defenders?.find(u => u.id === step.attackerId || Number(u.slot) === Number(step.attackerSlot));
            }
        }
        
        const oldPos = getUnitPos(unit);
        const newPos = step?.attackerPos || oldPos;
        const d = step?.defenderPos || oldPos;
        
        // Offset to new position from old position
        const toNewR = newPos.r - oldPos.r;
        const toNewC = newPos.c - oldPos.c;
        
        // Offset from new position towards defender (lunge)
        const rowDelta = d.r - newPos.r;
        const colDelta = d.c - newPos.c;
        const distToDef = Math.max(1, Math.abs(rowDelta) + Math.abs(colDelta));
        const movedSteps = Math.max(0, Number(step?.requiredMove || 0));
        const steps = Math.max(1, Math.min(3, movedSteps));
        const stepRatio = Math.max(0, Math.min(1, movedSteps / distToDef));
        
        // Output raw percentages (1 cell = 100%)
        // No large grid-cell lunge needed in 8x8, just move to newPos. 
        // Small pixel stab is handled by CSS battleRetreat.
        const moveX = `calc(${toNewC * 100}% + ${toNewC} * var(--grid-gap, 0px))`; 
        const moveY = `calc(${toNewR * 100}% + ${toNewR} * var(--grid-gap, 0px))`;
        
        const lungeX = 0;
        const lungeY = 0;
        
        return { x: moveX, y: moveY, lungeX, lungeY, steps };
    }

    function getBattleShotOffset(game, step) {
        const dist = Math.max(1, Number(step?.distance || 1));
        const a = step?.attackerPos || { r: 1, c: 1 };
        const d = step?.defenderPos || { r: 1, c: 1 };
        const sideDir = step?.attackerTeam === 'B' ? -1 : 1;
        const rowDelta = (d.r ?? 1) - (a.r ?? 1);
        const colDelta = (d.c ?? 1) - (a.c ?? 1);
        const travel = Math.max(14, Math.min(28, 8 + (dist * 4)));
        const x = travel * sideDir;
        const y = Math.max(-10, Math.min(10, (rowDelta * 4) + (colDelta * 1.5)));
        return { x, y };
    }

    function clearBattleFxTimers(game) {
        if (game.battleFxPhaseTimer) {
            clearTimeout(game.battleFxPhaseTimer);
            game.battleFxPhaseTimer = null;
        }
        if (game.battleFxClearTimer) {
            clearTimeout(game.battleFxClearTimer);
            game.battleFxClearTimer = null;
        }
    }

    global.KOVBattleCoreModule = {
        parseDefenders,
        getSquadUnits,
        cloneDefenders,
        getFieldDefenders,
        getDefendersForTile,
        clearBattleFxTimers,
        triggerBattleFx,
        getBattleMoveOffset,
        getBattleShotOffset
    };
})(window);
