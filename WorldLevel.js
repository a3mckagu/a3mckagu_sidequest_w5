class WorldLevel {
  constructor(json, bgImage, duckyImage, lifebuoyImage) {
    this.schemaVersion = json.schemaVersion ?? 1;

    this.w = json.world?.w ?? 2400;
    this.h = json.world?.h ?? 1600;
    this.bgImage = bgImage;
    this.duckyImage = duckyImage;
    this.lifebuoyImage = lifebuoyImage;
    this.gridStep = json.world?.gridStep ?? 160;

    this.obstacles = json.obstacles ?? [];

    // NEW: camera tuning knob from JSON (data-driven)
    this.camLerp = json.camera?.lerp ?? 0.9;

    // Diving board properties
    this.divingBoardX = 0;
    this.divingBoardY = this.h / 2 - 12.5;
    this.divingBoardW = 575;
    this.divingBoardH = 120;
    this.divingBoardCenterX = this.divingBoardX + this.divingBoardW / 2;
    this.divingBoardCenterY = this.divingBoardY + this.divingBoardH / 2;

    // Initialize 7 ducks at random positions and rotations
    this.ducks = [];

    // First duck always spawns in initial camera view but not near diving board (including 40px buffer)
    let firstDuck = null;
    let attempts = 0;
    while (!firstDuck && attempts < 100) {
      const x = random(0, 800); // Initial camera view width
      const y = random(560, 1040); // Initial camera view height

      if (!this.isDuckTooCloseToDivingBoard(x, y)) {
        firstDuck = {
          x: x,
          y: y,
          rotation: random(TWO_PI),
          carried: false,
          onBoard: false,
        };
      }
      attempts++;
    }

    if (firstDuck) {
      this.ducks.push(firstDuck);
    }

    // Remaining 6 ducks spawn anywhere except near diving board (including 40px buffer)
    for (let i = 1; i < 7; i++) {
      let duck = null;
      let attempts = 0;
      while (!duck && attempts < 100) {
        const x = random(0, this.w);
        const y = random(0, this.h);

        // If too close to diving board (including buffer), try again
        if (this.isDuckTooCloseToDivingBoard(x, y)) {
          attempts++;
          continue;
        }

        duck = {
          x: x,
          y: y,
          rotation: random(TWO_PI),
          carried: false,
          onBoard: false,
        };
      }
      if (duck) {
        this.ducks.push(duck);
      }
    }
    this.carriedDucks = []; // Array of indices of ducks being carried
    this.gameComplete = false; // Flag when all 7 ducks are on board

    // Initialize 3 lifebuoys - never in initial camera view
    this.lifebuoys = [];
    for (let i = 0; i < 3; i++) {
      let buoy = null;
      let attempts = 0;
      // Keep trying until we find a position outside the initial camera view
      while (!buoy && attempts < 100) {
        const x = random(0, this.w);
        const y = random(0, this.h);

        // Check if position is outside the initial camera view
        const isInCameraView = x >= 0 && x <= 800 && y >= 560 && y <= 1040;

        if (!isInCameraView) {
          buoy = {
            x: x,
            y: y,
            active: true,
          };
        }
        attempts++;
      }

      if (buoy) {
        this.lifebuoys.push(buoy);
      }
    }
  }

  isDuckOnBoard(x, y) {
    return (
      x >= this.divingBoardX &&
      x <= this.divingBoardX + this.divingBoardW &&
      y >= this.divingBoardY &&
      y <= this.divingBoardY + this.divingBoardH
    );
  }

  isDuckTooCloseToDivingBoard(x, y) {
    // Check if duck is within board boundaries + 40px buffer in all directions
    const bufferDist = 40;
    return (
      x >= this.divingBoardX - bufferDist &&
      x <= this.divingBoardX + this.divingBoardW + bufferDist &&
      y >= this.divingBoardY - bufferDist &&
      y <= this.divingBoardY + this.divingBoardH + bufferDist
    );
  }

  calculateBoardPosition(x, y) {
    // Calculate direction toward center
    const dx = this.divingBoardCenterX - x;
    const dy = this.divingBoardCenterY - y;
    const distance = sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return { x: x, y: y }; // Already at center
    }

    // Normalize and move 10px toward center
    const offsetX = (dx / distance) * 10;
    const offsetY = (dy / distance) * 10;

    return {
      x: x + offsetX,
      y: y + offsetY,
    };
  }

  drawBackground() {
    background(220);
  }

  checkDuckCollision(player) {
    // Check if player is within 142px of any duck not being carried and not on board
    for (let i = 0; i < this.ducks.length; i++) {
      const duck = this.ducks[i];

      // Skip if already carried or on diving board
      if (duck.carried || duck.onBoard) {
        continue;
      }

      const dx = player.x - duck.x;
      const dy = player.y - duck.y;
      const distance = sqrt(dx * dx + dy * dy);

      if (distance < 142) {
        this.carriedDucks.push(i);
        duck.carried = true;
      }
    }
  }

  checkLifebuoyCollision(player) {
    // Check if player collides with any active lifebuoy
    for (let i = 0; i < this.lifebuoys.length; i++) {
      const buoy = this.lifebuoys[i];

      if (!buoy.active) continue;

      const dx = player.x - buoy.x;
      const dy = player.y - buoy.y;
      const distance = sqrt(dx * dx + dy * dy);

      // Collision radius is 82px (half of 164px)
      if (distance < 82) {
        buoy.active = false;
        return true; // Trigger speed boost
      }
    }
    return false;
  }

  drawWorld() {
    // Draw background image
    if (this.bgImage) {
      image(this.bgImage, 0, 0, this.w, this.h);
    }

    // Draw diving board
    const divingBoardX = this.divingBoardX;
    const divingBoardY = this.divingBoardY;

    // Shadow
    fill(0, 0, 0, 100); // black with transparency
    noStroke();
    rect(divingBoardX, divingBoardY + 10, 610, 120);

    // Diving board
    fill(240, 240, 240); // white
    rect(divingBoardX, divingBoardY, 600, 120);

    // Draw ducks
    if (this.duckyImage) {
      for (let i = 0; i < this.ducks.length; i++) {
        const duck = this.ducks[i];
        push();

        if (duck.onBoard) {
          // Duck is on the diving board - use its stored board position
          translate(duck.boardPosition.x, duck.boardPosition.y);
        } else if (duck.carried) {
          // Find index in carried array for proper spacing
          const carriedIndex = this.carriedDucks.indexOf(i);
          // Stack ducks progressively further from player
          const offsetX = 10 + carriedIndex * 1;
          const offsetY = 10 + carriedIndex * 1;
          translate(duck.playerX + offsetX, duck.playerY + offsetY);
        } else {
          // Draw duck at its own position
          translate(duck.x, duck.y);
        }

        rotate(duck.rotation);
        imageMode(CENTER);
        image(this.duckyImage, 0, 0, 164, 164);
        pop();
      }
    }

    // Draw lifebuoys
    if (this.lifebuoyImage) {
      for (const buoy of this.lifebuoys) {
        if (buoy.active) {
          push();
          imageMode(CENTER);
          image(this.lifebuoyImage, buoy.x, buoy.y, 96, 96);
          pop();
        }
      }
    }

    noStroke();
    fill(170, 190, 210);
    for (const o of this.obstacles) rect(o.x, o.y, o.w, o.h, o.r ?? 0);
  }

  checkGameComplete() {
    // Count ducks on board
    let ducksOnBoard = 0;
    for (const duck of this.ducks) {
      if (duck.onBoard) ducksOnBoard++;
    }
    // Set flag when all 7 ducks are on board
    if (ducksOnBoard === 7) {
      this.gameComplete = true;
    }
  }

  isPlayAgainButtonClicked(mx, my) {
    if (
      this.playAgainButtonX !== undefined &&
      this.playAgainButtonY !== undefined &&
      this.playAgainButtonW !== undefined &&
      this.playAgainButtonH !== undefined
    ) {
      return (
        mx >= this.playAgainButtonX &&
        mx <= this.playAgainButtonX + this.playAgainButtonW &&
        my >= this.playAgainButtonY &&
        my <= this.playAgainButtonY + this.playAgainButtonH
      );
    }
    return false;
  }

  drawHUD(player, camX, camY) {
    noStroke();

    // Count ducks on board
    let ducksOnBoard = 0;
    for (const duck of this.ducks) {
      if (duck.onBoard) ducksOnBoard++;
    }

    // Draw counter at top right
    textAlign(RIGHT);
    fill(50, 50, 50);

    textFont("Playpen Sans");
    textSize(32);
    text(ducksOnBoard + "/7 ducks safe", width - 18, 450);
    textAlign(LEFT);

    // Draw completion popup if game is complete
    if (this.gameComplete) {
      // Semi-transparent overlay
      fill(0, 0, 0, 150);
      rect(0, 0, width, height);

      // Popup box
      const boxW = 300;
      const boxH = 180;
      const boxX = (width - boxW) / 2;
      const boxY = (height - boxH) / 2;

      fill(255);
      stroke(0);
      strokeWeight(2);
      rect(boxX, boxY, boxW, boxH, 10);

      // Title text
      noStroke();
      fill(0);
      textAlign(CENTER, CENTER);
      textSize(28);
      textFont("sans-serif");
      text("Task Complete", width / 2, boxY + 50);

      // Button
      const buttonW = 120;
      const buttonH = 40;
      const buttonX = (width - buttonW) / 2;
      const buttonY = boxY + 110;

      fill(100, 150, 255);
      stroke(0);
      strokeWeight(2);
      rect(buttonX, buttonY, buttonW, buttonH, 5);

      // Button text
      fill(255);
      noStroke();
      textSize(16);
      text("Play Again", width / 2, buttonY + 20);

      // Store button coordinates for click detection
      this.playAgainButtonX = buttonX;
      this.playAgainButtonY = buttonY;
      this.playAgainButtonW = buttonW;
      this.playAgainButtonH = buttonH;

      // Reset text properties
      textSize(14);
      textAlign(LEFT);
    }
  }
}
