// Umbra — the wardens. A guard walks a patrol route, pauses at each post to
// look around, and reacts to what he sees and hears in four states:
//
//   PATROL     walks his waypoints, cone sweeping ahead
//   SUSPICIOUS saw something briefly, or heard a noise: walks to look
//   ALERT      saw Wren clearly: chases the last seen spot, then Wren
//   SEARCH     lost Wren: checks nearby hiding spots, then gives up
//
// Suspicion is a meter, not a switch: a glimpse at the edge of the cone in
// shadow only makes a guard curious, and Wren can break away and recover.
// A guard who catches Wren ends the run.

Umbra.Guards = (function () {
  var G = Umbra.GUARD;
  var V = Umbra.VISION;

  function makeGuard(def, level) {
    var first = Umbra.Level.tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
    var second = Umbra.Level.tileCenter(def.waypoints[1][0], def.waypoints[1][1]);
    return {
      x: first.x,
      y: first.y,
      angle: Math.atan2(second.y - first.y, second.x - first.x),
      waypoints: def.waypoints.map(function (w) {
        return Umbra.Level.tileCenter(w[0], w[1]);
      }),
      wpIndex: 1,
      pause: def.pause || 1,
      pauseLeft: 0,
      scanDir: 1,
      scanAngle: 0,
      state: 'PATROL',
      suspicion: 0,
      lastSeen: null,
      lastSeenAt: 0,
      searchSpots: [],
      searchIndex: 0,
      stuckTime: 0,
      prevX: first.x,
      prevY: first.y,
      heardAt: null,
      alertFlash: 0,
    };
  }

  function angleLerp(a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * Math.min(1, t);
  }

  function moveToward(level, guard, tx, ty, speed, dt) {
    var dx = tx - guard.x;
    var dy = ty - guard.y;
    var dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    var step = Math.min(dist, speed * dt);
    var nx = guard.x + (dx / dist) * step;
    var ny = guard.y + (dy / dist) * step;
    var moved = Umbra.Level.moveCircle(level, guard.x, guard.y, G.radius, nx - guard.x, ny - guard.y);
    guard.x = moved.x;
    guard.y = moved.y;
    guard.angle = angleLerp(guard.angle, Math.atan2(dy, dx), dt * 6);
    return dist - step < 4;
  }

  // Pick a few plausible hiding spots near where Wren was last seen:
  // hedges and shadow tiles within a few tiles of the spot.
  function pickSearchSpots(level, cx, cy) {
    var spots = [];
    var ctx = Math.floor(cx / Umbra.TILE);
    var cty = Math.floor(cy / Umbra.TILE);
    for (var ty = cty - 3; ty <= cty + 3; ty++) {
      for (var tx = ctx - 3; tx <= ctx + 3; tx++) {
        var ch = Umbra.Vision.tileAt(level, tx, ty);
        if ((ch === 'H' || ch === ',') && Umbra.Level.isOpen(level, tx, ty)) {
          spots.push(Umbra.Level.tileCenter(tx, ty));
        }
      }
    }
    // Nearest first, at most four spots.
    spots.sort(function (a, b) {
      return Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy);
    });
    return spots.slice(0, 4);
  }

  function update(guard, level, player, dt, now, events) {
    var sight = Umbra.Vision.canSee(level, guard, player);

    // --- Seeing fills suspicion; hiding drains it. ---
    if (sight.seen) {
      var rate = G.fillRate * (sight.strength || 0.6);
      guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
      guard.lastSeen = { x: player.x, y: player.y };
      guard.lastSeenAt = now;
      if (guard.suspicion > 0.45 && guard.state === 'PATROL') {
        guard.state = 'SUSPICIOUS';
        events.push({ type: 'suspicious', guard: guard, level: guard.suspicion });
      }
      if (guard.suspicion >= 1 && guard.state !== 'ALERT') {
        guard.state = 'ALERT';
        guard.alertFlash = 1;
        events.push({ type: 'alarm', guard: guard });
      }
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - G.drainRate * dt);
      if (guard.state === 'SUSPICIOUS' && guard.suspicion <= 0.05 && !guard.heardAt) {
        guard.state = 'PATROL';
        events.push({ type: 'calm', guard: guard });
      }
    }

    // --- Hearing: a noise pulls a patrolling guard over to check. ---
    if (guard.heardAt && guard.state === 'PATROL') {
      guard.state = 'SUSPICIOUS';
      guard.lastSeen = { x: guard.heardAt.x, y: guard.heardAt.y };
      events.push({ type: 'heard', guard: guard });
    }

    // --- State behaviour. ---
    if (guard.state === 'PATROL') {
      patrol(guard, level, dt);
    } else if (guard.state === 'SUSPICIOUS') {
      var target = guard.lastSeen || guard.heardAt;
      if (target) {
        var arrived = moveToward(level, guard, target.x, target.y, G.patrolSpeed * 1.35, dt);
        if (arrived) {
          guard.pauseLeft += dt;
          guard.scanAngle += guard.scanDir * dt * 1.4;
          if (Math.abs(guard.scanAngle) > 1.1) guard.scanDir *= -1;
          guard.angle += guard.scanDir * dt * 0.9;
          if (guard.pauseLeft > 2.2) {
            guard.pauseLeft = 0;
            guard.heardAt = null;
            guard.lastSeen = null;
            guard.state = 'PATROL';
            events.push({ type: 'calm', guard: guard });
          }
        }
      }
    } else if (guard.state === 'ALERT') {
      var chase = guard.lastSeen;
      if (chase && now - guard.lastSeenAt < 1.2) {
        moveToward(level, guard, chase.x, chase.y, G.chaseSpeed, dt);
      } else if (chase) {
        // Lost sight: sweep the area around the last seen spot.
        if (guard.searchSpots.length === 0) {
          guard.searchSpots = pickSearchSpots(level, chase.x, chase.y);
          guard.searchIndex = 0;
        }
        guard.state = 'SEARCH';
      }
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < G.catchRadius) {
        events.push({ type: 'caught', guard: guard });
      }
    } else if (guard.state === 'SEARCH') {
      if (guard.searchIndex < guard.searchSpots.length) {
        var spot = guard.searchSpots[guard.searchIndex];
        var done = moveToward(level, guard, spot.x, spot.y, G.searchSpeed, dt);
        if (done) {
          guard.searchIndex++;
          guard.pauseLeft = 0;
        }
      } else {
        guard.searchSpots = [];
        guard.state = 'PATROL';
        guard.suspicion = 0.3;
        events.push({ type: 'calm', guard: guard });
      }
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < G.catchRadius) {
        events.push({ type: 'caught', guard: guard });
      }
    }

    // A guard who cannot move for a while (wedged on a corner) gives up on
    // the current waypoint and picks the next one, so patrols never stall.
    if (Math.hypot(guard.x - guard.prevX, guard.y - guard.prevY) < 0.5) {
      guard.stuckTime += dt;
    } else {
      guard.stuckTime = 0;
    }
    guard.prevX = guard.x;
    guard.prevY = guard.y;
    if (guard.stuckTime > 2.5) {
      guard.stuckTime = 0;
      guard.state = 'PATROL';
      guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
      guard.searchSpots = [];
      guard.heardAt = null;
    }
    if (guard.alertFlash > 0) guard.alertFlash = Math.max(0, guard.alertFlash - dt * 1.5);
  }

  function patrol(guard, level, dt) {
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      // Look around while waiting at a post: a slow scan.
      guard.scanAngle += guard.scanDir * dt * 0.8;
      if (Math.abs(guard.scanAngle) > 0.9) guard.scanDir *= -1;
      guard.angle += guard.scanDir * dt * 0.55;
      return;
    }
    var wp = guard.waypoints[guard.wpIndex];
    var arrived = moveToward(level, guard, wp.x, wp.y, G.patrolSpeed, dt);
    if (arrived) {
      guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
      guard.pauseLeft = guard.pause;
      guard.scanAngle = 0;
    }
  }

  // A noise event: every guard in earshot gets a place to check.
  function hearNoise(guards, x, y, radius) {
    for (var i = 0; i < guards.length; i++) {
      var g = guards[i];
      if (g.state === 'ALERT') continue;
      if (Umbra.Vision.canHear(g, x, y, radius)) {
        g.heardAt = { x: x, y: y };
      }
    }
  }

  function alertLevel(guards) {
    var worst = 'CALM';
    for (var i = 0; i < guards.length; i++) {
      var s = guards[i].state;
      if (s === 'ALERT') return 'ALARM';
      if (s === 'SUSPICIOUS' || s === 'SEARCH') worst = 'SUSPICIOUS';
      else if (guards[i].suspicion > 0.35 && worst === 'CALM') worst = 'WARY';
    }
    return worst;
  }

  return {
    makeGuard: makeGuard,
    update: update,
    hearNoise: hearNoise,
    alertLevel: alertLevel,
  };
})();
