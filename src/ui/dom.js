import { BALL_COLORS } from '../config/constants.js';

// Cache stable DOM references used by the app and display helpers.
export const dom = {
  canvas: document.querySelector('#game-canvas'),
  wrap: document.querySelector('#table-wrap'),
  slider: document.querySelector('#power-slider'),
  powerValue: document.querySelector('#power-value'),
  spinPad: document.querySelector('#spin-pad'),
  spinMarker: document.querySelector('#spin-marker'),
  spinValue: document.querySelector('#spin-value'),
  spinReset: document.querySelector('#spin-reset'),
  shoot: document.querySelector('#shoot-button'),
  reset: document.querySelector('#reset-button'),
  playAgain: document.querySelector('#play-again'),
  turnLabel: document.querySelector('#turn-label'),
  turnStatus: document.querySelector('#turn-status'),
  p1Panel: document.querySelector('#player-one-panel'),
  p2Panel: document.querySelector('#player-two-panel'),
  p1Name: document.querySelector('#player-one-name'),
  p2Name: document.querySelector('#player-two-name'),
  p1Score: document.querySelector('#player-one-score'),
  p2Score: document.querySelector('#player-two-score'),
  p1Group: document.querySelector('#player-one-group'),
  p2Group: document.querySelector('#player-two-group'),
  p1Match: document.querySelector('#player-one-match'),
  p2Match: document.querySelector('#player-two-match'),
  p1Tray: document.querySelector('#player-one-tray'),
  p2Tray: document.querySelector('#player-two-tray'),
  message: document.querySelector('#table-message'),
  messageKicker: document.querySelector('#message-kicker'),
  messageTitle: document.querySelector('#message-title'),
  foulNotice: document.querySelector('#foul-notice'),
  foulReason: document.querySelector('#foul-reason'),
};

let foulTimer;

export const DEFAULT_PLAYER_STATE = {
  names: { 1: 'Player 1', 2: 'Player 2' },
  wins: { 1: 0, 2: 0 },
};

const PLAYER_STORAGE_KEY = 'corner-pocket-players';

function groupLabel(group) {
  if (group === 'solids') return 'SOLIDS';
  if (group === 'stripes') return 'STRIPES';
  return 'OPEN';
}

function ballMatchesGroup(number, group) {
  if (group === 'solids') return number >= 1 && number <= 7;
  if (group === 'stripes') return number >= 9 && number <= 15;
  return false;
}

function scoredBallsForPlayer(balls, player, groups) {
  const group = groups[player];
  if (!group) return [];
  return balls.filter((ball) => !ball.active && ballMatchesGroup(ball.number, group));
}

export function loadPlayerState() {
  // Names and match wins persist across page reloads; malformed data falls back safely.
  try {
    const saved = JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY));
    return {
      names: { ...DEFAULT_PLAYER_STATE.names, ...saved?.names },
      wins: { ...DEFAULT_PLAYER_STATE.wins, ...saved?.wins },
    };
  } catch {
    return DEFAULT_PLAYER_STATE;
  }
}

export function savePlayerState(playerState) {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(playerState));
}

export function bindPlayerNames(playerState, onChange) {
  // Keep editable names synchronized with localStorage and the active-turn header.
  dom.p1Name.value = playerState.names[1];
  dom.p2Name.value = playerState.names[2];
  for (const [player, input] of [[1, dom.p1Name], [2, dom.p2Name]]) {
    input.addEventListener('input', () => {
      playerState.names[player] = input.value.trim() || `Player ${player}`;
      savePlayerState(playerState);
      onChange?.();
    });
  }
}

export function updateTurn(player, status = 'YOUR SHOT', names = DEFAULT_PLAYER_STATE.names) {
  dom.turnLabel.textContent = names[player].toUpperCase();
  dom.turnStatus.textContent = status;
  dom.p1Panel.classList.toggle('active', player === 1);
  dom.p2Panel.classList.toggle('active', player === 2);
}

export function updateScoreboard(balls, groups = { 1: 'solids', 2: 'stripes' }, playerState = DEFAULT_PLAYER_STATE) {
  // Scores and trays follow dynamic group assignment rather than fixed player sides.
  const p1Scored = scoredBallsForPlayer(balls, 1, groups);
  const p2Scored = scoredBallsForPlayer(balls, 2, groups);
  dom.p1Score.textContent = p1Scored.length;
  dom.p2Score.textContent = p2Scored.length;
  dom.p1Group.textContent = groupLabel(groups[1]);
  dom.p2Group.textContent = groupLabel(groups[2]);
  dom.p1Match.textContent = playerState.wins[1];
  dom.p2Match.textContent = playerState.wins[2];
  dom.p1Tray.innerHTML = '';
  dom.p2Tray.innerHTML = '';
  const trayBalls = groups[1] && groups[2]
    ? [...p1Scored.map((ball) => [ball, dom.p1Tray]), ...p2Scored.map((ball) => [ball, dom.p2Tray])]
    : balls
      .filter((ball) => !ball.active && ball.number > 0 && ball.number !== 8)
      .map((ball) => [ball, ball.number <= 7 ? dom.p1Tray : dom.p2Tray]);
  trayBalls.forEach(([ball, tray]) => {
    const dot = document.createElement('i');
    dot.className = 'tray-ball';
    dot.style.background = `#${BALL_COLORS[ball.number - 1].toString(16).padStart(6, '0')}`;
    tray.appendChild(dot);
  });
}

export function showFoul(reason) {
  // Fouls use a temporary non-blocking notice so ball-in-hand remains interactive.
  clearTimeout(foulTimer);
  dom.foulReason.textContent = reason;
  dom.foulNotice.classList.remove('hidden');
  foulTimer = setTimeout(() => dom.foulNotice.classList.add('hidden'), 2600);
}

export function showWinner(winner, names = DEFAULT_PLAYER_STATE.names) {
  // The game-over overlay blocks the table until a new rack starts.
  dom.messageKicker.textContent = 'GAME OVER';
  dom.messageTitle.textContent = `${names[winner].toUpperCase()} WINS`;
  dom.message.classList.remove('hidden');
}
