class PixelQuestGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.score = 0;
        this.coins = 0;
        this.lives = 3;
        this.cameraX = 0;
        
        this.keys = { left: false, right: false, up: false };
        
        this.player = {
            x: 100,
            y: 200,
            width: 24,
            height: 32,
            vx: 0,
            vy: 0,
            speed: 4,
            jumpPower: -11,
            grounded: false,
            color: '#39ff14'
        };
        
        this.gravity = 0.55;
        this.platforms = [];
        this.coinItems = [];
        this.hazards = [];
        this.particles = [];
        
        this.initControls();
    }

    initControls() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
                if (!this.keys.up && this.player.grounded && this.isRunning) {
                    this.player.vy = this.player.jumpPower;
                    this.player.grounded = false;
                    if (window.retroAudio) window.retroAudio.playJump();
                }
                this.keys.up = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
            if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') this.keys.up = false;
        });
    }

    start() {
        this.score = 0;
        this.coins = 0;
        this.lives = 3;
        this.cameraX = 0;
        this.player.x = 100;
        this.player.y = 200;
        this.player.vx = 0;
        this.player.vy = 0;
        this.isRunning = true;

        this.generateMap();
        if (window.retroAudio) window.retroAudio.playStart();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    generateMap() {
        this.platforms = [
            { x: 0, y: 350, w: 600, h: 50 },
            { x: 700, y: 320, w: 300, h: 50 },
            { x: 1100, y: 280, w: 400, h: 50 },
            { x: 1600, y: 340, w: 500, h: 50 },
            { x: 2200, y: 290, w: 450, h: 50 }
        ];

        this.coinItems = [];
        this.hazards = [];

        // Generate coins and hazards on platforms
        for (let i = 1; i < 20; i++) {
            const platformX = 300 + i * 250;
            const platformY = 320 - (i % 3) * 40;
            this.platforms.push({ x: platformX, y: platformY, w: 180, h: 30 });
            
            // Coins
            this.coinItems.push({ x: platformX + 40, y: platformY - 30, w: 16, h: 16, collected: false });
            this.coinItems.push({ x: platformX + 90, y: platformY - 30, w: 16, h: 16, collected: false });

            // Hazard / Spike
            if (i % 2 === 0) {
                this.hazards.push({ x: platformX + 130, y: platformY - 20, w: 20, h: 20 });
            }
        }
    }

    update() {
        if (!this.isRunning) return;

        // Player Movement
        if (this.keys.left) this.player.vx = -this.player.speed;
        else if (this.keys.right) this.player.vx = this.player.speed;
        else this.player.vx = 0;

        this.player.vy += this.gravity;

        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        // Platform collision
        this.player.grounded = false;
        for (let plat of this.platforms) {
            if (this.player.x + this.player.width > plat.x &&
                this.player.x < plat.x + plat.w &&
                this.player.y + this.player.height >= plat.y &&
                this.player.y + this.player.height <= plat.y + 15 &&
                this.player.vy >= 0) {
                this.player.grounded = true;
                this.player.vy = 0;
                this.player.y = plat.y - this.player.height;
            }
        }

        // Camera Follow
        if (this.player.x - this.cameraX > 350) {
            this.cameraX = this.player.x - 350;
        }

        // Coin Collision
        for (let coin of this.coinItems) {
            if (!coin.collected &&
                this.player.x < coin.x + coin.w &&
                this.player.x + this.player.width > coin.x &&
                this.player.y < coin.y + coin.h &&
                this.player.y + this.player.height > coin.y) {
                coin.collected = true;
                this.coins += 1;
                this.score += 100;
                if (window.retroAudio) window.retroAudio.playCoin();
                this.createParticles(coin.x + 8, coin.y + 8, '#39ff14');
            }
        }

        // Hazard Collision
        for (let hazard of this.hazards) {
            if (this.player.x < hazard.x + hazard.w &&
                this.player.x + this.player.width > hazard.x &&
                this.player.y < hazard.y + hazard.h &&
                this.player.y + this.player.height > hazard.y) {
                this.takeDamage();
            }
        }

        // Fall Death - canvas 높이 기준으로 동적 계산
        if (this.player.y > this.canvas.height + 50) {
            this.takeDamage();
        }

        // Particles Update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 1;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        this.score += 1;
    }

    takeDamage() {
        this.lives -= 1;
        this.createParticles(this.player.x, this.player.y, '#ffb4ab');
        if (this.lives <= 0) {
            this.isRunning = false;
            if (window.retroAudio) window.retroAudio.playGameOver();
        } else {
            this.player.x = Math.max(100, this.cameraX + 50);
            this.player.y = 150;
            this.player.vy = 0;
        }
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: color,
                life: 20
            });
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Dark Arcade Background
        this.ctx.fillStyle = '#0a0a0b';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid lines
        this.ctx.strokeStyle = '#1c1b1c';
        this.ctx.lineWidth = 1;
        for (let x = -this.cameraX % 40; x < this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);

        // Draw Platforms
        this.ctx.fillStyle = '#201f20';
        this.ctx.strokeStyle = '#39ff14';
        this.ctx.lineWidth = 2;
        for (let plat of this.platforms) {
            this.ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            this.ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        }

        // Draw Hazards
        this.ctx.fillStyle = '#ffb4ab';
        for (let hazard of this.hazards) {
            this.ctx.beginPath();
            this.ctx.moveTo(hazard.x, hazard.y + hazard.h);
            this.ctx.lineTo(hazard.x + hazard.w / 2, hazard.y);
            this.ctx.lineTo(hazard.x + hazard.w, hazard.y + hazard.h);
            this.ctx.closePath();
            this.ctx.fill();
        }

        // Draw Coins
        for (let coin of this.coinItems) {
            if (!coin.collected) {
                this.ctx.fillStyle = '#dfb7ff';
                this.ctx.fillRect(coin.x, coin.y, coin.w, coin.h);
                this.ctx.strokeStyle = '#9d05ff';
                this.ctx.strokeRect(coin.x, coin.y, coin.w, coin.h);
            }
        }

        // Draw Particles
        for (let p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 4, 4);
        }

        // Draw Player (Pixel Knight Hero)
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        this.ctx.fillStyle = '#053900'; // Eyes
        this.ctx.fillRect(this.player.x + (this.player.vx < 0 ? 4 : 14), this.player.y + 6, 6, 6);

        this.ctx.restore();

        // UI Overlay (Score, Coins, Lives)
        this.ctx.fillStyle = '#efffe3';
        this.ctx.font = '16px "Space Mono", monospace';
        this.ctx.fillText(`SCORE: ${Math.floor(this.score)}`, 20, 30);
        this.ctx.fillText(`COINS: ${this.coins}`, 200, 30);
        this.ctx.fillText(`LIVES: ${'♥'.repeat(Math.max(0, this.lives))}`, 340, 30);

        if (!this.isRunning) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#39ff14';
            this.ctx.font = 'bold 36px "Sora", sans-serif';
            this.ctx.textAlign = 'center';
            if (this.lives <= 0) {
                this.ctx.fillText('GAME OVER', this.canvas.width / 2, 180);
                this.ctx.fillStyle = '#e5e2e3';
                this.ctx.font = '20px "Space Mono", monospace';
                this.ctx.fillText(`FINAL SCORE: ${Math.floor(this.score)}`, this.canvas.width / 2, 230);
                this.ctx.fillText('PRESS START TO REPLAY', this.canvas.width / 2, 280);
            } else {
                this.ctx.fillText('PIXEL QUEST', this.canvas.width / 2, 180);
                this.ctx.fillStyle = '#e5e2e3';
                this.ctx.font = '16px "Space Mono", monospace';
                this.ctx.fillText('TAP "START GAME" BUTTON TO PLAY', this.canvas.width / 2, 240);
                this.ctx.fillText('MOBILE: USE D-PAD BELOW   PC: ARROW KEYS', this.canvas.width / 2, 275);
            }
            this.ctx.textAlign = 'left';
        }
    }

    gameLoop() {
        this.update();
        this.render();
        if (this.isRunning) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

window.PixelQuestGame = PixelQuestGame;
