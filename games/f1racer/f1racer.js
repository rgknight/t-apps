console.log("f1racer.js loaded.");

/* --- Game Constants --- */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Mode Selection ---
let numPlayers = 1; // 1 or 2

// Initialize F1 Racer UI and event listeners on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
    // Mode selection overlay logic
    const overlay = document.getElementById("modeOverlay");
    const singleBtn = document.getElementById("singlePlayerBtn");
    const twoBtn = document.getElementById("twoPlayerBtn");

    // Remove previous listeners by resetting .onclick
    if (singleBtn) singleBtn.onclick = null;
    if (twoBtn) twoBtn.onclick = null;

    if (singleBtn && twoBtn && overlay) {
        singleBtn.onclick = () => {
            numPlayers = 1;
            overlay.style.display = "none";
            startGame();
        };
        twoBtn.onclick = () => {
            numPlayers = 2;
            overlay.style.display = "none";
            startGame();
        };
        overlay.style.display = "flex";
    } else {
        // Fallback: start single player if overlay/buttons not found
        startGame();
    }
    // Car color picker for player 1
    const colorInput = document.getElementById("carColorPicker");
    if (colorInput) {
        colorInput.addEventListener("input", (e) => {
            CAR_COLOR = e.target.value;
        });
        CAR_COLOR = colorInput.value;
    }
    // Car color picker for player 2
    const colorInput2 = document.getElementById("carColorPicker2");
    if (colorInput2) {
        colorInput2.addEventListener("input", (e) => {
            if (cars && cars[1]) {
                cars[1].color = e.target.value;
            }
        });
        // Set initial color for player 2 if two player mode
        if (cars && cars[1]) {
            cars[1].color = colorInput2.value;
        }
    }
});

// --- Game Start Entry Point ---
function startGame() {
    // Reset cars array for new game
    cars = [
        {
            x: trackPath[0].x,
            y: trackPath[0].y,
            angle: getStartAngle(),
            speed: 0,
            jumping: false,
            jumpTimer: 0,
            jumpCooldownTimer: 0,
            offTrackTimer: 0,
            hasLeftStart: false,
            color: CAR_COLOR,
            border: CAR_BORDER,
            jumpKey: "Space",
            upKey: "ArrowUp",
            downKey: "ArrowDown",
            leftKey: "ArrowLeft",
            rightKey: "ArrowRight",
            finished: false,
            gameOver: false,
            timer: 0,
            raceActive: false,
            raceStartTime: null,
            name: "Player 1"
        }
    ];
    if (numPlayers === 2) {
        // Add player 2 car
        let p2 = Object.assign({}, PLAYER2_TEMPLATE);
        cars.push(p2);
    }
    document.getElementById("message").textContent = "";
    requestAnimationFrame(gameLoop);
}

const TRACK_COLOR = "#222";
const TRACK_BORDER_COLOR = "#222";
const DEFAULT_TRACK_WIDTH = 220;
let TRACK_WIDTH = DEFAULT_TRACK_WIDTH;
const CAR_WIDTH = 24;
const CAR_HEIGHT = 48;
let CAR_COLOR = "#FF0000";
const CAR_BORDER = "#bfa800";
const JUMP_COLOR = "#00e5ff";
const FPS = 60;
const JUMP_DURATION = 0.7; // seconds
const CAR_SPEED = 4.2;
const CAR_TURN_SPEED = 3.2; // degrees per frame
const OFF_TRACK_GRACE = 0.1; // seconds

