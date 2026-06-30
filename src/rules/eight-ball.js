const GROUPS = {
  solids: { label: 'SOLIDS', min: 1, max: 7 },
  stripes: { label: 'STRIPES', min: 9, max: 15 },
};

// Accept the old boolean form while supporting break-specific shot options.
function normalizeShotOptions(options) {
  if (typeof options === 'boolean') return { mustHitEight: options, isBreak: false };
  return { mustHitEight: false, isBreak: false, ...options };
}

export function createShotRecord(options = {}) {
  // A shot record collects physics events until every ball stops translating.
  const { mustHitEight, isBreak } = normalizeShotOptions(options);
  return {
    mustHitEight,
    isBreak,
    firstContact: null,
    railAfterContact: false,
    railContacts: new Set(),
    pocketed: [],
    scratched: false,
  };
}

export function recordCueContact(shot, firstBall, secondBall) {
  // Eight-ball legality depends on the cue ball's first object-ball contact.
  if (shot.firstContact !== null) return;
  if (firstBall.number === 0 && secondBall.number !== 0) shot.firstContact = secondBall.number;
  if (secondBall.number === 0 && firstBall.number !== 0) shot.firstContact = firstBall.number;
}

export function recordRailContact(shot) {
  if (shot.firstContact !== null) shot.railAfterContact = true;
}

export function recordBallRailContact(shot, ballNumber) {
  // Unique rail contacts are needed to validate the opening break.
  if (shot.firstContact === null || ballNumber === 0) return;
  shot.railAfterContact = true;
  shot.railContacts.add(ballNumber);
}

export function recordPocket(shot, ballNumber) {
  shot.pocketed.push(ballNumber);
  if (ballNumber === 0) shot.scratched = true;
}

export function getOppositeGroup(group) {
  if (group === 'solids') return 'stripes';
  if (group === 'stripes') return 'solids';
  return null;
}

export function getBallGroup(number) {
  if (number >= GROUPS.solids.min && number <= GROUPS.solids.max) return 'solids';
  if (number >= GROUPS.stripes.min && number <= GROUPS.stripes.max) return 'stripes';
  return null;
}

function isPlayerBall(number, player, groups) {
  const group = groups[player];
  if (!group) return getBallGroup(number) !== null;
  return getBallGroup(number) === group;
}

function hasPlayerBallsRemaining(balls, player, groups) {
  const group = groups[player];
  if (!group) return balls.some((ball) => ball.active && getBallGroup(ball.number) !== null);
  return balls.some((ball) => ball.active && getBallGroup(ball.number) === group);
}

function assignGroups(shot, player, groups) {
  // The first legal non-break pocket closes the table and assigns both groups.
  if (groups[player] || shot.isBreak) return groups;
  const firstPocketedGroup = shot.pocketed.map(getBallGroup).find(Boolean);
  if (!firstPocketedGroup) return groups;
  return {
    ...groups,
    [player]: firstPocketedGroup,
    [player === 1 ? 2 : 1]: getOppositeGroup(firstPocketedGroup),
  };
}

export function evaluateShot({ shot, player, balls, groups = { 1: 'solids', 2: 'stripes' } }) {
  // Evaluate fouls first, then win conditions, group assignment, and turn retention.
  const ownBallsRemaining = hasPlayerBallsRemaining(balls, player, groups);
  const legalFirstContact = shot.mustHitEight
    ? shot.firstContact === 8
    : isPlayerBall(shot.firstContact, player, groups);

  let foul = null;
  if (shot.scratched) foul = 'Cue ball scratched';
  else if (shot.firstContact === null) foul = 'No object ball contacted';
  else if (!legalFirstContact) foul = shot.mustHitEight ? 'The 8-ball must be contacted first' : 'Wrong ball contacted first';
  else if (shot.isBreak) {
    const objectBallsPocketed = shot.pocketed.filter((number) => number > 0).length;
    if (objectBallsPocketed === 0 && shot.railContacts.size < 4) foul = 'Illegal break: pocket a ball or drive four balls to rails';
  } else if (shot.pocketed.length === 0 && !shot.railAfterContact) foul = 'No ball reached a rail after contact';

  const eightPocketed = shot.pocketed.includes(8);
  if (eightPocketed) {
    return {
      foul,
      winner: foul || ownBallsRemaining ? (player === 1 ? 2 : 1) : player,
      keepTurn: false,
      groups,
      breakComplete: true,
    };
  }

  const nextGroups = foul ? groups : assignGroups(shot, player, groups);
  const ownPocketed = shot.pocketed.some((number) => isPlayerBall(number, player, nextGroups));

  return {
    foul,
    winner: null,
    keepTurn: !foul && (shot.isBreak ? shot.pocketed.some((number) => number > 0) : ownPocketed),
    groups: nextGroups,
    breakComplete: shot.isBreak || undefined,
  };
}
