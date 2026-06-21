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
- Vanilla JavaScript (ES Modules), HTML5, CSS3
- Chart.js for data visualization
- LocalStorage for offline-first data persistence
- Docker + Nginx for deployment
- Firebase Firestore (optional leaderboard backend)

## Running Locally
```bash
# Via Docker
docker build -t ecotrack .
docker run -p 8080:80 ecotrack

# Or just open index.html in any modern browser
```

## Running Tests
```bash
node tests/ecotrack.test.js
```

## Deployment
Live at: https://ecotrack-silk.vercel.app/

## Carbon Calculation Methodology
Emission factors sourced from:
- IPCC 2021 Transport figures
- UK BEIS Greenhouse Gas Reporting factors
- Oxford University food emissions research (Poore & Nemecek 2018)