// --- Procedural Track Generation ---
function generateTrack(level) {
    // Polyline-based, straight-edged, continuous, non-intersecting track generation
    const marginX = 120, marginY = 80;
    const n = 15 + Math.floor(Math.random() * 3); // 15-17 points
    const minY = marginY + 20, maxY = 600 - marginY;
    const minX = marginX, maxX = 900 - marginX;

    // Place points from bottom to top, with randomized x
    let points = [];
    for (let i = 0; i < n; i++) {
        let y = 570 - (i * ((570 - minY) / (n - 1)));
        let x;
        if (i === 0) {
            x = 450;
        } else if (i === n - 1) {
            x = 200 + Math.random() * 500;
        } else {
            // Limit x-movement to avoid sharp zigzags
            let prevX = points[i - 1].x;
            let range = 120;
            x = Math.max(minX, Math.min(maxX, prevX + (Math.random() - 0.5) * range));
        }
        points.push({ x, y });
    }

    // Compute left/right edge points for each segment
    let leftEdge = [], rightEdge = [];
    for (let i = 0; i < points.length - 1; i++) {
        let p1 = points[i], p2 = points[i + 1];
        let dx = p2.x - p1.x, dy = p2.y - p1.y;
        let len = Math.hypot(dx, dy) || 1;
        let px = -dy / len, py = dx / len;
        leftEdge.push({
            x: p1.x + px * (TRACK_WIDTH / 2),
            y: p1.y + py * (TRACK_WIDTH / 2)
        });
        rightEdge.push({
            x: p1.x - px * (TRACK_WIDTH / 2),
            y: p1.y - py * (TRACK_WIDTH / 2)
        });
        if (i === points.length - 2) {
            // Add last point's edges
            leftEdge.push({
                x: p2.x + px * (TRACK_WIDTH / 2),
                y: p2.y + py * (TRACK_WIDTH / 2)
            });
            rightEdge.push({
                x: p2.x - px * (TRACK_WIDTH / 2),
                y: p2.y - py * (TRACK_WIDTH / 2)
            });
        }
    }

    // Store the centerline for car movement, and the polygon for edge detection
    let track = points;
    track.leftEdge = leftEdge;
    track.rightEdge = rightEdge;
    track.polygon = leftEdge.concat(rightEdge.slice().reverse());
    return track;
}

function generateObstacles(track, level) {
    // Place 2-4 obstacles at random points along the track, but not near the start, and always on the road
    const obs = [];
    const n = 2 + Math.floor(Math.random() * 3);
    const minStartDist = 120;
    const startX = track[0].x, startY = track[0].y;
    for (let i = 4; i < track.length - 2 && obs.length < n; i += 2) {
        const p = track[i];
        // Ensure obstacle is not too close to the start
        if (Math.hypot(p.x - startX, p.y - startY) < minStartDist) continue;
        // Compute direction of the track at this point
        const prev = track[i - 1];
        const next = track[i + 1];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        // Perpendicular vector
        const px = -dy / len;
        const py = dx / len;
        // Place obstacle at a random perpendicular offset within the track width
        const r = 16 + Math.random() * 10;
        const margin = 10;
        const maxOffset = (TRACK_WIDTH / 2) - r - margin;
        const offset = (Math.random() - 0.5) * 2 * maxOffset;
        obs.push({
            x: p.x + px * offset,
            y: p.y + py * offset,
            r
        });
    }
    return obs;
}

let currentLevel = 1;
let trackPath = generateTrack(currentLevel);
let obstacles = generateObstacles(trackPath, currentLevel);

// --- Car State ---
function getStartAngle() {
    // Angle from first to second track point, in degrees
    const dx = trackPath[1].x - trackPath[0].x;
    const dy = trackPath[1].y - trackPath[0].y;
    return Math.atan2(dy, dx) * 180 / Math.PI;
}

let cars = [
    {
        x: trackPath[0].x,
        y: trackPath[0].y,
        prevX: trackPath[0].x,
        prevY: trackPath[0].y,
        angle: getStartAngle(),
        speed: 0,
        jumping: false,
        jumpTimer: 0,
        jumpCooldownTimer: 0,
        offTrackTimer: 0,
        hasLeftStart: false,
        color: CAR_COLOR,
        border: CAR_BORDER,
        jumpKey: "Space",
        upKey: "ArrowUp",
        downKey: "ArrowDown",
        leftKey: "ArrowLeft",
        rightKey: "ArrowRight",
        finished: false,
        gameOver: false,
        timer: 0,
        raceActive: false,
        raceStartTime: null,
        name: "Player 1"
    }
];
// Player 2 car template (added if numPlayers == 2)
const PLAYER2_TEMPLATE = {
    x: trackPath[0].x,
    y: trackPath[0].y,
    angle: getStartAngle(),
    speed: 0,
    jumping: false,
    jumpTimer: 0,
    jumpCooldownTimer: 0,
    offTrackTimer: 0,
    hasLeftStart: false,
    color: "#00ff44",
    border: "#005f1a",
    jumpKey: "KeyF", // Changed from ShiftLeft to F key for reliability
    upKey: "KeyW",
    downKey: "KeyS",
    leftKey: "KeyA",
    rightKey: "KeyD",
    finished: false,
    gameOver: false,
    timer: 0,
    raceActive: false,
    raceStartTime: null,
    name: "Player 2"
};

