class BattleSimulator {
    constructor() {
        this.log = [];
        this.maxTurns = 50;
        this.maxStallTurns = 3;
        this.defaultConfig = {
            BASE_DMG: 1,
            ADVANTAGE_BONUS: 1.5,
            CRIT_CHANCE: 0.05,
            CRIT_MULT: 1.5
        };
    }

    getConfig() {
        const runtime = window?.GAME_DATA?.constants?.BATTLE_CONSTANTS || {};
        return {
            BASE_DMG: Number.isFinite(runtime.BASE_DMG) ? runtime.BASE_DMG : this.defaultConfig.BASE_DMG,
            ADVANTAGE_BONUS: Number.isFinite(runtime.ADVANTAGE_BONUS) ? runtime.ADVANTAGE_BONUS : this.defaultConfig.ADVANTAGE_BONUS,
            CRIT_CHANCE: Number.isFinite(runtime.CRIT_CHANCE) ? runtime.CRIT_CHANCE : this.defaultConfig.CRIT_CHANCE,
            CRIT_MULT: Number.isFinite(runtime.CRIT_MULT) ? runtime.CRIT_MULT : this.defaultConfig.CRIT_MULT
        };
    }

    normalizeUnit(unit, team, fallbackId) {
        const hp = Number.isFinite(unit.hp) ? unit.hp : 1;
        const maxHp = Number.isFinite(unit.maxHp) ? unit.maxHp : hp;
        const slot = Number.isFinite(unit.slot) ? unit.slot : 0;
        const spd = Number.isFinite(unit.spd) ? unit.spd : 1;
        const atk = Number.isFinite(unit.atk) ? unit.atk : 1;
        const def = Number.isFinite(unit.def) ? unit.def : 0;
        const range = Number.isFinite(unit.range) ? unit.range : 1;
        const move = Number.isFinite(unit.move) ? unit.move : 1;
        const classType = Number.isFinite(unit.classType) ? unit.classType : 0;

        const simId = `${team}-${slot}-${fallbackId}`;

        return {
            ...unit,
            team,
            id: simId,
            sourceId: unit.id || fallbackId,
            name: unit.name || fallbackId,
            hp,
            maxHp,
            currentHp: hp,
            atk,
            def,
            spd,
            range,
            move,
            classType,
            slot,
            pos: this.getPos(slot, team)
        };
    }

    getPos(slot, team) {
        const clamped = Math.max(0, Math.min(8, Number.isFinite(slot) ? slot : 0));
        // 8x8 Grid System (r: 0~7, c: 0~7)
        // Team A (Allies) starts on the left, Team B (Enemies) starts on the right.
        // Rows: Center them vertically, so slot%3 maps to rows 2, 3, 4
        const r = 2 + (clamped % 3);
        
        let c;
        if (team === 'A') {
            // Frontline (slots 0,1,2) at c=2, Mid (3,4,5) at c=1, Back (6,7,8) at c=0
            c = 2 - Math.floor(clamped / 3);
        } else {
            // Frontline (slots 0,1,2) at c=5, Mid (3,4,5) at c=6, Back (6,7,8) at c=7
            c = 5 + Math.floor(clamped / 3);
        }
        return { r, c };
    }

    getDistance(attacker, target) {
        const a = attacker.pos || this.getPos(attacker.slot, attacker.team);
        const b = target.pos || this.getPos(target.slot, target.team);
        return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
    }

