(function (global) {
    'use strict';

    function buildGameMethodDeps(allDeps) {
        const BOOTSTRAP_STATE_DEPS = Object.freeze({ ...allDeps });
        const FIELD_INFO_DEPS = Object.freeze({ ...allDeps });
        const BATTLE_PREP_DEPS = Object.freeze({ ...allDeps });
        const BATTLE_START_DEPS = Object.freeze({ ...allDeps });
        const POPULATE_FIELD_EVENTS_DEPS = Object.freeze({ ...allDeps });
        const MERGE_LOOP_DEPS = Object.freeze({ ...allDeps });
        const FIELD_ACTION_MENU_DEPS = Object.freeze({ ...allDeps });
        const FIELD_RENDER_BASE_DEPS = Object.freeze({ ...allDeps });
        const FIELD_UI_VISUAL_DEPS = Object.freeze({ ...allDeps });
        const FIELD_MAP_RENDER_DEPS = Object.freeze({ ...allDeps });
        const UPDATE_ARMIES_DEPS = Object.freeze({ ...allDeps });

        const METHOD_DEPS = Object.freeze({
            FIELD_INFO: FIELD_INFO_DEPS,
            BATTLE_PREP: BATTLE_PREP_DEPS,
            BATTLE_START: BATTLE_START_DEPS,
            POPULATE_FIELD_EVENTS: POPULATE_FIELD_EVENTS_DEPS,
            MERGE_LOOP: MERGE_LOOP_DEPS,
            FIELD_ACTION_MENU: FIELD_ACTION_MENU_DEPS,
            FIELD_UI_VISUAL: FIELD_UI_VISUAL_DEPS,
            FIELD_MAP_RENDER: FIELD_MAP_RENDER_DEPS,
            UPDATE_ARMIES: UPDATE_ARMIES_DEPS
        });

        return {
            BOOTSTRAP_STATE_DEPS,
            METHOD_DEPS
        };
    }

    global.KOVGameMethodDepsModule = { buildGameMethodDeps };
})(window);