let keyState = {}; // Tracks all relevant keys for both players

// --- Timer State ---
let raceTimer = 0;
let raceActive = false;
let raceStartTime = null;
let recentTimes = [];

// Load recent times from sessionStorage
if (sessionStorage.getItem("recentTimes")) {
    try {
        recentTimes = JSON.parse(sessionStorage.getItem("recentTimes"));
    } catch (e) {
        recentTimes = [];
    }
}

// --- Input Handling ---
document.addEventListener("keydown", (e) => {
    keyState[e.code] = true;
    // Prevent default for jump keys
    if (e.code === "Space" || e.code === "ControlLeft") e.preventDefault();

    // If a car is crashed and its jump key is pressed, reset only that car
    cars.forEach((car) => {
        if (car.gameOver && e.code === car.jumpKey) {
            Object.assign(car, {
                x: trackPath[0].x,
                y: trackPath[0].y,
                angle: getStartAngle(),
                speed: 0,
                jumping: false,
                jumpTimer: 0,
                jumpCooldownTimer: 0,
                offTrackTimer: 0,
                hasLeftStart: false,
                finished: false,
                gameOver: false
                // Do NOT reset timer, raceActive, or raceStartTime here
            });
        }
    });
});
document.addEventListener("keyup", (e) => {
    keyState[e.code] = false;
});

// (The rest of the code will be updated to use startGame() instead of window.onload)

// --- Game Loop ---
function gameLoop() {
    update();
    draw();
    // Update timer display (show both players if two player)
    const timerDiv = document.getElementById("timer");
    if (timerDiv) {
        if (cars.length === 2) {
            timerDiv.textContent = `P1: ${cars[0].timer.toFixed(2)}s   P2: ${cars[1].timer.toFixed(2)}s`;
        } else {
            timerDiv.textContent = `Time: ${cars[0].timer.toFixed(2)}s`;
        }
    }
    // Continue loop if at least one car is not finished
    if (!cars.every(car => car.finished)) {
        requestAnimationFrame(gameLoop);
    }
}