    getGridOccupancy(activeUnits, excludeUnit = null) {
        const grid = Array.from({ length: 8 }, () => Array(8).fill(false));
        if (!activeUnits) return grid;
        for (const u of activeUnits) {
            if (u.currentHp > 0 && u !== excludeUnit) {
                const r = u.pos ? u.pos.r : this.getPos(u.slot, u.team).r;
                const c = u.pos ? u.pos.c : this.getPos(u.slot, u.team).c;
                if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    grid[r][c] = true;
                }
            }
        }
        return grid;
    }

    findPath(start, goal, grid, maxSteps) {
        const queue = [{r: start.r, c: start.c, dist: 0, path: []}];
        const visited = Array.from({length: 8}, () => Array(8).fill(false));
        visited[start.r][start.c] = true;
        
        let closestNode = { r: start.r, c: start.c, dist: 0, path: [] };
        let minHeuristic = Math.abs(start.r - goal.r) + Math.abs(start.c - goal.c);
        
        while(queue.length > 0) {
            const current = queue.shift();
            
            const h = Math.abs(current.r - goal.r) + Math.abs(current.c - goal.c);
            if (h < minHeuristic) {
                minHeuristic = h;
                closestNode = current;
            } else if (h === minHeuristic && current.dist < closestNode.dist) {
                closestNode = current;
            }
            
            if (h <= 1 && grid[goal.r] && grid[goal.r][goal.c]) {
                if (h < minHeuristic) {
                     minHeuristic = h;
                     closestNode = current;
                }
            }
            if (h === 0) {
                closestNode = current;
                break;
            }
            if (current.dist >= maxSteps) continue;
            
            const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
            dirs.sort((a,b) => {
                const da = Math.abs((current.r + a[0]) - goal.r) + Math.abs((current.c + a[1]) - goal.c);
                const db = Math.abs((current.r + b[0]) - goal.r) + Math.abs((current.c + b[1]) - goal.c);
                return da - db;
            });
            
            for (const [dr, dc] of dirs) {
                const nr = current.r + dr;
                const nc = current.c + dc;
                
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !visited[nr][nc]) {
                    if (!grid[nr][nc] || (nr === goal.r && nc === goal.c)) {
                        visited[nr][nc] = true;
                        if (nr !== goal.r || nc !== goal.c) {
                            queue.push({
                                r: nr,
                                c: nc,
                                dist: current.dist + 1,
                                path: [...current.path, {r: nr, c: nc}]
                            });
                        }
                    }
                }
            }
        }
        return closestNode.path;
    }

    moveUnitToward(attacker, target, steps, activeUnits) {
        if (!attacker || !target || steps <= 0) return 0;
        if (!attacker.pos) attacker.pos = this.getPos(attacker.slot, attacker.team);
        if (!target.pos) target.pos = this.getPos(target.slot, target.team);

        const grid = this.getGridOccupancy(activeUnits, attacker);
        const path = this.findPath(attacker.pos, target.pos, grid, steps);
        
        if (path && path.length > 0) {
            const finalPos = path[path.length - 1];
            attacker.pos.r = finalPos.r;
            attacker.pos.c = finalPos.c;
            return path.length;
        }
        return 0;
    }

    isAdvantage(attackerClass, defenderClass) {
        return (
            (attackerClass === 10 && defenderClass === 12) ||
            (attackerClass === 12 && defenderClass === 11) ||
            (attackerClass === 11 && defenderClass === 10)
        );
    }

    buildTargetCandidate(attacker, enemy, activeUnits) {
        if (!attacker.pos) attacker.pos = this.getPos(attacker.slot, attacker.team);
        if (!enemy.pos) enemy.pos = this.getPos(enemy.slot, enemy.team);

        const mDist = this.getDistance(attacker, enemy);
        const range = Math.max(0, attacker.range || 0);
        const move = Math.max(0, attacker.move || 0);
        
        let pathDist = mDist;
        let requiredMove = Math.max(0, mDist - range);
        
        // If manhattan distance suggests it might be reachable or we need to pathfind
        if (mDist > range) {
            const grid = this.getGridOccupancy(activeUnits, attacker);
            // find path with a large max steps to see if it's reachable at all
            const fullPath = this.findPath(attacker.pos, enemy.pos, grid, 20);
            if (fullPath) {
                // path length is the actual distance to the closest point
                // Wait, findPath returns a path to the closest reachable node to the enemy.
                // The actual distance from the end of that path to the enemy is:
                const endNode = fullPath.length > 0 ? fullPath[fullPath.length - 1] : attacker.pos;
                const distFromEndToEnemy = Math.abs(endNode.r - enemy.pos.r) + Math.abs(endNode.c - enemy.pos.c);
                if (distFromEndToEnemy <= range) {
                     requiredMove = fullPath.length;
                } else {
                     requiredMove = fullPath.length + (distFromEndToEnemy - range); // estimate
                }
            }
        }

        const reachable = requiredMove <= move;
        const hp20 = enemy.currentHp <= (enemy.maxHp * 0.2);
        const hasAdvantage = this.isAdvantage(attacker.classType, enemy.classType);
        const stationary = mDist <= range;

        return {
            enemy,
            dist: mDist,
            requiredMove,
            reachable,
            stationary,
            hp20,
            hasAdvantage
        };
    }

    selectTarget(attacker, enemies, activeUnits) {
        const candidates = enemies
            .map((enemy) => this.buildTargetCandidate(attacker, enemy, activeUnits))
            .filter((c) => c.reachable);

        if (candidates.length === 0) {
            return null;
        }

        candidates.sort((a, b) => {
            if (a.hp20 !== b.hp20) return a.hp20 ? -1 : 1;
            if (a.hasAdvantage !== b.hasAdvantage) return a.hasAdvantage ? -1 : 1;
            if (a.stationary !== b.stationary) return a.stationary ? -1 : 1;
            if (a.enemy.currentHp !== b.enemy.currentHp) return a.enemy.currentHp - b.enemy.currentHp;
            if (a.dist !== b.dist) return a.dist - b.dist;
            return (a.enemy.slot || 0) - (b.enemy.slot || 0);
        });

        return candidates[0];
    }

    attack(attacker, defender, steps, config, metadata) {
        const attackerAdv = this.isAdvantage(attacker.classType, defender.classType);
        const defenderAdv = this.isAdvantage(defender.classType, attacker.classType);
        const attackerPos = attacker.pos || this.getPos(attacker.slot, attacker.team);
        const defenderPos = defender.pos || this.getPos(defender.slot, defender.team);
        const hpBefore = defender.currentHp;

        let effectiveAtk = attacker.atk;
        let effectiveDef = defender.def;

        // Design spec: on favorable matchup, atk/def values are boosted by 1.5x.
        if (attackerAdv) effectiveAtk *= config.ADVANTAGE_BONUS;
        if (defenderAdv) effectiveDef *= config.ADVANTAGE_BONUS;

        // Design spec: dmg = atk * (100 / (100 + def))
        let damage = config.BASE_DMG * (effectiveAtk * (100 / (100 + effectiveDef)));
        const isCrit = Math.random() < config.CRIT_CHANCE;
        if (isCrit) {
            damage *= config.CRIT_MULT;
        }

        damage = Math.max(1, Math.floor(damage));
        defender.currentHp = Math.max(0, defender.currentHp - damage);

        let msg = `${attacker.name} (x${attackerPos.c + 1},y${attackerPos.r + 1}) -> ${defender.name} (x${defenderPos.c + 1},y${defenderPos.r + 1}) : ${damage} dmg, hp ${hpBefore}->${defender.currentHp}`;
        if (metadata && metadata.hasAdvantage) msg += ' (advantage)';
        if (metadata && metadata.stationary) msg += ' (no-move)';
        else if (metadata && metadata.requiredMove > 0) msg += ` (move ${metadata.requiredMove})`;
        if (isCrit) msg = `[CRIT] ${msg}`;

        steps.push({
            type: 'attack',
            msg,
            attackerId: attacker.id,
            defenderId: defender.id,
            attackerTeam: attacker.team,
            defenderTeam: defender.team,
            attackerSpd: Number(attacker.spd || 1),
            attackerSlot: attacker.slot,
            defenderSlot: defender.slot,
            attackerPos: { r: attackerPos.r, c: attackerPos.c },
            defenderPos: { r: defenderPos.r, c: defenderPos.c },
            moved: !!(metadata && metadata.requiredMove > 0),
            requiredMove: metadata && Number.isFinite(metadata.requiredMove) ? metadata.requiredMove : 0,
            distance: metadata && Number.isFinite(metadata.dist) ? metadata.dist : 1,
            rangedShot: !!(metadata && metadata.stationary && metadata.dist > 1),
            hpBefore,
            hpAfter: defender.currentHp,
            isCrit,
            damage,
            targetHp: defender.currentHp
        });

        if (defender.currentHp <= 0) {
            steps.push({ type: 'log', msg: `${defender.name} defeated` });
        }
    }

    simulate(allies, defenders) {
        const steps = [];
        const config = this.getConfig();

        steps.push({ type: 'log', msg: 'Battle simulation start' });

        const teamA = allies.map((u, i) => this.normalizeUnit(u, 'A', `ally-${i}`));
        const teamB = defenders.map((u, i) => this.normalizeUnit(u, 'B', `enemy-${i}`));

        let turn = 0;
        let winner = null;
        let outcome = 'wipeout';
        let stallTurns = 0;

        while (turn < this.maxTurns) {
            turn += 1;
            steps.push({ type: 'log', msg: `[Turn ${turn}]` });
            let attacksThisTurn = 0;
            let noTargetCount = 0;
            let movementThisTurn = 0;

            const activeUnits = [...teamA, ...teamB]
                .filter((u) => u.currentHp > 0)
                .sort((a, b) => (b.spd - a.spd) || ((a.slot || 0) - (b.slot || 0)));

            if (activeUnits.length === 0) break;

            for (const unit of activeUnits) {
                if (unit.currentHp <= 0) continue;

                const enemies = unit.team === 'A' ? teamB : teamA;
                const liveEnemies = enemies.filter((e) => e.currentHp > 0);
                if (liveEnemies.length === 0) {
                    winner = unit.team === 'A' ? 'allies' : 'defenders';
                    break;
                }

                const selected = this.selectTarget(unit, liveEnemies, activeUnits);
                if (!selected) {
                    const nearest = liveEnemies
                        .map((enemy) => ({ enemy, dist: this.getDistance(unit, enemy) }))
                        .sort((a, b) => a.dist - b.dist)[0];
                    if (nearest) {
                        const need = Math.max(0, nearest.dist - Math.max(0, unit.range || 0));
                        const advance = Math.min(Math.max(0, unit.move || 0), need);
                        if (advance > 0) {
                            const moved = this.moveUnitToward(unit, nearest.enemy, advance, activeUnits);
                            movementThisTurn += moved;
                            if (moved > 0) {
                                const p = unit.pos || this.getPos(unit.slot, unit.team);
                                steps.push({ type: 'log', msg: `${unit.name} advances to (x${p.c + 1},y${p.r + 1})` });
                                steps.push({
                                    type: 'move',
                                    msg: `${unit.name} moved`,
                                    attackerId: unit.id,
                                    attackerTeam: unit.team,
                                    attackerSpd: Number(unit.spd || 1),
                                    attackerSlot: unit.slot,
                                    attackerPos: { r: p.r, c: p.c },
                                    moved: true,
                                    requiredMove: moved
                                });
                            } else {
                                noTargetCount += 1;
                            }
                        } else {
                            noTargetCount += 1;
                        }
                    } else {
                        noTargetCount += 1;
                    }
                    continue;
                }

                if (selected.requiredMove > 0) {
                    const moved = this.moveUnitToward(unit, selected.enemy, selected.requiredMove, activeUnits);
                    movementThisTurn += moved;
                    selected.requiredMove = moved;
                    selected.dist = this.getDistance(unit, selected.enemy);
                    selected.stationary = selected.requiredMove <= 0;
                }
                // Strict guard: attack is valid only if final distance is within attack range.
                if (selected.dist > Math.max(0, unit.range || 0)) {
                    noTargetCount += 1;
                    continue;
                }
                this.attack(unit, selected.enemy, steps, config, selected);
                attacksThisTurn += 1;
            }

            if (winner) break;
            if (teamA.every((u) => u.currentHp <= 0)) { winner = 'defenders'; break; }
            if (teamB.every((u) => u.currentHp <= 0)) { winner = 'allies'; break; }

            if (attacksThisTurn <= 0 && movementThisTurn <= 0) {
                stallTurns += 1;
                if (noTargetCount > 0) {
                    steps.push({
                        type: 'log',
                        msg: `No units can engage this turn (${stallTurns}/${this.maxStallTurns})`
                    });
                }
                if (stallTurns >= this.maxStallTurns) {
                    const hpA = teamA.reduce((sum, u) => sum + Math.max(0, u.currentHp), 0);
                    const hpB = teamB.reduce((sum, u) => sum + Math.max(0, u.currentHp), 0);
                    winner = hpA >= hpB ? 'allies' : 'defenders';
                    outcome = 'stalemate';
                    steps.push({ type: 'log', msg: `Stalemate detected, winner by remaining HP: ${winner}` });
                    break;
                }
            } else {
                stallTurns = 0;
            }
        }

        if (!winner) {
            const hpA = teamA.reduce((sum, u) => sum + Math.max(0, u.currentHp), 0);
            const hpB = teamB.reduce((sum, u) => sum + Math.max(0, u.currentHp), 0);
            winner = hpA >= hpB ? 'allies' : 'defenders';
            outcome = 'max_turns';
            steps.push({ type: 'log', msg: `Max turns reached, winner by remaining HP: ${winner}` });
        } else {
            steps.push({ type: 'log', msg: `Winner: ${winner}` });
        }

        return {
            winner,
            outcome,
            steps,
            survivors: winner === 'allies' ? teamA : teamB
        };
    }
}

window.BattleSimulator = BattleSimulator;
