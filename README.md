# Star Invader - File Structure

- `index.html` — menus and page structure
- `styles.css` — all UI/game page styling
- `config.js` — **all important gameplay tuning values**
- `game.js` — gameplay logic, rendering, collisions, enemy behavior

## Tune gameplay

Open `config.js`.

Useful sections:

- `PLAYER` — life, max life, bullet lines, hitbox, iFrames
- `POWERUPS` — drop rate, item chances, fall speed
- `STAGE` — mini-boss/boss timing and enemy spawn speed
- `MINOR_ENEMIES` — HP, movement speed, bullet speed, patterns
- `MINI_BOSS` — HP, movement, spread size and fire rate
- `BOSS` — HP, movement and pattern timing
- `DIFFICULTY` — Easy/Normal/Hard multipliers

Run `index.html` in a browser. No backend is required.


## Music
See `MUSIC_LICENSES.md` for the five stage tracks
