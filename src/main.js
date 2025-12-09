import * as THREE from "three";

// ======================= BASIC THREE SETUP =======================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const PLAYER_HEIGHT = 2;

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// lights (for better materials)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(15, 25, 10);
scene.add(dirLight);

// ======================= GLOBAL GAME STATE =======================

let level = 1;
let mazeSize = 10;
let maze = [];
let walls = [];
let floor = null;
let goalMesh = null;

let playerCell = { x: 1, z: 1 };
let goalCell = { x: mazeSize - 2, z: mazeSize - 2 };

let yaw = 0; // camera horizontal angle
const MOVE_SPEED = 4; // units per second
const TURN_SPEED = 2.0; // radians per second

// zombies
const zombies = [];
const ZOMBIE_SPEED = 1.2;

// shooting
const raycaster = new THREE.Raycaster();

// auto path
let autoPath = [];
let autoPathActive = false;
const AUTO_SPEED = 3;

// timer & score
let startTime = performance.now();
let score = 0;

// DOM elements
const timeText = document.getElementById("timeText");
const levelText = document.getElementById("levelText");
const scoreText = document.getElementById("scoreText");
const messageEl = document.getElementById("message");

const minimapCanvas = document.getElementById("minimap");
const mctx = minimapCanvas.getContext("2d");

// ======================= INPUT HANDLING =======================

const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.key === "p" || e.key === "P") {
    toggleAutoPath();
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

document.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    shoot();
  }
});

// resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ======================= MAZE GENERATION =======================

// Depth-first backtracking maze
function generateMaze(size) {
  const grid = Array.from({ length: size }, () =>
    Array(size).fill(1) // 1 = wall, 0 = path
  );

  const stack = [];
  const start = { x: 1, z: 1 };
  grid[start.z][start.x] = 0;
  stack.push(start);

  const dirs = [
    { dx: 2, dz: 0 },
    { dx: -2, dz: 0 },
    { dx: 0, dz: 2 },
    { dx: 0, dz: -2 },
  ];

  function inBounds(x, z) {
    return x > 0 && x < size - 1 && z > 0 && z < size - 1;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    shuffle(dirs);

    let carved = false;

    for (const { dx, dz } of dirs) {
      const nx = current.x + dx;
      const nz = current.z + dz;
      if (inBounds(nx, nz) && grid[nz][nx] === 1) {
        const midX = current.x + dx / 2;
        const midZ = current.z + dz / 2;
        grid[midZ][midX] = 0;
        grid[nz][nx] = 0;
        stack.push({ x: nx, z: nz });
        carved = true;
        break;
      }
    }

    if (!carved) stack.pop();
  }

  grid[1][1] = 0;
  grid[size - 2][size - 2] = 0;

  return grid;
}

// ======================= BUILD / CLEAR LEVEL =======================

function clearLevelMeshes() {
  walls.forEach((w) => scene.remove(w));
  walls.length = 0;

  zombies.forEach((z) => scene.remove(z.mesh));
  zombies.length = 0;

  if (floor) {
    scene.remove(floor);
    floor = null;
  }
  if (goalMesh) {
    scene.remove(goalMesh);
    goalMesh = null;
  }
}

function buildLevel() {
  clearLevelMeshes();

  // increase difficulty
  mazeSize = 10 + (level - 1) * 2;
  if (mazeSize > 20) mazeSize = 20;

  maze = generateMaze(mazeSize);
  playerCell = { x: 1, z: 1 };
  goalCell = { x: mazeSize - 2, z: mazeSize - 2 };

  // floor (better material)
  const floorGeo = new THREE.PlaneGeometry(mazeSize, mazeSize);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x101c10,
    metalness: 0.2,
    roughness: 0.8,
  });
  floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(mazeSize / 2 - 0.5, 0, mazeSize / 2 - 0.5);
  floor.receiveShadow = true;
  scene.add(floor);

  // walls (better material)
  const wallGeo = new THREE.BoxGeometry(1, 3, 1);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x004d00,
    metalness: 0.3,
    roughness: 0.5,
  });

  for (let z = 0; z < mazeSize; z++) {
    for (let x = 0; x < mazeSize; x++) {
      if (maze[z][x] === 1) {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(x, 1.5, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        walls.push(wall);
      }
    }
  }

  // goal object
  const goalGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const goalMat = new THREE.MeshStandardMaterial({
    color: 0xffdd00,
    emissive: 0xffaa00,
    emissiveIntensity: 1,
  });
  goalMesh = new THREE.Mesh(goalGeo, goalMat);
  goalMesh.position.set(goalCell.x, 0.4, goalCell.z);
  scene.add(goalMesh);

  // zombies: 1..3 depending on level
  const zombieCount = Math.min(level, 3);
  for (let i = 0; i < zombieCount; i++) spawnZombie();

  // camera start
  yaw = Math.PI / 2;
  camera.position.set(playerCell.x, PLAYER_HEIGHT, playerCell.z);
  camera.rotation.set(0, yaw, 0);

  autoPath = [];
  autoPathActive = false;

  startTime = performance.now();
  levelText.textContent = level;
  showMessage(`Level ${level}`, 1800);
}

