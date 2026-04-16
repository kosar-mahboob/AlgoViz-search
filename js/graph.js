/* ================================================
   graph.js – Interactive Graph Visualizer
   Algorithms: BFS, DFS, UCS, Greedy, A*
   ================================================ */

'use strict';

// ── State ─────────────────────────────────────────────
let graphInitialized = false;
let gCanvas, gCtx;
let gNodes = [];   // { id, x, y, label }
let gEdges = [];   // { from, to, weight }
let gMode = 'node'; // node | edge | move | delete | start | goal
let gStartId = null, gGoalId = null;
let gEdgeStart = null;   // id of first node in edge creation
let gDragging = null;    // { nodeId, ox, oy }
let gNodeCounter = 0;
let gDirected = false;

// Algorithm animation state
let gRunning = false;
let gGenerator = null;
let gAnimTimer = null;
let gAlgoState = null;

// Colors
const GC = {
  node:      '#ffffff',
  nodeBorder:'#bfdbfe',
  nodeText:  '#1e3a8a',
  frontier:  '#bfdbfe',
  explored:  '#eff6ff',
  current:   '#fde68a',
  path:      '#3b82f6',
  start:     '#bbf7d0',
  startBorder:'#34d399',
  goal:      '#fecdd3',
  goalBorder:'#fb7185',
  edgeNormal:'#93c5fd',
  edgePath:  '#1d4ed8',
  edgeWeight:'#475569',
  bg:        '#f0f7ff',
  grid:      '#e0f2fe',
};

// ── Init ──────────────────────────────────────────────
function initGraph() {
  graphInitialized = true;
  gCanvas = document.getElementById('graphCanvas');
  gCtx = gCanvas.getContext('2d');

  // Resize canvas to fit container
  resizeGraphCanvas();

  // Event listeners
  gCanvas.addEventListener('click', gHandleClick);
  gCanvas.addEventListener('mousedown', gHandleMouseDown);
  gCanvas.addEventListener('mousemove', gHandleMouseMove);
  gCanvas.addEventListener('mouseup', gHandleMouseUp);
  gCanvas.addEventListener('contextmenu', gHandleRightClick);

  // Speed slider
  const spd = document.getElementById('graph-speed');
  if (spd) {
    spd.addEventListener('input', () => {
      document.getElementById('graph-speed-val').textContent = spd.value + 'ms/step';
    });
  }

  // Directed checkbox
  const dir = document.getElementById('g-directed');
  if (dir) dir.addEventListener('change', e => { gDirected = e.target.checked; gDraw(); });

  // Load default preset
  graphLoadPreset('city');
  gDraw();
}

function resizeGraphCanvas() {
  const parent = gCanvas.parentElement;
  gCanvas.width = Math.max(parent.clientWidth - 4, 600);
  gCanvas.height = 480;
}

// ── Drawing ───────────────────────────────────────────
function gDraw() {
  const w = gCanvas.width, h = gCanvas.height;
  gCtx.clearRect(0, 0, w, h);

  // Background
  gCtx.fillStyle = GC.bg;
  gCtx.fillRect(0, 0, w, h);

  // Draw dot grid
  gCtx.fillStyle = GC.grid;
  for (let x = 20; x < w; x += 30) {
    for (let y = 20; y < h; y += 30) {
      gCtx.beginPath();
      gCtx.arc(x, y, 1.5, 0, Math.PI * 2);
      gCtx.fill();
    }
  }

  // Draw edges
  gEdges.forEach(e => gDrawEdge(e));

  // Draw nodes
  gNodes.forEach(n => gDrawNode(n));

  // Draw edge-in-progress
  if (gMode === 'edge' && gEdgeStart !== null && gMousePos) {
    const sNode = gNodes.find(n => n.id === gEdgeStart);
    if (sNode) {
      gCtx.save();
      gCtx.setLineDash([5, 5]);
      gCtx.strokeStyle = '#60a5fa';
      gCtx.lineWidth = 2;
      gCtx.beginPath();
      gCtx.moveTo(sNode.x, sNode.y);
      gCtx.lineTo(gMousePos.x, gMousePos.y);
      gCtx.stroke();
      gCtx.restore();
    }
  }
}

