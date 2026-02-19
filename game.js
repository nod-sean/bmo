const { requireModuleFunction } = window.KOVModuleUtils;
const buildGameRuntimeContext = requireModuleFunction('KOVGameRuntimeContextModule', 'buildGameRuntimeContext');
if (!window.__KOV_BOOT_GAME_DATA__) {
    throw new Error('[KOV] Missing boot game data (__KOV_BOOT_GAME_DATA__).');
}
const RUNTIME = buildGameRuntimeContext(window.__KOV_BOOT_GAME_DATA__);
if (!RUNTIME || typeof RUNTIME !== 'object' || !RUNTIME.core || typeof RUNTIME.core !== 'object') {
    throw new Error('[KOV] Missing runtime core group.');
}
const CORE = RUNTIME.core;
const BOOTSTRAP_STATE_DEPS = CORE.BOOTSTRAP_STATE_DEPS;
const bootstrapGameState = CORE.bootstrapGameState;

function initCoreSurface(game) {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    game.width = 1080;
    game.height = 1920;
    game.assets = new CORE.AssetLoader();
    game.sound = new CORE.SoundManager();
}

class Game {
    constructor() {
        initCoreSurface(this);

        window.KOVGameInstanceSetupModule.applyGameInstanceSetup(this, RUNTIME);
        bootstrapGameState(this, BOOTSTRAP_STATE_DEPS);
    }

    requestRender() {
        this.isDirty = true;
    }

    spawnParticles(x, y, color, count, type) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new CORE.Particle(x, y, color, type));
        }
        this.isDirty = true;
    }

    tr(key, params = {}, fallback = '') {
        return CORE.t(this.locale, key, params, fallback);
    }
}

const game = new Game();
window.game = game;
