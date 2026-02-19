/*
Week 5 — Example 4: Data-driven world with JSON + Smooth Camera

Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
Date: Feb. 12, 2026

Move: WASD/Arrows

Learning goals:
- Extend the JSON-driven world to include camera parameters
- Implement smooth camera follow using interpolation (lerp)
- Separate camera behavior from player/world logic
- Tune motion and feel using external data instead of hard-coded values
- Maintain player visibility with soft camera clamping
- Explore how small math changes affect “game feel”
*/

const VIEW_W = 800;
const VIEW_H = 480;

let worldData;
let level;
let player;
let bgImage;
let swanImage;
let duckyImage;
let lifebuoyImage;

let camX = 0;
let camY = 0;

function preload() {
  worldData = loadJSON("world.json"); // load JSON before setup [web:122]
  bgImage = loadImage("assets/bg.jpeg");
  swanImage = loadImage("assets/swan.png");
  duckyImage = loadImage("assets/ducky.png");
  lifebuoyImage = loadImage("assets/lifebuoy.png");
}

function setup() {
  createCanvas(VIEW_W, VIEW_H);
  textFont("sans-serif");
  textSize(14);

  level = new WorldLevel(worldData, bgImage, duckyImage, lifebuoyImage);

  const start = worldData.playerStart ?? { x: 300, y: 300, speed: 3 };
  player = new Player(start.x, start.y, start.speed, swanImage);

  camX = player.x - width / 2;
  camY = player.y - height / 2;
}

function draw() {
  // Update player with current carried ducks count before input
  player.setCarriedDucks(level.carriedDucks.length);

  // Only allow input if game is not complete
  if (!level.gameComplete) {
    player.updateInput();
  }

  // Keep player inside world
  player.x = constrain(player.x, 0, level.w);
  player.y = constrain(player.y, 0, level.h);

  // Check duck collision and update all carried ducks positions
  level.checkDuckCollision(player);

  // Update carried ducks and check if they reach the diving board
  for (let i = level.carriedDucks.length - 1; i >= 0; i--) {
    const duckIndex = level.carriedDucks[i];
    const duck = level.ducks[duckIndex];
    duck.playerX = player.x;
    duck.playerY = player.y;

    // Check if duck is on the diving board
    if (level.isDuckOnBoard(duck.playerX, duck.playerY)) {
      duck.onBoard = true;
      duck.boardPosition = level.calculateBoardPosition(
        duck.playerX,
        duck.playerY,
      );
      duck.carried = false;
      level.carriedDucks.splice(i, 1); // Remove from carried array
    }
  }

  // Check lifebuoy collision
  if (level.checkLifebuoyCollision(player)) {
    player.activateSpeedBoost();
  }

  // Check if game is complete
  level.checkGameComplete();

  // Target camera (center on player)
  let targetX = player.x - width / 2;
  let targetY = player.y - height / 2;

  // Clamp target camera safely
  const maxCamX = max(0, level.w - width);
  const maxCamY = max(0, level.h - height);
  targetX = constrain(targetX, 0, maxCamX);
  targetY = constrain(targetY, 0, maxCamY);

  // Smooth follow using the JSON knob
  // Camera becomes slower/lags more as more ducks are carried
  const duckCount = level.carriedDucks.length;
  let camLerp = level.camLerp * (1 - duckCount * 0.1); // 10% reduction per duck
  camLerp = max(0.02, camLerp); // ensure minimum responsiveness
  camX = lerp(camX, targetX, camLerp);
  camY = lerp(camY, targetY, camLerp);

  level.drawBackground();

  push();
  translate(-camX, -camY);
  level.drawWorld();
  player.draw();
  pop();

  level.drawHUD(player, camX, camY);
}

function keyPressed() {
  if (key === "r" || key === "R") {
    const start = worldData.playerStart ?? { x: 300, y: 300, speed: 3 };
    player = new Player(start.x, start.y, start.speed, swanImage);
  }
}

function mousePressed() {
  if (level.isPlayAgainButtonClicked(mouseX, mouseY)) {
    location.reload();
  }
}
