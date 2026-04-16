/* ================================================
   rivercrossing.js – Wolf, Goat, Cabbage (BFS)
   ================================================ */

'use strict';

let rcInitialized = false;

// State: side of each actor (0=left, 1=right)
// [farmer, wolf, goat, cabbage]
let rcState = [0,0,0,0];
let rcSelected = [];

// Solution state
let rcSolutionSteps = [];
let rcSolveIndex = 0;

const RC_ACTORS = [
  { id: 0, emoji: '👨‍🌾', name: 'Farmer' },
  { id: 1, emoji: '🐺', name: 'Wolf' },
  { id: 2, emoji: '🐐', name: 'Goat' },
  { id: 3, emoji: '🥬', name: 'Cabbage' },
];

// ── Init ──────────────────────────────────────────────
function initRiverCrossing() {
  rcInitialized = true;
  rcReset();
}

function rcReset() {
  rcState = [0,0,0,0]; // all on left
  rcSelected = [];
  rcSolutionSteps = [];
  rcSolveIndex = 0;
  document.getElementById('rc-step-btn').disabled = true;
  clearLog('rc-log');
  clearLog('rc-solution-log');
  document.getElementById('rc-msg').textContent = 'Select items to put in the boat, then cross.';
  document.getElementById('rc-msg').style.color = '';
  rcRender();
}

// ── Render ────────────────────────────────────────────
function rcRender() {
  const leftBank  = document.getElementById('rc-left-bank');
  const rightBank = document.getElementById('rc-right-bank');
  const boatActors = document.getElementById('rc-boat-actors');
  if (!leftBank || !rightBank || !boatActors) return;

  leftBank.innerHTML  = '<div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted);margin-bottom:6px;">LEFT BANK</div>';
  rightBank.innerHTML = '<div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted);margin-bottom:6px;">RIGHT BANK</div>';
  boatActors.innerHTML = '';

  const farmerSide = rcState[0]; // 0=left,1=right

  RC_ACTORS.forEach(actor => {
    const side = rcState[actor.id];
    const isSelected = rcSelected.includes(actor.id);
    const isFarmer = actor.id === 0;

    const div = document.createElement('div');
    div.className = 'actor' + (isSelected ? ' selected' : '');
    div.innerHTML = `<span>${actor.emoji}</span><span class="lbl">${actor.name}</span>`;

    // Farmer can always be clicked (goes in boat)
    // Others can be clicked only if on same side as farmer
    if (side === farmerSide || isFarmer) {
      div.addEventListener('click', () => rcToggleSelect(actor.id));
    } else {
      div.style.opacity = '0.5';
      div.style.cursor = 'default';
    }

    if (side === 0) leftBank.appendChild(div);
    else rightBank.appendChild(div);
  });
}

function rcToggleSelect(actorId) {
  const farmer = 0;
  // Farmer must always be included when crossing
  if (actorId === farmer) {
    // Deselect/select farmer
    const idx = rcSelected.indexOf(farmer);
    if (idx >= 0) {
      // Deselecting farmer clears all selections
      rcSelected = [];
    } else {
      if (!rcSelected.includes(farmer)) rcSelected.push(farmer);
    }
  } else {
    const idx = rcSelected.indexOf(actorId);
    if (idx >= 0) {
      rcSelected.splice(idx, 1);
    } else {
      // Can only take one non-farmer item
      rcSelected = rcSelected.filter(id => id === farmer);
      if (!rcSelected.includes(farmer)) rcSelected.push(farmer);
      rcSelected.push(actorId);
    }
  }
  document.getElementById('rc-msg').textContent = rcSelected.length > 0 
    ? `Selected: ${rcSelected.map(id=>RC_ACTORS[id].name).join(', ')}`
    : 'Select items to put in the boat, then cross.';
  rcRender();
  // Re-show selections
  rcSelected.forEach(id => {
    // Re-mark selected (re-rendering removes it)
  });
  rcRenderSelections();
}

function rcRenderSelections() {
  // After render, re-highlight selected actors
  const allActorDivs = document.querySelectorAll('.actor');
  // This approach rebuilds inline; let's just do a full render with selections
  rcRenderWithSelections();
}

