export function createShotRecord(mustHitEight = false) {
  return {
    mustHitEight,
    firstContact: null,
    railAfterContact: false,
    pocketed: [],
    scratched: false,
  };
}

export function recordCueContact(shot, firstBall, secondBall) {
  if (shot.firstContact !== null) return;
  if (firstBall.number === 0 && secondBall.number !== 0) shot.firstContact = secondBall.number;
  if (secondBall.number === 0 && firstBall.number !== 0) shot.firstContact = firstBall.number;
}

export function recordRailContact(shot) {
  if (shot.firstContact !== null) shot.railAfterContact = true;
}

export function recordPocket(shot, ballNumber) {
  shot.pocketed.push(ballNumber);
  if (ballNumber === 0) shot.scratched = true;
}

function isPlayerBall(number, player) {
  return player === 1 ? number >= 1 && number <= 7 : number >= 9 && number <= 15;
}

export function evaluateShot({ shot, player, balls }) {
  const ownBallsRemaining = balls.some((ball) => ball.active && isPlayerBall(ball.number, player));
  const legalFirstContact = shot.mustHitEight
    ? shot.firstContact === 8
    : isPlayerBall(shot.firstContact, player);

  let foul = null;
  if (shot.scratched) foul = 'Cue ball scratched';
  else if (shot.firstContact === null) foul = 'No object ball contacted';
  else if (!legalFirstContact) foul = shot.mustHitEight ? 'The 8-ball must be contacted first' : 'Wrong ball contacted first';
  else if (shot.pocketed.length === 0 && !shot.railAfterContact) foul = 'No ball reached a rail after contact';

  const eightPocketed = shot.pocketed.includes(8);
  if (eightPocketed) {
    return {
      foul,
      winner: foul || ownBallsRemaining ? (player === 1 ? 2 : 1) : player,
      keepTurn: false,
    };
  }

  return {
    foul,
    winner: null,
    keepTurn: !foul && shot.pocketed.some((number) => isPlayerBall(number, player)),
  };
}
