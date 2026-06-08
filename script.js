const COLORS = ['red', 'green', 'yellow', 'blue'];
const PLAYER_LABELS = {
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue'
};
const PLAYER_START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };
const PATH_SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const COLOR_STYLE = {
  red: { fill: '#ff5e6c', glow: '#ff8a98' },
  green: { fill: '#5bd68f', glow: '#9df2b7' },
  yellow: { fill: '#f7ea6b', glow: '#fff3a8' },
  blue: { fill: '#6ca7ff', glow: '#a3d4ff' }
};

const pathCoordinates = [];
for (let x = 7; x <= 14; x += 1) pathCoordinates.push({ x, y: 1 });
for (let y = 2; y <= 14; y += 1) pathCoordinates.push({ x: 14, y });
for (let x = 13; x >= 1; x -= 1) pathCoordinates.push({ x, y: 14 });
for (let y = 13; y >= 1; y -= 1) pathCoordinates.push({ x: 1, y });
for (let x = 2; x <= 6; x += 1) pathCoordinates.push({ x, y: 1 });

const homeCoordinates = {
  red: [
    { x: 7, y: 2 },
    { x: 7, y: 3 },
    { x: 7, y: 4 },
    { x: 7, y: 5 },
    { x: 7, y: 6 },
    { x: 7, y: 7 }
  ],
  green: [
    { x: 13, y: 7 },
    { x: 12, y: 7 },
    { x: 11, y: 7 },
    { x: 10, y: 7 },
    { x: 9, y: 7 },
    { x: 8, y: 7 }
  ],
  yellow: [
    { x: 8, y: 13 },
    { x: 8, y: 12 },
    { x: 8, y: 11 },
    { x: 8, y: 10 },
    { x: 8, y: 9 },
    { x: 8, y: 8 }
  ],
  blue: [
    { x: 2, y: 8 },
    { x: 3, y: 8 },
    { x: 4, y: 8 },
    { x: 5, y: 8 },
    { x: 6, y: 8 },
    { x: 7, y: 8 }
  ]
};

const nestCoordinates = {
  red: [
    { x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 3, y: 4 },
    { x: 4, y: 4 }
  ],
  green: [
    { x: 11, y: 3 },
    { x: 12, y: 3 },
    { x: 11, y: 4 },
    { x: 12, y: 4 }
  ],
  yellow: [
    { x: 11, y: 11 },
    { x: 12, y: 11 },
    { x: 11, y: 12 },
    { x: 12, y: 12 }
  ],
  blue: [
    { x: 3, y: 11 },
    { x: 4, y: 11 },
    { x: 3, y: 12 },
    { x: 4, y: 12 }
  ]
};

class Token {
  constructor(player, index) {
    this.player = player;
    this.index = index;
    this.status = 'nest';
    this.distance = -1;
    this.homeIndex = -1;
  }

  isFinished() {
    return this.status === 'finished';
  }
}

class Player {
  constructor(color, type) {
    this.color = color;
    this.type = type;
    this.tokens = Array.from({ length: 4 }, (_, index) => new Token(this, index));
  }

  get activeTokens() {
    return this.tokens.filter((token) => token.status !== 'finished');
  }
}

