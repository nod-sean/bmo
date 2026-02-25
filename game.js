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

        this.runtimeConfig = RUNTIME; // Expose for TitleUI

        // Initialize Game Runtime (Default to Offline, switchable)
        const isOnline = true; // Enable Online Mode
        if (isOnline && window.KOVOnlineRuntimeModule) {
            this.runtime = new window.KOVOnlineRuntimeModule.OnlineRuntime();
        } else if (window.KOVOfflineRuntimeModule) {
            this.runtime = new window.KOVOfflineRuntimeModule.OfflineRuntime();
        } else {
            console.warn('[Game] No runtime module found, defaulting to null runtime.');
            this.runtime = null;
        }

        window.KOVGameInstanceSetupModule.applyGameInstanceSetup(this, RUNTIME);
        // bootstrapGameState(this, BOOTSTRAP_STATE_DEPS); // Defer until login
    }

    async start() {
        if (this.started) return;
        this.started = true;
        await bootstrapGameState(this, BOOTSTRAP_STATE_DEPS);
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

// Title & Auth Flow Integration
(async function() {
    if (document.readyState === 'loading') {
        await new Promise(r => document.addEventListener('DOMContentLoaded', r));
    }

    if (window.KOVTitleUiModule) {
        window.KOVTitleUiModule.setupTitle(game);
        
        // Auto-restore check
        const user = await window.KOVAuthSessionModule.restoreSession();
        if (user) {
            console.log('[Game] Session restored:', user.name);
            window.KOVTitleUiModule.startGame(game);
        } else {
            console.log('[Game] No session, showing title.');
            window.KOVTitleUiModule.showTitle(game);
        }
    } else {
        // Fallback if Title UI missing
        console.warn('[Game] Title UI missing, auto-starting.');
        game.start();
    }
})();
