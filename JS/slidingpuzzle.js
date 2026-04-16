/* ================================================
   slidingpuzzle.js – 8-Puzzle with A* solver
   ================================================ */

'use strict';

let puzzleInitialized = false;
let puzzleState = [1,2,3,4,5,6,7,8,0]; // 0 = blank
const GOAL_STATE = [1,2,3,4,5,6,7,8,0];
let puzzleMoves = 0;
let puzzleSolving = false;
let puzzleSolutionSteps = [];
let puzzleSolveIndex = 0;
let puzzleSolveTimer = null;

// ── Init ──────────────────────────────────────────────
function initPuzzle() {
  puzzleInitialized = true;
  puzzleState = [...GOAL_STATE];
  puzzleMoves = 0;
  renderPuzzle();
  renderGoal();
  puzzleShuffle();
}

// ── Rendering ─────────────────────────────────────────
function renderPuzzle() {
  const grid = document.getElementById('puzzle-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < 9; i++) {
    const val = puzzleState[i];
    const tile = document.createElement('div');
    tile.className = 'puzzle-tile' + (val === 0 ? ' empty' : '');

    if (val !== 0) {
      tile.textContent = val;
      // Check if in correct position
      if (i === GOAL_STATE.indexOf(val)) tile.classList.add('in-place');
      tile.addEventListener('click', () => puzzleClickTile(i));
    }
    grid.appendChild(tile);
  }

  document.getElementById('p-stat-moves').textContent = puzzleMoves;

  if (puzzleIsSolved()) {
    document.getElementById('puzzle-msg').textContent = '🎉 Solved! Well done!';
    document.getElementById('puzzle-msg').style.color = '#059669';
  }
}

function renderGoal() {
  const grid = document.getElementById('puzzle-goal');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const val = GOAL_STATE[i];
    const tile = document.createElement('div');
    tile.className = 'puzzle-tile' + (val===0?' empty':'');
    if (val !== 0) { tile.textContent = val; tile.style.cursor='default'; }
    grid.appendChild(tile);
  }
}

// ── User interaction ──────────────────────────────────
function puzzleClickTile(index) {
  if (puzzleSolving) return;
  const blankIdx = puzzleState.indexOf(0);
  if (isAdjacent(index, blankIdx)) {
    [puzzleState[index], puzzleState[blankIdx]] = [puzzleState[blankIdx], puzzleState[index]];
    puzzleMoves++;
    renderPuzzle();
    document.getElementById('puzzle-msg').textContent = 'Click tiles to slide them!';
    document.getElementById('puzzle-msg').style.color = '';
  }
}

function isAdjacent(a, b) {
  const ar = Math.floor(a/3), ac = a%3;
  const br = Math.floor(b/3), bc = b%3;
  return Math.abs(ar-br) + Math.abs(ac-bc) === 1;
}

// ── Shuffle ───────────────────────────────────────────
function puzzleShuffle() {
  if (puzzleSolveTimer) { clearInterval(puzzleSolveTimer); puzzleSolveTimer=null; }
  puzzleSolving = false;
  puzzleMoves = 0;
  puzzleSolutionSteps = [];
  puzzleSolveIndex = 0;
  clearLog('puzzle-log');
  document.getElementById('p-stat-nodes').textContent = '–';
  document.getElementById('p-stat-solution').textContent = '–';
  document.getElementById('puzzle-msg').textContent = 'Click tiles to slide them, or shuffle and solve!';
  document.getElementById('puzzle-msg').style.color = '';

  // Perform random valid moves from goal
  puzzleState = [...GOAL_STATE];
  let blank = 8;
  for (let i = 0; i < 80; i++) {
    const moves = getValidMoves(puzzleState, blank);
    const pick = moves[Math.floor(Math.random()*moves.length)];
    [puzzleState[blank], puzzleState[pick]] = [puzzleState[pick], puzzleState[blank]];
    blank = pick;
  }
  renderPuzzle();
}

function puzzleReset() {
  if (puzzleSolveTimer) { clearInterval(puzzleSolveTimer); puzzleSolveTimer=null; }
  puzzleSolving = false;
  puzzleState = [...GOAL_STATE];
  puzzleMoves = 0;
  puzzleSolutionSteps = [];
  clearLog('puzzle-log');
  document.getElementById('p-stat-moves').textContent = 0;
  document.getElementById('p-stat-nodes').textContent = '–';
  document.getElementById('p-stat-solution').textContent = '–';
  document.getElementById('puzzle-msg').textContent = 'Board reset to solved state.';
  renderPuzzle();
}

