'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - azul pálido
  '#ffb74d', // L - orange
  '#b0bec5', // N - tuerca (gris metálico)
  '#aed581', // Y - pentominó (verde lima)
  '#4db6ac', // U - teal
  '#7986cb', // + - cruz (índigo)
  '#f06292', // 1 - single 1×1 (rosa)
  '#ff5252', // B - bomba (rojo)
  '#fff176', // R─ - rayo horizontal (amarillo eléctrico)
  '#fff176', // R│ - rayo vertical
  '#e040fb', // T - tinte (magenta)
  '#ffffff', // * - comodín (arcoíris, ver drawBlock)
  '#40c4ff', // G - gravedad (azul claro)
  '#b3e5fc', // C - congelar (hielo)
  '#616161', // # - basura (gris oscuro, solo tablero)
  '#8d6e63', // F - fijo (marrón piedra, solo tablero)
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca
  [[0,9,0,0],[9,9,9,9],[0,0,0,0],[0,0,0,0]], // Y - pentominó
  [[10,0,10],[10,10,10],[0,0,0]],             // U
  [[0,11,0],[11,11,11],[0,11,0]],             // + - cruz
  [[12]],                                      // 1×1 - recompensa tras Tetris
  [[13]],                                      // B - bomba, cada BOMB_EVERY líneas
  [[14]],                                      // R─ - rayo horizontal, cada LIGHTNING_EVERY líneas
  [[15]],                                      // R│ - rayo vertical
  [[16]],                                      // T - tinte, cada TINT_EVERY líneas
  null,                                        // * - comodín: solo existe en el tablero
  [[18]],                                      // G - gravedad, cada GRAVITY_EVERY líneas
  [[19]],                                      // C - congelar, cada FREEZE_EVERY líneas
  null,                                        // # - basura: solo existe en el tablero
  null,                                        // F - fijo: solo existe en el tablero
];

// El pool aleatorio excluye las especiales: single (recompensa), bomba y rayo
const SINGLE_TYPE = 12;
const BOMB_TYPE = 13;
const LIGHTNING_H = 14;
const LIGHTNING_V = 15;
const TINT_TYPE = 16;
const WILD_TYPE = 17; // celda comodín: solo existe en el tablero
const GRAVITY_TYPE = 18;
const FREEZE_TYPE = 19;
const GARBAGE_TYPE = 20; // celda de basura: solo existe en el tablero
const FIXED_TYPE = 21; // bloque fijo pre-colocado (desafío `clear`): solo existe en el tablero
// Peso de cada tipo en el pool aleatorio: clásicas comunes, especiales (8-11) ocasionales
const PIECE_WEIGHTS = [0, 6, 6, 6, 6, 6, 6, 6, 1, 1, 1, 1];
const WEIGHT_TOTAL = PIECE_WEIGHTS.reduce((a, b) => a + b, 0);
const BOMB_EVERY = 10;
const LIGHTNING_EVERY = 15;
const TINT_EVERY = 12;
const GRAVITY_EVERY = 20;
const FREEZE_EVERY = 8;
const FREEZE_MS = 5000;
const WILD_BONUS = 20;

