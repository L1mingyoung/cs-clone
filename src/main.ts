import * as THREE from "three";

// Game state
interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  health: number;
  armor: number;
  kills: number;
  deaths: number;
}

// Weapon interface
interface Weapon {
  name: string;
  damage: number;
  fireRate: number;
  magazineSize: number;
  currentAmmo: number;
  reserveAmmo: number;
  reloadTime: number;
  isReloading: boolean;
  lastFireTime: number;
}

// Enemy interface
interface Enemy {
  mesh: THREE.Group;
  health: number;
  speed: number;
  isAlive: boolean;
  target: THREE.Vector3;
  deathAnimation?: {
    startTime: number;
    duration: number;
    startRotation: THREE.Euler;
  };
}

class CS16Clone {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Player
  private playerVelocity: THREE.Vector3;
  private playerDirection: THREE.Vector3;
  private moveSpeed: number = 5;
  private sprintSpeed: number = 8;
  private isSprinting: boolean = false;
  private canJump: boolean = true;
  private playerHeight: number = 1.7;

  // Controls
  private keys: { [key: string]: boolean } = {};
  private yaw: number = 0;
  private pitch: number = 0;
  private mouseMovementX: number = 0;
  private mouseMovementY: number = 0;
  private sensitivity: number = 0.001;

  // Game
  private gameState: GameState;
  private weapons: Weapon[] = [];
  private currentWeaponIndex: number = 0;
  private enemies: Enemy[] = [];

  // Map
  private mapObjects: THREE.Mesh[] = [];

  // Raycaster for shooting
  private raycaster: THREE.Raycaster;

  // Clock for delta time
  private clock: THREE.Clock;

  // Weapon model
  private weaponModel: THREE.Group;
  private cameraAdded: boolean = false;
  private weaponAnimation: {
    reload: boolean;
    reloadStartTime: number;
    fire: boolean;
    fireStartTime: number;
  } = { reload: false, reloadStartTime: 0, fire: false, fireStartTime: 0 };

  // AWP scope
  private isScoped: boolean = false;
  private defaultFOV: number = 75;
  private scopedFOV: number = 25;
  private isFiring: boolean = false;

  // Recoil system
  private recoilX: number = 0;
  private recoilY: number = 0;
  private recoilRecovery: number = 5;

  constructor() {
    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, this.playerHeight, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document
      .getElementById("game-container")
      ?.prepend(this.renderer.domElement);

    // Initialize game state
    this.gameState = {
      isPlaying: false,
      isPaused: false,
      health: 100,
      armor: 0,
      kills: 0,
      deaths: 0,
    };

    // Initialize player
    this.playerVelocity = new THREE.Vector3();
    this.playerDirection = new THREE.Vector3();

    // Initialize raycaster
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 1000;

    // Initialize clock
    this.clock = new THREE.Clock();

    // Initialize weapon model
    this.weaponModel = new THREE.Group();

    // Setup
    this.initWeapons();
    this.createWeaponModel();
    this.createMap();
    this.createLighting();
    this.spawnEnemies(5);
    this.setupEventListeners();

    // Start render loop
    this.animate();
  }

  private initWeapons(): void {
    this.weapons = [
      {
        name: "AK-47",
        damage: 28,
        fireRate: 100,
        magazineSize: 30,
        currentAmmo: 30,
        reserveAmmo: 90,
        reloadTime: 2.5,
        isReloading: false,
        lastFireTime: 0,
      },
      {
        name: "M4A1",
        damage: 23,
        fireRate: 90,
        magazineSize: 30,
        currentAmmo: 30,
        reserveAmmo: 90,
        reloadTime: 2.3,
        isReloading: false,
        lastFireTime: 0,
      },
      {
        name: "AWP",
        damage: 115,
        fireRate: 1500,
        magazineSize: 10,
        currentAmmo: 10,
        reserveAmmo: 30,
        reloadTime: 3.5,
        isReloading: false,
        lastFireTime: 0,
      },
    ];
  }

  private createWeaponModel(): void {
    // Clear existing weapon
    this.weaponModel.clear();

    const weaponType = this.currentWeaponIndex;

    // Create weapon based on type
    if (weaponType === 0) {
      // AK-47
      this.createAK47();
    } else {
      // M4A1
      this.createM4A1();
    }

    // Position weapon relative to camera
    this.weaponModel.position.set(0.3, -0.2, -0.5);
    this.weaponModel.rotation.set(0, Math.PI, 0);

    // Only add weapon model to camera once
    if (!this.cameraAdded) {
      this.camera.add(this.weaponModel);
      this.scene.add(this.camera);
      this.cameraAdded = true;
    }
  }

