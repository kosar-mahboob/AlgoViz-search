/* ================================================
   wordladder.js – Word Ladder Game (BFS solver)
   ================================================ */

'use strict';

let wlInitialized = false;
let wlCurrentPath = [];
let wlSolutionPath = [];
let wlAnimIndex = 0;
let wlAnimTimer = null;

// ── Dictionary of common 4-letter words ──────────────
const WL_WORDS = [
  "able","acid","aged","also","area","army","away","back","ball","band",
  "bank","bare","barn","base","bath","bear","beat","been","bell","best",
  "bill","bind","bird","bite","blue","boat","body","bold","bolt","bone",
  "book","bore","born","both","bulk","burn","call","calm","came","cane",
  "card","care","cart","case","cash","cast","cave","city","clam","clap",
  "clay","club","coal","coat","code","coin","cold","come","cook","cool",
  "cope","copy","core","corn","cost","cure","cute","dame","dare","dark",
  "data","date","dawn","dead","deal","dear","debt","deep","dell","dent",
  "desk","dime","dine","dire","disk","dive","dome","door","dose","dote",
  "dove","down","draw","drop","drum","dual","dull","dump","dusk","dust",
  "duty","earn","ease","east","edge","epic","even","evil","face","fact",
  "fade","fail","fair","fall","fame","farm","fast","fate","feel","fell",
  "felt","file","fill","film","find","fine","fire","firm","fish","fist",
  "five","flat","flew","flip","flow","foam","fold","folk","fond","font",
  "food","fool","foot","fore","fork","form","fort","foul","four","free",
  "fuel","full","fund","fuse","gain","game","gang","gave","gear","gene",
  "gift","girl","give","glad","glee","glow","glue","goal","gold","golf",
  "gone","good","gore","gown","grab","gram","gray","grew","grin","grip",
  "grow","gulf","gust","hack","hail","half","hall","halt","hand","hang",
  "hard","harm","hate","have","head","heal","heap","heat","heel","help",
  "here","hero","hide","high","hill","hint","hire","hold","hole","holy",
  "home","hook","hope","horn","host","hour","huge","hull","hunt","hurt",
  "idle","inch","into","iron","item","jack","jail","joke","jump","just",
  "keen","keep","kick","kill","kind","king","knew","know","lace","lack",
  "laid","lake","lamp","land","lane","last","late","lawn","lead","lean",
  "leap","left","lend","less","lick","life","lift","like","lime","line",
  "link","list","live","load","loan","lock","loft","lone","long","look",
  "loom","loop","lore","lose","loss","lost","loud","love","luck","lump",
  "lung","made","mail","main","make","male","mall","mane","mark","mass",
  "math","meal","mean","meat","meet","melt","memo","menu","mere","mesh",
  "mile","milk","mill","mine","mint","miss","mist","mode","mole","mood",
  "moon","more","most","move","much","myth","name","neat","need","next",
  "nice","nine","node","none","noon","norm","nose","note","nude","oath",
  "once","open","oral","over","pace","pack","page","pain","pair","pale",
  "palm","pane","park","part","past","path","peak","peel","peer","pest",
  "pile","pill","pine","pink","pipe","plan","play","plot","plug","plus",
  "poem","poet","pole","poll","pond","pool","poor","port","pose","post",
  "pour","pray","prey","prod","prop","pull","pure","push","quit","race",
  "rage","rain","rank","rare","rate","read","real","rear","reed","reel",
  "rent","rest","rice","rich","ride","ring","riot","rise","risk","road",
  "roam","roar","rock","role","roll","roof","room","root","rope","rose",
  "rude","ruin","rule","rush","safe","sage","sail","sale","salt","same",
  "sand","sang","sank","save","seal","seam","seed","seek","seem","seen",
  "self","sell","send","sent","shed","ship","shoe","shot","show","shut",
  "sick","side","sigh","silk","sill","sine","sing","sink","site","size",
  "skin","skip","slam","slim","slip","slot","slow","slug","snap","snow",
  "soap","sock","soft","soil","sole","some","song","soon","sore","sort",
  "soul","soup","sour","span","spin","spit","spot","stem","step","stop",
  "stub","such","suit","sung","sunk","sure","tale","tall","tank","tape",
  "task","team","tear","tell","tend","tent","term","test","text","tide",
  "tile","till","time","tire","toad","toll","tomb","tone","tore","torn",
  "toss","tour","town","trek","trim","trip","true","tube","tune","turf",
  "turn","twin","type","ugly","undo","unit","upon","used","vale","vane",
  "vary","vast","veil","verb","very","vest","view","vile","vine","void",
  "vote","wade","wage","wake","walk","wane","ward","warm","wary","wave",
  "weak","weed","week","well","went","were","west","wide","wife","wild",
  "wile","will","wind","wine","wing","wink","wire","wise","wish","wolf",
  "wood","word","work","worn","wrap","yarn","yell","your","zero","zone",
  "zoom","bean","bead","beak","beam","belt","bend","bias","blob","blew",
  "blot","blur","bode","bolt","boom","boon","bore","boss","bout","bred",
  "brew","brow","buck","bulb","bull","burp","bust","buzz","calf","camp",
  "cant","cape","carp","chap","char","chat","chef","chew","chip","chop",
  "chow","chum","cite","clad","claw","clip","clog","clot","clue","coil",
  "coke","cram","crib","crow","crud","dabs","damp","darn","dart","dash",
  "daub","daze","deft","demo","dens","dew","diet","dill","dims","dine",
  "dips","dish","diva","dock","dodo","does","dolt","dong","doom","dote",
  "drag","dray","drip","drub","drug","drum","drys","dubs","duel","dung",
  "dupe","earl","eels","eggs","egos","eked","elms","emit","ends","envy",
  "etch","exam","eyes","fads","fawn","faze","fend","fern","feud","fief",
  "figs","fisc","flab","flag","flan","flaw","flea","fled","flex","flit",
  "flog","flop","flub","flue","flux","foam","fobs","foes","fogy","fops",
  "fray","fret","froe","frog","from","fund","furl","fury","gale","gall",
  "galp","gash","gasp","gawk","gaze","geld","gems","gent","germ","gibe",
  "gild","gilt","gist","gnaw","goad","goat","gods","gorge","gosh","gust",
  "guts","gyre","hale","halo","hams","haze","heed","hemp","herd","hewn",
  "hike","hiss","hobo","hock","hone","honk","hood","hoop","hose","hubs",
  "hubs","huff","huge","hulk","hunk","hugs","hymn","iced","icon","icky",
  "idea","ides","imam","inch","inky","inn","ions","iota","isle","itch",
  "jabs","jags","jams","jape","jars","jaws","jeer","jibe","jigs","jibs",
  "jink","jive","jolt","josh","joust","jowl","joys","jugs","junk","jury",
  "juts","keel","kegs","kelp","kern","keys","kick","kids","kilt","kin",
  "kink","kite","kits","knit","knob","knot","labs","lack","lads","lags",
  "lair","lams","laps","lard","lark","lath","laud","lavs","laze","lean",
  "leap","leek","leer","legs","lens","levy","liar","lick","lids","lieu",
  "limp","lisp","list","laud","lobe","loch","lode","lofty","logs","loll",
  "lord","lore","lorn","lout","lows","lube","lull","lurk","mace","mach",
  "mags","maid","maim","maps","mash","maul","maze","mead","mere","meek",
  "mesa","mill","mitt","moat","mock","mole","mops","mote","moth","muck",
  "mugs","mule","mull","murk","muse","mush","mutt","nabs","nags","naps",
  "nary","nave","nigh","nips","nobs","nods","nosy","nuns","nuts","oafs",
  "oaks","oars","oats","odes","oils","okay","omen","omit","ooze","orbs",
  "ores","orgy","outs","owls","owns","pads","pals","pang","pans","paps",
  "pard","pars","pate","pave","pawn","pays","pegs","pens","peps","perp",
  "pert","pets","pewit","phat","phiz","pied","pies","pigs","pits","pity",
  "pixy","plod","plop","plot","plow","ploy","plum","plunk","pods","pops",
  "pork","porn","posh","pots","prim","prod","prog","prom","prow","puny",
  "pups","pyre","quip","quod","rags","raid","rails","rake","ramp","raps",
  "rasp","rats","rave","raze","reek","refs","rein","rend","repo","reek",
  "rift","rigs","rile","rime","rind","rink","rips","robe","robs","rods",
  "rogs","rook","rots","rows","rubs","rugs","rump","runt","ruse","rust",
  "ruts","ryot","sack","sago","saps","sass","saul","scab","scam","scan",
  "scar","scow","scud","seep","serf","sewn","shag","shah","sham","shed",
  "shim","shin","shiv","shod","shop","shun","slap","slaw","slay","sled",
  "slew","slob","slop","slur","smug","snag","snob","snot","snub","soar",
  "sobs","sods","sops","spew","spry","spud","spur","stab","stag","Stan",
  "star","stat","stew","stir","stub","stud","stun","subs","suds","sump",
  "sumo","swam","swan","swat","swig","swum","tabs","tack","tags","tads",
  "tamp","taps","tart","tats","taunt","taut","teak","teal","teen","tees",
  "temp","tern","that","them","then","they","thin","this","thus","tick",
  "tiff","tike","tips","tits","toil","tops","town","toys","trap","tray",
  "trod","trot","truce","truce","tuft","twig","twit","tyke","ugly","vats",
  "vend","vent","veto","vice","vise","vows","waif","wail","wasp","welt",
  "wend","whim","whip","whiz","whom","wick","wigs","wimp","wits","woke",
  "womb","wonk","woos","writ","yams","yaps","yore","yuan","zeal","zest"
].map(w => w.toLowerCase().trim()).filter((w,i,a) => w.length===4 && a.indexOf(w)===i);

