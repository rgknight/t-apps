/**
* Game Selector Home Screen
* Dynamically loads the selected game module.
*/

document.addEventListener("DOMContentLoaded", () => {
    // Hide all game-specific UI elements initially
    hideGameUI();

    // Create the selector overlay
    const selectorOverlay = document.createElement("div");
    selectorOverlay.id = "gameSelectorOverlay";
    selectorOverlay.style.position = "fixed";
    selectorOverlay.style.top = "0";
    selectorOverlay.style.left = "0";
    selectorOverlay.style.width = "100vw";
    selectorOverlay.style.height = "100vh";
    selectorOverlay.style.background = "rgba(30,30,30,0.96)";
    selectorOverlay.style.zIndex = "2000";
    selectorOverlay.style.display = "flex";
    selectorOverlay.style.flexDirection = "column";
    selectorOverlay.style.alignItems = "center";
    selectorOverlay.style.justifyContent = "center";

    // Title
    const title = document.createElement("h1");
    title.textContent = "Select a Game";
    title.style.color = "#fff";
    title.style.marginBottom = "32px";
    selectorOverlay.appendChild(title);

    // Game buttons
    const games = [
        {
            name: "F1 Racer",
            file: "f1racer.js"
        }
        // Add more games here as { name, file }
    ];

    games.forEach(game => {
        const btn = document.createElement("button");
        btn.textContent = game.name;
        btn.style.fontSize = "1.4em";
        btn.style.padding = "16px 48px";
        btn.style.margin = "12px 0";
        btn.style.borderRadius = "8px";
        btn.style.border = "none";
        btn.style.background = "#1976d2";
        btn.style.color = "#fff";
        btn.style.cursor = "pointer";
        btn.onmouseenter = () => btn.style.background = "#1565c0";
        btn.onmouseleave = () => btn.style.background = "#1976d2";
        btn.onclick = () => {
            // Remove selector overlay
            selectorOverlay.remove();
            // Dynamically load the selected game script
            loadGameScript(game.file);
        };
        selectorOverlay.appendChild(btn);
    });

    document.body.appendChild(selectorOverlay);
});

/**
 * Hides all F1 Racer-specific UI elements on the page.
 * Extend this function as new games are added.
 */
function hideGameUI() {
    const ids = [
        "modeOverlay",
        "levelDisplay",
        "timer",
        "gameCanvas",
        "carColorPicker",
        "carColorPicker2",
        "message"
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    // Hide F1 Racer title
    const h1s = document.getElementsByTagName("h1");
    for (let h1 of h1s) {
        if (h1.textContent && h1.textContent.toLowerCase().includes("f1 racer")) {
            h1.style.display = "none";
        }
    }
}

/**
 * Dynamically loads a JS file and calls its window.startGameSelectorInit() if present.
 */
function loadGameScript(src) {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
        console.log("Loaded script:", src);
        // Optionally, call a standard init function if the game exposes one
        if (typeof window.startGame === "function") {
            console.log("Calling window.startGame()");
            window.startGame();
        } else {
            console.log("window.startGame is not a function after loading", src);
        }
    };
    document.body.appendChild(script);
}
