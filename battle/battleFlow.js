(function (global) {
    'use strict';

    function openBattlePrepModal(game, targetType, r, c, deps) {
        const gp = deps.GAMEPLAY || deps;
        if (window.KOVWorldSeasonModule.guardWorldAction(
            game,
            game.tr('ui.field.action.attack', {}, 'Attack'),
            window.KOVWorldSeasonModule.ensureWorldState(game),
            window.KOVWorldSeasonModule.getActiveWorldEndConditions(game, game.worldAdminDeps)
        )) return;
        const objData = window.KOVFieldEventLogicModule.getFieldObjectData(game, targetType, game.fieldObjectDataDeps);
        const baseDefenders = window.KOVBattleCoreModule.getDefendersForTile(game, targetType, r, c);
        if (targetType === deps.FIELD_EVENT_TYPES.DUNGEON && !window.KOVFieldEventLogicModule.canEnterDungeon(game, r, c, true, {
            GAMEPLAY: gp
        })) return;
        if (!objData || !baseDefenders || baseDefenders.length === 0) {
            window.KOVBattleResultModule.handleBattleWin(game, r, c);
            return;
        }

        const armyId = (game.selectedArmyId !== null && game.selectedArmyId !== undefined)
            ? game.selectedArmyId
            : game.lastSelectedArmyId;
        game.battleContext = {
            targetCode: targetType,
            r,
            c,
            armyId,
            baseDefenders: window.KOVBattleCoreModule.cloneDefenders(baseDefenders),
            defenders: window.KOVBattleCoreModule.parseDefenders(game, baseDefenders, objData.level, {
                UNIT_STATS: deps.UNIT_STATS,
                getCode: deps.getCode,
                getUnitClassTypeFromCode: deps.getUnitClassTypeFromCode
            }),
            squadRef: game.lastSelectedArmyId !== null ? window.KOVFieldCommandModule.getSquadByArmyId(game, game.armies[game.lastSelectedArmyId].id) : game.squad1,
            allies: [],
            log: [],
            active: false,
            dungeonEntryConsumed: false
        };
        window.KOVBattleUiModule.resetBattleResultOverlay();
        const modal = document.getElementById('modal-battle-prep');
        if (modal) {
            modal.style.display = '';
            modal.classList.add('open');
        }
        window.KOVBattleUiModule.renderPrepGrid(game, deps);
    }

    function handlePrepDragStart(e, idx) {
        e.dataTransfer.setData('text/plain', idx);
        e.dataTransfer.effectAllowed = 'move';
    }

    function handlePrepDrop(game, e, targetIdx) {
        e.preventDefault();
        const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (Number.isNaN(sourceIdx) || sourceIdx === targetIdx) return;
        const squad = game.battleContext.squadRef;
        const temp = squad[sourceIdx];
        squad[sourceIdx] = squad[targetIdx];
        squad[targetIdx] = temp;
        window.KOVBattleUiModule.renderPrepGrid(game, game.battlePrepDeps);
        window.KOVPersistenceModule.saveGame(game);
    }

    async function confirmBattleStart(game, deps) {
        const gp = deps.GAMEPLAY || deps;
        try {
            if (!game.battleContext) {
                alert(game.tr('ui.alert.battle_context_missing', {}, 'Battle context is missing. Closing battle setup.'));
                closeBattlePrepModal(game);
                return;
            }
            if (game.battleContext.targetCode === deps.FIELD_EVENT_TYPES.DUNGEON && !game.battleContext.dungeonEntryConsumed) {
                const { r, c } = game.battleContext;
                if (!window.KOVFieldEventLogicModule.canEnterDungeon(game, r, c, true, {
                    GAMEPLAY: gp
                })) return;
                window.KOVFieldEventLogicModule.consumeDungeonEntry(game, r, c, {
                    GAMEPLAY: gp
                });
                game.battleContext.dungeonEntryConsumed = true;
                window.KOVUiShellModule.updateUI(game, game.uiShellDeps);
                window.KOVPersistenceModule.saveGame(game);
            }
            const prep = document.getElementById('modal-battle-prep');
            if (prep) {
                prep.classList.remove('open');
                prep.style.display = 'none';
            }
            const modal = document.getElementById('modal-battle');
            if (modal) {
                modal.style.display = '';
                modal.classList.add('open');
            }
            game.battleContext.allies = window.KOVBattleCoreModule.getSquadUnits(game, game.battleContext.squadRef, {
                ITEM_TYPE: game.ITEM_TYPE || {},
                BUILDING_DATA: game.BUILDING_DATA || {},
                UNIT_STATS: deps.UNIT_STATS,
                getCode: deps.getCode,
                getUnitClassTypeFromCode: deps.getUnitClassTypeFromCode
            });
            startBattleSimulation(game, deps);
        } catch (e) {
            alert(game.tr('ui.alert.battle_error', { message: e.message }, `Battle error: ${e.message}`));
            window.KOVUiShellModule.closeAllModals(game);
        }
    }

    function closeBattlePrepModal(game) {
        try {
            game.armies.forEach((army) => {
                if (army.state === 'IDLE' || army.state === 'MOVING_TO') {
                    army.target = null;
                    army.path = [];
                }
            });
            const prepModal = document.getElementById('modal-battle-prep');
            if (prepModal) {
                prepModal.classList.remove('open');
                prepModal.style.display = 'none';
            }
            const battleModal = document.getElementById('modal-battle');
            if (battleModal) {
                battleModal.classList.remove('open');
                battleModal.style.display = 'none';
            }
            window.KOVBattleCoreModule.clearBattleFxTimers(game);
            game.battleFx = null;
            game.battleContext = null;
            window.KOVPersistenceModule.saveGame(game);
        } catch (e) {
            const prepModal = document.getElementById('modal-battle-prep');
            if (prepModal) prepModal.style.display = 'none';
            const battleModal = document.getElementById('modal-battle');
            if (battleModal) battleModal.style.display = 'none';
        }
    }

    function localizeBattleSide(game, side) {
        if (side === 'allies') return game.tr('battle.side.allies', {}, 'Allies');
        if (side === 'defenders') return game.tr('battle.side.defenders', {}, 'Defenders');
        return side;
    }

    function localizeBattleLogMessage(game, msg) {
        if (typeof msg !== 'string') return msg;
        const text = msg.trim();
        if (!text) return msg;
        if (text === 'Battle simulation start') return game.tr('battle.log.start', {}, 'Battle started!');
        let m = text.match(/^\[Turn\s+(\d+)\]$/i);
        if (m) return game.tr('battle.log.turn', { turn: m[1] }, `[Turn ${m[1]}]`);
        m = text.match(/^(.+)\s+cannot reach a target$/i);
        if (m) return game.tr('battle.log.cannot_reach', { name: m[1] }, `${m[1]} cannot reach a target`);
        m = text.match(/^Winner:\s*(allies|defenders)$/i);
        if (m) {
            const side = localizeBattleSide(game, m[1].toLowerCase());
            return game.tr('battle.log.winner', { winner: side }, `Winner: ${side}`);
        }
        m = text.match(/^Max turns reached,\s*winner by remaining HP:\s*(allies|defenders)$/i);
        if (m) {
            const side = localizeBattleSide(game, m[1].toLowerCase());
            return game.tr('battle.log.max_turns_winner', { winner: side }, `Max turns reached, winner by remaining HP: ${side}`);
        }
        m = text.match(/^No units can engage this turn\s*\((\d+)\/(\d+)\)$/i);
        if (m) {
            return game.tr(
                'battle.log.stall_turn',
                { cur: m[1], max: m[2] },
                `No units can engage this turn (${m[1]}/${m[2]})`
            );
        }
        m = text.match(/^Stalemate detected,\s*winner by remaining HP:\s*(allies|defenders)$/i);
        if (m) {
            const side = localizeBattleSide(game, m[1].toLowerCase());
            return game.tr('battle.log.stalemate_winner', { winner: side }, `Stalemate detected, winner by remaining HP: ${side}`);
        }
        m = text.match(/^(.+)\s+defeated$/i);
        if (m) return game.tr('battle.log.kill', { name: m[1] }, `${m[1]} defeated!`);
        return msg;
    }

    function addBattleLog(game, msg) {
        if (!game.battleContext) return;
        game.battleContext.log.push(localizeBattleLogMessage(game, msg));
        if (window.KOVBattleUiModule && typeof window.KOVBattleUiModule.renderBattleLog === 'function') {
            window.KOVBattleUiModule.renderBattleLog(game);
        }
    }

    function startBattleSimulation(game, deps) {
        if (!game.battleContext) return;
        game.battleContext.active = true;
        window.KOVBattleUiModule.resetBattleResultOverlay();
        if (typeof deps.BattleSimulator === 'undefined') {
            addBattleLog(game, game.tr('battle.error.simulator_missing', {}, 'Error: Battle Simulator missing.'));
            return;
        }
        const controls = document.getElementById('battle-controls');
        if (controls) controls.style.display = 'none';
        try {
            const sim = new deps.BattleSimulator();
            const result = sim.simulate(game.battleContext.allies, game.battleContext.defenders);
            game.battleSimulation = result;
            game.battleStepIndex = 0;
            game.battleContext.log = [];
            window.KOVBattleUiModule.renderBattleModal(game);
            if (game.battleTimer) clearTimeout(game.battleTimer);
            battleTick(game);
        } catch (e) {
            addBattleLog(game, game.tr('battle.error.simulation', { message: e.message }, `Simulation Error: ${e.message}`));
        }
    }

    function scheduleNextBattleTick(game, delayMs) {
        if (game.battleTimer) clearTimeout(game.battleTimer);
        const delay = Math.max(360, Number(delayMs || 1000));
        game.battleTimer = setTimeout(() => battleTick(game), delay);
    }

    function battleTick(game) {
        if (!game.battleContext || !game.battleContext.active || !game.battleSimulation) return;
        const steps = game.battleSimulation.steps;
        if (game.battleStepIndex >= steps.length) {
            endBattle(game, game.battleSimulation.winner === 'allies');
            return;
        }
        const step = steps[game.battleStepIndex];
        game.battleStepIndex++;
        let nextDelay = 920;
        if (step.type === 'log') {
            addBattleLog(game, step.msg);
            nextDelay = 320;
        } else if (step.type === 'attack') {
            addBattleLog(game, step.msg);
            const fxDelay = Number(window.KOVBattleCoreModule.triggerBattleFx(game, step) || 0);
            if (fxDelay > 0) nextDelay = fxDelay + 140;
            window.KOVBattleUiModule.renderBattleModal(game);
        }
        if (game.battleContext && game.battleContext.active) {
            scheduleNextBattleTick(game, nextDelay);
        }
    }

    function endBattle(game, isWin) {
        clearTimeout(game.battleTimer);
        game.battleTimer = null;
        game.battleContext.active = false;
        window.KOVBattleCoreModule.clearBattleFxTimers(game);
        game.battleFx = null;
        const outcome = String(game.battleSimulation?.outcome || 'wipeout');
        const decisiveWin = !!isWin && outcome === 'wipeout';
        window.KOVBattleResultModule.applyDefenderLoss(game, decisiveWin);
        window.KOVBattleResultModule.applyAllyLoss(game);
        window.KOVBattleResultModule.handleEmptySquadRetreat(game, decisiveWin);
        const rewardCtx = game.battleContext
            ? { targetCode: game.battleContext.targetCode, r: game.battleContext.r, c: game.battleContext.c }
            : null;

        const title = document.getElementById('battle-result-title');
        const overlay = document.getElementById('battle-result-overlay');
        if (overlay) overlay.style.display = 'flex';

        if (decisiveWin) {
            if (title) {
                title.innerText = game.tr('battle.result.victory', {}, 'VICTORY');
                title.className = 'battle-result-text win';
            }
            game.sound.playLevelUp();
            addBattleLog(game, game.tr('battle.log.victory_capture', {}, 'Battle won! Capturing tile.'));
            setTimeout(() => {
                if (rewardCtx) window.KOVBattleResultModule.handleBattleWin(game, rewardCtx.r, rewardCtx.c);
                if (window.KOVBattleResultModule.handleAllSquadsEmptyAfterBattle(game)) return;
                window.KOVBattleUiModule.closeBattleModal(game);
                if (rewardCtx) window.KOVBattleRewardModule.openBattleRewardModal(game, rewardCtx);
            }, 1500);
        } else {
            if (title) {
                title.innerText = game.tr('battle.result.defeat', {}, 'DEFEAT');
                title.className = 'battle-result-text lose';
            }
            game.sound.playError();
            if (isWin && outcome !== 'wipeout') {
                addBattleLog(game, game.tr('battle.log.stalemate_retreat', {}, 'Battle ended without wipeout. Army retreats.'));
            } else {
                addBattleLog(game, game.tr('battle.log.defeat_retreat', {}, 'Battle lost. Army retreats.'));
            }
            setTimeout(() => {
                window.KOVBattleResultModule.handleAllSquadsEmptyAfterBattle(game);
            }, 200);
        }
    }

    global.KOVBattleFlowModule = {
        openBattlePrepModal,
        handlePrepDragStart,
        handlePrepDrop,
        confirmBattleStart,
        closeBattlePrepModal,
        localizeBattleLogMessage,
        addBattleLog,
        startBattleSimulation,
        battleTick,
        endBattle
    };
})(window);


