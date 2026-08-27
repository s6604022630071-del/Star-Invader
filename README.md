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
See `MUSIC_LICENSES.md` for the five CC0 stage tracks and BPM sync settings.


## Audio behavior
Lobby music starts after the first user interaction because mobile browsers block autoplay before a tap/click. Stage music switches when gameplay begins. The audio controller manually loops tracks and retries temporary stream stalls/errors.


## v7 audio/UI
Each stage now has a separate boss track. Boss music starts on boss appearance and the next stage track starts immediately after boss defeat. The top-right slider controls music volume. Boss backgrounds use smooth moving gradient waves instead of beat flashes.

## Local audio setup

This build uses local audio paths under `./audio/` instead of streaming music from OpenGameArt.

On Windows, run `download_audio.bat` once. It downloads all CC0 music and the boss-shot SFX into the `audio` folder. After it finishes, commit/upload the `audio` folder together with the rest of the project to GitHub/Netlify.

The original asset pages and license information remain in `MUSIC_LICENSES.md`.
