// Umbra — the level. A tile map becomes a playable room: walls and cover
// with collision, lanterns that pool light, hedges to hide in, the Codex and
// seals to lift, and the exit door. Movement collision is circle-vs-tile so
// Wren slides along walls instead of snagging on corners.

Umbra.Level = (function () {
  var T = Umbra.TILE;

  function tileCenter(tx, ty) {
    return { x: tx * T + T / 2, y: ty * T + T / 2 };
  }

  function build(def) {
    var grid = [];
    var lanterns = [];
    var hedges = [];
    var seals = [];
    var codex = null;
    var exit = null;
    var start = null;
    for (var y = 0; y < def.map.length; y++) {
      var row = def.map[y].split('');
      grid.push(row);
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        var c = tileCenter(x, y);
        if (ch === 'L') lanterns.push({ x: c.x, y: c.y, flicker: Math.random() * Math.PI * 2 });
        if (ch === 'H') hedges.push({ tx: x, ty: y, x: c.x, y: c.y });
        if (ch === 's') seals.push({ x: c.x, y: c.y, tx: x, ty: y, taken: false });
        if (ch === 'K') codex = { x: c.x, y: c.y, taken: false };
        if (ch === 'E') exit = { x: c.x, y: c.y, tx: x, ty: y };
        if (ch === 'P') start = { x: c.x, y: c.y };
      }
    }
    return {
      def: def,
      name: def.name,
      brief: def.brief,
      grid: grid,
      lanterns: lanterns,
      hedges: hedges,
      seals: seals,
      sealsNeeded: def.sealsNeeded,
      codex: codex,
      exit: exit,
      start: start,
      sealsTaken: 0,
      codexTaken: false,
      exitOpen: def.sealsNeeded === 0 ? false : false,
    };
  }

  function solidAt(level, tx, ty) {
    var ch = Umbra.Vision.tileAt(level, tx, ty);
    return ch === '#' || ch === 'B' || ch === 'C' || ch === 'S';
  }

  // Move a circle (x, y, radius) by (dx, dy), sliding along solid tiles.
  // Returns the new position; the circle never ends up inside a wall.
  function moveCircle(level, x, y, radius, dx, dy) {
    var nx = x + dx;
    var ny = y + dy;
    nx = resolveAxis(level, nx, y, radius, true);
    ny = resolveAxis(level, nx, ny, radius, false);
    return { x: nx, y: ny };
  }

  function resolveAxis(level, x, y, radius, isX) {
    var minTx = Math.floor((x - radius) / T);
    var maxTx = Math.floor((x + radius) / T);
    var minTy = Math.floor((y - radius) / T);
    var maxTy = Math.floor((y + radius) / T);
    for (var ty = minTy; ty <= maxTy; ty++) {
      for (var tx = minTx; tx <= maxTx; tx++) {
        if (!solidAt(level, tx, ty)) continue;
        var bx = tx * T;
        var by = ty * T;
        var closestX = Math.max(bx, Math.min(x, bx + T));
        var closestY = Math.max(by, Math.min(y, by + T));
        var ddx = x - closestX;
        var ddy = y - closestY;
        if (ddx * ddx + ddy * ddy < radius * radius) {
          if (isX) {
            x = x < bx + T / 2 ? bx - radius : bx + T + radius;
          } else {
            y = y < by + T / 2 ? by - radius : by + T + radius;
          }
        }
      }
    }
    return isX ? x : y;
  }

  function isOpen(level, tx, ty) {
    return !solidAt(level, tx, ty);
  }

  // The exit opens once the Codex is taken and every seal is lifted.
  function objectiveDone(level) {
    return level.codexTaken && level.sealsTaken >= level.sealsNeeded;
  }

  function objectiveText(level) {
    if (!level.codexTaken) {
      var sealsLeft = level.sealsNeeded - level.sealsTaken;
      if (sealsLeft > 0) return 'Lift ' + sealsLeft + ' seal' + (sealsLeft > 1 ? 's' : '') + ', then take the Ember Codex';
      return 'Take the Ember Codex';
    }
    if (level.sealsTaken < level.sealsNeeded) {
      return 'Lift ' + (level.sealsNeeded - level.sealsTaken) + ' more seal(s)';
    }
    return 'Reach the green exit door — unseen';
  }

  return {
    build: build,
    tileCenter: tileCenter,
    solidAt: solidAt,
    isOpen: isOpen,
    moveCircle: moveCircle,
    objectiveDone: objectiveDone,
    objectiveText: objectiveText,
  };
})();