// Habilidades cargables: la barra de energía se llena al limpiar líneas; `E` abre el menú
const ENERGY_MAX = 100;
const ENERGY_PER_LINE = 10;
const QUEUE_SIZE = 4; // next + QUEUE_SIZE = 5 piezas visibles
const PREVIEW_PIECES = 10;
const SLOW_MS = 10000;
const SLOW_FACTOR = 2; // caída automática a la mitad de velocidad
const SKILLS = [
  { name: 'Ver 5 piezas', desc: 'Muestra las siguientes 5 piezas durante 10 piezas', activate() { previewLeft = PREVIEW_PIECES; } },
  { name: 'Intercambiar pieza', desc: 'Cambia la pieza actual por otra aleatoria', activate() { return swapCurrent(); } },
  { name: 'Ralentizar tiempo', desc: 'La caída automática va a la mitad de velocidad durante 10s', activate() { slowLeft = SLOW_MS; } },
  { name: 'Deshacer colocación', desc: 'Revierte la última pieza colocada', activate() { return undoLast(); } },
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const T_TYPE = 3;
const TSPIN_SCORES = [400, 800, 1200, 1600];
const TSPIN_NAMES = ['T-SPIN', 'T-SPIN SINGLE', 'T-SPIN DOUBLE', 'T-SPIN TRIPLE'];
const TSPIN_FLASH_MS = 1500;
const B2B_MULT = 1.5;
const PERFECT_BONUS = 2000;
const PERFECT_FLASH_MS = 2000;
const REVERSE_FLASH_MS = 1500;
const INVISIBLE_FADE_MS = 700;
const CLEAR_FLASH_MS = 150;
const FLOAT_MS = 900;
const PULSE_MS = 300;
const PARTICLES_PER_CELL = 2;
const SOUND_KEY = 'tetris-sound';
const CHALLENGE_KEY = 'tetris-challenges';
// Desafíos progresivos: alcanzar `target` de `goal` (lines | score | tetris) antes de `timeMs`;
// `survive`: aguantar `timeMs` (target = segundos) mientras sube una fila de basura cada `garbageMs`
// `clear`: el tablero arranca con `layout` (strings de COLS chars, '#' = bloque fijo, alineado al fondo);
// se gana al eliminar todos los fijos (el target es el nº de celdas del layout)
// `invisible`: las piezas se desvanecen al bloquearse (el montón no se ve; sin ghost); combinable con cualquier goal
// `reverseLevel`: desde ese nivel la rotación es antihoraria; combinable con cualquier goal
const CHALLENGES = [
  { name: '10 líneas en 60 s', goal: 'lines', target: 10, timeMs: 60000 },
  { name: '20 líneas en 90 s', goal: 'lines', target: 20, timeMs: 90000 },
  { name: '40 líneas en 2 min', goal: 'lines', target: 40, timeMs: 120000 },
  { name: '5.000 puntos en 2 min', goal: 'score', target: 5000, timeMs: 120000 },
  { name: '3 Tetris en 3 min', goal: 'tetris', target: 3, timeMs: 180000 },
  { name: 'Sobrevive 90 s con basura', goal: 'survive', target: 90, timeMs: 90000, garbageMs: 10000 },
  { name: 'Limpia la pirámide', goal: 'clear', timeMs: 120000, layout: [
    '....##....',
    '...####...',
    '..######..',
    '.########.',
  ] },
  { name: 'Limpia las columnas', goal: 'clear', timeMs: 150000, layout: [
    '#..#..#..#',
    '#..#..#..#',
    '#.##..#.##',
    '#.##.##.##',
    '####.##.##',
    '####.#####',
  ] },
  { name: 'Limpia el damero', goal: 'clear', timeMs: 180000, layout: [
    '#.#.#.#.#.',
    '.#.#.#.#.#',
    '#.#.#.#.#.',
    '.#.#.#.#.#',
    '#.#.#.#.#.',
    '.#.#.#.#.#',
    '#.#.#.#.#.',
    '.#.#.#.#.#',
  ] },
  { name: '10 líneas a ciegas en 2 min', goal: 'lines', target: 10, timeMs: 120000, invisible: true },
  { name: '20 líneas a ciegas en 3 min', goal: 'lines', target: 20, timeMs: 180000, invisible: true },
  { name: '20 líneas, inversa desde nivel 2', goal: 'lines', target: 20, timeMs: 150000, reverseLevel: 2 },
  { name: '40 líneas, inversa desde nivel 3', goal: 'lines', target: 40, timeMs: 240000, reverseLevel: 3 },
];
const RAINBOW = ['#ff5252', '#ffd54f', '#81c784', '#4dd0e1', '#ba68c8'];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const b2bEl = document.getElementById('b2b');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeBtn = document.getElementById('theme-toggle');
const soundBtn = document.getElementById('sound-toggle');
const modeSelect = document.getElementById('mode-select');
const challengeInfo = document.getElementById('challenge-info');
const goalEl = document.getElementById('goal');
const timerEl = document.getElementById('timer');
const energyBar = document.getElementById('energy-bar');
const energyFill = document.getElementById('energy-fill');
const queueSection = document.getElementById('queue-section');
const queueLabel = document.getElementById('queue-label');
const queueCanvas = document.getElementById('queue-canvas');
const queueCtx = queueCanvas.getContext('2d');
const skillMenu = document.getElementById('skill-menu');
const skillList = document.getElementById('skill-list');

const THEME_KEY = 'tetris-theme';
let gridColor = '#22222e';
let blockEdge = 'transparent';
let audioCtx = null;
let muted = false;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, rewardPending, bombPending, lightningPending, tintPending, gravityPending, freezePending, freezeLeft, combo, b2b, lastRotate, tspinText, tspinLeft, perfectLeft, reverseLeft, flashRows, flashLeft, particles, floats, comboPulse, challenge, timeLeft, tetrises, shownSecs, garbageLeft, fixedTotal, fadeCells, fadeLeft, queue, energy, previewLeft, slowLeft, choosing, undoState;

// Audio sintetizado (Web Audio); el contexto se crea al primer sonido, ya dentro de un gesto del usuario
function getAudio() {
  if (muted) return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, dur, type, delay) {
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime + (delay || 0);
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.15, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Arpegio de `n` notas; el tono sube ~2 semitonos por cada combo (tope en 12)
function playClear(n, comboN, strong) {
  const base = 440 * 2 ** (Math.min(Math.max(comboN, 1) - 1, 12) / 6);
  const steps = [0, 4, 7, 12];
  for (let i = 0; i < Math.max(n, 1); i++)
    playTone(base * 2 ** (steps[i] / 12), 0.18, strong ? 'square' : 'triangle', i * 0.07);
}

function playPerfect() {
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => playTone(f, 0.3, 'triangle', i * 0.08));
}

function playBreak() {
  playTone(110, 0.15, 'sawtooth');
}

function setMuted(m, save) {
  muted = m;
  soundBtn.textContent = m ? '🔇' : '🔊';
  soundBtn.setAttribute('aria-pressed', String(m));
  soundBtn.setAttribute('aria-label', m ? 'Activar sonido' : 'Silenciar sonido');
  if (save) {
    try { localStorage.setItem(SOUND_KEY, m ? 'off' : 'on'); } catch (e) { /* almacenamiento no disponible */ }
  }
}

function loadSound() {
  let saved = null;
  try { saved = localStorage.getItem(SOUND_KEY); } catch (e) { /* ignorar */ }
  setMuted(saved === 'off', false);
}

function pulseEl(el) {
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
}

// Efectos al limpiar líneas: flash, partículas, texto flotante, pulso de HUD y sonido
function chainFx(rows, gained, cleared, strong) {
  flashRows = rows.map(r => r.y);
  flashLeft = CLEAR_FLASH_MS;
  const perRow = PARTICLES_PER_CELL + Math.min(combo, 6);
  for (const row of rows) {
    row.cells.forEach((v, c) => {
      for (let i = 0; i < perRow; i++) {
        const life = 600 + Math.random() * 300;
        particles.push({
          x: c * BLOCK + BLOCK / 2,
          y: row.y * BLOCK + BLOCK / 2,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -Math.random() * 0.25,
          life,
          max: life,
          color: v === WILD_TYPE ? RAINBOW[Math.floor(Math.random() * RAINBOW.length)] : COLORS[v]
        });
      }
    });
  }
  const midY = rows.reduce((s, r) => s + r.y, 0) / rows.length;
  floats.push({ text: '+' + gained.toLocaleString(), x: canvas.width / 2, y: midY * BLOCK + BLOCK / 2, life: FLOAT_MS });
  if (combo > 1) { comboPulse = PULSE_MS; pulseEl(comboEl); }
  if (b2b > 1) pulseEl(b2bEl);
  playClear(cleared, combo, strong);
  if (perfectLeft === PERFECT_FLASH_MS) playPerfect();
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(forcedType) {
  let type = forcedType;
  if (!type) {
    let roll = Math.random() * WEIGHT_TOTAL;
    type = 1;
    while (type < PIECE_WEIGHTS.length - 1 && (roll -= PIECE_WEIGHTS[type]) >= 0) type++;
  }
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function rotateCCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[cols - 1 - c][r] = shape[r][c];
  return result;
}

function isLightning(type) {
  return type === LIGHTNING_H || type === LIGHTNING_V;
}

function tryRotate() {
  if (isLightning(current.type)) {
    // 1×1: solo alterna la orientación
    current.type = current.type === LIGHTNING_H ? LIGHTNING_V : LIGHTNING_H;
    current.shape = [[current.type]];
    return;
  }
  const rotated = isReversed() ? rotateCCW(current.shape) : rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastRotate = true;
      return;
    }
  }
}

