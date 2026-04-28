const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 400;

let snake = [{x: 10, y: 10}];
let direction = "RIGHT";
let food = randomFood();
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let gameInterval;
let speed = 120;
let paused = false;

document.getElementById("highScore").innerText = highScore;

function randomFood() {
  return {
    x: Math.floor(Math.random() * 20),
    y: Math.floor(Math.random() * 20)
  };
}

function draw() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Food
  ctx.fillStyle = "#00ff99";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00ff99";
  ctx.fillRect(food.x * 20, food.y * 20, 20, 20);

  // Snake
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 10;

  snake.forEach((s, i) => {
    ctx.fillRect(s.x * 20, s.y * 20, 20, 20);
  });

  move();
}

function move() {
  if (paused) return;

  let head = {...snake[0]};

  if (direction === "RIGHT") head.x++;
  if (direction === "LEFT") head.x--;
  if (direction === "UP") head.y--;
  if (direction === "DOWN") head.y++;

  // Wall collision
  if (head.x < 0 || head.y < 0 || head.x >= 20 || head.y >= 20) {
    return gameOver();
  }

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  snake.unshift(head);

  // Eat food
  if (head.x === food.x && head.y === food.y) {
    score++;
    document.getElementById("score").innerText = score;
    food = randomFood();

    // Increase speed
    if (speed > 50) speed -= 5;
    restartInterval();
  } else {
    snake.pop();
  }
}

function gameOver() {
  clearInterval(gameInterval);
  alert("Game Over!");

  if (score > highScore) {
    localStorage.setItem("highScore", score);
  }

  resetGame();
}

function startGame() {
  clearInterval(gameInterval);
  gameInterval = setInterval(draw, speed);
}

function pauseGame() {
  paused = !paused;
}

function resetGame() {
  snake = [{x: 10, y: 10}];
  direction = "RIGHT";
  score = 0;
  speed = 120;
  document.getElementById("score").innerText = score;
  startGame();
}

function restartInterval() {
  clearInterval(gameInterval);
  gameInterval = setInterval(draw, speed);
}

// Controls
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
  if (e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
  if (e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
  if (e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
});
