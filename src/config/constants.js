export const TABLE = {
  width: 10,
  height: 5.3,
  rail: 0.36,
  ballRadius: 0.14,
  pocketRadius: 0.27,
};

export const PHYSICS = {
  fixedStep: 1 / 120,
  stopSpeed: 0.025,
  rollingDeceleration: 0.48,
  cushionRestitution: 0.82,
  ballRestitution: 0.96,
};

export const BALL_COLORS = [
  0xf2d13b, 0x2464bf, 0xc73332, 0x673991, 0xe57b25, 0x27804b, 0x7f231f,
  0x171916, 0xf2d13b, 0x2464bf, 0xc73332, 0x673991, 0xe57b25, 0x27804b, 0x7f231f,
];

export const POCKET_POSITIONS = [
  [-TABLE.width / 2, -TABLE.height / 2],
  [0, -TABLE.height / 2],
  [TABLE.width / 2, -TABLE.height / 2],
  [-TABLE.width / 2, TABLE.height / 2],
  [0, TABLE.height / 2],
  [TABLE.width / 2, TABLE.height / 2],
];