let gMousePos = null;

function gDrawEdge(e) {
  const from = gNodes.find(n => n.id === e.from);
  const to   = gNodes.find(n => n.id === e.to);
  if (!from || !to) return;

  const isPath    = e._path;
  const isFrontier = e._frontier;
  const color = isPath ? GC.edgePath : isFrontier ? '#60a5fa' : GC.edgeNormal;
  const lw = isPath ? 3 : 1.5;

  gCtx.save();
  gCtx.strokeStyle = color;
  gCtx.lineWidth = lw;
  gCtx.beginPath();
  gCtx.moveTo(from.x, from.y);
  gCtx.lineTo(to.x, to.y);
  gCtx.stroke();

  // Arrow for directed
  if (gDirected) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const ux = dx/len, uy = dy/len;
    const R = 18; // node radius
    const ax = to.x - ux*R, ay = to.y - uy*R;
    const angle = Math.atan2(dy, dx);
    gCtx.fillStyle = color;
    gCtx.beginPath();
    gCtx.moveTo(ax, ay);
    gCtx.lineTo(ax - 10*Math.cos(angle-0.4), ay - 10*Math.sin(angle-0.4));
    gCtx.lineTo(ax - 10*Math.cos(angle+0.4), ay - 10*Math.sin(angle+0.4));
    gCtx.closePath();
    gCtx.fill();
  }

  // Weight label
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
  gCtx.fillStyle = GC.edgeWeight;
  gCtx.font = '500 11px DM Mono, monospace';
  gCtx.textAlign = 'center';
  gCtx.textBaseline = 'middle';
  const pad = 3;
  const tw = gCtx.measureText(e.weight).width + pad*2;
  gCtx.fillStyle = 'rgba(255,255,255,0.85)';
  gCtx.fillRect(mx - tw/2, my - 8, tw, 16);
  gCtx.fillStyle = isPath ? '#1d4ed8' : GC.edgeWeight;
  gCtx.fillText(e.weight, mx, my);
  gCtx.restore();
}

function gDrawNode(n) {
  const R = 18;
  let fill = GC.node, border = GC.nodeBorder, textColor = GC.nodeText;

  if (n.id === gStartId)  { fill = GC.start;    border = GC.startBorder; }
  if (n.id === gGoalId)   { fill = GC.goal;     border = GC.goalBorder; }
  if (n._explored)  { fill = '#dbeafe'; border = '#60a5fa'; }
  if (n._frontier)  { fill = GC.frontier; border = '#3b82f6'; }
  if (n._current)   { fill = GC.current;  border = '#f59e0b'; }
  if (n._path)      { fill = '#3b82f6';   border = '#1d4ed8'; textColor = '#fff'; }
  // Override: start/goal always keep their colors on top of explored
  if (n._path && n.id === gStartId)  { fill = '#22c55e'; border = '#15803d'; textColor='#fff'; }
  if (n._path && n.id === gGoalId)   { fill = '#ef4444'; border = '#b91c1c'; textColor='#fff'; }

  gCtx.save();
  gCtx.shadowColor = 'rgba(59,130,246,0.15)';
  gCtx.shadowBlur = 6;
  gCtx.beginPath();
  gCtx.arc(n.x, n.y, R, 0, Math.PI * 2);
  gCtx.fillStyle = fill;
  gCtx.fill();
  gCtx.strokeStyle = border;
  gCtx.lineWidth = 2;
  gCtx.stroke();
  gCtx.restore();

  gCtx.font = 'bold 13px DM Sans, sans-serif';
  gCtx.fillStyle = textColor;
  gCtx.textAlign = 'center';
  gCtx.textBaseline = 'middle';
  gCtx.fillText(n.label, n.x, n.y);

  // h / g values if available
  if (n._g !== undefined) {
    gCtx.font = '10px DM Mono, monospace';
    gCtx.fillStyle = '#2563eb';
    gCtx.textAlign = 'center';
    gCtx.fillText('g:' + n._g.toFixed(0), n.x, n.y - R - 6);
  }
}

