(function(){
  "use strict";

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var boardWrap = document.getElementById('boardWrap');

  var COLS = 22, ROWS = 22;
  var cell = 0, dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));

  function resize(){
    var rect = boardWrap.getBoundingClientRect();
    var size = Math.floor(Math.min(rect.width, rect.height));
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    cell = canvas.width / COLS;
  }
  window.addEventListener('resize', resize);

  var scoreVal = document.getElementById('scoreVal');
  var levelVal = document.getElementById('levelVal');
  var bestVal = document.getElementById('bestVal');
  var levelFill = document.getElementById('levelFill');
  var startOverlay = document.getElementById('startOverlay');
  var pauseOverlay = document.getElementById('pauseOverlay');
  var overOverlay = document.getElementById('overOverlay');
  var finalScore = document.getElementById('finalScore');
  var overMsg = document.getElementById('overMsg');
  var startBtn = document.getElementById('startBtn');
  var retryBtn = document.getElementById('retryBtn');
  var resumeBtn = document.getElementById('resumeBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var startHint = document.getElementById('startHint');

  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || matchMedia('(pointer: coarse)').matches;
  if(isTouch){ document.documentElement.classList.add('touch'); }
  startHint.textContent = isTouch ? 'Swipe or use the pad to steer' : 'Arrow keys or WASD';

  // Stop the page itself from scrolling/bouncing/zooming while playing,
  // which otherwise fights with swipe gestures on phones and tablets.
  document.addEventListener('touchmove', function(e){ e.preventDefault(); }, {passive:false});
  document.addEventListener('gesturestart', function(e){ e.preventDefault(); });
  document.addEventListener('dblclick', function(e){ e.preventDefault(); });

  var bestScore = 0;

  var FOODS_PER_LEVEL = 4;
  var BASE_TICK = 150;
  var MIN_TICK = 62;
  var TICK_STEP = 9;

  var state = 'idle';
  var snake, dir, queuedDir, food, score, level, tickDuration, lastTick, growPending;
  var particles = [];

  function gridToLevel(){
    return Math.min(1 + Math.floor(score / (10 * FOODS_PER_LEVEL)), 20);
  }

  function reset(){
    var cx = Math.floor(COLS/2), cy = Math.floor(ROWS/2);
    snake = [
      {x:cx-1,y:cy}, {x:cx-2,y:cy}, {x:cx-3,y:cy}
    ];
    snake.forEach(function(s){ s.px=s.x; s.py=s.y; });
    dir = {x:1,y:0};
    queuedDir = null;
    score = 0;
    level = 1;
    tickDuration = BASE_TICK;
    growPending = 0;
    particles = [];
    placeFood();
    updateHud();
  }

  function placeFood(){
    var occupied = {};
    snake.forEach(function(s){ occupied[s.x+','+s.y] = true; });
    var free = [];
    for(var x=0;x<COLS;x++) for(var y=0;y<ROWS;y++){
      if(!occupied[x+','+y]) free.push({x:x,y:y});
    }
    food = free[Math.floor(Math.random()*free.length)] || {x:0,y:0};
    food.spawn = performance.now();
  }

  function updateHud(){
    scoreVal.textContent = score;
    levelVal.textContent = level;
    bestVal.textContent = bestScore;
    var progress = (score % (10*FOODS_PER_LEVEL)) / (10*FOODS_PER_LEVEL);
    levelFill.style.width = (progress*100).toFixed(0) + '%';
  }

  function setDirection(nx, ny){
    if(dir.x === -nx && dir.y === -ny) return;
    queuedDir = {x:nx, y:ny};
  }

  var keyMap = {
    ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0],
    w:[0,-1], s:[0,1], a:[-1,0], d:[1,0],
    W:[0,-1], S:[0,1], A:[-1,0], D:[1,0]
  };
  window.addEventListener('keydown', function(e){
    if(e.code === 'Space'){
      e.preventDefault();
      togglePause();
      return;
    }
    var k = keyMap[e.key];
    if(k){
      e.preventDefault();
      if(state==='idle'){ startGame(); }
      setDirection(k[0], k[1]);
    }
  });

  var dpad = document.getElementById('dpad');
  dpad.addEventListener('pointerdown', function(e){
    var btn = e.target.closest('button[data-dir]');
    if(!btn) return;
    e.preventDefault();
    btn.classList.add('pressed');
    if(state==='idle'){ startGame(); }
    var d = btn.getAttribute('data-dir');
    if(d==='up') setDirection(0,-1);
    if(d==='down') setDirection(0,1);
    if(d==='left') setDirection(-1,0);
    if(d==='right') setDirection(1,0);
  });
  ['pointerup','pointerleave','pointercancel'].forEach(function(evt){
    dpad.addEventListener(evt, function(e){
      var btn = e.target.closest('button[data-dir]');
      if(btn) btn.classList.remove('pressed');
    });
  });

  var touchStart = null;
  canvas.addEventListener('touchstart', function(e){
    e.preventDefault();
    var t = e.changedTouches[0];
    touchStart = {x:t.clientX, y:t.clientY};
    if(state==='idle'){ startGame(); }
  }, {passive:false});
  canvas.addEventListener('touchend', function(e){
    e.preventDefault();
    if(!touchStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStart.x;
    var dy = t.clientY - touchStart.y;
    var adx = Math.abs(dx), ady = Math.abs(dy);
    if(Math.max(adx,ady) < 18){ touchStart=null; return; }
    if(adx > ady){ setDirection(dx>0?1:-1, 0); }
    else { setDirection(0, dy>0?1:-1); }
    touchStart = null;
  }, {passive:false});

  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  resumeBtn.addEventListener('click', togglePause);

  function togglePause(){
    if(state==='playing'){
      state='paused';
      pauseOverlay.classList.remove('hidden');
    } else if(state==='paused'){
      state='playing';
      pauseOverlay.classList.add('hidden');
      lastTick = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function startGame(){
    reset();
    state = 'playing';
    startOverlay.classList.add('hidden');
    overOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    lastTick = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame(){
    state = 'over';
    if(score > bestScore){ bestScore = score; }
    finalScore.textContent = score;
    overMsg.textContent = score >= 200 ? 'Extraordinary. The dark barely stood a chance.' :
      score >= 100 ? 'Impressive glow. Level ' + level + ' reached.' :
      'Run complete. Level ' + level + ' reached.';
    overOverlay.classList.remove('hidden');
    updateHud();
  }

  function spawnParticles(gx, gy, color){
    for(var i=0;i<10;i++){
      var a = Math.random()*Math.PI*2;
      var sp = 0.6 + Math.random()*1.6;
      particles.push({
        x:gx+0.5, y:gy+0.5,
        vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
        life: 1, color:color
      });
    }
  }

  function step(){
    if(queuedDir){ dir = queuedDir; queuedDir = null; }

    snake.forEach(function(s){ s.px=s.x; s.py=s.y; });

    var head = snake[0];
    var nx = head.x + dir.x, ny = head.y + dir.y;

    if(nx<0||ny<0||nx>=COLS||ny>=ROWS){ endGame(); return; }
    for(var i=0;i<snake.length;i++){
      if(snake[i].x===nx && snake[i].y===ny){ endGame(); return; }
    }

    var newHead = {x:nx, y:ny, px:head.x, py:head.y};
    snake.unshift(newHead);

    if(nx===food.x && ny===food.y){
      score += 10;
      spawnParticles(food.x, food.y, '55,224,184');
      var newLevel = gridToLevel();
      if(newLevel !== level){
        level = newLevel;
        tickDuration = Math.max(MIN_TICK, BASE_TICK - (level-1)*TICK_STEP);
      }
      placeFood();
      updateHud();
    } else {
      snake.pop();
    }
  }

  function loop(now){
    if(state !== 'playing') return;
    var elapsed = now - lastTick;
    if(elapsed >= tickDuration){
      step();
      if(state !== 'playing') { render(1); return; }
      lastTick = now;
      elapsed = 0;
    }
    var t = Math.min(1, elapsed / tickDuration);
    render(t);
    requestAnimationFrame(loop);
  }

  function lerp(a,b,t){ return a + (b-a)*t; }

  function drawGrid(){
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-line');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(var x=1;x<COLS;x++){
      ctx.moveTo(x*cell, 0); ctx.lineTo(x*cell, ROWS*cell);
    }
    for(var y=1;y<ROWS;y++){
      ctx.moveTo(0, y*cell); ctx.lineTo(COLS*cell, y*cell);
    }
    ctx.stroke();
  }

  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  function render(t){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawGrid();

    var pulse = 0.75 + 0.25*Math.sin(performance.now()/260);
    var fx = food.x*cell + cell/2, fy = food.y*cell + cell/2;
    var fr = cell*0.32;
    ctx.save();
    ctx.shadowColor = 'rgba(255,138,92,0.9)';
    ctx.shadowBlur = cell*0.9*pulse;
    ctx.fillStyle = '#ff8a5c';
    ctx.beginPath();
    ctx.arc(fx, fy, fr*(0.85+0.15*pulse), 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    var n = snake.length;
    for(var i=n-1;i>=0;i--){
      var s = snake[i];
      var x = lerp(s.px, s.x, t) * cell;
      var y = lerp(s.py, s.y, t) * cell;
      var pad = cell*0.09;
      var frac = 1 - (i/n)*0.55;
      var isHead = i===0;
      var col1 = [55,224,184], col2 = [15,80,68];
      var r = Math.round(lerp(col2[0], col1[0], frac));
      var g = Math.round(lerp(col2[1], col1[1], frac));
      var b = Math.round(lerp(col2[2], col1[2], frac));
      ctx.save();
      if(isHead){
        ctx.shadowColor = 'rgba(55,224,184,0.85)';
        ctx.shadowBlur = cell*0.7;
      }
      ctx.fillStyle = 'rgb('+r+','+g+','+b+')';
      roundRect(x+pad, y+pad, cell-pad*2, cell-pad*2, isHead ? cell*0.32 : cell*0.24);
      ctx.fill();
      ctx.restore();

      if(isHead){
        var ex = x + cell*0.5 + dir.x*cell*0.14;
        var ey = y + cell*0.5 + dir.y*cell*0.14;
        var perpX = -dir.y, perpY = dir.x;
        ctx.fillStyle = '#04211a';
        [-1,1].forEach(function(sgn){
          ctx.beginPath();
          ctx.arc(ex + perpX*cell*0.16*sgn, ey + perpY*cell*0.16*sgn, cell*0.07, 0, Math.PI*2);
          ctx.fill();
        });
      }
    }

    for(var p = particles.length-1; p>=0; p--){
      var pt = particles[p];
      pt.x += pt.vx*0.14; pt.y += pt.vy*0.14;
      pt.life -= 0.045;
      if(pt.life<=0){ particles.splice(p,1); continue; }
      ctx.fillStyle = 'rgba('+pt.color+','+pt.life+')';
      ctx.beginPath();
      ctx.arc(pt.x*cell, pt.y*cell, cell*0.06*pt.life, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function idleRender(){
    resize();
    reset();
    render(0);
    if(state==='idle') requestAnimationFrame(idleRender);
  }

  resize();
  reset();
  render(0);
  updateHud();

  window.addEventListener('resize', function(){
    resize();
    render(0);
  });

  document.addEventListener('visibilitychange', function(){
    if(document.hidden && state==='playing'){ togglePause(); }
  });

})();
