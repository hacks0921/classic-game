/**
 * ArcadeModalManager (Classic Arcade Modal Suite)
 * - 4종 클래식 아케이드 게임 제공 (Brick Breaker, Snake, Space Invaders, Tetris)
 * - 모바일/스마트폰 100% 뷰포트 공간 활용 캔버스
 * - 스마트폰 터치 이동 추적(Touch Drag/Move Delta Tracking) 및 가상 D-Pad
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
        this.onDragMove = null; // 터치 드래그 이동 감지 콜백 (dx, dy, touchX, touchY)
        this.initModal();
    }

    initModal() {
        if (document.getElementById('arcade-modal')) return;

        const modalHtml = `
        <div id="arcade-modal" class="fixed inset-0 z-[100] bg-black/95 p-2 sm:p-4 overflow-hidden" style="display: none;">
            <div class="w-full h-full max-w-lg mx-auto flex flex-col justify-between bg-surface-container border-2 sm:border-4 border-primary-container p-2 sm:p-4 shadow-[0_0_25px_#39ff14] rounded-none">
                
                <!-- 모달 헤더 -->
                <div class="flex justify-between items-center border-b-2 border-outline-variant pb-2 shrink-0">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 bg-primary-container animate-pulse rounded-full"></span>
                        <h3 id="arcade-modal-title" class="font-headline-lg-mobile text-headline-lg-mobile text-primary-container uppercase text-sm sm:text-base tracking-wide font-black">ARCADE</h3>
                    </div>
                    <div class="flex items-center gap-3">
                        <span id="arcade-modal-score" class="text-primary font-bold text-xs sm:text-sm font-label-mono bg-black/60 px-2.5 py-1 border border-outline-variant">SCORE: 0</span>
                        <button id="arcade-modal-close" class="bg-error-container text-on-error-container font-label-mono px-3 py-1 text-xs font-bold active:scale-95 transition-transform border border-error cursor-pointer">✕ CLOSE</button>
                    </div>
                </div>

                <!-- 게임 캔버스 컨테이너 (화면 꽉 차는 풀 공간) -->
                <div class="relative bg-black border-2 border-primary-container flex-grow w-full overflow-hidden flex items-[stretch] justify-center my-2 min-h-[240px]">
                    <canvas id="arcade-modal-canvas" width="640" height="420" class="w-full h-full object-fill block touch-none"></canvas>
                    <div id="arcade-swipe-hint" class="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 text-primary-container font-label-mono text-[10px] px-2 py-0.5 pointer-events-none rounded border border-primary-container/30">
                        DRAG CANVAS TO MOVE / TAP TO FIRE
                    </div>
                </div>

                <!-- 모바일 터치 패널 -->
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
                            FIRE<br>●
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
        this.initDragAndTouchTracking();
    }

    /**
     * D-Pad 터치 감지 개선 (손가락 누른 채 움직여도 버튼 위치 추적)
     */
    initTouchControls() {
        const updateTouchFromPoint = (x, y, isDown) => {
            const el = document.elementFromPoint(x, y);
            if (!el) return;
            const id = el.id || el.parentElement?.id;
            
            if (!isDown) {
                this.touchState = { left: false, right: false, up: false, down: false };
                return;
            }

            if (id === 'arc-btn-left') {
                this.touchState.left = true;
                if (this.onDirectionChange) this.onDirectionChange('left');
            } else if (id === 'arc-btn-right') {
                this.touchState.right = true;
                if (this.onDirectionChange) this.onDirectionChange('right');
            } else if (id === 'arc-btn-up') {
                this.touchState.up = true;
                if (this.onDirectionChange) this.onDirectionChange('up');
            } else if (id === 'arc-btn-down') {
                this.touchState.down = true;
                if (this.onDirectionChange) this.onDirectionChange('down');
            } else if (id === 'arc-btn-action') {
                if (this.onActionPress) this.onActionPress();
            }
        };

        const pad = document.getElementById('arcade-touch-pad');
        if (!pad) return;

        pad.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                const t = e.touches[0];
                updateTouchFromPoint(t.clientX, t.clientY, true);
            }
        }, { passive: false });

        pad.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                if (e.cancelable) e.preventDefault();
                const t = e.touches[0];
                updateTouchFromPoint(t.clientX, t.clientY, true);
            }
        }, { passive: false });

        pad.addEventListener('touchend', (e) => {
            updateTouchFromPoint(0, 0, false);
        }, { passive: false });

        // 액션 버튼 명시적 탭
        const actBtn = document.getElementById('arc-btn-action');
        if (actBtn) {
            actBtn.addEventListener('touchstart', (e) => {
                if (e.cancelable) e.preventDefault();
                if (this.onActionPress) this.onActionPress();
            }, { passive: false });
            actBtn.addEventListener('click', () => {
                if (this.onActionPress) this.onActionPress();
            });
        }
    }

    /**
     * 캔버스 직접 드래그 & 터치 이동 감지 (Touch Move Delta & Direct Tracking)
     * - 손가락으로 문지르면 실시간 위치 감지 및 우주선/패들이 손가락 X 좌표를 즉시 추적
     */
    initDragAndTouchTracking() {
        let isTouching = false;
        let startTouchX = 0, startTouchY = 0;
        let lastX = 0, lastY = 0;
        let hasMoved = false;

        const handleStart = (clientX, clientY) => {
            isTouching = true;
            hasMoved = false;
            startTouchX = clientX;
            startTouchY = clientY;
            lastX = clientX;
            lastY = clientY;
            
            const rect = this.canvas.getBoundingClientRect();
            const relX = ((clientX - rect.left) / rect.width) * this.canvas.width;
            const relY = ((clientY - rect.top) / rect.height) * this.canvas.height;
            
            if (this.onDragMove) this.onDragMove(0, 0, relX, relY);
        };

        const handleMove = (clientX, clientY) => {
            if (!isTouching) return;
            const dx = clientX - lastX;
            const dy = clientY - lastY;
            const totalDist = Math.hypot(clientX - startTouchX, clientY - startTouchY);
            
            if (totalDist > 6) hasMoved = true;

            lastX = clientX;
            lastY = clientY;

            const rect = this.canvas.getBoundingClientRect();
            const relX = ((clientX - rect.left) / rect.width) * this.canvas.width;
            const relY = ((clientY - rect.top) / rect.height) * this.canvas.height;

            if (this.onDragMove) this.onDragMove(dx, dy, relX, relY);

            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0 && this.onDirectionChange) this.onDirectionChange('right');
                    else if (dx < 0 && this.onDirectionChange) this.onDirectionChange('left');
                } else {
                    if (dy > 0 && this.onDirectionChange) this.onDirectionChange('down');
                    else if (dy < 0 && this.onDirectionChange) this.onDirectionChange('up');
                }
            }
        };

        const handleEnd = () => {
            isTouching = false;
        };

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                handleStart(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                if (e.cancelable) e.preventDefault();
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', handleEnd, { passive: true });

        this.canvas.addEventListener('mousedown', (e) => {
            handleStart(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (isTouching) handleMove(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', handleEnd);

        this.canvas.addEventListener('click', (e) => {
            if (!hasMoved && this.onActionPress) this.onActionPress();
        });
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
        this.onDragMove = null;
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
        let paddle = { x: W / 2 - 55, y: H - 28, w: 110, h: 14, speed: 10 };
        let ball = { x: W / 2, y: H - 55, radius: 7, vx: 5, vy: -5 };
        let score = 0;
        let gameOver = false;
        let keys = {};

        const rows = 4, cols = 8;
        const brickW = Math.floor((W - 24) / cols) - 5;
        const brickH = 22, padding = 5, offsetTop = 30, offsetLeft = 12;
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
            paddle.x = W / 2 - 55;
            ball = { x: W / 2, y: H - 55, radius: 7, vx: 5, vy: -5 };
            score = 0;
            gameOver = false;
            initBricks();
            document.getElementById('arcade-modal-score').textContent = 'SCORE: 0';
        };

        this.onActionPress = () => { if (gameOver) restart(); };

        // 손가락 드래그 시 패들 직접 위치 따라옴!
        this.onDragMove = (dx, dy, relX) => {
            if (relX !== undefined) {
                paddle.x = Math.max(0, Math.min(W - paddle.w, relX - paddle.w / 2));
            }
        };

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
            if (d === 'left') paddle.x = Math.max(0, paddle.x - 35);
            if (d === 'right') paddle.x = Math.min(W - paddle.w, paddle.x + 35);
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
                    ball.vx = (hitRatio - 0.5) * 11;
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
                this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
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
                this.ctx.fillText('TAP CANVAS TO RETRY', W / 2, H / 2 + 45);
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
                this.ctx.fillText('TAP CANVAS TO PLAY AGAIN', W / 2, H / 2 + 45);
                this.ctx.textAlign = 'left';
            }

            this.animId = requestAnimationFrame(loop);
        };

        this.animId = requestAnimationFrame(loop);
    }

    /* ───────────── SPACE INVADERS (공간 최적화 & 대형 4행 인베이더) ───────────── */
    runSpaceInvaders() {
        const W = this.canvas.width, H = this.canvas.height;
        // 총 쏘는 애(우주선) 위치: Y좌표를 바닥 바로 위(H - 28)로 내려서 전체 Y 공간 100% 가득 사용!
        let player = { x: W / 2 - 20, y: H - 28, w: 40, h: 20 };
        let bullets = [];
        let invaders = [];
        let score = 0;
        let keys = {};
        let gameOver = false, win = false;
        let invaderDir = 1;
        let invaderTimer = 0;
        let lastShot = 0;

        // 인베이더 위치: 캔버스 최상단(y=15) 근처부터 시작! 4행 10열 꽉 찬 배치!
        const createInvaders = () => {
            invaders = [];
            const cols = 10;
            const rows = 4;
            const invW = 32;
            const invH = 20;
            const paddingX = 22;
            const paddingY = 14;
            const startX = Math.floor((W - (cols * (invW + paddingX) - paddingX)) / 2);
            const startY = 15; // 캔버스 최상단 바로 아래부터 시작!

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    invaders.push({
                        x: startX + c * (invW + paddingX),
                        y: startY + r * (invH + paddingY),
                        w: invW,
                        h: invH,
                        alive: true
                    });
                }
            }
        };
        createInvaders();

        const fireBullet = () => {
            const now = Date.now();
            if (now - lastShot < 250) return;
            lastShot = now;
            bullets.push({ x: player.x + player.w / 2 - 2, y: player.y - 8, w: 4, h: 14 });
            if (window.retroAudio) window.retroAudio.playJump();
        };

        const restart = () => {
            player.x = W / 2 - 20;
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

        // 손가락 드래그 시 우주선이 실시간으로 손가락 X좌표를 즉시 따라옴!
        this.onDragMove = (dx, dy, relX) => {
            if (relX !== undefined) {
                player.x = Math.max(0, Math.min(W - player.w, relX - player.w / 2));
            }
        };

        this.onDirectionChange = (d) => {
            if (d === 'left') player.x = Math.max(0, player.x - 25);
            if (d === 'right') player.x = Math.min(W - player.w, player.x + 25);
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
                if (keys['left'] || this.touchState.left) player.x = Math.max(0, player.x - 6);
                if (keys['right'] || this.touchState.right) player.x = Math.min(W - player.w, player.x + 6);

                for (let b of bullets) b.y -= 11;
                bullets = bullets.filter(b => b.y > -20);

                invaderTimer++;
                const alive = invaders.filter(i => i.alive);
                const interval = Math.max(3, 24 - (40 - alive.length));
                if (invaderTimer >= interval) {
                    invaderTimer = 0;
                    let hitWall = false;
                    for (let inv of alive) {
                        inv.x += invaderDir * 7;
                        if (inv.x <= 4 || inv.x + inv.w >= W - 4) hitWall = true;
                    }
                    if (hitWall) {
                        invaderDir *= -1;
                        for (let inv of invaders) inv.y += 14;
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

            // ── 렌더링 ──
            this.ctx.fillStyle = '#0a0a0b';
            this.ctx.fillRect(0, 0, W, H);

            // 우주 배경 별
            this.ctx.fillStyle = '#ffffff';
            for (let s = 0; s < 45; s++) {
                const sx = ((s * 97 + 13) * 7) % W;
                const sy = ((s * 137 + 5) * 11) % H;
                this.ctx.fillRect(sx, sy, s % 3 === 0 ? 2 : 1, s % 3 === 0 ? 2 : 1);
            }

            // 총 쏘는 우주선 (바닥 근처)
            this.ctx.fillStyle = '#39ff14';
            this.ctx.fillRect(player.x + 4, player.y + 6, player.w - 8, player.h - 6);
            this.ctx.fillRect(player.x + player.w / 2 - 3, player.y - 4, 6, 10);
            this.ctx.fillRect(player.x, player.y + 10, 8, 10);
            this.ctx.fillRect(player.x + player.w - 8, player.y + 10, 8, 10);

            // 총알 (길쭉하고 빠른 에너제틱 빔)
            this.ctx.fillStyle = '#efffe3';
            bullets.forEach(b => {
                this.ctx.fillRect(b.x, b.y, b.w, b.h);
                this.ctx.fillStyle = 'rgba(57,255,20,0.5)';
                this.ctx.fillRect(b.x - 1, b.y + 2, b.w + 2, b.h - 2);
                this.ctx.fillStyle = '#efffe3';
            });

            // 침략자 (상단 최상단 4행)
            invaders.forEach((inv, i) => {
                if (!inv.alive) return;
                const row = Math.floor(i / 10);
                this.ctx.fillStyle = ['#dfb7ff', '#ff4d6d', '#ffb4ab', '#79ff5b'][row] || '#dfb7ff';
                this.ctx.fillRect(inv.x + 2, inv.y + 4, inv.w - 4, inv.h - 4);
                this.ctx.fillRect(inv.x + 5, inv.y, 4, 5);
                this.ctx.fillRect(inv.x + inv.w - 9, inv.y, 4, 5);
                this.ctx.fillRect(inv.x, inv.y + inv.h - 5, 6, 5);
                this.ctx.fillRect(inv.x + inv.w - 6, inv.y + inv.h - 5, 6, 5);
            });

            // 땅선 (바닥 바로 위 H - 6)
            this.ctx.fillStyle = '#39ff14';
            this.ctx.fillRect(0, H - 6, W, 2);

            if (gameOver) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
                this.ctx.fillRect(0, 0, W, H);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = win ? '#39ff14' : '#ff4d6d';
                this.ctx.font = 'bold 36px monospace';
                this.ctx.fillText(win ? '★ YOU WIN! ★' : 'GAME OVER', W / 2, H / 2 - 40);
                this.ctx.fillStyle = '#efffe3';
                this.ctx.font = '18px monospace';
                this.ctx.fillText(`SCORE: ${score}`, W / 2, H / 2 + 5);
                this.ctx.font = '14px monospace';
                this.ctx.fillStyle = '#39ff14';
                this.ctx.fillText('TAP CANVAS / FIRE TO RETRY', W / 2, H / 2 + 45);
                this.ctx.textAlign = 'left';
            }

            this.animId = requestAnimationFrame(loop);
        };

        loop(0);
    }

    /* ───────────── TETRIS STYLE ───────────── */
    runTetris() {
        const W = this.canvas.width, H = this.canvas.height;
        const BLOCK = 21;
        const COLS = 10;
        const ROWS = 19;
        const boardX = Math.floor((W - COLS * BLOCK) / 2);
        const boardY = Math.floor((H - ROWS * BLOCK) / 2);

        let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        let score = 0;
        let linesCleared = 0;
        let level = 1;
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
        let nextPiece = null;

        const getRandomPiece = () => {
            const idx = Math.floor(Math.random() * SHAPES.length);
            return {
                shape: SHAPES[idx],
                color: COLORS[idx]
            };
        };

        const spawnPiece = () => {
            if (!nextPiece) nextPiece = getRandomPiece();
            piece = {
                shape: nextPiece.shape,
                color: nextPiece.color,
                x: Math.floor(COLS / 2) - Math.floor(nextPiece.shape[0].length / 2),
                y: 0
            };
            nextPiece = getRandomPiece();

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
                for (let r = 0; r < piece.shape.length; r++) {
                    for (let c = 0; c < piece.shape[r].length; c++) {
                        if (piece.shape[r][c]) {
                            if (piece.y + r >= 0) {
                                board[piece.y + r][piece.x + c] = piece.color;
                            }
                        }
                    }
                }
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
                    linesCleared += lines;
                    score += lines * 200 * level;
                    level = Math.floor(linesCleared / 5) + 1;
                    document.getElementById('arcade-modal-score').textContent = `SCORE: ${score}`;
                    if (window.retroAudio) window.retroAudio.playCoin();
                }
                spawnPiece();
            }
        };

        const restart = () => {
            board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
            score = 0;
            linesCleared = 0;
            level = 1;
            gameOver = false;
            lastDrop = 0;
            nextPiece = null;
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
            const dropInterval = Math.max(80, 450 - (level - 1) * 35);
            if (!gameOver && timestamp - lastDrop > dropInterval) {
                lastDrop = timestamp;
                drop();
            }

            // ── 렌더링 ──
            this.ctx.fillStyle = '#0a0a0b';
            this.ctx.fillRect(0, 0, W, H);

            // 1. 왼쪽 사이드 패널 (아케이드 타이틀 & 설명)
            this.ctx.fillStyle = '#161618';
            this.ctx.fillRect(15, boardY - 2, 175, ROWS * BLOCK + 4);
            this.ctx.strokeStyle = '#3c4b35';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(15, boardY - 2, 175, ROWS * BLOCK + 4);

            this.ctx.fillStyle = '#39ff14';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText('TETRIS RETRO', 30, boardY + 25);
            this.ctx.fillStyle = '#baccb0';
            this.ctx.font = '11px monospace';
            this.ctx.fillText('-----------------', 30, boardY + 40);
            this.ctx.fillText('CONTROLS:', 30, boardY + 65);
            this.ctx.fillText('• D-PAD: MOVE/DROP', 35, boardY + 85);
            this.ctx.fillText('• ROTATE: TURN', 35, boardY + 105);
            this.ctx.fillText('• SWIPE: DIRECT', 35, boardY + 125);

            this.ctx.fillStyle = '#dfb7ff';
            this.ctx.font = 'bold 13px monospace';
            this.ctx.fillText('★ HIGH SCORE ★', 30, boardY + 175);
            this.ctx.fillStyle = '#efffe3';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText('99,990 PTS', 30, boardY + 200);

            // 2. 중앙 메인 보드
            this.ctx.fillStyle = '#050505';
            this.ctx.fillRect(boardX - 2, boardY - 2, COLS * BLOCK + 4, ROWS * BLOCK + 4);
            this.ctx.strokeStyle = '#39ff14';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(boardX - 2, boardY - 2, COLS * BLOCK + 4, ROWS * BLOCK + 4);

            // 보드 그리드 및 쌓인 블록
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const bx = boardX + c * BLOCK;
                    const by = boardY + r * BLOCK;
                    if (board[r][c]) {
                        this.ctx.fillStyle = board[r][c];
                        this.ctx.fillRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
                        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                        this.ctx.fillRect(bx + 1, by + 1, BLOCK - 2, 4);
                    } else {
                        this.ctx.strokeStyle = '#141416';
                        this.ctx.lineWidth = 0.5;
                        this.ctx.strokeRect(bx, by, BLOCK, BLOCK);
                    }
                }
            }

            // 떨어지는 현재 블록
            if (piece && !gameOver) {
                this.ctx.fillStyle = piece.color;
                for (let r = 0; r < piece.shape.length; r++) {
                    for (let c = 0; c < piece.shape[r].length; c++) {
                        if (piece.shape[r][c]) {
                            const bx = boardX + (piece.x + c) * BLOCK;
                            const by = boardY + (piece.y + r) * BLOCK;
                            this.ctx.fillRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
                            this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
                            this.ctx.fillRect(bx + 1, by + 1, BLOCK - 2, 4);
                            this.ctx.fillStyle = piece.color;
                        }
                    }
                }
            }

            // 3. 오른쪽 사이드 패널 (Next Piece & Stats)
            const rightX = boardX + COLS * BLOCK + 20;
            const rightW = W - rightX - 15;

            this.ctx.fillStyle = '#161618';
            this.ctx.fillRect(rightX, boardY - 2, rightW, ROWS * BLOCK + 4);
            this.ctx.strokeStyle = '#3c4b35';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(rightX, boardY - 2, rightW, ROWS * BLOCK + 4);

            // NEXT 미리보기 박스
            this.ctx.fillStyle = '#39ff14';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.fillText('NEXT', rightX + 15, boardY + 25);

            this.ctx.fillStyle = '#050505';
            this.ctx.fillRect(rightX + 15, boardY + 35, 100, 80);
            this.ctx.strokeStyle = '#39ff14';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(rightX + 15, boardY + 35, 100, 80);

            if (nextPiece) {
                this.ctx.fillStyle = nextPiece.color;
                const shape = nextPiece.shape;
                const offX = rightX + 15 + Math.floor((100 - shape[0].length * 16) / 2);
                const offY = boardY + 35 + Math.floor((80 - shape.length * 16) / 2);
                for (let r = 0; r < shape.length; r++) {
                    for (let c = 0; c < shape[r].length; c++) {
                        if (shape[r][c]) {
                            this.ctx.fillRect(offX + c * 16, offY + r * 16, 14, 14);
                        }
                    }
                }
            }

            // LINES & LEVEL 전광판
            this.ctx.fillStyle = '#ffb4ab';
            this.ctx.font = 'bold 12px monospace';
            this.ctx.fillText('LINES', rightX + 15, boardY + 145);
            this.ctx.fillStyle = '#efffe3';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText(String(linesCleared).padStart(4, '0'), rightX + 15, boardY + 165);

            this.ctx.fillStyle = '#dfb7ff';
            this.ctx.font = 'bold 12px monospace';
            this.ctx.fillText('LEVEL', rightX + 15, boardY + 200);
            this.ctx.fillStyle = '#efffe3';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText(String(level).padStart(2, '0'), rightX + 15, boardY + 220);

            if (gameOver) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
                this.ctx.fillRect(0, 0, W, H);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ff4d6d';
                this.ctx.font = 'bold 36px monospace';
                this.ctx.fillText('TETRIS GAME OVER', W / 2, H / 2 - 40);
                this.ctx.fillStyle = '#efffe3';
                this.ctx.font = '18px monospace';
                this.ctx.fillText(`FINAL SCORE: ${score}  |  LINES: ${linesCleared}`, W / 2, H / 2 + 5);
                this.ctx.font = '14px monospace';
                this.ctx.fillStyle = '#39ff14';
                this.ctx.fillText('TAP CANVAS TO PLAY AGAIN', W / 2, H / 2 + 45);
                this.ctx.textAlign = 'left';
            }

            this.animId = requestAnimationFrame(loop);
        };

        loop(0);
    }

        loop(0);
    }
}

window.arcadeModalManager = new ArcadeModalManager();
