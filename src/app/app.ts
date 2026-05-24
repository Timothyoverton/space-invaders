import { Component, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color?: string;
}

interface IslandBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
}

interface GameRecord {
  gameNumber: number;
  score: number;
  level: number;
  time: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  gameWidth = 960;
  gameHeight = 720;
  score = signal(0);
  gameOver = signal(false);
  gameStarted = signal(false);
  level = signal(1);

  player: Player = {
    x: 450,
    y: 650,
    width: 60,
    height: 48,
    speed: 6
  };

  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  enemyBullets: Bullet[] = [];
  islandBlocks: IslandBlock[] = [];
  enemyDirection = 1;
  enemySpeed = 1;
  spawnTimer = 0;
  gameLoop: number | null = null;
  keys: { [key: string]: boolean } = {};

  sessionHistory: GameRecord[] = [];
  gameCount = 0;

  ngOnInit() {
    this.initGame();
  }

  ngOnDestroy() {
    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    this.keys[event.key.toLowerCase()] = true;
    if (event.key === ' ') {
      event.preventDefault();
      if (this.gameStarted() && !this.gameOver()) this.shoot();
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    this.keys[event.key.toLowerCase()] = false;
  }

  initGame() {
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.score.set(0);
    this.gameOver.set(false);
    this.gameStarted.set(true);
    this.level.set(1);
    this.enemySpeed = 1;
    this.enemyDirection = 1;
    this.spawnTimer = 0;
    this.player.x = 450;
    this.spawnEnemies(5, 3);
    this.createIslands();
    this.startGameLoop();
  }

  private readonly LASER_TYPES = [
    { w: 5,  h: 20, sm: 1.0, color: '#ff2222' },  // zapper  — red,    standard
    { w: 3,  h: 36, sm: 1.3, color: '#00ffff' },  // beam    — cyan,   thin & fast
    { w: 12, h: 8,  sm: 0.7, color: '#ff8800' },  // blob    — orange, wide & slow
    { w: 7,  h: 14, sm: 0.85,color: '#cc00ff' },  // plasma  — purple, chunky
    { w: 2,  h: 44, sm: 1.5, color: '#00ff44' },  // spike   — green,  long & quick
    { w: 10, h: 10, sm: 0.75,color: '#ff00cc' },  // burst   — pink,   fat & slow
    { w: 4,  h: 28, sm: 1.1, color: '#ffff00' },  // bolt    — yellow, medium
    { w: 6,  h: 16, sm: 0.95,color: '#ff6600' },  // flare   — deep orange
  ];

  // Shape templates by tier. 1 = block, 0 = gap. All 5 cols wide.
  private readonly SHAPES: number[][][][] = [
    // Tier 1 — levels 1-3: solid, easy to hide behind
    [
      [[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0]],           // classic arch
      [[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1]],           // solid block
      [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1]],           // pyramid
      [[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0]],           // diamond
    ],
    // Tier 2 — levels 4-7: gaps start appearing
    [
      [[1,0,0,0,1],[1,1,1,1,1],[1,1,0,1,1]],           // fort
      [[1,1,0,1,1],[1,1,1,1,1],[1,1,0,1,1]],           // H-shape
      [[1,0,1,0,1],[1,1,1,1,1],[1,1,1,1,1]],           // battlements
      [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,0,1,0]], // tower
    ],
    // Tier 3 — levels 8+: sparse and tricky
    [
      [[1,0,1,0,1],[0,1,0,1,0],[1,0,1,0,1]],           // checkerboard
      [[1,1,0,0,0],[1,1,1,0,0],[1,1,1,1,0],[1,1,1,1,1]], // steps
      [[0,1,0,1,0],[1,1,1,1,1],[0,1,0,1,0]],           // lattice
      [[1,0,1,0,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]], // spire
    ],
  ];

  createIslands() {
    this.islandBlocks = [];
    const blockW = 16;
    const blockH = 12;
    const islandY = 560;
    const islandXs = [120, 330, 545, 755];
    const lv = this.level();
    const tier = lv >= 8 ? 2 : lv >= 4 ? 1 : 0;

    // Build pool from all tiers up to current
    const pool: number[][][] = [];
    for (let t = 0; t <= tier; t++) pool.push(...this.SHAPES[t]);

    for (const ix of islandXs) {
      const shape = pool[Math.floor(Math.random() * pool.length)];
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (!shape[row][col]) continue;
          this.islandBlocks.push({
            x: ix + col * blockW,
            y: islandY + row * blockH,
            width: blockW - 2,
            height: blockH - 2,
            health: 3
          });
        }
      }
    }
  }

  startGameLoop() {
    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
    const tick = () => {
      if (!this.gameOver()) {
        this.update();
        this.checkCollisions();
      }
      this.gameLoop = requestAnimationFrame(tick);
    };
    this.gameLoop = requestAnimationFrame(tick);
  }

  spawnEnemies(cols: number, rows: number) {
    this.enemies = [];
    const enemyW = 48;
    const enemyH = 36;
    const gap = 20;
    const totalWidth = cols * enemyW + (cols - 1) * gap;
    const startX = Math.floor((this.gameWidth - totalWidth) / 2);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.enemies.push({
          x: startX + col * (enemyW + gap),
          y: 40 + row * 70,
          width: enemyW,
          height: enemyH
        });
      }
    }
  }

  update() {
    this.updatePlayer();
    this.updateBullets();
    this.updateEnemies();
    this.updateEnemyBullets();
    this.enemyShoot();
  }

  updatePlayer() {
    if (this.keys['arrowleft'] || this.keys['a']) {
      this.player.x = Math.max(0, this.player.x - this.player.speed);
    }
    if (this.keys['arrowright'] || this.keys['d']) {
      this.player.x = Math.min(this.gameWidth - this.player.width, this.player.x + this.player.speed);
    }
  }

  updateBullets() {
    this.bullets = this.bullets.filter(b => { b.y -= b.speed; return b.y > 0; });
  }

  updateEnemyBullets() {
    this.enemyBullets = this.enemyBullets.filter(b => { b.y += b.speed; return b.y < this.gameHeight; });
  }

  updateEnemies() {
    let hitEdge = false;
    for (const enemy of this.enemies) {
      enemy.x += this.enemySpeed * this.enemyDirection;
      if (enemy.x <= 0 || enemy.x + enemy.width >= this.gameWidth) hitEdge = true;
    }

    if (hitEdge) {
      this.enemyDirection *= -1;
      for (const enemy of this.enemies) enemy.y += 24;
    }

    if (this.enemies.some(e => e.y + e.height > this.gameHeight - 90)) {
      this.endGame();
      return;
    }

    if (this.enemies.length === 0) {
      this.level.update(l => l + 1);
      this.enemySpeed = Math.min(1 + (this.level() - 1) * 0.2, 3);
      const lv = this.level();
      const cols = Math.min(5 + Math.floor((lv - 1) / 2), 10);
      const rows = lv >= 14 ? 5 : lv >= 9 ? 4 : 3;
      this.spawnEnemies(cols, rows);
      this.createIslands();
    }
  }

  shoot() {
    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 3,
      y: this.player.y,
      width: 6,
      height: 18,
      speed: 9
    });
  }

  enemyShoot() {
    this.spawnTimer++;
    const interval = Math.max(28, 70 - this.level() * 2);
    if (this.spawnTimer > interval && this.enemies.length > 0) {
      const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      const laser = this.LASER_TYPES[Math.floor(Math.random() * this.LASER_TYPES.length)];
      const baseSpeed = 3 + this.level() * 0.15;
      this.enemyBullets.push({
        x: shooter.x + shooter.width / 2 - laser.w / 2,
        y: shooter.y + shooter.height,
        width: laser.w,
        height: laser.h,
        speed: baseSpeed * laser.sm,
        color: laser.color
      });
      this.spawnTimer = 0;
    }
  }

  checkCollisions() {
    // Player bullets vs enemies
    outer: for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (this.isColliding(this.bullets[i], this.enemies[j])) {
          this.bullets.splice(i, 1);
          this.enemies.splice(j, 1);
          this.score.update(s => s + 10);
          continue outer;
        }
      }
    }

    // Player bullets vs island blocks
    outer2: for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.islandBlocks.length - 1; j >= 0; j--) {
        if (this.isColliding(this.bullets[i], this.islandBlocks[j])) {
          this.bullets.splice(i, 1);
          this.islandBlocks[j].health--;
          if (this.islandBlocks[j].health <= 0) this.islandBlocks.splice(j, 1);
          continue outer2;
        }
      }
    }

    // Enemy bullets vs island blocks
    outer3: for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      for (let j = this.islandBlocks.length - 1; j >= 0; j--) {
        if (this.isColliding(this.enemyBullets[i], this.islandBlocks[j])) {
          this.enemyBullets.splice(i, 1);
          this.islandBlocks[j].health--;
          if (this.islandBlocks[j].health <= 0) this.islandBlocks.splice(j, 1);
          continue outer3;
        }
      }
    }

    // Enemy bullets vs player
    for (const bullet of this.enemyBullets) {
      if (this.isColliding(bullet, this.player)) {
        this.endGame();
        return;
      }
    }
  }

  isColliding(a: any, b: any): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  }

  endGame() {
    this.gameOver.set(true);
    this.gameCount++;
    this.sessionHistory.unshift({
      gameNumber: this.gameCount,
      score: this.score(),
      level: this.level(),
      time: new Date().toLocaleTimeString()
    });
  }

  restartGame() {
    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
    this.initGame();
  }

  blockColor(health: number): string {
    if (health === 3) return '#00dd00';
    if (health === 2) return '#aaff00';
    return '#ff8800';
  }

  getBestScore(): number {
    return this.sessionHistory.length > 0
      ? Math.max(...this.sessionHistory.map(r => r.score))
      : 0;
  }
}
