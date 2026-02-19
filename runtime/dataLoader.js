(function () {
    const DEFAULT_DATA_FILES = [
        'buildings.json',
        'camps.json',
        'chests.json',
        'constants.json',
        'field_map.json',
        'field_objects.json',
        'items.json',
        'level_data.json',
        'localization.json',
        'merge_xp.json',
        'units.json',
        'unlock_conditions.json'
    ];

    const currentScript = document.currentScript;
    const gameScriptSrc = (currentScript && currentScript.getAttribute('data-game-script')) || 'game.js';

    function toKey(fileName) {
        return fileName.replace(/\.json$/i, '');
    }

    async function fetchJson(url) {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    function renderBootError(message, details) {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.inset = '0';
        container.style.background = '#111827';
        container.style.color = '#f9fafb';
        container.style.zIndex = '99999';
        container.style.padding = '20px';
        container.style.fontFamily = 'monospace';
        container.style.whiteSpace = 'pre-wrap';
        container.style.overflow = 'auto';

        const detailText = details ? `\n\nDetails:\n${details}` : '';
        container.textContent = `${message}${detailText}`;
        document.body.appendChild(container);
    }

    async function loadManifest() {
        try {
            return await fetchJson(`data/manifest.json?t=${Date.now()}`);
        } catch (err) {
            console.warn('[data_loader] manifest load failed, using default list:', err.message);
            return null;
        }
    }

    function resolveFiles(manifest) {
        const files = Array.isArray(manifest && manifest.files) ? manifest.files : DEFAULT_DATA_FILES;
        return files
            .filter((file) => typeof file === 'string' && file.endsWith('.json'))
            .filter((file) => file !== 'manifest.json' && file !== 'game_data.json');
    }

    async function loadGameData(manifest) {
        const files = resolveFiles(manifest);
        const versionTag = (manifest && manifest.version) || Date.now().toString();
        const loadedPairs = await Promise.all(files.map(async (file) => {
            const payload = await fetchJson(`data/${file}?v=${versionTag}`);
            return [toKey(file), payload];
        }));

        const gameData = Object.fromEntries(loadedPairs);
        gameData.build_timestamp = (manifest && manifest.generated_at) || new Date().toISOString();
        gameData.build_version = (manifest && manifest.version) || 'dev';
        return gameData;
    }

    function mountGameScript() {
        const script = document.createElement('script');
        script.src = gameScriptSrc;
        script.async = false;
        script.onerror = () => {
            console.error(`[data_loader] failed to load game script: ${gameScriptSrc}`);
        };
        document.body.appendChild(script);
    }

    async function boot() {
        try {
            const manifest = await loadManifest();
            window.__GAME_DATA_MANIFEST__ = manifest;
            const gameData = await loadGameData(manifest);
            window.__KOV_BOOT_GAME_DATA__ = gameData;
            mountGameScript();
        } catch (err) {
            console.error('[data_loader] failed to initialize boot game data:', err);
            const isFileProtocol = window.location.protocol === 'file:';
            if (isFileProtocol) {
                renderBootError(
                    '[KOV] Cannot load data on file:// due to browser CORS.\n'
                    + 'Run a local web server and open with http://.\n\n'
                    + 'Quick fix:\n'
                    + '1) In project root, run: npm run serve\n'
                    + '2) Open: http://localhost:8083/src/index.html\n'
                    + '   (or http://localhost:8083/ if dist is built)'
                    ,
                    String(err && err.message ? err.message : err)
                );
                return;
            }

            renderBootError(
                '[KOV] Failed to initialize boot game data.\n'
                + 'Check console/network and verify data files exist under src/data.',
                String(err && err.message ? err.message : err)
            );
        }
    }

    boot();
})();
