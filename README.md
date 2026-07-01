# Corner Pocket

An interactive 3D eight-ball pool game built with Three.js and Vite.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Move the pointer over the table to aim, set shot
power with the slider or arrow keys, and click **Shoot** or press
<kbd>Space</kbd>. Space works immediately with the default aim; the table does
not need to receive pointer input first. Use <kbd>Shift</kbd> with the arrow
keys for larger power steps. On touch screens, drag to aim and release to shoot.

Use the cue-ball control in the footer to apply spin:

- Drag upward for follow and downward for draw.
- Drag left or right for side spin (english).
- Use <kbd>W</kbd>/<kbd>S</kbd> for follow/draw and <kbd>A</kbd>/<kbd>D</kbd>
  for left/right english. Press <kbd>R</kbd> to center it.

After a foul, drag on the table to place the cue ball before shooting. Player
names are editable in the side panels, and match wins are saved in the browser.
The **SFX** button in the header mutes or enables the synthesized game sounds.

## Physics

Balls track linear and angular velocity. Cue offset creates torque, sliding
friction transitions balls into rolling, rolling and vertical-axis spin decay
separately, and side spin affects cushion contact. Ball-ball collisions remain
pairwise and frictionless, matching the assumptions in `docs/39.docx`.

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
- The table starts open. Groups are assigned by the first legal non-break
  pocket after the break.
- The opening break must pocket an object ball or drive four object balls to
  rails.
- Pocketing one of your balls keeps your turn.
- A miss or scratch changes the turn.
- Fouls include a scratch, no object-ball contact, contacting the wrong group
  first, and failing to drive a ball to a rail or pocket after contact.
- After a foul, the incoming player receives ball in hand behind the head area.
- Pocket the 8-ball after clearing your group to win.
- Pocketing the 8-ball early, or scratching with it, loses the game.
