import Phaser from 'phaser';
import { ClawState, ClawSceneCallbacks, PrizeItem } from '../types';

export class ClawScene extends Phaser.Scene {
  // Machine Boundaries & Positions
  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_HEIGHT = 600;
  private readonly CHUTE_X = 135;
  private readonly PIT_MIN_X = 225;
  private readonly PIT_MAX_X = 725;
  private readonly FLOOR_Y = 525;
  private readonly GANTRY_Y = 65;
  private readonly HOME_X = 450;
  private readonly HOME_Y = 115;

  // State
  private currentState: ClawState = 'IDLE';
  private clawX: number = 450;
  private clawY: number = 115;
  private clawSpeed: number = 240;
  private moveDirection: -1 | 0 | 1 = 0;
  private grabbedToy: Phaser.Physics.Arcade.Sprite | null = null;
  private targetPointerX: number | null = null;

  // Visual Components
  private trolleySprite!: Phaser.GameObjects.Graphics;
  private cableGraphics!: Phaser.GameObjects.Graphics;
  private clawHousing!: Phaser.GameObjects.Graphics;
  private clawLeftArm!: Phaser.GameObjects.Graphics;
  private clawRightArm!: Phaser.GameObjects.Graphics;
  private ledLight!: Phaser.GameObjects.Graphics;
  private aimGuideGraphics!: Phaser.GameObjects.Graphics;
  private glassSheenGraphics!: Phaser.GameObjects.Graphics;
  private chuteGlowGraphics!: Phaser.GameObjects.Graphics;

  // Angles for articulated claw fingers
  private leftArmAngle: number = -30; // Open state
  private rightArmAngle: number = 30; // Open state

  // Physics Groups & Objects
  private toysGroup!: Phaser.Physics.Arcade.Group;
  private chuteSensor!: Phaser.GameObjects.Rectangle;
  private floorPlatform!: Phaser.GameObjects.Rectangle;
  private chuteBarrierWall!: Phaser.GameObjects.Rectangle;

  // Controls & Callbacks
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private callbacks: ClawSceneCallbacks = {};

  constructor() {
    super({ key: 'ClawScene' });
  }

  public init(data?: { callbacks?: ClawSceneCallbacks }) {
    if (data?.callbacks) {
      this.callbacks = data.callbacks;
    }
  }

  public setCallbacks(callbacks: ClawSceneCallbacks) {
    this.callbacks = callbacks;
  }

  public preload() {
    // 1. Generate programmatic fallback texture for the toy
    this.createFallbackToyTexture();

    // 2. Generate sparkle texture for winning particles
    this.createSparkleTexture();

    // 3. Load actual soccer toy asset
    this.load.image('soccer_toy', '/assets/soccer_toy.png');

    // Safe error handling for missing/slow asset
    this.load.on('loaderror', (fileObj: Phaser.Loader.File) => {
      console.warn(`[ClawMachine] Asset ${fileObj.key} failed to load. Using dynamic fallback.`);
    });
  }

  private createFallbackToyTexture() {
    if (this.textures.exists('toy_fallback')) return;

    const gfx = this.make.graphics({ x: 0, y: 0 });
    // Draw Cute Soccer Plushie Fallback
    const radius = 42;
    const cx = 50;
    const cy = 48;

    // Body shadow
    gfx.fillStyle(0x000000, 0.15);
    gfx.fillCircle(cx, cy + 4, radius);

    // Ball Base (White)
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(cx, cy, radius);
    gfx.lineStyle(4, 0x1e293b, 1);
    gfx.strokeCircle(cx, cy, radius);

    // Soccer pentagonal black spots
    gfx.fillStyle(0x1e293b, 1);
    // Center pentagon
    this.drawPentagon(gfx, cx, cy - 10, 15);
    // Outer patches
    this.drawPentagon(gfx, cx - 32, cy - 24, 12);
    this.drawPentagon(gfx, cx + 32, cy - 24, 12);
    this.drawPentagon(gfx, cx - 32, cy + 18, 12);
    this.drawPentagon(gfx, cx + 32, cy + 18, 12);
    this.drawPentagon(gfx, cx, cy - 42, 10);

    // Cute Face: Eyes
    gfx.fillStyle(0x0f172a, 1);
    gfx.fillCircle(cx - 10, cy + 8, 4.5);
    gfx.fillCircle(cx + 10, cy + 8, 4.5);
    // Eye shines
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(cx - 11, cy + 7, 1.5);
    gfx.fillCircle(cx + 9, cy + 7, 1.5);

    // Rosy Pink Cheeks
    gfx.fillStyle(0xf472b6, 0.85);
    gfx.fillCircle(cx - 18, cy + 14, 5);
    gfx.fillCircle(cx + 18, cy + 14, 5);

    // Smile
    gfx.lineStyle(3, 0x0f172a, 1);
    gfx.beginPath();
    gfx.arc(cx, cy + 10, 6, 0.2, Math.PI - 0.2, false);
    gfx.strokePath();

    // Cute Brown Boots at bottom
    gfx.fillStyle(0x92400e, 1);
    gfx.lineStyle(2, 0x451a03, 1);
    gfx.fillRoundedRect(cx - 24, cy + 34, 18, 12, 5);
    gfx.strokeRoundedRect(cx - 24, cy + 34, 18, 12, 5);
    gfx.fillRoundedRect(cx + 6, cy + 34, 18, 12, 5);
    gfx.strokeRoundedRect(cx + 6, cy + 34, 18, 12, 5);

    gfx.generateTexture('toy_fallback', 100, 100);
    gfx.destroy();
  }