function spawnZombie() {
  let zx, zz;
  let tries = 0;

  // choose open cell not too close to start/goal
  while (tries < 200) {
    zx = (Math.random() * mazeSize) | 0;
    zz = (Math.random() * mazeSize) | 0;
    if (maze[zz][zx] === 0) {
      const dStart = Math.hypot(zx - 1, zz - 1);
      const dGoal = Math.hypot(zx - goalCell.x, zz - goalCell.z);
      if (dStart > 5 && dGoal > 5) break;
    }
    tries++;
  }

  const zGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const zMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0x660000,
  });
  const mesh = new THREE.Mesh(zGeo, zMat);
  mesh.position.set(zx, 0.4, zz);
  scene.add(mesh);

  zombies.push({ mesh, x: zx, z: zz, alive: true });
}

// ======================= COLLISION =======================

function isWallAt(x, z) {
  const cx = Math.floor(x + 0.5);
  const cz = Math.floor(z + 0.5);
  if (cz < 0 || cz >= mazeSize || cx < 0 || cx >= mazeSize) return true;
  return maze[cz][cx] === 1;
}

// ======================= PATH FINDING (BFS) =======================

function bfsPath(start, goal) {
  const dirs = [
    { dx: 1, dz: 0 },
    { dx: -1, dz: 0 },
    { dx: 0, dz: 1 },
    { dx: 0, dz: -1 },
  ];

  const queue = [];
  const visited = Array.from({ length: mazeSize }, () =>
    Array(mazeSize).fill(false)
  );
  const parent = Array.from({ length: mazeSize }, () =>
    Array(mazeSize).fill(null)
  );

  queue.push(start);
  visited[start.z][start.x] = true;

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === goal.x && cur.z === goal.z) break;

    for (const { dx, dz } of dirs) {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      if (
        nx >= 0 &&
        nx < mazeSize &&
        nz >= 0 &&
        nz < mazeSize &&
        !visited[nz][nx] &&
        maze[nz][nx] === 0
      ) {
        visited[nz][nx] = true;
        parent[nz][nx] = cur;
        queue.push({ x: nx, z: nz });
      }
    }
  }

  if (!visited[goal.z][goal.x]) return [];

  const path = [];
  let cur = goal;
  while (cur) {
    path.push(cur);
    cur = parent[cur.z][cur.x];
  }
  path.reverse();
  return path;
}

function toggleAutoPath() {
  const cx = Math.floor(camera.position.x + 0.5);
  const cz = Math.floor(camera.position.z + 0.5);
  const start = { x: cx, z: cz };

  const path = bfsPath(start, goalCell);
  if (path.length > 0) {
    autoPath = path;
    autoPathActive = true;
    showMessage("Auto-path ON");
  } else {
    autoPathActive = false;
    showMessage("No path!");
  }
}

// ======================= SHOOTING =======================

function shoot() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const zombieMeshes = zombies.filter((z) => z.alive).map((z) => z.mesh);
  if (zombieMeshes.length === 0) return;

  const hits = raycaster.intersectObjects(zombieMeshes, false);
  if (hits.length > 0) {
    const hitMesh = hits[0].object;
    const zombie = zombies.find((z) => z.mesh === hitMesh);
    if (zombie && zombie.alive) {
      zombie.alive = false;
      scene.remove(zombie.mesh);
      score += 100;
      scoreText.textContent = score;
      showMessage("Zombie down! +100", 1200);
    }
  }
}

// ======================= HUD MESSAGE =======================

let messageTimeout = null;

function showMessage(text, duration = 1500) {
  messageEl.textContent = text;
  if (messageTimeout) clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    messageEl.textContent = "";
  }, duration);
}

// ======================= MINIMAP =======================

