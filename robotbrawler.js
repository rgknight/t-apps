// =====================
// Robot Brawler Game
// =====================

/**
 * Math questions are now loaded from mathQuestions.js - no server required!
 * This game works with both file:// and http:// protocols.
 */

// --- State/Globals (declare all first) ---
let playerRobot, cpuRobot;
let playerHP, cpuHP;
let moveCooldowns = { Punch: 0, Kick: 0, Wrestle: 0, Headbutt: 0 };
let cpuCooldowns = { Punch: 0, Kick: 0, Wrestle: 0, Headbutt: 0 };
let playerTurn = true;
let gameActive = false;
let wrestleTimeout = null;
let wrestleResolve = null;
let forcedWrestle = { player: false, cpu: false };
let forcedHeadbutt = { player: false, cpu: false };
let roundPendingGodDamage = false;
let mathModalActive = false;
let robotAnimator = null;

// --- Robot Data ---
const ROBOTS = [
    {
        name: "Bolt brawler",
        weakness: "Punch",
        icon: "🤖"
    },
    {
        name: "Crusher brawler",
        weakness: "Kick",
        icon: "🦾"
    },
    {
        name: "Titan brawler",
        weakness: "Wrestle",
        icon: "🛡️"
    },
    {
        name: "God brawler",
        weakness: "Headbutt",
        icon: "👾"
    },
    {
        name: "Demi brawler",
        weakness: "",
        icon: "🦿"
    }
];

const MOVES = [
    { name: "Punch", key: "P", baseDamage: 5 },
    { name: "Kick", key: "K", baseDamage: 5 },
    { name: "Wrestle", key: "W", baseDamage: 6 },
    { name: "Headbutt", key: "H", baseDamage: 10 }
];

const GOD_ATTACK_DAMAGE = 4; // God takes 4 from all attacks
const GOD_HEADBUTT_DAMAGE = 20; // God takes 20 from Headbutt
const GOD_PASSIVE_DAMAGE = 3; // God takes 3 every round
const GOD_MAX_HP = 150;
const DEMIbrawler_MAX_HP = 105; // Updated from 80 to 105
const DEMIbrawler_ATTACK_DAMAGE = 5; // Demi takes 5 from all attacks
const DEMIbrawler_HEAL = 3;
const MAX_HP = 100;
const MATH_TIME_LIMIT = 30; // seconds for all math questions (increased from 11)

// --- DOM Elements ---
const robotSelectionDiv = document.getElementById("robot-selection");
const robotOptionsDiv = document.getElementById("robot-options");
const battleScreenDiv = document.getElementById("battle-screen");
const playerRobotName = document.getElementById("player-robot-name");
const cpuRobotName = document.getElementById("cpu-robot-name");
const playerHPSpan = document.getElementById("player-hp");
const cpuHPSpan = document.getElementById("cpu-hp");
const playerHPBar = document.getElementById("player-hp-bar");
const cpuHPBar = document.getElementById("cpu-hp-bar");
const playerPanel = document.getElementById("player-panel");
const cpuPanel = document.getElementById("cpu-panel");
const punchBtn = document.getElementById("punch-btn");
const kickBtn = document.getElementById("kick-btn");
const wrestleBtn = document.getElementById("wrestle-btn");
let headbuttBtn = document.getElementById("headbutt-btn");
if (!headbuttBtn) {
    const btn = document.createElement("button");
    btn.id = "headbutt-btn";
    btn.textContent = "Headbutt (H)";
    const moveButtons = document.getElementById("move-buttons");
    moveButtons.appendChild(btn);
    headbuttBtn = btn;
}
const cooldownsDiv = document.getElementById("cooldowns");
const messageDiv = document.getElementById("message");
const mathModal = document.getElementById("math-modal");
const mathQuestion = document.getElementById("math-question");
const mathOptions = document.getElementById("math-options");
const mathTime = document.getElementById("math-time");
const endScreen = document.getElementById("end-screen");
const endMessage = document.getElementById("end-message");
const playAgainBtn = document.getElementById("play-again-btn");
const robotCanvas = document.getElementById("robot-canvas");

