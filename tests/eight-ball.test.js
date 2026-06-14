import assert from 'node:assert/strict';
import test from 'node:test';
import { createShotRecord, evaluateShot } from '../src/rules/eight-ball.js';

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
