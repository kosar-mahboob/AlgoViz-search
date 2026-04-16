/* ================================================
   maze.js – Grid / Maze Visualizer
   Algorithms: BFS, DFS, DLS, IDDFS, UCS, Greedy, A*
   ================================================ */

'use strict';

let mazeInitialized = false;
let mCanvas, mCtx;
let mCols = 25, mRows = 20;
let mCellSize = 28;
let mGrid = [];          // 0=empty, 1=wall
let mStart = { r:1, c:1 }, mGoal = { r:18, c:23 };
let mTool = 'wall';
let mPainting = false;
let mPaintValue = 1;

// Algorithm state
let mRunning = false;
let mPaused = false;
let mGenerator = null;
let mAnimTimer = null;

// Cell visual states (stored separately to avoid touching grid logic)
let mVisited = [];    // 'frontier'|'explored'|'path'|null
let mPathCells = [];

// Colors (white/blue theme)
const MC = {
  bg:       '#f0f7ff',
  empty:    '#ffffff',
  wall:     '#7dc3e8',
  wallLine: '#a8d8f0',
  startFill:'#bbf7d0', startLine:'#34d399',
  goalFill: '#fecdd3', goalLine: '#fb7185',
  frontier: '#bfdbfe',
  explored: '#dbeafe',
  path:     '#2563eb',
  pathLine: '#1d4ed8',
  gridLine: '#e0f2fe',
  current:  '#fde68a',
};

// ── Init ──────────────────────────────────────────────
function initMaze() {
  mazeInitialized = true;
  mCanvas = document.getElementById('mazeCanvas');
  mCtx = mCanvas.getContext('2d');

  mazeResizeGrid();
  mazeClear();

  // Mouse events
  mCanvas.addEventListener('mousedown', mMouseDown);
  mCanvas.addEventListener('mousemove', mMouseMove);
  mCanvas.addEventListener('mouseup', () => { mPainting = false; });
  mCanvas.addEventListener('mouseleave', () => { mPainting = false; });

  // Speed display
  const spd = document.getElementById('maze-speed');
  if (spd) spd.addEventListener('input', () => {
    document.getElementById('maze-speed-val').textContent = spd.value + 'ms/step';
  });

  // Algo selector – show DLS depth when needed
  const algoSel = document.getElementById('maze-algo');
  if (algoSel) algoSel.addEventListener('change', () => {
    const dlsRow = document.getElementById('dls-depth-row');
    dlsRow.classList.toggle('hidden', algoSel.value !== 'dls');
  });

  // Set default goal to bottom-right-ish
  mGoal = { r: mRows - 2, c: mCols - 2 };
  mStart = { r: 1, c: 1 };
  mDraw();
}

// ── Grid resize ───────────────────────────────────────
function mazeResizeGrid() {
  const colsEl = document.getElementById('maze-cols');
  const rowsEl = document.getElementById('maze-rows');
  mCols = parseInt(colsEl?.value || 25);
  mRows = parseInt(rowsEl?.value || 20);
  document.getElementById('maze-cols-val').textContent = mCols;
  document.getElementById('maze-rows-val').textContent = mRows;

  // Compute cell size to fit container
  const container = mCanvas?.parentElement;
  const maxW = container ? container.clientWidth - 4 : 700;
  const maxH = 500;
  mCellSize = Math.min(Math.floor(maxW / mCols), Math.floor(maxH / mRows));
  mCellSize = Math.max(mCellSize, 10);

  if (mCanvas) {
    mCanvas.width  = mCols * mCellSize;
    mCanvas.height = mRows * mCellSize;
  }

  // Reset grid
  mGrid = [];
  mVisited = [];
  for (let r = 0; r < mRows; r++) {
    mGrid.push(new Array(mCols).fill(0));
    mVisited.push(new Array(mCols).fill(null));
  }

  // Clamp start/goal
  mStart = { r: Math.min(mStart.r, mRows-2), c: Math.min(mStart.c, mCols-2) };
  mGoal  = { r: mRows-2, c: mCols-2 };

  if (mCanvas && mCtx) mDraw();
}

