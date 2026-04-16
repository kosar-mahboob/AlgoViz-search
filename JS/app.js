/* ================================================
   app.js – Main Controller / Navigation
   ================================================ */

'use strict';

// ── Navigation ───────────────────────────────────────
const sections = ['home','graph','maze','games'];
let currentSection = 'home';

function navigate(id) {
  // Hide all sections
  sections.forEach(s => {
    const el = document.getElementById(s);
    if (el) { el.classList.remove('active'); }
  });
  // Show target
  const target = document.getElementById(id);
  if (target) { target.classList.add('active'); }
  currentSection = id;

  // Update mode indicator in header
  const indicator = document.getElementById('mode-indicator');
  const labels = { home:'home', graph:'graph visualizer', maze:'maze visualizer', games:'games' };
  if (indicator) indicator.textContent = labels[id] || id;

  // Update URL hash
  history.pushState(null, '', '#' + id);

  // Init tools on first visit
  if (id === 'graph' && !graphInitialized) initGraph();
  if (id === 'maze' && !mazeInitialized) initMaze();
  if (id === 'games') openGame('home');
}

function openGame(id) {
  const pages = document.querySelectorAll('.game-page');
  pages.forEach(p => p.classList.remove('active'));
  if (id === 'home') {
    document.getElementById('game-home').classList.add('active');
    const indicator = document.getElementById('mode-indicator');
    if (indicator) indicator.textContent = 'games';
  } else {
    const target = document.getElementById('game-' + id);
    if (target) target.classList.add('active');
    const indicator = document.getElementById('mode-indicator');
    if (indicator) indicator.textContent = 'game: ' + id;

    // Update URL
    history.pushState(null, '', '#games/' + id);

    // Initialize game if needed
    if (id === 'wordladder' && !wlInitialized) initWordLadder();
    if (id === 'sliding' && !puzzleInitialized) initPuzzle();
    if (id === 'river' && !rcInitialized) initRiverCrossing();
  }
}

// Handle browser back/forward
window.addEventListener('popstate', () => {
  const hash = location.hash.replace('#','');
  if (!hash || hash === 'home') navigate('home');
  else if (hash.startsWith('games/')) {
    navigate('games');
    openGame(hash.replace('games/',''));
  } else if (sections.includes(hash)) {
    navigate(hash);
  }
});

// Init on load
window.addEventListener('DOMContentLoaded', () => {
  const hash = location.hash.replace('#','');
  if (hash && hash !== 'home') {
    if (hash.startsWith('games/')) {
      navigate('games');
      openGame(hash.replace('games/',''));
    } else if (sections.includes(hash)) {
      navigate(hash);
    }
  }
});

// ── Shared PriorityQueue ─────────────────────────────
class PriorityQueue {
  constructor() { this._heap = []; }
  push(item, priority) {
    this._heap.push({ item, priority });
    this._bubbleUp(this._heap.length - 1);
  }
  pop() {
    if (this._heap.length === 0) return null;
    this._swap(0, this._heap.length - 1);
    const { item } = this._heap.pop();
    this._sinkDown(0);
    return item;
  }
  peek() { return this._heap[0]?.item ?? null; }
  get size() { return this._heap.length; }
  isEmpty() { return this._heap.length === 0; }
  _bubbleUp(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this._heap[p].priority <= this._heap[i].priority) break;
      this._swap(p, i);
      i = p;
    }
  }
  _sinkDown(i) {
    const n = this._heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this._heap[l].priority < this._heap[smallest].priority) smallest = l;
      if (r < n && this._heap[r].priority < this._heap[smallest].priority) smallest = r;
      if (smallest === i) break;
      this._swap(i, smallest);
      i = smallest;
    }
  }
  _swap(i, j) { [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]]; }
  contains(fn) { return this._heap.some(e => fn(e.item)); }
}

// ── Shared utilities ─────────────────────────────────
function logMsg(logId, msg, cls = '') {
  const el = document.getElementById(logId);
  if (!el) return;
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.textContent = msg;
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
}

function clearLog(logId) {
  const el = document.getElementById(logId);
  if (el) el.innerHTML = '';
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}
