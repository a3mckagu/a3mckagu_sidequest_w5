class Player {
  constructor(x, y, speed, image) {
    this.x = x;
    this.y = y;
    this.baseSpeed = speed ?? 1.2;
    this.image = image;
    this.rotation = 0; // 0 = up, PI/2 = right, PI = down, 3*PI/2 = left
    this.carriedDucksCount = 0;
    this.speedBoosts = []; // Array to track multiple boost end times
  }

  setCarriedDucks(count) {
    this.carriedDucksCount = count;
  }

  activateSpeedBoost() {
    // Speed boost for 15 seconds (15000ms)
    // Each boost multiplies speed by 1.4x
    this.speedBoosts.push(millis() + 15000);
  }

  getActiveBoostCount() {
    // Remove expired boosts and count active ones
    const now = millis();
    this.speedBoosts = this.speedBoosts.filter((endTime) => now < endTime);
    return this.speedBoosts.length;
  }

  getActualSpeed() {
    let speed = this.baseSpeed * (1 - 0.22 * this.carriedDucksCount);
    const activeBoosts = this.getActiveBoostCount();
    // Apply 1.4x multiplier for each active boost
    speed *= Math.pow(1.4, activeBoosts);
    return speed;
  }

  updateInput() {
    const right = keyIsDown(RIGHT_ARROW) || keyIsDown(68);
    const left = keyIsDown(LEFT_ARROW) || keyIsDown(65);
    const down = keyIsDown(DOWN_ARROW) || keyIsDown(83);
    const up = keyIsDown(UP_ARROW) || keyIsDown(87);

    let dx = 0;
    let dy = 0;

    // Only allow one direction at a time (no diagonals)
    // Priority: right > left > down > up
    if (right) {
      dx = 1;
      this.rotation = HALF_PI; // 90 degrees
    } else if (left) {
      dx = -1;
      this.rotation = PI + HALF_PI; // 270 degrees
    } else if (down) {
      dy = 1;
      this.rotation = PI; // 180 degrees
    } else if (up) {
      dy = -1;
      this.rotation = 0; // 0 degrees
    }

    const actualSpeed = this.getActualSpeed();
    this.x += dx * actualSpeed;
    this.y += dy * actualSpeed;
  }

  draw() {
    if (this.image) {
      push();
      translate(this.x, this.y);
      rotate(this.rotation);
      imageMode(CENTER);
      image(this.image, 0, 0, 212, 212);
      pop();
    }
  }
}
