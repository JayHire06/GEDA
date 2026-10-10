/**
 * src/js/cyera_flow.js
 * 60fps Cyera AI Guardian 4-State UI State Machine & 7 LiFE Spaceship Cockpit Engine
 * Powered by Three.js (Textured Earth Globe) & GSAP
 */

class CyeraFlowController {
  constructor() {
    this.currentState = 0; // 0: Hero, 1: Orbit Intro, 2: Cockpit, 3: Main App
    this.currentCardIndex = 0;
    this.totalCards = 7;
    this.animFrameId = null;
    this.isRendering = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    // 7 Mission LiFE categories dataset
    this.lifeThemes = [
      {
        id: 1,
        title: "Save Energy",
        subtitle: "Grid Peak Shifting & Rooftop Solar",
        icon: "⚡",
        metric: "168.4 MW Shaved",
        target: "200 MW Statewide",
        description: "Automate appliance timers outside 18:00–22:00 IST peak grid hours to prevent carbon-heavy thermal plant dispatch.",
        color: "from-amber-500 to-yellow-400",
        tag: "Theme 01 • Peak Shaving",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        tip: "Schedule pumps, ACs, and EVs during daytime solar hours."
      },
      {
        id: 2,
        title: "Save Water",
        subtitle: "Solar Micro-Irrigation & Pumping",
        icon: "💧",
        metric: "4.2B Liters Conserved",
        target: "Zero Groundwater Depletion",
        description: "Equip Gujarat agricultural feeders with automated drip micro-irrigation and solar rooftop pump controllers.",
        color: "from-cyan-500 to-blue-400",
        tag: "Theme 02 • Water Security",
        badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        tip: "Cut water waste by 40% with smart pressure sensors."
      },
      {
        id: 3,
        title: "Say No to Single-Use Plastics",
        subtitle: "Zero-Waste Prosumer Packaging",
        icon: "🛍️",
        metric: "18,400 MT Plastic Replaced",
        target: "100% Biodegradable",
        description: "Adopt reusable jute/cotton bags and circular packaging standards across DISCOM billing and citizen services.",
        color: "from-rose-500 to-pink-400",
        tag: "Theme 03 • Zero Plastic",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        tip: "Earn 150 LiFE points per verified reusable shopping month."
      },
      {
        id: 4,
        title: "Adopt Sustainable Food Systems",
        subtitle: "Indigenous Millets & Zero Wastage",
        icon: "🌾",
        metric: "142,000 Farmers Supported",
        target: "Low Water Millets",
        description: "Promote climate-resilient Bajra, Jowar, and Ragi crops demanding 70% less irrigation and zero chemical fertilizers.",
        color: "from-emerald-500 to-green-400",
        tag: "Theme 04 • Sustainable Agronomy",
        badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        tip: "Millet cultivation cuts agricultural grid pumping load by 45%."
      },
      {
        id: 5,
        title: "Reduce Waste",
        subtitle: "Circular Economy & Source Segregation",
        icon: "♻️",
        metric: "88% Municipal Composting",
        target: "Zero Landfill Dispatch",
        description: "Decentralized organic composting and bio-methanization of urban kitchen waste into clean grid biogas.",
        color: "from-teal-500 to-emerald-400",
        tag: "Theme 05 • Circular Economy",
        badgeBg: "bg-teal-500/20 text-teal-300 border-teal-500/30",
        tip: "Convert daily organic waste into nutrient-rich solar garden compost."
      },
      {
        id: 6,
        title: "Adopt Healthy Lifestyles",
        subtitle: "Zero-Emission E-Mobility & Cycling",
        icon: "🚲",
        metric: "32,000 T CO₂ Avoided",
        target: "Clean Commute First",
        description: "Replace short combustion trips with Gujarat solar-charged 2-wheelers, e-cycles, and walkable eco-corridors.",
        color: "from-purple-500 to-indigo-400",
        tag: "Theme 06 • E-Mobility",
        badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        tip: "Charge your EV between 11:00–15:00 using surplus rooftop solar."
      },
      {
        id: 7,
        title: "Reduce E-Waste",
        subtitle: "Solar PV Recycling & Circular Hardware",
        icon: "🔋",
        metric: "94% Silicon & Silver Recovery",
        target: "Responsible End-of-Life",
        description: "Mandated take-back policies for end-of-life solar panels, lithium inverters, and household electronics with authorized recyclers.",
        color: "from-orange-500 to-amber-400",
        tag: "Theme 07 • Solar Lifecycle",
        badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/30",
        tip: "Deposit old electronics at GEDA certified recovery nodes."
      }
    ];

    this.init();
  }

