(function (global) {
    'use strict';

    function buildRuntimeClasses(deps) {
        const {
            ASSET_KEYS,
            GITHUB_REPO,
            GITHUB_BRANCH,
            getCode
        } = deps;

        class SoundManager {
            constructor() {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.enabled = true;
                this.bgmStarted = false;
                const BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/audio/`;
                this.files = {
                    bgm: new Audio(BASE + 'bgm.mp3'),
                    merge: new Audio(BASE + 'merge.mp3'),
                    coin: new Audio(BASE + 'coin.mp3'),
                    pop: new Audio(BASE + 'pop.mp3')
                };
                this.files.bgm.loop = true;
                this.files.bgm.volume = 0.5;
            }
            resume() {
                if (this.ctx.state === 'suspended') this.ctx.resume();
                if (this.enabled && !this.bgmStarted) {
                    this.files.bgm.play().then(() => { this.bgmStarted = true; }).catch(() => { });
                }
            }
            playFile(n, v = 1.0) {
                if (!this.enabled || !this.files[n]) return;
                const s = this.files[n].cloneNode();
                s.crossOrigin = 'anonymous';
                s.volume = v;
                s.play().catch(() => { });
            }
            playTone(f, t, d) {
                if (!this.enabled) return;
                const o = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                o.type = t;
                o.frequency.value = f;
                g.gain.setValueAtTime(0.1, this.ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + d);
                o.connect(g);
                g.connect(this.ctx.destination);
                o.start();
                o.stop(this.ctx.currentTime + d);
            }
            playClick() { this.playFile('pop', 0.6); }
            playError() { this.playTone(150, 'sawtooth', 0.3); }
            playSpawn() { this.playFile('pop', 0.5); }
            playMerge() { this.playFile('merge', 0.8); }
            playCollect() { this.playFile('coin', 0.6); }
            playUnlock() { this.playFile('merge', 0.8); }
            playLevelUp() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.3), i * 100)); }
        }

        class AssetLoader {
            constructor() { this.images = {}; }
            loadAll(cb) {
                let loaded = 0;
                const localBase = (typeof window !== 'undefined' && window.__KOV_ASSET_BASE__)
                    ? String(window.__KOV_ASSET_BASE__).replace(/\/+$/, '')
                    : 'img';
                const remoteBase = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/img`;
                const done = () => {
                    loaded++;
                    if (loaded === ASSET_KEYS.length) cb();
                };
                ASSET_KEYS.forEach((key) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        this.images[key] = img;
                        done();
                    };
                    const ext = key === 'field_bg' ? '.jpg' : '.png';
                    const localSrc = `${localBase}/${key}${ext}`;
                    const remoteSrc = `${remoteBase}/${key}${ext}`;
                    const sources = localSrc === remoteSrc ? [localSrc] : [localSrc, remoteSrc];
                    let idx = 0;
                    img.onerror = () => {
                        idx++;
                        if (idx >= sources.length) {
                            done();
                            return;
                        }
                        img.src = sources[idx];
                    };
                    img.src = sources[idx];
                });
                setTimeout(cb, 2000);
            }
            getImage(type, level) {
                if (typeof type === 'string') return this.images[type];
                const code = getCode(type, level);
                return this.images[code] || (level > 1 ? this.getImage(type, level - 1) : null);
            }
        }

        class Particle {
            constructor(x, y, color, type) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = (Math.random() - 0.5) * 8;
                this.life = 1.0;
                this.decay = Math.random() * 0.03 + 0.02;
                this.color = color;
                this.size = Math.random() * 6 + 4;
                this.type = type;
                if (type === 'smoke') {
                    this.vy = -Math.abs(this.vy) * 0.5;
                    this.decay = 0.015;
                }
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= this.decay;
                if (this.type === 'smoke') this.size += 0.3;
                else this.vy += 0.2;
            }
            draw(ctx) {
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.fillStyle = this.color;
                if (this.type === 'confetti') {
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.life * 5);
                    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                    ctx.resetTransform();
                    const s = ctx.canvas.width / 1080;
                    ctx.scale(s, s);
                } else if (this.type === 'smoke') {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(this.x, this.y, this.size, this.size);
                }
                ctx.globalAlpha = 1.0;
            }
        }

        return {
            SoundManager,
            AssetLoader,
            Particle
        };
    }

    global.KOVRuntimeClassesModule = {
        buildRuntimeClasses
    };
})(window);