// Build adjacency list (words differing by 1 letter)
let wlGraph = {};

function buildWordGraph() {
  wlGraph = {};
  for (const w of WL_WORDS) wlGraph[w] = [];

  for (let i = 0; i < WL_WORDS.length; i++) {
    for (let j = i+1; j < WL_WORDS.length; j++) {
      if (differByOne(WL_WORDS[i], WL_WORDS[j])) {
        wlGraph[WL_WORDS[i]].push(WL_WORDS[j]);
        wlGraph[WL_WORDS[j]].push(WL_WORDS[i]);
      }
    }
  }
}

function differByOne(a, b) {
  let diff = 0;
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) diff++;
  return diff === 1;
}

// ── Init ──────────────────────────────────────────────
function initWordLadder() {
  wlInitialized = true;
  buildWordGraph();
  wlReset();
  logMsg('wl-log', `Dictionary loaded: ${WL_WORDS.length} words`, 'log-info');
}

function wlReset() {
  if (wlAnimTimer) { clearInterval(wlAnimTimer); wlAnimTimer = null; }
  const start = document.getElementById('wl-start')?.value.toLowerCase().trim() || 'cold';
  wlCurrentPath = [start];
  wlSolutionPath = [];
  wlAnimIndex = 0;
  wlRenderPath([start], -1);
  document.getElementById('wl-stat-steps').textContent = '–';
  document.getElementById('wl-stat-nodes').textContent = '–';
  document.getElementById('wl-manual-msg').textContent = '';
  document.getElementById('wl-manual-input').value = '';
}