// ── Mode setting ──────────────────────────────────────
function graphSetMode(m) {
  gMode = m;
  gEdgeStart = null;
  const badge = document.getElementById('graph-mode-badge');
  const modeNames = {
    node:'Add Node', edge:'Add Edge', move:'Move Node',
    delete:'Delete', start:'Set Start', goal:'Set Goal'
  };
  const modeClasses = {
    node:'add-node', edge:'add-edge', move:'move-mode',
    delete:'delete-mode', start:'add-node', goal:'delete-mode'
  };
  badge.textContent = 'Mode: ' + (modeNames[m] || m);
  badge.className = 'mode-badge ' + (modeClasses[m] || 'add-node');

  // Update cursor
  const cursors = { node:'crosshair', edge:'cell', move:'grab', delete:'not-allowed', start:'pointer', goal:'pointer' };
  gCanvas.style.cursor = cursors[m] || 'default';
  gDraw();
}

// ── Mouse events ──────────────────────────────────────
function gHandleMouseDown(e) {
  if (gMode !== 'move') return;
  const pos = gGetCanvasPos(e);
  const node = gNodeAt(pos.x, pos.y);
  if (node) {
    gDragging = { nodeId: node.id, ox: pos.x - node.x, oy: pos.y - node.y };
    gCanvas.style.cursor = 'grabbing';
  }
}

function gHandleMouseMove(e) {
  const pos = gGetCanvasPos(e);
  gMousePos = pos;

  if (gDragging) {
    const node = gNodes.find(n => n.id === gDragging.nodeId);
    if (node) {
      node.x = pos.x - gDragging.ox;
      node.y = pos.y - gDragging.oy;
      gDraw();
    }
  } else if (gMode === 'edge' && gEdgeStart !== null) {
    gDraw();
  }
}

function gHandleMouseUp(e) {
  if (gDragging) {
    gDragging = null;
    gCanvas.style.cursor = 'grab';
  }
}

function gHandleClick(e) {
  if (gDragging) return;
  const pos = gGetCanvasPos(e);
  const node = gNodeAt(pos.x, pos.y);
  const edge = node ? null : gEdgeAt(pos.x, pos.y);

  if (gMode === 'node') {
    if (!node) gAddNode(pos.x, pos.y);
  }
  else if (gMode === 'edge') {
    if (node) {
      if (gEdgeStart === null) {
        gEdgeStart = node.id;
        node._selecting = true;
        gDraw();
      } else {
        if (gEdgeStart !== node.id) {
          openEdgeModal(gEdgeStart, node.id);
        }
        gEdgeStart = null;
        gNodes.forEach(n => delete n._selecting);
        gDraw();
      }
    }
  }
  else if (gMode === 'delete') {
    if (node) gDeleteNode(node.id);
    else if (edge) gDeleteEdge(edge);
  }
  else if (gMode === 'start') {
    if (node) { gStartId = node.id; graphSetMode('node'); gDraw(); logMsg('graphLog','Start set to: ' + node.label,'log-info'); }
  }
  else if (gMode === 'goal') {
    if (node) { gGoalId = node.id; graphSetMode('node'); gDraw(); logMsg('graphLog','Goal set to: ' + node.label,'log-info'); }
  }
  else if (gMode === 'move') {
    // handled by drag
  }
}

function gHandleRightClick(e) {
  e.preventDefault();
  const pos = gGetCanvasPos(e);
  const node = gNodeAt(pos.x, pos.y);
  if (node) { gDeleteNode(node.id); return; }
  const edge = gEdgeAt(pos.x, pos.y);
  if (edge) gDeleteEdge(edge);
}