// --- Utility Functions ---
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
function now() {
    return Date.now();
}
function isGod(robot) {
    return robot && robot.name === "God brawler";
}
function isDemibrawler(robot) {
    return robot && robot.name === "Demi brawler";
}
function getMaxHP(robot) {
    if (isGod(robot)) return GOD_MAX_HP;
    if (isDemibrawler(robot)) return DEMIbrawler_MAX_HP;
    return MAX_HP;
}


function updateBattleScreen() {
    playerRobotName.textContent = `${playerRobot.icon} ${playerRobot.name}`;
    cpuRobotName.textContent = `${cpuRobot.icon} ${cpuRobot.name}`;
    playerHPSpan.textContent = playerHP;
    cpuHPSpan.textContent = cpuHP;
    // Update HP bars
    const playerPercent = Math.max(0, playerHP) / getMaxHP(playerRobot) * 100;
    const cpuPercent = Math.max(0, cpuHP) / getMaxHP(cpuRobot) * 100;
    playerHPBar.style.width = playerPercent + "%";
    cpuHPBar.style.width = cpuPercent + "%";
    // Color: green > yellow > red
    playerHPBar.style.background = playerPercent > 50 ? "linear-gradient(90deg, #4caf50 60%, #fbc02d 100%)"
        : playerPercent > 20 ? "linear-gradient(90deg, #fbc02d 60%, #ff9800 100%)"
            : "linear-gradient(90deg, #ff5252 60%, #ff9800 100%)";
    cpuHPBar.style.background = cpuPercent > 50 ? "linear-gradient(90deg, #4caf50 60%, #fbc02d 100%)"
        : cpuPercent > 20 ? "linear-gradient(90deg, #fbc02d 60%, #ff9800 100%)"
            : "linear-gradient(90deg, #ff5252 60%, #ff9800 100%)";
    updateMoveButtons();
    updateCooldowns();
    // Highlight active turn
    playerPanel.classList.toggle("active-turn", playerTurn && gameActive);
    cpuPanel.classList.toggle("active-turn", !playerTurn && gameActive);
    // Update canvas robots
    if (robotAnimator) {
        robotAnimator.setHP(playerHP, cpuHP);
        robotAnimator.drawIdle();
    }
    // Update robot matchup h2
    const matchupH2 = document.getElementById("robot-matchup");
    if (gameActive && matchupH2) {
        matchupH2.style.display = "";
        matchupH2.textContent = `${playerRobot.icon} vs ${cpuRobot.icon}`;
    } else if (matchupH2) {
        matchupH2.style.display = "none";
    }
}

// --- Game Start ---
function startGame() {
    playerHP = getMaxHP(playerRobot);
    cpuHP = getMaxHP(cpuRobot);
    moveCooldowns = { Punch: 0, Kick: 0, Wrestle: 0, Headbutt: 0 };
    cpuCooldowns = { Punch: 0, Kick: 0, Wrestle: 0, Headbutt: 0 };
    playerTurn = true;
    gameActive = true;
    forcedWrestle = { player: false, cpu: false };
    forcedHeadbutt = { player: false, cpu: false };
    roundPendingGodDamage = false;
    updateBattleScreen();
    robotSelectionDiv.style.display = "none";
    battleScreenDiv.style.display = "block";
    endScreen.style.display = "none";
    messageDiv.textContent = "Battle Start! Your move.";
    updateMoveButtons();
    // Initialize robot animator
    if (robotCanvas) {
        if (!robotAnimator) robotAnimator = new RobotAnimator(robotCanvas);
        robotAnimator.setRobots(playerRobot, cpuRobot);
        robotAnimator.setHP(playerHP, cpuHP);
        robotAnimator.drawIdle();
    }
}

function selectRobot(idx) {
    playerRobot = { ...ROBOTS[idx] };
    // Prevent player from ever being named John Ceenobot2000
    if (playerRobot.name === "John Ceenobot2000") {
        playerRobot.name = "Player Robot";
    }
    // Use player name input if provided
    const nameInput = document.getElementById("player-name-input");
    if (nameInput && nameInput.value.trim().length > 0) {
        playerRobot.name = nameInput.value.trim();
    }
    // CPU randomly picks a different robot (fix: random, not always Bolt)
    let available = ROBOTS.map((r, i) => i).filter(i => i !== idx);
    let cpuIdx = available[randomInt(0, available.length - 1)];
    cpuRobot = { ...ROBOTS[cpuIdx] };
    cpuRobot.name = "John Ceenobot2000";
    startGame();
}