// ── Drawing ───────────────────────────────────────────
function mDraw() {
  if (!mCtx) return;
  const cs = mCellSize;
  mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);

  for (let r = 0; r < mRows; r++) {
    for (let c = 0; c < mCols; c++) {
      const x = c * cs, y = r * cs;
      const isStart = mStart.r===r && mStart.c===c;
      const isGoal  = mGoal.r===r  && mGoal.c===c;
      const isWall  = mGrid[r][c] === 1;
      const vis     = mVisited[r][c];

      let fill = MC.empty;
      if (isWall)      fill = MC.wall;
      else if (isStart)fill = MC.startFill;
      else if (isGoal) fill = MC.goalFill;
      else if (vis === 'path')     fill = MC.path;
      else if (vis === 'explored') fill = MC.explored;
      else if (vis === 'frontier') fill = MC.frontier;
      else if (vis === 'current')  fill = MC.current;

      mCtx.fillStyle = fill;
      mCtx.fillRect(x, y, cs, cs);

      // Border
      mCtx.strokeStyle = isWall ? MC.wallLine : MC.gridLine;
      mCtx.lineWidth = 0.5;
      mCtx.strokeRect(x, y, cs, cs);

      // Special markers
      if (isStart) {
        mCtx.fillStyle = MC.startLine;
        mCtx.font = `bold ${Math.max(cs*0.5,10)}px sans-serif`;
        mCtx.textAlign = 'center'; mCtx.textBaseline = 'middle';
        mCtx.fillText('S', x + cs/2, y + cs/2);
      } else if (isGoal) {
        mCtx.fillStyle = MC.goalLine;
        mCtx.font = `bold ${Math.max(cs*0.5,10)}px sans-serif`;
        mCtx.textAlign = 'center'; mCtx.textBaseline = 'middle';
        mCtx.fillText('G', x + cs/2, y + cs/2);
      }
    }
  }
}

// ── Mouse handling ────────────────────────────────────
function mGetCell(e) {
  const rect = mCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  return { r: Math.floor(y / mCellSize), c: Math.floor(x / mCellSize) };
}

function mApplyTool(r, c) {
  if (r < 0 || r >= mRows || c < 0 || c >= mCols) return;
  const isStart = mStart.r===r && mStart.c===c;
  const isGoal  = mGoal.r===r  && mGoal.c===c;

  if (mTool === 'wall') {
    if (!isStart && !isGoal) mGrid[r][c] = mPaintValue;
  } else if (mTool === 'erase') {
    mGrid[r][c] = 0;
  } else if (mTool === 'start') {
    if (!isGoal) mStart = {r, c};
    mazeSetTool('wall');
  } else if (mTool === 'goal') {
    if (!isStart) mGoal = {r, c};
    mazeSetTool('wall');
  }
  mDraw();
}

function mMouseDown(e) {
  mPainting = true;
  const {r,c} = mGetCell(e);
  if (mTool === 'wall') {
    mPaintValue = mGrid[r]?.[c] === 1 ? 0 : 1;
  }
  mApplyTool(r, c);
}

function mMouseMove(e) {
  if (!mPainting) return;
  const {r,c} = mGetCell(e);
  mApplyTool(r, c);
}

// ── Tool selector ─────────────────────────────────────
function mazeSetTool(t) {
  mTool = t;
  ['wall','start','goal','erase'].forEach(id => {
    const btn = document.getElementById('m-tool-' + id);
    if (btn) btn.classList.toggle('btn-primary', id === t);
    if (btn) btn.classList.toggle('btn-secondary', id !== t);
  });
}

