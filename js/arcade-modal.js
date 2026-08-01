// Arcade Mini Game Modal Manager (Brick Breaker, Snake, Space Invaders)
class ArcadeModalManager {
    constructor() {
        this.modalEl = null;
        this.canvas = null;
        this.ctx = null;
        this.currentGame = null;
        this.animId = null;
        this.initModal();
    }

    initModal() {
        if (document.getElementById('arcade-modal')) return;

        const modalHtml = `
        <div id="arcade-modal" class="fixed inset-0 z-[100] hidden bg-black/90 flex flex-col items-center justify-center p-4">
            <div class="bg-surface-container border-4 border-primary-container p-4 max-w-2xl w-full flex flex-col gap-4 shadow-[0_0_20px_#39ff14]">
                <div class="flex justify-between items-center border-b-2 border-outline-variant pb-2">
                    <h3 id="arcade-modal-title" class="font-headline-lg-mobile text-headline-lg-mobile text-primary-container uppercase">ARCADE GAME</h3>
                    <button id="arcade-modal-close" class="bg-error-container text-on-error-container font-label-mono px-3 py-1 font-bold">CLOSE [X]</button>
                </div>
                <div class="relative aspect-video bg-black border-2 border-primary-container overflow-hidden flex items-center justify-center">
                    <canvas id="arcade-modal-canvas" width="640" height="360" class="w-full h-full object-contain"></canvas>
                </div>
                <div class="flex justify-between items-center font-label-mono text-xs text-on-surface-variant">
                    <span>CONTROLS: ARROW KEYS / SPACEBAR</span>
                    <span id="arcade-modal-score" class="text-primary font-bold">SCORE: 0</span>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modalEl = document.getElementById('arcade-modal');
        this.canvas = document.getElementById('arcade-modal-canvas');
        this.ctx = this.canvas.getContext('2d');

        document.getElementById('arcade-modal-close').addEventListener('click', () => this.close());
    }

    launch(gameType) {
        this.initModal();
        this.modalEl.classList.remove('hidden');
        if (window.retroAudio) window.retroAudio.playStart();

        const titleEl = document.getElementById('arcade-modal-title');

        if (this.animId) cancelAnimationFrame(this.animId);

        if (gameType === 'brick') {
            titleEl.textContent = 'BRICK BREAKER ARCADE';
            this.runBrickBreaker();
        } else if (gameType === 'snake') {
            titleEl.textContent = 'SNAKE RETRO ARCADE';
            this.runSnake();
        } else if (gameType === 'invaders') {
            titleEl.textContent = 'SPACE INVADERS ARCADE';
            this.runSpaceInvaders();
        } else {
            titleEl.textContent = 'TETRIS STYLE ARCADE';
            this.runBrickBreaker();
        }
    }

    close() {
        if (this.modalEl) this.modalEl.classList.add('hidden');
        if (this.animId) cancelAnimationFrame(this.animId);
    }

    runBrickBreaker() {
        let paddle = { x: 270, y: 340, w: 100, h: 12, vx: 0, speed: 7 };
        let ball = { x: 320, y: 320, radius: 6, vx: 4, vy: -4 };
        let bricks = [];
        let score = 0;
        let keys = {};

        const rows = 4, cols = 8, brickW = 70, brickH = 20, padding = 8, offsetTop = 40, offsetLeft = 12;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                bricks.push({ x: c * (brickW + padding) + offsetLeft, y: r * (brickH + padding) + offsetTop, status: 1 });
            }
        }

        const onKeyDown = (e) => { keys[e.code] = true; };
        const onKeyUp = (e) => { keys[e.code] = false; };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        const loop = () => {
            if (keys['ArrowLeft'] || keys['KeyA']) paddle.x = Math.max(0, paddle.x - paddle.speed);
            if (keys['ArrowRight'] || keys['KeyD']) paddle.x = Math.min(this.canvas.width - paddle.w, paddle.x + paddle.speed);

            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wall bounce
            if (ball.x < ball.radius || ball.x > this.canvas.width - ball.radius) ball.vx = -ball.vx;
            if (ball.y < ball.radius) ball.vy = -ball.vy;

            // Paddle bounce
            if (ball.y + ball.radius >= paddle.y && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
                ball.vy = -Math.abs(ball.vy);
                if (window.retroAudio) window.retroAudio.playJump();
            }

            // Brick collision
            for (let b of bricks) {
                if (b.status === 1) {
                    if (ball.x > b.x && ball.x < b.x + brickW && ball.y > b.y && ball.y < b.y + brickH) {
                        ball.vy = -ball.vy;
                        b.status = 0;
                        score += 100;
                        document.getElementById('arcade-modal-score').textContent = `SCORE: ${score}`;
                        if (window.retroAudio) window.retroAudio.playCoin();
                    }
                }
            }

            // Game Over
            if (ball.y > this.canvas.height) {
                if (window.retroAudio) window.retroAudio.playGameOver();
                ball = { x: 320, y: 320, radius: 6, vx: 4, vy: -4 };
                score = 0;
            }

            // Render
            this.ctx.fillStyle = '#0e0e0f';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw Bricks
            const colors = ['#ffb4ab', '#dfb7ff', '#39ff14', '#79ff5b'];
            bricks.forEach((b, idx) => {
                if (b.status === 1) {
                    this.ctx.fillStyle = colors[idx % colors.length];
                    this.ctx.fillRect(b.x, b.y, brickW, brickH);
                }
            });

            // Draw Paddle
            this.ctx.fillStyle = '#39ff14';
            this.ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

            // Draw Ball
            this.ctx.fillStyle = '#efffe3';
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();

            this.animId = requestAnimationFrame(loop);
        };

        loop();
    }

    runSnake() {
        let snake = [{ x: 10, y: 10 }];
        let dir = { x: 1, y: 0 };
        let food = { x: 15, y: 15 };
        let score = 0;
        let gridSize = 16;
        let tileCountX = Math.floor(this.canvas.width / gridSize);
        let tileCountY = Math.floor(this.canvas.height / gridSize);
        let lastTime = 0;

        const onKeyDown = (e) => {
            if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && dir.x === 0) dir = { x: -1, y: 0 };
            if ((e.code === 'ArrowRight' || e.code === 'KeyD') && dir.x === 0) dir = { x: 1, y: 0 };
            if ((e.code === 'ArrowUp' || e.code === 'KeyW') && dir.y === 0) dir = { x: 0, y: -1 };
            if ((e.code === 'ArrowDown' || e.code === 'KeyS') && dir.y === 0) dir = { x: 0, y: 1 };
        };
        window.addEventListener('keydown', onKeyDown);

        const loop = (timestamp) => {
            if (timestamp - lastTime > 100) {
                lastTime = timestamp;

                let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

                // Wrap or death
                if (head.x < 0) head.x = tileCountX - 1;
                if (head.x >= tileCountX) head.x = 0;
                if (head.y < 0) head.y = tileCountY - 1;
                if (head.y >= tileCountY) head.y = 0;

                // Eat food
                if (head.x === food.x && head.y === food.y) {
                    score += 150;
                    document.getElementById('arcade-modal-score').textContent = `SCORE: ${score}`;
                    food = { Math_floor: Math.floor(Math.random() * tileCountX), y: Math.floor(Math.random() * tileCountY) };
                    food.x = Math.floor(Math.random() * tileCountX);
                    if (window.retroAudio) window.retroAudio.playCoin();
                } else {
                    snake.pop();
                }

                snake.unshift(head);
            }

            // Render
            this.ctx.fillStyle = '#0e0e0f';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Food
            this.ctx.fillStyle = '#ffb4ab';
            this.ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);

            // Snake
            this.ctx.fillStyle = '#39ff14';
            snake.forEach((part) => {
                this.ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
            });

            this.animId = requestAnimationFrame(loop);
        };

        this.animId = requestAnimationFrame(loop);
    }

    runSpaceInvaders() {
        let player = { x: 300, y: 320, w: 32, h: 16 };
        let bullets = [];
        let invaders = [];
        let score = 0;
        let keys = {};

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
                invaders.push({ x: c * 55 + 60, y: r * 35 + 30, w: 30, h: 20, alive: true });
            }
        }

        const onKeyDown = (e) => {
            keys[e.code] = true;
            if (e.code === 'Space') {
                bullets.push({ x: player.x + 14, y: player.y, w: 4, h: 10 });
                if (window.retroAudio) window.retroAudio.playJump();
            }
        };
        const onKeyUp = (e) => { keys[e.code] = false; };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        const loop = () => {
            if (keys['ArrowLeft'] || keys['KeyA']) player.x = Math.max(0, player.x - 5);
            if (keys['ArrowRight'] || keys['KeyD']) player.x = Math.min(this.canvas.width - player.w, player.x + 5);

            // Bullets update
            for (let b of bullets) b.y -= 7;

            // Collision
            for (let b of bullets) {
                for (let inv of invaders) {
                    if (inv.alive && b.x > inv.x && b.x < inv.x + inv.w && b.y > inv.y && b.y < inv.y + inv.h) {
                        inv.alive = false;
                        b.y = -99;
                        score += 200;
                        document.getElementById('arcade-modal-score').textContent = `SCORE: ${score}`;
                        if (window.retroAudio) window.retroAudio.playCoin();
                    }
                }
            }

            // Render
            this.ctx.fillStyle = '#0e0e0f';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Player
            this.ctx.fillStyle = '#39ff14';
            this.ctx.fillRect(player.x, player.y, player.w, player.h);

            // Bullets
            this.ctx.fillStyle = '#efffe3';
            bullets.forEach(b => this.ctx.fillRect(b.x, b.y, b.w, b.h));

            // Invaders
            this.ctx.fillStyle = '#dfb7ff';
            invaders.forEach(inv => {
                if (inv.alive) this.ctx.fillRect(inv.x, inv.y, inv.w, inv.h);
            });

            this.animId = requestAnimationFrame(loop);
        };

        loop();
    }
}

window.arcadeModalManager = new ArcadeModalManager();