// --- Robot Selection ---
function showRobotSelection() {
    robotSelectionDiv.style.display = "";
    battleScreenDiv.style.display = "none";
    endScreen.style.display = "none";
    robotOptionsDiv.innerHTML = "";
    ROBOTS.forEach((robot, idx) => {
        const div = document.createElement("div");
        div.className = "robot-option";
        div.style.display = "inline-block";
        div.style.margin = "16px";
        div.style.padding = "12px";
        div.style.border = "2px solid #fff";
        div.style.borderRadius = "8px";
        div.style.background = "#333";
        div.style.width = "140px";
        div.style.cursor = "pointer";
        div.innerHTML = `
            <div style="font-size:2.5em;">${robot.icon}</div>
            <div style="font-weight:bold; margin:8px 0;">${robot.name}</div>
            <div style="color:#f88;">Weak to: ${robot.weakness ? robot.weakness : "None"}</div>
            <button style="margin-top:10px;" data-idx="${idx}">Select</button>
        `;
        // Attach event handler using addEventListener for reliability
        const btn = div.querySelector("button");
        btn.addEventListener("click", () => selectRobot(idx));
        robotOptionsDiv.appendChild(div);
    });
}

// --- Move Button Updates ---
function updateMoveButtons() {
    if (!gameActive || !playerTurn) {
        punchBtn.disabled = kickBtn.disabled = wrestleBtn.disabled = headbuttBtn.disabled = true;
        return;
    }

    const now = Date.now();
    punchBtn.disabled = moveCooldowns.Punch > now;
    kickBtn.disabled = moveCooldowns.Kick > now;
    wrestleBtn.disabled = moveCooldowns.Wrestle > now;
    headbuttBtn.disabled = moveCooldowns.Headbutt > now;
}

function updateCooldowns() {
    const now = Date.now();
    let cooldownText = "";

    for (const [move, endTime] of Object.entries(moveCooldowns)) {
        if (endTime > now) {
            const remaining = Math.ceil((endTime - now) / 1000);
            cooldownText += `${move}: ${remaining}s `;
        }
    }

    cooldownsDiv.textContent = cooldownText || "No cooldowns";
}

// --- Game Actions ---
function playerMove(moveName) {
    if (!gameActive || !playerTurn) return;

    const move = MOVES.find(m => m.name === moveName);
    if (!move) return;

    const now = Date.now();
    if (moveCooldowns[moveName] > now) return;

    // Trigger attack animation IMMEDIATELY when button is clicked
    if (robotAnimator) {
        robotAnimator.animateAttack(true, move.name);
    }

    // Show math question after a short delay to let animation start
    setTimeout(() => {
        showMathQuestion(true, move);
    }, 300);
}

function executeMove(move, attacker, defender, isPlayer) {
    let damage = move.baseDamage;
    const defenderRobot = isPlayer ? cpuRobot : playerRobot;

    // Special damage mechanics for God and Demi robots
    if (isGod(defenderRobot)) {
        // God takes special damage
        if (move.name === "Headbutt") {
            damage = GOD_HEADBUTT_DAMAGE; // 20 damage from Headbutt
        } else {
            damage = GOD_ATTACK_DAMAGE; // 4 damage from all other attacks
        }
    } else if (isDemibrawler(defenderRobot)) {
        // Demi takes reduced damage from all attacks
        damage = DEMIbrawler_ATTACK_DAMAGE; // 5 damage from all attacks
    } else {
        // Normal robots - check for weakness
        if (defender.weakness === move.name) {
            damage = 10; // Weakness damage
        }
    }

    // Apply damage immediately (animation already triggered in playerMove)
    if (isPlayer) {
        cpuHP -= damage;
        messageDiv.textContent = `You used ${move.name} for ${damage} damage!`;
    } else {
        playerHP -= damage;
        messageDiv.textContent = `CPU used ${move.name} for ${damage} damage!`;

        // Trigger CPU attack animation
        if (robotAnimator) {
            robotAnimator.animateAttack(false, move.name);
        }
    }

    // Apply passive effects at the end of each turn
    applyPassiveEffects();

    updateBattleScreen();

    // Check for game end
    if (playerHP <= 0) {
        endGame(false);
        return;
    } else if (cpuHP <= 0) {
        endGame(true);
        return;
    }

    // Switch turns
    playerTurn = !playerTurn;

    // Ensure UI is updated after turn switch
    updateMoveButtons();

    if (!playerTurn) {
        // CPU's turn - delay before CPU move
        setTimeout(cpuMove, 1500);
    } else {
        // Player's turn - make sure buttons are enabled and message is updated
        messageDiv.textContent = "Your turn! Choose your move.";
        updateMoveButtons();
    }
}

