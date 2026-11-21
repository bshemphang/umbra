// Umbra — configuration and level data.
// A top-down stealth game: Wren slips through the moonlit Lantern Archive,
// steals the Ember Codex, and reaches the exit unseen. All level layouts are
// hand-designed tile maps; one character per tile, 24 wide by 16 tall.
//
// Map legend:
//   #  stone wall (blocks sight and movement)
//   .  bare floor
//   ,  shadowed floor (dark: guards see much less far here)
//   B  bookshelf (tall cover, blocks sight and movement)
//   C  crate (low cover, blocks movement and sight when crouched behind)
//   H  hedge (you can hide inside it; guards cannot see you in it)
//   S  statue (solid cover)
//   L  lantern (warm light pool: guards see at full range inside it)
//   K  the Ember Codex (the prize)
//   s  a wax seal (collect it to unbar the vault door on later levels)
//   E  the exit door (glows green once the objective is done)
//   P  where Wren starts
//   G  a guard post (a waypoint list lives beside each map)

var Umbra = window.Umbra || {};
window.Umbra = Umbra;

Umbra.TILE = 40;
Umbra.COLS = 24;
Umbra.ROWS = 16;
Umbra.WIDTH = Umbra.COLS * Umbra.TILE;
Umbra.HEIGHT = Umbra.ROWS * Umbra.TILE;

// How far a guard can spot Wren, in pixels, by situation.
Umbra.VISION = {
  range: 250,          // full range, in lamplight or bare floor
  shadowRange: 140,    // range when Wren stands in shadow or a hedge
  crouchRange: 170,    // range when Wren crouches in the open
  crouchShadow: 105,   // crouched and shadowed: nearly invisible
  halfAngle: 0.62,     // vision cone half-angle, radians (~71 degrees wide)
  hearRun: 190,        // guards hear running footsteps this far away
  hearWalk: 70,        // walking is quiet
  hearPebble: 260,     // a thrown pebble rings out this far
};

Umbra.PLAYER = {
  walkSpeed: 132,
  runSpeed: 205,
  crouchSpeed: 78,
  radius: 13,
  pebbles: 3,
};

Umbra.GUARD = {
  patrolSpeed: 62,
  chaseSpeed: 148,
  searchSpeed: 88,
  radius: 14,
  // Suspicion (0..1) rises while Wren is seen, falls when hidden.
  fillRate: 0.85,      // per second, fully seen in good light
  drainRate: 0.30,
  catchRadius: 26,     // a guard this close catches Wren
};

Umbra.COLORS = {
  floor: '#2b2620',
  floorAlt: '#2e2921',
  shadowFloor: '#211d24',
  rug: '#4a2b2e',
  wall: '#4c4438',
  wallTop: '#6b5d48',
  shelf: '#5d3f24',
  shelfTop: '#7a5530',
  crate: '#6e5233',
  hedge: '#2e4a2a',
  hedgeTop: '#3f6136',
  statue: '#8a8578',
  lanternGlow: 'rgba(255, 190, 90, 0.20)',
  lanternCore: '#ffcf7a',
  exit: '#58d68d',
  codex: '#e8b64c',
  seal: '#c98ad6',
  player: '#e8e4da',
  playerHood: '#3a2f5e',
  guard: '#c0392b',
  guardTabard: '#7b241c',
  coneCalm: 'rgba(255, 214, 90, 0.30)',
  coneEdge: 'rgba(255, 214, 90, 0.75)',
  coneSuspicious: 'rgba(255, 150, 60, 0.38)',
  coneAlarm: 'rgba(255, 60, 50, 0.42)',
};

Umbra.LEVELS = [
  {
    name: 'I — The Lantern Archive',
    brief: 'Steal the Ember Codex, then slip out the green door. Stay out of the cones.',
    map: [
      '########################',
      '#P....#......#....K....#',
      '#.....#..B...#....#....#',
      '#..H..#......#....#..H.#',
      '#.....#..B...#....#....#',
      '#,,...#......#....#....#',
      '#,,...####.###.####....#',
      '#..........L...........#',
      '#..C...####.###.####...#',
      '#......#......#....#...#',
      '#..B...#..H...#....#...#',
      '#......#......#....#...#',
      '#..H...#..B...#....#...#',
      '#......#......#....#...#',
      '#..C...#......#....E...#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 1], [2, 5], [5, 5], [5, 1]], pause: 1.2 },
      { waypoints: [[20, 9], [20, 13], [22, 13], [22, 9]], pause: 1.0 },
    ],
    sealsNeeded: 0,
  },
  {
    name: 'II — The Gilded Gallery',
    brief: 'Two wax seals bar the vault. Lift both, take the Codex, leave unseen.',
    map: [
      '########################',
      '#P...,,#......#....s...#',
      '#......#..B...#....#...#',
      '#..H...#......#..H.#...#',
      '#......#..B...#....#...#',
      '#..C...####.###.####...#',
      '#..........L......#....#',
      '#..H...####.###.####...#',
      '#......#......#....#...#',
      '#..B...#..H...#..s.#...#',
      '#......#......#....#...#',
      '#,,....#..B...#....#...#',
      '#,,....#......#....#...#',
      '#..H...#..C...#....#...#',
      '#......#......#..K.E...#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 1], [2, 4], [5, 4], [5, 1]], pause: 0.9 },
      { waypoints: [[20, 8], [20, 13], [22, 13], [22, 8]], pause: 1.1 },
      { waypoints: [[16, 1], [18, 1], [18, 4], [16, 4]], pause: 0.8 },
    ],
    sealsNeeded: 2,
  },
  {
    name: 'III — The Ember Vault',
    brief: 'Three seals, four wardens, one Codex. Ghost it: never be seen at all.',
    map: [
      '########################',
      '#P....#......#....s....#',
      '#..H..#..B...#..H.#....#',
      '#.....#......#....#..C.#',
      '#..C..#..B...#....#....#',
      '#.....####.###.####....#',
      '#,,........L......#..s.#',
      '#,,...####.###.####....#',
      '#.....#......#....#....#',
      '#..H..#..H...#..B.#....#',
      '#.....#......#....#....#',
      '#..B..#..C...#....#..H.#',
      '#.....#......#....#....#',
      '#,,...#..H...#..s.#....#',
      '#.....#......#..K.E....#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 1], [5, 1], [5, 3], [2, 3]], pause: 0.7 },
      { waypoints: [[14, 2], [17, 2], [17, 4], [14, 4]], pause: 0.9 },
      { waypoints: [[2, 9], [5, 9], [5, 10], [2, 10]], pause: 0.8 },
      { waypoints: [[20, 10], [20, 14], [22, 14], [22, 10]], pause: 1.0 },
    ],
    sealsNeeded: 3,
  },
];

Umbra.RANKS = [
  { maxSeen: 0, maxTime: 240, label: 'GHOST', note: 'Never seen. The archive never knew you were there.' },
  { maxSeen: 1, maxTime: 360, label: 'SHADOW', note: 'A whisper of you reached them, but the night kept your secret.' },
  { maxSeen: 3, maxTime: 600, label: 'WHISPER', note: 'They heard something. They never caught it.' },
  { maxSeen: 99, maxTime: 99999, label: 'LOUD SHADOW', note: 'You finished, but every lantern remembers your face.' },
];
