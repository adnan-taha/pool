# Corner Pocket

An interactive 3D eight-ball pool game built with Three.js and Vite.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Move the pointer over the table to aim, set shot
power with the slider, and click **Shoot** or press <kbd>Space</kbd>. On touch
screens, drag to aim and release to shoot.

## Project structure

```text
docs/
└── 39.docx            # Original pool physics research document
src/
├── app/
│   └── main.js        # Game lifecycle and input orchestration
├── config/
│   └── constants.js   # Table, ball, pocket, and physics constants
├── engine/
│   └── physics.js     # Movement and collision simulation
├── rendering/         # Three.js scene, table, balls, and aim guide
├── rules/
│   └── eight-ball.js  # Turns, fouls, and win conditions
├── styles/
│   └── main.css       # Responsive presentation
└── ui/                # DOM references and interface updates
tests/
└── eight-ball.test.js # Rule and foul tests
```

## Rules

- Player 1 shoots solids (1-7); Player 2 shoots stripes (9-15).
- Pocketing one of your balls keeps your turn.
- A miss or scratch changes the turn.
- Fouls include a scratch, no object-ball contact, contacting the wrong group
  first, and failing to drive a ball to a rail or pocket after contact.
- After a foul, the incoming player receives ball in hand behind the head area.
- Pocket the 8-ball after clearing your group to win.
- Pocketing the 8-ball early, or scratching with it, loses the game.