  init() {
    this.initThreeJs();
    this.setupEventListeners();
    this.renderThemeCards();
    this.setState(0);
    this.startRenderLoop();
  }

  /* -------------------------------------------------------------
   * THREE.JS TEXTURED EARTH & BACKGROUND ENGINE
   * ------------------------------------------------------------- */
  initThreeJs() {
    const canvas = document.getElementById("cyeraCanvas");
    if (!canvas || typeof THREE === "undefined") {
      console.warn("[CyeraFlow] Three.js or #cyeraCanvas not available.");
      return;
    }

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0b0618, 0.001);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 7.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting: Sun + Ambient Earth glow
    const ambientLight = new THREE.AmbientLight(0x2d2b55, 1.4);
    this.scene.add(ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sunLight.position.set(6, 3, 5);
    this.scene.add(this.sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-6, -2, -2);
    this.scene.add(rimLight);

    // Textured Earth Globe
    const globeGeometry = new THREE.SphereGeometry(2.1, 64, 64);
    
    // Texture loader with procedural fallback
    const textureLoader = new THREE.TextureLoader();
    let earthTexture;
    try {
      earthTexture = textureLoader.load(
        'assets/earth_texture.jpg',
        () => {
          this.renderer.render(this.scene, this.camera);
        },
        undefined,
        () => {
          console.warn("[CyeraFlow] Earth texture load error; using procedural fallback texture.");
          this.globeMaterial.map = this.createFallbackEarthTexture();
          this.globeMaterial.needsUpdate = true;
        }
      );
    } catch (e) {
      earthTexture = this.createFallbackEarthTexture();
    }

    this.globeMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.7,
      metalness: 0.1,
      bumpScale: 0.05
    });

    this.earthGlobe = new THREE.Mesh(globeGeometry, this.globeMaterial);
    this.scene.add(this.earthGlobe);

    // Atmospheric Glow Shell
    const glowGeo = new THREE.SphereGeometry(2.16, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    this.atmosphereGlow = new THREE.Mesh(glowGeo, glowMat);
    this.earthGlobe.add(this.atmosphereGlow);

    // Orbital Energy Rings
    const ringGeo = new THREE.RingGeometry(2.6, 2.65, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.orbitRing1 = new THREE.Mesh(ringGeo, ringMat);
    this.orbitRing1.rotation.x = Math.PI / 2.3;
    this.orbitRing1.rotation.y = Math.PI / 8;
    this.earthGlobe.add(this.orbitRing1);

    const ringGeo2 = new THREE.RingGeometry(3.1, 3.14, 96);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });
    this.orbitRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    this.orbitRing2.rotation.x = Math.PI / 1.7;
    this.orbitRing2.rotation.y = -Math.PI / 6;
    this.earthGlobe.add(this.orbitRing2);

    // Cosmic Dust / Star Field
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 40;
      starPositions[i + 1] = (Math.random() - 0.5) * 40;
      starPositions[i + 2] = (Math.random() - 0.5) * 40;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.75
    });
    this.starPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starPoints);

    // Resize handler
    window.addEventListener("resize", () => {
      if (!this.camera || !this.renderer) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  createFallbackEarthTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    
    // Deep ocean
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#081b3a");
    gradient.addColorStop(0.5, "#0d2b56");
    gradient.addColorStop(1, "#071830");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);

    // Continents procedural patches
    ctx.fillStyle = "#1e5b38";
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * 1024;
      const cy = Math.random() * 512;
      const r = 20 + Math.random() * 60;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    for (let i = 0; i < 30; i++) {
      const cx = Math.random() * 1024;
      const cy = Math.random() * 512;
      ctx.fillRect(cx, cy, 70 + Math.random() * 100, 15 + Math.random() * 25);
    }

    return new THREE.CanvasTexture(canvas);
  }

  /* -------------------------------------------------------------
   * RENDER LOOP & PERFORMANCE CONTROL
   * ------------------------------------------------------------- */
  startRenderLoop() {
    if (this.isRendering) return;
    this.isRendering = true;

    const render = () => {
      if (!this.isRendering) return;

      // Slow earth rotation
      if (this.earthGlobe) {
        this.earthGlobe.rotation.y += 0.0025;
      }
      if (this.orbitRing1) this.orbitRing1.rotation.z += 0.004;
      if (this.orbitRing2) this.orbitRing2.rotation.z -= 0.003;

      // Smooth mouse-parallax interpolation
      this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
      this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

      if (this.camera) {
        this.camera.position.x = this.mouseX * 0.4;
        this.camera.position.y = -this.mouseY * 0.3;
        this.camera.lookAt(0, 0, 0);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  pauseRenderLoop() {
    this.isRendering = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    console.log("[CyeraFlow] Render loop paused for zero CPU/GPU overhead.");
  }

  resumeRenderLoop() {
    if (!this.isRendering) {
      console.log("[CyeraFlow] Resuming 60fps render loop.");
      this.startRenderLoop();
    }
  }

  /* -------------------------------------------------------------
   * 4-STATE MACHINE TRANSITIONS
   * ------------------------------------------------------------- */
  setState(targetState) {
    this.currentState = targetState;
    console.log(`[CyeraFlow] Transitioning to State ${targetState}`);

    const container = document.getElementById("cyeraExperience");
    if (!container) return;

    // Reset state classes
    container.classList.remove("state-0", "state-1", "state-2", "state-3");
    container.classList.add(`state-${targetState}`);

    // Update global body scroll lock
    if (targetState === 3) {
      document.body.classList.remove("overflow-hidden");
      this.pauseRenderLoop();
    } else {
      document.body.classList.add("overflow-hidden");
      this.resumeRenderLoop();
    }

    // GSAP 3D Camera / Globe choreography
    if (this.earthGlobe && typeof gsap !== "undefined") {
      const isMobile = window.innerWidth < 768;

      if (targetState === 0) {
        // State 0: Globe Centered, Full view
        gsap.to(this.earthGlobe.position, {
          x: 0,
          y: isMobile ? 0.4 : 0,
          z: 0,
          duration: 1.4,
          ease: "power3.out"
        });
        gsap.to(this.earthGlobe.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.4,
          ease: "power3.out"
        });
      } else if (targetState === 1) {
        // State 1: Globe translated to left (-30% projection)
        gsap.to(this.earthGlobe.position, {
          x: isMobile ? 0 : -2.3,
          y: isMobile ? 1.6 : 0,
          z: 0.2,
          duration: 1.5,
          ease: "power3.out"
        });
        gsap.to(this.earthGlobe.scale, {
          x: isMobile ? 0.75 : 0.88,
          y: isMobile ? 0.75 : 0.88,
          z: isMobile ? 0.75 : 0.88,
          duration: 1.5,
          ease: "power3.out"
        });
      } else if (targetState === 2) {
        // State 2: Cockpit view; Globe centered slightly deep in viewport
        gsap.to(this.earthGlobe.position, {
          x: 0,
          y: isMobile ? -0.2 : 0,
          z: -1.2,
          duration: 1.6,
          ease: "power3.out"
        });
        gsap.to(this.earthGlobe.scale, {
          x: 0.78,
          y: 0.78,
          z: 0.78,
          duration: 1.6,
          ease: "power3.out"
        });
      } else if (targetState === 3) {
        // State 3: Main App revealed, smoothly fade out scene
        const mainApp = document.getElementById("mainAppContainer");
        if (mainApp) {
          mainApp.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }

  /* -------------------------------------------------------------
   * 7 MISSION LiFE COCKPIT CARDS LOGIC
   * ------------------------------------------------------------- */
  renderThemeCards() {
    const cardMount = document.getElementById("cockpitCardMount");
    const dotsMount = document.getElementById("cockpitDotsMount");
    if (!cardMount) return;

    cardMount.innerHTML = "";
    if (dotsMount) dotsMount.innerHTML = "";

    this.lifeThemes.forEach((theme, idx) => {
      // 3D Card
      const card = document.createElement("div");
      card.className = `cockpit-theme-card absolute inset-0 transition-all duration-500 transform ${
        idx === 0 ? "active-card opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
      }`;
      card.dataset.index = idx;

      card.innerHTML = `
        <div class="h-full w-full rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-slate-900/90 via-[#150a2e]/95 to-[#0b0518]/95 border border-purple-500/30 shadow-2xl backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
          <!-- Top Glow Accent -->
          <div class="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br ${theme.color} opacity-20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div>
            <!-- Header Tag & Number -->
            <div class="flex items-center justify-between mb-4">
              <span class="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${theme.badgeBg}">
                ${theme.tag}
              </span>
              <span class="text-xs font-mono font-bold text-slate-400">0${idx + 1} / 07</span>
            </div>

            <!-- Title & Icon -->
            <div class="flex items-center space-x-3 mb-2">
              <span class="text-3xl">${theme.icon}</span>
              <div>
                <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight">${theme.title}</h3>
                <p class="text-xs font-medium text-purple-300">${theme.subtitle}</p>
              </div>
            </div>

            <!-- Description -->
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3 mb-4">
              ${theme.description}
            </p>
          </div>

          <!-- Metrics Panel -->
          <div class="bg-black/40 rounded-xl p-3.5 border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Gujarat Impact:</span>
              <span class="font-bold text-emerald-400 font-mono">${theme.metric}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Statewide Goal:</span>
              <span class="font-bold text-cyan-300 font-mono">${theme.target}</span>
            </div>
            <div class="text-[11px] text-amber-300/90 pt-1 border-t border-white/5 flex items-center gap-1.5">
              <span>💡</span>
              <span>${theme.tip}</span>
            </div>
          </div>
        </div>
      `;
      cardMount.appendChild(card);

      // Pagination Dot
      if (dotsMount) {
        const dot = document.createElement("button");
        dot.className = `w-2.5 h-2.5 rounded-full transition-all duration-300 ${
          idx === 0 ? "w-8 bg-emerald-400" : "bg-slate-600 hover:bg-slate-400"
        }`;
        dot.dataset.index = idx;
        dot.addEventListener("click", () => this.setCardIndex(idx));
        dotsMount.appendChild(dot);
      }
    });
  }

  setCardIndex(index) {
    if (index < 0) index = this.totalCards - 1;
    if (index >= this.totalCards) index = 0;
    this.currentCardIndex = index;

    const cards = document.querySelectorAll(".cockpit-theme-card");
    cards.forEach((card, idx) => {
      if (idx === index) {
        card.classList.remove("opacity-0", "scale-95", "pointer-events-none");
        card.classList.add("active-card", "opacity-100", "scale-100", "pointer-events-auto");
      } else {
        card.classList.remove("active-card", "opacity-100", "scale-100", "pointer-events-auto");
        card.classList.add("opacity-0", "scale-95", "pointer-events-none");
      }
    });

    // Update dots
    const dotsMount = document.getElementById("cockpitDotsMount");
    if (dotsMount) {
      Array.from(dotsMount.children).forEach((dot, idx) => {
        if (idx === index) {
          dot.className = "w-8 h-2.5 rounded-full bg-emerald-400 transition-all duration-300";
        } else {
          dot.className = "w-2.5 h-2.5 rounded-full bg-slate-600 hover:bg-slate-400 transition-all duration-300";
        }
      });
    }

    // Update counter label
    const counter = document.getElementById("cockpitCardCounter");
    if (counter) counter.textContent = `Mission LiFE Priority 0${index + 1} of 07`;
  }

  nextCard() {
    this.setCardIndex(this.currentCardIndex + 1);
  }

  prevCard() {
    this.setCardIndex(this.currentCardIndex - 1);
  }

  /* -------------------------------------------------------------
   * EVENT LISTENERS & MOUSE PARALLAX
   * ------------------------------------------------------------- */
  setupEventListeners() {
    // Mouse Parallax for Cockpit Frame & Three.js camera
    window.addEventListener("mousemove", (e) => {
      this.targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;

      // Cockpit Viewport tilt (±5 degrees)
      const cockpitViewport = document.getElementById("cockpitViewport");
      if (cockpitViewport && this.currentState === 2) {
        const tiltX = -this.targetMouseY * 5;
        const tiltY = this.targetMouseX * 5;
        cockpitViewport.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }
    });

    // Keyboard Arrow navigation for Cockpit Cards
    window.addEventListener("keydown", (e) => {
      if (this.currentState === 2) {
        if (e.key === "ArrowRight") this.nextCard();
        if (e.key === "ArrowLeft") this.prevCard();
        if (e.key === "Escape") this.setState(3);
      }
    });

    // Button Triggers
    const btnBeginMission = document.getElementById("btnBeginMission");
    if (btnBeginMission) {
      btnBeginMission.addEventListener("click", () => this.setState(1));
    }

    const btnEnterCockpit = document.getElementById("btnEnterCockpit");
    if (btnEnterCockpit) {
      btnEnterCockpit.addEventListener("click", () => this.setState(2));
    }

    const btnBackToHero = document.getElementById("btnBackToHero");
    if (btnBackToHero) {
      btnBackToHero.addEventListener("click", () => this.setState(0));
    }

    const btnBackToOrbit = document.getElementById("btnBackToOrbit");
    if (btnBackToOrbit) {
      btnBackToOrbit.addEventListener("click", () => this.setState(1));
    }

    const btnNextCard = document.getElementById("btnNextCard");
    if (btnNextCard) {
      btnNextCard.addEventListener("click", () => this.nextCard());
    }

    const btnPrevCard = document.getElementById("btnPrevCard");
    if (btnPrevCard) {
      btnPrevCard.addEventListener("click", () => this.prevCard());
    }

    const btnDiscoverPlatform = document.getElementById("btnDiscoverPlatform");
    if (btnDiscoverPlatform) {
      btnDiscoverPlatform.addEventListener("click", () => this.setState(3));
    }

    const btnSkipToApp = document.getElementById("btnSkipToApp");
    if (btnSkipToApp) {
      btnSkipToApp.addEventListener("click", () => this.setState(3));
    }

    // Scroll resume trigger: if user scrolls back to the very top, resume render
    window.addEventListener("scroll", () => {
      if (window.scrollY < 120 && this.currentState === 3) {
        // User scrolled back to top
        this.resumeRenderLoop();
      } else if (window.scrollY > 300 && this.isRendering) {
        // User scrolled down into portal
        this.pauseRenderLoop();
      }
    }, { passive: true });
  }
}

// Global initialization
document.addEventListener("DOMContentLoaded", () => {
  window.cyeraFlow = new CyeraFlowController();
});
