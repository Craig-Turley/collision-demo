// canvas setup

const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');

canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 100;

const simMinWidth = 20.0;
const cScale = Math.min(canvas.width, canvas.height) / simMinWidth;
const simWidth = canvas.width / cScale;
const simHeight = canvas.height / cScale;

const cX = (pos) => {
  return pos.x * cScale;
}

const cY = (pos) => {
  return canvas.height - pos.y * cScale;
}

const velSlider = document.querySelector('#vel-slider');
const ballSlider = document.querySelector('#ball-slider');
const startBtn = document.querySelector('#start');

// setup scence

const dt = 1.0 / 60.0;

const physicsScene = {
  dt : dt,
  balls : [],
  restitution : 1.0,
  velRange: 5.0,
  numBalls: 50,
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

async function setupScene() {
  // initialize hash
  for (let i = 0; i < hash.rows; i++) {
    for (let j = 0; j < hash.cols; j++) {
      hash.map[`${i},${j}`] = [];
    }
  }
  // add balls to scene
  for (let i = 0; i < physicsScene.numBalls; i++) {
    let radius = random(0.4, 1);
    let mass = Math.PI * radius * radius;
    const ball = {
      id: i,
      radius: radius,
      mass: mass,
      position : {
        x : random(1, simWidth - 1),
        y : random(1, simHeight - 1),
      },
      velocity : {
        x : random( -physicsScene.velRange, physicsScene.velRange),
        y : random(-physicsScene.velRange , physicsScene.velRange)
      },
      acceleration : { x : 0.0, y : 0.0 },
      prevTile: ''
    }

    const row = getHashRow(ball.position);
    const col = getHashCol(ball.position);

    ball.prevTile = `${row},${col}`,

    addHashEntry(row, col, ball);

    physicsScene.balls.push(ball);
  }

}

function debugAddBall(id, x, y, xv, yv) {
    let radius = random(0.4, 1);
    let mass = Math.PI * radius * radius;
    const ball = {
      id: id,
      radius: radius,
      mass: mass,
      position : {
        x : x,
        y : y,
      },
      velocity : { x : xv,  y : yv},
      acceleration : { x : 0.0, y : 0.0 },
      prevTile: ''
    }

    const row = getHashRow(ball.position);
    const col = getHashCol(ball.position);

    ball.prevTile = `${row},${col}`,

    addHashEntry(row, col, ball);

    physicsScene.balls.push(ball);

}

// hash

const hash = {
  rows : 6,
  cols : 6,
  rowLength : simHeight / 6.0,
  colLength : simWidth / 6.0,
  map : [],
}

function clamp(val, min, max) {
  if (val < min) {
    return min;
  } else if (val > max) {
    return max;
  }
  return val;
}

function getHashRow(pos) {
  let row = Math.floor(pos.x / hash.colLength);
  return clamp(row, 0, hash.rows - 1);
}

function getHashCol(pos) {
  // have to correct the y position to be from the top rather than the bottom
  let col = Math.floor((simHeight - pos.y) / hash.rowLength);
  return clamp(col, 0, hash.cols - 1);
}

function addHashEntry(row, col, ball){
  try {
    hash.map[`${row},${col}`].push(ball);
  } catch (e) {
    console.error(e);
    console.log(row, col);
  }
}

function removeHashEntry(ball) {
  hash.map[ball.prevTile] = hash.map[ball.prevTile].filter(b => b.id != ball.id);
}

// update

function checkHashCollisions() {
  // outer loop to loop through the hash entries
  for (let i = 0; i < hash.rows; i++) {
    for(let j = 0; j < hash.cols; j++) {
      let curTile = hash.map[`${i},${j}`];
      checkCollisions(curTile, i, j);
    }
  }

}

function checkCollisions(tile, row, col) {
  for (let i = 0; i < tile.length; i++) {
    let ball = tile[i];
    checkTiles(ball, row, col);
    checkBorderCollision(ball);
    /*
    switch(row) {
      case 0:
        switch(col) {
          // 0,0
          case 0:
            checkBorderCollisionLeft(ball);
          // 0,5
          case 5:
            checkBorderCollisionRight(ball);
          // 0,*
          default:
            console.log()
            checkBorderCollisionTop(ball);
            break;
        }
        break;
      case 5:
        switch (col) {
          case 0:
            checkBorderCollisionLeft(ball);
          case 5:
            checkBorderCollisionRight(ball);
          default:
            checkBorderCollisionBottom(ball);
            break;
        }
        break;
    }
    */
  }
}

function checkTiles(ball, row, col) {
  // starts in row above an iterates
  // until it finishes checking
  // row below
  for (let i = row - 1; i <= row; i++) {

    // skips row if it doesnt exist
    // e.g row -1
    if (i < 0 || i > hash.cols - 1) {
      continue;
    }

    // iterates through columns one before
    // until it finishes checking
    // column after
    for (let j = col - 1; j <= col; j++) {

      // skips column if it doesnt exist
      // e.g column -1 or column 6
      if (j < 0 || j > hash.rows - 1 ) {
        continue
      }

      // iterates through all balls in current tile
      let tile = hash.map[`${i},${j}`];
      for (let k = 0; k < tile.length; k++) {
        if (j < 0 || j > hash.cols - 1) {
          continue;
        }

        let ball2 = tile[k];
        handleBallCollision(ball, ball2, physicsScene.restitution);
      }
    }
  }
}

function handleBallCollision(ball1, ball2, restitution) {
  const dir = {
    x: ball2.position.x - ball1.position.x,
    y : ball2.position.y - ball1.position.y
  };
  let d = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
  // no collision occured
  if (d == 0.0 || d > ball1.radius + ball2.radius){
    return;
  }

  dir.x *= (1.0 / d);
  dir.y *= (1.0 / d);

  let corr = (ball1.radius + ball2.radius - d) / 2.0;
  ball1.position.x += (dir.x * -corr);
  ball1.position.y += (dir.y * -corr);

  ball2.position.x += (dir.x * corr);
  ball2.position.y += (dir.y * corr);

  let v1 = ball1.velocity.x * dir.x + ball1.velocity.y * dir.y;
  let v2 = ball2.velocity.x * dir.x + ball2.velocity.y * dir.y;

  let m1 = ball1.mass;
  let m2 = ball2.mass;

  let newV1 = (m1 * v1 + m2 * v2 - m2 * (v1 - v2) * restitution) / (m1 + m2);
  let newV2 = (m1 * v1 + m2 * v2 - m1 * (v2 - v1) * restitution) / (m1 + m2);

  ball1.velocity.x += (dir.x * (newV1 - v1));
  ball1.velocity.y += (dir.y * (newV1 - v1));

  ball2.velocity.x += (dir.x * (newV2 - v2));
  ball2.velocity.y += (dir.y * (newV2 - v2));
  return;
};

function checkBorderCollision(ball) {
  if (ball.position.x < ball.radius) {
    ball.position.x = ball.radius;
    ball.velocity.x = -ball.velocity.x;
  }
  if (ball.position.x > simWidth - ball.radius) {
    ball.position.x = simWidth - ball.radius;
    ball.velocity.x = -ball.velocity.x;
  }
  if (ball.position.y < ball.radius) {
    ball.position.y = ball.radius;
    ball.velocity.y = -ball.velocity.y;
  }
  if (ball.position.y > simHeight - ball.radius) {
    ball.position.y = simHeight - ball.radius;
    ball.velocity.y = -ball.velocity.y;
  }
}

function checkBorderCollisionLeft(ball) {
  if (ball.position.x < ball.radius) {
    ball.position.x = ball.radius;
    ball.velocity.x *= -1;
  }
}

function checkBorderCollisionRight(ball) {
  if (ball.position.x > simWidth - ball.radius) {
    ball.position.x = simWidth - ball.radius;
    ball.velocity.x *= -1;
  }
}

function checkBorderCollisionBottom(ball) {
  if (ball.position.y < ball.radius) {
    ball.position.y = ball.radius;
    ball.velocity.y *= -1;
  }
}

function checkBorderCollisionTop(ball) {
  if (ball.position.y > simHeight - ball.radius) {
    ball.position.y = simHeight - ball.radius;
    ball.velocity.y *= -1;
  }
}

function update(dt) {

  const numBalls = physicsScene.balls.length;
  for (let i = 0; i < numBalls; i++){
    const ball = physicsScene.balls[i];

    ball.position.x += ball.velocity.x * dt;
    ball.position.y += ball.velocity.y * dt;

    let row = getHashRow(ball.position);
    let col = getHashCol(ball.position);

    let tile = `${row},${col}`;

    if (ball.prevTile != tile) {
      removeHashEntry(ball);
      ball.prevTile = tile;
      addHashEntry(row, col, ball);
    }
  }

  checkHashCollisions();

}

// draw

const drawDisc = (x, y, radius) => {
  c.beginPath();
  c.arc(
    x, y, radius, 0.0, 2.0 * Math.PI
  );
  c.closePath();
  c.fill();
}

const drawLine = (startPos, endPos) => {
    c.strokeStyle = "#000000"
    c.lineWidth = 5;

    c.beginPath();
    c.moveTo(cX(startPos), cY(startPos));
    c.lineTo(cX(endPos), cY(endPos));
    c.stroke();
    c.lineWidth = 1;
}

function draw() {
  c.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < physicsScene.balls.length; i++) {
    const ball = physicsScene.balls[i];
    drawDisc(cX(ball.position), cY(ball.position), ball.radius * cScale);
  }

}

function debugDrawHash() {
  for (let i = 0; i < hash.rows; i++) {
    const startPos = {
      x : 0,
      y : hash.rowLength * i,
    }

    const endPos = {
      x : simWidth,
      y : hash.rowLength * i,
    }

    drawLine(startPos, endPos);
  }

  for (let i = 0; i < hash.cols; i++) {
    const startPos = {
      x : hash.colLength * i,
      y : 0,
    }

    const endPos = {
      x : hash.colLength * i,
      y : simHeight,
    }

    drawLine(startPos, endPos);
  }
}

// simulate


velSlider.oninput = () => {
  const val = parseFloat(velSlider.value);
  document.querySelector("#vel-slider-value").textContent = val;
  physicsScene.velRange = val;
}

ballSlider.oninput = () => {
  const val = parseFloat(ballSlider.value);
  document.querySelector("#ball-slider-value").textContent = val;
  physicsScene.numBalls = val;
}

startBtn.onclick = () => {
  startBtn.disabled = true;
  setupScene();
  simulate();
}

function simulate() {
  update(physicsScene.dt);
  draw();
  requestAnimationFrame(simulate);
}