// Habilidad: cambia `current` por otra pieza del pool (tipo distinto); false si no cabe
function swapCurrent() {
  let piece;
  do { piece = randomPiece(); } while (piece.type === current.type);
  const spots = [0, -1, 1, -2, 2].map(k => ({ x: current.x + k, y: current.y }));
  spots.push({ x: piece.x, y: piece.y });
  const spot = spots.find(s => !collide(piece.shape, s.x, s.y));
  if (!spot) return false;
  piece.x = spot.x;
  piece.y = spot.y;
  current = piece;
  lastRotate = false;
  return true;
}

function clonePiece(p) {
  return { ...p, shape: p.shape.map(r => [...r]) };
}

// Deshacer: foto del estado justo antes de bloquear la pieza (un solo nivel)
function saveUndo() {
  undoState = {
    board: board.map(r => [...r]),
    type: current.type,
    next: clonePiece(next),
    queue: queue.map(clonePiece),
    score, lines, level, dropInterval, rewardPending, bombPending, lightningPending,
    tintPending, gravityPending, freezePending, freezeLeft, combo, b2b, tetrises, previewLeft,
  };
}

// Habilidad: revierte la última colocación y devuelve la pieza arriba; false si no hay nada que deshacer
function undoLast() {
  if (!undoState) return false;
  const s = undoState;
  const piece = randomPiece(s.type);
  const saved = board;
  board = s.board;
  const fits = !collide(piece.shape, piece.x, piece.y);
  if (!fits) { board = saved; return false; }
  next = s.next;
  queue = s.queue;
  ({ score, lines, level, dropInterval, rewardPending, bombPending, lightningPending,
    tintPending, gravityPending, freezePending, freezeLeft, combo, b2b, tetrises, previewLeft } = s);
  current = piece;
  lastRotate = false;
  dropAccum = 0;
  fadeLeft = 0;
  undoState = null;
  updateHUD();
  drawNext();
  return true;
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

// Bomba: vacía el área 3×3 centrada en su celda; sin gravedad ni puntos
function explode() {
  for (let r = current.y - 1; r <= current.y + 1; r++)
    for (let c = current.x - 1; c <= current.x + 1; c++)
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
}

// Rayo: horizontal elimina su fila (las de arriba bajan); vertical vacía su columna. Sin puntos
function strike() {
  if (current.type === LIGHTNING_H) {
    board.splice(current.y, 1);
    board.unshift(new Array(COLS).fill(0));
  } else {
    for (let r = 0; r < ROWS; r++) board[r][current.x] = 0;
  }
}

// Tinte: todas las celdas del color sobre el que cae pasan a comodín. Sin puntos
function tint() {
  const below = current.y + 1;
  const target = below < ROWS ? board[below][current.x] : 0;
  if (!target || target === WILD_TYPE || target === FIXED_TYPE) return;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === target) board[r][c] = WILD_TYPE;
}

