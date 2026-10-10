# Directive: 06_cyera_state_engine.md — Zero-Lag Flow AI Video State Machine Engine

## Objective
Convert the Cyera AI Guardian state experience to a zero-lag, hardware-accelerated video-backed state machine. Instead of client-side 3D WebGL meshes, the landing experience is driven by three high-definition cinematic Flow AI video sequences corresponding to the core narrative stages:
1. **State 0 (Hero):** Rotating Earth in Space (`src/assets/earth_hero_loop.mp4`)
2. **State 1 (Orbital Shift):** Planet Earth with Orbital Target Rings (`src/assets/earth_orbital_shift.mp4`)
3. **State 2 (LiFE Cockpit):** Spaceship Bridge Overlooking Earth (`src/assets/cockpit_view.mp4`)
4. **State 3 (Discover Main App):** Fades out video overlay and pauses playback for zero background CPU/GPU footprint.

---

## 4-State Video Engine Architecture

### State 0: Hero Entry ("Gujarat Energy Transition")
- **Video Source:** `assets/earth_hero_loop.mp4` (autoplay, loop, muted, playsinline).
- **Visuals:** Seamless looping cosmic Earth rotation with deep space background.
- **UI Overlay:** Centered high-impact typography:
  - Badge: "GUJARAT ENERGY DEVELOPMENT AGENCY • MISSION LiFE"
  - Headline: "Gujarat Energy Transition"
  - Subtitle: "AI-Powered Load-Shifting, Rooftop Solar Feasibility & Citizen Rewards"
  - Primary Action: Glowing interactive button "Begin Your Mission 🚀" (`#btnBeginMission`).
  - Top header: Authentic GEDA & Mission LiFE branding with DISCOM selector.

### State 1: Orbital Shift ("Your Mission: Protect Gujarat's Grid")
- **Trigger:** Click on "Begin Your Mission" or select Stage 02.
- **Video Source:** Smoothly cross-fades to `assets/earth_orbital_shift.mp4` (Earth shifted with orbital rings).
- **UI Overlay:**
  - Spinning SVG orbital target reticles synchronized with the video.
  - Right-aligned mission briefing panel:
    - Headline: "Your Mission: Protect Gujarat's Grid & Drive Carbon Neutrality"
    - Briefing: Evening peak power demand (18:00–22:00 IST) stresses the state transmission network. Citizen prosumers shift load and deploy solar to protect the grid.
    - Action Buttons: "← Back" (`#btnBackToHero`) & "Enter LiFE Cockpit ⚡" (`#btnEnterCockpit`).

### State 2: Spaceship Cockpit Viewport (7 Mission LiFE Themes)
- **Trigger:** Click "Enter LiFE Cockpit" or select Stage 03.
- **Video Source:** Smoothly transitions to `assets/cockpit_view.mp4` (futuristic spaceship cockpit overlooking Earth).
- **UI Overlay:**
  - Frosted glass canopy viewport frame matching Cyera's guardian design.
  - Interactive 3D carousel with swipe/arrow navigation for the **7 Mission LiFE Categories**:
    1. **Save Energy:** Grid Peak-Shifting (18:00–22:00 IST) & Smart Appliance Timers.
    2. **Save Water:** Solar Micro-Irrigation & Efficient Agricultural Pumps.
    3. **Say No to Single-Use Plastics:** Zero-waste packaging and cloth alternatives.
    4. **Adopt Sustainable Food Systems:** Indigenous millet cultivation & food waste prevention.
    5. **Reduce Waste:** Circular economy, decentralized composting, source segregation.
    6. **Adopt Healthy Lifestyles:** Zero-emission e-mobility, public transit & cycling.
    7. **Reduce E-Waste:** Certified rooftop solar PV recycling & battery recovery.
  - Interactive pagination dots, card counters, and subtle cursor tilt tracking.
  - Action Button: "Discover Platform 🚀" (`#btnDiscoverPlatform`).

### State 3: Citizen Portal & Admin Hub (Main Application)
- **Trigger:** Click "Discover Platform" or "Skip to Portal".
- **Transition:** Cockpit and video background smoothly fade out (`opacity: 0; pointer-events: none;`).
- **Performance Optimization (CRITICAL):**
  - Background video playback is paused (`video.pause()`) when State 3 is active, guaranteeing 0% background video decoding overhead and maximum smoothness for Chart.js and interactive sliders!
  - Automatically resumes video when the user scrolls back to the very top or resets to State 0.

---

## Technical Constraints & Standards
1. **Zero-Lag Native Video:** Uses native HTML5 video with `playsinline muted loop` for hardware-accelerated H.264 video decoding.
2. **Smooth Crossfades:** Handles video source switching with CSS opacity transition to prevent black frame flicker.
3. **Responsive Scaling:** `object-cover` styling ensures full-bleed presentation on mobile (<640px) up to 4K displays.
4. **Global Controller API:** `window.cyeraFlow.setState(targetState)` enables control from navbar, keys, and button handlers.