  private drawPentagon(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number) {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      points.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < 5; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.closePath();
    gfx.fillPath();
  }

  private createSparkleTexture() {
    if (this.textures.exists('sparkle')) return;
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.fillStyle(0xfff380, 1);
    gfx.fillCircle(12, 12, 6);
    gfx.lineStyle(3, 0xffffff, 1);
    gfx.strokeCircle(12, 12, 9);
    gfx.generateTexture('sparkle', 24, 24);
    gfx.destroy();
  }

  public create() {
    // 1. Build Machine Interior Background & Decorative Lighting
    this.createMachineBackground();

    // 2. Physics Platforms & Boundaries
    this.createMachineBoundaries();

    // 3. Create Prize Chute on Left Side
    this.createPrizeChute();

    // 4. Create Toys in the Pit
    this.createToys();

    // 5. Create Claw Mechanism (Trolley, Cable, Housing, Grips, LED, Guide line)
    this.createClawMechanism();

    // 6. Setup Glass Front Sheen & Cabinet Framing
    this.createGlassOverlay();

    // 7. Setup Inputs (Keyboard & Pointer / Touch)
    this.setupInputHandlers();

    // Emit initial state
    this.updateState('IDLE', 'Claw Ready! Move left/right and press Drop.');
  }

  private createMachineBackground() {
    // Back wall gradient
    const bgGfx = this.add.graphics();
    bgGfx.fillGradientStyle(0x1a153a, 0x1a153a, 0x0d0924, 0x0d0924, 1);
    bgGfx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Soft arcade grid lines in the background
    bgGfx.lineStyle(1, 0x3b2d71, 0.25);
    for (let x = 40; x < this.CANVAS_WIDTH; x += 40) {
      bgGfx.lineBetween(x, 70, x, 530);
    }
    for (let y = 70; y < 530; y += 40) {
      bgGfx.lineBetween(20, y, this.CANVAS_WIDTH - 20, y);
    }

    // Top Gantry Beam / Track
    const gantry = this.add.graphics();
    // Metal track
    gantry.fillStyle(0x334155, 1);
    gantry.fillRect(60, 48, this.CANVAS_WIDTH - 120, 20);
    gantry.fillStyle(0x64748b, 1);
    gantry.fillRect(60, 52, this.CANVAS_WIDTH - 120, 6);
    gantry.lineStyle(2, 0x1e293b, 1);
    gantry.strokeRect(60, 48, this.CANVAS_WIDTH - 120, 20);

    // Gantry end brackets
    gantry.fillStyle(0x475569, 1);
    gantry.fillRoundedRect(50, 42, 22, 32, 4);
    gantry.strokeRoundedRect(50, 42, 22, 32, 4);
    gantry.fillRoundedRect(this.CANVAS_WIDTH - 72, 42, 22, 32, 4);
    gantry.strokeRoundedRect(this.CANVAS_WIDTH - 72, 42, 22, 32, 4);

    // Neon accent edge along top
    gantry.lineStyle(3, 0x06b6d4, 0.7);
    gantry.lineBetween(70, 72, this.CANVAS_WIDTH - 70, 72);

    // Machine Floor (Prize pit carpet)
    const floorGfx = this.add.graphics();
    floorGfx.fillGradientStyle(0x4338ca, 0x4338ca, 0x312e81, 0x312e81, 1);
    floorGfx.fillRect(205, 525, this.CANVAS_WIDTH - 225, 75);
    // Floor top lip
    floorGfx.fillStyle(0x6366f1, 1);
    floorGfx.fillRect(205, 523, this.CANVAS_WIDTH - 225, 4);

    // Soft spotlight on the prize pit
    const spotlight = this.add.graphics();
    spotlight.fillStyle(0x818cf8, 0.08);
    spotlight.fillTriangle(450, 70, 180, 530, 760, 530);
  }