// Gravedad: cada columna cae hasta el fondo, eliminando huecos. Puede completar filas, que puntúan normal
function gravity() {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][c]) continue;
      const v = board[r][c];
      board[r][c] = 0;
      board[write--][c] = v;
    }
  }
  clearLines();
}

// Basura: sube todo una fila y entra una fila gris con un hueco aleatorio por abajo
function addGarbage() {
  if (board[0].some(Boolean)) { endGame(); return; }
  undoState = null; // el tablero ya cambió: no se puede revertir
  board.shift();
  const hole = Math.floor(Math.random() * COLS);
  board.push(Array.from({ length: COLS }, (_, c) => (c === hole ? 0 : GARBAGE_TYPE)));
  if (collide(current.shape, current.x, current.y)) {
    // La pieza en caída sube con la pila; si no cabe, fin de partida
    if (current.y > 0 && !collide(current.shape, current.x, current.y - 1)) current.y--;
    else endGame();
  }
}

// Desafío `clear`: coloca el layout al fondo del tablero y devuelve cuántos bloques fijos puso
function placeLayout(layout) {
  let n = 0;
  const top = ROWS - layout.length;
  layout.forEach((row, i) => {
    for (let c = 0; c < COLS; c++) {
      if (row[c] === '#') { board[top + i][c] = FIXED_TYPE; n++; }
    }
  });
  return n;
}

function countFixed() {
  let n = 0;
  for (const row of board) for (const v of row) if (v === FIXED_TYPE) n++;
  return n;
}

// T-spin: T fijada justo tras rotar, con ≥3 esquinas de su caja 3×3 ocupadas (fuera del tablero cuenta)
function isTSpin() {
  if (current.type !== T_TYPE || !lastRotate) return false;
  let filled = 0;
  for (const [dr, dc] of [[0, 0], [0, 2], [2, 0], [2, 2]]) {
    const r = current.y + dr, c = current.x + dc;
    if (c < 0 || c >= COLS || r >= ROWS || (r >= 0 && board[r][c])) filled++;
  }
  return filled >= 3;
}