// ── BFS Solver ────────────────────────────────────────
function wlSolve() {
  if (wlAnimTimer) { clearInterval(wlAnimTimer); wlAnimTimer = null; }
  const startWord = document.getElementById('wl-start').value.toLowerCase().trim();
  const endWord   = document.getElementById('wl-end').value.toLowerCase().trim();

  clearLog('wl-log');

  if (startWord.length !== 4 || endWord.length !== 4) {
    logMsg('wl-log','Both words must be 4 letters!','log-warn'); return;
  }
  if (!WL_WORDS.includes(startWord)) {
    logMsg('wl-log',`"${startWord.toUpperCase()}" not in dictionary!`,'log-warn'); return;
  }
  if (!WL_WORDS.includes(endWord)) {
    logMsg('wl-log',`"${endWord.toUpperCase()}" not in dictionary!`,'log-warn'); return;
  }
  if (startWord === endWord) {
    wlRenderPath([startWord], -1);
    logMsg('wl-log','Already at goal!','log-success'); return;
  }

  logMsg('wl-log',`BFS: ${startWord.toUpperCase()} → ${endWord.toUpperCase()}`,'log-info');

  // BFS
  const queue = [[startWord]];
  const visited = new Set([startWord]);
  let nodesVisited = 0;
  let found = null;

  while (queue.length > 0) {
    const path = queue.shift();
    const cur = path[path.length - 1];
    nodesVisited++;

    if (cur === endWord) { found = path; break; }

    for (const neighbor of (wlGraph[cur] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  document.getElementById('wl-stat-nodes').textContent = nodesVisited;

  if (!found) {
    logMsg('wl-log',`❌ No path from ${startWord.toUpperCase()} to ${endWord.toUpperCase()}`,'log-warn');
    document.getElementById('wl-stat-steps').textContent = '–';
    return;
  }

  wlSolutionPath = found;
  document.getElementById('wl-stat-steps').textContent = found.length - 1;
  logMsg('wl-log',`✅ Found path in ${found.length-1} steps!`,'log-success');
  for (const w of found) logMsg('wl-log','  → ' + w.toUpperCase());

  // Animate reveal
  wlAnimIndex = 0;
  wlRenderPath([found[0]], -1);
  wlAnimTimer = setInterval(() => {
    wlAnimIndex++;
    if (wlAnimIndex < found.length) {
      wlRenderPath(found.slice(0, wlAnimIndex+1), wlAnimIndex);
    } else {
      clearInterval(wlAnimTimer); wlAnimTimer = null;
      wlRenderPath(found, -1);
    }
  }, 400);
}

// ── Render ────────────────────────────────────────────
function wlRenderPath(path, currentIndex) {
  const container = document.getElementById('wl-path-display');
  if (!container) return;
  const startWord = document.getElementById('wl-start')?.value.toLowerCase().trim();
  const endWord   = document.getElementById('wl-end')?.value.toLowerCase().trim();

  if (path.length === 0) {
    container.innerHTML = '<div class="small text-center" style="padding:1rem;color:var(--faint)">Path will appear here</div>';
    return;
  }

  container.innerHTML = '';
  for (let i = 0; i < path.length; i++) {
    const word = path[i];
    const prev = i > 0 ? path[i-1] : null;
    const div = document.createElement('div');
    div.className = 'wl-word';
    if (word === startWord) div.classList.add('start-word');
    else if (word === endWord) div.classList.add('end-word');
    if (i === currentIndex) div.classList.add('current');

    for (let ci = 0; ci < word.length; ci++) {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = word[ci].toUpperCase();
      if (prev && word[ci] !== prev[ci]) span.classList.add('changed');
      div.appendChild(span);
    }

    if (i < path.length - 1) {
      const arrow = document.createElement('span');
      arrow.style.cssText = 'font-size:0.7rem;color:var(--faint);align-self:center;margin-left:auto;';
      arrow.textContent = '↓';
      div.appendChild(arrow);
    }
    container.appendChild(div);
  }
  container.scrollTop = container.scrollHeight;
}

// ── Manual play ───────────────────────────────────────
function wlManualStep() {
  const input = document.getElementById('wl-manual-input');
  const word = input.value.toLowerCase().trim();
  const msg = document.getElementById('wl-manual-msg');

  if (word.length !== 4) { msg.textContent = 'Must be 4 letters!'; msg.style.color='var(--b500)'; return; }

  const current = wlCurrentPath[wlCurrentPath.length - 1];
  const endWord = document.getElementById('wl-end').value.toLowerCase().trim();

  if (!WL_WORDS.includes(word)) {
    msg.textContent = `"${word.toUpperCase()}" not in dictionary!`;
    msg.style.color = '#dc2626'; return;
  }
  if (!differByOne(current, word)) {
    msg.textContent = 'Must differ by exactly one letter!';
    msg.style.color = '#dc2626'; return;
  }
  if (wlCurrentPath.includes(word)) {
    msg.textContent = 'Already visited this word!';
    msg.style.color = '#d97706'; return;
  }

  wlCurrentPath.push(word);
  input.value = '';

  if (word === endWord) {
    msg.textContent = `🎉 Solved in ${wlCurrentPath.length-1} steps!`;
    msg.style.color = '#059669';
  } else {
    msg.textContent = `Good! ${wlCurrentPath.length-1} step(s) so far`;
    msg.style.color = 'var(--muted)';
  }

  wlRenderPath(wlCurrentPath, -1);
}

// ── Random pair ───────────────────────────────────────
function wlRandom() {
  // Find a pair with a path of length 3-6
  const tries = 100;
  for (let t = 0; t < tries; t++) {
    const w1 = WL_WORDS[Math.floor(Math.random()*WL_WORDS.length)];
    const w2 = WL_WORDS[Math.floor(Math.random()*WL_WORDS.length)];
    if (w1 === w2) continue;

    // Quick BFS to check reachability
    const queue = [[w1]];
    const visited = new Set([w1]);
    let found = null;
    let steps = 0;
    while (queue.length > 0 && steps < 200) {
      const path = queue.shift();
      const cur = path[path.length-1];
      steps++;
      if (cur === w2) { found = path; break; }
      for (const nb of (wlGraph[cur] || [])) {
        if (!visited.has(nb)) { visited.add(nb); queue.push([...path,nb]); }
      }
    }
    if (found && found.length >= 3 && found.length <= 6) {
      document.getElementById('wl-start').value = w1.toUpperCase();
      document.getElementById('wl-end').value = w2.toUpperCase();
      wlReset();
      logMsg('wl-log',`Random pair: ${w1.toUpperCase()} → ${w2.toUpperCase()}`,'log-info');
      return;
    }
  }
  logMsg('wl-log','Could not find a good pair, try again','log-warn');
}
