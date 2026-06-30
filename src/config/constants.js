// Shared world dimensions keep rendering, collisions, pockets, and aiming aligned.
export const TABLE = {
  width: 10,
  height: 5.3,
  rail: 0.36,
  ballRadius: 0.14,
  pocketRadius: 0.27,
};

// Tunable physical coefficients used by the fixed-step solver.
export const PHYSICS = {
  fixedStep: 1 / 120,
  stopSpeed: 0.025,
  spinStopSpeed: 0.08,
  gravity: 9.81,
  slidingFriction: 0.16,
  rollingFriction: 0.035,
  spinningFriction: 0.012,
  slipThreshold: 0.035,
  cushionRestitution: 0.82,
  cushionFriction: 0.08,
  ballRestitution: 0.96,
  cueSpinScale: 1.15,
};

// Standard pool-ball colors, indexed by ball number minus one.
export const BALL_COLORS = [
  0xf2d13b, 0x2464bf, 0xc73332, 0x673991, 0xe57b25, 0x27804b, 0x7f231f,
  0x171916, 0xf2d13b, 0x2464bf, 0xc73332, 0x673991, 0xe57b25, 0x27804b, 0x7f231f,
];

// Pocket centers are shared by table rendering and pocket detection.
export const POCKET_POSITIONS = [
  [-TABLE.width / 2, -TABLE.height / 2],
  [0, -TABLE.height / 2],
  [TABLE.width / 2, -TABLE.height / 2],
  [-TABLE.width / 2, TABLE.height / 2],
  [0, TABLE.height / 2],
  [TABLE.width / 2, TABLE.height / 2],
];