function cpuMove() {
    if (!gameActive || playerTurn) return;

    const availableMoves = MOVES.filter(move => {
        const now = Date.now();
        return cpuCooldowns[move.name] <= now;
    });

    if (availableMoves.length === 0) {
        playerTurn = true;
        updateMoveButtons();
        return;
    }

    const move = availableMoves[randomInt(0, availableMoves.length - 1)];

    // CPU also needs to answer math questions for ALL moves
    showMathQuestion(false, move);
}

// --- Math Question System ---
let pendingMove = null; // Store the move that's waiting for math answer

function showMathQuestion(isPlayer, move = null) {
    if (!mathQuestions || mathQuestions.length === 0) {
        // Fallback if no questions available - execute move directly
        if (isPlayer && move) {
            executeMove(move, playerRobot, cpuRobot, true);
        } else if (!isPlayer && move) {
            executeMove(move, cpuRobot, playerRobot, false);
        }
        return;
    }

    pendingMove = move; // Store the move for later execution
    const question = mathQuestions[randomInt(0, mathQuestions.length - 1)];

    if (!isPlayer) {
        // CPU automatically solves math questions
        messageDiv.textContent = "CPU is solving a math problem...";

        // John Ceenbot has a 75% success rate
        let cpuSuccess = true;
        if (cpuRobot && cpuRobot.name === "John Ceenobot2000") {
            cpuSuccess = true;
        } else {
            cpuSuccess = Math.random() < 0.5; // fallback for other CPUs if ever added
        }

        // Show thinking delay, then resolve
        setTimeout(() => {
            handleMathAnswer(cpuSuccess, isPlayer, question);
        }, 2000); // 2 second delay for CPU "thinking"

        return;
    }

    // Player math question logic
    mathModalActive = true;
    mathQuestion.textContent = question.question;
    mathOptions.innerHTML = "";

    let timeLeft = MATH_TIME_LIMIT;
    mathTime.textContent = timeLeft;

    const timer = setInterval(() => {
        timeLeft--;
        mathTime.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleMathAnswer(false, isPlayer, question);
        }
    }, 1000);

    if (question.type === "mc") {
        // Multiple choice
        const allChoices = [...question.choices];
        shuffleArray(allChoices);

        allChoices.forEach(choice => {
            const btn = document.createElement("button");
            btn.textContent = choice;
            btn.onclick = () => {
                clearInterval(timer);
                handleMathAnswer(choice === question.answer, isPlayer, question);
            };
            mathOptions.appendChild(btn);
        });
    } else {
        // Open answer
        const input = document.createElement("input");
        input.type = "number";
        input.placeholder = "Enter your answer";
        const submitBtn = document.createElement("button");
        submitBtn.textContent = "Submit";

        const checkAnswer = () => {
            clearInterval(timer);
            const userAnswer = parseInt(input.value);
            handleMathAnswer(userAnswer === question.answer, isPlayer, question);
        };

        submitBtn.onclick = checkAnswer;
        input.onkeypress = (e) => {
            if (e.key === "Enter") checkAnswer();
        };

        mathOptions.appendChild(input);
        mathOptions.appendChild(submitBtn);
        input.focus();
    }

    mathModal.style.display = "block";
}