function gGetCanvasPos(e) {
  const rect = gCanvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function gNodeAt(x, y) {
  return gNodes.find(n => Math.hypot(n.x - x, n.y - y) <= 18) || null;
}

function gEdgeAt(x, y) {
  for (const e of gEdges) {
    const from = gNodes.find(n => n.id === e.from);
    const to   = gNodes.find(n => n.id === e.to);
    if (!from || !to) continue;
    if (pointToSegmentDist(x, y, from.x, from.y, to.x, to.y) < 8) return e;
  }
  return null;
}

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx-ax, dy = by-ay;
  const len2 = dx*dx + dy*dy;
  if (len2 === 0) return Math.hypot(px-ax, py-ay);
  let t = ((px-ax)*dx + (py-ay)*dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax+t*dx), py - (ay+t*dy));
}

// ── Node / Edge CRUD ──────────────────────────────────
function gAddNode(x, y) {
  const id = ++gNodeCounter;
  const label = gNextLabel();
  gNodes.push({ id, x, y, label });
  gDraw();
  logMsg('graphLog', `Node ${label} added`, 'log-info');
  return id;
}

function gNextLabel() {
  const used = new Set(gNodes.map(n => n.label));
  for (let i = 0; i < 26; i++) {
    const l = String.fromCharCode(65 + i);
    if (!used.has(l)) return l;
  }
  // Multi-char labels
  for (let i = 0; i < 26; i++)
    for (let j = 0; j < 26; j++) {
      const l = String.fromCharCode(65+i) + String.fromCharCode(65+j);
      if (!used.has(l)) return l;
    }
  return 'X' + gNodeCounter;
}

function gDeleteNode(id) {
  const node = gNodes.find(n => n.id === id);
  if (!node) return;
  gNodes = gNodes.filter(n => n.id !== id);
  gEdges = gEdges.filter(e => e.from !== id && e.to !== id);
  if (gStartId === id) gStartId = null;
  if (gGoalId  === id) gGoalId  = null;
  gDraw();
  logMsg('graphLog', `Node ${node.label} deleted`);
}

let gEdgeModalCallback = null;

function openEdgeModal(fromId, toId) {
  const modal = document.getElementById('edgeModal');
  document.getElementById('edgeWeight').value = 1;
  modal.classList.add('open');
  gEdgeModalCallback = (ok) => {
    if (ok) {
      const w = parseInt(document.getElementById('edgeWeight').value) || 1;
      gAddEdge(fromId, toId, w);
    }
    modal.classList.remove('open');
  };
  // Focus weight input
  setTimeout(() => document.getElementById('edgeWeight').focus(), 50);
  document.getElementById('edgeWeight').onkeydown = (e) => {
    if (e.key === 'Enter') closeEdgeModal(true);
    if (e.key === 'Escape') closeEdgeModal(false);
  };
}

function closeEdgeModal(ok) {
  if (gEdgeModalCallback) gEdgeModalCallback(ok);
  gEdgeModalCallback = null;
}

function gAddEdge(fromId, toId, weight = 1) {
  // Avoid duplicate edges
  const exists = gEdges.some(e => e.from === fromId && e.to === toId);
  if (exists) { logMsg('graphLog','Edge already exists','log-warn'); return; }
  gEdges.push({ from: fromId, to: toId, weight });
  if (!gDirected) {
    const existsRev = gEdges.some(e => e.from === toId && e.to === fromId);
    if (!existsRev) gEdges.push({ from: toId, to: fromId, weight });
  }
  const fn = gNodes.find(n=>n.id===fromId), tn = gNodes.find(n=>n.id===toId);
  logMsg('graphLog', `Edge ${fn?.label}→${tn?.label} (w:${weight}) added`, 'log-info');
  gDraw();
}

function gDeleteEdge(edge) {
  gEdges = gEdges.filter(e => e !== edge);
  if (!gDirected) {
    gEdges = gEdges.filter(e => !(e.from === edge.to && e.to === edge.from));
  }
  gDraw();
}

// ── Controls ──────────────────────────────────────────
function graphReset() {
  if (gAnimTimer) { clearInterval(gAnimTimer); gAnimTimer = null; }
  gRunning = false;
  gGenerator = null;
  // Clear visual state
  gNodes.forEach(n => { delete n._explored; delete n._frontier; delete n._current; delete n._path; delete n._g; });
  gEdges.forEach(e => { delete e._path; delete e._frontier; });
  gUpdateStats(0, 0, '–', 0);
  clearLog('graphLog');
  gDraw();
}

