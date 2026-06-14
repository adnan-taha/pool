import { BALL_COLORS } from '../config/constants.js';

export const dom = {
  canvas: document.querySelector('#game-canvas'),
  wrap: document.querySelector('#table-wrap'),
  slider: document.querySelector('#power-slider'),
  powerValue: document.querySelector('#power-value'),
  shoot: document.querySelector('#shoot-button'),
  reset: document.querySelector('#reset-button'),
  playAgain: document.querySelector('#play-again'),
  turnLabel: document.querySelector('#turn-label'),
  turnStatus: document.querySelector('#turn-status'),
  p1Panel: document.querySelector('#player-one-panel'),
  p2Panel: document.querySelector('#player-two-panel'),
  p1Score: document.querySelector('#player-one-score'),
  p2Score: document.querySelector('#player-two-score'),
  p1Tray: document.querySelector('#player-one-tray'),
  p2Tray: document.querySelector('#player-two-tray'),
  message: document.querySelector('#table-message'),
  messageKicker: document.querySelector('#message-kicker'),
  messageTitle: document.querySelector('#message-title'),
  foulNotice: document.querySelector('#foul-notice'),
  foulReason: document.querySelector('#foul-reason'),
};

let foulTimer;

export function updateTurn(player, status = 'YOUR SHOT') {
  dom.turnLabel.textContent = `PLAYER ${player === 1 ? 'ONE' : 'TWO'}`;
  dom.turnStatus.textContent = status;
  dom.p1Panel.classList.toggle('active', player === 1);
  dom.p2Panel.classList.toggle('active', player === 2);
}

export function updateScoreboard(balls) {
  dom.p1Score.textContent = balls.filter((ball) => ball.number >= 1 && ball.number <= 7 && !ball.active).length;
  dom.p2Score.textContent = balls.filter((ball) => ball.number >= 9 && ball.number <= 15 && !ball.active).length;
  dom.p1Tray.innerHTML = '';
  dom.p2Tray.innerHTML = '';
  balls.filter((ball) => !ball.active && ball.number > 0 && ball.number !== 8).forEach((ball) => {
    const dot = document.createElement('i');
    dot.className = 'tray-ball';
    dot.style.background = `#${BALL_COLORS[ball.number - 1].toString(16).padStart(6, '0')}`;
    (ball.number <= 7 ? dom.p1Tray : dom.p2Tray).appendChild(dot);
  });
}

export function showFoul(reason) {
  clearTimeout(foulTimer);
  dom.foulReason.textContent = reason;
  dom.foulNotice.classList.remove('hidden');
  foulTimer = setTimeout(() => dom.foulNotice.classList.add('hidden'), 2600);
}

export function showWinner(winner) {
  dom.messageKicker.textContent = 'GAME OVER';
  dom.messageTitle.textContent = `PLAYER ${winner === 1 ? 'ONE' : 'TWO'} WINS`;
  dom.message.classList.remove('hidden');
}
