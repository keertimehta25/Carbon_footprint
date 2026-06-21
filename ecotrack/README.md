# EcoTrack 🌿 — Personal Carbon Footprint Tracker

## Problem Statement
Climate change is accelerating, but individuals lack simple, engaging tools to understand and reduce their personal carbon footprint. EcoTrack bridges this gap by making carbon tracking as intuitive and motivating as a fitness app.

## Solution
EcoTrack is a browser-based progressive web app that lets users:
- **Calculate** daily carbon emissions across transport, energy, diet & shopping
- **Track** eco-friendly activities and step counts to offset emissions
- **Visualize** trends with interactive charts and a contribution heatmap
- **Gamify** sustainability through XP, badges, streak tracking, and challenges
- **Compete** on a community leaderboard to inspire social accountability

## Tech Stack
- Vanilla JavaScript (ES Modules), HTML5, CSS3 — zero build step, zero runtime dependencies
- Chart.js (via CDN) for data visualization
- LocalStorage for offline-first data persistence
- Docker + Nginx for deployment
- Community leaderboard is currently a local, simulated dataset (see `js/leaderboard.js`); swapping in a real backend (e.g. Firestore) would only require replacing `buildUserEntry`'s data source

## Project Structure
```
ecotrack/
├── index.html              # App shell, all sections, ARIA-labelled markup
├── css/                     # One stylesheet per feature area
├── js/
│   ├── main.js              # Entry point — imports & initializes every module
│   ├── storage.js           # localStorage persistence layer + sanitizeHTML()
│   ├── calculator.js        # Emission wizard + live calculation
│   ├── dashboard.js         # Chart.js analytics views
│   ├── tracker.js           # Step pedometer, activity log, heatmap
│   ├── gamification.js      # XP, levels, badges, weekly challenges
│   ├── insights.js          # Personalized tips & comparisons
│   ├── leaderboard.js       # Community ranking (simulated dataset)
│   └── hero.js              # Live "today" dashboard + clock
├── tests/
│   └── ecotrack.test.js     # Unit tests — imports real source modules directly
├── Dockerfile / nginx.conf  # Production container, port 8080 end to end
└── package.json
```

## Running Locally
```bash
# Via Docker
docker build -t ecotrack .
docker run -p 8080:8080 ecotrack

# Or just open index.html in any modern browser
# Or, for a quick local server:
npm start
```

## Running Tests
```bash
npm test
# or directly:
node tests/ecotrack.test.js
```
41 tests covering storage persistence, XSS sanitization, carbon-calculation
math, gamification leveling, and tracker savings logic — including
corrupted-data recovery and negative/invalid-input edge cases.

## Deployment
Live at: https://ecotrack-silk.vercel.app/

## Carbon Calculation Methodology
Emission factors sourced from:
- IPCC 2021 Transport figures
- UK BEIS Greenhouse Gas Reporting factors
- Oxford University food emissions research (Poore & Nemecek 2018)