function update() {
    // Update all cars independently
    for (let i = 0; i < cars.length; i++) {
        let car = cars[i];
        if (car.gameOver || car.finished) continue;

        // Start timer when car first moves forward
        if (!car.raceActive && !car.gameOver && (car.speed > 0)) {
            car.raceActive = true;
            car.raceStartTime = performance.now();
            car.timer = 0;
        }
        // Update timer if race is active
        if (car.raceActive && !car.gameOver) {
            car.timer = (performance.now() - car.raceStartTime) / 1000;
        }

        // Handle jump cooldown
        if (car.jumpCooldownTimer > 0) {
            car.jumpCooldownTimer--;
        }
        // Handle jump (only trigger on keydown edge, not held down)
        if (!car.jumping && car.jumpTimer <= 0 && car.jumpCooldownTimer <= 0) {
            if (keyState[car.jumpKey] && !car._jumpKeyPrev) {
                car.jumping = true;
                car.jumpTimer = JUMP_DURATION * FPS;
            }
        }
        if (car.jumping) {
            car.jumpTimer--;
            if (car.jumpTimer <= 0) {
                car.jumping = false;
                car.jumpCooldownTimer = FPS; // 1 second cooldown
            }
        }
        // Track previous jump key state for edge detection
        car._jumpKeyPrev = !!keyState[car.jumpKey];

        // Handle movement
        if (keyState[car.upKey]) {
            car.speed = CAR_SPEED;
        } else if (keyState[car.downKey]) {
            car.speed = -CAR_SPEED * 0.6;
        } else {
            car.speed = 0;
        }
        if (keyState[car.leftKey]) {
            car.angle -= CAR_TURN_SPEED;
        }
        if (keyState[car.rightKey]) {
            car.angle += CAR_TURN_SPEED;
        }
        // Clear justRetried flag when player starts moving again
        if (car.justRetried && car.speed !== 0) {
            car.justRetried = false;
        }

        // Update position
        car.prevX = car.x;
        car.prevY = car.y;
        const rad = car.angle * Math.PI / 180;
        car.x += Math.cos(rad) * car.speed;
        car.y += Math.sin(rad) * car.speed;

        // Track if car has left the start area
        const startX = trackPath[0].x;
        const startY = trackPath[0].y;
        const distFromStart = Math.hypot(car.x - startX, car.y - startY);
        if (!car.hasLeftStart && distFromStart > 60) {
            car.hasLeftStart = true;
        }

        // Obstacle collision (if not jumping)
        if (!car.jumping) {
            for (const obs of (typeof obstacles !== "undefined" ? obstacles : [])) {
                const d = Math.hypot(car.x - obs.x, car.y - obs.y);
                if (d < obs.r + Math.max(CAR_WIDTH, CAR_HEIGHT) * 0.35) {
                    car.gameOver = true;
                }
            }
        }

        // Check if car is on track
        if (!isOnTrack(car.x, car.y) && !car.jumping) {
            car.offTrackTimer += 1 / FPS;
            if (car.offTrackTimer > OFF_TRACK_GRACE) {
                car.gameOver = true;
            }
        } else {
            car.offTrackTimer = 0;
        }

        // Check if car visually crosses the finish line (last segment) and has left start
        if (!car.gameOver && car.hasLeftStart && crossesFinishLineVisual(car.prevX, car.prevY, car.x, car.y)) {
            car.finished = true;
            car.raceActive = false;
        }
    }

    // After all cars updated, handle new end-of-level and restart logic
    const msgDiv = document.getElementById("message");
    // Both finished: auto-advance
    if (cars.every(car => car.finished)) {
        if (!document.getElementById("nextLevelBtn")) {
            let summary = cars.map(car => `${car.name} finished! Time: ${car.timer.toFixed(2)}s.`).join("<br>");
            msgDiv.innerHTML = summary + "<br>Advancing to next level...";
            setTimeout(() => {
                loadLevel(currentLevel + 1);
            }, 1800);
        }
    }
    // Both crashed: show "Try Again" button
    else if (cars.every(car => car.gameOver)) {
        if (!document.getElementById("tryAgainBtn")) {
            let summary = cars.map(car => `${car.name} crashed!`).join("<br>");
            msgDiv.innerHTML = summary + '<br><button id="tryAgainBtn" style="margin-top:8px;">Try Again</button>';
            setTimeout(() => {
                const btn = document.getElementById("tryAgainBtn");
                if (btn) {
                    btn.onclick = () => {
                        restartGame();
                    };
                }
            }, 0);
        }
    }
    // One finished, one crashed: show status and jump key hint for crashed player
    else if (cars.length === 2 && cars.some(car => car.finished) && cars.some(car => car.gameOver)) {
        let status = cars.map((car, i) => {
            if (car.finished) {
                return `${car.name} finished! Time: ${car.timer.toFixed(2)}s.`;
            } else if (car.gameOver) {
                const keyHint = car.jumpKey === "Space" ? "Space" : "Control";
                return `${car.name} crashed! Press ${keyHint} to try again.`;
            } else {
                return "";
            }
        }).filter(Boolean).join("<br>");
        msgDiv.innerHTML = status;
    }
    // Show status for each car as they finish/crash
    else {
        let status = cars.map(car => {
            if (car.finished) {
                return `${car.name} finished! Time: ${car.timer.toFixed(2)}s.`;
            } else if (car.gameOver) {
                return `${car.name} crashed!`;
            } else {
                return "";
            }
        }).filter(Boolean).join("<br>");
        msgDiv.innerHTML = status;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#b3e0ff");
    grad.addColorStop(1, "#6b8e23");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw track
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
        ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.lineWidth = TRACK_WIDTH;
    ctx.strokeStyle = TRACK_COLOR;
    ctx.stroke();

    // Draw track border
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
        ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.lineWidth = TRACK_WIDTH + 10;
    ctx.strokeStyle = TRACK_BORDER_COLOR;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Draw centerline (dotted white)
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
        ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#fff";
    ctx.setLineDash([18, 18]);
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;

    // Draw finish line (full width, perpendicular to last segment)
    const fx1 = trackPath[trackPath.length - 2].x;
    const fy1 = trackPath[trackPath.length - 2].y;
    const fx2 = trackPath[trackPath.length - 1].x;
    const fy2 = trackPath[trackPath.length - 1].y;
    // Perpendicular vector
    const dx = fx2 - fx1;
    const dy = fy2 - fy1;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    // Center of finish line
    const mx = (fx1 + fx2) / 2;
    const my = (fy1 + fy2) / 2;
    // Endpoints across the track
    const halfWidth = TRACK_WIDTH / 2;
    const ex1 = mx + px * halfWidth;
    const ey1 = my + py * halfWidth;
    const ex2 = mx - px * halfWidth;
    const ey2 = my - py * halfWidth;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ex1, ey1);
    ctx.lineTo(ex2, ey2);
    ctx.lineWidth = 24;
    ctx.strokeStyle = "#fff";
    ctx.setLineDash([12, 12]);
    ctx.globalAlpha = 1.0;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.restore();

    // Draw obstacles (high-contrast yellow with black border) -- draw obstacles after the track!
    if (typeof obstacles !== "undefined") {
        for (const obs of obstacles) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.r, 0, 2 * Math.PI);
            ctx.fillStyle = "#ffd600";
            ctx.globalAlpha = 0.95;
            ctx.fill();
            ctx.lineWidth = 5;
            ctx.strokeStyle = "#111";
            ctx.globalAlpha = 1.0;
            ctx.stroke();
            ctx.restore();
        }
    }

    // Draw all cars
    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate((car.angle - 90) * Math.PI / 180);

        // Wheels (black circles, wide apart)
        ctx.fillStyle = "#222";
        const wheelR = 8, wheelOffsetX = CAR_WIDTH * 0.7, wheelOffsetY = CAR_HEIGHT * 0.38;
        // Front left/right
        ctx.beginPath();
        ctx.arc(-wheelOffsetX, -wheelOffsetY, wheelR, 0, 2 * Math.PI);
        ctx.arc(wheelOffsetX, -wheelOffsetY, wheelR, 0, 2 * Math.PI);
        ctx.fill();
        // Rear left/right
        ctx.beginPath();
        ctx.arc(-wheelOffsetX, wheelOffsetY, wheelR, 0, 2 * Math.PI);
        ctx.arc(wheelOffsetX, wheelOffsetY, wheelR, 0, 2 * Math.PI);
        ctx.fill();

        // Rear wing (wide, flat, black)
        ctx.fillStyle = "#111";
        ctx.fillRect(-CAR_WIDTH * 0.8, CAR_HEIGHT * 0.38, CAR_WIDTH * 1.6, 7);

        // Front wing (wide, flat, black)
        ctx.fillStyle = "#111";
        ctx.fillRect(-CAR_WIDTH * 0.8, -CAR_HEIGHT * 0.48, CAR_WIDTH * 1.6, 7);

        // Main body (narrow, elongated, colored)
        ctx.beginPath();
        ctx.moveTo(-CAR_WIDTH * 0.25, -CAR_HEIGHT * 0.45);
        ctx.lineTo(CAR_WIDTH * 0.25, -CAR_HEIGHT * 0.45);
        ctx.lineTo(CAR_WIDTH * 0.32, CAR_HEIGHT * 0.35);
        ctx.lineTo(-CAR_WIDTH * 0.32, CAR_HEIGHT * 0.35);
        ctx.closePath();
        ctx.fillStyle = car.jumping ? JUMP_COLOR : car.color;
        ctx.strokeStyle = car.border;
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();

        // Cockpit (dark oval)
        ctx.beginPath();
        ctx.ellipse(0, 0, CAR_WIDTH * 0.18, CAR_HEIGHT * 0.18, 0, 0, 2 * Math.PI);
        ctx.fillStyle = "#222";
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Nose cone (triangle)
        ctx.beginPath();
        ctx.moveTo(0, -CAR_HEIGHT * 0.45);
        ctx.lineTo(-CAR_WIDTH * 0.11, -CAR_HEIGHT * 0.65);
        ctx.lineTo(CAR_WIDTH * 0.11, -CAR_HEIGHT * 0.65);
        ctx.closePath();
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Optional: driver helmet (small circle in cockpit)
        ctx.beginPath();
        ctx.arc(0, -CAR_HEIGHT * 0.05, CAR_WIDTH * 0.11, 0, 2 * Math.PI);
        ctx.fillStyle = i === 0 ? "#1976d2" : "#d21919";
        ctx.globalAlpha = 0.95;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.restore();

        // Draw jump cooldown indicator for each car
        if (car.jumpCooldownTimer > 0) {
            ctx.save();
            ctx.fillStyle = "#00e5ff";
            const barWidth = 120;
            const barHeight = 12;
            const x = canvas.width - barWidth - 30;
            const y = 30 + i * 20;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = "#fff";
            ctx.font = "bold 14px sans-serif";
            ctx.fillText(`${car.name} Jump Cooldown`, x + 10, y + barHeight - 2);
            ctx.restore();
        }
    }
}