function graphClear() {
  graphReset();
  gNodes = []; gEdges = [];
  gStartId = null; gGoalId = null;
  gNodeCounter = 0;
  gDraw();
}

function graphRun() {
  if (gRunning) return;
  if (!gStartId || !gGoalId) {
    logMsg('graphLog','Set a start and goal node first!','log-warn');
    return;
  }
  graphReset();
  const algo = document.getElementById('graph-algo').value;
  gGenerator = gAlgoGenerator(algo);
  gRunning = true;
  const speed = parseInt(document.getElementById('graph-speed').value) || 300;
  gAnimTimer = setInterval(() => {
    const result = gGenerator.next();
    if (result.done) {
      clearInterval(gAnimTimer);
      gAnimTimer = null;
      gRunning = false;
    }
    gDraw();
  }, speed);
}

function graphStep() {
  if (!gGenerator) {
    if (!gStartId || !gGoalId) {
      logMsg('graphLog','Set a start and goal node first!','log-warn');
      return;
    }
    if (gRunning) { clearInterval(gAnimTimer); gAnimTimer = null; gRunning = false; }
    const algo = document.getElementById('graph-algo').value;
    logMsg('graphLog','Step mode: ' + algo.toUpperCase(),'log-info');
    gGenerator = gAlgoGenerator(algo);
  }
  const result = gGenerator.next();
  if (result.done) { gGenerator = null; }
  gDraw();
}

function gUpdateStats(explored, frontier, cost, steps) {
  document.getElementById('g-stat-explored').textContent = explored;
  document.getElementById('g-stat-frontier').textContent = frontier;
  document.getElementById('g-stat-cost').textContent = cost;
  document.getElementById('g-stat-steps').textContent = steps;
}

// ── Algorithms ────────────────────────────────────────
function gGetNeighbors(nodeId) {
  const neighbors = [];
  for (const e of gEdges) {
    if (e.from === nodeId) {
      neighbors.push({ id: e.to, weight: e.weight, edge: e });
    }
  }
  return neighbors;
}