class SoundEngine {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      this.ctx = null;
    }
  }

  tone(frequency, length = 0.12, type = 'sine') {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + length);
  }

  click() {
    this.tone(540, 0.08);
  }

  roll() {
    this.tone(310, 0.18, 'square');
    this.tone(620, 0.12, 'triangle');
  }

  capture() {
    this.tone(180, 0.12, 'triangle');
    this.tone(430, 0.16, 'sawtooth');
  }

  win() {
    this.tone(880, 0.18, 'triangle');
    setTimeout(() => this.tone(1080, 0.22, 'triangle'), 120);
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById('ludoCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.rollButton = document.getElementById('rollButton');
    this.restartButton = document.getElementById('restartButton');
    this.modeSingle = document.getElementById('modeSingle');
    this.modeLocal = document.getElementById('modeLocal');
    this.themeToggle = document.getElementById('themeToggle');
    this.activePlayerLabel = document.getElementById('activePlayer');
    this.timerFill = document.getElementById('timerFill');
    this.turnTimer = document.getElementById('turnTimer');
    this.diceFace = document.getElementById('diceFace');
    this.diceLog = document.getElementById('diceLog');
    this.playerStatus = document.getElementById('playerStatus');
    this.gameModeLabel = document.getElementById('gameMode');
    this.turnCountLabel = document.getElementById('turnCount');
    this.scoreBoardLabel = document.getElementById('scoreBoard');
    this.logFeed = document.getElementById('logFeed');
    this.confettiLayer = document.getElementById('confettiLayer');

    this.sound = new SoundEngine();
    this.mode = 'single';
    this.timerDuration = 22;
    this.turnNumber = 1;
    this.score = { red: 0, green: 0, yellow: 0, blue: 0 };
    this.animatingToken = false;
    this.diceValue = null;
    this.boardScale = 1;

    this.setupListeners();
    this.resizeCanvas();
    this.resetGame();
    this.renderLoop();
  }

  setupListeners() {
    this.rollButton.addEventListener('click', () => this.startRoll());
    this.restartButton.addEventListener('click', () => this.resetGame());
    this.modeSingle.addEventListener('click', () => this.setMode('single'));
    this.modeLocal.addEventListener('click', () => this.setMode('local'));
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    this.canvas.addEventListener('click', (event) => this.handleBoardClick(event));
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  setMode(mode) {
    this.mode = mode;
    this.modeSingle.classList.toggle('active', mode === 'single');
    this.modeLocal.classList.toggle('active', mode === 'local');
    this.gameModeLabel.textContent = mode === 'single' ? 'Single Player' : 'Local Multiplayer';
    this.logMessage(`Mode changed to ${this.gameModeLabel.textContent}.`);
    this.resetGame();
  }

  toggleTheme() {
    document.body.classList.toggle('dark-mode');
    this.themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    const size = Math.min(parent.clientWidth, window.innerHeight * 0.65);
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(size * ratio);
    this.canvas.height = Math.floor(size * ratio);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.boardScale = size / 15;
  }

  resetGame() {
    this.stopTimer();
    this.turnNumber = 1;
    this.diceValue = null;
    this.animatingToken = false;
    this.players = this.createPlayers();
    this.currentPlayerIndex = 0;
    this.gameOver = false;
    this.logFeed.innerHTML = '';
    this.logMessage('Welcome to Ludo Star — roll to begin.');
    this.updateUI();
    this.startTurn();
  }

  createPlayers() {
    const types = this.mode === 'single' ? ['human', 'ai', 'ai', 'ai'] : ['human', 'human', 'human', 'human'];
    return COLORS.map((color, index) => new Player(color, types[index]));
  }

  startTurn() {
    if (this.gameOver) return;
    this.stopTimer();
    this.diceValue = null;
    this.animatingToken = false;
    this.turnTimer.textContent = `${this.timerDuration}s`;
    this.turnProgress = 1;
    this.drawTimerProgress();
    this.currentPlayer = this.players[this.currentPlayerIndex];
    this.logMessage(`${PLAYER_LABELS[this.currentPlayer.color]} player's turn.`);
    this.startTimer();
    this.updateUI();

    if (this.currentPlayer.type === 'ai') {
      this.rollButton.disabled = true;
      this.delay(900).then(() => this.startRoll(true));
    }
  }

  startRoll(isAuto = false) {
    if (this.gameOver || this.animatingToken || this.diceValue !== null) return;
    if (this.currentPlayer.type === 'ai' && !isAuto) return;
    this.diceValue = this.random(1, 6);
    this.animateDice(this.diceValue);
    this.logMessage(`${PLAYER_LABELS[this.currentPlayer.color]} rolled a ${this.diceValue}.`);
    this.playSound('roll');
    this.updateUI();
    this.delay(650).then(() => {
      this.resolveRoll();
    });
  }

  resolveRoll() {
    if (this.gameOver) return;
    const validTokens = this.getValidMoves(this.currentPlayer, this.diceValue);
    if (validTokens.length === 0) {
      this.logMessage('No tokens can move. Turn passes.');
      this.delay(700).then(() => this.completeTurn());
      return;
    }
    if (this.currentPlayer.type === 'ai') {
      this.delay(500).then(() => this.moveAI(validTokens));
    } else {
      this.logMessage('Choose a token to move.');
    }
    this.updateUI();
  }

  completeTurn() {
    if (this.gameOver) return;
    if (this.currentPlayer.type === 'ai') {
      this.rollButton.disabled = true;
    }
    if (this.diceValue === 6 && this.getValidMoves(this.currentPlayer, 6).length > 0) {
      this.logMessage('Extra turn granted for rolling a 6.');
      this.diceValue = null;
      this.updateUI();
      return;
    }
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.turnNumber += 1;
    this.startTurn();
  }

  handleBoardClick(event) {
    if (this.gameOver || this.animatingToken) return;
    if (this.currentPlayer.type !== 'human') return;
    if (this.diceValue === null) {
      this.logMessage('Roll the dice first.');
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const clickedToken = this.findTokenByHit(x, y);
    if (!clickedToken) return;
    if (clickedToken.player !== this.currentPlayer) return;
    if (!this.canMoveToken(clickedToken, this.diceValue)) return;

    this.moveToken(clickedToken);
  }

  findTokenByHit(clientX, clientY) {
    const { x: canvasX, y: canvasY } = this.canvas.getBoundingClientRect();
    const x = ((clientX - canvasX) / this.canvas.clientWidth) * (this.canvas.width / (window.devicePixelRatio || 1));
    const y = ((clientY - canvasY) / this.canvas.clientHeight) * (this.canvas.height / (window.devicePixelRatio || 1));
    const boardX = x / this.boardScale;
    const boardY = y / this.boardScale;
    const radius = 18;
    for (const player of this.players) {
      for (const token of player.tokens) {
        const { x: tx, y: ty } = this.getCanvasPosition(token);
        if (Math.hypot(boardX - tx, boardY - ty) < radius) {
          return token;
        }
      }
    }
    return null;
  }

  moveAI(validTokens) {
    const prioritized = validTokens.sort((a, b) => {
      const value = (token) => {
        if (token.status === 'nest') return 40;
        if (token.status === 'track' && this.willCapture(token, this.diceValue)) return 30;
        if (token.status === 'track' && token.distance + this.diceValue >= 52) return 20;
        return 10 + token.distance;
      };
      return value(b) - value(a);
    });
    this.moveToken(prioritized[0]);
  }

  async moveToken(token) {
    if (!this.canMoveToken(token, this.diceValue)) return;
    this.animatingToken = true;
    const from = this.getTokenPosition(token);
    const target = this.calculateTarget(token, this.diceValue);
    await this.animateToken(token, target);

    const occupied = this.resolveLanding(token, target);
    if (occupied) {
      this.playSound('capture');
      this.logMessage(`${PLAYER_LABELS[token.player.color]} captured an opponent!`);
    } else {
      this.playSound('click');
    }

    if (this.checkForWin(token.player)) {
      return;
    }

    if (this.diceValue === 6) {
      this.logMessage('Six rolled: keep the turn.');
      this.diceValue = null;
      this.animatingToken = false;
      this.updateUI();
      return;
    }

    this.diceValue = null;
    this.animatingToken = false;
    this.completeTurn();
  }

  async animateToken(token, target) {
    const start = this.getCanvasPosition(token);
    const end = this.getBoardCellCenter(target);
    const speed = 8;
    const dx = (end.x - start.x) / speed;
    const dy = (end.y - start.y) / speed;
    for (let frame = 0; frame <= speed; frame += 1) {
      token.preview = { x: start.x + dx * frame, y: start.y + dy * frame };
      await this.delay(18);
    }
    delete token.preview;
  }

  resolveLanding(token, target) {
    token.status = target.status;
    if (target.status === 'track') {
      token.distance = target.distance;
      token.homeIndex = -1;
      return this.captureOpponents(token);
    }
    if (target.status === 'home') {
      token.homeIndex = target.homeIndex;
      token.distance = -1;
      return false;
    }
    if (target.status === 'finished') {
      token.homeIndex = 5;
      token.distance = -1;
      return false;
    }
    if (target.status === 'nest') {
      token.distance = -1;
      token.homeIndex = -1;
      return false;
    }
    return false;
  }

  getValidMoves(player, diceValue) {
    return player.tokens.filter((token) => this.canMoveToken(token, diceValue));
  }

  canMoveToken(token, diceValue) {
    if (token.status === 'finished') return false;
    if (token.status === 'nest') return diceValue === 6;
    if (token.status === 'track') {
      const next = token.distance + diceValue;
      if (next < 52) return true;
      return next - 52 <= 5;
    }
    if (token.status === 'home') {
      const next = token.homeIndex + diceValue;
      return next <= 5;
    }
    return false;
  }

  calculateTarget(token, diceValue) {
    if (token.status === 'nest') {
      return { status: 'track', distance: 0 };
    }
    if (token.status === 'track') {
      const next = token.distance + diceValue;
      if (next < 52) {
        return { status: 'track', distance: next };
      }
      const homeStep = next - 52;
      return homeStep === 5 ? { status: 'finished' } : { status: 'home', homeIndex: homeStep };
    }
    if (token.status === 'home') {
      const next = token.homeIndex + diceValue;
      return next === 5 ? { status: 'finished' } : { status: 'home', homeIndex: next };
    }
    return { status: 'nest' };
  }

  willCapture(token, diceValue) {
    if (token.status !== 'track') return false;
    const target = this.calculateTarget(token, diceValue);
    if (target.status !== 'track') return false;
    const globalIndex = this.globalTrackIndex(token.player.color, target.distance);
    if (PATH_SAFE_INDICES.has(globalIndex)) return false;
    return this.players.some((player) => player.color !== token.player.color && player.tokens.some((opponent) => opponent.status === 'track' && this.globalTrackIndex(player.color, opponent.distance) === globalIndex));
  }

  captureOpponents(token) {
    const globalIndex = this.globalTrackIndex(token.player.color, token.distance);
    if (PATH_SAFE_INDICES.has(globalIndex)) return false;
    let captured = false;
    for (const player of this.players) {
      if (player.color === token.player.color) continue;
      for (const opponent of player.tokens) {
        if (opponent.status === 'track' && this.globalTrackIndex(player.color, opponent.distance) === globalIndex) {
          opponent.status = 'nest';
          opponent.distance = -1;
          opponent.homeIndex = -1;
          captured = true;
        }
      }
    }
    return captured;
  }

  globalTrackIndex(color, distance) {
    const start = PLAYER_START_INDEX[color];
    return (start + distance) % 52;
  }

  getTokenPosition(token) {
    if (token.status === 'nest') {
      return nestCoordinates[token.player.color][token.index];
    }
    if (token.status === 'track') {
      const globalIndex = this.globalTrackIndex(token.player.color, token.distance);
      return pathCoordinates[globalIndex];
    }
    if (token.status === 'home') {
      return homeCoordinates[token.player.color][token.homeIndex];
    }
    if (token.status === 'finished') {
      return homeCoordinates[token.player.color][5];
    }
    return nestCoordinates[token.player.color][token.index];
  }

  getBoardCellCenter(cell) {
    return {
      x: (cell.x + 0.5) * this.boardScale,
      y: (cell.y + 0.5) * this.boardScale
    };
  }

  getCanvasPosition(token) {
    const location = token.preview ? token.preview : this.getTokenPosition(token);
    return {
      x: (location.x + 0.5) * this.boardScale,
      y: (location.y + 0.5) * this.boardScale
    };
  }

  startTimer() {
    this.elapsed = 0;
    this.timerStart = performance.now();
    this.timerId = requestAnimationFrame(this.timerFrame.bind(this));
  }

  stopTimer() {
    if (this.timerId) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }

  timerFrame(timestamp) {
    if (this.gameOver) return;
    this.elapsed = Math.min((timestamp - this.timerStart) / 1000, this.timerDuration);
    const remaining = Math.max(Math.ceil(this.timerDuration - this.elapsed), 0);
    this.turnTimer.textContent = `${remaining}s`;
    this.drawTimerProgress(remaining / this.timerDuration);
    if (remaining === 0) {
      this.logMessage('Time expired. Turn moves on.');
      this.diceValue = null;
      this.animatingToken = false;
      this.completeTurn();
      return;
    }
    this.timerId = requestAnimationFrame(this.timerFrame.bind(this));
  }

  drawTimerProgress(fraction = 1) {
    this.timerFill.style.transform = `scaleX(${fraction})`;
  }

  checkForWin(player) {
    if (player.tokens.every((token) => token.status === 'finished')) {
      this.gameOver = true;
      this.score[player.color] += 1;
      this.updateScoreboard();
      this.logMessage(`${PLAYER_LABELS[player.color]} has won the game!`);
      this.triggerCelebration(player.color);
      this.playSound('win');
      return true;
    }
    return false;
  }

  triggerCelebration(color) {
    this.confettiLayer.classList.remove('hidden');
    this.confettiLayer.innerHTML = '';
    for (let i = 0; i < 42; i += 1) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.background = COLOR_STYLE[COLOR_STYLE[color] ? color : 'red'].fill;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.top = `${Math.random() * 10}%`;
      piece.style.opacity = `${0.7 + Math.random() * 0.3}`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      this.confettiLayer.appendChild(piece);
      this.animateConfettiPiece(piece);
    }
    setTimeout(() => this.confettiLayer.classList.add('hidden'), 3400);
  }

  animateConfettiPiece(piece) {
    const distance = 120 + Math.random() * 80;
    piece.animate(
      [
        { transform: piece.style.transform, opacity: 1, top: piece.style.top },
        { transform: `translate3d(${(Math.random() - 0.5) * 120}px, ${distance}px, 0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ],
      {
        duration: 2400 + Math.random() * 800,
        easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)'
      }
    );
  }

  logMessage(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    this.logFeed.prepend(entry);
    while (this.logFeed.children.length > 12) {
      this.logFeed.removeChild(this.logFeed.lastElementChild);
    }
  }

  updateScoreboard() {
    this.scoreBoardLabel.textContent = `Red ${this.score.red} / Green ${this.score.green} / Yellow ${this.score.yellow} / Blue ${this.score.blue}`;
  }

  updateUI() {
    this.activePlayerLabel.textContent = PLAYER_LABELS[this.currentPlayer.color];
    this.turnCountLabel.textContent = `${this.turnNumber}`;
    this.diceFace.textContent = this.diceValue || '-';
    this.diceLog.textContent = this.diceValue ? `Last roll: ${this.diceValue}` : 'Awaiting roll';
    this.rollButton.disabled = !!this.diceValue || this.gameOver || (this.currentPlayer.type === 'ai');
    this.updatePlayerStatus();
    this.updateScoreboard();
    this.renderBoard();
  }

  updatePlayerStatus() {
    this.playerStatus.innerHTML = '';
    for (const player of this.players) {
      const item = document.createElement('div');
      item.className = 'status-item';
      const label = document.createElement('div');
      label.innerHTML = `<strong>${PLAYER_LABELS[player.color]}</strong><span>${player.type === 'ai' ? 'AI opponent' : 'Human'}</span>`;
      const dot = document.createElement('div');
      dot.className = 'status-dot';
      dot.style.background = COLOR_STYLE[player.color].fill;
      item.append(label, dot);
      this.playerStatus.appendChild(item);
      const tokens = document.createElement('div');
      tokens.className = 'status-item';
      const counts = this.getTokenSummary(player);
      tokens.innerHTML = `<span>Home: ${counts.finished} / Track: ${counts.track} / Nest: ${counts.nest}</span><strong>${counts.ready ? 'Ready' : 'Waiting'}</strong>`;
      this.playerStatus.appendChild(tokens);
    }
  }

  getTokenSummary(player) {
    return player.tokens.reduce(
      (summary, token) => {
        summary[token.status] += 1;
        return summary;
      },
      { nest: 0, track: 0, home: 0, finished: 0, ready: false }
    );
  }

  renderBoard() {
    const ctx = this.ctx;
    const size = this.boardScale * 15;
    ctx.clearRect(0, 0, size, size);
    this.drawBoardGrid(ctx);
    this.drawHomeAreas(ctx);
    this.drawTrackSquares(ctx);
    this.drawHomePaths(ctx);
    this.drawCenterCross(ctx);
    this.drawTokens(ctx);
  }

  renderLoop() {
    this.renderBoard();
    requestAnimationFrame(() => this.renderLoop());
  }

  drawBoardGrid(ctx) {
    ctx.save();
    const step = this.boardScale;
    ctx.fillStyle = '#081925';
    ctx.fillRect(0, 0, step * 15, step * 15);
    for (let row = 0; row < 15; row += 1) {
      for (let col = 0; col < 15; col += 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(col * step, row * step, step, step);
      }
    }
    ctx.restore();
  }

  drawHomeAreas(ctx) {
    const fillColors = {
      red: '#ff5e6c',
      green: '#5bd68f',
      yellow: '#f7ea6b',
      blue: '#6ca7ff'
    };
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = fillColors.red;
    ctx.fillRect(0, 0, this.boardScale * 6, this.boardScale * 6);
    ctx.fillStyle = fillColors.green;
    ctx.fillRect(this.boardScale * 9, 0, this.boardScale * 6, this.boardScale * 6);
    ctx.fillStyle = fillColors.yellow;
    ctx.fillRect(this.boardScale * 9, this.boardScale * 9, this.boardScale * 6, this.boardScale * 6);
    ctx.fillStyle = fillColors.blue;
    ctx.fillRect(0, this.boardScale * 9, this.boardScale * 6, this.boardScale * 6);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawTrackSquares(ctx) {
    ctx.save();
    ctx.fillStyle = '#12233f';
    for (let index = 0; index < pathCoordinates.length; index += 1) {
      const cell = pathCoordinates[index];
      const x = cell.x * this.boardScale;
      const y = cell.y * this.boardScale;
      ctx.fillRect(x, y, this.boardScale, this.boardScale);
      if (PATH_SAFE_INDICES.has(index)) {
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fillRect(x + this.boardScale * 0.15, y + this.boardScale * 0.15, this.boardScale * 0.7, this.boardScale * 0.7);
        ctx.fillStyle = '#12233f';
      }
    }
    ctx.restore();
  }

  drawHomePaths(ctx) {
    ctx.save();
    const draws = [
      { color: 'red', path: homeCoordinates.red },
      { color: 'green', path: homeCoordinates.green },
      { color: 'yellow', path: homeCoordinates.yellow },
      { color: 'blue', path: homeCoordinates.blue }
    ];
    draws.forEach((entry) => {
      ctx.fillStyle = COLOR_STYLE[entry.color].fill;
      entry.path.slice(0, 5).forEach((cell) => {
        ctx.fillRect(cell.x * this.boardScale, cell.y * this.boardScale, this.boardScale, this.boardScale);
      });
      const last = entry.path[5];
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(last.x * this.boardScale, last.y * this.boardScale, this.boardScale, this.boardScale);
    });
    ctx.restore();
  }

  drawCenterCross(ctx) {
    ctx.save();
    ctx.fillStyle = '#0f1e33';
    ctx.fillRect(this.boardScale * 6, this.boardScale * 6, this.boardScale * 3, this.boardScale * 3);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(this.boardScale * 7, this.boardScale * 7, this.boardScale, this.boardScale);
    ctx.restore();
  }

  drawTokens(ctx) {
    for (const player of this.players) {
      for (const token of player.tokens) {
        const position = this.getCanvasPosition(token);
        const radius = this.boardScale * 0.32;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.32)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = COLOR_STYLE[player.color].fill;
        ctx.beginPath();
        ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.stroke();
        ctx.closePath();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#f9fbff';
        ctx.font = `${this.boardScale * 0.35}px Inter`; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player.color.charAt(0).toUpperCase(), position.x, position.y);
        ctx.restore();
      }
    }
  }

  random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  playSound(name) {
    if (!this.sound) return;
    switch (name) {
      case 'roll':
        this.sound.roll();
        break;
      case 'click':
        this.sound.click();
        break;
      case 'capture':
        this.sound.capture();
        break;
      case 'win':
        this.sound.win();
        break;
      default:
        break;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => new Game());