function isOnTrack(x, y) {
    // Simple: Check if (x, y) is within TRACK_WIDTH/2 (+ margin) of the centerline (trackPath)
    let minDist = Infinity;
    for (let i = 0; i < trackPath.length - 1; i++) {
        const x1 = trackPath[i].x, y1 = trackPath[i].y;
        const x2 = trackPath[i + 1].x, y2 = trackPath[i + 1].y;
        // Project point onto segment
        const dx = x2 - x1, dy = y2 - y1;
        const segLenSq = dx * dx + dy * dy;
        let t = 0;
        if (segLenSq > 0) {
            t = ((x - x1) * dx + (y - y1) * dy) / segLenSq;
            t = Math.max(0, Math.min(1, t));
        }
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        const dist = Math.hypot(x - projX, y - projY);
        if (dist < minDist) minDist = dist;
    }
    // Add a small margin for forgiveness
    return minDist <= (TRACK_WIDTH / 2 + 3);
}

// Helper: Distance from point to segment
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
        return Math.hypot(px - x1, py - y1);
    }
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
}

function endGame() {
    gameOver = true;
    document.getElementById("message").textContent = "You fell off the track! Press Space to restart.";
}

/**
 * Finish line detection: robustly detect if the car enters a finish zone rectangle
 * centered on the finish line, with width TRACK_WIDTH and length 40px.
 */