  private createMachineBoundaries() {
    // Floor Platform (invisible collider)
    this.floorPlatform = this.add.rectangle(480, 545, 580, 30, 0x000000, 0);
    this.physics.add.existing(this.floorPlatform, true);

    // Acrylic Chute Barrier Wall (separates chute from toy pit)
    const barrierGfx = this.add.graphics();
    barrierGfx.fillStyle(0x38bdf8, 0.25);
    barrierGfx.fillRoundedRect(200, 370, 14, 160, 4);
    barrierGfx.lineStyle(2, 0x7dd3fc, 0.8);
    barrierGfx.strokeRoundedRect(200, 370, 14, 160, 4);

    // Barrier physics wall
    this.chuteBarrierWall = this.add.rectangle(207, 450, 14, 160, 0x000000, 0);
    this.physics.add.existing(this.chuteBarrierWall, true);

    // Right machine wall
    const rightWall = this.add.rectangle(785, 450, 20, 250, 0x000000, 0);
    this.physics.add.existing(rightWall, true);
  }

  private createPrizeChute() {
    // Prize chute basin
    const chuteGfx = this.add.graphics();
    
    // Chute dark opening
    chuteGfx.fillStyle(0x090814, 1);
    chuteGfx.fillRoundedRect(55, 460, 145, 135, 10);
    chuteGfx.lineStyle(4, 0xec4899, 1);
    chuteGfx.strokeRoundedRect(55, 460, 145, 135, 10);

    // Chute interior depth gradient
    chuteGfx.fillStyle(0x181028, 1);
    chuteGfx.fillRoundedRect(65, 475, 125, 115, 6);

    // "WINNER CHUTE" Sign
    this.add.text(127, 485, 'PRIZE DROP', {
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      color: '#f472b6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Downward arrow in chute
    const arrow = this.add.text(127, 510, '▼ ▼', {
      fontSize: '18px',
      color: '#fb7185',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtle pulsing animation for arrow
    this.tweens.add({
      targets: arrow,
      y: 516,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Chute sensor (triggers prize claim when toy falls into the chute)
    this.chuteSensor = this.add.rectangle(127, 530, 110, 80, 0x000000, 0);
    this.physics.add.existing(this.chuteSensor, true);

    // Glowing rim effect
    this.chuteGlowGraphics = this.add.graphics();
  }

  private createToys() {
    this.toysGroup = this.physics.add.group({
      bounceY: 0.2,
      bounceX: 0.2,
      dragX: 180,
      dragY: 100,
      collideWorldBounds: false,
    });

    // Populate initial plushies
    this.spawnInitialToys();

    // Physics Colliders
    this.physics.add.collider(this.toysGroup, this.floorPlatform);
    this.physics.add.collider(this.toysGroup, this.chuteBarrierWall);

    // Overlap with chute sensor
    this.physics.add.overlap(this.toysGroup, this.chuteSensor, (sensor, toyObj) => {
      this.handleToyReachedChute(toyObj as Phaser.Physics.Arcade.Sprite);
    });
  }

  private spawnInitialToys() {
    const textureKey = this.textures.exists('soccer_toy') ? 'soccer_toy' : 'toy_fallback';
    const toyCount = 8;
    const xStep = (this.PIT_MAX_X - this.PIT_MIN_X) / toyCount;

    for (let i = 0; i < toyCount; i++) {
      const x = this.PIT_MIN_X + 25 + i * xStep + Phaser.Math.Between(-15, 15);
      // Slight vertical stacking/pile variation
      const y = this.FLOOR_Y - 35 - (i % 2 === 0 ? 0 : 35) + Phaser.Math.Between(-10, 5);
      this.spawnSingleToy(x, y, textureKey);
    }
  }

  private spawnSingleToy(x: number, y: number, textureKey: string): Phaser.Physics.Arcade.Sprite {
    const toy = this.toysGroup.create(x, y, textureKey) as Phaser.Physics.Arcade.Sprite;
    
    // Scale down from high-res 1024x986 to cute plushie size (~84px)
    const targetScale = Phaser.Math.FloatBetween(0.082, 0.096);
    toy.setScale(targetScale);

    // Circular physics body matching ball bounds
    const bodyRadius = 40;
    toy.setCircle(bodyRadius, (toy.width - bodyRadius * 2) / 2, (toy.height - bodyRadius * 2) / 2);
    toy.setGravityY(500);
    toy.setAngularDrag(80);
    toy.setRotation(Phaser.Math.FloatBetween(-0.25, 0.25));

    // Toy metadata
    toy.setData('id', `toy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    toy.setData('name', 'Cute Soccer Buddy');
    toy.setData('score', 100);

    return toy;
  }

  private createClawMechanism() {
    // 1. Aim Guide Laser / Neon dotted beam
    this.aimGuideGraphics = this.add.graphics();

    // 2. Trolley Carriage on top gantry rail
    this.trolleySprite = this.add.graphics();
    this.drawTrolley();

    // 3. Dynamic High-Tensile Cable
    this.cableGraphics = this.add.graphics();

    // 4. Claw Bell Housing
    this.clawHousing = this.add.graphics();
    this.drawClawHousing();

    // 5. LED Indicator light on housing
    this.ledLight = this.add.graphics();
    this.updateLEDLight(0x10b981); // Emerald green for IDLE

    // 6. Articulated Left & Right Gripper Arms
    this.clawLeftArm = this.add.graphics();
    this.clawRightArm = this.add.graphics();
    this.drawClawArms();

    // Update initial layout
    this.updateClawDisplay();
  }

  private drawTrolley() {
    this.trolleySprite.clear();
    // Carriage body
    this.trolleySprite.fillStyle(0x1e293b, 1);
    this.trolleySprite.fillRoundedRect(-24, -14, 48, 28, 6);
    this.trolleySprite.lineStyle(2, 0x64748b, 1);
    this.trolleySprite.strokeRoundedRect(-24, -14, 48, 28, 6);

    // Wheels / Rollers
    this.trolleySprite.fillStyle(0x94a3b8, 1);
    this.trolleySprite.fillCircle(-16, -10, 5);
    this.trolleySprite.fillCircle(16, -10, 5);

    // Cable spool center
    this.trolleySprite.fillStyle(0xf59e0b, 1);
    this.trolleySprite.fillCircle(0, 4, 4);
  }

  private drawClawHousing() {
    this.clawHousing.clear();
    // Metal bell housing
    this.clawHousing.fillStyle(0x334155, 1);
    this.clawHousing.fillRoundedRect(-20, -15, 40, 30, 8);
    this.clawHousing.lineStyle(2, 0x94a3b8, 1);
    this.clawHousing.strokeRoundedRect(-20, -15, 40, 30, 8);

    // Chrome top ring
    this.clawHousing.fillStyle(0xcfd8dc, 1);
    this.clawHousing.fillCircle(0, -14, 6);
    this.clawHousing.lineStyle(2, 0x475569, 1);
    this.clawHousing.strokeCircle(0, -14, 6);

    // Joint hinge bolts for arms
    this.clawHousing.fillStyle(0x64748b, 1);
    this.clawHousing.fillCircle(-14, 10, 4);
    this.clawHousing.fillCircle(14, 10, 4);
  }

  private updateLEDLight(color: number) {
    this.ledLight.clear();
    // Glowing halo
    this.ledLight.fillStyle(color, 0.4);
    this.ledLight.fillCircle(0, 0, 9);
    // Core bulb
    this.ledLight.fillStyle(color, 1);
    this.ledLight.fillCircle(0, 0, 5);
    // Specular highlight
    this.ledLight.fillStyle(0xffffff, 0.9);
    this.ledLight.fillCircle(-1.5, -1.5, 1.5);
  }

  private drawClawArms() {
    // Left Arm: drawn relative to its hinge pivot (0, 0)
    this.clawLeftArm.clear();
    this.clawLeftArm.lineStyle(6, 0x94a3b8, 1);
    this.clawLeftArm.beginPath();
    this.clawLeftArm.moveTo(0, 0);
    this.clawLeftArm.lineTo(-14, 25);
    this.clawLeftArm.lineTo(-8, 48);
    this.clawLeftArm.lineTo(6, 54);
    this.clawLeftArm.strokePath();

    // Rubberized grip tip
    this.clawLeftArm.fillStyle(0xf43f5e, 1);
    this.clawLeftArm.fillCircle(6, 54, 4);

    // Right Arm: drawn relative to its hinge pivot (0, 0)
    this.clawRightArm.clear();
    this.clawRightArm.lineStyle(6, 0x94a3b8, 1);
    this.clawRightArm.beginPath();
    this.clawRightArm.moveTo(0, 0);
    this.clawRightArm.lineTo(14, 25);
    this.clawRightArm.lineTo(8, 48);
    this.clawRightArm.lineTo(-6, 54);
    this.clawRightArm.strokePath();

    // Rubberized grip tip
    this.clawRightArm.fillStyle(0xf43f5e, 1);
    this.clawRightArm.fillCircle(-6, 54, 4);
  }

  private updateClawDisplay() {
    // Position Trolley at top
    this.trolleySprite.setPosition(this.clawX, this.GANTRY_Y);

    // Cable line from trolley to housing
    this.cableGraphics.clear();
    this.cableGraphics.lineStyle(3, 0x94a3b8, 0.9);
    this.cableGraphics.lineBetween(this.clawX, this.GANTRY_Y + 10, this.clawX, this.clawY - 14);

    // Claw Housing & LED
    this.clawHousing.setPosition(this.clawX, this.clawY);
    this.ledLight.setPosition(this.clawX, this.clawY);

    // Arm Hinges
    const hingeLeftX = this.clawX - 14;
    const hingeRightX = this.clawX + 14;
    const hingeY = this.clawY + 10;

    this.clawLeftArm.setPosition(hingeLeftX, hingeY);
    this.clawLeftArm.setAngle(this.leftArmAngle);

    this.clawRightArm.setPosition(hingeRightX, hingeY);
    this.clawRightArm.setAngle(this.rightArmAngle);

    // Update Aim Guide Beam
    this.aimGuideGraphics.clear();
    if (this.currentState === 'IDLE' || this.currentState === 'MOVING_LEFT' || this.currentState === 'MOVING_RIGHT') {
      this.aimGuideGraphics.lineStyle(1.5, 0x38bdf8, 0.35);
      // Dotted beam from claw tip down to floor
      const startY = this.clawY + 55;
      const endY = this.FLOOR_Y;
      for (let y = startY; y < endY; y += 12) {
        this.aimGuideGraphics.lineBetween(this.clawX, y, this.clawX, Math.min(y + 6, endY));
      }

      // Small target reticle on floor
      this.aimGuideGraphics.lineStyle(2, 0x38bdf8, 0.5);
      this.aimGuideGraphics.strokeCircle(this.clawX, this.FLOOR_Y, 8);
    }
  }

  private createGlassOverlay() {
    // Glass sheen reflections for modern arcade enclosure feel
    this.glassSheenGraphics = this.add.graphics();
    this.glassSheenGraphics.fillStyle(0xffffff, 0.04);
    // Diagonal sheen 1
    this.glassSheenGraphics.beginPath();
    this.glassSheenGraphics.moveTo(120, 0);
    this.glassSheenGraphics.lineTo(240, 0);
    this.glassSheenGraphics.lineTo(0, 480);
    this.glassSheenGraphics.lineTo(0, 240);
    this.glassSheenGraphics.closePath();
    this.glassSheenGraphics.fillPath();

    // Diagonal sheen 2
    this.glassSheenGraphics.beginPath();
    this.glassSheenGraphics.moveTo(380, 0);
    this.glassSheenGraphics.lineTo(430, 0);
    this.glassSheenGraphics.lineTo(130, 600);
    this.glassSheenGraphics.lineTo(80, 600);
    this.glassSheenGraphics.closePath();
    this.glassSheenGraphics.fillPath();

    // Machine Outer Cabinet Bezel Border
    const borderGfx = this.add.graphics();
    borderGfx.lineStyle(8, 0x312e81, 1);
    borderGfx.strokeRoundedRect(4, 4, this.CANVAS_WIDTH - 8, this.CANVAS_HEIGHT - 8, 12);
    borderGfx.lineStyle(2, 0x818cf8, 0.8);
    borderGfx.strokeRoundedRect(8, 8, this.CANVAS_WIDTH - 16, this.CANVAS_HEIGHT - 16, 10);
  }

  private setupInputHandlers() {
    if (!this.input.keyboard) return;

    // Arrow keys
    this.cursors = this.input.keyboard.createCursorKeys();
    // A/D/S keys for alternative layout
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    // Drop triggers on Space or Down Arrow or Key S
    this.input.keyboard.on('keydown-SPACE', () => {
      this.triggerDrop();
    });
    this.input.keyboard.on('keydown-DOWN', () => {
      this.triggerDrop();
    });
    this.input.keyboard.on('keydown-S', () => {
      this.triggerDrop();
    });

    // Pointer (Mouse / Touch / Smartboard)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.currentState === 'IDLE' || this.currentState === 'MOVING_LEFT' || this.currentState === 'MOVING_RIGHT') {
        // Tapping in bottom chute region triggers drop, otherwise sets target X
        if (pointer.y > 450 && Math.abs(pointer.x - this.clawX) < 40) {
          this.triggerDrop();
        } else {
          this.targetPointerX = Phaser.Math.Clamp(pointer.x, this.PIT_MIN_X, this.PIT_MAX_X);
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && (this.currentState === 'IDLE' || this.currentState === 'MOVING_LEFT' || this.currentState === 'MOVING_RIGHT')) {
        this.targetPointerX = Phaser.Math.Clamp(pointer.x, this.PIT_MIN_X, this.PIT_MAX_X);
      }
    });

    this.input.on('pointerup', () => {
      this.targetPointerX = null;
    });
  }

  // External Control Methods callable from React
  public moveClawLeft() {
    this.moveDirection = -1;
    this.targetPointerX = null;
  }

  public moveClawRight() {
    this.moveDirection = 1;
    this.targetPointerX = null;
  }

  public stopClaw() {
    this.moveDirection = 0;
    this.targetPointerX = null;
  }

  public triggerDrop(): boolean {
    if (this.currentState !== 'IDLE' && this.currentState !== 'MOVING_LEFT' && this.currentState !== 'MOVING_RIGHT') {
      return false; // Busy with drop/grab cycle
    }

    this.moveDirection = 0;
    this.targetPointerX = null;
    this.startDropSequence();
    return true;
  }

  public resetToys() {
    // Clear existing toys and respawn
    this.toysGroup.clear(true, true);
    this.spawnInitialToys();
    this.updateState('IDLE', 'Toys reshuffled and ready!');
  }

  public update(time: number, delta: number) {
    const dt = delta / 1000;

    // Handle horizontal claw movement during IDLE/MOVING states
    if (this.currentState === 'IDLE' || this.currentState === 'MOVING_LEFT' || this.currentState === 'MOVING_RIGHT') {
      let isMoving = false;

      // 1. Check Keyboard Inputs
      if (this.cursors.left.isDown || this.keyA.isDown) {
        this.clawX = Math.max(this.PIT_MIN_X, this.clawX - this.clawSpeed * dt);
        isMoving = true;
        this.callbacks.onClawMove?.();
      } else if (this.cursors.right.isDown || this.keyD.isDown) {
        this.clawX = Math.min(this.PIT_MAX_X, this.clawX + this.clawSpeed * dt);
        isMoving = true;
        this.callbacks.onClawMove?.();
      } 
      // 2. Check UI button hold direction
      else if (this.moveDirection !== 0) {
        this.clawX = Phaser.Math.Clamp(
          this.clawX + this.moveDirection * this.clawSpeed * dt,
          this.PIT_MIN_X,
          this.PIT_MAX_X
        );
        isMoving = true;
        this.callbacks.onClawMove?.();
      }
      // 3. Check Pointer / Touch drag destination
      else if (this.targetPointerX !== null) {
        const diff = this.targetPointerX - this.clawX;
        if (Math.abs(diff) > 4) {
          const step = Math.sign(diff) * Math.min(Math.abs(diff), this.clawSpeed * dt);
          this.clawX = Phaser.Math.Clamp(this.clawX + step, this.PIT_MIN_X, this.PIT_MAX_X);
          isMoving = true;
          this.callbacks.onClawMove?.();
        } else {
          this.targetPointerX = null;
        }
      }

      if (isMoving) {
        const nextState = this.moveDirection < 0 || this.cursors.left.isDown || this.keyA.isDown ? 'MOVING_LEFT' : 'MOVING_RIGHT';
        if (this.currentState !== nextState) {
          this.updateState(nextState, 'Positioning claw...');
        }
      } else if (this.currentState !== 'IDLE') {
        this.updateState('IDLE', 'Claw Ready! Press Drop to grab a plushie.');
      }
    }

    // Keep grabbed toy anchored to claw tip during lift and return
    if (this.grabbedToy) {
      this.grabbedToy.setPosition(this.clawX, this.clawY + 45);
      this.grabbedToy.setVelocity(0, 0);
    }

    // Re-render claw geometry
    this.updateClawDisplay();
  }

  private updateState(newState: ClawState, message: string) {
    this.currentState = newState;
    this.callbacks.onStateChange?.(newState, message);

    // Update LED color based on state
    switch (newState) {
      case 'IDLE':
        this.updateLEDLight(0x10b981); // Emerald
        break;
      case 'MOVING_LEFT':
      case 'MOVING_RIGHT':
        this.updateLEDLight(0x06b6d4); // Cyan
        break;
      case 'DESCENDING':
        this.updateLEDLight(0xf59e0b); // Amber
        break;
      case 'GRABBING':
        this.updateLEDLight(0x8b5cf6); // Purple
        break;
      case 'ASCENDING':
      case 'RETURNING':
        this.updateLEDLight(0xec4899); // Pink
        break;
      case 'DROPPING':
        this.updateLEDLight(0x22c55e); // Bright green
        break;
    }
  }

  // --- DROP & GRAB CYCLE ---
  private startDropSequence() {
    this.updateState('DESCENDING', 'Claw lowering... Hold your breath!');
    this.callbacks.onClawDrop?.();

    // Ensure claw arms are open wide when descending
    this.leftArmAngle = -32;
    this.rightArmAngle = 32;

    // Determine target drop depth: stop slightly above floor or top of pile
    const targetY = this.FLOOR_Y - 50;

    // Smooth descent tween
    this.tweens.add({
      targets: this,
      clawY: targetY,
      duration: 1200,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.executeClawGrip();
      },
    });
  }

  private executeClawGrip() {
    this.updateState('GRABBING', 'Closing grips... Clamping plushie!');
    this.callbacks.onClawGrab?.();

    // Animate claw arms closing
    this.tweens.add({
      targets: this,
      leftArmAngle: 12,  // Closed angle
      rightArmAngle: -12, // Closed angle
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Detect if any toy is within grab range
        this.detectAndCaptureToy();
        // Ascend claw back to ceiling
        this.startAscentSequence();
      },
    });
  }

  private detectAndCaptureToy() {
    const grabTipX = this.clawX;
    const grabTipY = this.clawY + 45;

    // Standard realistic grab threshold
    const grabRadius = 65;

    let closestToy: Phaser.Physics.Arcade.Sprite | null = null;
    let minDistance = Infinity;

    for (const child of this.toysGroup.getChildren()) {
      const toy = child as Phaser.Physics.Arcade.Sprite;
      if (!toy.active) continue;

      const dist = Phaser.Math.Distance.Between(grabTipX, grabTipY, toy.x, toy.y);
      if (dist < grabRadius && dist < minDistance) {
        minDistance = dist;
        closestToy = toy;
      }
    }

    if (closestToy) {
      this.grabbedToy = closestToy;
      // Temporarily disable physics gravity while locked in claw
      if (closestToy.body) {
        (closestToy.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      }
    }
  }

  private startAscentSequence() {
    const hasToy = this.grabbedToy !== null;
    this.updateState('ASCENDING', hasToy ? 'Got one! Hoisting plushie...' : 'Claw returning empty...');
    this.callbacks.onClawRise?.();

    // Authentic claw machine slip mechanic:
    // Approximately 50% of caught plushies slip loose during the ascent
    const willSlipMidway = hasToy && Math.random() < 0.52;
    const slipTriggerY = willSlipMidway ? Phaser.Math.Between(260, 360) : -1;
    let hasSlipped = false;

    // Smooth ascent tween
    this.tweens.add({
      targets: this,
      clawY: this.HOME_Y,
      duration: 1300,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        // If destined to slip, loosen grip when reaching slip altitude
        if (willSlipMidway && !hasSlipped && this.clawY <= slipTriggerY && this.grabbedToy) {
          hasSlipped = true;
          this.triggerGripSlip();
        }
      },
      onComplete: () => {
        if (this.grabbedToy) {
          this.startReturnToChuteSequence();
        } else {
          // Empty claw returns to IDLE
          this.openClawGrips();
          this.updateState('IDLE', hasSlipped ? 'The claw grip slipped! Try again! 💨' : 'Missed! Line up your claw and try again.');
        }
      },
    });
  }

  private triggerGripSlip() {
    if (!this.grabbedToy) return;

    // Claw prongs jitter and loosen
    this.tweens.add({
      targets: this,
      leftArmAngle: -22,
      rightArmAngle: 22,
      duration: 180,
      ease: 'Quad.easeOut',
    });

    const droppedToy = this.grabbedToy;
    this.grabbedToy = null;

    if (droppedToy.body) {
      const body = droppedToy.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = true;
      body.setVelocity(Phaser.Math.Between(-35, 35), 90);
      body.setAngularVelocity(Phaser.Math.Between(-140, 140));
    }

    this.callbacks.onClawSlip?.();
    this.updateState('ASCENDING', 'Oops! The claw grip slipped! 💨');
  }

  private startReturnToChuteSequence() {
    this.updateState('RETURNING', 'Plushie secured! Moving to Prize Chute...');

    // Smooth horizontal transport to chute position
    this.tweens.add({
      targets: this,
      clawX: this.CHUTE_X,
      duration: 1500,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.dropToyIntoChute();
      },
    });
  }

  private dropToyIntoChute() {
    this.updateState('DROPPING', 'Opening claw! Delivering prize! 🎁');

    // 1. Immediately animate claw arms opening wide
    this.tweens.add({
      targets: this,
      leftArmAngle: -40,
      rightArmAngle: 40,
      duration: 250,
      ease: 'Back.easeOut',
    });

    // 2. Release toy right as prongs part so player sees it drop out of the open claws
    this.time.delayedCall(80, () => {
      if (this.grabbedToy) {
        const droppedToy = this.grabbedToy;
        this.grabbedToy = null;

        if (droppedToy.body) {
          const body = droppedToy.body as Phaser.Physics.Arcade.Body;
          body.allowGravity = true;
          body.setVelocity(Phaser.Math.Between(-15, 15), 140);
          body.setAngularVelocity(Phaser.Math.Between(-80, 80));
        }
      }
    });

    // 3. Return claw back to center after dropping
    this.time.delayedCall(1100, () => {
      this.tweens.add({
        targets: this,
        clawX: this.HOME_X,
        duration: 1200,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          this.updateState('IDLE', 'Prize delivered! Press Drop to play again.');
        },
      });
    });
  }

  private openClawGrips(onDone?: () => void) {
    this.tweens.add({
      targets: this,
      leftArmAngle: -30,
      rightArmAngle: 30,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        onDone?.();
      },
    });
  }

  private handleToyReachedChute(toy: Phaser.Physics.Arcade.Sprite) {
    if (!toy.active) return;
    toy.setActive(false);

    // Particle celebration burst at the chute
    this.createWinParticles(this.CHUTE_X, 500);

    // Fade and shrink toy as it falls down the chute hole
    this.tweens.add({
      targets: toy,
      alpha: 0,
      scale: 0.02,
      y: 620,
      duration: 600,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        toy.destroy();

        // Notify React of successful prize win!
        const prizeData: PrizeItem = {
          id: `prize_${Date.now()}`,
          name: 'Soccer Buddy Plushie',
          score: 100,
          image: '/assets/soccer_toy.png',
          timestamp: Date.now(),
          rarity: 'Legendary',
        };
        this.callbacks.onPrizeWon?.(prizeData);

        // Respawn a new toy into the pit with parachute bounce after 1.8 seconds
        this.time.delayedCall(1800, () => {
          const textureKey = this.textures.exists('soccer_toy') ? 'soccer_toy' : 'toy_fallback';
          const spawnX = Phaser.Math.Between(this.PIT_MIN_X + 30, this.PIT_MAX_X - 30);
          this.spawnSingleToy(spawnX, 150, textureKey);
        });
      },
    });
  }

  private createWinParticles(x: number, y: number) {
    // Star and sparkle particle emitter
    const particles = this.add.particles(x, y, 'sparkle', {
      speed: { min: 80, max: 220 },
      angle: { min: 210, max: 330 },
      scale: { start: 1, end: 0 },
      lifespan: 1000,
      gravityY: 200,
      quantity: 18,
      blendMode: 'ADD',
    });

    this.time.delayedCall(1200, () => {
      particles.destroy();
    });
  }
}
