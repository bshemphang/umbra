// Umbra — vision and light. Guards see in a cone; walls, bookshelves and
// statues block sight, hedges hide Wren outright, and light decides how far
// a guard can see: lamplight and bare floor are dangerous, shadow and
// crouching shrink the range. All tests are tile-grid raycasts, so a cone
// behaves exactly the way it looks on screen.

Umbra.Vision = (function () {
  var V = Umbra.VISION;

  function tileAt(level, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= Umbra.COLS || ty >= Umbra.ROWS) return '#';
    return level.grid[ty][tx];
  }

  function blocksSight(ch) {
    return ch === '#' || ch === 'B' || ch === 'S';
  }

  // Grid raycast: does any sight-blocking tile stand between two points?
  // Steps along the line in small increments and checks each tile crossed.
  function hasLineOfSight(level, x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.hypot(dx, dy);
    var steps = Math.max(1, Math.ceil(dist / 6));
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      var tx = Math.floor((x0 + dx * t) / Umbra.TILE);
      var ty = Math.floor((y0 + dy * t) / Umbra.TILE);
      if (blocksSight(tileAt(level, tx, ty))) return false;
    }
    return true;
  }

  // Is the point inside a lantern's warm pool? Lanterns light a radius of
  // about two and a half tiles around themselves.
  function inLanternLight(level, x, y) {
    for (var i = 0; i < level.lanterns.length; i++) {
      var l = level.lanterns[i];
      if (Math.hypot(x - l.x, y - l.y) < Umbra.TILE * 2.4) return true;
    }
    return false;
  }

  // Is the point on a shadowed floor tile?
  function inShadow(level, x, y) {
    var tx = Math.floor(x / Umbra.TILE);
    var ty = Math.floor(y / Umbra.TILE);
    return tileAt(level, tx, ty) === ',';
  }

  // Is the point inside a hedge? Hedges hide Wren completely.
  function inHedge(level, x, y) {
    var tx = Math.floor(x / Umbra.TILE);
    var ty = Math.floor(y / Umbra.TILE);
    return tileAt(level, tx, ty) === 'H';
  }

  // How far this guard can see Wren right now, given where Wren stands
  // and whether Wren crouches. Light matters most; shadow matters more.
  function sightRange(level, player) {
    var lit = inLanternLight(level, player.x, player.y);
    var shadow = inShadow(level, player.x, player.y);
    if (player.crouching) {
      if (shadow || lit === false) return shadow ? V.crouchShadow : V.crouchRange;
      return V.crouchRange;
    }
    if (shadow) return V.shadowRange;
    if (lit) return V.range;
    return V.range * 0.85;
  }

  // The core question: can this guard see the player this frame? Returns
  // an object so the caller can tell a clear sighting from a near miss.
  //   seen: boolean — inside the cone, in range, line of sight, not hidden
  //   edge: 0..1 — how close to the cone's centre the player is (1 = dead on)
  function canSee(level, guard, player) {
    var dx = player.x - guard.x;
    var dy = player.y - guard.y;
    var dist = Math.hypot(dx, dy);
    if (dist > V.range) return { seen: false, edge: 0, dist: dist };
    if (inHedge(level, player.x, player.y)) return { seen: false, edge: 0, dist: dist };
    var range = sightRange(level, player);
    if (dist > range) return { seen: false, edge: 0, dist: dist };
    var angleTo = Math.atan2(dy, dx);
    var diff = angleTo - guard.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > V.halfAngle) return { seen: false, edge: 0, dist: dist };
    if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) {
      return { seen: false, edge: 0, dist: dist };
    }
    var edge = 1 - Math.abs(diff) / V.halfAngle;
    var closeness = 1 - dist / range;
    return { seen: true, edge: edge, dist: dist, strength: 0.35 + 0.65 * edge * (0.5 + 0.5 * closeness) };
  }

  // Can the guard hear a noise at (x, y) of the given radius?
  function canHear(guard, x, y, radius) {
    return Math.hypot(x - guard.x, y - guard.y) < radius;
  }

  return {
    tileAt: tileAt,
    blocksSight: blocksSight,
    hasLineOfSight: hasLineOfSight,
    inLanternLight: inLanternLight,
    inShadow: inShadow,
    inHedge: inHedge,
    sightRange: sightRange,
    canSee: canSee,
    canHear: canHear,
  };
})();