// ── Clear / Reset ─────────────────────────────────────
function mazeClear() {
  if (mAnimTimer) { clearInterval(mAnimTimer); mAnimTimer = null; }
  mRunning = false; mPaused = false; mGenerator = null;
  mGrid = Array.from({length:mRows}, () => new Array(mCols).fill(0));
  mVisited = Array.from({length:mRows}, () => new Array(mCols).fill(null));
  mDraw();
  clearLog('mazeLog');
  mUpdateStats(0, 0, '–');
}

function mazeReset() {
  if (mAnimTimer) { clearInterval(mAnimTimer); mAnimTimer = null; }
  mRunning = false; mPaused = false; mGenerator = null;
  mVisited = Array.from({length:mRows}, () => new Array(mCols).fill(null));
  mDraw();
  clearLog('mazeLog');
  mUpdateStats(0, 0, '–');
}

function mUpdateStats(explored, frontier, pathLen) {
  document.getElementById('m-stat-explored').textContent = explored;
  document.getElementById('m-stat-frontier').textContent = frontier;
  document.getElementById('m-stat-path').textContent = pathLen;
}

// ── Run / Step / Pause ────────────────────────────────
function mazeRun() {
  if (mRunning && !mPaused) return;
  if (mPaused) { mPaused = false; mResume(); return; }
  mazeReset();
  const algo = document.getElementById('maze-algo').value;
  mGenerator = mAlgoGenerator(algo);
  mRunning = true;
  mResume();
}

function mResume() {
  const speed = parseInt(document.getElementById('maze-speed').value) || 60;
  mAnimTimer = setInterval(() => {
    if (!mGenerator) { clearInterval(mAnimTimer); mAnimTimer = null; mRunning = false; return; }
    const result = mGenerator.next();
    if (result.done) {
      clearInterval(mAnimTimer); mAnimTimer = null; mRunning = false;
    }
    mDraw();
  }, speed);
}

function mazePause() {
  if (!mRunning) return;
  if (mAnimTimer) { clearInterval(mAnimTimer); mAnimTimer = null; }
  mPaused = true;
}

function mazeStepOnce() {
  if (!mGenerator) {
    mazeReset();
    const algo = document.getElementById('maze-algo').value;
    mGenerator = mAlgoGenerator(algo);
  }
  if (mAnimTimer) { clearInterval(mAnimTimer); mAnimTimer = null; mPaused = true; }
  const result = mGenerator.next();
  if (result.done) { mGenerator = null; mRunning = false; }
  mDraw();
}

// ── Maze Generation (DFS recursive backtracker) ───────
function mazeGenerate(method) {
  mazeClear();
  // Fill all with walls
  for (let r = 0; r < mRows; r++)
    for (let c = 0; c < mCols; c++)
      mGrid[r][c] = 1;

  // DFS backtracker – carve passages
  const visited = Array.from({length:mRows}, () => new Array(mCols).fill(false));
  function carve(r, c) {
    visited[r][c] = true;
    mGrid[r][c] = 0;
    const dirs = [[0,2],[0,-2],[2,0],[-2,0]].sort(() => Math.random() - 0.5);
    for (const [dr,dc] of dirs) {
      const nr = r+dr, nc = c+dc;
      if (nr>0 && nr<mRows-1 && nc>0 && nc<mCols-1 && !visited[nr][nc]) {
        mGrid[r+dr/2][c+dc/2] = 0;
        carve(nr, nc);
      }
    }
  }
  // Start at odd cell
  const sr = 1, sc = 1;
  carve(sr, sc);

  mStart = { r:1, c:1 };
  mGoal  = { r: mRows%2===0 ? mRows-2 : mRows-3, c: mCols%2===0 ? mCols-2 : mCols-3 };
  mGrid[mStart.r][mStart.c] = 0;
  mGrid[mGoal.r][mGoal.c] = 0;
  mDraw();
  logMsg('mazeLog','Maze generated!','log-info');
}

function mazeRandomWalls() {
  mazeReset();
  for (let r = 0; r < mRows; r++)
    for (let c = 0; c < mCols; c++) {
      const isStart = mStart.r===r && mStart.c===c;
      const isGoal  = mGoal.r===r  && mGoal.c===c;
      if (!isStart && !isGoal) mGrid[r][c] = Math.random() < 0.3 ? 1 : 0;
    }
  mDraw();
}

