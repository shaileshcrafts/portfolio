# macOS Finder Portfolio Desktop

A static, GitHub Pages-ready portfolio interface inspired by macOS Finder.

## Playing videos (important)

YouTube refuses to embed videos in a page opened straight from disk (`file:///C:/...`) and shows **Error 153**. Pick either:

- **Preview locally:** double-click `run-local.bat` (Windows) or `run-local.command` (Mac). It needs Python and opens `http://localhost:8000`.
- **Publish:** upload the folder to GitHub Pages (or any host). Videos play in-page there.

If the page is opened as a file, every player shows a "Watch on YouTube" card instead of an error.

## What's included

- **Camera** window in the centre, styled to match the light Finder theme. It autoplays the featured YouTube video (`f6yCZayRz48`) muted and looping. Anyone can pause/play (centre button) and turn sound on/off (left button). Closing it leaves the Camera app icon on the desktop.
- **Projects / Resources / SSD** open Finder windows with the categories under Favorites.
- **Search works everywhere.** The magnifier (or Ctrl/Cmd+F) searches all folders, videos, resources, apps and notes at once, grouped by type. Clicking a folder result jumps into it.
- **Open as many videos as you like.** Every video opens in its own player window (Shorts open in a tall window). Windows cascade, can be dragged, minimized to a tray, maximized, and closed with the red dot, Back, or Esc. Re-opening a video that is already open just focuses it.
- **Notes** is laid out like `assets/reference/notes-window-reference.svg` (folders | note list | note). The **About Me** note recreates the supplied folded poster (`assets/reference/about-poster-reference.png`): white sheet, giant black numerals (years, SaaS companies, videos, tools), staggered photo and text blocks, using the artwork in `assets/about/`. Edit `aboutProfile` in `script.js` to change the bio, stats and contact details.
- Desktop icons can be dragged; positions are remembered in the browser.

## Project links

Each folder keeps every video ever added; the same video is only kept once per folder. Edit `rawProjectGroups` in `script.js` and add a URL to the end of a folder's `urls` list to add a video (titles are numbered automatically).

- **SAAS:** TkP1ke5_JNQ, f6yCZayRz48, CrPp8tKF6OM, _H1V_izM5O4
- **Short Form:** VAPHMOwsGuM, oYqnqw9oGW4, yscOse1xhrs, ttOXtL8eFMA, ufyC5VimXZE, ABLsaHyX8UQ
- **Long Form:** xPr14CMHeVI, p4alG8td2qY
- **Talking Head:** p4alG8td2qY plus Short Form videos ufyC5VimXZE and ttOXtL8eFMA

## Resources links

- Project Files: `https://drive.google.com/drive/folders/1cwCtAw6xMDadTvah-BLzW03CIXIszWfC?usp=sharing`
- Plugins: `https://drive.google.com/drive/folders/1_jihAIffgAkcigmTzPjWU1ubIQ8XUDtO?usp=sharing`
- Others: `https://drive.google.com/drive/folders/1SgXy3nJHU5i8Hevewdff-3PmBARQQDSq?usp=sharing`

## Font setup

`styles.css` is configured for SF Pro Display Regular, Medium and Bold. To self-host the font files, copy these three OTF files from your own SF Pro Display archive into `assets/fonts/`:

- `SFPRODISPLAYREGULAR.OTF`
- `SFPRODISPLAYMEDIUM.OTF`
- `SFPRODISPLAYBOLD.OTF`

The project includes `assets/fonts/README.txt` with the same instructions. Until the files are present, it uses the platform sans-serif fallback or an already-installed local copy of SF Pro Display.

## Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of this folder so `index.html` is at the repository root.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**, choose `main` and `/ (root)`, then save.

No build step or framework is required.