// ── A* Solver ─────────────────────────────────────────
function puzzleSolve() {
  if (puzzleSolving) return;
  if (puzzleIsSolved()) { logMsg('puzzle-log','Already solved!','log-success'); return; }

  clearLog('puzzle-log');
  logMsg('puzzle-log','Running A* with Manhattan distance...','log-info');
  document.getElementById('puzzle-msg').textContent = '🤔 Solving...';

  // Run A* (synchronously – puzzle space is manageable)
  const start = puzzleState.slice();
  const result = aStarPuzzle(start);

  if (!result) {
    logMsg('puzzle-log','❌ No solution found (puzzle may be unsolvable)','log-warn');
    document.getElementById('puzzle-msg').textContent = 'No solution found!';
    return;
  }

  const { path, nodesExpanded } = result;
  puzzleSolutionSteps = path;
  puzzleSolveIndex = 0;

  document.getElementById('p-stat-nodes').textContent = nodesExpanded;
  document.getElementById('p-stat-solution').textContent = path.length - 1;
  logMsg('puzzle-log',`✅ Solution found! ${path.length-1} moves, ${nodesExpanded} nodes expanded`,'log-success');

  // Log direction of each move
  for (let i = 1; i < path.length; i++) {
    const prev = path[i-1], cur = path[i];
    const blankPrev = prev.indexOf(0), blankCur = cur.indexOf(0);
    const dr = Math.floor(blankCur/3) - Math.floor(blankPrev/3);
    const dc = blankCur%3 - blankPrev%3;
    const dirs = {'-1,0':'↑ Up','1,0':'↓ Down','0,-1':'← Left','0,1':'→ Right'};
    logMsg('puzzle-log', `Step ${i}: Move ${dirs[`${dr},${dc}`] || '?'} (tile ${cur[blankPrev]})`);
  }

  // Animate solution
  puzzleSolving = true;
  puzzleSolveTimer = setInterval(() => {
    puzzleSolveIndex++;
    if (puzzleSolveIndex < puzzleSolutionSteps.length) {
      puzzleState = [...puzzleSolutionSteps[puzzleSolveIndex]];
      puzzleMoves++;
      renderPuzzle();
    } else {
      clearInterval(puzzleSolveTimer); puzzleSolveTimer = null;
      puzzleSolving = false;
      document.getElementById('puzzle-msg').textContent = '✅ Puzzle solved by A*!';
      document.getElementById('puzzle-msg').style.color = '#059669';
    }
  }, 350);
}

// ── A* Algorithm ──────────────────────────────────────
function manhattanDistance(state) {
  let total = 0;
  for (let i = 0; i < 9; i++) {
    if (state[i] === 0) continue;
    const goalIdx = GOAL_STATE.indexOf(state[i]);
    total += Math.abs(Math.floor(i/3) - Math.floor(goalIdx/3)) + Math.abs(i%3 - goalIdx%3);
  }
  return total;
}

function aStarPuzzle(startState) {
  const goalKey = GOAL_STATE.join(',');
  const startKey = startState.join(',');
  if (startKey === goalKey) return { path: [startState], nodesExpanded: 0 };

  const pq = new PriorityQueue();
  pq.push({ state: startState, g: 0, path: [startState] }, manhattanDistance(startState));

  const gScore = { [startKey]: 0 };
  let nodesExpanded = 0;
  const MAX_NODES = 100000;

  while (!pq.isEmpty() && nodesExpanded < MAX_NODES) {
    const { state, g, path } = pq.pop();
    const key = state.join(',');
    nodesExpanded++;

    if (key === goalKey) return { path, nodesExpanded };

    const blankIdx = state.indexOf(0);
    for (const nextIdx of getValidMoves(state, blankIdx)) {
      const nextState = [...state];
      [nextState[blankIdx], nextState[nextIdx]] = [nextState[nextIdx], nextState[blankIdx]];
      const nextKey = nextState.join(',');
      const ng = g + 1;
      if (gScore[nextKey] === undefined || ng < gScore[nextKey]) {
        gScore[nextKey] = ng;
        const f = ng + manhattanDistance(nextState);
        pq.push({ state: nextState, g: ng, path: [...path, nextState] }, f);
      }
    }
  }
  return null;
}

function getValidMoves(state, blankIdx) {
  const moves = [];
  const r = Math.floor(blankIdx/3), c = blankIdx%3;
  if (r > 0) moves.push(blankIdx - 3); // up
  if (r < 2) moves.push(blankIdx + 3); // down
  if (c > 0) moves.push(blankIdx - 1); // left
  if (c < 2) moves.push(blankIdx + 1); // right
  return moves;
}

function puzzleIsSolved() {
  return puzzleState.join(',') === GOAL_STATE.join(',');
}