function gEuclidean(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function gReconstructPath(cameFrom, current) {
  const path = [];
  let cur = current;
  while (cur !== null) {
    path.unshift(cur);
    cur = cameFrom[cur] ?? null;
  }
  return path;
}

function gHighlightPath(path) {
  // Reset all path flags
  gNodes.forEach(n => delete n._path);
  gEdges.forEach(e => delete e._path);
  for (const id of path) {
    const n = gNodes.find(n => n.id === id);
    if (n) n._path = true;
  }
  for (let i = 0; i < path.length - 1; i++) {
    const edge = gEdges.find(e => e.from === path[i] && e.to === path[i+1]);
    if (edge) edge._path = true;
  }
}

function* gAlgoGenerator(algo) {
  const startNode = gNodes.find(n => n.id === gStartId);
  const goalNode  = gNodes.find(n => n.id === gGoalId);
  if (!startNode || !goalNode) return;

  let steps = 0;
  const explored = new Set();
  const cameFrom = { [gStartId]: null };

  if (algo === 'bfs') {
    // ── BFS ──
    const queue = [gStartId];
    const visited = new Set([gStartId]);
    const frontier = new Set([gStartId]);
    gNodes.find(n=>n.id===gStartId)._frontier = true;

    while (queue.length > 0) {
      const cur = queue.shift();
      frontier.delete(cur);
      const curNode = gNodes.find(n=>n.id===cur);
      if (curNode) { delete curNode._frontier; curNode._current = true; }
      steps++;
      logMsg('graphLog', `[BFS] Expanding: ${curNode?.label} | Queue: ${queue.length}`,'log-info');
      gUpdateStats(explored.size, queue.length, '–', steps);
      yield;

      if (cur === gGoalId) {
        if (curNode) { delete curNode._current; }
        const path = gReconstructPath(cameFrom, cur);
        gHighlightPath(path);
        const cost = path.length - 1;
        gUpdateStats(explored.size, 0, cost, steps);
        logMsg('graphLog', `✅ Path found! Length: ${cost} steps`, 'log-success');
        gDraw();
        return;
      }

      explored.add(cur);
      if (curNode) { delete curNode._current; curNode._explored = true; }

      for (const { id: nid } of gGetNeighbors(cur)) {
        if (!visited.has(nid)) {
          visited.add(nid);
          cameFrom[nid] = cur;
          queue.push(nid);
          const nn = gNodes.find(n=>n.id===nid);
          if (nn) nn._frontier = true;
        }
      }
      gUpdateStats(explored.size, queue.length, '–', steps);
      yield;
    }
    logMsg('graphLog', '❌ No path found', 'log-warn');
  }

  else if (algo === 'dfs') {
    // ── DFS ──
    const stack = [[gStartId, [gStartId]]];
    const visited = new Set([gStartId]);
    gNodes.find(n=>n.id===gStartId)._frontier = true;

    while (stack.length > 0) {
      const [cur, path] = stack.pop();
      const curNode = gNodes.find(n=>n.id===cur);
      if (curNode) { delete curNode._frontier; curNode._current = true; }
      steps++;
      logMsg('graphLog', `[DFS] Visiting: ${curNode?.label}`,'log-info');
      gUpdateStats(explored.size, stack.length, '–', steps);
      yield;

      if (cur === gGoalId) {
        if (curNode) { delete curNode._current; }
        gHighlightPath(path);
        gUpdateStats(explored.size, 0, path.length-1, steps);
        logMsg('graphLog', `✅ Path found! Length: ${path.length-1}`, 'log-success');
        gDraw();
        return;
      }

      explored.add(cur);
      if (curNode) { delete curNode._current; curNode._explored = true; }

      for (const { id: nid } of gGetNeighbors(cur)) {
        if (!visited.has(nid)) {
          visited.add(nid);
          const nn = gNodes.find(n=>n.id===nid);
          if (nn) nn._frontier = true;
          stack.push([nid, [...path, nid]]);
        }
      }
      gUpdateStats(explored.size, stack.length, '–', steps);
      yield;
    }
    logMsg('graphLog', '❌ No path found', 'log-warn');
  }

  else if (algo === 'ucs') {
    // ── UCS (Dijkstra) ──
    const pq = new PriorityQueue();
    pq.push({ id: gStartId, cost: 0 }, 0);
    const dist = { [gStartId]: 0 };
    gNodes.find(n=>n.id===gStartId)._frontier = true;

    while (!pq.isEmpty()) {
      const { id: cur, cost } = pq.pop();
      if (explored.has(cur)) continue;
      explored.add(cur);

      const curNode = gNodes.find(n=>n.id===cur);
      if (curNode) { delete curNode._frontier; curNode._current = true; curNode._g = cost; }
      steps++;
      logMsg('graphLog', `[UCS] Expanding: ${curNode?.label} cost=${cost.toFixed(1)}`,'log-info');
      gUpdateStats(explored.size, pq.size, cost.toFixed(1), steps);
      yield;

      if (cur === gGoalId) {
        if (curNode) { delete curNode._current; }
        const path = gReconstructPath(cameFrom, cur);
        gHighlightPath(path);
        gUpdateStats(explored.size, 0, cost.toFixed(1), steps);
        logMsg('graphLog', `✅ Path found! Total cost: ${cost.toFixed(1)}`, 'log-success');
        gDraw();
        return;
      }

      if (curNode) { delete curNode._current; curNode._explored = true; }

      for (const { id: nid, weight } of gGetNeighbors(cur)) {
        const newCost = cost + weight;
        if (dist[nid] === undefined || newCost < dist[nid]) {
          dist[nid] = newCost;
          cameFrom[nid] = cur;
          pq.push({ id: nid, cost: newCost }, newCost);
          const nn = gNodes.find(n=>n.id===nid);
          if (nn) { nn._frontier = true; nn._g = newCost; }
        }
      }
      gUpdateStats(explored.size, pq.size, cost.toFixed(1), steps);
      yield;
    }
    logMsg('graphLog', '❌ No path found', 'log-warn');
  }

  else if (algo === 'greedy') {
    // ── Greedy Best-First ──
    const pq = new PriorityQueue();
    const h0 = gEuclidean(startNode, goalNode);
    pq.push({ id: gStartId }, h0);
    const visited = new Set([gStartId]);
    gNodes.find(n=>n.id===gStartId)._frontier = true;

    while (!pq.isEmpty()) {
      const { id: cur } = pq.pop();
      const curNode = gNodes.find(n=>n.id===cur);
      if (curNode) { delete curNode._frontier; curNode._current = true; }
      steps++;
      const h = gEuclidean(curNode, goalNode);
      logMsg('graphLog', `[Greedy] Expanding: ${curNode?.label} h=${h.toFixed(0)}`,'log-info');
      gUpdateStats(explored.size, pq.size, '–', steps);
      yield;

      if (cur === gGoalId) {
        if (curNode) delete curNode._current;
        const path = gReconstructPath(cameFrom, cur);
        gHighlightPath(path);
        gUpdateStats(explored.size, 0, path.length-1, steps);
        logMsg('graphLog', `✅ Path found! Length: ${path.length-1}`, 'log-success');
        gDraw();
        return;
      }

      explored.add(cur);
      if (curNode) { delete curNode._current; curNode._explored = true; }

      for (const { id: nid } of gGetNeighbors(cur)) {
        if (!visited.has(nid)) {
          visited.add(nid);
          cameFrom[nid] = cur;
          const nn = gNodes.find(n=>n.id===nid);
          const hn = gEuclidean(nn, goalNode);
          if (nn) nn._frontier = true;
          pq.push({ id: nid }, hn);
        }
      }
      gUpdateStats(explored.size, pq.size, '–', steps);
      yield;
    }
    logMsg('graphLog', '❌ No path found', 'log-warn');
  }

  else if (algo === 'astar') {
    // ── A* ──
    const pq = new PriorityQueue();
    const g = { [gStartId]: 0 };
    const h0 = gEuclidean(startNode, goalNode);
    pq.push({ id: gStartId }, h0);
    gNodes.find(n=>n.id===gStartId)._frontier = true;
    const openSet = new Set([gStartId]);

    while (!pq.isEmpty()) {
      const { id: cur } = pq.pop();
      openSet.delete(cur);
      if (explored.has(cur)) continue;
      explored.add(cur);

      const curNode = gNodes.find(n=>n.id===cur);
      const gc = g[cur] ?? 0;
      if (curNode) { delete curNode._frontier; curNode._current = true; curNode._g = gc; }
      steps++;
      const h = gEuclidean(curNode, goalNode);
      logMsg('graphLog', `[A*] Expanding: ${curNode?.label} g=${gc.toFixed(0)} h=${h.toFixed(0)} f=${(gc+h).toFixed(0)}`,'log-info');
      gUpdateStats(explored.size, pq.size, gc.toFixed(1), steps);
      yield;

      if (cur === gGoalId) {
        if (curNode) delete curNode._current;
        const path = gReconstructPath(cameFrom, cur);
        gHighlightPath(path);
        gUpdateStats(explored.size, 0, gc.toFixed(1), steps);
        logMsg('graphLog', `✅ Path found! Cost: ${gc.toFixed(1)}`, 'log-success');
        gDraw();
        return;
      }

      if (curNode) { delete curNode._current; curNode._explored = true; }

      for (const { id: nid, weight } of gGetNeighbors(cur)) {
        if (explored.has(nid)) continue;
        const ng = gc + weight;
        if (g[nid] === undefined || ng < g[nid]) {
          g[nid] = ng;
          cameFrom[nid] = cur;
          const nn = gNodes.find(n=>n.id===nid);
          const hn = gEuclidean(nn, goalNode);
          if (nn) { nn._frontier = true; nn._g = ng; }
          pq.push({ id: nid }, ng + hn);
        }
      }
      gUpdateStats(explored.size, pq.size, gc.toFixed(1), steps);
      yield;
    }
    logMsg('graphLog', '❌ No path found', 'log-warn');
  }
}

// ── Presets ───────────────────────────────────────────
function graphLoadPreset(name) {
  graphClear();
  if (name === 'simple') {
    // Triangle graph
    const a = gAddNode(200, 150);
    const b = gAddNode(400, 150);
    const c = gAddNode(300, 320);
    gAddEdge(a, b, 3);
    gAddEdge(b, c, 4);
    gAddEdge(a, c, 6);
    gStartId = a; gGoalId = c;
    logMsg('graphLog','Preset: Simple Triangle loaded','log-info');
  } else if (name === 'city') {
    const w = gCanvas ? gCanvas.width : 700;
    const cx = w / 2;
    const a = gAddNode(cx-250, 150);  // A
    const b = gAddNode(cx-80,  90);   // B
    const c = gAddNode(cx+100, 80);   // C
    const d = gAddNode(cx+240, 200);  // D
    const e = gAddNode(cx+100, 310);  // E
    const f = gAddNode(cx-80,  340);  // F
    const g = gAddNode(cx-200, 260);  // G
    const h = gAddNode(cx,     200);  // H (center hub)
    gAddEdge(a, b, 4); gAddEdge(b, c, 3); gAddEdge(c, d, 5);
    gAddEdge(d, e, 4); gAddEdge(e, f, 3); gAddEdge(f, g, 6);
    gAddEdge(g, a, 5); gAddEdge(b, h, 2); gAddEdge(c, h, 4);
    gAddEdge(d, h, 3); gAddEdge(e, h, 5); gAddEdge(f, h, 4);
    gAddEdge(g, h, 3); gAddEdge(a, h, 6);
    gStartId = a; gGoalId = e;
    logMsg('graphLog','Preset: City Network loaded','log-info');
  } else if (name === 'deadend') {
    const a = gAddNode(100, 200);
    const b = gAddNode(250, 130);
    const c = gAddNode(250, 280);
    const d = gAddNode(400, 130);
    const e = gAddNode(400, 280);
    const f = gAddNode(550, 200);
    const g = gAddNode(350, 380);  // dead end
    gAddEdge(a, b, 2); gAddEdge(a, c, 5);
    gAddEdge(b, d, 3); gAddEdge(c, e, 4);
    gAddEdge(d, f, 2); gAddEdge(e, f, 6);
    gAddEdge(c, g, 1); // dead end branch
    gStartId = a; gGoalId = f;
    logMsg('graphLog','Preset: Dead End Graph loaded','log-info');
  }
  gDraw();
}

// ── Export / Import ───────────────────────────────────
function graphExport() {
  const data = {
    nodes: gNodes.map(n => ({ id:n.id, x:n.x, y:n.y, label:n.label })),
    edges: gEdges.map(e => ({ from:e.from, to:e.to, weight:e.weight })),
    startId: gStartId, goalId: gGoalId, directed: gDirected
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'graph.json'; a.click();
  URL.revokeObjectURL(url);
}

function graphImportBtn() {
  document.getElementById('graphImportFile').click();
}

function graphImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      graphClear();
      gNodes = data.nodes || [];
      gEdges = data.edges || [];
      gStartId = data.startId || null;
      gGoalId  = data.goalId  || null;
      gDirected = data.directed || false;
      document.getElementById('g-directed').checked = gDirected;
      gNodeCounter = Math.max(...gNodes.map(n=>n.id), 0);
      gDraw();
      logMsg('graphLog','Graph imported successfully','log-success');
    } catch(err) {
      logMsg('graphLog','Import failed: ' + err.message,'log-warn');
    }
  };
  reader.readAsText(file);
}

// ── Window resize ─────────────────────────────────────
window.addEventListener('resize', () => {
  if (graphInitialized && currentSection === 'graph') {
    resizeGraphCanvas();
    gDraw();
  }
});
