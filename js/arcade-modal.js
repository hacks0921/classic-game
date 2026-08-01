/**
 * ArcadeModalManager
 * - 모바일 터치 D-Pad 컨트롤 지원
 * - 이벤트 리스너 클린업 (메모리 누수 방지)
 * - Snake 충돌/재시작 버그 수정
 * - Space Invaders 인베이더 이동 로직 개선
 */
class ArcadeModalManager {
    constructor() {
        this.modalEl = null;
        this.canvas = null;
        this.ctx = null;
        this.animId = null;
        // 이벤트 리스너 추적 목록
        this.activeListeners = [];
        // 공유 터치 키 상태 (Brick Breaker, Space Invaders용)
        this.touchState = { left: false, right: false, up: false, down: false };
        // 각 게임의 액션/방향 콜백
        this.onActionPress = null;
        this.onDirectionChange = null;
        this.initModal();
    }

    initModal() {
        if (document.getElementById('arcade-modal')) return;

        const modalHtml = `
        <div id="arcade-modal" class="fixed inset-0 z-[100] hidden bg-black/90 flex flex-col items-center justify-center p-2 sm:p-4">
            <div class="bg-surface-container border-4 border-primary-container p-3 sm:p-4 w-full max-w-lg flex flex-col gap-3 shadow-[0_0_20px_#39ff14]">
                <!-- 모달 헤더 -->
                <div class="flex justify-between items-center border-b-2 border-outline-variant pb-2">
                    <h3 id="arcade-modal-title" class="font-headline-lg-mobile text-headline-lg-mobile text-primary-container uppercase text-base tracking-wide">ARCADE</h3>
                    <div class="flex items-center gap-3">
                        <span id="arcade-modal-score" class="text-primary font-bold text-xs font-label-mono">SCORE: 0</span>
                        <button id="arcade-modal-close" class="bg-error-container text-on-error-container font-label-mono px-3 py-1 text-xs font-bold hover:opacity-80 transition-opacity">✕ CLOSE</button>
                    </div>
                </div>
                <!-- 게임 캔버스 -->
                <div class="relative bg-black border-2 border-primary-container overflow-hidden" style="aspect-ratio:16/9;">
                    <canvas id="arcade-modal-canvas" width="640" height="360" class="w-full h-full object-contain block"></canvas>
                </div>
                <!-- 모바일 터치 컨트롤 D-Pad -->
                <div class="flex justify-between items-center gap-4 pt-1 select-none" id="arcade-touch-pad">
                    <!-- D-Pad 방향키 -->
                    <div style="display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(3,44px);gap:4px;">
                        <div></div>
                        <button id="arc-btn-up"    class="arcade-dpad-btn flex items-center justify-center bg-surface-variant text-primary border-2 border-outline font-bold text-lg rounded-none active:bg-primary-container active:text-black touch-none" style="font-size:20px;">▲</button>
                        <div></div>
                        <button id="arc-btn-left"  class="arcade-dpad-btn flex items-center justify-center bg-surface-variant text-primary border-2 border-outline font-bold text-lg rounded-none active:bg-primary-container active:text-black touch-none" style="font-size:20px;">◀</button>
                        <div class="bg-surface-container-low border border-outline-variant rounded-none flex items-center justify-center">
                            <div class="w-2 h-2 bg-outline-variant rounded-full"></div>
                        </div>
                        <button id="arc-btn-right" class="arcade-dpad-btn flex items-center justify-center bg-surface-variant text-primary border-2 border-outline font-bold text-lg rounded-none active:bg-primary-container active:text-black touch-none" style="font-size:20px;">▶</button>
                        <div></div>
                        <button id="arc-btn-down"  class="arcade-dpad-btn flex items-center justify-center bg-surface-variant text-primary border-2 border-outline font-bold text-lg rounded-none active:bg-primary-container active:text-black touch-none" style="font-size:20px;">▼</button>
                        <div></div>
                    </div>
                    <!-- 오른쪽: 액션 버튼 + 힌트 -->
                    <div class="flex flex-col items-end gap-2 flex-shrink-0">
                        <button id="arc-btn-action" class="bg-primary-container text-on-primary-container font-label-mono font-bold text-sm border-2 border-on-primary-container active:opacity-70 touch-none" style="width:110px;height:80px;font-size:15px;letter-spacing:1px;">FIRE<br>●</button>
                        <span class="font-label-mono text-[9px] text-on-surface-variant uppercase text-right leading-tight">PC: ARROW KEYS<br>+ SPACEBAR</span>
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
    }

    /**
     * D-Pad 버튼에 touchstart/touchend, mousedown/mouseup 이벤트 바인딩
     */
    initTouchControls() {
        const bindDpad = (id, onDown, onUp) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const handleDown = (e) => { e.preventDefault(); onDown && onDown(); };
            const handleUp   = (e) => { e.preventDefault(); onUp   && onUp();   };
            btn.addEventListener('touchstart',  handleDown, { passive: false });
            btn.addEventListener('touchend',    handleUp,   { passive: false });
            btn.addEventListener('touchcancel', handleUp,   { passive: false });
            btn.addEventListener('mousedown',   handleDown);
            btn.addEventListener('mouseup',     handleUp);
            btn.addEventListener('mouseleave',  handleUp);
        };

        bindDpad('arc-btn-left',
            () => { this.touchState.left = true;  if (this.onDirectionChange) this.onDirectionChange('left');  },
            () => { this.touchState.left = false; }
        );
        bindDpad('arc-btn-right',
            () => { this.touchState.right = true;  if (this.onDirectionChange) this.onDirectionChange('right'); },
            () => { this.touchState.right = false; }
        );
        bindDpad('arc-btn-up',
            () => { this.touchState.up = true;  if (this.onDirectionChange) this.onDirectionChange('up');    },
            () => { this.touchState.up = false; }
        );
        bindDpad('arc-btn-down',
            () => { this.touchState.down = true;  if (this.onDirectionChange) this.onDirectionChange('down');  },
            () => { this.touchState.down = false; }
        );
        bindDpad('arc-btn-action',
            () => { if (this.onActionPress) this.onActionPress(); },
            () => {}
        );
    }

    /**
     * 추적 가능한 이벤트 리스너 등록
     */
    addListener(target, event, fn, options) {
        target.addEventListener(event, fn, options);
        this.activeListeners.push({ target, event, fn });
    }

    /**
     * 등록된 모든 이벤트 리스너 제거 (메모리 누수 방지)
     */
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

        this.modalEl.classList.remove('hidden');
        if (window.retroAudio) window.retroAudio.playStart();

        const titleEl = document.getElementById('arcade-modal-title');
        document.getElementById('arcade-modal-score').textContent = 'SCORE: 0';

        if (gameType === 'brick') {
            titleEl.textContent = 'BRICK BREAKER';
            this.runBrickBreaker();
        } else if (gameType === 'snake') {
            titleEl.textContent = 'SNAKE RETRO';
            this.runSnake();
        } else if (gameType === 'invaders') {
            titleEl.textContent = 'SPACE INVADERS';
            this.runSpaceInvaders();
        } else {
            titleEl.textContent = 'BRICK BREAKER';
            this.runBrickBreaker();
        }
    }

    close() {
        if (this.modalEl) this.modalEl.classList.add('hidden');
        if (this.animId) cancelAnimationFrame(this.animId);
        this.animId = null;
        this.clearListeners();
    }

    /* ───────────── BRICK BREAKER ───────────── */
    runBrickBreaker() {
        const W = this.canvas.width, H = this.canvas.height;
        let paddle = { x: W / 2 - 50, y: H - 30, w: 100, h: 12, speed: 8 };
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
            keys[e.code] = true;
            if (e.code === 'Space' && gameOver) restart();
        };
        const onKeyUp = (e) => { keys[e.code] = false; };
        this.addListener(window, 'keydown', onKeyDown);
        this.addListener(window, 'keyup', onKeyUp);

        const loop = () => {
            // 패들 이동 (키보드 + 터치)
            if (keys['ArrowLeft']  || keys['KeyA'] || this.touchState.left)
                paddle.x = Math.max(0, paddle.x - paddle.speed);
            if (keys['ArrowRight'] || keys['KeyD'] || this.touchState.right)
                paddle.x = Math.min(W - paddle.w, paddle.x + paddle.speed);

            if (!gameOver) {
                ball.x += ball.vx;
                ball.y += ball.vy;

                // 벽 반사
                if (ball.x < ball.radius) { ball.x = ball.radius; ball.vx = Math.abs(ball.vx); }
                if (ball.x > W - ball.radius) { ball.x = W - ball.radius; ball.vx = -Math.abs(ball.vx); }
                if (ball.y < ball.radius) { ball.y = ball.radius; ball.vy = Math.abs(ball.vy); }

                // 패들 충돌
                if (ball.vy > 0 &&
                    ball.y + ball.radius >= paddle.y &&
                    ball.y + ball.radius <= paddle.y + 20 &&
                    ball.x >= paddle.x - 2 && ball.x <= paddle.x + paddle.w + 2) {
                    ball.vy = -Math.abs(ball.vy);
                    // 패들 위치에 따라 반사각 조정
                    const hitRatio = (ball.x - paddle.x) / paddle.w;
                    ball.vx = (hitRatio - 0.5) * 10;
                    if (window.retroAudio) window.retroAudio.playJump();
                }

                // 벽돌 충돌
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

                // 낙구 → 게임 오버
                if (ball.y > H + 20) {
                    gameOver = true;
                    if (window.retroAudio) window.retroAudio.playGameOver();
                }

                // 모든 벽돌 제거 → 클리어
                if (bricks.every(b => b.status === 0)) {
                    score += 500;
                    initBricks();
                    ball.vx *= 1.1; ball.vy *= 1.1; // 속도 증가
                }
            }

            // ── 렌더 ──
            this.ctx.fillStyle = '#0e0e0f';
            this.ctx.fillRect(0, 0, W, H);

            // 벽돌
            const colors = ['#ffb4ab', '#dfb7ff', '#39ff14', '#79ff5b'];
            bricks.forEach((b, idx) => {
                if (b.status !== 1) return;
                const row = Math.floor(idx / cols);
                this.ctx.fillStyle = colors[row % colors.length];
                this.ctx.fillRect(b.x, b.y, brickW, brickH);
                // 하이라이트
                this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
                this.ctx.fillRect(b.x, b.y, brickW, 4);
            });

            // 패들
            this.ctx.fillStyle = '#39ff14';
            this.ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(paddle.x, paddle.y, paddle.w, 3);

            // 공
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // 게임 오버 오버레이
            if (gameOver) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
                this.ctx.fillRect(0, 0, W, H);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ffb4ab';
                this.ctx.font = 'bold 40px monospace';
                this.ctx.fillText('GAME OVER', W / 2, H / 2 - 50);
                this.ctx.fillStyle = '#efffe3';
                this.ctx.font = '20px monospace';
                this.ctx.fillText(`SCORE: ${score}`, W / 2, H / 2);
                this.ctx.font = '15px monospace';
                this.ctx.fillStyle = '#39ff14';
                this.ctx.fillText('TAP FIRE  or  SPACEBAR  to RETRY', W / 2, H / 2 + 40);
                this.ctx.textAlign = 'left';
            }

            this.animId = requestAnimationFrame(loop);
        };
        loop();
    }

    /* ───────────── SNAKE ───────────── */
    runSnake() {
        const W = this.canvas.width, H = this.canvas.height;
        const GRID = 18;
        const TX = Math.floor(W / GRID);
        const TY = Math.floor(H / GRID);

        let snake, dir, nextDir, food, score, gameOver, speed, lastTime;

        const placeFood = () => {
            do {
                food = { x: Math.floor(Math.random() * TX), y: Math.floor(Math.random() * TY) };
            } while (snake.some(s => s.x === food.x && s.y === food.y));
        };

        const restart = () => {
            snake = [{ x: Math.floor(TX / 2), y: Math.floor(TY / 2) }];
            dir = { x: 1, y: 0 };
            nextDir = { x: 1, y: 0 };
            score = 0;
            speed = 130;
            gameOver = false;
            lastTime = 0;
            placeFood();
            document.getElementById('arcade-modal-score').textContent = 'SCORE: 0';
        };
        restart();

        // 방향 변경 (D-Pad 터치 + 키보드 공통 함수)
        const changeDir = (d) => {
            if (d === 'left'  && dir.x === 0) nextDir = { x: -1, y:  0 };
            if (d === 'right' && dir.x === 0) nextDir = { x:  1, y:  0 };
            if (d === 'up'    && dir.y === 0) nextDir = { x:  0, y: -1 };
            if (d === 'down'  && dir.y === 0) nextDir = { x:  0, y:  1 };
        };

        this.onDirectionChange = changeDir;
        this.onActionPress = () => { if (gameOver) restart(); };

        const onKeyDown = (e) => {
            if (e.code === 'ArrowLeft'  || e.code === 'KeyA') changeDir('left');
            if (e.code === 'ArrowRight' || e.code === 'KeyD') changeDir('right');
            if (e.code === 'ArrowUp'    || e.code === 'KeyW') changeDir('up');
            if (e.code === 'ArrowDown'  || e.code === 'KeyS') changeDir('down');
            if (e.code === 'Space' && gameOver) restart();
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

                // 자기 자신 충돌 감지 (버그 수정)
                if (snake.some(s => s.x === head.x && s.y === head.y)) {
                    gameOver = true;
                    if (window.retroAudio) window.retroAudio.playGameOver();
                } else {
                    if (head.x === food.x && head.y === food.y) {
                        score += 150;
                        document.getElementById('arcade-modal-score').textContent = `SCORE: ${score}`;
                        placeFood();
                        // 6개 먹을 때마다 속도 증가
                        if (score % 900 === 0) speed = Math.max(60, speed - 10);
                        if (window.retroAudio) window.retroAudio.playCoin();
                    } else {
                        snake.pop();
                    }
                    snake.unshift(head);
                }
            }

            // ── 렌더 ──
            this.ctx.fillStyle = '#0e0e0f';
            this.ctx.fillRect(0, 0, W, H);

            // 격자
            this.ctx.strokeStyle = '#161616';
            this.ctx.lineWidth = 0.5;
            for (let x = 0; x < W; x += GRID) {
                this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, H); this.ctx.stroke();
            }
            for (let y = 0; y < H; y += GRID) {
                this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(W, y); this.ctx.stroke();
            }

            // 먹이
            this.ctx.fillStyle = '#ffb4ab';
            this.ctx.fillRect(food.x * GRID + 2, food.y * GRID + 2, GRID - 4, GRID - 4);
            this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
            this.ctx.fillRect(food.x * GRID + 2, food.y * GRID + 2, GRID - 4, 4);

            // 뱀
            snake.forEach((part, i) => {
                this.ctx.fillStyle = i === 0 ? '#79ff5b' : (i % 2 === 0 ? '#39ff14' : '#2ae500');
                this.ctx.fillRect(part.x * GRID + 1, part.y * GRID + 1, GRID - 2, GRID - 2);
                if (i === 0) {
                    this.ctx.fillStyle = '#0a1a05';
                    this.ctx.fillRect(part.x * GRID + 4, part.y * GRID + 4, 4, 4);
                    this.ctx.fillRect(part.x * GRID + 10, part.y * GRID + 4, 4, 4);
                }
            });

            // 게임 오버 오버레이
            if (gameOver) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.78)';
                this.ctx.fillRect(0, 0, W, H);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ffb4ab';
                this.ctx.font = 'bold 40px monospace';
                this.ctx.fillText('GAME OVER', W / 2, H / 2 - 50);
                this.ctx.fillStyle = '#efffe3';
                this.ctx.font = '20px monospace';
                this.ctx.fillText(`SCORE: ${score}  |  LENGTH: ${snake.length}`, W / 2, H / 2);
                this.ctx.font = '15px monospace';
                this.ctx.fillStyle = '#39ff14';
                this.ctx.fillText('TAP FIRE  or  SPACEBAR  to RETRY', W / 2, H / 2 + 40);
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
            if (now - lastShot < 320) return;
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

        const onKeyDown = (e) => {
            keys[e.code] = true;
            if (e.code === 'Space') { if (!gameOver) fireBullet(); else restart(); }
        };
        const onKeyUp = (e) => { keys[e.code] = false; };
        this.addListener(window, 'keydown', onKeyDown);
        this.addListener(window, 'keyup', onKeyUp);

        const loop = (timestamp) => {
            if (!gameOver) {
                // 플레이어 이동 (키보드 + 터치)
                if (keys['ArrowLeft']  || keys['KeyA'] || this.touchState.left)
                    player.x = Math.max(0, player.x - 5);
                if (keys['ArrowRight'] || keys['KeyD'] || this.touchState.right)
                    player.x = Math.min(W - player.w, player.x + 5);

                // 총알 업데이트
                for (let b of bullets) b.y -= 9;
                bullets = bullets.filter(b => b.y > -20);

                // 인베이더 이동
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

                // 충돌 감지
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

                // 승/패 판정
                if (invaders.every(i => !i.alive)) { win = true; gameOver = true; }
                if (invaders.some(i => i.alive && i.y + i.h >= player.y)) {
                    gameOver = true;
                    if (window.retroAudio) window.retroAudio.playGameOver();
                }
            }

            // ── 렌더 ──
            this.ctx.fillStyle = '#0a0a0b';
            this.ctx.fillRect(0, 0, W, H);

            // 별 배경
            this.ctx.fillStyle = '#ffffff';
            for (let s = 0; s < 40; s++) {
                const sx = ((s * 97 + 13) * 7) % W;
                const sy = ((s * 137 + 5) * 11) % H;
                this.ctx.fillRect(sx, sy, s % 3 === 0 ? 2 : 1, s % 3 === 0 ? 2 : 1);
                this.ctx.globalAlpha = 0.4 + (s % 3) * 0.2;
            }
            this.ctx.globalAlpha = 1;

            // 플레이어 우주선
            this.ctx.fillStyle = '#39ff14';
            // 몸통
            this.ctx.fillRect(player.x + 4, player.y + 6, player.w - 8, player.h - 6);
            // 총구
            this.ctx.fillRect(player.x + player.w / 2 - 3, player.y, 6, 8);
            // 날개
            this.ctx.fillRect(player.x, player.y + 10, 8, 10);
            this.ctx.fillRect(player.x + player.w - 8, player.y + 10, 8, 10);

            // 총알
            this.ctx.fillStyle = '#efffe3';
            bullets.forEach(b => {
                this.ctx.fillRect(b.x, b.y, b.w, b.h);
                // 빛 효과
                this.ctx.fillStyle = 'rgba(239,255,227,0.3)';
                this.ctx.fillRect(b.x - 2, b.y, b.w + 4, b.h);
                this.ctx.fillStyle = '#efffe3';
            });

            // 인베이더
            invaders.forEach((inv, i) => {
                if (!inv.alive) return;
                const row = Math.floor(i / 9);
                this.ctx.fillStyle = ['#dfb7ff', '#ffb4ab', '#79ff5b'][row] || '#dfb7ff';
                // 본체
                this.ctx.fillRect(inv.x + 2, inv.y + 4, inv.w - 4, inv.h - 4);
                // 안테나
                this.ctx.fillRect(inv.x + 4, inv.y, 3, 5);
                this.ctx.fillRect(inv.x + inv.w - 7, inv.y, 3, 5);
                // 다리
                this.ctx.fillRect(inv.x, inv.y + inv.h - 5, 5, 5);
                this.ctx.fillRect(inv.x + inv.w - 5, inv.y + inv.h - 5, 5, 5);
            });

            // 땅 라인
            this.ctx.fillStyle = '#39ff14';
            this.ctx.fillRect(0, H - 18, W, 2);

            // 게임 오버 오버레이
            if (gameOver) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.78)';
                this.ctx.fillRect(0, 0, W, H);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = win ? '#39ff14' : '#ffb4ab';
                this.ctx.font = 'bold 40px monospace';
                this.ctx.fillText(win ? '★ YOU WIN! ★' : 'GAME OVER', W / 2, H / 2 - 50);
                this.ctx.fillStyle = '#efffe3';
                this.ctx.font = '20px monospace';
                this.ctx.fillText(`SCORE: ${score}`, W / 2, H / 2);
                this.ctx.font = '15px monospace';
                this.ctx.fillStyle = '#39ff14';
                this.ctx.fillText('TAP FIRE  or  SPACEBAR  to RETRY', W / 2, H / 2 + 40);
                this.ctx.textAlign = 'left';
            }

            this.animId = requestAnimationFrame(loop);
        };

        loop(0);
    }
}

window.arcadeModalManager = new ArcadeModalManager();
