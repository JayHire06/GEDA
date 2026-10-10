# Directive: 06_cyera_state_engine.md — 4-State Cyera AI Guardian Experience

## Objective
Replace heavy or cluttered WebGL scenes with a high-performance, 60fps state-driven landing flow inspired by Cyera AI Guardian. The engine transitions smoothly through four distinct states using Three.js for hardware-accelerated globe rendering, GSAP for state choreography, and hardware-accelerated CSS for cockpit viewport framing and 7 LiFE interactive cards.

---

## 4-State UI State Machine Architecture

### State 0: Hero Entry ("Gujarat Energy Transition")
- **Visuals:** Fullscreen cosmic viewport with background `#0b0618`.
- **3D Canvas:** Three.js sphere textured with `assets/earth_texture.jpg` (with fallback procedural texture if load fails), positioned at center `(0, 0, 0)` with ambient and directional light, spinning slowly at ~0.003 rad/frame.
- **UI Overlay:** Centered high-impact typography:
  - Badge: "GUJARAT ENERGY DEVELOPMENT AGENCY • MISSION LiFE"
  - Headline: "Gujarat Energy Transition"
  - Subtitle: "AI-Powered Load-Shifting, Rooftop Solar Feasibility & Citizen Rewards"
  - Primary Action: Glowing interactive button "Begin Your Mission" (`#btnBeginMission`).
  - Top header: Authentic GEDA & Mission LiFE branding with DISCOM selector.

### State 1: Orbit Intro ("Your Mission: Protect Gujarat's Grid")
- **Trigger:** Click on "Begin Your Mission" or scroll down.
- **3D Globe Transition:** GSAP smoothly translates the Earth globe to the left (`x: -30%` or camera projection offset) and slightly scales it down.
- **Visual Overlay:** Spinning SVG orbital target rings / telemetry HUD around the Earth.
- **Text & Narrative:** Right-aligned bold briefing panel reveals:
  - Headline: "Your Mission: Protect Gujarat's Grid & Drive Carbon Neutrality"
  - Mission Brief: Evening peak power demand (18:00–22:00 IST) stresses the state transmission network. Citizen prosumers shift load and deploy solar to protect the grid.
  - Action Button: "Enter LiFE Cockpit" (`#btnEnterCockpit`).

### State 2: Spaceship Cockpit Viewport (7 Mission LiFE Themes)
- **Visuals:** Futuristic spaceship bridge / cockpit viewport frame overlay (dark glass panels, angled cockpit borders, glowing HUD meters, telemetry readouts).
- **Interactive Carousel / 3D Cards:** Users cycle through interactive 3D cards for the **7 Mission LiFE Categories**:
  1. **Save Energy:** Grid Peak-Shifting (18:00–22:00 IST) & Smart Appliance Timers.
  2. **Save Water:** Solar Micro-Irrigation & Efficient Agricultural Pumps.
  3. **Say No to Single-Use Plastics:** Zero-waste packaging and cloth alternatives.
  4. **Adopt Sustainable Food Systems:** Indigenous millet cultivation & food waste prevention.
  5. **Reduce Waste:** Circular economy, decentralized composting, source segregation.
  6. **Adopt Healthy Lifestyles:** Zero-emission e-mobility, public transit & cycling.
  7. **Reduce E-Waste:** Certified rooftop solar PV recycling & battery recovery.
- **Mouse-Parallax:** Mouse movement smoothly tilts the cockpit frame and active card by ±5 degrees using `requestAnimationFrame` interpolation.
- **Action Button:** "Discover Platform" (`#btnDiscoverPlatform`) or "Explore Full App".

### State 3: Citizen Portal & Admin Hub (Main Application)
- **Trigger:** Click "Discover Platform" or "Skip to Portal".
- **Transition:** Cockpit and 3D overlay smoothly fade out with `opacity: 0; pointer-events: none;`.
- **Performance Optimization (CRITICAL):**
  - Three.js render loop is paused (`cancelAnimationFrame`) when State 3 is active and the hero canvas is out of viewport, guaranteeing zero GPU/CPU lag for the charts and calculators!
  - Resumes render loop only if the user scrolls back to the top or resets the experience.
- **Main App Revealed:** Complete citizen energy dashboard, Rooftop Solar ROI Yield Calculator, Mission LiFE Rewards Marketplace, and link to GEDA Admin Control Panel.

---

## Technical Constraints & Standards
1. **60fps Fluidity:** Use hardware-accelerated CSS (`transform: translate3d(0, 0, 0)`, `will-change: transform`, `backface-visibility: hidden`).
2. **Robust Fallbacks:** Texture loader gracefully handles errors by generating a vibrant procedural blue/green/atmosphere canvas texture if offline or file protocol blocked.
3. **Responsive Design:** Viewport scales gracefully from mobile (<640px) to ultra-wide (>1920px).
4. **State Management:** Accessible globally as `window.cyeraFlow.setState(targetState)` and tied to keyboard shortcuts (Arrow keys for card cycling).
