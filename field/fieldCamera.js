(function (global) {
    'use strict';

    function moveCameraTo(game, targetX, targetY, viewport, mapLayer) {
        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        const newX = (viewportWidth / 2) - (targetX * game.camera.scale);
        const newY = (viewportHeight / 2) - (targetY * game.camera.scale);
        mapLayer.style.transition = 'transform 0.3s ease-out';
        game.camera.x = newX;
        game.camera.y = newY;
        mapLayer.style.transform = `translate(${game.camera.x}px, ${game.camera.y}px) scale(${game.camera.scale})`;
        const labelScale = Math.max(0.5, Math.min(1.15, 1 / game.camera.scale));
        mapLayer.style.setProperty('--label-scale', labelScale.toFixed(3));
        window.KOVFieldUiModule.updateFloatingPanelPositionFromSelection(game);
        setTimeout(() => {
            mapLayer.style.transition = 'none';
        }, 300);
    }

    function centerCameraOnArmy(game, armyId) {
        const army = game.armies[armyId];
        const viewport = document.getElementById('map-viewport');
        const mapLayer = document.getElementById('map-layer');
        if (!army || !viewport || !mapLayer || !game.camera) return;
        const TILE_SIZE = 13;
        const tx = 50 + (army.c * TILE_SIZE) + (TILE_SIZE / 2);
        const ty = 50 + (army.r * TILE_SIZE) + (TILE_SIZE / 2);
        moveCameraTo(game, tx, ty, viewport, mapLayer);
    }

    function teardownFieldCamera(game) {
        if (typeof game.fieldCameraCleanup === 'function') {
            game.fieldCameraCleanup();
            game.fieldCameraCleanup = null;
        }
    }

    function initFieldCamera(game, viewport, mapLayer, deps) {
        teardownFieldCamera(game);
        const TILE_SIZE = 13;
        const VIEW_TILES = 9;
        const vw = viewport.clientWidth || 300;
        const vh = viewport.clientHeight || 300;
        let scale;
        if (game.camera && game.camera.scale) scale = game.camera.scale;
        else scale = vw / (TILE_SIZE * VIEW_TILES);

        let targetR;
        let targetC;
        let shouldRecenter = false;
        if (!game.camera) {
            const army0 = game.armies && game.armies[0];
            targetR = army0 ? army0.r : deps.PLAYER_START.r;
            targetC = army0 ? army0.c : deps.PLAYER_START.c;
            shouldRecenter = true;
        }
        if (shouldRecenter) {
            const targetX = 50 + (targetC * TILE_SIZE) + (TILE_SIZE / 2);
            const targetY = 50 + (targetR * TILE_SIZE) + (TILE_SIZE / 2);
            const x = (vw / 2) - (targetX * scale);
            const y = (vh / 2) - (targetY * scale);
            game.camera = { x, y, scale };
        }

        const updateTransform = () => {
            mapLayer.style.transform = `translate(${game.camera.x}px, ${game.camera.y}px) scale(${game.camera.scale})`;
            const labelScale = Math.max(0.5, Math.min(1.15, 1 / game.camera.scale));
            mapLayer.style.setProperty('--label-scale', labelScale.toFixed(3));
            window.KOVFieldUiModule.updateFloatingPanelPositionFromSelection(game);
        };
        setTimeout(updateTransform, 0);

        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        let initialPinchDist = 0;
        let initialPinchScale = 1;

        const onWheel = (e) => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            const newScale = game.camera.scale + (e.deltaY > 0 ? -zoomSpeed : zoomSpeed) * game.camera.scale;
            if (newScale > 0.2 && newScale < 5) {
                const centerX = viewport.clientWidth / 2;
                const centerY = viewport.clientHeight / 2;
                const scaleRatio = newScale / game.camera.scale;
                game.camera.x = centerX - (centerX - game.camera.x) * scaleRatio;
                game.camera.y = centerY - (centerY - game.camera.y) * scaleRatio;
                game.camera.scale = newScale;
                updateTransform();
            }
        };

        const onMouseDown = (e) => {
            isDragging = true;
            game.isDraggingMap = false;
            lastX = e.clientX;
            lastY = e.clientY;
        };
        const onMouseMove = (e) => {
            if (!isDragging) return;
            if (Math.abs(e.clientX - lastX) > 5 || Math.abs(e.clientY - lastY) > 5) game.isDraggingMap = true;
            game.camera.x += e.clientX - lastX;
            game.camera.y += e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            updateTransform();
        };
        const onMouseUp = () => {
            isDragging = false;
        };

        const onTouchStart = (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                game.isDraggingMap = false;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                isDragging = false;
                initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                initialPinchScale = game.camera.scale;
            }
        };

        const onTouchMove = (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && isDragging) {
                if (Math.abs(e.touches[0].clientX - lastX) > 5 || Math.abs(e.touches[0].clientY - lastY) > 5) game.isDraggingMap = true;
                game.camera.x += e.touches[0].clientX - lastX;
                game.camera.y += e.touches[0].clientY - lastY;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
                updateTransform();
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const newScale = initialPinchScale * (dist / initialPinchDist);
                if (newScale > 0.2 && newScale < 5) {
                    const centerX = viewport.clientWidth / 2;
                    const centerY = viewport.clientHeight / 2;
                    const scaleRatio = newScale / game.camera.scale;
                    game.camera.x = centerX - (centerX - game.camera.x) * scaleRatio;
                    game.camera.y = centerY - (centerY - game.camera.y) * scaleRatio;
                    game.camera.scale = newScale;
                    updateTransform();
                }
            }
        };

        const onTouchEnd = () => {
            isDragging = false;
        };

        viewport.addEventListener('wheel', onWheel);
        viewport.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        viewport.addEventListener('touchstart', onTouchStart, { passive: false });
        viewport.addEventListener('touchmove', onTouchMove, { passive: false });
        viewport.addEventListener('touchend', onTouchEnd);

        game.fieldCameraCleanup = () => {
            viewport.removeEventListener('wheel', onWheel);
            viewport.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            viewport.removeEventListener('touchstart', onTouchStart);
            viewport.removeEventListener('touchmove', onTouchMove);
            viewport.removeEventListener('touchend', onTouchEnd);
        };
    }

    global.KOVFieldCameraModule = {
        moveCameraTo,
        centerCameraOnArmy,
        teardownFieldCamera,
        initFieldCamera
    };
})(window);