function crossesFinishLineVisual(prevX, prevY, x, y) {
    const fx1 = trackPath[trackPath.length - 2].x;
    const fy1 = trackPath[trackPath.length - 2].y;
    const fx2 = trackPath[trackPath.length - 1].x;
    const fy2 = trackPath[trackPath.length - 1].y;
    // Direction vector of finish line
    const dx = fx2 - fx1, dy = fy2 - fy1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;
    // Perpendicular vector
    const px = -ny, py = nx;
    // Center of finish line
    const mx = (fx1 + fx2) / 2;
    const my = (fy1 + fy2) / 2;
    // Rectangle corners (width TRACK_WIDTH, length 40px)
    const halfW = TRACK_WIDTH / 2, halfL = 20;
    // Four corners: A, B, C, D (in order)
    const A = { x: mx + px * halfW - nx * halfL, y: my + py * halfW - ny * halfL };
    const B = { x: mx - px * halfW - nx * halfL, y: my - py * halfW - ny * halfL };
    const C = { x: mx - px * halfW + nx * halfL, y: my - py * halfW + ny * halfL };
    const D = { x: mx + px * halfW + nx * halfL, y: my + py * halfW + ny * halfL };

    // Point-in-rectangle test using cross products
    function inRect(px, py) {
        function sign(ax, ay, bx, by, cx, cy) {
            return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
        }
        // Rectangle ABCD
        return (
            sign(A.x, A.y, B.x, B.y, px, py) >= 0 &&
            sign(B.x, B.y, C.x, C.y, px, py) >= 0 &&
            sign(C.x, C.y, D.x, D.y, px, py) >= 0 &&
            sign(D.x, D.y, A.x, A.y, px, py) >= 0
        );
    }

    // Require the car to enter the finish zone from the correct side (moving "up" the track)
    // Check if previous position was outside and current position is inside
    return !inRect(prevX, prevY) && inRect(x, y);
}