// ── Helpers ───────────────────────────────────────────
function mNeighbors(r, c) {
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  return dirs.map(([dr,dc]) => ({r:r+dr, c:c+dc}))
    .filter(({r:nr,c:nc}) => nr>=0 && nr<mRows && nc>=0 && nc<mCols && mGrid[nr][nc]===0);
}

function mManhattan(r, c) {
  return Math.abs(r - mGoal.r) + Math.abs(c - mGoal.c);
}

function mReconstructPath(cameFrom, r, c) {
  const path = [];
  let cur = `${r},${c}`;
  while (cur) {
    const [cr,cc] = cur.split(',').map(Number);
    path.unshift({r:cr, c:cc});
    cur = cameFrom[cur];
  }
  return path;
}

function mMarkPath(path) {
  for (const {r,c} of path) mVisited[r][c] = 'path';
}

// ── Algorithms (generators) ───────────────────────────
function* mAlgoGenerator(algo) {
  const sr = mStart.r, sc = mStart.c;
  const gr = mGoal.r,  gc = mGoal.c;
  let explored = 0, steps = 0;

  if (algo === 'bfs') {
    const queue = [{r:sr,c:sc}];
    const visited = { [`${sr},${sc}`]: null };
    mVisited[sr][sc] = 'frontier';

    while (queue.length > 0) {
      const {r,c} = queue.shift();
      mVisited[r][c] = 'explored'; explored++;
      steps++;
      logMsg('mazeLog',`[BFS] (${r},${c}) | Q:${queue.length}`,'log-info');
      mUpdateStats(explored, queue.length, '–');
      yield;

      if (r===gr && c===gc) {
        const path = mReconstructPath(visited, r, c);
        mMarkPath(path);
        mUpdateStats(explored, 0, path.length);
        logMsg('mazeLog',`✅ Found! Path: ${path.length} cells`,'log-success');
        return;
      }

      for (const nb of mNeighbors(r,c)) {
        const key = `${nb.r},${nb.c}`;
        if (!(key in visited)) {
          visited[key] = `${r},${c}`;
          queue.push(nb);
          mVisited[nb.r][nb.c] = 'frontier';
        }
      }
      mUpdateStats(explored, queue.length, '–');
      yield;
    }
    logMsg('mazeLog','❌ No path found','log-warn');
  }

  else if (algo === 'dfs') {
    const stack = [{r:sr,c:sc,path:[`${sr},${sc}`]}];
    const visited = new Set([`${sr},${sc}`]);
    mVisited[sr][sc] = 'frontier';

    while (stack.length > 0) {
      const {r,c,path} = stack.pop();
      mVisited[r][c] = 'explored'; explored++;
      steps++;
      logMsg('mazeLog',`[DFS] (${r},${c})`,'log-info');
      mUpdateStats(explored, stack.length, '–');
      yield;

      if (r===gr && c===gc) {
        for (const key of path) {
          const [pr,pc] = key.split(',').map(Number);
          mVisited[pr][pc] = 'path';
        }
        mUpdateStats(explored, 0, path.length);
        logMsg('mazeLog',`✅ Found! Path: ${path.length} cells`,'log-success');
        return;
      }

      for (const nb of mNeighbors(r,c)) {
        const key = `${nb.r},${nb.c}`;
        if (!visited.has(key)) {
          visited.add(key);
          mVisited[nb.r][nb.c] = 'frontier';
          stack.push({r:nb.r,c:nb.c,path:[...path,key]});
        }
      }
      mUpdateStats(explored, stack.length, '–');
      yield;
    }
    logMsg('mazeLog','❌ No path found','log-warn');
  }

  else if (algo === 'dls') {
    const limit = parseInt(document.getElementById('dls-depth').value) || 20;
    let found = false;
    const visited = new Set();

    function* dls(r, c, depth, path) {
      const key = `${r},${c}`;
      if (depth < 0) return;
      visited.add(key);
      mVisited[r][c] = 'explored'; explored++;
      logMsg('mazeLog',`[DLS] (${r},${c}) depth=${limit-depth}`,'log-info');
      mUpdateStats(explored, 0, '–');
      yield;

      if (r===gr && c===gc) {
        found = true;
        for (const k of path) {
          const [pr,pc] = k.split(',').map(Number);
          mVisited[pr][pc] = 'path';
        }
        mUpdateStats(explored, 0, path.length);
        logMsg('mazeLog',`✅ Found! Path: ${path.length} cells`,'log-success');
        return;
      }

      for (const nb of mNeighbors(r,c)) {
        const nkey = `${nb.r},${nb.c}`;
        if (!visited.has(nkey) && !found) {
          yield* dls(nb.r, nb.c, depth-1, [...path,nkey]);
        }
      }
      if (!found) visited.delete(key);
    }

    yield* dls(sr, sc, limit, [`${sr},${sc}`]);
    if (!found) logMsg('mazeLog',`❌ No path within depth ${limit}`,'log-warn');
  }

  else if (algo === 'iddfs') {
    let found = false;
    for (let depthLimit = 0; depthLimit <= mRows*mCols && !found; depthLimit++) {
      logMsg('mazeLog',`[IDDFS] Trying depth limit: ${depthLimit}`,'log-info');
      const visited = new Set();

      function* iddfs(r, c, depth, path) {
        const key = `${r},${c}`;
        if (depth < 0) return;
        visited.add(key);
        mVisited[r][c] = 'explored'; explored++;
        mUpdateStats(explored, 0, '–');
        yield;

        if (r===gr && c===gc) {
          found = true;
          for (const k of path) {
            const [pr,pc] = k.split(',').map(Number);
            mVisited[pr][pc] = 'path';
          }
          mUpdateStats(explored, 0, path.length);
          logMsg('mazeLog',`✅ Found at depth ${depthLimit}! Path: ${path.length}`,'log-success');
          return;
        }

        for (const nb of mNeighbors(r,c)) {
          const nkey = `${nb.r},${nb.c}`;
          if (!visited.has(nkey) && !found) {
            yield* iddfs(nb.r, nb.c, depth-1, [...path,nkey]);
          }
        }
        if (!found) visited.delete(key);
      }

      yield* iddfs(sr, sc, depthLimit, [`${sr},${sc}`]);
      if (!found) {
        // Reset visited visualization for next iteration
        for (let r=0;r<mRows;r++) for (let c=0;c<mCols;c++) if (mVisited[r][c]==='explored') mVisited[r][c]=null;
        yield;
      }
    }
    if (!found) logMsg('mazeLog','❌ No path found','log-warn');
  }

  else if (algo === 'ucs') {
    const pq = new PriorityQueue();
    pq.push({r:sr,c:sc,cost:0}, 0);
    const dist = {[`${sr},${sc}`]:0};
    const cameFrom = {[`${sr},${sc}`]:null};
    const expSet = new Set();
    mVisited[sr][sc] = 'frontier';

    while (!pq.isEmpty()) {
      const {r,c,cost} = pq.pop();
      const key = `${r},${c}`;
      if (expSet.has(key)) { yield; continue; }
      expSet.add(key);
      mVisited[r][c] = 'explored'; explored++;
      logMsg('mazeLog',`[UCS] (${r},${c}) cost=${cost}`,'log-info');
      mUpdateStats(explored, pq.size, '–');
      yield;

      if (r===gr && c===gc) {
        const path = mReconstructPath(cameFrom, r, c);
        mMarkPath(path);
        mUpdateStats(explored, 0, path.length);
        logMsg('mazeLog',`✅ Found! Cost: ${cost}, Path: ${path.length}`,'log-success');
        return;
      }

      for (const nb of mNeighbors(r,c)) {
        const nkey = `${nb.r},${nb.c}`;
        const nc = cost + 1;
        if (dist[nkey]===undefined || nc<dist[nkey]) {
          dist[nkey] = nc;
          cameFrom[nkey] = key;
          pq.push({r:nb.r,c:nb.c,cost:nc}, nc);
          if (!expSet.has(nkey)) mVisited[nb.r][nb.c] = 'frontier';
        }
      }
      mUpdateStats(explored, pq.size, '–');
      yield;
    }
    logMsg('mazeLog','❌ No path found','log-warn');
  }

  else if (algo === 'greedy') {
    const pq = new PriorityQueue();
    pq.push({r:sr,c:sc}, mManhattan(sr,sc));
    const visited = new Set([`${sr},${sc}`]);
    const cameFrom = {[`${sr},${sc}`]:null};
    mVisited[sr][sc] = 'frontier';

    while (!pq.isEmpty()) {
      const {r,c} = pq.pop();
      mVisited[r][c] = 'explored'; explored++;
      logMsg('mazeLog',`[Greedy] (${r},${c}) h=${mManhattan(r,c)}`,'log-info');
      mUpdateStats(explored, pq.size, '–');
      yield;

      if (r===gr && c===gc) {
        const path = mReconstructPath(cameFrom, r, c);
        mMarkPath(path);
        mUpdateStats(explored, 0, path.length);
        logMsg('mazeLog',`✅ Found! Path: ${path.length}`,'log-success');
        return;
      }

      for (const nb of mNeighbors(r,c)) {
        const key = `${nb.r},${nb.c}`;
        if (!visited.has(key)) {
          visited.add(key);
          cameFrom[key] = `${r},${c}`;
          mVisited[nb.r][nb.c] = 'frontier';
          pq.push({r:nb.r,c:nb.c}, mManhattan(nb.r,nb.c));
        }
      }
      mUpdateStats(explored, pq.size, '–');
      yield;
    }
    logMsg('mazeLog','❌ No path found','log-warn');
  }

  else if (algo === 'astar') {
    const pq = new PriorityQueue();
    const gCost = {[`${sr},${sc}`]:0};
    const cameFrom = {[`${sr},${sc}`]:null};
    pq.push({r:sr,c:sc}, mManhattan(sr,sc));
    mVisited[sr][sc] = 'frontier';
    const closed = new Set();

    while (!pq.isEmpty()) {
      const {r,c} = pq.pop();
      const key = `${r},${c}`;
      if (closed.has(key)) { yield; continue; }
      closed.add(key);
      mVisited[r][c] = 'explored'; explored++;
      const gscore = gCost[key] ?? 0;
      const h = mManhattan(r,c);
      logMsg('mazeLog',`[A*] (${r},${c}) g=${gscore} h=${h} f=${gscore+h}`,'log-info');
      mUpdateStats(explored, pq.size, '–');
      yield;

      if (r===gr && c===gc) {
        const path = mReconstructPath(cameFrom, r, c);
        mMarkPath(path);
        mUpdateStats(explored, 0, path.length);
        logMsg('mazeLog',`✅ Found! Cost: ${gscore}, Path: ${path.length}`,'log-success');
        return;
      }

      for (const nb of mNeighbors(r,c)) {
        const nkey = `${nb.r},${nb.c}`;
        if (closed.has(nkey)) continue;
        const ng = gscore + 1;
        if (gCost[nkey]===undefined || ng<gCost[nkey]) {
          gCost[nkey] = ng;
          cameFrom[nkey] = key;
          const f = ng + mManhattan(nb.r,nb.c);
          pq.push({r:nb.r,c:nb.c}, f);
          if (!closed.has(nkey)) mVisited[nb.r][nb.c] = 'frontier';
        }
      }
      mUpdateStats(explored, pq.size, '–');
      yield;
    }
    logMsg('mazeLog','❌ No path found','log-warn');
  }
}
