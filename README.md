# Modex — Professional game discovery site

## Run locally
Because the site loads `games.json` with `fetch`, run it through a local web server rather than opening `index.html` as a `file://` URL. For example, in the project folder run `python -m http.server 8000`, then visit `http://localhost:8000`.

## Add or remove games
Edit `games.json` (it is the single source of truth). Each game is an object in the array. Copy an existing object, change its `id`, `title`, `category`, `image`, `size`, `rating`, `downloadUrl`, and `description`, then save. Put its image inside `images/` and use a relative path such as `images/New Game.png`. Remove an object from the array to remove that game from all lists and related-game sections. Update `featured: true` on the game you want to show in the home hero; ideally keep only one featured game.

## Publishing on GitHub Pages
Upload the contents of this folder to your repository and enable GitHub Pages. Every committed change to `games.json` or `images/` will be reflected when the site reloads. GitHub Pages is static hosting: editing `games.json` through a public website admin form cannot save changes back to GitHub without a separate authenticated backend or GitHub API integration. Never put a GitHub token in browser JavaScript.

## Game fields
- `id`: unique identifier
- `title`, `category`, `image`, `size`, `rating`
- `downloadUrl`: destination for the download button; leave empty until verified
- `featured`: true to feature the game on the home page
- `description.overview`, `description.genre`, `description.platform`, `description.modFeatures`, `description.keyFeatures`, `description.whyChooseMod`

The page uses one reusable detail template for every game, so you do not need to create separate HTML files per game.
