/**
 * ArcadeModalManager (Classic Arcade Modal Suite)
 * - 4종 클래식 아케이드 게임 제공 (Brick Breaker, Snake, Space Invaders, Tetris)
 * - 모바일 풀스크린 & PC 중앙 팝업 자동 반응형
 * - D-Pad, 액션 버튼, Touch Swipe 제스처, PC 방향키/WASD/Space 완벽 지원
 */
class ArcadeModalManager {
    constructor() {
        this.modalEl = null;
        this.canvas = null;
        this.ctx = null;
        this.animId = null;
        this.activeListeners = [];
        this.touchState = { left: false, right: false, up: false, down: false };
        this.onActionPress = null;
        this.onDirectionChange = null;
        this.initModal();
    }

    initModal() {
        if (document.getElementById('arcade-modal')) return;

        const modalHtml = `
        <div id="arcade-modal" class="fixed inset-0 z-[100] bg-black/95 p-2 sm:p-4 overflow-hidden" style="display: none;">
            <div class="w-full h-full max-w-lg mx-auto flex flex-col justify-between bg-surface-container border-2 sm:border-4 border-primary-container p-3 sm:p-4 shadow-[0_0_25px_#39ff14] rounded-none">
                
                <!-- 모달 헤더 (점수 & 닫기) -->
                <div class="flex justify-between items-center border-b-2 border-outline-variant pb-2 shrink-0">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 bg-primary-container animate-pulse rounded-full"></span>
                        <h3 id="arcade-modal-title" class="font-headline-lg-mobile text-headline-lg-mobile text-primary-container uppercase text-sm sm:text-base tracking-wide font-black">ARCADE</h3>
                    </div>
                    <div class="flex items-center gap-3">
                        <span id="arcade-modal-score" class="text-primary font-bold text-xs sm:text-sm font-label-mono bg-black/60 px-2 py-1 border border-outline-variant">SCORE: 0</span>
                        <button id="arcade-modal-close" class="bg-error-container text-on-error-container font-label-mono px-3 py-1 text-xs font-bold active:scale-95 transition-transform border border-error cursor-pointer">✕ CLOSE</button>
                    </div>
                </div>

                <!-- 게임 캔버스 컨테이너 -->
                <div class="relative bg-black border-2 border-primary-container flex-grow w-full overflow-hidden flex items-center justify-center my-2 min-h-[220px]" style="aspect-ratio: 16/9;">
                    <canvas id="arcade-modal-canvas" width="640" height="360" class="w-full h-full object-contain block touch-none"></canvas>
                    <div id="arcade-swipe-hint" class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-primary-container font-label-mono text-[10px] px-2 py-0.5 pointer-events-none rounded border border-primary-container/30">
                        SWIPE / D-PAD / ARROW KEYS
                    </div>
                </div>

                <!-- 모바일 터치 컨트롤 패널 -->
                <div class="flex justify-between items-center gap-2 pt-1 select-none shrink-0" id="arcade-touch-pad">
                    <!-- D-Pad 방향키 -->
                    <div class="grid grid-cols-3 gap-1.5" style="width: 140px; height: 110px;">
                        <div></div>
                        <button id="arc-btn-up" class="arcade-dpad-btn flex items-center justify-center bg-surface-variant text-primary border-2 border-outline font-bold text-lg active:bg-primary-container active:text-black touch-none rounded-none shadow-md cursor-pointer">▲</button>
                        <div></div>
                        
                        <button id="arc-btn-left" class="arcade-dpad-btn flex items-center justify-center bg-surface-variant text-primary border-2 border-outline font-bold text-lg active:bg-primary-container active:text-black touch-none rounded-none shadow-md cursor-pointer">◀</button>
                        <div class="bg-surface-container-low border border-outline-variant flex items-center justify-center rounded-none">
                            <div class="w-2.5 h-2.5 bg-outline-variant/60 rounded-full"></div>
                        </div>
                        <button id="arc-btn-right" class="arcade-dpad-btn flex items-center justify-center bg-surface-variant text-primary border-2 border-outline font-bold text-lg active:bg-primary-container active:text-black touch-none rounded-none shadow-md cursor-pointer">▶</button>
                        
                        <div></div>
                        <button id="arc-btn-down" class="arcade-dpad-btn flex items-center justify-center bg-surface-variant text-primary border-2 border-outline font-bold text-lg active:bg-primary-container active:text-black touch-none rounded-none shadow-md cursor-pointer">▼</button>
                        <div></div>
                    </div>

                    <!-- 오른쪽: 액션 버튼 -->
                    <div class="flex flex-col items-end gap-1 flex-shrink-0">
                        <button id="arc-btn-action" class="bg-primary-container text-on-primary-container font-label-mono font-black border-2 border-on-primary-container active:scale-95 touch-none rounded-none flex items-center justify-center shadow-[0_0_10px_rgba(57,255,20,0.5)] cursor-pointer" style="width: 100px; height: 90px; font-size: 15px;">
                            ROTATE<br>●
                        </button>
                    </div>
                </div>

            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modalEl = document.getElementById('arcade-modal');
        this.canvas = document.getElementById('arcade-modal-canvas');
        this.ctx = this.canvas.getContext('2d');

        document.getElementById('arcade-modal-close').addEventListener('click', () => this.close());
        this.initTouchControls();
        this.initSwipeControls();
    }

    initTouchControls() {
        const bindDpad = (id, onDown, onUp) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const handleDown = (e) => {
                if (e.cancelable) e.preventDefault();
                onDown && onDown();
            };
            const handleUp = (e) => {
                if (e.cancelable) e.preventDefault();
                onUp && onUp();
            };
            btn.addEventListener('touchstart', handleDown, { passive: false });
            btn.addEventListener('touchend', handleUp, { passive: false });
            btn.addEventListener('touchcancel', handleUp, { passive: false });
            btn.addEventListener('mousedown', handleDown);
            btn.addEventListener('mouseup', handleUp);
            btn.addEventListener('mouseleave', handleUp);
        };

        bindDpad('arc-btn-left',
            () => { this.touchState.left = true; if (this.onDirectionChange) this.onDirectionChange('left'); },
            () => { this.touchState.left = false; }
        );
        bindDpad('arc-btn-right',
            () => { this.touchState.right = true; if (this.onDirectionChange) this.onDirectionChange('right'); },
            () => { this.touchState.right = false; }
        );
        bindDpad('arc-btn-up',
            () => { this.touchState.up = true; if (this.onDirectionChange) this.onDirectionChange('up'); },
            () => { this.touchState.up = false; }
        );
        bindDpad('arc-btn-down',
            () => { this.touchState.down = true; if (this.onDirectionChange) this.onDirectionChange('down'); },
            () => { this.touchState.down = false; }
        );
        bindDpad('arc-btn-action',
            () => { if (this.onActionPress) this.onActionPress(); },
            () => { }
        );
    }

    initSwipeControls() {
        let touchStartX = 0;
        let touchStartY = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (!e.changedTouches || e.changedTouches.length === 0) return;
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) > 15) {
                if (absDx > absDy) {
                    if (dx > 0) {
                        if (this.onDirectionChange) this.onDirectionChange('right');
                    } else {
                        if (this.onDirectionChange) this.onDirectionChange('left');
                    }
                } else {
                    if (dy > 0) {
                        if (this.onDirectionChange) this.onDirectionChange('down');
                    } else {
                        if (this.onDirectionChange) this.onDirectionChange('up');
                    }
                }
            } else {
                if (this.onActionPress) this.onActionPress();
            }
        }, { passive: true });
    }

    addListener(target, event, fn, options) {
        target.addEventListener(event, fn, options);
        this.activeListeners.push({ target, event, fn });
    }

    clearListeners() {
        this.activeListeners.forEach(({ target, event, fn }) => {
            target.removeEventListener(event, fn);
        });
        this.activeListeners = [];
        this.onActionPress = null;
        this.onDirectionChange = null;
        this.touchState = { left: false, right: false, up: false, down: false };
    }

    launch(gameType) {
        this.initModal();
        this.clearListeners();
        if (this.animId) cancelAnimationFrame(this.animId);
        this.animId = null;

        this.modalEl.style.display = 'flex';
        if (window.retroAudio) window.retroAudio.playStart();

        const titleEl = document.getElementById('arcade-modal-title');
        const actionBtn = document.getElementById('arc-btn-action');
        document.getElementById('arcade-modal-score').textContent = 'SCORE: 0';

        if (gameType === 'brick') {
            titleEl.textContent = 'BRICK BREAKER';
            if (actionBtn) actionBtn.innerHTML = 'PUSH<br>●';
            this.runBrickBreaker();
        } else if (gameType === 'snake') {
            titleEl.textContent = 'SNAKE RETRO';
            if (actionBtn) actionBtn.innerHTML = 'PUSH<br>●';
            this.runSnake();
        } else if (gameType === 'invaders') {
            titleEl.textContent = 'SPACE INVADERS';
            if (actionBtn) actionBtn.innerHTML = 'FIRE<br>●';
            this.runSpaceInvaders();
        } else if (gameType === 'tetris') {
            titleEl.textContent = 'TETRIS STYLE';
            if (actionBtn) actionBtn.innerHTML = 'ROTATE<br>↻';
            this.runTetris();
        } else {
            titleEl.textContent = 'BRICK BREAKER';
            if (actionBtn) actionBtn.innerHTML = 'PUSH<br>●';
            this.runBrickBreaker();
        }
    }

    close() {
        if (this.modalEl) {
            this.modalEl.style.display = 'none';
        }
        if (this.animId) cancelAnimationFrame(this.animId);
        this.animId = null;
        this.clearListeners();
    }

    /* ───────────── BRICK BREAKER ───────────── */
    runBrickBreaker() {
        const W = this.canvas.width, H = this.canvas.height;
        let paddle = { x: W / 2 - 50, y: H - 30, w: 100, h: 12, speed: 9 };
        let ball = { x: W / 2, y: H - 55, radius: 7, vx: 4.5, vy: -4.5 };
        let score = 0;
        let gameOver = false;
        let keys = {};

        const rows = 4, cols = 8;
        const brickW = Math.floor((W - 24) / cols) - 5;
        const brickH = 20, padding = 5, offsetTop = 35, offsetLeft = 12;
        let bricks = [];

        const initBricks = () => {
            bricks = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    bricks.push({ x: c * (brickW + padding) + offsetLeft, y: r * (brickH + padding) + offsetTop, status: 1 });
                }
            }
        };
        initBricks();

        const restart = () => {
            paddle.x = W / 2 - 50;
            ball = { x: W / 2, y: H - 55, radius: 7, vx: 4.5, vy: -4.5 };
            score = 0;
            gameOver = false;
            initBricks();
            document.getElementById('arcade-modal-score').textContent = 'SCORE: 0';
        };

        this.onActionPress = () => { if (gameOver) restart(); };

        const onKeyDown = (e) => {
            const code = e.code || '';
            const key = e.key || '';
            if (code === 'ArrowLeft' || key === 'ArrowLeft' || code === 'KeyA' || key === 'a') keys['left'] = true;
            if (code === 'ArrowRight' || key === 'ArrowRight' || code === 'KeyD' || key === 'd') keys['right'] = true;
            if ((code === 'Space' || key === ' ') && gameOver) restart();
        };
        const onKeyUp = (e) => {
            const code = e.code || '';
            const key = e.key || '';
            if (code === 'ArrowLeft' || key === 'ArrowLeft' || code === 'KeyA' || key === 'a') keys['left'] = false;
            if (code === 'ArrowRight' || key === 'ArrowRight' || code === 'KeyD' || key === 'd') keys['right'] = false;
        };
        this.addListener(window, 'keydown', onKeyDown);
        this.addListener(window, 'keyup', onKeyUp);

        this.onDirectionChange = (d) => {
            if (d === 'left') paddle.x = Math.max(0, paddle.x - 30);
            if (d === 'right') paddle.x = Math.min(W - paddle.w, paddle.x + 30);
        };

        const loop = () => {
            if (keys['left'] || this.touchState.left) paddle.x = Math.max(0, paddle.x - paddle.speed);
            if (keys['right'] || this.touchState.right) paddle.x = Math.min(W - paddle.w, paddle.x + paddle.speed);

            if (!gameOver) {
                ball.x += ball.vx;
                ball.y += ball.vy;

                if (ball.x < ball.radius) { ball.x = ball.radius; ball.vx = Math.abs(ball.vx); }
                if (ball.x > W - ball.radius) { ball.x = W - ball.radius; ball.vx = -Math.abs(ball.vx); }
                if (ball.y < ball.radius) { ball.y = ball.radius; ball.vy = Math.abs(ball.vy); }

                if (ball.vy > 0 &&
                    ball.y + ball.radius >= paddle.y &&
                    ball.y + ball.radius <= paddle.y + 20 &&
                    ball.x >= paddle.x - 4 && ball.x <= paddle.x + paddle.w + 4) {
                    ball.vy = -Math.abs(ball.vy);
                    const hitRatio = (ball.x - paddle.x) / paddle.w;
                    ball.vx = (hitRatio - 0.5) * 10;
                    if (window.retroAudio) window.retroAudio.playJump();
                }

                for (let b of bricks) {
                    if (b.status !== 1) continue;
                    if (ball.x + ball.radius > b.x && ball.x - ball.radius < b.x + brickW &&
                        ball.y + ball.radius > b.y && ball.y - ball.radius < b.y + brickH) {
                        ball.vy = -ball.vy;
                        b.status = 0;
                        score += 100;
                        document.getElementById('arcade-modal-score').textContent = `SCORE: ${score}`;
                        if (window.retroAudio) window.retroAudio.playCoin();
                        break;
                    }
                }

                if (ball.y > H + 20) {
                    gameOver = true;
                    if (window.retroAudio) window.retroAudio.playGameOver();
                }

                if (bricks.every(b => b.status === 0)) {
                    score += 500;
                    initBricks();
                    ball.vx *= 1.1; ball.vy *= 1.1;
                }
            }

            this.ctx.fillStyle = '#0e0e0f';
            this.ctx.fillRect(0, 0, W, H);

            const colors = ['#ffb4ab', '#dfb7ff', '#39ff14', '#79ff5b'];
            bricks.forEach((b, idx) => {
                if (b.status !== 1) return;
                const row = Math.floor(idx / cols);
                this.ctx.fillStyle = colors[row % colors.length];
                this.ctx.fillRect(b.x, b.y, brickW, brickH);
                this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
                this.ctx.fillRect(b.x, b.y, brickW, 4);
            });

            this.ctx.fillStyle = '#39ff14';
            this.ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(paddle.x, paddle.y, paddle.w, 3);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();

            if (gameOver) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
                this.ctx.fillRect(0, 0, W, H);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ffb4ab';
                this.ctx.font = 'bold 36px monospace';
                this.ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
                this.ctx.fillStyle = '#efffe3';
                this.ctx.font = '18px monospace';
                this.ctx.fillText(`SCORE: ${score}`, W / 2, H / 2 + 5);
                this.ctx.font = '14px monospace';
                this.ctx.fillStyle = '#39ff14';
                this.ctx.fillText('TAP PUSH TO RETRY', W / 2, H / 2 + 45);
                this.ctx.textAlign = 'left';
            }

            this.animId = requestAnimationFrame(loop);
        };
        loop();
    }

    /* ───────────── SNAKE ───────────── */
    runSnake() {
        const W = this.canvas.width, H = this.canvas.height;
        const GRID = 20;
        const TX = Math.floor(W / GRID);
        const TY = Math.floor(H / GRID);

        let snake = [];
        let dir = { x: 1, y: 0 };
        let nextDir = { x: 1, y: 0 };
        let food = { x: 5, y: 5 };
        let score = 0;
        let gameOver = false;
        let speed = 120;
        let lastTime = 0;

        const placeFood = () => {
            do {
                food = { x: Math.floor(Math.random() * TX), y: Math.floor(Math.random() * TY) };
            } while (snake.some(s => s.x === food.x && s.y === food.y));
        };

        const restart = () => {
            snake = [
                { x: Math.floor(TX / 2), y: Math.floor(TY / 2) },
                { x: Math.floor(TX / 2) - 1, y: Math.floor(TY / 2) },
                { x: Math.floor(TX / 2) - 2, y: Math.floor(TY / 2) }
            ];
            dir = { x: 1, y: 0 };
            nextDir = { x: 1, y: 0 };
            score = 0;
            speed = 120;
            gameOver = false;
            lastTime = 0;
            placeFood();
            document.getElementById('arcade-modal-score').textContent = 'SCORE: 0';
        };
        restart();

        const changeDir = (d) => {
            if ((d === 'left' || d === 'a') && dir.x !== 1) nextDir = { x: -1, y: 0 };
            else if ((d === 'right' || d === 'd') && dir.x !== -1) nextDir = { x: 1, y: 0 };
            else if ((d === 'up' || d === 'w') && dir.y !== 1) nextDir = { x: 0, y: -1 };
            else if ((d === 'down' || d === 's') && dir.y !== -1) nextDir = { x: 0, y: 1 };
        };

        this.onDirectionChange = changeDir;
        this.onActionPress = () => { if (gameOver) restart(); };

        const onKeyDown = (e) => {
            const k = (e.key || '').toLowerCase();
            const c = (e.code || '').toLowerCase();

            if (k === 'arrowleft' || c === 'arrowleft' || k === 'a' || c === 'keya') changeDir('left');
            else if (k === 'arrowright' || c === 'arrowright' || k === 'd' || c === 'keyd') changeDir('right');
            else if (k === 'arrowup' || c === 'arrowup' || k === 'w' || c === 'keyw') changeDir('up');
            else if (k === 'arrowdown' || c === 'arrowdown' || k === 's' || c === 'keys') changeDir('down');
            
            if ((k === ' ' || c === 'space') && gameOver) restart();
        };
        this.addListener(window, 'keydown', onKeyDown);

        const loop = (timestamp) => {
            if (!gameOver && timestamp - lastTime > speed) {
                lastTime = timestamp;
                dir = { ...nextDir };

                const head = {
                    x: (snake[0].x + dir.x + TX) % TX,
                    y: (snake[0].y + dir.y + TY) % TY
                };

                if (snake.some(s => s.x === head.x && s.y === head.y)) {
                    gameOver = true;
                    if (window.retroAudio) window.retroAudio.playGameOver();
                } else {
                    if (head.x === food.x && head.y === food.y) {
                        score += 150;
                        document.getElementById('arcade-modal-score').textContent = `SCORE: ${score}`;
                        placeFood();
                        if (score % 600 === 0) speed = Math.max(60, speed - 8);
                        if (window.retroAudio) window.retroAudio.playCoin();
                    } else {
                        snake.pop();
                    }
                    snake.unshift(head);
                }
            }

            this.ctx.fillStyle = '#0a0a0b';
            this.ctx.fillRect(0, 0, W, H);

            this.ctx.strokeStyle = '#18181a';
            this.ctx.lineWidth = 0.5;
            for (let x = 0; x < W; x += GRID) {
                this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, H); this.ctx.stroke();
            }
            for (let y = 0; y < H; y += GRID) {
                this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(W, y); this.ctx.stroke();
            }

            this.ctx.fillStyle = '#ff4d6d';
            this.ctx.fillRect(food.x * GRID + 2, food.y * GRID + 2, GRID - 4, GRID - 4);
            this.ctx.fillStyle = '#ffb4ab';
            this.ctx.fillRect(food.x * GRID + 3, food.y * GRID + 3, GRID - 10, GRID - 10);

            snake.forEach((part, i) => {
                if (i === 0) {
                    this.ctx.fillStyle = '#39ff14';
                    this.ctx.fillRect(part.x * GRID + 1, part.y * GRID + 1, GRID - 2, GRID - 2);
                    
                    this.ctx.fillStyle = '#000000';
                    if (dir.x === 1) {
                        this.ctx.fillRect(part.x * GRID + 12, part.y * GRID + 3, 4, 4);
                        this.ctx.fillRect(part.x * GRID + 12, part.y * GRID + 13, 4, 4);
                    } else if (dir.x === -1) {
                        this.ctx.fillRect(part.x * GRID + 4, part.y * GRID + 3, 4, 4);
                        this.ctx.fillRect(part.x * GRID + 4, part.y * GRID + 13, 4, 4);
                    } else if (dir.y === -1) {
                        this.ctx.fillRect(part.x * GRID + 3, part.y * GRID + 4, 4, 4);
                        this.ctx.fillRect(part.x * GRID + 13, part.y * GRID + 4, 4, 4);
                    } else {
                        this.ctx.fillRect(part.x * GRID + 3, part.y * GRID + 12, 4, 4);
                        this.ctx.fillRect(part.x * GRID + 13, part.y * GRID + 12, 4, 4);
                    }
                } else {
                    this.ctx.fillStyle = i % 2 === 0 ? '#2ae500' : '#79ff5b';
                    this.ctx.fillRect(part.x * GRID + 1, part.y * GRID + 1, GRID - 2, GRID - 2);
                }
            });

            if (gameOver) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
                this.ctx.fillRect(0, 0, W, H);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ff4d6d';
                this.ctx.font = 'bold 36px monospace';
                this.ctx.fillText('SNAKE GAME OVER', W / 2, H / 2 - 40);
                this.ctx.fillStyle = '#efffe3';
                this.ctx.font = '18px monospace';
                this.ctx.fillText(`FINAL SCORE: ${score}  |  LENGTH: ${snake.length}`, W / 2, H / 2 + 5);
                this.ctx.font = '14px monospace';
                this.ctx.fillStyle = '#39ff14';
                this.ctx.fillText('TAP PUSH TO PLAY AGAIN', W / 2, H / 2 + 45);
                this.ctx.textAlign = 'left';
            }

            this.animId = requestAnimationFrame(loop);
        };

        this.animId = requestAnimationFrame(loop);
    }

    /* ───────────── SPACE INVADERS ───────────── */
    runSpaceInvaders() {
        const W = this.canvas.width, H = this.canvas.height;
        let player = { x: W / 2 - 18, y: H - 40, w: 36, h: 20 };
        let bullets = [];
        let invaders = [];
        let score = 0;
        let keys = {};
        let gameOver = false, win = false;
        let invaderDir = 1;
        let invaderTimer = 0;
        let lastShot = 0;

        const createInvaders = () => {
            invaders = [];
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 9; c++) {
                    invaders.push({ x: c * 58 + 40, y: r * 36 + 28, w: 28, h: 18, alive: true });
                }
            }
        };
        createInvaders();

        const fireBullet = () => {
            const now = Date.now();
            if (now - lastShot < 280) return;
            lastShot = now;
            bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, w: 4, h: 12 });
            if (window.retroAudio) window.retroAudio.playJump();
        };

        const restart = () => {
            player.x = W / 2 - 18;
            bullets = [];
            score = 0;
            invaderDir = 1;
            invaderTimer = 0;
            gameOver = false;
            win = false;
            createInvaders();
            document.getElementById('arcade-modal-score').textContent = 'SCORE: 0';
        };

        this.onActionPress = () => { if (!gameOver) fireBullet(); else restart(); };

        this.onDirectionChange = (d) => {
            if (d === 'left') player.x = Math.max(0, player.x - 20);
            if (d === 'right') player.x = Math.min(W - player.w, player.x + 20);
        };

        const onKeyDown = (e) => {
            const code = e.code || '';
            const key = e.key || '';
            if (code === 'ArrowLeft' || key === 'ArrowLeft' || code === 'KeyA' || key === 'a') keys['left'] = true;
            if (code === 'ArrowRight' || key === 'ArrowRight' || code === 'KeyD' || key === 'd') keys['right'] = true;
            if (code === 'Space' || key === ' ') { if (!gameOver) fireBullet(); else restart(); }
        };
        const onKeyUp = (e) => {
            const code = e.code || '';
            const key = e.key || '';
            if (code === 'ArrowLeft' || key === 'ArrowLeft' || code === 'KeyA' || key === 'a') keys['left'] = false;
            if (code === 'ArrowRight' || key === 'ArrowRight' || code === 'KeyD' || key === 'd') keys['right'] = false;
        };
        this.addListener(window, 'keydown', onKeyDown);
        this.addListener(window, 'keyup', onKeyUp);

        const loop = (timestamp) => {
            if (!gameOver) {
                if (keys['left'] || this.touchState.left) player.x = Math.max(0, player.x - 5);
                if (keys['right'] || this.touchState.right) player.x = Math.min(W - player.w, player.x + 5);

                for (let b of bullets) b.y -= 9;
                bullets = bullets.filter(b => b.y > -20);

                invaderTimer++;
                const alive = invaders.filter(i => i.alive);
                const interval = Math.max(4, 28 - (27 - alive.length));
                if (invaderTimer >= interval) {
                    invaderTimer = 0;
                    let hitWall = false;
                    for (let inv of alive) {
                        inv.x += invaderDir * 7;
                        if (inv.x <= 2 || inv.x + inv.w >= W - 2) hitWall = true;
                    }
                    if (hitWall) {
                        invaderDir *= -1;
                        for (let inv of invaders) inv.y += 12;
                    }
                }

                for (let b of bullets) {
                    for (let inv of invaders) {
                        if (!inv.alive) continue;
                        if (b.x < inv.x + inv.w && b.x + b.w > inv.x &&
                            b.y < inv.y + inv.h && b.y + b.h > inv.y) {
                            inv.alive = false;
                            b.y = -999;
                            score += 200;
                            document.getElementById('arcade-modal-score').textContent = `SCORE: ${score}`;
                            if (window.retroAudio) window.retroAudio.playCoin();
                        }
                    }
                }

                if (invaders.every(i => !i.alive)) { win = true; gameOver = true; }
                if (invaders.some(i => i.alive && i.y + i.h >= player.y)) {
                    gameOver = true;
                    if (window.retroAudio) window.retroAudio.playGameOver();
                }
            }

            this.ctx.fillStyle = '#0a0a0b';
            this.ctx.fillRect(0, 0, W, H);

            this.ctx.fillStyle = '#ffffff';
            for (let s = 0; s < 40; s++) {
                const sx = ((s * 97 + 13) * 7) % W;
                const sy = ((s * 137 + 5) * 11) % H;
                this.ctx.fillRect(sx, sy, s % 3 === 0 ? 2 : 1, s % 3 === 0 ? 2 : 1);
            }

            this.ctx.fillStyle = '#39ff14';
            this.ctx.fillRect(player.x + 4, player.y + 6, player.w - 8, player.h - 6);
            this.ctx.fillRect(player.x + player.w / 2 - 3, player.y, 6, 8);
            this.ctx.fillRect(player.x, player.y + 10, 8, 10);
            this.ctx.fillRect(player.x + player.w - 8, player.y + 10, 8, 10);

            this.ctx.fillStyle = '#efffe3';
            bullets.forEach(b => {
                this.ctx.fillRect(b.x, b.y, b.w, b.h);
            });

            invaders.forEach((inv, i) => {
                if (!inv.alive) return;
                const row = Math.floor(i / 9);
                this.ctx.fillStyle = ['#dfb7ff', '#ffb4ab', '#79ff5b'][row] || '#dfb7ff';
                this.ctx.fillRect(inv.x + 2, inv.y + 4, inv.w - 4, inv.h - 4);
                this.ctx.fillRect(inv.x + 4, inv.y, 3, 5);
                this.ctx.fillRect(inv.x + inv.w - 7, inv.y, 3, 5);
                this.ctx.fillRect(inv.x, inv.y + inv.h - 5, 5, 5);
                this.ctx.fillRect(inv.x + inv.w - 5, inv.y + inv.h - 5, 5, 5);
            });

            this.ctx.fillStyle = '#39ff14';
            this.ctx.fillRect(0, H - 18, W, 2);

            if (gameOver) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
                this.ctx.fillRect(0, 0, W, H);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = win ? '#39ff14' : '#ffb4ab';
                this.ctx.font = 'bold 36px monospace';
                this.ctx.fillText(win ? '★ YOU WIN! ★' : 'GAME OVER', W / 2, H / 2 - 40);
                this.ctx.fillStyle = '#efffe3';
                this.ctx.font = '18px monospace';
                this.ctx.fillText(`SCORE: ${score}`, W / 2, H / 2 + 5);
                this.ctx.font = '14px monospace';
                this.ctx.fillStyle = '#39ff14';
                this.ctx.fillText('TAP PUSH TO RETRY', W / 2, H / 2 + 45);
                this.ctx.textAlign = 'left';
            }

            this.animId = requestAnimationFrame(loop);
        };

        loop(0);
    }

    /* ───────────── TETRIS STYLE ───────────── */
    runTetris() {
        const W = this.canvas.width, H = this.canvas.height;
        const BLOCK = 18;
        const COLS = 10;
        const ROWS = 18;
        const boardX = Math.floor((W - COLS * BLOCK) / 2);
        const boardY = Math.floor((H - ROWS * BLOCK) / 2);

        let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        let score = 0;
        let gameOver = false;
        let lastDrop = 0;

        const SHAPES = [
            [[1, 1, 1, 1]], // I
            [[1, 1], [1, 1]], // O
            [[0, 1, 0], [1, 1, 1]], // T
            [[1, 0, 0], [1, 1, 1]], // L
            [[0, 0, 1], [1, 1, 1]], // J
            [[0, 1, 1], [1, 1, 0]], // S
            [[1, 1, 0], [0, 1, 1]]  // Z
        ];
        const COLORS = ['#00ffff', '#ffff00', '#dfb7ff', '#ffb4ab', '#39ff14', '#79ff5b', '#ff4d6d'];

        let piece = null;

        const spawnPiece = () => {
            const typeIdx = Math.floor(Math.random() * SHAPES.length);
            piece = {
                shape: SHAPES[typeIdx],
                color: COLORS[typeIdx],
                x: Math.floor(COLS / 2) - 1,
                y: 0
            };
            if (collide(piece.x, piece.y, piece.shape)) {
                gameOver = true;
                if (window.retroAudio) window.retroAudio.playGameOver();
            }
        };

        const collide = (px, py, shape) => {
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        let newX = px + c;
                        let newY = py + r;
                        if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                        if (newY >= 0 && board[newY][newX]) return true;
                    }
                }
            }
            return false;
        };

        const rotate = (matrix) => {
            return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
        };

        const rotatePiece = () => {
            if (!piece || gameOver) return;
            const rotated = rotate(piece.shape);
            if (!collide(piece.x, piece.y, rotated)) {
                piece.shape = rotated;
                if (window.retroAudio) window.retroAudio.playJump();
            }
        };

        const moveLeft = () => {
            if (!piece || gameOver) return;
            if (!collide(piece.x - 1, piece.y, piece.shape)) piece.x--;
        };

        const moveRight = () => {
            if (!piece || gameOver) return;
            if (!collide(piece.x + 1, piece.y, piece.shape)) piece.x++;
        };

        const drop = () => {
            if (!piece || gameOver) return;
            if (!collide(piece.x, piece.y + 1, piece.shape)) {
                piece.y++;
            } else {
                // Lock piece
                for (let r = 0; r < piece.shape.length; r++) {
                    for (let c = 0; c < piece.shape[r].length; c++) {
                        if (piece.shape[r][c]) {
                            if (piece.y + r >= 0) {
                                board[piece.y + r][piece.x + c] = piece.color;
                            }
                        }
                    }
                }
                // Clear lines
                let lines = 0;
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (board[r].every(cell => cell !== 0)) {
                        board.splice(r, 1);
                        board.unshift(Array(COLS).fill(0));
                        lines++;
                        r++;
                    }
                }
                if (lines > 0) {
                    score += lines * 200;
                    document.getElementById('arcade-modal-score').textContent = `SCORE: ${score}`;
                    if (window.retroAudio) window.retroAudio.playCoin();
                }
                spawnPiece();
            }
        };

        const restart = () => {
            board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
            score = 0;
            gameOver = false;
            lastDrop = 0;
            document.getElementById('arcade-modal-score').textContent = 'SCORE: 0';
            spawnPiece();
        };

        spawnPiece();

        this.onActionPress = () => {
            if (gameOver) restart();
            else rotatePiece();
        };

        this.onDirectionChange = (d) => {
            if (d === 'left') moveLeft();
            if (d === 'right') moveRight();
            if (d === 'down') drop();
            if (d === 'up') rotatePiece();
        };

        const onKeyDown = (e) => {
            const k = (e.key || '').toLowerCase();
            const c = (e.code || '').toLowerCase();

            if (k === 'arrowleft' || c === 'arrowleft' || k === 'a') moveLeft();
            else if (k === 'arrowright' || c === 'arrowright' || k === 'd') moveRight();
            else if (k === 'arrowdown' || c === 'arrowdown' || k === 's') drop();
            else if (k === 'arrowup' || c === 'arrowup' || k === 'w') rotatePiece();
            else if ((k === ' ' || c === 'space')) {
                if (gameOver) restart(); else rotatePiece();
            }
        };
        this.addListener(window, 'keydown', onKeyDown);

        const loop = (timestamp) => {
            if (!gameOver && timestamp - lastDrop > 500) {
                lastDrop = timestamp;
                drop();
            }

            this.ctx.fillStyle = '#0a0a0b';
            this.ctx.fillRect(0, 0, W, H);

            // Draw Board Frame
            this.ctx.strokeStyle = '#39ff14';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(boardX - 2, boardY - 2, COLS * BLOCK + 4, ROWS * BLOCK + 4);

            // Draw Grid & Board Blocks
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const bx = boardX + c * BLOCK;
                    const by = boardY + r * BLOCK;
                    if (board[r][c]) {
                        this.ctx.fillStyle = board[r][c];
                        this.ctx.fillRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
                    } else {
                        this.ctx.strokeStyle = '#18181a';
                        this.ctx.strokeRect(bx, by, BLOCK, BLOCK);
                    }
                }
            }

            // Draw Falling Piece
            if (piece && !gameOver) {
                this.ctx.fillStyle = piece.color;
                for (let r = 0; r < piece.shape.length; r++) {
                    for (let c = 0; c < piece.shape[r].length; c++) {
                        if (piece.shape[r][c]) {
                            const bx = boardX + (piece.x + c) * BLOCK;
                            const by = boardY + (piece.y + r) * BLOCK;
                            this.ctx.fillRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
                        }
                    }
                }
            }

            if (gameOver) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
                this.ctx.fillRect(0, 0, W, H);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ff4d6d';
                this.ctx.font = 'bold 36px monospace';
                this.ctx.fillText('TETRIS GAME OVER', W / 2, H / 2 - 40);
                this.ctx.fillStyle = '#efffe3';
                this.ctx.font = '18px monospace';
                this.ctx.fillText(`FINAL SCORE: ${score}`, W / 2, H / 2 + 5);
                this.ctx.font = '14px monospace';
                this.ctx.fillStyle = '#39ff14';
                this.ctx.fillText('TAP ROTATE / PUSH TO PLAY AGAIN', W / 2, H / 2 + 45);
                this.ctx.textAlign = 'left';
            }

            this.animId = requestAnimationFrame(loop);
        };

        loop(0);
    }
}

window.arcadeModalManager = new ArcadeModalManager();
