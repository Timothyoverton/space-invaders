import { Component, signal, effect, OnInit, OnDestroy, HostListener } from '@angular/core';
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

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  gameWidth = 800;
  gameHeight = 600;
  score = signal(0);
  gameOver = signal(false);
  gameStarted = signal(false);
  level = signal(1);

  player: Player = {
    x: 375,
    y: 550,
    width: 50,
    height: 40,
    speed: 5
  };

  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  enemyBullets: Bullet[] = [];
  enemyDirection = 1;
  enemySpeed = 1;
  spawnTimer = 0;
  gameLoop: number | null = null;
  keys: { [key: string]: boolean } = {};

  ngOnInit() {
    this.initGame();
  }

  ngOnDestroy() {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    this.keys[event.key.toLowerCase()] = true;
    if (event.key === ' ') {
      event.preventDefault();
      if (this.gameStarted() && !this.gameOver()) {
        this.shoot();
      }
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
    this.player.x = 375;
    this.spawnEnemies(3 + this.level());
    this.startGameLoop();
  }

  startGameLoop() {
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
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < count; col++) {
        this.enemies.push({
          x: 50 + col * 100,
          y: 30 + row * 60,
          width: 40,
          height: 30
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
    this.bullets = this.bullets.filter(b => {
      b.y -= b.speed;
      return b.y > 0;
    });
  }

  updateEnemyBullets() {
    this.enemyBullets = this.enemyBullets.filter(b => {
      b.y += b.speed;
      return b.y < this.gameHeight;
    });
  }

  updateEnemies() {
    let hitEdge = false;
    for (let enemy of this.enemies) {
      enemy.x += this.enemySpeed * this.enemyDirection;
      if (enemy.x <= 0 || enemy.x + enemy.width >= this.gameWidth) {
        hitEdge = true;
      }
    }

    if (hitEdge) {
      this.enemyDirection *= -1;
      for (let enemy of this.enemies) {
        enemy.y += 20;
      }
    }

    if (this.enemies.some(e => e.y > this.gameHeight - 100)) {
      this.gameOver.set(true);
    }

    if (this.enemies.length === 0) {
      this.level.update(l => l + 1);
      this.enemySpeed += 0.5;
      this.spawnEnemies(3 + this.level());
    }
  }

  shoot() {
    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 2.5,
      y: this.player.y,
      width: 5,
      height: 15,
      speed: 7
    });
  }

  enemyShoot() {
    this.spawnTimer++;
    if (this.spawnTimer > 60 && this.enemies.length > 0) {
      const randomEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      this.enemyBullets.push({
        x: randomEnemy.x + randomEnemy.width / 2 - 2.5,
        y: randomEnemy.y + randomEnemy.height,
        width: 5,
        height: 15,
        speed: 3
      });
      this.spawnTimer = 0;
    }
  }

  checkCollisions() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (this.isColliding(this.bullets[i], this.enemies[j])) {
          this.bullets.splice(i, 1);
          this.enemies.splice(j, 1);
          this.score.update(s => s + 10);
          break;
        }
      }
    }

    for (let bullet of this.enemyBullets) {
      if (this.isColliding(bullet, this.player)) {
        this.gameOver.set(true);
      }
    }
  }

  isColliding(rect1: any, rect2: any): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  restartGame() {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
    }
    this.initGame();
  }
}