function rcRenderWithSelections() {
  const leftBank  = document.getElementById('rc-left-bank');
  const rightBank = document.getElementById('rc-right-bank');
  const boatActors = document.getElementById('rc-boat-actors');
  if (!leftBank || !rightBank || !boatActors) return;

  leftBank.innerHTML  = '<div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted);margin-bottom:6px;">LEFT BANK</div>';
  rightBank.innerHTML = '<div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted);margin-bottom:6px;">RIGHT BANK</div>';
  boatActors.innerHTML = '';

  const farmerSide = rcState[0];

  // Put selected actors in boat area
  const boatLabel = document.createElement('span');
  boatLabel.className = 'boat-label';
  boatLabel.textContent = '⛵ Boat';
  boatActors.appendChild(boatLabel);

  RC_ACTORS.forEach(actor => {
    const side = rcState[actor.id];
    const isSelected = rcSelected.includes(actor.id);

    const div = document.createElement('div');
    div.className = 'actor' + (isSelected ? ' selected' : '');
    div.innerHTML = `<span>${actor.emoji}</span><span class="lbl">${actor.name}</span>`;

    if (isSelected) {
      boatActors.appendChild(div);
      return;
    }

    const canInteract = (side === farmerSide) || actor.id === 0;
    if (!canInteract) { div.style.opacity='0.4'; div.style.cursor='default'; }
    else div.addEventListener('click', () => rcToggleSelectAndRefresh(actor.id));

    if (side === 0) leftBank.appendChild(div);
    else rightBank.appendChild(div);
  });

  // Add click handlers on boat actors too (deselect)
  boatActors.querySelectorAll('.actor').forEach((el,i) => {
    const actorId = rcSelected[i] !== undefined ? rcSelected[i] : -1;
    if (actorId >= 0) el.addEventListener('click', () => rcToggleSelectAndRefresh(actorId));
  });
}

function rcToggleSelectAndRefresh(actorId) {
  const farmer = 0;
  if (actorId === farmer) {
    if (rcSelected.includes(farmer)) {
      rcSelected = [];
    } else {
      rcSelected = [farmer];
    }
  } else {
    const idx = rcSelected.indexOf(actorId);
    if (idx >= 0) {
      rcSelected.splice(idx, 1);
    } else {
      rcSelected = rcSelected.filter(id => id === farmer);
      if (!rcSelected.includes(farmer)) rcSelected.push(farmer);
      rcSelected.push(actorId);
    }
  }
  document.getElementById('rc-msg').textContent = rcSelected.length > 0 
    ? `Selected: ${rcSelected.map(id=>RC_ACTORS[id].name).join(', ')}`
    : 'Select items to put in the boat, then cross.';
  rcRenderWithSelections();
}

// Override rcRender with the improved version
function rcRender() { rcRenderWithSelections(); }

// ── Cross River ───────────────────────────────────────
function rcCross() {
  // Must have farmer
  if (!rcSelected.includes(0)) {
    showRcMsg('Farmer must be in the boat!', 'warn'); return;
  }
  // Max 1 other item
  const others = rcSelected.filter(id => id !== 0);
  if (others.length > 1) {
    showRcMsg('Boat can only carry farmer + 1 item!', 'warn'); return;
  }
  // All selected must be on same side
  const farmerSide = rcState[0];
  for (const id of rcSelected) {
    if (rcState[id] !== farmerSide && id !== 0) {
      showRcMsg('All items must be on farmer\'s side!','warn'); return;
    }
  }

  // Move selected actors to other side
  const newSide = 1 - farmerSide;
  const newState = [...rcState];
  for (const id of rcSelected) newState[id] = newSide;

  // Check if new state is valid
  if (!rcIsValid(newState)) {
    showRcMsg('That move would cause a disaster! Try a different combination.','warn'); return;
  }

  // Apply move
  const moved = rcSelected.map(id=>RC_ACTORS[id].name).join(', ');
  rcState = newState;
  rcSelected = [];

  logMsg('rc-log',`Farmer takes ${moved} to ${newSide===1?'right':'left'} bank`,'log-info');

  if (rcIsGoal(rcState)) {
    showRcMsg('🎉 Everyone crossed safely!', 'success');
    logMsg('rc-log','✅ Puzzle solved!','log-success');
  } else {
    showRcMsg('Crossed! Select next items for the return trip.','');
  }

  rcRender();
}

function showRcMsg(msg, type) {
  const el = document.getElementById('rc-msg');
  el.textContent = msg;
  el.style.color = type==='warn'?'#dc2626':type==='success'?'#059669':'';
}