function handleMathAnswer(correct, isPlayer, question) {
    mathModal.style.display = "none";
    mathModalActive = false;

    if (correct) {
        if (isPlayer && pendingMove) {
            // Set cooldown for successful player attack
            const now = Date.now();
            moveCooldowns[pendingMove.name] = now + 6000; // 6 second cooldown

            // Execute the pending move
            executeMove(pendingMove, playerRobot, cpuRobot, true);
        } else if (!isPlayer && pendingMove) {
            // Set cooldown for successful CPU attack
            const now = Date.now();
            cpuCooldowns[pendingMove.name] = now + 6000; // 6 second cooldown

            // Execute the CPU's pending move
            executeMove(pendingMove, cpuRobot, playerRobot, false);
        }
    } else {
        if (isPlayer) {
            messageDiv.textContent = "Wrong answer! You lose your turn.";
            playerTurn = false;
            setTimeout(cpuMove, 1500);
        } else {
            messageDiv.textContent = "CPU got the wrong answer! CPU loses turn.";
            playerTurn = true;
        }
        updateMoveButtons();
    }

    // Clear the pending move
    pendingMove = null;
}

// --- Passive Effects ---
function applyPassiveEffects() {
    let passiveMessage = "";

    // God passive damage (loses 3 HP per round)
    if (isGod(playerRobot)) {
        playerHP -= GOD_PASSIVE_DAMAGE;
        passiveMessage += `${playerRobot.name} loses ${GOD_PASSIVE_DAMAGE} HP from passive damage! `;
    }
    if (isGod(cpuRobot)) {
        cpuHP -= GOD_PASSIVE_DAMAGE;
        passiveMessage += `${cpuRobot.name} loses ${GOD_PASSIVE_DAMAGE} HP from passive damage! `;
    }

    // Demi passive healing (heals 3 HP per round)
    if (isDemibrawler(playerRobot)) {
        const maxHP = getMaxHP(playerRobot);
        const healAmount = Math.min(DEMIbrawler_HEAL, maxHP - playerHP);
        if (healAmount > 0) {
            playerHP += healAmount;
            passiveMessage += `${playerRobot.name} heals ${healAmount} HP! `;
        }
    }
    if (isDemibrawler(cpuRobot)) {
        const maxHP = getMaxHP(cpuRobot);
        const healAmount = Math.min(DEMIbrawler_HEAL, maxHP - cpuHP);
        if (healAmount > 0) {
            cpuHP += healAmount;
            passiveMessage += `${cpuRobot.name} heals ${healAmount} HP! `;
        }
    }

    // Show passive effects message if any occurred
    if (passiveMessage) {
        setTimeout(() => {
            messageDiv.textContent += " " + passiveMessage.trim();
        }, 1000);
    }
}

// --- Game End ---
function endGame(playerWon) {
    gameActive = false;
    battleScreenDiv.style.display = "none";
    endScreen.style.display = "block";

    if (playerWon) {
        endMessage.textContent = "🎉 You Won! 🎉";
    } else {
        endMessage.textContent = "💀 You Lost! 💀";
    }
}

// --- Event Listeners ---
punchBtn.addEventListener("click", () => playerMove("Punch"));
kickBtn.addEventListener("click", () => playerMove("Kick"));
wrestleBtn.addEventListener("click", () => playerMove("Wrestle"));
headbuttBtn.addEventListener("click", () => playerMove("Headbutt"));

playAgainBtn.addEventListener("click", () => {
    showRobotSelection();
});

// Keyboard controls
document.addEventListener("keydown", (e) => {
    if (!gameActive || !playerTurn || mathModalActive) return;

    switch (e.key.toLowerCase()) {
        case "p": playerMove("Punch"); break;
        case "k": playerMove("Kick"); break;
        case "w": playerMove("Wrestle"); break;
        case "h": playerMove("Headbutt"); break;
    }
});

