# AlgoViz – Search Algorithm Visualizer

A complete, interactive web application for visualizing graph search algorithms.

## Features

### 1. Graph Algorithm Visualizer
- **Build custom graphs** – click to add nodes, drag to reposition, right-click to delete
- **Add weighted edges** – click node→node, enter weight
- **Algorithms:** BFS, DFS, UCS (Dijkstra), Greedy Best-First, A*
- **Step-by-step animation** with speed control
- **Preset graphs** (Triangle, City Network, Dead End)
- **Export/Import** JSON format
- **Statistics** – explored nodes, frontier size, path cost, steps

### 2. Maze / Grid Visualizer
- **Draw walls** by clicking/dragging on the grid
- **Maze generation** (DFS recursive backtracker)
- **Random walls** with adjustable density
- **Algorithms:** BFS, DFS, DLS, IDDFS, UCS, Greedy, A*
- **Configurable grid size** (10–50 cols, 8–40 rows)
- **Pause/resume/step** animation

### 3. Algorithm Games
- **Word Ladder** – BFS finds shortest transformation path between words
- **8-Puzzle** – A* with Manhattan distance heuristic
- **River Crossing** – BFS on state space (wolf, goat, cabbage)

## Running the App

Simply open `index.html` in a modern browser. No server or build tools needed.

```
open index.html
```

Or serve from any static host (GitHub Pages, Vercel, Netlify, etc.)

## Controls

### Graph Visualizer
| Action | How |
|--------|-----|
| Add node | Click-mode: Add Node → click empty canvas |
| Add edge | Click-mode: Add Edge → click two nodes |
| Move node | Click-mode: Move → drag node |
| Delete | Click-mode: Delete → click node/edge, or right-click |
| Set start/goal | Mode buttons at top |

### Maze Visualizer
| Action | How |
|--------|-----|
| Draw walls | Select Wall tool → click/drag grid |
| Set start/goal | Select tool → click cell |
| Generate maze | Click "Gen Maze" |

## Technology

- **Vanilla JavaScript** (ES6+, no frameworks)
- **HTML5 Canvas** for graph and maze rendering
- **CSS Grid/Flexbox** for layout
- **Google Fonts** (Syne, DM Sans, DM Mono)

## Design Decisions

- Algorithms implemented as generator functions for step-by-step animation
- Graph stored as adjacency list with visual state overlaid separately
- Maze uses separate `mVisited` array so grid data is never mutated by search
- 8-puzzle A* capped at 100k nodes to prevent browser freeze (all standard puzzles solve well within this)
- Word ladder BFS uses a precomputed adjacency graph for fast neighbor lookups