function drawMinimap() {
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  mctx.clearRect(0, 0, w, h);

  if (!maze || maze.length === 0) return;

  const cellW = w / mazeSize;
  const cellH = h / mazeSize;

  // maze cells
  for (let z = 0; z < mazeSize; z++) {
    for (let x = 0; x < mazeSize; x++) {
      mctx.fillStyle = maze[z][x] === 1 ? "#003300" : "#00aa00";
      mctx.fillRect(x * cellW, z * cellH, cellW, cellH);
    }
  }

  // goal
  mctx.fillStyle = "#ffff00";
  mctx.beginPath();
  mctx.arc(
    (goalCell.x + 0.5) * cellW,
    (goalCell.z + 0.5) * cellH,
    Math.min(cellW, cellH) * 0.25,
    0,
    Math.PI * 2
  );
  mctx.fill();

  // zombies
  mctx.fillStyle = "#ff0000";
  for (const z of zombies) {
    if (!z.alive) continue;
    mctx.fillRect(
      z.x * cellW + cellW * 0.2,
      z.z * cellH + cellH * 0.2,
      cellW * 0.6,
      cellH * 0.6
    );
  }

  // player
  const px = camera.position.x;
  const pz = camera.position.z;
  mctx.fillStyle = "#ffff33";
  mctx.beginPath();
  mctx.arc(px * cellW, pz * cellH, Math.min(cellW, cellH) * 0.23, 0, Math.PI * 2);
  mctx.fill();
}

// ======================= MOVEMENT / UPDATE =======================

let lastFrameTime = performance.now();

function update(delta) {
  // timer
  const now = performance.now();
  const elapsed = ((now - startTime) / 1000) | 0;
  timeText.textContent = `${elapsed}s`;

  // movement
  let forward = 0;

  if (keys["w"] || keys["arrowup"]) forward += 1;
  if (keys["s"] || keys["arrowdown"]) forward -= 1;

  if (keys["a"] || keys["arrowleft"]) yaw += TURN_SPEED * delta;
  if (keys["d"] || keys["arrowright"]) yaw -= TURN_SPEED * delta;

  const speed = MOVE_SPEED * delta;
  const dirX = Math.cos(yaw);
  const dirZ = Math.sin(yaw);

  let newX = camera.position.x + dirX * forward * speed;
  let newZ = camera.position.z + dirZ * forward * speed;

  if (!isWallAt(newX, newZ)) {
    camera.position.x = newX;
    camera.position.z = newZ;
  }

  camera.position.y = PLAYER_HEIGHT;
  camera.rotation.y = yaw;

  // auto-path (overrides manual if active)
  if (autoPathActive && autoPath.length > 0) {
    followAutoPath(delta);
  }

  // zombies
  updateZombies(delta);

  // goal check
  const dGoal = Math.hypot(
    camera.position.x - goalCell.x,
    camera.position.z - goalCell.z
  );
  if (dGoal < 0.6) {
    levelCompleted(elapsed);
  }

  // minimap
  drawMinimap();
}

function followAutoPath(delta) {
  if (autoPath.length === 0) {
    autoPathActive = false;
    return;
  }

  const targetCell = autoPath[0];
  const tx = targetCell.x;
  const tz = targetCell.z;

  const dx = tx - camera.position.x;
  const dz = tz - camera.position.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.1) {
    autoPath.shift();
    if (autoPath.length === 0) {
      autoPathActive = false;
      showMessage("Auto-path finished");
    }
    return;
  }

  const dirX = dx / dist;
  const dirZ = dz / dist;
  const step = AUTO_SPEED * delta;

  const nX = camera.position.x + dirX * step;
  const nZ = camera.position.z + dirZ * step;

  if (!isWallAt(nX, nZ)) {
    camera.position.x = nX;
    camera.position.z = nZ;
  }

  yaw = Math.atan2(dirZ, dirX);
}

function updateZombies(delta) {
  for (const z of zombies) {
    if (!z.alive) continue;

    const dx = camera.position.x - z.x;
    const dz = camera.position.z - z.z;
    const dist = Math.hypot(dx, dz);

    // player caught
    if (dist < 0.4) {
      showMessage("Caught by zombie! −100, restarting…", 2200);
      score = Math.max(0, score - 100);
      scoreText.textContent = score;
      setTimeout(() => buildLevel(), 900);
      return;
    }

    if (dist > 0.01) {
      const dirX = dx / dist;
      const dirZ = dz / dist;
      const step = ZOMBIE_SPEED * delta;

      z.x += dirX * step;
      z.z += dirZ * step;
      z.mesh.position.set(z.x, 0.4, z.z);
    }
  }
}

function levelCompleted(elapsedSeconds) {
  const bonus = Math.max(0, 300 - elapsedSeconds * 5);
  const gained = 500 + bonus;
  score += gained;
  scoreText.textContent = score;
  showMessage(`Level ${level} complete! +${gained}`, 2500);

  level += 1;
  setTimeout(() => buildLevel(), 900);
}

// ======================= MAIN LOOP =======================

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  update(delta);
  renderer.render(scene, camera);
}

// ======================= START GAME =======================

buildLevel();
animate();