function rcDeselectAll() {
  rcSelected = [];
  document.getElementById('rc-msg').textContent = 'Select items to put in the boat, then cross.';
  document.getElementById('rc-msg').style.color = '';
  rcRender();
}

// ── Validation ────────────────────────────────────────
function rcIsValid(state) {
  // state[0]=farmer, [1]=wolf, [2]=goat, [3]=cabbage
  const farmerSide = state[0];
  const wolfSide   = state[1], goatSide = state[2], cabbageSide = state[3];

  // Wolf and goat alone (no farmer)
  if (wolfSide === goatSide && wolfSide !== farmerSide) return false;
  // Goat and cabbage alone (no farmer)
  if (goatSide === cabbageSide && goatSide !== farmerSide) return false;
  return true;
}

function rcIsGoal(state) {
  return state.every(s => s === 1);
}

// ── BFS Solver ────────────────────────────────────────
function rcSolve() {
  clearLog('rc-solution-log');
  logMsg('rc-solution-log','Running BFS on state space...','log-info');

  const startState = [0,0,0,0];
  const goalKey = '1,1,1,1';

  const queue = [{ state: startState, path: [startState], descriptions: ['Start: all on left bank'] }];
  const visited = new Set([startState.join(',')]);
  let found = null;
  let nodesExpanded = 0;

  while (queue.length > 0) {
    const { state, path, descriptions } = queue.shift();
    nodesExpanded++;

    if (state.join(',') === goalKey) { found = { path, descriptions }; break; }

    const farmerSide = state[0];
    const newSide = 1 - farmerSide;

    // Possible moves: farmer alone, or farmer + one of [wolf,goat,cabbage]
    const possibleGroups = [
      [0],       // farmer alone
      [0,1],     // farmer + wolf
      [0,2],     // farmer + goat
      [0,3],     // farmer + cabbage
    ];

    for (const group of possibleGroups) {
      // All must be on farmer's side
      let valid = true;
      for (const id of group) {
        if (state[id] !== farmerSide) { valid = false; break; }
      }
      if (!valid) continue;

      const nextState = [...state];
      for (const id of group) nextState[id] = newSide;

      if (!rcIsValid(nextState)) continue;

      const key = nextState.join(',');
      if (visited.has(key)) continue;
      visited.add(key);

      const names = group.slice(1).map(id=>RC_ACTORS[id].name);
      const bankName = newSide===1 ? 'right' : 'left';
      const desc = names.length > 0 
        ? `Farmer takes ${names.join(' & ')} to ${bankName} bank`
        : `Farmer crosses alone to ${bankName} bank`;

      queue.push({ state: nextState, path: [...path, nextState], descriptions: [...descriptions, desc] });
    }
  }

  if (!found) {
    logMsg('rc-solution-log','❌ No solution found (unexpected!)','log-warn');
    return;
  }

  rcSolutionSteps = found.path;
  const descs = found.descriptions;
  logMsg('rc-solution-log',`✅ Solution in ${descs.length-1} moves (${nodesExpanded} states explored)`,'log-success');
  for (let i = 1; i < descs.length; i++) {
    logMsg('rc-solution-log', `Step ${i}: ${descs[i]}`);
  }

  // Store for step-by-step
  rcSolveIndex = 0;
  rcSolutionStepDescs = descs;
  document.getElementById('rc-step-btn').disabled = false;
  logMsg('rc-solution-log','← Click "Next Step" to animate solution','log-info');

  // Reset to start for animation
  rcState = [0,0,0,0];
  rcSelected = [];
  rcRender();
}

let rcSolutionStepDescs = [];

function rcNextStep() {
  if (rcSolveIndex >= rcSolutionSteps.length - 1) {
    document.getElementById('rc-step-btn').disabled = true;
    showRcMsg('🎉 Solution complete!','success');
    return;
  }
  rcSolveIndex++;
  rcState = [...rcSolutionSteps[rcSolveIndex]];
  rcSelected = [];
  showRcMsg(rcSolutionStepDescs[rcSolveIndex] || '', '');
  rcRender();

  if (rcSolveIndex >= rcSolutionSteps.length - 1) {
    document.getElementById('rc-step-btn').disabled = true;
    showRcMsg('🎉 All done! Everyone crossed safely.','success');
  }
}