function clearLines(tspin) {
  let cleared = 0;
  let wilds = 0;
  const fullRows = [];
  const before = score;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      fullRows.push({ y: r - cleared, cells: [...board[r]] });
      wilds += board[r].filter(v => v === WILD_TYPE).length;
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared === 4) { rewardPending = true; tetrises++; }
  if (cleared) {
    if (Math.floor((lines + cleared) / BOMB_EVERY) > Math.floor(lines / BOMB_EVERY)) bombPending = true;
    if (Math.floor((lines + cleared) / LIGHTNING_EVERY) > Math.floor(lines / LIGHTNING_EVERY)) lightningPending = true;
    if (Math.floor((lines + cleared) / TINT_EVERY) > Math.floor(lines / TINT_EVERY)) tintPending = true;
    if (Math.floor((lines + cleared) / GRAVITY_EVERY) > Math.floor(lines / GRAVITY_EVERY)) gravityPending = true;
    if (Math.floor((lines + cleared) / FREEZE_EVERY) > Math.floor(lines / FREEZE_EVERY)) freezePending = true;
    lines += cleared;
    const wasFull = energy >= ENERGY_MAX;
    energy = Math.min(ENERGY_MAX, energy + cleared * ENERGY_PER_LINE);
    if (!wasFull && energy >= ENERGY_MAX) playTone(880, 0.25, 'triangle');
    const hard = cleared === 4 || tspin;
    const b2bBonus = hard && b2b > 0;
    b2b = hard ? b2b + 1 : 0;
    combo++;
    const base = (tspin ? TSPIN_SCORES[cleared] : LINE_SCORES[cleared]) || 0;
    score += Math.round((base * level * (b2bBonus ? B2B_MULT : 1) + wilds * WILD_BONUS * level) * combo);
    if (board.every(row => row.every(v => v === 0))) {
      score += PERFECT_BONUS * level;
      perfectLeft = PERFECT_FLASH_MS;
    }
    const wasReversed = isReversed();
    level = Math.floor(lines / 10) + 1;
    if (!wasReversed && isReversed()) {
      reverseLeft = REVERSE_FLASH_MS;
      playTone(220, 0.3, 'sawtooth');
    }
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
    chainFx(fullRows, score - before, cleared, hard);
  } else if (tspin) {
    score += TSPIN_SCORES[0] * level;
    updateHUD();
    playTone(330, 0.2, 'square');
  }
  if (tspin) {
    tspinText = TSPIN_NAMES[cleared] || TSPIN_NAMES[3];
    tspinLeft = TSPIN_FLASH_MS;
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  if (gy !== current.y) lastRotate = false;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastRotate = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

// Desafío `reverseLevel`: desde ese nivel la rotación es antihoraria
function isReversed() {
  return challenge >= 0 && !!CHALLENGES[challenge].reverseLevel && level >= CHALLENGES[challenge].reverseLevel;
}

// Desafío `invisible`: el montón no se dibuja mientras la partida sigue viva
function isInvisible() {
  return challenge >= 0 && !!CHALLENGES[challenge].invisible && !gameOver;
}

function lockPiece() {
  saveUndo();
  if (current.type === BOMB_TYPE) {
    explode();
  } else if (isLightning(current.type)) {
    strike();
  } else if (current.type === TINT_TYPE) {
    tint();
  } else if (current.type === GRAVITY_TYPE) {
    gravity();
  } else if (current.type === FREEZE_TYPE) {
    freezeLeft = FREEZE_MS;
  } else {
    const tspin = isTSpin();
    if (isInvisible()) {
      fadeCells = [];
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) fadeCells.push({ x: current.x + c, y: current.y + r, type: current.shape[r][c] });
      fadeLeft = INVISIBLE_FADE_MS;
    }
    merge();
    if (!clearLines(tspin)) {
      if (combo > 1) playBreak();
      combo = 0;
      updateHUD();
    }
  }
  if (challenge >= 0) {
    updateHUD();
    if (challengeProgress() >= challengeTarget()) {
      winChallenge();
      return;
    }
  }
  spawn();
}

function challengeTarget() {
  const ch = CHALLENGES[challenge];
  return ch.goal === 'clear' ? fixedTotal : ch.target;
}

function challengeProgress() {
  const ch = CHALLENGES[challenge];
  if (ch.goal === 'clear') return fixedTotal - countFixed();
  if (ch.goal === 'survive') return Math.floor((ch.timeMs - Math.max(timeLeft, 0)) / 1000);
  return ch.goal === 'lines' ? lines : ch.goal === 'score' ? score : tetrises;
}

function getUnlocked() {
  let n = 0;
  try { n = parseInt(localStorage.getItem(CHALLENGE_KEY), 10) || 0; } catch (e) { /* ignorar */ }
  return Math.min(Math.max(n, 0), CHALLENGES.length - 1);
}

// Opciones del selector: Normal + desafíos; los no desbloqueados quedan bloqueados
function buildModeOptions() {
  const unlocked = getUnlocked();
  const sel = modeSelect.value || '-1';
  modeSelect.innerHTML = '';
  const opts = [{ value: -1, text: 'Normal', locked: false }];
  CHALLENGES.forEach((ch, i) => {
    const locked = i > unlocked;
    opts.push({ value: i, text: `${locked ? '🔒 ' : ''}${i + 1}. ${ch.name}`, locked });
  });
  for (const o of opts) {
    const el = document.createElement('option');
    el.value = o.value;
    el.textContent = o.text;
    el.disabled = o.locked;
    modeSelect.appendChild(el);
  }
  modeSelect.value = sel;
}