  private createAK47(): void {
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.2,
    });

    // Main body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.6),
      metalMaterial,
    );
    body.position.z = 0.3;
    this.weaponModel.add(body);

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, 0.4, 8),
      darkMetal,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.8);
    this.weaponModel.add(barrel);

    // Magazine
    const magazine = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.15, 0.06),
      metalMaterial,
    );
    magazine.position.set(0, -0.1, 0.2);
    magazine.rotation.x = -0.2;
    this.weaponModel.add(magazine);

    // Stock
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.1, 0.25),
      woodMaterial,
    );
    stock.position.set(0, 0, -0.15);
    this.weaponModel.add(stock);

    // Grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.04),
      woodMaterial,
    );
    grip.position.set(0, -0.1, 0.05);
    grip.rotation.x = 0.3;
    this.weaponModel.add(grip);

    // Front sight
    const frontSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.03, 0.01),
      metalMaterial,
    );
    frontSight.position.set(0, 0.06, 0.7);
    this.weaponModel.add(frontSight);

    // Rear sight
    const rearSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.04, 0.02),
      metalMaterial,
    );
    rearSight.position.set(0, 0.05, 0.15);
    this.weaponModel.add(rearSight);
  }

  private createM4A1(): void {
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const plasticMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.7,
    });

    // Main body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.07, 0.55),
      metalMaterial,
    );
    body.position.z = 0.25;
    this.weaponModel.add(body);

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.018, 0.35, 8),
      darkMetal,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, 0.75);
    this.weaponModel.add(barrel);

    // Magazine
    const magazine = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.12, 0.05),
      plasticMaterial,
    );
    magazine.position.set(0, -0.08, 0.15);
    magazine.rotation.x = -0.15;
    this.weaponModel.add(magazine);

    // Stock
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.08, 0.3),
      plasticMaterial,
    );
    stock.position.set(0, 0, -0.2);
    this.weaponModel.add(stock);

    // Grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.1, 0.035),
      plasticMaterial,
    );
    grip.position.set(0, -0.08, 0);
    grip.rotation.x = 0.25;
    this.weaponModel.add(grip);

    // Handguard
    const handguard = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.2),
      metalMaterial,
    );
    handguard.position.set(0, 0.01, 0.55);
    this.weaponModel.add(handguard);

    // Front sight
    const frontSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.025, 0.008),
      metalMaterial,
    );
    frontSight.position.set(0, 0.05, 0.65);
    this.weaponModel.add(frontSight);

    // Rear sight
    const rearSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.035, 0.015),
      metalMaterial,
    );
    rearSight.position.set(0, 0.045, 0.1);
    this.weaponModel.add(rearSight);

    // Rail
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.01, 0.3),
      darkMetal,
    );
    rail.position.set(0, 0.045, 0.35);
    this.weaponModel.add(rail);
  }

  private updateWeaponModel(): void {
    this.weaponModel.clear();
    if (this.currentWeaponIndex === 0) {
      this.createAK47();
    } else if (this.currentWeaponIndex === 1) {
      this.createM4A1();
    } else if (this.currentWeaponIndex === 2) {
      this.createAWP();
    }
    this.weaponModel.position.set(0.3, -0.2, -0.5);
    this.weaponModel.rotation.set(0, Math.PI, 0);
  }

  private createAWP(): void {
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const darkGreen = new THREE.MeshStandardMaterial({
      color: 0x1a3a1a,
      metalness: 0.3,
      roughness: 0.7,
    });
    const scopeGlass = new THREE.MeshStandardMaterial({
      color: 0x4444ff,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.3,
    });

    // Main body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.9),
      darkGreen,
    );
    body.position.z = 0.2;
    this.weaponModel.add(body);

    // Barrel (longer than other weapons)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.015, 0.6, 8),
      metalMaterial,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.85);
    this.weaponModel.add(barrel);

    // Scope body
    const scopeBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.2, 16),
      metalMaterial,
    );
    scopeBody.rotation.x = Math.PI / 2;
    scopeBody.position.set(0, 0.12, 0.2);
    this.weaponModel.add(scopeBody);

    // Scope front lens
    const scopeFront = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 16),
      scopeGlass,
    );
    scopeFront.position.set(0, 0.12, 0.31);
    this.weaponModel.add(scopeFront);

    // Scope rear lens
    const scopeRear = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 16),
      scopeGlass,
    );
    scopeRear.position.set(0, 0.12, 0.09);
    scopeRear.rotation.y = Math.PI;
    this.weaponModel.add(scopeRear);

    // Magazine
    const magazine = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.06),
      darkGreen,
    );
    magazine.position.set(0, -0.1, 0.1);
    this.weaponModel.add(magazine);

    // Stock
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.1, 0.35),
      darkGreen,
    );
    stock.position.set(0, 0, -0.35);
    this.weaponModel.add(stock);

    // Grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.04),
      darkGreen,
    );
    grip.position.set(0, -0.1, -0.05);
    grip.rotation.x = 0.3;
    this.weaponModel.add(grip);

    // Bipod legs
    const bipodMaterial = metalMaterial;
    const bipodLeg1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.15, 0.01),
      bipodMaterial,
    );
    bipodLeg1.position.set(0.03, -0.2, 0.6);
    bipodLeg1.rotation.z = 0.3;
    this.weaponModel.add(bipodLeg1);

    const bipodLeg2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.15, 0.01),
      bipodMaterial,
    );
    bipodLeg2.position.set(-0.03, -0.2, 0.6);
    bipodLeg2.rotation.z = -0.3;
    this.weaponModel.add(bipodLeg2);

    // Bolt handle
    const bolt = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.02, 0.06),
      metalMaterial,
    );
    bolt.position.set(0.04, 0.02, 0.15);
    this.weaponModel.add(bolt);
  }

  private createMap(): void {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.mapObjects.push(floor);

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.6,
    });

    // Create walls around the map
    const wallPositions = [
      { pos: [0, 5, -50], size: [100, 10, 1] as [number, number, number] },
      { pos: [0, 5, 50], size: [100, 10, 1] as [number, number, number] },
      { pos: [-50, 5, 0], size: [1, 10, 100] as [number, number, number] },
      { pos: [50, 5, 0], size: [1, 10, 100] as [number, number, number] },
    ];

    wallPositions.forEach((wall) => {
      const geometry = new THREE.BoxGeometry(...wall.size);
      const mesh = new THREE.Mesh(geometry, wallMaterial);
      mesh.position.set(wall.pos[0], wall.pos[1], wall.pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.mapObjects.push(mesh);
    });

    // Create cover objects (boxes, crates)
    const crateMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.9,
    });

    const cratePositions = [
      [10, 1, 10],
      [-10, 1, 10],
      [10, 1, -10],
      [-10, 1, -10],
      [20, 1, 0],
      [-20, 1, 0],
      [0, 1, 20],
      [0, 1, -20],
      [15, 1, -15],
      [-15, 1, 15],
    ];

    cratePositions.forEach((pos) => {
      const size = 2 + Math.random() * 2;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const mesh = new THREE.Mesh(geometry, crateMaterial);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.mapObjects.push(mesh);
    });

    // Create some tall structures
    const structureMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.7,
    });

    const structurePositions = [
      [25, 5, 25],
      [-25, 5, 25],
      [25, 5, -25],
      [-25, 5, -25],
    ];

    structurePositions.forEach((pos) => {
      const geometry = new THREE.BoxGeometry(5, 10, 5);
      const mesh = new THREE.Mesh(geometry, structureMaterial);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.mapObjects.push(mesh);
    });
  }

  private createLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);
  }

  private spawnEnemies(count: number): void {
    for (let i = 0; i < count; i++) {
      this.createEnemy();
    }
  }

  private createEnemy(): void {
    const enemyGroup = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    body.castShadow = true;
    enemyGroup.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.7;
    head.castShadow = true;
    enemyGroup.add(head);

    // Random position
    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    enemyGroup.position.set(x, 0, z);

    this.scene.add(enemyGroup);

    const enemy: Enemy = {
      mesh: enemyGroup,
      health: 100,
      speed: 2 + Math.random() * 2,
      isAlive: true,
      target: new THREE.Vector3(),
    };

    this.enemies.push(enemy);
  }

  private setupEventListeners(): void {
    // Keyboard
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;

      if (this.gameState.isPlaying) {
        // P to pause/unpause
        if (e.code === "KeyP") {
          this.togglePause();
        }

        // Only process other inputs if not paused
        if (!this.gameState.isPaused) {
          // Reload
          if (e.code === "KeyR") {
            this.reload();
          }

          // Weapon switch
          if (e.code === "Digit1") {
            this.switchWeapon(0);
          }
          if (e.code === "Digit2") {
            this.switchWeapon(1);
          }
          if (e.code === "Digit3") {
            this.switchWeapon(2);
          }
        }
      }
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Mouse - accumulate movement
    document.addEventListener("mousemove", (e) => {
      if (
        this.gameState.isPlaying &&
        !this.gameState.isPaused &&
        document.pointerLockElement === this.renderer.domElement
      ) {
        // Only accumulate movement if pointer is locked to our canvas
        const movementX = typeof e.movementX === "number" ? e.movementX : 0;
        const movementY = typeof e.movementY === "number" ? e.movementY : 0;

        // Clamp movement values to prevent sudden jumps
        const maxMovement = 100;
        this.mouseMovementX += Math.max(
          -maxMovement,
          Math.min(maxMovement, movementX),
        );
        this.mouseMovementY += Math.max(
          -maxMovement,
          Math.min(maxMovement, movementY),
        );
      }
    });

    document.addEventListener("mousedown", (e) => {
      if (this.gameState.isPlaying) {
        if (e.button === 0) {
          // Left click - shoot
          this.isFiring = true;
          this.shoot();
        } else if (e.button === 2) {
          // Right click - scope toggle for AWP
          if (this.currentWeaponIndex === 2) {
            this.toggleScope();
          }
        }
      }
    });

    document.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.isFiring = false;
      }
    });

    // Prevent context menu on right click
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    // Pointer lock
    this.renderer.domElement.addEventListener("click", () => {
      if (this.gameState.isPlaying) {
        this.renderer.domElement.requestPointerLock();
      }
    });

    // Start button
    document.getElementById("start-btn")?.addEventListener("click", () => {
      this.startGame();
    });

    // Pause menu buttons
    document.getElementById("resume-btn")?.addEventListener("click", () => {
      this.togglePause();
    });

    document.getElementById("restart-btn")?.addEventListener("click", () => {
      this.restartGame();
    });

    // Resize
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private startGame(): void {
    this.gameState.isPlaying = true;
    this.gameState.isPaused = false;
    document.getElementById("instructions")?.classList.add("hidden");
    document.getElementById("pause-menu")?.classList.add("hidden");
    this.renderer.domElement.requestPointerLock();
  }

  private togglePause(): void {
    this.gameState.isPaused = !this.gameState.isPaused;
    const pauseMenu = document.getElementById("pause-menu");
    if (pauseMenu) {
      if (this.gameState.isPaused) {
        pauseMenu.classList.remove("hidden");
        document.exitPointerLock();
      } else {
        pauseMenu.classList.add("hidden");
        this.renderer.domElement.requestPointerLock();
      }
    }
  }

  private restartGame(): void {
    // Reset game state
    this.gameState.isPlaying = false;
    this.gameState.isPaused = false;
    this.gameState.health = 100;
    this.gameState.armor = 0;
    this.gameState.kills = 0;
    this.gameState.deaths = 0;

    // Reset player
    this.camera.position.set(0, this.playerHeight, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.mouseMovementX = 0;
    this.mouseMovementY = 0;

    // Reset weapons
    this.weapons.forEach((weapon) => {
      weapon.currentAmmo = weapon.magazineSize;
      weapon.reserveAmmo = 90;
      weapon.isReloading = false;
    });
    this.currentWeaponIndex = 0;
    this.updateWeaponModel();

    // Reset enemies
    this.enemies.forEach((enemy) => {
      enemy.health = 100;
      enemy.isAlive = true;
      enemy.mesh.visible = true;
      enemy.mesh.position.set(
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 80,
      );
      enemy.deathAnimation = undefined;
      enemy.mesh.rotation.set(0, 0, 0);
    });

    // Update UI
    this.updateAmmoUI();
    this.updateWeaponNameUI();
    this.updateHealthUI();
    this.updateScoreUI();

    // Hide pause menu and show instructions
    document.getElementById("pause-menu")?.classList.add("hidden");
    document.getElementById("instructions")?.classList.remove("hidden");
  }

  private switchWeapon(index: number): void {
    if (index < this.weapons.length && index !== this.currentWeaponIndex) {
      // Exit scope when switching weapons
      if (this.isScoped) {
        this.toggleScope();
      }
      this.currentWeaponIndex = index;
      this.updateAmmoUI();
      this.updateWeaponNameUI();
      this.updateWeaponModel();
    }
  }

  private toggleScope(): void {
    this.isScoped = !this.isScoped;
    this.camera.fov = this.isScoped ? this.scopedFOV : this.defaultFOV;
    this.camera.updateProjectionMatrix();

    // Show/hide scope overlay
    const scopeOverlay = document.getElementById("scope-overlay");
    if (scopeOverlay) {
      scopeOverlay.classList.toggle("hidden", !this.isScoped);
    }

    // Hide/show crosshair when scoped
    const crosshair = document.getElementById("crosshair");
    if (crosshair) {
      crosshair.style.opacity = this.isScoped ? "0" : "1";
    }

    // Reduce sensitivity when scoped
    this.sensitivity = this.isScoped ? 0.0005 : 0.001;
  }

  private reload(): void {
    const weapon = this.weapons[this.currentWeaponIndex];
    if (
      weapon.isReloading ||
      weapon.currentAmmo === weapon.magazineSize ||
      weapon.reserveAmmo === 0
    ) {
      return;
    }

    weapon.isReloading = true;
    this.weaponAnimation.reload = true;
    this.weaponAnimation.reloadStartTime = this.clock.getElapsedTime();

    setTimeout(() => {
      const ammoNeeded = weapon.magazineSize - weapon.currentAmmo;
      const ammoToReload = Math.min(ammoNeeded, weapon.reserveAmmo);
      weapon.currentAmmo += ammoToReload;
      weapon.reserveAmmo -= ammoToReload;
      weapon.isReloading = false;
      this.weaponAnimation.reload = false;
      this.updateAmmoUI();
    }, weapon.reloadTime * 1000);
  }

  private shoot(): void {
    const weapon = this.weapons[this.currentWeaponIndex];
    const now = Date.now();

    if (
      weapon.isReloading ||
      now - weapon.lastFireTime < weapon.fireRate ||
      weapon.currentAmmo <= 0
    ) {
      if (weapon.currentAmmo <= 0) {
        this.reload();
      }
      return;
    }

    weapon.currentAmmo--;
    weapon.lastFireTime = now;
    this.weaponAnimation.fire = true;
    this.weaponAnimation.fireStartTime = this.clock.getElapsedTime();
    this.updateAmmoUI();

    // Apply recoil based on weapon
    if (this.currentWeaponIndex === 0) {
      // AK-47 - very low recoil
      this.recoilY += 0.002;
      this.recoilX += (Math.random() - 0.5) * 0.001;
    } else if (this.currentWeaponIndex === 1) {
      // M4A1 - minimal recoil
      this.recoilY += 0.0015;
      this.recoilX += (Math.random() - 0.5) * 0.0008;
    } else if (this.currentWeaponIndex === 2) {
      // AWP - no recoil (sniper should be stable)
      this.recoilY += 0;
      this.recoilX += 0;
    }

    // Raycast from camera
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // Check enemy hits
    const enemyMeshes = this.enemies
      .filter((e) => e.isAlive)
      .map((e) => e.mesh);
    const intersects = this.raycaster.intersectObjects(enemyMeshes, true);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      let hitEnemy: Enemy | undefined;

      // Find which enemy was hit
      for (const enemy of this.enemies) {
        if (enemy.isAlive && enemy.mesh.getObjectById(hitObject.id)) {
          hitEnemy = enemy;
          break;
        }
      }

      if (hitEnemy) {
        const isHeadshot = hitObject.position.y > 1.5;
        const damage = isHeadshot ? weapon.damage * 4 : weapon.damage;
        hitEnemy.health -= damage;

        if (hitEnemy.health <= 0) {
          this.killEnemy(hitEnemy, isHeadshot);
        }
      }
    }

    // Muzzle flash effect
    this.showMuzzleFlash();
  }

  private showMuzzleFlash(): void {
    // 3D muzzle flash
    const flashGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.set(0, 0.02, 0.9);
    this.weaponModel.add(flash);
    setTimeout(() => {
      this.weaponModel.remove(flash);
    }, 50);

    // 2D muzzle flash overlay
    const flashOverlay = document.createElement("div");
    flashOverlay.style.cssText = `
      position: fixed;
      bottom: 30%;
      right: 35%;
      width: 50px;
      height: 50px;
      background: radial-gradient(circle, #ffff00 0%, #ff8800 50%, transparent 70%);
      pointer-events: none;
      z-index: 1000;
    `;
    document.body.appendChild(flashOverlay);
    setTimeout(() => flashOverlay.remove(), 50);
  }

  private killEnemy(enemy: Enemy, isHeadshot: boolean): void {
    enemy.isAlive = false;
    this.gameState.kills++;
    this.updateScoreUI();

    // Start death animation
    enemy.deathAnimation = {
      startTime: this.clock.getElapsedTime(),
      duration: 1.0,
      startRotation: enemy.mesh.rotation.clone(),
    };

    // Show kill icon (like CrossFire)
    const killIcon = document.getElementById("kill-icon");
    if (killIcon) {
      killIcon.classList.remove("show");
      void killIcon.offsetWidth;
      killIcon.classList.add("show");
    }

    // Show headshot icon if headshot
    if (isHeadshot) {
      const headshotIcon = document.getElementById("headshot-icon");
      if (headshotIcon) {
        headshotIcon.classList.remove("show");
        void headshotIcon.offsetWidth;
        headshotIcon.classList.add("show");
      }
    }

    // Add kill feed
    const killFeed = document.getElementById("kill-feed");
    if (killFeed) {
      const entry = document.createElement("div");
      entry.className = "kill-entry";
      entry.textContent = `击杀敌人${isHeadshot ? " (爆头!)" : ""}`;
      killFeed.appendChild(entry);
      setTimeout(() => entry.remove(), 3000);
    }

    // Respawn enemy after delay
    setTimeout(() => {
      enemy.health = 100;
      enemy.isAlive = true;
      enemy.mesh.visible = true;
      enemy.mesh.rotation.set(0, 0, 0);
      enemy.deathAnimation = undefined;
      enemy.mesh.position.set(
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 80,
      );
    }, 5000);
  }

  private updateEnemies(delta: number): void {
    this.enemies.forEach((enemy) => {
      // Handle death animation
      if (enemy.deathAnimation) {
        const currentTime = this.clock.getElapsedTime();
        const elapsed = currentTime - enemy.deathAnimation.startTime;
        const progress = Math.min(elapsed / enemy.deathAnimation.duration, 1);

        // Rotate enemy backwards (fall backwards)
        const targetRotationX = Math.PI / 2; // 90 degrees backwards
        enemy.mesh.rotation.x =
          enemy.deathAnimation.startRotation.x + targetRotationX * progress;

        // Move enemy down slightly as they fall
        const sinkAmount = progress * 0.5;
        enemy.mesh.position.y = -sinkAmount;

        // Hide enemy when animation completes
        if (progress >= 1) {
          enemy.mesh.visible = false;
        }
        return;
      }

      if (!enemy.isAlive) return;

      // Check distance to player
      const distance = enemy.mesh.position.distanceTo(this.camera.position);

      // If too close, stop moving and attack
      if (distance < 3) {
        this.takeDamage(10 * delta);
        enemy.mesh.lookAt(
          this.camera.position.x,
          this.camera.position.y,
          this.camera.position.z,
        );
        return;
      }

      // Move towards player only if not too close
      const direction = new THREE.Vector3();
      direction.subVectors(this.camera.position, enemy.mesh.position);
      direction.y = 0;
      direction.normalize();

      // Check collision with map objects
      const newPos = enemy.mesh.position
        .clone()
        .add(direction.multiplyScalar(enemy.speed * delta));
      let canMove = true;

      // Check collision with walls and obstacles
      this.mapObjects.forEach((obj) => {
        if (obj === this.mapObjects[0]) return;
        const box = new THREE.Box3().setFromObject(obj);
        if (box.containsPoint(new THREE.Vector3(newPos.x, 1, newPos.z))) {
          canMove = false;
        }
      });

      // Check collision with other enemies
      this.enemies.forEach((otherEnemy) => {
        if (otherEnemy === enemy || !otherEnemy.isAlive) return;
        const dist = newPos.distanceTo(otherEnemy.mesh.position);
        if (dist < 1.5) {
          canMove = false;
        }
      });

      if (canMove) {
        enemy.mesh.position.copy(newPos);
      }

      enemy.mesh.lookAt(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
      );
    });
  }

  private takeDamage(amount: number): void {
    if (this.gameState.armor > 0) {
      const armorDamage = Math.min(this.gameState.armor, amount * 0.66);
      this.gameState.armor -= armorDamage;
      amount -= armorDamage;
    }

    this.gameState.health -= amount;

    // Show damage overlay
    const overlay = document.getElementById("damage-overlay") as HTMLElement;
    overlay.style.opacity = "0.5";
    setTimeout(() => (overlay.style.opacity = "0"), 100);

    this.updateHealthUI();

    if (this.gameState.health <= 0) {
      this.playerDeath();
    }
  }

  private playerDeath(): void {
    this.gameState.deaths++;
    this.gameState.health = 100;
    this.gameState.armor = 0;
    this.camera.position.set(0, this.playerHeight, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.mouseMovementX = 0;
    this.mouseMovementY = 0;
    this.updateHealthUI();
    this.updateScoreUI();
  }

  private updatePlayerMovement(delta: number): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    // Store original position for validation
    const originalPosition = this.camera.position.clone();

    // Apply accumulated mouse movement
    if (this.mouseMovementX !== 0 || this.mouseMovementY !== 0) {
      this.yaw -= this.mouseMovementX * this.sensitivity;
      this.pitch -= this.mouseMovementY * this.sensitivity;
      this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
      this.mouseMovementX = 0;
      this.mouseMovementY = 0;
    }

    // Apply recoil
    if (this.recoilX !== 0 || this.recoilY !== 0) {
      this.yaw += this.recoilX;
      this.pitch += this.recoilY;
      this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

      // Recover recoil
      this.recoilX *= 0.9;
      this.recoilY *= 0.9;

      if (Math.abs(this.recoilX) < 0.001) this.recoilX = 0;
      if (Math.abs(this.recoilY) < 0.001) this.recoilY = 0;
    }

    // Normalize yaw to prevent accumulation issues
    while (this.yaw > Math.PI) this.yaw -= 2 * Math.PI;
    while (this.yaw < -Math.PI) this.yaw += 2 * Math.PI;

    // Apply rotation using YXZ order to avoid gimbal lock
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    const speed = this.keys["ShiftLeft"] ? this.sprintSpeed : this.moveSpeed;

    // Calculate movement direction
    this.playerDirection.set(0, 0, 0);

    if (this.keys["KeyW"]) this.playerDirection.z -= 1;
    if (this.keys["KeyS"]) this.playerDirection.z += 1;
    if (this.keys["KeyA"]) this.playerDirection.x -= 1;
    if (this.keys["KeyD"]) this.playerDirection.x += 1;

    if (this.playerDirection.length() > 0) {
      this.playerDirection.normalize();

      // Get camera forward and right vectors
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      // Calculate movement
      const movement = new THREE.Vector3();
      movement.addScaledVector(forward, -this.playerDirection.z);
      movement.addScaledVector(right, this.playerDirection.x);
      movement.normalize();

      const newX = this.camera.position.x + movement.x * speed * delta;
      const newZ = this.camera.position.z + movement.z * speed * delta;

      // Keep player in bounds with margin
      const margin = 2;
      this.camera.position.x = Math.max(
        -48 + margin,
        Math.min(48 - margin, newX),
      );
      this.camera.position.z = Math.max(
        -48 + margin,
        Math.min(48 - margin, newZ),
      );
    }

    // Jump
    if (this.keys["Space"] && this.canJump) {
      this.playerVelocity.y = 8;
      this.canJump = false;
    }

    // Gravity
    this.playerVelocity.y -= 20 * delta;
    this.camera.position.y += this.playerVelocity.y * delta;

    // Ground check
    if (this.camera.position.y < this.playerHeight) {
      this.camera.position.y = this.playerHeight;
      this.playerVelocity.y = 0;
      this.canJump = true;
    }

    // Collision with map objects
    this.checkCollisions();

    // Validate player position - prevent unauthorized position changes
    const maxPositionChange = 50; // Maximum allowed position change per frame
    const positionChange = this.camera.position.distanceTo(originalPosition);

    if (positionChange > maxPositionChange) {
      // Position changed too much, revert to original
      this.camera.position.copy(originalPosition);
      console.warn(
        "Player position was unexpectedly changed and has been restored",
      );
    }

    // Ensure player stays at correct height when not jumping
    if (this.canJump && this.camera.position.y !== this.playerHeight) {
      this.camera.position.y = this.playerHeight;
    }
  }

  private checkCollisions(): void {
    const playerPos = this.camera.position;
    const playerRadius = 0.5;

    this.mapObjects.forEach((obj) => {
      if (obj === this.mapObjects[0]) return;

      const box = new THREE.Box3().setFromObject(obj);

      const closestPoint = new THREE.Vector3();
      box.clampPoint(playerPos, closestPoint);

      const distance = playerPos.distanceTo(closestPoint);
      if (distance < playerRadius) {
        const pushDir = new THREE.Vector3();
        pushDir.subVectors(playerPos, closestPoint).normalize();
        this.camera.position.add(
          pushDir.multiplyScalar(playerRadius - distance),
        );
      }
    });
  }

  private updateAmmoUI(): void {
    const weapon = this.weapons[this.currentWeaponIndex];
    document.getElementById("ammo-current")!.textContent =
      weapon.currentAmmo.toString();
    document.getElementById("ammo-reserve")!.textContent =
      weapon.reserveAmmo.toString();
  }

  private updateWeaponNameUI(): void {
    const weapon = this.weapons[this.currentWeaponIndex];
    document.getElementById("weapon-name")!.textContent = weapon.name;
  }

  private updateHealthUI(): void {
    document.getElementById("health-value")!.textContent = Math.max(
      0,
      Math.round(this.gameState.health),
    ).toString();
    document.getElementById("armor-value")!.textContent = Math.round(
      this.gameState.armor,
    ).toString();
  }

  private updateScoreUI(): void {
    document.getElementById("kills")!.textContent =
      this.gameState.kills.toString();
    document.getElementById("deaths")!.textContent =
      this.gameState.deaths.toString();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const currentTime = this.clock.getElapsedTime();

    if (this.gameState.isPlaying && !this.gameState.isPaused) {
      this.updatePlayerMovement(delta);
      this.updateEnemies(delta);
      this.updateWeaponAnimation(currentTime);

      // Auto-fire for AK-47 and M4A1 when holding mouse button
      if (this.isFiring && this.currentWeaponIndex !== 2) {
        this.shoot();
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateWeaponAnimation(currentTime: number): void {
    // Default weapon position
    const defaultPos = { x: 0.3, y: -0.2, z: -0.5 };
    const defaultRot = { x: 0, y: Math.PI, z: 0 };

    // Reload animation
    if (this.weaponAnimation.reload) {
      const reloadProgress =
        (currentTime - this.weaponAnimation.reloadStartTime) /
        this.weapons[this.currentWeaponIndex].reloadTime;

      if (reloadProgress < 1) {
        // Weapon moves down and rotates during reload
        const reloadPhase = Math.sin(reloadProgress * Math.PI);
        this.weaponModel.position.y = defaultPos.y - 0.3 * reloadPhase;
        this.weaponModel.rotation.x = defaultRot.x + 0.5 * reloadPhase;
      } else {
        // Reset to default position
        this.weaponModel.position.set(defaultPos.x, defaultPos.y, defaultPos.z);
        this.weaponModel.rotation.set(defaultRot.x, defaultRot.y, defaultRot.z);
      }
    }

    // Fire animation
    else if (this.weaponAnimation.fire) {
      const fireElapsed = currentTime - this.weaponAnimation.fireStartTime;
      const fireDuration = 0.1;

      if (fireElapsed < fireDuration) {
        // Weapon kicks back and up when firing
        const firePhase = 1 - fireElapsed / fireDuration;
        this.weaponModel.position.z = defaultPos.z + 0.05 * firePhase;
        this.weaponModel.position.y = defaultPos.y + 0.02 * firePhase;
        this.weaponModel.rotation.x = defaultRot.x - 0.1 * firePhase;
      } else {
        // Reset to default position
        this.weaponModel.position.set(defaultPos.x, defaultPos.y, defaultPos.z);
        this.weaponModel.rotation.set(defaultRot.x, defaultRot.y, defaultRot.z);
        this.weaponAnimation.fire = false;
      }
    }
  }
}

// Initialize game
new CS16Clone();
