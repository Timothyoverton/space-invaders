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
    this.spawnTimer = 0;
    this.player.x = 450;
    this.spawnEnemies(5);
    this.createIslands();
    this.startGameLoop();
  }

  createIslands() {
    this.islandBlocks = [];
    const blockW = 16;
    const blockH = 12;
    const islandY = 560;
    const islandXs = [120, 330, 545, 755];

    for (const ix of islandXs) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
          if (row === 2 && (col === 0 || col === 4)) continue;
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

  spawnEnemies(count: number) {
    this.enemies = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < count; col++) {
        this.enemies.push({
          x: 60 + col * 110,
          y: 40 + row * 72,
          width: 48,
          height: 36
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
      this.enemySpeed = Math.min(1 + (this.level() - 1) * 0.5, 5);
      this.spawnEnemies(Math.min(5 + this.level() - 1, 9));
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
    const interval = Math.max(20, 55 - this.level() * 3);
    if (this.spawnTimer > interval && this.enemies.length > 0) {
      const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      this.enemyBullets.push({
        x: shooter.x + shooter.width / 2 - 3,
        y: shooter.y + shooter.height,
        width: 6,
        height: 18,
        speed: 4 + this.level() * 0.3
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
