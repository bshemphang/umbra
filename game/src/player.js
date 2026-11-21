// Umbra — Wren, the player. Keyboard moves, Shift runs (fast and loud),
// Ctrl or C crouches (slow, quiet, harder to see), and a mouse click throws
// a pebble to a spot: guards in earshot walk over to investigate it. Running
// makes a noise ring guards can hear; walking is quiet; crouching is silent.
// Footsteps tick at a steady cadence so the player can feel the pace.

Umbra.Player = (function () {
  var P = Umbra.PLAYER;
  var V = Umbra.VISION;

  function makePlayer(start) {
    return {
      x: start.x,
      y: start.y,
      radius: P.radius,
      facing: -Math.PI / 2,
      moving: false,
      running: false,
      crouching: false,
      pebbles: P.pebbles,
      stepTimer: 0,
      noiseRadius: 0,
      hidden: false,
      trail: [],
    };
  }

  function update(player, level, input, dt, events) {
    var mx = 0;
    var my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;

    player.crouching = !!input.crouch;
    player.running = !!input.run && !player.crouching && (mx !== 0 || my !== 0);
    var speed = player.crouching ? P.crouchSpeed : player.running ? P.runSpeed : P.walkSpeed;

    player.moving = mx !== 0 || my !== 0;
    if (player.moving) {
      var len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      player.facing = Math.atan2(my, mx);
      var moved = Umbra.Level.moveCircle(level, player.x, player.y, player.radius, mx * speed * dt, my * speed * dt);
      player.x = moved.x;
      player.y = moved.y;

      // Footstep cadence and the noise ring each step makes.
      player.stepTimer -= dt;
      if (player.stepTimer <= 0) {
        player.stepTimer = player.running ? 0.26 : player.crouching ? 0.55 : 0.38;
        player.noiseRadius = player.running ? V.hearRun : player.crouching ? 0 : V.hearWalk;
        events.push({
          type: 'step',
          running: player.running,
          noiseRadius: player.noiseRadius,
          x: player.x,
          y: player.y,
        });
      }
    } else {
      player.noiseRadius = 0;
    }

    player.hidden = Umbra.Vision.inHedge(level, player.x, player.y);

    // A faint trail of recent positions, so a near miss reads on screen.
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 14) player.trail.shift();
  }

  // Throw a pebble at a clicked tile: it arcs there, ticks, and every guard
  // in earshot walks over to look. Costs one pebble; none left, no throw.
  function throwPebble(player, level, tx, ty, events) {
    if (player.pebbles <= 0) {
      events.push({ type: 'noPebble' });
      return null;
    }
    player.pebbles--;
    var landing = { x: tx, y: ty };
    events.push({ type: 'pebble', x: landing.x, y: landing.y, radius: V.hearPebble });
    return landing;
  }

  return {
    makePlayer: makePlayer,
    update: update,
    throwPebble: throwPebble,
  };
})();
