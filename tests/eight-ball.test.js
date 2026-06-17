import assert from 'node:assert/strict';
import test from 'node:test';
import { createShotRecord, evaluateShot, recordBallRailContact } from '../src/rules/eight-ball.js';

function ball(number, active = true) {
  return { number, active };
}

const tableWithSolids = [ball(1), ball(8), ball(9)];

test('scratch is a foul', () => {
  const shot = createShotRecord();
  shot.firstContact = 1;
  shot.scratched = true;
  shot.pocketed = [0];
  assert.equal(evaluateShot({ shot, player: 1, balls: tableWithSolids }).foul, 'Cue ball scratched');
});

test('missing every object ball is a foul', () => {
  const shot = createShotRecord();
  shot.railAfterContact = true;
  assert.equal(evaluateShot({ shot, player: 1, balls: tableWithSolids }).foul, 'No object ball contacted');
});

test('contacting the opponent group first is a foul', () => {
  const shot = createShotRecord();
  shot.firstContact = 9;
  shot.railAfterContact = true;
  assert.equal(evaluateShot({ shot, player: 1, balls: tableWithSolids }).foul, 'Wrong ball contacted first');
});

test('a legal contact requires a rail or pocket afterward', () => {
  const shot = createShotRecord();
  shot.firstContact = 1;
  assert.equal(evaluateShot({ shot, player: 1, balls: tableWithSolids }).foul, 'No ball reached a rail after contact');
});

test('a legal pocket keeps the turn', () => {
  const shot = createShotRecord();
  shot.firstContact = 1;
  shot.pocketed = [1];
  const result = evaluateShot({ shot, player: 1, balls: [ball(1, false), ball(8), ball(9)] });
  assert.equal(result.foul, null);
  assert.equal(result.keepTurn, true);
});

test('the 8-ball is legal only after the group is cleared', () => {
  const shot = createShotRecord(true);
  shot.firstContact = 8;
  shot.pocketed = [8];
  const result = evaluateShot({ shot, player: 1, balls: [ball(1, false), ball(8, false), ball(9)] });
  assert.equal(result.foul, null);
  assert.equal(result.winner, 1);
});

test('open table assigns groups after a legal pocket', () => {
  const shot = createShotRecord();
  shot.firstContact = 10;
  shot.pocketed = [10];
  const result = evaluateShot({
    shot,
    player: 1,
    balls: [ball(1), ball(8), ball(10, false)],
    groups: { 1: null, 2: null },
  });
  assert.equal(result.foul, null);
  assert.equal(result.keepTurn, true);
  assert.deepEqual(result.groups, { 1: 'stripes', 2: 'solids' });
});

test('open table cannot contact the 8-ball first before groups are assigned', () => {
  const shot = createShotRecord();
  shot.firstContact = 8;
  shot.railAfterContact = true;
  const result = evaluateShot({
    shot,
    player: 1,
    balls: [ball(1), ball(8), ball(10)],
    groups: { 1: null, 2: null },
  });
  assert.equal(result.foul, 'Wrong ball contacted first');
});

test('a break must pocket a ball or drive four object balls to rails', () => {
  const shot = createShotRecord({ isBreak: true });
  shot.firstContact = 1;
  recordBallRailContact(shot, 1);
  recordBallRailContact(shot, 2);
  recordBallRailContact(shot, 3);
  const result = evaluateShot({
    shot,
    player: 1,
    balls: [ball(1), ball(2), ball(3), ball(4), ball(8), ball(9)],
    groups: { 1: null, 2: null },
  });
  assert.equal(result.foul, 'Illegal break: pocket a ball or drive four balls to rails');
  assert.equal(result.breakComplete, true);
});

test('a legal break leaves the table open', () => {
  const shot = createShotRecord({ isBreak: true });
  shot.firstContact = 1;
  recordBallRailContact(shot, 1);
  recordBallRailContact(shot, 2);
  recordBallRailContact(shot, 3);
  recordBallRailContact(shot, 4);
  const result = evaluateShot({
    shot,
    player: 1,
    balls: [ball(1), ball(2), ball(3), ball(4), ball(8), ball(9)],
    groups: { 1: null, 2: null },
  });
  assert.equal(result.foul, null);
  assert.equal(result.keepTurn, false);
  assert.deepEqual(result.groups, { 1: null, 2: null });
});