// --- Robot Animator (Enhanced Canvas Drawing with Character Bodies) ---
class RobotAnimator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.playerRobot = null;
        this.cpuRobot = null;
        this.playerHP = 0;
        this.cpuHP = 0;

        // Animation state
        this.animating = false;

        // Robot body parts positions (relative to center)
        this.playerParts = {
            x: 210, y: 120,
            headOffset: { x: 0, y: -18 }, // head sits directly on body
            torsoOffset: { x: 0, y: 0 },
            leftArmOffset: { x: -15, y: -10 },
            rightArmOffset: { x: 15, y: -10 },
            leftLegOffset: { x: -8, y: 25 },
            rightLegOffset: { x: 8, y: 25 },
            shake: 0
        };

        this.cpuParts = {
            x: 290, y: 120,
            headOffset: { x: 0, y: -18 }, // head sits directly on body
            torsoOffset: { x: 0, y: 0 },
            leftArmOffset: { x: -15, y: -10 },
            rightArmOffset: { x: 15, y: -10 },
            leftLegOffset: { x: -8, y: 25 },
            rightLegOffset: { x: 8, y: 25 },
            shake: 0
        };

        // Base positions for reset
        this.playerBase = JSON.parse(JSON.stringify(this.playerParts));
        this.cpuBase = JSON.parse(JSON.stringify(this.cpuParts));

        // Start animation loop
        this.animate();
    }

    setRobots(player, cpu) {
        this.playerRobot = player;
        this.cpuRobot = cpu;
    }

    setHP(playerHP, cpuHP) {
        this.playerHP = playerHP;
        this.cpuHP = cpuHP;
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw wrestling arena background

        // Arena crowd background (dark gradient)
        let grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0, "#222");
        grad.addColorStop(0.5, "#333");
        grad.addColorStop(1, "#111");
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Ring parameters
        const ringX = 80;
        const ringY = 40;
        const ringW = 340;
        const ringH = 140;
        const postR = 10;

        // Draw ring mat
        this.ctx.fillStyle = "#e0eaff";
        this.ctx.strokeStyle = "#b0b8c0";
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.rect(ringX, ringY, ringW, ringH);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw ropes (3 per side, red)
        this.ctx.strokeStyle = "#d32f2f";
        this.ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            let offset = 18 + i * 22;
            // Top
            this.ctx.beginPath();
            this.ctx.moveTo(ringX, ringY + offset);
            this.ctx.lineTo(ringX + ringW, ringY + offset);
            this.ctx.stroke();
            // Bottom
            this.ctx.beginPath();
            this.ctx.moveTo(ringX, ringY + ringH - offset);
            this.ctx.lineTo(ringX + ringW, ringY + ringH - offset);
            this.ctx.stroke();
        }
        // Left and right ropes (verticals)
        for (let i = 0; i < 3; i++) {
            let offset = 18 + i * 22;
            // Left
            this.ctx.beginPath();
            this.ctx.moveTo(ringX + offset, ringY);
            this.ctx.lineTo(ringX + offset, ringY + ringH);
            this.ctx.stroke();
            // Right
            this.ctx.beginPath();
            this.ctx.moveTo(ringX + ringW - offset, ringY);
            this.ctx.lineTo(ringX + ringW - offset, ringY + ringH);
            this.ctx.stroke();
        }

        // Draw corner posts (gray)
        this.ctx.fillStyle = "#888";
        [
            [ringX, ringY],
            [ringX + ringW, ringY],
            [ringX, ringY + ringH],
            [ringX + ringW, ringY + ringH]
        ].forEach(([x, y]) => {
            this.ctx.beginPath();
            this.ctx.arc(x, y, postR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#444";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });

        // Draw robots as characters
        if (this.playerRobot && this.cpuRobot) {
            // Player robot: left, facing right (profile)
            this.drawRobotCharacter(this.playerParts, "#ff4444", true, "right");
            // CPU robot: right, facing left (profile)
            this.drawRobotCharacter(this.cpuParts, "#4444ff", false, "left");
        }
    }

    /**
     * Draws a robot in profile view with a rectangular body, square head, one eye, and a robot mouth.
     * @param {*} parts 
     * @param {*} color 
     * @param {*} isPlayer 
     * @param {"left"|"right"} facing 
     */
    drawRobotCharacter(parts, color, isPlayer, facing) {
        const ctx = this.ctx;
        const centerX = parts.x + parts.shake;
        const centerY = parts.y;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        // Profile direction: 1 for right, -1 for left
        const dir = facing === "right" ? 1 : -1;

        // --- Body (rectangle) ---
        const bodyWidth = 18;
        const bodyHeight = 36;
        const bodyX = centerX + parts.torsoOffset.x - (bodyWidth / 2);
        const bodyY = centerY + parts.torsoOffset.y;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.rect(bodyX, bodyY, bodyWidth, bodyHeight);
        ctx.fill();
        ctx.stroke();

        // --- Head (square, flush with body) ---
        const headSize = 28;
        const headX = centerX + parts.headOffset.x - (dir === 1 ? 0 : headSize);
        const headY = bodyY - headSize; // head sits directly on body
        ctx.beginPath();
        ctx.rect(headX, headY, headSize, headSize);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // --- Eye (one, as a circle) ---
        ctx.beginPath();
        const eyeRadius = 4;
        // Eye is on the side facing the center
        const eyeX = headX + (dir === 1 ? headSize - 7 : 7);
        const eyeY = headY + 9;
        ctx.fillStyle = "#fff";
        ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- Mouth (rectangle or line) ---
        ctx.beginPath();
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 2;
        // Simple horizontal mouth, lower half of head
        const mouthX = headX + (dir === 1 ? headSize - 16 : 8);
        const mouthY = headY + headSize - 8;
        ctx.moveTo(mouthX, mouthY);
        ctx.lineTo(mouthX + 8, mouthY);
        ctx.stroke();

        // --- Arms (bent, touching at center) ---
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        // Shoulder position (side of body facing center)
        const shoulderY = bodyY + 10;
        const shoulderX = dir === 1 ? bodyX + bodyWidth : bodyX;

        // Arm 1 (upper)
        // Elbow is offset up and out, hand meets at center
        const elbow1X = shoulderX + dir * 16;
        const elbow1Y = shoulderY - 10;
        const hand1X = shoulderX + dir * 32;
        const hand1Y = shoulderY;
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(elbow1X, elbow1Y);
        ctx.lineTo(hand1X, hand1Y);
        ctx.stroke();

        // Arm 2 (lower)
        // Elbow is offset down and out, hand meets at center
        const elbow2X = shoulderX + dir * 16;
        const elbow2Y = shoulderY + 20;
        const hand2X = shoulderX + dir * 32;
        const hand2Y = shoulderY + 10;
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY + 10);
        ctx.lineTo(elbow2X, elbow2Y);
        ctx.lineTo(hand2X, hand2Y);
        ctx.stroke();

        // --- Legs (black, keep as lines, but connect to body) ---
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        // Left leg
        ctx.beginPath();
        ctx.moveTo(bodyX + 5, bodyY + bodyHeight);
        ctx.lineTo(bodyX - 2, bodyY + bodyHeight + 18);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(bodyX + bodyWidth - 5, bodyY + bodyHeight);
        ctx.lineTo(bodyX + bodyWidth + 2, bodyY + bodyHeight + 18);
        ctx.stroke();

        ctx.restore();
    }

    drawIdle() {
        // Reset to idle positions
        this.playerParts = JSON.parse(JSON.stringify(this.playerBase));
        this.cpuParts = JSON.parse(JSON.stringify(this.cpuBase));
    }

    animateAttack(isPlayer, moveType) {
        if (this.animating) return;
        this.animating = true;

        const attackerParts = isPlayer ? this.playerParts : this.cpuParts;
        const defenderParts = isPlayer ? this.cpuParts : this.playerParts;
        const baseParts = isPlayer ? this.playerBase : this.cpuBase;

        switch (moveType) {
            case "Punch":
                this.animatePunch(attackerParts, baseParts, isPlayer);
                break;
            case "Kick":
                this.animateKick(attackerParts, baseParts, isPlayer);
                break;
            case "Wrestle":
                this.animateWrestle(attackerParts, defenderParts, baseParts, isPlayer);
                break;
            case "Headbutt":
                this.animateHeadbutt(attackerParts, defenderParts, baseParts, isPlayer);
                break;
        }

        // After animation, trigger damage effect
        setTimeout(() => {
            this.animateDamage(!isPlayer);
        }, 600);
    }

    animatePunch(attackerParts, baseParts, isPlayer) {
        const armToExtend = isPlayer ? 'rightArmOffset' : 'leftArmOffset';
        const originalArm = { ...baseParts[armToExtend] };

        // Extend arm toward opponent
        const targetX = originalArm.x + (isPlayer ? 25 : -25);

        this.animateBodyPart(attackerParts, armToExtend,
            { x: targetX, y: originalArm.y },
            300, () => {
                // Return to original position
                this.animateBodyPart(attackerParts, armToExtend, originalArm, 200, () => {
                    this.animating = false;
                });
            });
    }

    animateKick(attackerParts, baseParts, isPlayer) {
        const legToRaise = isPlayer ? 'rightLegOffset' : 'leftLegOffset';
        const originalLeg = { ...baseParts[legToRaise] };

        // Raise and extend leg
        const targetX = originalLeg.x + (isPlayer ? 20 : -20);
        const targetY = originalLeg.y - 15;

        this.animateBodyPart(attackerParts, legToRaise,
            { x: targetX, y: targetY },
            400, () => {
                // Return to original position
                this.animateBodyPart(attackerParts, legToRaise, originalLeg, 250, () => {
                    this.animating = false;
                });
            });
    }

    animateWrestle(attackerParts, defenderParts, baseParts, isPlayer) {
        // Move both robots toward center and animate all limbs
        const originalAttackerX = attackerParts.x;
        const originalDefenderX = defenderParts.x;
        const moveDistance = 30;

        // Move robots toward each other
        attackerParts.x += isPlayer ? moveDistance : -moveDistance;
        defenderParts.x += isPlayer ? -moveDistance : moveDistance;

        // Animate limbs in grappling motion
        const originalLeftArm = { ...baseParts.leftArmOffset };
        const originalRightArm = { ...baseParts.rightArmOffset };

        attackerParts.leftArmOffset.x += isPlayer ? 10 : -10;
        attackerParts.rightArmOffset.x += isPlayer ? 10 : -10;
        attackerParts.leftArmOffset.y -= 5;
        attackerParts.rightArmOffset.y -= 5;

        setTimeout(() => {
            // Return to original positions
            attackerParts.x = originalAttackerX;
            defenderParts.x = originalDefenderX;
            attackerParts.leftArmOffset = originalLeftArm;
            attackerParts.rightArmOffset = originalRightArm;
            this.animating = false;
        }, 800);
    }

    animateHeadbutt(attackerParts, defenderParts, baseParts, isPlayer) {
        const originalAttackerHead = { ...attackerParts.headOffset };
        const originalDefenderHead = { ...defenderParts.headOffset };

        // Move heads toward each other
        const headMoveDistance = 20;
        attackerParts.headOffset.x += isPlayer ? headMoveDistance : -headMoveDistance;
        defenderParts.headOffset.x += isPlayer ? -headMoveDistance : headMoveDistance;

        setTimeout(() => {
            // Collision effect - both heads recoil
            attackerParts.headOffset.x -= isPlayer ? 10 : -10;
            defenderParts.headOffset.x -= isPlayer ? -10 : 10;

            setTimeout(() => {
                // Return to original positions
                attackerParts.headOffset = originalAttackerHead;
                defenderParts.headOffset = originalDefenderHead;
                this.animating = false;
            }, 300);
        }, 400);
    }

    animateBodyPart(robotParts, partName, targetOffset, duration, onComplete) {
        const startOffset = { ...robotParts[partName] };
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            robotParts[partName].x = startOffset.x + (targetOffset.x - startOffset.x) * easeProgress;
            robotParts[partName].y = startOffset.y + (targetOffset.y - startOffset.y) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (onComplete) {
                onComplete();
            }
        };

        animate();
    }

    animateDamage(isPlayer) {
        const targetParts = isPlayer ? this.playerParts : this.cpuParts;

        // Shake effect
        const originalShake = targetParts.shake;
        let shakeIntensity = 8;
        let shakeCount = 0;
        const maxShakes = 6;

        const shakeInterval = setInterval(() => {
            targetParts.shake = (shakeCount % 2 === 0) ? shakeIntensity : -shakeIntensity;
            shakeIntensity *= 0.8; // Reduce intensity each shake
            shakeCount++;

            if (shakeCount >= maxShakes) {
                clearInterval(shakeInterval);
                targetParts.shake = originalShake;
            }
        }, 80);
    }
}

// --- Initialize ---
// Math questions are now available from mathQuestions.js
showRobotSelection();
