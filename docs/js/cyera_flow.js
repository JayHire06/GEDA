/**
 * src/js/cyera_flow.js
 * Zero-Lag Flow AI Video State Machine Engine & 7 LiFE Cockpit Viewport
 * Powered by Hardware-Accelerated Video Decoding & GSAP Transitions
 */

class CyeraFlowController {
  constructor() {
    this.currentState = 0; // 0: Hero, 1: Orbital Shift, 2: Cockpit, 3: Main App
    this.currentCardIndex = 0;
    this.totalCards = 7;
    this.isTransitioning = false;

    // Video assets mapped to states
    this.stateVideos = {
      0: "assets/earth_hero_loop.mp4",
      1: "assets/earth_orbital_shift.mp4",
      2: "assets/cockpit_view.mp4"
    };

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
    this.videoElement = document.getElementById("cyeraBgVideo");
    this.renderThemeCards();
    this.setupEventListeners();
    this.setupMouseParallax();
    this.setState(0, true);
  }

  /* -------------------------------------------------------------
   * 4-STATE MACHINE TRANSITIONS & VIDEO CONTROLLER
   * ------------------------------------------------------------- */
  setState(targetState, force = false) {
    if (this.currentState === targetState && !force) return;
    this.currentState = targetState;
    console.log(`[CyeraFlow] Setting State: ${targetState}`);

    const container = document.getElementById("cyeraExperience");
    if (!container) return;

    // Update state classes
    container.classList.remove("state-0", "state-1", "state-2", "state-3");
    container.classList.add(`state-${targetState}`);

    // Update body scroll lock
    if (targetState === 3) {
      document.body.classList.remove("overflow-hidden");
      this.pauseVideo();
      const mainApp = document.getElementById("mainAppContainer");
      if (mainApp) {
        mainApp.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      document.body.classList.add("overflow-hidden");
      this.switchVideoForState(targetState);
    }
  }

  switchVideoForState(state) {
    if (!this.videoElement) return;

    const nextSrc = this.stateVideos[state];
    if (!nextSrc) return;

    // Check if current video source is already this target
    const currentSrcAttr = this.videoElement.getAttribute("src") || "";
    if (currentSrcAttr.endsWith(nextSrc)) {
      this.videoElement.play().catch(() => {});
      return;
    }

    // Smooth opacity cross-fade
    this.videoElement.style.opacity = "0.2";
    setTimeout(() => {
      this.videoElement.src = nextSrc;
      this.videoElement.load();
      const playPromise = this.videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[CyeraFlow] Video autoplay prevented or paused:", err);
        });
      }
      this.videoElement.style.opacity = "1";
    }, 250);
  }

  pauseVideo() {
    if (this.videoElement && !this.videoElement.paused) {
      this.videoElement.pause();
      console.log("[CyeraFlow] Video paused for zero background CPU overhead.");
    }
  }

  resumeVideo() {
    if (this.videoElement && this.videoElement.paused && this.currentState !== 3) {
      this.videoElement.play().catch(() => {});
    }
  }

  /* -------------------------------------------------------------
   * 7 MISSION LiFE COCKPIT CARDS
   * ------------------------------------------------------------- */
  renderThemeCards() {
    const cardMount = document.getElementById("cockpitCardMount");
    const dotsMount = document.getElementById("cockpitDotsMount");
    if (!cardMount) return;

    cardMount.innerHTML = "";
    if (dotsMount) dotsMount.innerHTML = "";

    this.lifeThemes.forEach((theme, idx) => {
      // Frosted Glass Card
      const card = document.createElement("div");
      card.className = `cockpit-theme-card absolute inset-0 transition-all duration-500 transform ${
        idx === 0 ? "active-card opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
      }`;
      card.dataset.index = idx;

      card.innerHTML = `
        <div class="h-full w-full rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-slate-900/85 via-[#150a2e]/90 to-[#0b0518]/95 border border-purple-500/30 shadow-2xl backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
          <!-- Top Accent Light -->
          <div class="absolute -top-12 -right-12 w-44 h-44 bg-gradient-to-br ${theme.color} opacity-25 rounded-full blur-2xl pointer-events-none"></div>
          
          <div>
            <!-- Header Tag & Step -->
            <div class="flex items-center justify-between mb-4">
              <span class="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${theme.badgeBg}">
                ${theme.tag}
              </span>
              <span class="text-xs font-mono font-bold text-slate-400">0${idx + 1} / 07</span>
            </div>

            <!-- Title & Icon -->
            <div class="flex items-center space-x-3.5 mb-2">
              <span class="text-3xl sm:text-4xl filter drop-shadow">${theme.icon}</span>
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

          <!-- Impact Metrics Panel -->
          <div class="bg-black/45 rounded-xl p-3.5 border border-white/10 space-y-2 backdrop-blur-md">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Gujarat Impact:</span>
              <span class="font-bold text-emerald-400 font-mono">${theme.metric}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Statewide Target:</span>
              <span class="font-bold text-cyan-300 font-mono">${theme.target}</span>
            </div>
            <div class="text-[11px] text-amber-300/95 pt-1 border-t border-white/5 flex items-center gap-1.5">
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
   * MOUSE PARALLAX & EVENT LISTENERS
   * ------------------------------------------------------------- */
  setupMouseParallax() {
    window.addEventListener("mousemove", (e) => {
      const cockpitViewport = document.getElementById("cockpitViewport");
      if (!cockpitViewport || this.currentState !== 2) return;

      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;

      const tiltX = -normY * 5;
      const tiltY = normX * 5;
      cockpitViewport.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });
  }

  setupEventListeners() {
    // Keyboard Navigation
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

    // Scroll resume trigger: resume video when scrolling back to the very top
    window.addEventListener("scroll", () => {
      if (window.scrollY < 80 && this.currentState === 3) {
        this.resumeVideo();
      } else if (window.scrollY > 200 && this.currentState === 3) {
        this.pauseVideo();
      }
    }, { passive: true });
  }
}

// Global initialization
document.addEventListener("DOMContentLoaded", () => {
  window.cyeraFlow = new CyeraFlowController();
});
