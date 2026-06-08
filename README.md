# Ludo Star

A polished browser-based Ludo game built with HTML, CSS, and JavaScript.

## Features

- Pixel-perfect Ludo board with modern UI
- 4 players (Red, Green, Yellow, Blue)
- 4 tokens per player
- Dice rolling with animation
- Turn management and timer
- Safe zones, home paths, token capture, and win conditions
- Extra turn on rolling a 6
- Single-player mode vs AI and local multiplayer mode
- Responsive layout for desktop, tablet, and mobile
- Dark mode and glassmorphism UI styling
- Smooth token animations and winner celebration
- Scoreboard and status panels
- Sound effects via Web Audio API

## Setup

1. Open this folder in your browser or start a local server.
2. Open `index.html`.

### Recommended local server

If you have Python installed:

```bash
cd /workspaces/ludo_star
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Usage

- Click a mode to switch between Single Player and Local Multiplayer.
- Press `Roll Dice` to roll.
- Click a valid token to move after rolling.
- Scoreboard updates automatically.
- Press `Restart Game` to reset the board.

## Notes

- The game is fully self-contained and works in modern browsers.
- No external assets are required.
