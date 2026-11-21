// Umbra — rendering. Everything is drawn on one canvas with plain 2D
// shapes: no images, no fonts from the network. The look is a moonlit
// archive at night: a dark floor with warm lantern pools, a vignette of
// darkness that lifts around lanterns and the exit, and vision cones that
// read at a glance — amber while calm, orange while suspicious, red in
// alarm. Cover is drawn to read instantly: shelves, crates, hedges, statues.

Umbra.Render = (function () {
  var T = Umbra.TILE;
  var C = Umbra.COLORS;
  var V = Umbra.VISION;

  function drawFloor(ctx, level, time) {
    for (var ty = 0; ty < Umbra.ROWS; ty++) {
      for (var tx = 0; tx < Umbra.COLS; tx++) {
        var ch = level.grid[ty][tx];
        var x = tx * T;
        var y = ty * T;
        var base = (tx + ty) % 2 === 0 ? C.floor : C.floorAlt;
        if (ch === ',') base = C.shadowFloor;
        ctx.fillStyle = base;
        ctx.fillRect(x, y, T, T);
        // Rug runner down the middle hall.
        if (tx >= 11 && tx <= 12 && ty >= 1 && ty <= 14 && ch !== '#') {
          ctx.fillStyle = C.rug;
          ctx.fillRect(x + 3, y, T - 6, T);
          ctx.fillStyle = 'rgba(232, 182, 76, 0.25)';
          ctx.fillRect(x + 3, y, 2, T);
          ctx.fillRect(x + T - 5, y, 2, T);
        }
        // Faint tile seams.
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
      }
    }
  }

  function drawCover(ctx, level, time) {
    for (var ty = 0; ty < Umbra.ROWS; ty++) {
      for (var tx = 0; tx < Umbra.COLS; tx++) {
        var ch = level.grid[ty][tx];
        var x = tx * T;
        var y = ty * T;
        if (ch === '#') {
          ctx.fillStyle = C.wall;
          ctx.fillRect(x, y, T, T);
          ctx.fillStyle = C.wallTop;
          ctx.fillRect(x, y, T, 6);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(x, y + T - 5, T, 5);
        } else if (ch === 'B') {
          ctx.fillStyle = C.shelf;
          ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
          ctx.fillStyle = C.shelfTop;
          ctx.fillRect(x + 2, y + 2, T - 4, 5);
          ctx.fillStyle = 'rgba(232, 182, 76, 0.5)';
          for (var s = 0; s < 3; s++) {
            ctx.fillRect(x + 7 + s * 9, y + 11, 5, 16);
          }
          ctx.fillStyle = 'rgba(120, 170, 220, 0.45)';
          ctx.fillRect(x + 8, y + 28, 6, 6);
        } else if (ch === 'C') {
          ctx.fillStyle = C.crate;
          ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, T - 8, T - 8);
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + T - 4, y + T - 4);
          ctx.moveTo(x + T - 4, y + 4);
          ctx.lineTo(x + 4, y + T - 4);
          ctx.stroke();
        } else if (ch === 'S') {
          ctx.fillStyle = '#3a352c';
          ctx.beginPath();
          ctx.ellipse(x + T / 2, y + T - 8, 15, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = C.statue;
          ctx.beginPath();
          ctx.ellipse(x + T / 2, y + T / 2 - 2, 9, 13, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + T / 2, y + 12, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === 'H') {
          var sway = Math.sin(time * 1.3 + tx * 1.7 + ty) * 1.5;
          ctx.fillStyle = C.hedge;
          ctx.beginPath();
          ctx.arc(x + 12 + sway, y + 22, 12, 0, Math.PI * 2);
          ctx.arc(x + 26 - sway, y + 18, 13, 0, Math.PI * 2);
          ctx.arc(x + 20, y + 30, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = C.hedgeTop;
          ctx.beginPath();
          ctx.arc(x + 14 + sway, y + 18, 6, 0, Math.PI * 2);
          ctx.arc(x + 26 - sway, y + 24, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawLanterns(ctx, level, time) {
    for (var i = 0; i < level.lanterns.length; i++) {
      var l = level.lanterns[i];
      var flicker = 0.85 + Math.sin(time * 7 + l.flicker) * 0.08 + Math.sin(time * 13 + l.flicker * 2) * 0.05;
      var r = T * 2.4 * flicker;
      var g = ctx.createRadialGradient(l.x, l.y, 6, l.x, l.y, r);
      g.addColorStop(0, 'rgba(255, 205, 120, 0.30)');
      g.addColorStop(0.55, 'rgba(255, 190, 90, 0.12)');
      g.addColorStop(1, 'rgba(255, 190, 90, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
      ctx.fill();
      // The lantern itself: a small post with a glowing cage.
      ctx.fillStyle = '#241d16';
      ctx.fillRect(l.x - 2, l.y - 4, 4, 18);
      ctx.fillStyle = C.lanternCore;
      ctx.beginPath();
      ctx.arc(l.x, l.y - 8, 5 * flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
      ctx.beginPath();
      ctx.arc(l.x, l.y - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // A guard's vision cone, clipped by walls: march along the cone's edge
  // rays and stop each ray at the first sight-blocking tile, so the cone
  // hugs corners exactly the way the guard's sight does.
  function drawCone(ctx, level, guard) {
    var half = V.halfAngle;
    var range = Umbra.VISION.range;
    var rays = 26;
    var state = guard.state;
    var fill = state === 'ALERT' ? C.coneAlarm : state === 'SUSPICIOUS' || state === 'SEARCH' ? C.coneSuspicious : C.coneCalm;
    var edge = state === 'ALERT' ? 'rgba(255, 80, 60, 0.7)' : state === 'SUSPICIOUS' || state === 'SEARCH' ? 'rgba(255, 160, 70, 0.6)' : C.coneEdge;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    for (var i = 0; i <= rays; i++) {
      var a = guard.angle - half + (2 * half * i) / rays;
      var len = rayLength(level, guard.x, guard.y, a, range);
      ctx.lineTo(guard.x + Math.cos(a) * len, guard.y + Math.sin(a) * len);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function rayLength(level, x, y, angle, maxLen) {
    var step = 6;
    var cx = Math.cos(angle);
    var sy = Math.sin(angle);
    for (var d = step; d <= maxLen; d += step) {
      var tx = Math.floor((x + cx * d) / T);
      var ty = Math.floor((y + sy * d) / T);
      if (Umbra.Vision.blocksSight(Umbra.Vision.tileAt(level, tx, ty))) return d;
    }
    return maxLen;
  }

  function drawGuard(ctx, guard, time) {
    // Suspicion ring under the guard.
    if (guard.suspicion > 0.03) {
      ctx.strokeStyle = guard.state === 'ALERT' ? '#ff5040' : '#ffa040';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.suspicion);
      ctx.stroke();
    }
    // Body: a warden in a red tabard, lantern on his belt.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 10, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.guardTabard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 9, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick and helmet.
    ctx.strokeStyle = '#e8dcc8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 16, guard.y + Math.sin(guard.angle) * 16);
    ctx.stroke();
    ctx.fillStyle = '#d8d2c2';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    // State mark: ? while curious, ! while alarmed.
    var mark = guard.state === 'ALERT' ? '!' : guard.state === 'SUSPICIOUS' || guard.state === 'SEARCH' ? '?' : null;
    if (mark) {
      var bob = Math.sin(time * 6) * 2;
      ctx.font = 'bold 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = guard.state === 'ALERT' ? '#ff5040' : '#ffb050';
      ctx.fillText(mark, guard.x, guard.y - 24 + bob);
    }
  }

  function drawPlayer(ctx, player, level, time) {
    var hidden = player.hidden;
    // Trail of faint footprints.
    ctx.fillStyle = 'rgba(232, 228, 218, 0.18)';
    for (var i = 0; i < player.trail.length; i += 3) {
      ctx.beginPath();
      ctx.arc(player.trail[i].x, player.trail[i].y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    if (hidden) ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 10, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded figure: dark cloak, pale face turned toward where Wren moves.
    ctx.fillStyle = C.playerHood;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.player;
    ctx.beginPath();
    ctx.arc(player.x + Math.cos(player.facing) * 5, player.y + Math.sin(player.facing) * 5, 5, 0, Math.PI * 2);
    ctx.fill();
    // Crouching reads as a smaller, lower silhouette.
    if (player.crouching) {
      ctx.strokeStyle = 'rgba(232, 228, 218, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 17, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Running noise ring.
    if (player.noiseRadius > 0 && player.moving) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.noiseRadius * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPickups(ctx, level, time) {
    // Seals: small violet wax discs that pulse.
    for (var i = 0; i < level.seals.length; i++) {
      var s = level.seals[i];
      if (s.taken) continue;
      var pulse = 1 + Math.sin(time * 3 + i) * 0.12;
      ctx.fillStyle = C.seal;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2d7f7';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('S', s.x, s.y + 4);
    }
    // The Ember Codex: a golden book that glows and bobs.
    if (level.codex && !level.codexTaken) {
      var k = level.codex;
      var bob = Math.sin(time * 2.2) * 3;
      var glow = ctx.createRadialGradient(k.x, k.y + bob, 2, k.x, k.y + bob, 34);
      glow.addColorStop(0, 'rgba(232, 182, 76, 0.5)');
      glow.addColorStop(1, 'rgba(232, 182, 76, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(k.x, k.y + bob, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a5a12';
      ctx.fillRect(k.x - 11, k.y - 8 + bob, 22, 16);
      ctx.fillStyle = C.codex;
      ctx.fillRect(k.x - 9, k.y - 6 + bob, 18, 12);
      ctx.strokeStyle = '#8a5a12';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(k.x, k.y - 6 + bob);
      ctx.lineTo(k.x, k.y + 6 + bob);
      ctx.stroke();
      ctx.fillStyle = '#fff2cf';
      ctx.font = 'bold 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('CODEX', k.x, k.y + 28 + bob);
    }
    // The exit door: green and glowing once open, grey and barred before.
    if (level.exit) {
      var e = level.exit;
      var open = Umbra.Level.objectiveDone(level);
      if (open) {
        var eg = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 46);
        eg.addColorStop(0, 'rgba(88, 214, 141, 0.55)');
        eg.addColorStop(1, 'rgba(88, 214, 141, 0)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 46, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = open ? '#1f7a44' : '#3a3a3a';
      ctx.fillRect(e.x - 13, e.y - 15, 26, 30);
      ctx.fillStyle = open ? C.exit : '#6a6a6a';
      ctx.fillRect(e.x - 9, e.y - 11, 18, 22);
      ctx.fillStyle = '#0d2b18';
      ctx.beginPath();
      ctx.arc(e.x + 5, e.y, 2, 0, Math.PI * 2);
      ctx.fill();
      if (!open) {
        ctx.strokeStyle = '#8a6d2b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(e.x - 13, e.y - 15);
        ctx.lineTo(e.x + 13, e.y + 15);
        ctx.moveTo(e.x + 13, e.y - 15);
        ctx.lineTo(e.x - 13, e.y + 15);
        ctx.stroke();
      }
      ctx.fillStyle = open ? C.exit : '#9a9a9a';
      ctx.font = 'bold 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', e.x, e.y - 22);
    }
  }

  // Night darkness, painted on an offscreen canvas so the holes only cut
  // the darkness itself: the whole room is dimmed except around lanterns,
  // the exit, the Codex and Wren, so light itself tells the player what
  // is safe. (Cutting holes on the main canvas would erase the floor too.)
  var darkCanvas = null;
  var darkCtx = null;

  function drawDarkness(ctx, level, player, time) {
    if (!darkCanvas) {
      darkCanvas = document.createElement('canvas');
      darkCanvas.width = Umbra.WIDTH;
      darkCanvas.height = Umbra.HEIGHT;
      darkCtx = darkCanvas.getContext('2d');
    }
    darkCtx.clearRect(0, 0, Umbra.WIDTH, Umbra.HEIGHT);
    darkCtx.fillStyle = 'rgba(8, 8, 18, 0.34)';
    darkCtx.fillRect(0, 0, Umbra.WIDTH, Umbra.HEIGHT);
    darkCtx.globalCompositeOperation = 'destination-out';
    var holes = [];
    for (var i = 0; i < level.lanterns.length; i++) {
      var l = level.lanterns[i];
      holes.push({ x: l.x, y: l.y, r: 95 });
    }
    if (level.exit) holes.push({ x: level.exit.x, y: level.exit.y, r: 70 });
    if (level.codex && !level.codexTaken) holes.push({ x: level.codex.x, y: level.codex.y, r: 55 });
    holes.push({ x: player.x, y: player.y, r: 85 });
    for (var j = 0; j < holes.length; j++) {
      var h = holes[j];
      var g = darkCtx.createRadialGradient(h.x, h.y, 4, h.x, h.y, h.r);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      darkCtx.fillStyle = g;
      darkCtx.beginPath();
      darkCtx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      darkCtx.fill();
    }
    darkCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(darkCanvas, 0, 0);
  }

  function drawPebbles(ctx, pebbles, time) {
    for (var i = 0; i < pebbles.length; i++) {
      var p = pebbles[i];
      var age = time - p.born;
      if (age > 1.2) continue;
      var alpha = 1 - age / 1.2;
      ctx.strokeStyle = 'rgba(255, 220, 130, ' + (alpha * 0.8) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 + age * 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#d8d2c2';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return {
    drawFloor: drawFloor,
    drawCover: drawCover,
    drawLanterns: drawLanterns,
    drawCone: drawCone,
    drawGuard: drawGuard,
    drawPlayer: drawPlayer,
    drawPickups: drawPickups,
    drawDarkness: drawDarkness,
    drawPebbles: drawPebbles,
  };
})();