function finishGame() {
    gameOver = true;
    raceActive = false;
    let timeMsg = "";
    if (raceStartTime !== null) {
        timeMsg = `Time: ${raceTimer.toFixed(2)}s`;
        // Save to recent times
        recentTimes.unshift(raceTimer.toFixed(2));
        if (recentTimes.length > 5) recentTimes = recentTimes.slice(0, 5);
        sessionStorage.setItem("recentTimes", JSON.stringify(recentTimes));
    }
    let recentMsg = "";
    if (recentTimes.length > 0) {
        recentMsg = "Recent times: " + recentTimes.map((t, i) => `#${i + 1}: ${t}s`).join("  ");
    }
    let nextMsg = '<button id="nextLevelBtn" style="margin-top:8px;">Next Level</button><br>';
    document.getElementById("message").innerHTML =
        "You finished!<br>" +
        (timeMsg ? timeMsg + "<br>" : "") +
        (recentMsg ? recentMsg + "<br>" : "") +
        nextMsg;

    // Add event listener for next level button
    setTimeout(() => {
        const btn = document.getElementById("nextLevelBtn");
        if (btn) {
            btn.onclick = () => {
                loadLevel(currentLevel + 1);
            };
        }
    }, 0);
}

function loadLevel(level) {
    currentLevel = level;
    // Track gets narrower each level, min 60
    TRACK_WIDTH = Math.max(60, DEFAULT_TRACK_WIDTH - (level - 1) * 15);
    trackPath = generateTrack(level);
    obstacles = generateObstacles(trackPath, level);
    // Reset cars for new level
    cars = [
        {
            x: trackPath[0].x,
            y: trackPath[0].y,
            angle: getStartAngle(),
            speed: 0,
            jumping: false,
            jumpTimer: 0,
            jumpCooldownTimer: 0,
            offTrackTimer: 0,
            hasLeftStart: false,
            color: CAR_COLOR,
            border: CAR_BORDER,
            jumpKey: "Space",
            upKey: "ArrowUp",
            downKey: "ArrowDown",
            leftKey: "ArrowLeft",
            rightKey: "ArrowRight",
            finished: false,
            gameOver: false,
            timer: 0,
            raceActive: false,
            raceStartTime: null,
            name: "Player 1"
        }
    ];
    if (numPlayers === 2) {
        let p2 = Object.assign({}, PLAYER2_TEMPLATE);
        cars.push(p2);
    }
    document.getElementById("message").textContent = "";
    // Reset timer display
    const timerDiv = document.getElementById("timer");
    if (timerDiv) {
        if (cars.length === 2) {
            timerDiv.textContent = `P1: 0.00s   P2: 0.00s`;
        } else {
            timerDiv.textContent = `Time: 0.00s`;
        }
    }
    // Update level display if present
    const levelDiv = document.getElementById("levelDisplay");
    if (levelDiv) {
        levelDiv.textContent = `Level ${currentLevel}`;
    }
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    // Reset cars for restart
    cars = [
        {
            x: trackPath[0].x,
            y: trackPath[0].y,
            angle: getStartAngle(),
            speed: 0,
            jumping: false,
            jumpTimer: 0,
            jumpCooldownTimer: 0,
            offTrackTimer: 0,
            hasLeftStart: false,
            color: CAR_COLOR,
            border: CAR_BORDER,
            jumpKey: "Space",
            upKey: "ArrowUp",
            downKey: "ArrowDown",
            leftKey: "ArrowLeft",
            rightKey: "ArrowRight",
            finished: false,
            gameOver: false,
            timer: 0,
            raceActive: false,
            raceStartTime: null,
            name: "Player 1"
        }
    ];
    if (numPlayers === 2) {
        let p2 = Object.assign({}, PLAYER2_TEMPLATE);
        cars.push(p2);
    }
    document.getElementById("message").textContent = "";
    // Reset timer display
    const timerDiv = document.getElementById("timer");
    if (timerDiv) {
        if (cars.length === 2) {
            timerDiv.textContent = `P1: 0.00s   P2: 0.00s`;
        } else {
            timerDiv.textContent = `Time: 0.00s`;
        }
    }
    requestAnimationFrame(gameLoop);
}

// --- Start the game ---
// (Now handled by startGame() after mode selection)
