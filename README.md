# Knight-Games

A collection of browser-based games featuring fast-paced action and strategic gameplay. Choose your quest and dive into exciting adventures!

## Games Collection

### F1 Racer (Infinity Racer)
A fast-paced, procedurally generated top-down racing game for 1 or 2 players.

### Robot Brawler
A turn-based combat game where you select a robot fighter and battle against John Ceenobot2000 in mathematical combat challenges.

---

## F1 Racer (Infinity Racer)

### Features
- **Single Player and Two Player Modes**: Race solo or compete head-to-head on the same keyboard.
- **Procedurally Generated Tracks**: Each level features a new, unique track layout with increasing difficulty.
- **Obstacles**: Dodge randomly placed obstacles on the track.
- **Jump Mechanic**: Jump over obstacles and track edges (with cooldown).
- **Car Customization**: Choose your car color for both players.
- **Level Progression**: Advance to higher levels as you finish races. The track gets narrower and more challenging.
- **Timer and Recent Times**: Track your best times for each session.
- **Keyboard Controls**: Optimized for two players on one keyboard.

### Controls
#### Player 1
- **Steer:** Arrow Keys
- **Jump:** Space

#### Player 2 (Two Player Mode)
- **Steer:** W (up), A (left), S (down), D (right)
- **Jump:** F

### How to Play
1. **Choose Single Player or Two Player mode** in the overlay.
2. **Customize your car color(s)** using the color pickers.
3. **Race to the finish line!** Avoid obstacles and stay on the track.
4. **Use your jump key** to leap over obstacles or track edges (watch for cooldown).
5. **Advance to the next level** after finishing, or try again if you crash.

### Objective
Complete each procedurally generated track as quickly as possible. In two player mode, compete to see who finishes first!

---

## Robot Brawler

### Features
- **5 Unique Robot Fighters**: Choose from Bolt, Crusher, Titan, God, and Demi brawlers, each with unique abilities and weaknesses.
- **Mathematical Combat System**: Answer math questions correctly to execute your attacks successfully.
- **Turn-Based Strategy**: Plan your moves carefully using Punch, Kick, Wrestle, and Headbutt attacks.
- **Special Robot Abilities**: 
  - **God Brawler**: High HP (150) but takes passive damage each turn and is vulnerable to Headbutt attacks.
  - **Demi Brawler**: Moderate HP (105) with passive healing each turn and reduced damage from all attacks.
  - **Standard Brawlers**: Each has a specific weakness that deals extra damage.
- **Animated Combat**: Watch your robot fighters battle in a wrestling ring with detailed animations.
- **Cooldown System**: Strategic timing with 6-second cooldowns on successful attacks.

### Controls
- **P**: Punch
- **K**: Kick  
- **W**: Wrestle
- **H**: Headbutt
- **Mouse**: Click buttons and answer math questions

### How to Play
1. **Enter your player name** and **select your robot fighter**.
2. **Choose your attacks** strategically based on your opponent's weaknesses.
3. **Answer math questions correctly** to execute your attacks (30-second time limit).
4. **Manage cooldowns** - successful attacks have a 6-second cooldown period.
5. **Watch for passive effects** - God brawlers lose HP each turn, Demi brawlers heal each turn.
6. **Defeat John Ceenobot2000** by reducing his HP to zero while keeping yours above zero.

### Robot Types
- **Bolt Brawler** 🤖 - Weak to: Punch
- **Crusher Brawler** 🦾 - Weak to: Kick  
- **Titan Brawler** 🛡️ - Weak to: Wrestle
- **God Brawler** 👾 - Weak to: Headbutt (150 HP, passive damage)
- **Demi Brawler** 🦿 - No weakness (105 HP, passive healing)

### Objective
Defeat the CPU opponent (John Ceenobot2000) in mathematical combat by strategically choosing attacks and correctly solving math problems!

---

## Getting Started

1. **Open `index.html` in your browser.**
2. **Choose your game** from the main menu.
3. **Follow the specific game instructions** above.
4. **Have fun!**

## File Structure

- `index.html` – Home page with links to all games
- `games/f1racer/f1racer.html` – F1 Racer game page
- `games/f1racer/f1racer.js` – F1 Racer game logic
- `games/robotbrawler/robotbrawler.html` – Robot Brawler game page
- `games/robotbrawler/robotbrawler.js` – Robot Brawler game logic
- `shared/style.css` – Shared styling for all games
- `shared/gameSelector.js` – Dynamic game selection logic
- `shared/mathQuestions.js` – Math questions for Robot Brawler
- `assets/` – Images and media files
- `README.md` – Project documentation
- `.gitignore` – Git ignore file

## Requirements

- Modern web browser (Chrome, Firefox, Edge, Safari)
- No installation required

## Credits

Developed by TKM.
