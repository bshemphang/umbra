// Umbra — the game itself. Owns the loop, the states, the input and the HUD.
//
// States: TITLE → PLAYING ⇄ PAUSED → CAUGHT (retry) → LEVELCLEAR → next
// level → WIN after the third level. A run is scored on time and on how many
// times the wardens raised the alarm: finish unseen for the GHOST rank.
//
// Screenshot modes (used only to stage honest renders of the real game):
//   ?shot=start   the title screen
//   ?shot=patrol Wren mid-room, cones sweeping, Codex ahead
//   ?shot=alert  a warden at full alarm, red cone on Wren
//   ?shot=hide   Wren tucked in a hedge while a cone passes over
//   ?shot=win    the finished-run screen
// With no ?shot the game opens on the title screen like any player sees.

(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  canvas.width = Umbra.WIDTH;
  canvas.height = Umbra.HEIGHT;

  var hud = {
    level: document.getElementById('hud-level'),
    objective: document.getElementById('hud-objective'),
    alert: document.getElementById('hud-alert'),
    meter: document.getElementById('hud-meter-fill'),
    meterLabel: document.getElementById('hud-meter-label'),
    pebbles: document.getElementById('hud-pebbles'),
    seals: document.getElementById('hud-seals'),
    timer: document.getElementById('hud-timer'),
    hint: document.getElementById('hud-hint'),
  };
  var overlays = {
    title: document.getElementById('ov-title'),
    pause: document.getElementById('ov-pause'),
    caught: document.getElementById('ov-caught'),
    clear: document.getElementById('ov-clear'),
    win: document.getElementById('ov-win'),
    clearText: document.getElementById('ov-clear-text'),
    winText: document.getElementById('ov-win-text'),
    winRank: document.getElementById('ov-win-rank'),
  };

  var state = 'title';
  var levelIndex = 0;
  var level = null;
  var player = null;
  var guards = [];
  var pebbleMarks = [];
  var input = { up: false, down: false, left: false, right: false, run: false, crouch: false };
  var lastTime = 0;
  var time = 0;
  var levelTime = 0;
  var totalTime = 0;
  var timesSeen = 0;
  var timesCaught = 0;
  var lastAlertAt = -10;
  var shotMode = new URLSearchParams(window.location.search).get('shot');

  function loadLevel(index) {
    levelIndex = index;
    level = Umbra.Level.build(Umbra.LEVELS[index]);
    player = Umbra.Player.makePlayer(level.start);
    guards = level.def.guards.map(function (g) { return Umbra.Guards.makeGuard(g, level); });
    pebbleMarks = [];
    levelTime = 0;
    updateHud();
  }

  function showOverlay(name) {
    var keys = ['title', 'pause', 'caught', 'clear', 'win'];
    for (var i = 0; i < keys.length; i++) {
      overlays[keys[i]].classList.toggle('hidden', keys[i] !== name);
    }
    if (!name) {
      for (var j = 0; j < keys.length; j++) overlays[keys[j]].classList.add('hidden');
    }
  }

  function startGame() {
    Umbra.Sound.unlock();
    totalTime = 0;
    timesSeen = 0;
    timesCaught = 0;
    loadLevel(0);
    state = 'playing';
    showOverlay(null);
  }

  function retryLevel() {
    timesCaught++;
    loadLevel(levelIndex);
    state = 'playing';
    showOverlay(null);
  }

  function nextLevel() {
    if (levelIndex + 1 >= Umbra.LEVELS.length) {
      finishRun();
      return;
    }
    loadLevel(levelIndex + 1);
    state = 'playing';
    showOverlay(null);
  }

  function finishRun() {
    state = 'win';
    // Rank by alarms first, then let a slow run drop the rank one step.
    var rank = Umbra.RANKS[Umbra.RANKS.length - 1];
    for (var i = 0; i < Umbra.RANKS.length; i++) {
      if (timesSeen <= Umbra.RANKS[i].maxSeen) { rank = Umbra.RANKS[i]; break; }
    }
    var rankIndex = Umbra.RANKS.indexOf(rank);
    while (rankIndex < Umbra.RANKS.length - 1 && totalTime > Umbra.RANKS[rankIndex].maxTime) {
      rankIndex++;
      rank = Umbra.RANKS[rankIndex];
    }
    overlays.winRank.textContent = rank.label;
    overlays.winText.textContent =
      'The Ember Codex is yours. Three rooms, ' + timesSeen + ' alarm' + (timesSeen === 1 ? '' : 's') +
      ', ' + formatTime(totalTime) + '. ' + rank.note;
    Umbra.Sound.win();
    showOverlay('win');
  }

  function formatTime(t) {
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateHud() {
    if (!level) return;
    hud.level.textContent = level.name;
    hud.objective.textContent = Umbra.Level.objectiveText(level);
    var worst = 0;
    for (var i = 0; i < guards.length; i++) worst = Math.max(worst, guards[i].suspicion);
    var alert = Umbra.Guards.alertLevel(guards);
    hud.alert.textContent = alert;
    hud.alert.className = 'alert-badge alert-' + alert.toLowerCase();
    hud.meter.style.width = Math.round(worst * 100) + '%';
    hud.meterLabel.textContent = worst > 0.66 ? 'SEEN — break line of sight!' : worst > 0.33 ? 'Something stirs…' : 'Unseen';
    hud.pebbles.textContent = 'Pebbles: ' + player.pebbles + ' (click to throw)';
    hud.seals.textContent = 'Seals ' + level.sealsTaken + '/' + level.sealsNeeded + '   Codex ' + (level.codexTaken ? 'taken' : '—');
    hud.timer.textContent = formatTime(totalTime);
    hud.hint.textContent = player && player.hidden
      ? 'Hidden in the hedge — the cone passes right over you.'
      : 'WASD / arrows move · Shift run (loud) · Ctrl / C crouch · Click throws a pebble · P pause · M mute';
  }

  function handleEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.type === 'step') {
        Umbra.Sound.step(e.running);
        if (e.noiseRadius > 0) Umbra.Guards.hearNoise(guards, e.x, e.y, e.noiseRadius);
      } else if (e.type === 'pebble') {
        Umbra.Sound.pebble();
        pebbleMarks.push({ x: e.x, y: e.y, born: time });
        Umbra.Guards.hearNoise(guards, e.x, e.y, e.radius);
      } else if (e.type === 'noPebble') {
        hud.hint.textContent = 'No pebbles left — slip past instead.';
      } else if (e.type === 'suspicious') {
        Umbra.Sound.suspicious(e.level);
      } else if (e.type === 'alarm') {
        if (time - lastAlertAt > 1.5) {
          timesSeen++;
          lastAlertAt = time;
        }
        Umbra.Sound.alarm();
      } else if (e.type === 'calm') {
        Umbra.Sound.calmDown();
      } else if (e.type === 'caught') {
        state = 'caught';
        Umbra.Sound.caught();
        showOverlay('caught');
      }
    }
  }

  function checkPickups() {
    if (level.codex && !level.codexTaken) {
      if (Math.hypot(player.x - level.codex.x, player.y - level.codex.y) < 26) {
        level.codexTaken = true;
        Umbra.Sound.pickup(true);
        if (Umbra.Level.objectiveDone(level)) {
          Umbra.Sound.unbar();
          hud.hint.textContent = 'The exit door unbars. Go — quietly.';
        }
      }
    }
    for (var i = 0; i < level.seals.length; i++) {
      var s = level.seals[i];
      if (!s.taken && Math.hypot(player.x - s.x, player.y - s.y) < 26) {
        s.taken = true;
        level.sealsTaken++;
        Umbra.Sound.pickup(false);
      }
    }
    if (level.exit && Umbra.Level.objectiveDone(level)) {
      if (Math.hypot(player.x - level.exit.x, player.y - level.exit.y) < 28) {
        totalTime += levelTime;
        Umbra.Sound.levelClear();
        if (levelIndex + 1 >= Umbra.LEVELS.length) {
          finishRun();
        } else {
          state = 'levelclear';
          overlays.clearText.textContent =
            level.name + ' cleared in ' + formatTime(levelTime) + ' — alarms raised: ' + timesSeen + '.';
          showOverlay('clear');
        }
      }
    }
  }

  function update(dt) {
    if (state !== 'playing') return;
    levelTime += dt;
    totalTime += dt;
    var events = [];
    Umbra.Player.update(player, level, input, dt, events);
    for (var i = 0; i < guards.length; i++) {
      Umbra.Guards.update(guards[i], level, player, dt, time, events);
    }
    handleEvents(events);
    if (state !== 'playing') return;
    checkPickups();
    updateHud();
  }

  function render() {
    ctx.clearRect(0, 0, Umbra.WIDTH, Umbra.HEIGHT);
    if (!level) return;
    Umbra.Render.drawFloor(ctx, level, time);
    Umbra.Render.drawLanterns(ctx, level, time);
    Umbra.Render.drawPickups(ctx, level, time);
    for (var i = 0; i < guards.length; i++) Umbra.Render.drawCone(ctx, level, guards[i]);
    Umbra.Render.drawCover(ctx, level, time);
    for (var j = 0; j < guards.length; j++) Umbra.Render.drawGuard(ctx, guards[j], time);
    Umbra.Render.drawPlayer(ctx, player, level, time);
    Umbra.Render.drawPebbles(ctx, pebbleMarks, time);
    Umbra.Render.drawDarkness(ctx, level, player, time);
  }

  function loop(ts) {
    var dt = Math.min(0.05, (ts - lastTime) / 1000 || 0);
    lastTime = ts;
    time = ts / 1000;
    // Screenshot modes freeze the simulation: the staged state renders
    // exactly as set, so a shot never drifts into a caught screen.
    if (!shotMode) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // --- Input ---------------------------------------------------------------
  var KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
    ControlLeft: 'crouch', ControlRight: 'crouch',
    KeyC: 'crouch',
  };

  window.addEventListener('keydown', function (ev) {
    if (ev.code === 'KeyM') {
      var muted = Umbra.Sound.toggleMute();
      hud.hint.textContent = muted ? 'Sound off.' : 'Sound on.';
      return;
    }
    if (ev.code === 'KeyP' || ev.code === 'Escape') {
      if (state === 'playing') {
        state = 'paused';
        showOverlay('pause');
      } else if (state === 'paused') {
        state = 'playing';
        showOverlay(null);
      }
      return;
    }
    if (ev.code === 'Enter' || ev.code === 'Space') {
      if (state === 'title') { startGame(); return; }
      if (state === 'caught') { retryLevel(); return; }
      if (state === 'levelclear') { nextLevel(); return; }
      if (state === 'win') { startGame(); return; }
    }
    if (ev.code === 'KeyR' && (state === 'caught' || state === 'playing')) {
      retryLevel();
      return;
    }
    var field = KEYMAP[ev.code];
    if (field) {
      input[field] = true;
      ev.preventDefault();
    }
  });

  window.addEventListener('keyup', function (ev) {
    var field = KEYMAP[ev.code];
    if (field) input[field] = false;
  });

  canvas.addEventListener('mousedown', function (ev) {
    Umbra.Sound.unlock();
    if (state !== 'playing') return;
    var rect = canvas.getBoundingClientRect();
    var x = ((ev.clientX - rect.left) / rect.width) * Umbra.WIDTH;
    var y = ((ev.clientY - rect.top) / rect.height) * Umbra.HEIGHT;
    var landing = Umbra.Player.throwPebble(player, level, x, y, []);
    if (landing) {
      var events = [{ type: 'pebble', x: landing.x, y: landing.y, radius: Umbra.VISION.hearPebble }];
      handleEvents(events);
    } else {
      updateHud();
    }
  });

  // Overlay buttons.
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-resume').addEventListener('click', function () {
    state = 'playing';
    showOverlay(null);
  });
  document.getElementById('btn-retry').addEventListener('click', retryLevel);
  document.getElementById('btn-next').addEventListener('click', nextLevel);
  document.getElementById('btn-again').addEventListener('click', startGame);

  // --- Screenshot staging ---------------------------------------------------
  // Each mode sets the real game up in a genuine state, then lets the normal
  // loop render it: the screenshots are frames of the game, not mock-ups.
  function applyShot(mode) {
    loadLevel(mode === 'win' ? 2 : 0);
    state = 'playing';
    showOverlay(null);
    if (mode === 'start') {
      state = 'title';
      showOverlay('title');
      return;
    }
    if (mode === 'patrol') {
      player.x = 9 * Umbra.TILE + 20;
      player.y = 7 * Umbra.TILE + 20;
      player.facing = Math.PI / 2;
      guards[0].x = 5 * Umbra.TILE + 20;
      guards[0].y = 2 * Umbra.TILE + 20;
      guards[0].angle = Math.PI / 2;
      guards[1].x = 18 * Umbra.TILE + 20;
      guards[1].y = 9 * Umbra.TILE + 20;
      guards[1].angle = -Math.PI / 2;
    }
    if (mode === 'alert') {
      // Both in the open middle hall, clear line of sight, cone on Wren.
      player.x = 10 * Umbra.TILE + 20;
      player.y = 7 * Umbra.TILE + 20;
      guards[0].x = 6 * Umbra.TILE + 20;
      guards[0].y = 7 * Umbra.TILE + 20;
      guards[0].angle = 0;
      guards[0].state = 'ALERT';
      guards[0].suspicion = 1;
      guards[0].lastSeen = { x: player.x, y: player.y };
      guards[0].lastSeenAt = time;
      timesSeen = 1;
    }
    if (mode === 'hide') {
      player.x = 3 * Umbra.TILE + 20;
      player.y = 3 * Umbra.TILE + 20;
      player.crouching = true;
      guards[0].x = 5 * Umbra.TILE + 20;
      guards[0].y = 3 * Umbra.TILE + 20;
      guards[0].angle = Math.PI;
      guards[0].suspicion = 0.5;
      guards[0].state = 'SUSPICIOUS';
    }
    if (mode === 'win') {
      totalTime = 200;
      timesSeen = 0;
      finishRun();
    }
    updateHud();
  }

  loadLevel(0);
  if (shotMode) applyShot(shotMode);
  else showOverlay('title');
  requestAnimationFrame(loop);
})();