function winChallenge() {
  const unlocked = Math.max(getUnlocked(), Math.min(challenge + 1, CHALLENGES.length - 1));
  try { localStorage.setItem(CHALLENGE_KEY, String(unlocked)); } catch (e) { /* almacenamiento no disponible */ }
  buildModeOptions();
  updateHUD();
  playPerfect();
  endGame('¡DESAFÍO SUPERADO!');
}

function updateTimer() {
  const secs = Math.ceil(Math.max(timeLeft, 0) / 1000);
  if (secs === shownSecs) return;
  shownSecs = secs;
  timerEl.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

function spawn() {
  lastRotate = false;
  if (rewardPending) {
    // Recompensa: el single pasa delante y `next` se conserva
    rewardPending = false;
    current = randomPiece(SINGLE_TYPE);
  } else {
    current = next;
    // Prioridad bomba > rayo > tinte > gravedad > congelar; el resto queda pendiente si coinciden
    if (bombPending) {
      next = randomPiece(BOMB_TYPE);
      bombPending = false;
    } else if (lightningPending) {
      next = randomPiece(LIGHTNING_H);
      lightningPending = false;
    } else if (tintPending) {
      next = randomPiece(TINT_TYPE);
      tintPending = false;
    } else if (gravityPending) {
      next = randomPiece(GRAVITY_TYPE);
      gravityPending = false;
    } else if (freezePending) {
      next = randomPiece(FREEZE_TYPE);
      freezePending = false;
    } else {
      next = queue.shift();
      queue.push(randomPiece());
    }
  }
  if (previewLeft > 0) previewLeft--;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo > 1 ? `x${combo}` : '—';
  b2bEl.textContent = b2b > 1 ? `x${b2b}` : '—';
  energyFill.style.width = `${energy}%`;
  energyBar.classList.toggle('full', energy >= ENERGY_MAX);
  challengeInfo.hidden = challenge < 0;
  if (challenge >= 0) {
    const target = challengeTarget();
    goalEl.textContent = `${Math.min(challengeProgress(), target).toLocaleString()}/${target.toLocaleString()}`;
    updateTimer();
  }
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  let color = COLORS[colorIndex];
  if (colorIndex === WILD_TYPE) {
    const g = context.createLinearGradient(x * size, y * size, (x + 1) * size, (y + 1) * size);
    ['#ff5252', '#ffd54f', '#81c784', '#4dd0e1', '#ba68c8'].forEach((c, i) => g.addColorStop(i / 4, c));
    color = g;
  }
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (isLightning(colorIndex)) {
    // barra oscura que indica la orientación
    context.fillStyle = 'rgba(0,0,0,0.5)';
    if (colorIndex === LIGHTNING_H) context.fillRect(x * size + 4, y * size + size / 2 - 2, size - 8, 4);
    else context.fillRect(x * size + size / 2 - 2, y * size + 4, 4, size - 8);
  }
  if (colorIndex === GRAVITY_TYPE) {
    // triángulo oscuro apuntando hacia abajo
    context.fillStyle = 'rgba(0,0,0,0.5)';
    context.beginPath();
    context.moveTo(x * size + 7, y * size + 9);
    context.lineTo(x * size + size - 7, y * size + 9);
    context.lineTo(x * size + size / 2, y * size + size - 7);
    context.closePath();
    context.fill();
  }
  if (colorIndex === FREEZE_TYPE) {
    // copo: tres líneas oscuras cruzadas
    context.strokeStyle = 'rgba(0,0,0,0.5)';
    context.lineWidth = 2;
    const cx = x * size + size / 2, cy = y * size + size / 2, rad = size / 2 - 6;
    context.beginPath();
    for (let a = 0; a < 3; a++) {
      const ang = a * Math.PI / 3;
      context.moveTo(cx - Math.cos(ang) * rad, cy - Math.sin(ang) * rad);
      context.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
    }
    context.stroke();
  }
  if (blockEdge !== 'transparent') {
    context.strokeStyle = blockEdge;
    context.lineWidth = 1;
    context.strokeRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  const hidden = isInvisible();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!hidden || board[r][c] === GARBAGE_TYPE || board[r][c] === FIXED_TYPE)
        drawBlock(ctx, c, r, board[r][c], BLOCK);
  // la última pieza bloqueada se desvanece
  if (hidden && fadeLeft > 0)
    for (const f of fadeCells)
      if (board[f.y] && board[f.y][f.x] === f.type)
        drawBlock(ctx, f.x, f.y, f.type, BLOCK, fadeLeft / INVISIBLE_FADE_MS);

  // ghost (delataría la altura del montón en modo invisible)
  if (!hidden) {
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
  }

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);

  // desafío con basura: barra que se llena hasta la próxima fila
  if (challenge >= 0 && CHALLENGES[challenge].garbageMs) {
    const frac = 1 - Math.max(garbageLeft, 0) / CHALLENGES[challenge].garbageMs;
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(0, 0, canvas.width * frac, 4);
  }

  // congelado: capa de hielo con cuenta atrás
  if (freezeLeft > 0) {
    ctx.fillStyle = 'rgba(129,212,250,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#b3e5fc';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`❄ ${(freezeLeft / 1000).toFixed(1)}s`, canvas.width / 2, 26);
  }

  // ralentizado: tinte suave con cuenta atrás
  if (slowLeft > 0) {
    ctx.fillStyle = 'rgba(128,203,196,0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#80cbc4';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`🐢 ${(slowLeft / 1000).toFixed(1)}s`, canvas.width - 6, canvas.height - 8);
  }

  // flash de filas eliminadas
  if (flashLeft > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flashLeft / CLEAR_FLASH_MS})`;
    for (const y of flashRows) ctx.fillRect(0, y * BLOCK, canvas.width, BLOCK);
  }

  // partículas
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;

  // puntos flotantes
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd54f';
  for (const f of floats) {
    ctx.globalAlpha = Math.max(0, f.life / FLOAT_MS);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // aviso de T-spin
  if (tspinLeft > 0) {
    ctx.fillStyle = COLORS[T_TYPE];
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tspinText, canvas.width / 2, canvas.height / 3);
  }

  // aviso de Perfect Clear
  if (perfectLeft > 0) {
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PERFECT CLEAR!', canvas.width / 2, canvas.height / 2);
  }

  // rotación inversa: aviso al activarse e indicador fijo mientras dure
  if (reverseLeft > 0) {
    ctx.fillStyle = '#ba68c8';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROTACIÓN INVERSA', canvas.width / 2, canvas.height * 0.6);
  }
  if (isReversed()) {
    ctx.fillStyle = '#ba68c8';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('↺', 6, canvas.height - 8);
  }

  // combo activo
  if (combo > 1) {
    ctx.fillStyle = '#ffd54f';
    ctx.font = `bold ${Math.round(18 + 8 * (comboPulse / PULSE_MS))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`COMBO x${combo}`, canvas.width / 2, freezeLeft > 0 ? 52 : 26);
  }

  // B2B activo
  if (b2b > 1) {
    ctx.fillStyle = '#4dd0e1';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`B2B x${b2b}`, canvas.width / 2, 26 + (freezeLeft > 0 ? 26 : 0) + (combo > 1 ? 26 : 0));
  }
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);

  // habilidad "Ver 5 piezas": cola de las siguientes piezas tras `next`
  queueSection.hidden = previewLeft <= 0;
  queueCtx.clearRect(0, 0, queueCanvas.width, queueCanvas.height);
  if (previewLeft <= 0) return;
  queueLabel.textContent = `SIGUIENTES (${previewLeft})`;
  const QB = 15; // cada pieza ocupa un slot de 4×4 bloques (60 px)
  queue.forEach((p, i) => {
    const ox = Math.floor((4 - p.shape[0].length) / 2);
    const oy = Math.floor((4 - p.shape.length) / 2);
    for (let r = 0; r < p.shape.length; r++)
      for (let c = 0; c < p.shape[r].length; c++)
        drawBlock(queueCtx, ox + c + 1, oy + r + i * 4, p.shape[r][c], QB);
  });
}

