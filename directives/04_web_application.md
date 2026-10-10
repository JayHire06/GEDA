# Directive: 04_web_application.md — Interactive Web Application Architecture

## Objective
Build a modern, zero-dependency, static web portal for the **Gujarat Energy Development Agency (GEDA) Mission LiFE Platform**. The web deliverable enables everyday Gujarat residential citizens to track and shift peak power usage, calculate rooftop solar yields and financial ROI, and view LiFE Points rewards. It also equips GEDA state officials with a private administrative dashboard for district-level macro transition oversight.

---

## 1. Web Architecture & Technology Stack
- **Static Frontend:** Pure HTML5, CSS3, Modern JavaScript (ES6+), designed for deployment on GitHub Pages or any static CDN.
- **Styling Framework:** Tailwind CSS (CDN) augmented by custom glassmorphic tokens and micro-interactions in `src/css/styles.css`.
- **Typography:** Google Fonts (`Outfit` for headings and brand metrics, `Inter` for clean technical readouts).
- **Visualization Engine:** Chart.js (CDN) with gradient fills, smooth cubic bezier curves, and custom interactive tooltips.
- **Data Ingestion:** Client-side asynchronous `fetch()` targeting precomputed static JSON assets in `src/data/`:
  - `src/data/forecast_data.json` (Phase 2 ML XGBoost demand curves)
  - `src/data/solar_calculator_data.json` (Phase 3 solar ROI & vendor directory)
  - `src/data/district_analytics.json` (Phase 4 statewide district scorecard)

---

## 2. File Organization
```
src/
├── index.html                   # Citizen Portal (Smart Energy Tracker, Solar ROI, LiFE Points)
├── geda-admin.html              # Admin Control Panel (District Analytics, Heatmaps, Peak Shaving)
├── css/
│   └── styles.css               # Design system tokens, glassmorphism, glowing badges, animations
├── js/
│   ├── app.js                   # Citizen portal controller & Peak-Shifting engine
│   ├── calculator.js            # Interactive Rooftop Solar ROI & PM Surya Ghar Subsidy calculator
│   └── admin.js                 # Administrative control panel & district leaderboards
└── data/
    ├── forecast_data.json       # 72h actual vs XGBoost forecast curve & feature weights
    ├── solar_calculator_data.json # District solar yields & approved GEDA vendor directory
    └── district_analytics.json  # 5-district transition scorecard & peak shaving potential
```

---

## 3. UI/UX Specifications

### Citizen Portal (`src/index.html`)
1. **Header & Mission LiFE Banner:** Gujarat state identity, green energy badge, quick portal navigation, live LiFE points ticker.
2. **Feature 1 — Smart Energy Tracker (Peak-Shifting Engine):**
   - 72-Hour Interactive Chart (Chart.js) comparing **Actual Household Demand**, **XGBoost 3.4 ML Forecast**, and **Naive 24h Baseline**.
   - Gujarat Evening Peak Zone highlight (18:00–22:00 IST) with real-time grid alerts.
   - Interactive Appliance Load-Shifting Sliders (Air Conditioner, Water Pump, EV Charger, Washing Machine).
   - Real-time calculation of avoided peak kWh, annual bill savings (₹), and LiFE points awarded.
3. **Feature 2 — Rooftop Solar Savings Calculator:**
   - District Selector (Gandhinagar, Ahmedabad, Surat, Vadodara, Rajkot).
   - Input controls: Monthly electricity bill (₹) or available roof area (sq ft / sq m).
   - Instant calculation: Recommended panel capacity (kW), annual output (kWh), gross CapEx, GEDA/PM Surya Ghar subsidy, net CapEx, annual savings, and breakeven payback period.
   - GEDA-Approved Vendor Directory modal/cards with ratings and verified badges.
4. **Feature 3 — LiFE Points & Gamification:**
   - Tier badges (Bronze Saver, Silver Conserver, Gold Solar Champion, Platinum Net-Zero Pioneer).
   - Redeemable rewards preview (Municipal property tax rebates, EV charging credits).

### Admin Control Panel (`src/geda-admin.html`)
1. **Macro KPI Ribbons:** Total installed rooftop solar (MW), Statewide target achievement (%), Registered prosumers, Avoided $\text{CO}_2$ (tonnes), and Total peak shaving capacity (MW).
2. **District Performance Scorecard:** Sortable table ranking Rajkot, Ahmedabad, Surat, Vadodara, and Gandhinagar.
3. **Interactive Visualizations:**
   - Installed vs Target Capacity by District (Bar chart).
   - 12-Month Solar Irradiance and Generation seasonality curves.
   - Peak Load Shaving distribution.

---

## 4. Operational & Deployment SOP

### Local Preview
Because modern browsers enforce strict CORS policies when reading local files via `file:///`, static JSON assets must be served over an HTTP server:
```bash
# From workspace root
python -m http.server 8000 --directory src
# Open in browser: http://localhost:8000
```

### GitHub Pages Deployment
1. Ensure `src/` assets are committed or configured in repository settings.
2. GitHub Pages can be configured to serve from `/docs` (or root of `gh-pages` branch). If serving from `/docs`, mirror `src/` to `docs/`.
