# Pulse

Personal tracker for workouts, food and body weight. Built as a web app you install on your iPhone home screen. All data stays on the phone.

## Install on iPhone
1. Host this folder on any HTTPS static host (GitHub Pages, Netlify, Cloudflare Pages).
2. Open the URL in **Safari**, tap **Share**, then **Add to Home Screen**.
3. Open Pulse from the home screen icon. After the first load it works offline.

## Backups
Settings > Export backup saves a JSON file (put it in Files or iCloud Drive). Restore with Settings > Restore from backup.
Deleting the home screen icon deletes the app's data, so export before you remove it.

## Files
- `index.html`, `styles.css`, `app.js`: the app
- `sw.js`: offline cache (bump `CACHE` when you change files)
- `manifest.webmanifest`, `icons/`: home screen icon and name