function openSkills() {
  if (energy < ENERGY_MAX || paused || gameOver || choosing) return;
  choosing = true;
  cancelAnimationFrame(animId);
  skillMenu.classList.remove('hidden');
}

function closeSkills() {
  if (!choosing) return;
  choosing = false;
  skillMenu.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
}

function useSkill(i) {
  if (!choosing || !SKILLS[i]) return;
  if (SKILLS[i].activate() === false) { closeSkills(); return; }
  energy = 0;
  playPerfect();
  closeSkills();
  updateHUD();
  drawNext();
}

function buildSkillMenu() {
  SKILLS.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'skill-btn';
    btn.innerHTML = `<strong>${i + 1}. ${s.name}</strong><span>${s.desc}</span>`;
    btn.addEventListener('click', () => { useSkill(i); btn.blur(); });
    btn.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
    });
    skillList.appendChild(btn);
  });
}

function endGame(title) {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = title || 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
  draw(); // revela el tablero completo en desafíos invisibles
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (freezeLeft > 0) freezeLeft = Math.max(0, freezeLeft - dt);
  else dropAccum += slowLeft > 0 ? dt / SLOW_FACTOR : dt;
  if (slowLeft > 0) slowLeft = Math.max(0, slowLeft - dt);
  if (tspinLeft > 0) tspinLeft = Math.max(0, tspinLeft - dt);
  if (perfectLeft > 0) perfectLeft = Math.max(0, perfectLeft - dt);
  if (reverseLeft > 0) reverseLeft = Math.max(0, reverseLeft - dt);
  if (fadeLeft > 0) fadeLeft = Math.max(0, fadeLeft - dt);
  if (flashLeft > 0) flashLeft = Math.max(0, flashLeft - dt);
  if (comboPulse > 0) comboPulse = Math.max(0, comboPulse - dt);
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.0006 * dt;
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);
  for (const f of floats) {
    f.y -= 0.04 * dt;
    f.life -= dt;
  }
  floats = floats.filter(f => f.life > 0);
  // El reloj del desafío corre siempre (congelar no lo detiene); la pausa cancela el loop
  if (challenge >= 0) {
    timeLeft -= dt;
    updateTimer();
    const garbageMs = CHALLENGES[challenge].garbageMs;
    if (garbageMs && timeLeft > 0) {
      garbageLeft -= dt;
      if (garbageLeft <= 0) {
        garbageLeft += garbageMs;
        addGarbage();
      }
    }
    if (timeLeft <= 0 && !gameOver) {
      if (CHALLENGES[challenge].goal === 'survive') winChallenge();
      else endGame('TIEMPO AGOTADO');
    }
  }
  if (!gameOver && dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      lastRotate = false;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function setTheme(theme, save) {
  if (theme !== 'light') theme = 'dark';
  document.documentElement.dataset.theme = theme;
  const light = theme === 'light';
  themeBtn.setAttribute('aria-pressed', String(light));
  themeBtn.setAttribute('aria-label', light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  const style = getComputedStyle(document.documentElement);
  gridColor = style.getPropertyValue('--grid').trim();
  blockEdge = style.getPropertyValue('--block-edge').trim();
  if (save) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* almacenamiento no disponible */ }
  }
  // Redibujar aunque el loop esté cancelado (pausa / game over)
  if (current && next) { draw(); drawNext(); }
}

function loadTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignorar */ }
  setTheme(saved === 'light' ? 'light' : 'dark', false);
}

function init() {
  challenge = parseInt(modeSelect.value, 10);
  if (isNaN(challenge)) challenge = -1;
  timeLeft = challenge >= 0 ? CHALLENGES[challenge].timeMs : 0;
  tetrises = 0;
  garbageLeft = challenge >= 0 ? CHALLENGES[challenge].garbageMs || 0 : 0;
  shownSecs = -1;
  board = createBoard();
  fixedTotal = challenge >= 0 && CHALLENGES[challenge].layout ? placeLayout(CHALLENGES[challenge].layout) : 0;
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  rewardPending = false;
  bombPending = false;
  lightningPending = false;
  tintPending = false;
  gravityPending = false;
  freezePending = false;
  freezeLeft = 0;
  combo = 0;
  b2b = 0;
  lastRotate = false;
  tspinText = '';
  tspinLeft = 0;
  perfectLeft = 0;
  reverseLeft = 0;
  fadeCells = [];
  fadeLeft = 0;
  flashRows = [];
  flashLeft = 0;
  particles = [];
  floats = [];
  comboPulse = 0;
  energy = 0;
  previewLeft = 0;
  slowLeft = 0;
  undoState = null;
  choosing = false;
  skillMenu.classList.add('hidden');
  lastTime = performance.now();
  next = randomPiece();
  queue = Array.from({ length: QUEUE_SIZE }, () => randomPiece());
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (choosing) {
    if (e.code === 'Escape' || e.code === 'KeyE') closeSkills();
    else if (/^Digit[1-9]$/.test(e.code)) useSkill(parseInt(e.code.slice(5), 10) - 1);
    return;
  }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) { current.x--; lastRotate = false; }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) { current.x++; lastRotate = false; }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyE':
      openSkills();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

modeSelect.addEventListener('change', () => {
  init();
  modeSelect.blur(); // evita que las flechas cambien el modo en pleno juego
});

themeBtn.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true);
  themeBtn.blur(); // evita que Space/Enter vuelvan a activar el botón
});
// Space/Enter con el botón enfocado no deben activarlo
themeBtn.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
});
themeBtn.addEventListener('keyup', e => {
  if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
});

soundBtn.addEventListener('click', () => {
  setMuted(!muted, true);
  soundBtn.blur();
});
soundBtn.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
});
soundBtn.addEventListener('keyup', e => {
  if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
});

loadTheme();
loadSound();
buildModeOptions();
buildSkillMenu();
init();
