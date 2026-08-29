// =============================================================
// Snake Game - game.js (Settings + Samosa + Beep)
// =============================================================

(() => {
    "use strict";

    // --- Constants ---
    var CELL_SIZE = 20;
    var GRID_SIZE = 25;   // Default: Large
    var CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
    var POINTS_PER_FOOD = 10;
    var SPEED_STEP = 1;

    // --- Config ---
    var config = {
        showGrid: true,
        wallWrap: true,
        baseInterval: 125,
        minInterval: 90,
        colors: {
            bg: "#0d0d0d",
            grid: "#161616",
            border: "#00ff88",
            snakeHead: "#00ff88",
            snakeBody: "#00cc6a",
            snakeGlow: "#00ff88",
            samosa: "#D4943A",
            samosaCrisp: "#B8781E",
        }
    };

    // Speed presets: [baseInterval, minInterval, label]
    var speedPresets = {
        1: [220, 150, "Slow"],
        2: [180, 120, "Easy"],
        3: [150, 95, "Normal"],
        4: [120, 75, "Fast"],
        5: [90, 55, "Insane"]
    };

    // Color presets
    var colorPresets = {
        neon: {
            snakeHead: "#00ff88", snakeBody: "#00cc6a", snakeGlow: "#00ff88",
            bg: "#0d0d0d", grid: "#161616", border: "#00ff88"
        },
        cyber: {
            snakeHead: "#ff00ff", snakeBody: "#cc00cc", snakeGlow: "#ff00ff",
            bg: "#1a0a2e", grid: "#251540", border: "#ff00ff"
        },
        ocean: {
            snakeHead: "#00d4ff", snakeBody: "#0099bb", snakeGlow: "#00d4ff",
            bg: "#0a1628", grid: "#0f1f3a", border: "#00d4ff"
        },
        fire: {
            snakeHead: "#ff6600", snakeBody: "#cc4400", snakeGlow: "#ff6600",
            bg: "#1a0a00", grid: "#2a1500", border: "#ff6600"
        },
        retro: {
            snakeHead: "#33ff33", snakeBody: "#22aa22", snakeGlow: "#33ff33",
            bg: "#000000", grid: "#0a0a0a", border: "#33ff33"
        },
        pakistan: {
            snakeHead: "#FFFFFF", snakeBody: "#CCCCCC", snakeGlow: "#FFFFFF",
            bg: "#01411C", grid: "#025a27", border: "#FFFFFF"
        }
    };

    // --- Direction vectors ---
    var DIR = {
        UP:    { x:  0, y: -1 },
        DOWN:  { x:  0, y:  1 },
        LEFT:  { x: -1, y:  0 },
        RIGHT: { x:  1, y:  0 },
    };

    // --- Audio: beep via Web Audio API ---
    var audioCtx = null;

    function playBeep() {
        // Create AudioContext lazily (browsers require user gesture)
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = "square";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);        // A5
        osc.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.04); // quick rise

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.12);
    }

    function playHiss() {
        if (!audioCtx) return;

        var bufferSize = audioCtx.sampleRate * 0.2; // 200ms hiss
        var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        var noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        var filter = audioCtx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.setValueAtTime(5000, audioCtx.currentTime);

        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        noise.start();
        noise.stop(audioCtx.currentTime + 0.2);
    }

    function playDeathSound() {
        if (!audioCtx) return;

        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = "sawtooth";
        // Start at a medium pitch and slide down rapidly
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.4); // Slide down to A2

        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
    }

    function playTurnBeep() {
        if (!audioCtx) return;

        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = "square";
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.05);
    }

    // --- DOM References ---
    var canvas = document.getElementById("game-canvas");
    var ctx = canvas.getContext("2d");
    var scoreEl = document.getElementById("score");
    var highScoreEl = document.getElementById("high-score");
    var overlay = document.getElementById("overlay");
    var overlayTitle = document.getElementById("overlay-title");
    var overlayMessage = document.getElementById("overlay-message");
    var overlaySub = document.getElementById("overlay-sub");

    // Settings DOM
    var elGridSizeSelect = document.getElementById("grid-size-select");
    var elToggleGrid = document.getElementById("toggle-grid");
    var elToggleWalls = document.getElementById("toggle-walls");
    var elSpeedSlider = document.getElementById("speed-slider");
    var elSpeedLabel = document.getElementById("speed-label");
    var elColorSamosa = document.getElementById("color-samosa");
    var elColorSamosaCrisp = document.getElementById("color-samosa-crisp");
    var elResetBtn = document.getElementById("reset-btn");

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // --- Game State ---
    var snake, prevSnake, direction, food, score, highScore;
    var visualDirection, inputQueue = [];
    var gameState;
    var lastTick, tickInterval;
    var animFrame;
    var foodPulse = 0;


    // --- Ambient Background Snake (Exact Game Style) ---
    var bgCanvas = document.getElementById("bg-canvas");
    var bgCtx = bgCanvas ? bgCanvas.getContext("2d") : null;

    var BG_CELL_SIZE = 22;
    var bgSnakes = [];

    function createBgSnake() {
        var length = 15 + Math.floor(Math.random() * 15);
        var startGy = Math.floor(Math.random() * (window.innerHeight / BG_CELL_SIZE));
        var startGx = Math.floor(Math.random() * (window.innerWidth / BG_CELL_SIZE));
        var body = [];
        var dir = { x: 1, y: 0 };

        for (var i = 0; i < length; i++) {
            body.push({ x: startGx - i, y: startGy });
        }

        return {
            body: body,
            length: length,
            dir: dir,
            lastMoveTime: performance.now(),
            moveInterval: 80 + Math.floor(Math.random() * 40),
            turnTimer: 0
        };
    }

    function resizeBgCanvas() {
        if (!bgCanvas) return;
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }

    function initBgSnake() {
        if (!bgCanvas || !bgCtx) return;
        resizeBgCanvas();
        window.addEventListener("resize", resizeBgCanvas);

        bgSnakes = [];
        for (var i = 0; i < 2; i++) {
            bgSnakes.push(createBgSnake());
        }

        requestAnimationFrame(updateBgSnake);
    }

    function updateBgSnake(timestamp) {
        if (!bgCanvas || !bgCtx) return;

        var w = bgCanvas.width;
        var h = bgCanvas.height;
        var cols = Math.ceil(w / BG_CELL_SIZE) + 4;
        var rows = Math.ceil(h / BG_CELL_SIZE);

        bgCtx.clearRect(0, 0, w, h);

        bgSnakes.forEach(function(bgSnake) {
            if (timestamp - bgSnake.lastMoveTime >= bgSnake.moveInterval) {
                bgSnake.lastMoveTime = timestamp;

                // Randomly turn or steer near edges
                bgSnake.turnTimer++;
                var head = bgSnake.body[0];

                if (bgSnake.turnTimer > 4 + Math.floor(Math.random() * 8)) {
                    bgSnake.turnTimer = 0;
                    var possibleDirs = [];

                    if (bgSnake.dir.x !== 0) {
                        possibleDirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }];
                        // Prefer direction towards center if near edge
                        if (head.y < 3) possibleDirs = [{ x: 0, y: 1 }];
                        if (head.y > rows - 4) possibleDirs = [{ x: 0, y: -1 }];
                    } else {
                        possibleDirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }];
                        if (head.x < 3) possibleDirs = [{ x: 1, y: 0 }];
                        if (head.x > cols - 5) possibleDirs = [{ x: -1, y: 0 }];
                    }

                    // 60% chance to turn
                    if (Math.random() < 0.6 && possibleDirs.length > 0) {
                        bgSnake.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                    }
                }

                // Calculate new head
                var nextHead = {
                    x: head.x + bgSnake.dir.x,
                    y: head.y + bgSnake.dir.y
                };

                // Wrap bounds horizontally & vertically
                if (nextHead.x > cols) nextHead.x = -2;
                else if (nextHead.x < -4) nextHead.x = cols;
                if (nextHead.y >= rows) nextHead.y = 0;
                else if (nextHead.y < 0) nextHead.y = rows - 1;

                bgSnake.body.unshift(nextHead);
                if (bgSnake.body.length > bgSnake.length) {
                    bgSnake.body.pop();
                }
            }

            // Draw background snake using exact game snake roundRect style
            for (var j = bgSnake.body.length - 1; j >= 0; j--) {
                var seg = bgSnake.body[j];
                var px = seg.x * BG_CELL_SIZE;
                var py = seg.y * BG_CELL_SIZE;
                var pad = 1;

                bgCtx.save();
                if (j === 0) {
                    // Head - exact game head style
                    bgCtx.shadowColor = hexToRgba(config.colors.snakeGlow, 0.5);
                    bgCtx.shadowBlur = 12;
                    bgCtx.fillStyle = config.colors.snakeHead;
                    roundRect(bgCtx, px + pad, py + pad, BG_CELL_SIZE - pad * 2, BG_CELL_SIZE - pad * 2, 3);
                    bgCtx.fill();
                } else {
                    // Body - exact game body style & gradient
                    var alpha = 0.4 + 0.6 * ((bgSnake.body.length - j) / bgSnake.body.length);
                    bgCtx.fillStyle = config.colors.snakeBody;
                    bgCtx.globalAlpha = alpha;
                    roundRect(bgCtx, px + pad, py + pad, BG_CELL_SIZE - pad * 2, BG_CELL_SIZE - pad * 2, 2);
                    bgCtx.fill();
                }
                bgCtx.restore();
            }
        });

        requestAnimationFrame(updateBgSnake);
    }

    // --- Initialization ---
    function init() {
        highScore = parseInt(localStorage.getItem("snake-high-score") || "0", 10);
        highScoreEl.textContent = highScore;
        applyBorderColor();
        showOverlay("SNAKE", "Press Spacebar to start", "Use Arrow Keys or WASD to move");
        gameState = "start";
        resetGame();
        draw();
        initBgSnake();
    }

    function resetGame() {
        var mid = Math.floor(GRID_SIZE / 2);
        snake = [
            { x: mid, y: mid },
            { x: mid - 1, y: mid },
            { x: mid - 2, y: mid },
        ];
        prevSnake = snake.map(function(s) { return {x: s.x, y: s.y}; });
        direction = DIR.RIGHT;
        visualDirection = DIR.RIGHT;
        score = 0;
        scoreEl.textContent = "0";
        var sp = speedPresets[parseInt(elSpeedSlider.value)] || speedPresets[3];
        config.baseInterval = sp[0];
        config.minInterval = sp[1];
        tickInterval = config.baseInterval;
        placeFood();
    }

    // --- Food ---
    function placeFood() {
        var occupied = {};
        for (var i = 0; i < snake.length; i++) {
            occupied[snake[i].x + "," + snake[i].y] = true;
        }
        var pos;
        var attempts = 0;
        do {
            pos = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
            attempts++;
        } while (occupied[pos.x + "," + pos.y] && attempts < 1000);
        food = pos;
    }

    // --- Overlay ---
    function showOverlay(title, message, sub) {
        overlayTitle.textContent = title;
        overlayMessage.textContent = message;
        overlaySub.textContent = sub || "";
        overlay.classList.remove("hidden");
    }

    function hideOverlay() {
        overlay.classList.add("hidden");
    }

    // --- Score ---
    function addScore() {
        score += POINTS_PER_FOOD;
        scoreEl.textContent = score;

        scoreEl.classList.add("bump");
        setTimeout(function() { scoreEl.classList.remove("bump"); }, 150);

        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem("snake-high-score", String(highScore));
        }

        tickInterval = Math.max(config.minInterval, tickInterval - SPEED_STEP);
    }

    // --- Game Logic ---
    function update() {
        // Fast clone for performance
        prevSnake = snake.map(function(s) { return {x: s.x, y: s.y}; });

        // Process the next buffered input from the queue
        if (inputQueue.length > 0) {
            var newDir = inputQueue.shift();
            if (newDir.x !== direction.x || newDir.y !== direction.y) {
                playTurnBeep();
            }
            direction = newDir;
            visualDirection = direction;
        }

        var head = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y,
        };

        if (config.wallWrap) {
            if (head.x < 0) head.x = GRID_SIZE - 1;
            else if (head.x >= GRID_SIZE) head.x = 0;
            if (head.y < 0) head.y = GRID_SIZE - 1;
            else if (head.y >= GRID_SIZE) head.y = 0;
        } else {
            if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
                gameOver();
                return;
            }
        }

        for (var i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                gameOver();
                return;
            }
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            playBeep();
            addScore();
            placeFood();
        } else {
            snake.pop();
        }

        // Randomly hiss occasionally during movement
        if (Math.random() < 0.003) {
            playHiss();
        }
    }

    function gameOver() {
        gameState = "gameover";
        playDeathSound();
        cancelAnimationFrame(animFrame);
        showOverlay("GAME OVER", "Score: " + score, "Press Spacebar to restart");
    }

    // --- Draw Samosa ---
    function drawSamosa(cx, cy, size) {
        var s = size * 0.45;
        ctx.save();

        foodPulse += 0.05;
        var bounceOffset = Math.sin(foodPulse) * 4;
        var currentCy = cy + bounceOffset;

        var glowSize = 8 + Math.sin(foodPulse) * 4;
        ctx.shadowColor = "rgba(212, 148, 58, 0.6)";
        ctx.shadowBlur = glowSize;

        // Steam Effect
        ctx.shadowBlur = 0;
        for (var i = 0; i < 3; i++) {
            var steamOffset = (foodPulse * 0.5) + (i * 1.2);
            var steamY = (steamOffset % 2) * 15;
            var steamX = Math.sin(foodPulse + i) * 5;
            var alpha = 1 - (steamY / 30);

            ctx.beginPath();
            ctx.fillStyle = "rgba(255, 255, 255, " + (alpha * 0.3) + ")";
            ctx.arc(cx + steamX, currentCy - s - steamY, 2 + Math.sin(foodPulse + i) * 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Improved Samosa Shape (plumper, less perfect triangle)
        ctx.beginPath();
        ctx.moveTo(cx, currentCy - s); // Top
        ctx.bezierCurveTo(cx - s * 0.6, currentCy - s * 0.2, cx - s * 1.1, currentCy + s * 0.5, cx - s * 0.9, currentCy + s * 0.7); // Left side
        ctx.lineTo(cx + s * 0.9, currentCy + s * 0.7); // Bottom
        ctx.bezierCurveTo(cx + s * 1.1, currentCy + s * 0.5, cx + s * 0.6, currentCy - s * 0.2, cx, currentCy - s); // Right side
        ctx.closePath();

        var grad = ctx.createLinearGradient(cx - s, currentCy - s, cx + s, currentCy + s);
        grad.addColorStop(0, config.colors.samosa);
        grad.addColorStop(0.6, config.colors.samosaCrisp);
        grad.addColorStop(1, config.colors.samosa);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = config.colors.samosaCrisp;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Detail lines (folding/crispiness)
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 0.7;
        ctx.moveTo(cx, currentCy - s * 0.6);
        ctx.lineTo(cx - s * 0.15, currentCy + s * 0.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, currentCy - s * 0.6);
        ctx.lineTo(cx + s * 0.2, currentCy + s * 0.45);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(180,120,30,0.5)";
        ctx.lineWidth = 0.5;
        var crimpCount = 3;
        for (var i = 1; i <= crimpCount; i++) {
            var t = i / (crimpCount + 1);
            var lx = cx + (cx - s * 0.9 - cx) * t;
            var ly = (currentCy - s) + ((currentCy + s * 0.7) - (currentCy - s)) * t;
            ctx.moveTo(lx - 1, ly - 1);
            ctx.lineTo(lx + 1, ly + 1);
        }
        ctx.stroke();

        ctx.restore();
    }

    // --- Drawing ---
    // --- Drawing ---
    function draw(timestamp) {
        ctx.fillStyle = config.colors.bg;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        if (config.showGrid) {
            ctx.strokeStyle = config.colors.grid;
            ctx.lineWidth = 0.5;
            for (var i = 1; i < GRID_SIZE; i++) {
                var pos = i * CELL_SIZE;
                ctx.beginPath();
                ctx.moveTo(pos, 0);
                ctx.lineTo(pos, CANVAS_SIZE);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, pos);
                ctx.lineTo(CANVAS_SIZE, pos);
                ctx.stroke();
            }
        }

        if (food) {
            var fx = food.x * CELL_SIZE + CELL_SIZE / 2;
            var fy = food.y * CELL_SIZE + CELL_SIZE / 2;
            drawSamosa(fx, fy, CELL_SIZE);
        }

        // --- Smooth Snake Rendering ---
        var t = 0;
        if (gameState === "playing" && lastTick) {
            t = (timestamp - lastTick) / tickInterval;
            if (t > 1) t = 1;
        }

        var visualPoints = [];
        for (var j = 0; j < snake.length; j++) {
            var curr = snake[j];
            var prev = (prevSnake && prevSnake[j]) ? prevSnake[j] : curr;

            var vx = prev.x;
            var vy = prev.y;

            if (config.wallWrap) {
                if (Math.abs(curr.x - prev.x) > 1) {
                    if (curr.x < prev.x) vx = prev.x - GRID_SIZE;
                    else if (curr.x > prev.x) vx = prev.x + GRID_SIZE;
                }
                if (Math.abs(curr.y - prev.y) > 1) {
                    if (curr.y < prev.y) vy = prev.y - GRID_SIZE;
                    else if (curr.y > prev.y) vy = prev.y + GRID_SIZE;
                }
            }

            var interpX = (vx + (curr.x - vx) * t) * CELL_SIZE + CELL_SIZE / 2;
            var interpY = (vy + (curr.y - vy) * t) * CELL_SIZE + CELL_SIZE / 2;
            visualPoints.push({ x: interpX, y: interpY });
        }

        // Draw Body as a smooth line
        if (visualPoints.length > 1) {
            ctx.save();
            ctx.strokeStyle = config.colors.snakeBody;
            ctx.lineWidth = CELL_SIZE * 0.8;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            ctx.beginPath();
            ctx.moveTo(visualPoints[0].x, visualPoints[0].y);

            for (var k = 1; k < visualPoints.length; k++) {
                var p1 = visualPoints[k - 1];
                var p2 = visualPoints[k];

                if (config.wallWrap) {
                    var dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                    if (dist > CANVAS_SIZE / 2) {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(p2.x, p2.y);
                        continue;
                    }
                }

                // Use quadratic curves for all but the last segment to smooth out turns
                if (k < visualPoints.length - 1) {
                    var p3 = visualPoints[k + 1];
                    var midX = (p2.x + p3.x) / 2;
                    var midY = (p2.y + p3.y) / 2;

                    var distNext = config.wallWrap ?
                        Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2)) : 0;

                    if (distNext < CANVAS_SIZE / 2) {
                        ctx.quadraticCurveTo(p2.x, p2.y, midX, midY);
                    } else {
                        ctx.lineTo(p2.x, p2.y);
                    }
                } else {
                    ctx.lineTo(p2.x, p2.y);
                }
            }
            ctx.stroke();
            ctx.restore();
        }

        // Draw Head
        if (visualPoints.length > 0) {
            var headPos = visualPoints[0];
            ctx.save();
            ctx.translate(headPos.x, headPos.y);

            var faceAngle = 0;
            if (visualDirection.x === 1) faceAngle = 0;
            else if (visualDirection.y === 1) faceAngle = Math.PI / 2;
            else if (visualDirection.x === -1) faceAngle = Math.PI;
            else if (visualDirection.y === -1) faceAngle = -Math.PI / 2;
            ctx.rotate(faceAngle);

            ctx.shadowColor = hexToRgba(config.colors.snakeGlow, 0.4);
            ctx.shadowBlur = 10;
            ctx.fillStyle = config.colors.snakeHead;
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Tongue Animation
            var tongueLen = 0;
            var flickCycle = (foodPulse * 1.5) % (Math.PI * 2);

            // Quick flick: tongue comes out rapidly and retracts
            if (flickCycle < 0.6) {
                tongueLen = (flickCycle / 0.6) * 12;
            } else if (flickCycle < 1.0) {
                tongueLen = 12 * (1 - (flickCycle - 0.6) / 0.4);
            }

            if (tongueLen > 0) {
                ctx.strokeStyle = "#ff4466";
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(10 + tongueLen, 0);
                ctx.stroke();

                // More organic forked end
                var forkSize = tongueLen * 0.2;
                ctx.beginPath();
                ctx.moveTo(10 + tongueLen, 0);
                ctx.quadraticCurveTo(10 + tongueLen + 2, -forkSize, 12 + tongueLen, -forkSize);
                ctx.moveTo(10 + tongueLen, 0);
                ctx.quadraticCurveTo(10 + tongueLen + 2, forkSize, 12 + tongueLen, forkSize);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    function hexToRgba(hex, alpha) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    }

    // --- Game Loop ---
    function gameLoop(timestamp) {
        if (gameState !== "playing") return;

        if (timestamp - lastTick >= tickInterval) {
            lastTick = timestamp;
            update();
            if (gameState !== "playing") return;
        }

        draw(timestamp);
        animFrame = requestAnimationFrame(gameLoop);
    }

    function startGame() {
        resetGame();
        hideOverlay();
        gameState = "playing";
        lastTick = performance.now();
        animFrame = requestAnimationFrame(gameLoop);
    }

    // --- Input: Keyboard ---
    function handleDirection(newDir) {
        // Check against the last direction in the queue, or current direction if queue is empty
        var lastDir = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : direction;
        if (newDir.x + lastDir.x === 0 && newDir.y + lastDir.y === 0) return;

        // Buffer the input to eliminate latency and allow rapid turns
        inputQueue.push(newDir);
        if (inputQueue.length > 3) inputQueue.shift(); // Limit queue to prevent "ghost" movements

        // Update visual direction immediately for instant feedback
        visualDirection = newDir;
    }

    document.addEventListener("keydown", function(e) {
        if (gameState === "start" || gameState === "gameover") {
            if (e.key === " " || e.code === "Space") {
                e.preventDefault();
                startGame();
            }
            return;
        }

        switch (e.key) {
            case "ArrowUp":    case "w": case "W": handleDirection(DIR.UP);    break;
            case "ArrowDown":  case "s": case "S": handleDirection(DIR.DOWN);  break;
            case "ArrowLeft":  case "a": case "A": handleDirection(DIR.LEFT);  break;
            case "ArrowRight": case "d": case "D": handleDirection(DIR.RIGHT); break;
        }

        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
            e.preventDefault();
        }
    });

    // --- Input: Mobile Buttons ---
    var btnMap = {
        "btn-up":    DIR.UP,
        "btn-down":  DIR.DOWN,
        "btn-left":  DIR.LEFT,
        "btn-right": DIR.RIGHT,
    };

    Object.keys(btnMap).forEach(function(id) {
        var dir = btnMap[id];
        var btn = document.getElementById(id);
        btn.addEventListener("touchstart", function(e) {
            e.preventDefault();
            if (gameState === "start" || gameState === "gameover") {
                startGame();
                return;
            }
            handleDirection(dir);
        });
    });

    overlay.addEventListener("click", function() {
        if (gameState === "start" || gameState === "gameover") {
            startGame();
        }
    });

    // --- Input: Swipe ---
    var touchStartX = 0, touchStartY = 0;

    canvas.addEventListener("touchstart", function(e) {
        if (gameState === "start" || gameState === "gameover") {
            startGame();
            e.preventDefault();
            return;
        }
        var touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchend", function(e) {
        if (gameState !== "playing") return;
        var touch = e.changedTouches[0];
        var dx = touch.clientX - touchStartX;
        var dy = touch.clientY - touchStartY;
        var absDx = Math.abs(dx);
        var absDy = Math.abs(dy);
        var MIN_SWIPE = 20;
        if (Math.max(absDx, absDy) < MIN_SWIPE) return;
        if (absDx > absDy) {
            handleDirection(dx > 0 ? DIR.RIGHT : DIR.LEFT);
        } else {
            handleDirection(dy > 0 ? DIR.DOWN : DIR.UP);
        }
        e.preventDefault();
    }, { passive: false });

    // --- Apply border color ---
    function applyBorderColor() {
        canvas.style.borderColor = config.colors.border;
        canvas.style.boxShadow = "0 0 15px " + hexToRgba(config.colors.border, 0.2) +
            ", inset 0 0 15px " + hexToRgba(config.colors.border, 0.05);
        scoreEl.style.color = config.colors.snakeHead;
        scoreEl.style.textShadow = "0 0 10px " + hexToRgba(config.colors.snakeHead, 0.5);
        highScoreEl.style.color = config.colors.snakeHead;
        highScoreEl.style.textShadow = "0 0 10px " + hexToRgba(config.colors.snakeHead, 0.5);
        overlayTitle.style.color = config.colors.snakeHead;
    }

    // --- Settings Listeners ---
    elGridSizeSelect.addEventListener("change", function() {
        var val = elGridSizeSelect.value;
        if (val === "small") GRID_SIZE = 15;
        else if (val === "medium") GRID_SIZE = 20;
        else GRID_SIZE = 25;

        CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;

        // Reset the game since grid coordinates have changed
        resetGame();
        if (gameState !== "playing") draw();
    });

    elToggleGrid.addEventListener("change", function() {
        config.showGrid = elToggleGrid.checked;
        if (gameState !== "playing") draw();
    });

    elToggleWalls.addEventListener("change", function() {
        config.wallWrap = elToggleWalls.checked;
    });

    elSpeedSlider.addEventListener("input", function() {
        var val = parseInt(elSpeedSlider.value);
        var sp = speedPresets[val] || speedPresets[3];
        elSpeedLabel.textContent = sp[2];
        config.baseInterval = sp[0];
        config.minInterval = sp[1];
    });

    elColorSamosa.addEventListener("input", function() {
        config.colors.samosa = elColorSamosa.value;
        if (gameState !== "playing") draw();
    });

    elColorSamosaCrisp.addEventListener("input", function() {
        config.colors.samosaCrisp = elColorSamosaCrisp.value;
        if (gameState !== "playing") draw();
    });

    // Presets
    var presetBtns = document.querySelectorAll(".preset-btn");
    presetBtns.forEach(function(btn) {
        btn.addEventListener("click", function() {
            var name = btn.getAttribute("data-preset");
            var p = colorPresets[name];
            if (!p) return;

            presetBtns.forEach(function(b) { b.classList.remove("active"); });
            btn.classList.add("active");

            config.colors.snakeHead = p.snakeHead;
            config.colors.snakeBody = p.snakeBody;
            config.colors.snakeGlow = p.snakeGlow;
            config.colors.bg = p.bg;
            config.colors.grid = p.grid;
            config.colors.border = p.border;

            applyBorderColor();
            if (gameState !== "playing") draw();
        });
    });

    // Reset
    elResetBtn.addEventListener("click", function() {
        config.colors = {
            bg: "#0d0d0d", grid: "#161616", border: "#00ff88",
            snakeHead: "#00ff88", snakeBody: "#00cc6a", snakeGlow: "#00ff88",
            samosa: "#D4943A", samosaCrisp: "#B8781E"
        };
        config.showGrid = true;
        config.wallWrap = true;

        elSpeedSlider.value = 3;
        elSpeedLabel.textContent = "Normal";
        elToggleGrid.checked = true;
        elToggleWalls.checked = false;
        elColorSamosa.value = "#D4943A";
        elColorSamosaCrisp.value = "#B8781E";

        presetBtns.forEach(function(b) { b.classList.remove("active"); });
        document.querySelector('[data-preset="neon"]').classList.add("active");

        applyBorderColor();
        if (gameState !== "playing") {
            resetGame();
            draw();
        }
    });

    // --- Start ---
    init();
})();
