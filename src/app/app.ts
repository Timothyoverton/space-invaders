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

interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: string;
  color: string;
  label: string;
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
  private lastTime = 0;
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
    if (event.key === ' ') event.preventDefault();
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
    this.powerUps = [];
    this.activePowerUp = null;
    this.powerUpTimer = 0;
    this.powerUpSpawnTimer = 0;
    this.shootCooldown = 0;
    this.player.x = 450;
    this.spawnEnemies(5, 3);
    this.createIslands();
    this.startGameLoop();
  }

  private readonly POWER_UP_DEFS: Record<string, { color: string; label: string; name: string }> = {
    dual:   { color: '#ffee00', label: '⚡', name: 'DUAL CANNON' },
    triple: { color: '#ff8800', label: '3×', name: 'TRIPLE SHOT' },
    fast:   { color: '#00eeff', label: '»',  name: 'FAST LASER'  },
    big:    { color: '#00ff88', label: '■',  name: 'BIG SHOT'    },
    rapid:  { color: '#ff44ff', label: '★',  name: 'RAPID FIRE'  },
  };

  powerUps: PowerUp[] = [];
  activePowerUp: string | null = null;
  powerUpTimer = 0;
  readonly powerUpDuration = 600; // 10 s at 60 fps
  powerUpSpawnTimer = 0;
  readonly powerUpSpawnInterval = 480; // ~8 s between drops
  shootCooldown = 0;

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
    this.lastTime = 0;
    const tick = (timestamp: number) => {
      if (this.lastTime === 0) this.lastTime = timestamp;
      const dt = Math.min(timestamp - this.lastTime, 50); // cap at 50 ms (tab-switch guard)
      this.lastTime = timestamp;
      const f = dt / (1000 / 60); // 1.0 at 60 fps, 0.5 at 120 fps, 2.0 at 30 fps
      if (!this.gameOver()) {
        this.update(f);
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

  update(f: number) {
    this.updatePlayer(f);
    this.updateBullets(f);
    this.updateEnemies(f);
    this.updateEnemyBullets(f);
    this.updatePowerUps(f);
    this.enemyShoot(f);
    this.spawnPowerUp(f);
  }

  updatePlayer(f: number) {
    if (this.keys['arrowleft'] || this.keys['a']) {
      this.player.x = Math.max(0, this.player.x - this.player.speed * f);
    }
    if (this.keys['arrowright'] || this.keys['d']) {
      this.player.x = Math.min(this.gameWidth - this.player.width, this.player.x + this.player.speed * f);
    }
    if (this.shootCooldown > 0) this.shootCooldown -= f;
    if (this.keys[' '] && this.shootCooldown <= 0) this.shoot();
    if (this.powerUpTimer > 0) {
      this.powerUpTimer -= f;
      if (this.powerUpTimer <= 0) { this.powerUpTimer = 0; this.activePowerUp = null; }
    }
  }

  updateBullets(f: number) {
    this.bullets = this.bullets.filter(b => { b.y -= b.speed * f; return b.y > 0; });
  }

  updateEnemyBullets(f: number) {
    this.enemyBullets = this.enemyBullets.filter(b => { b.y += b.speed * f; return b.y < this.gameHeight; });
  }

  updateEnemies(f: number) {
    let hitEdge = false;
    for (const enemy of this.enemies) {
      enemy.x += this.enemySpeed * this.enemyDirection * f;
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
    const pu = this.activePowerUp;
    this.shootCooldown = pu === 'rapid' ? 5 : 15;

    const cx    = this.player.x + this.player.width / 2;
    const bw    = pu === 'big'  ? 14 : 6;
    const bh    = pu === 'big'  ? 28 : 18;
    const bs    = pu === 'fast' ? 16 : 9;
    const color = pu ? this.POWER_UP_DEFS[pu].color : '#00ff00';

    const make = (offset: number): Bullet => ({
      x: cx + offset - bw / 2, y: this.player.y,
      width: bw, height: bh, speed: bs, color
    });

    if (pu === 'dual')   { this.bullets.push(make(-20), make(20)); }
    else if (pu === 'triple') { this.bullets.push(make(-22), make(0), make(22)); }
    else                 { this.bullets.push(make(0)); }
  }

  updatePowerUps(f: number) {
    this.powerUps = this.powerUps.filter(pu => { pu.y += pu.speed * f; return pu.y < this.gameHeight; });
  }

  spawnPowerUp(f: number) {
    if (this.enemies.length === 0) return;
    this.powerUpSpawnTimer += f;
    if (this.powerUpSpawnTimer < this.powerUpSpawnInterval) return;
    this.powerUpSpawnTimer = 0;
    const host = this.enemies[Math.floor(Math.random() * this.enemies.length)];
    const keys = Object.keys(this.POWER_UP_DEFS);
    const type = keys[Math.floor(Math.random() * keys.length)];
    const def  = this.POWER_UP_DEFS[type];
    this.powerUps.push({
      x: host.x + host.width / 2 - 14,
      y: host.y + host.height,
      width: 28, height: 28, speed: 1.5,
      type, color: def.color, label: def.label
    });
  }

  enemyShoot(f: number) {
    this.spawnTimer += f;
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

    // Player collects power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      if (this.isColliding(this.powerUps[i], this.player)) {
        this.activePowerUp = this.powerUps[i].type;
        this.powerUpTimer  = this.powerUpDuration;
        this.powerUps.splice(i, 1);
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

  powerUpName(): string    { return this.activePowerUp ? this.POWER_UP_DEFS[this.activePowerUp].name  : ''; }
  powerUpColor(): string   { return this.activePowerUp ? this.POWER_UP_DEFS[this.activePowerUp].color : '#fff'; }
  powerUpSeconds(): number { return Math.ceil(this.powerUpTimer / 60); }

  getBestScore(): number {
    return this.sessionHistory.length > 0
      ? Math.max(...this.sessionHistory.map(r => r.score))
      : 0;
  }
}
