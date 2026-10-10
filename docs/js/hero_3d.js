/**
 * src/js/hero_3d.js
 * Cyera-Style 3D Energy Node WebGL Canvas & GSAP ScrollTrigger Motion Engine
 */

let scene, camera, renderer;
let energySphere, energyRing, particlesMesh;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;

document.addEventListener("DOMContentLoaded", () => {
  initLenisSmoothScroll();
  initThreeJsCanvas();
  initScrollTriggerAnimations();
  setupMouseParallax();
});

function initLenisSmoothScroll() {
  if (typeof Lenis !== "undefined") {
    try {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        smoothTouch: false
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      // Sync Lenis with GSAP ScrollTrigger if both exist
      if (typeof ScrollTrigger !== "undefined") {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      }
      console.log("[Lenis] Smooth scroll initialized.");
    } catch (e) {
      console.warn("Lenis init fallback:", e);
    }
  }
}

function initThreeJsCanvas() {
  const canvas = document.getElementById("bg3dCanvas");
  if (!canvas || typeof THREE === "undefined") {
    console.warn("Three.js not loaded or canvas missing.");
    return;
  }

  // Scene & Camera
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080512, 0.0012);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 28;

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 1. Central Wireframe Energy Node (Earth / Power Grid Matrix)
  const sphereGeo = new THREE.IcosahedronGeometry(7, 3);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x10b981, // Emerald Green
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  energySphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(energySphere);

  // 2. Outer Orbital Ring (Solar / LiFE Orbital)
  const ringGeo = new THREE.TorusGeometry(10.5, 0.12, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7, // Royal Purple / Violet
    wireframe: true,
    transparent: true,
    opacity: 0.4
  });
  energyRing = new THREE.Mesh(ringGeo, ringMat);
  energyRing.rotation.x = Math.PI / 3;
  scene.add(energyRing);

  // 3. Floating 3D Star / Clean Energy Particles Field (1,200 nodes)
  const particleCount = 1200;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const colorEmerald = new THREE.Color(0x10b981);
  const colorCyan = new THREE.Color(0x38bdf8);
  const colorPurple = new THREE.Color(0xc084fc);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 120;
    positions[i3 + 1] = (Math.random() - 0.5) * 120;
    positions[i3 + 2] = (Math.random() - 0.5) * 120;

    const chosenColor = (i % 3 === 0) ? colorEmerald : (i % 3 === 1 ? colorCyan : colorPurple);
    colors[i3] = chosenColor.r;
    colors[i3 + 1] = chosenColor.g;
    colors[i3 + 2] = chosenColor.b;
  }

  const particlesGeo = new THREE.BufferGeometry();
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particlesMat = new THREE.PointsMaterial({
    size: 0.45,
    vertexColors: true,
    transparent: true,
    opacity: 0.65
  });

  particlesMesh = new THREE.Points(particlesGeo, particlesMat);
  scene.add(particlesMesh);

  // Responsive Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Render loop
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.0006;

  // Continuous auto-rotation
  if (energySphere) {
    energySphere.rotation.y += 0.002;
    energySphere.rotation.x = Math.sin(time * 0.5) * 0.15;
  }
  if (energyRing) {
    energyRing.rotation.z += 0.003;
    energyRing.rotation.y += 0.0015;
  }
  if (particlesMesh) {
    particlesMesh.rotation.y = time * 0.02;
  }

  // Smooth mouse parallax lerp
  targetX += (mouseX - targetX) * 0.05;
  targetY += (mouseY - targetY) * 0.05;

  if (scene) {
    scene.rotation.y = targetX * 0.35;
    scene.rotation.x = targetY * 0.25;
  }

  renderer.render(scene, camera);
}

function setupMouseParallax() {
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
  });
}

function initScrollTriggerAnimations() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("GSAP or ScrollTrigger not available.");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Link 3D Sphere positioning & scaling directly to scroll position
  if (energySphere && energyRing) {
    // Hero to Section 1 (Smart Tracker)
    gsap.timeline({
      scrollTrigger: {
        trigger: "#tracker",
        start: "top bottom",
        end: "bottom top",
        scrub: 1
      }
    })
    .to(energySphere.position, { x: 12, y: -2, z: 5, ease: "none" })
    .to(energyRing.rotation, { x: Math.PI / 1.5, ease: "none" }, 0)
    .to(energySphere.scale, { x: 1.15, y: 1.15, z: 1.15, ease: "none" }, 0);

    // Section 1 to 7 LiFE Themes Section
    gsap.timeline({
      scrollTrigger: {
        trigger: "#lifeThemesSection",
        start: "top bottom",
        end: "bottom top",
        scrub: 1
      }
    })
    .to(energySphere.position, { x: -10, y: 3, z: 8, ease: "none" })
    .to(energySphere.scale, { x: 1.35, y: 1.35, z: 1.35, ease: "none" }, 0)
    .to(energySphere.material, { opacity: 0.55 }, 0);

    // Section to Solar ROI Calculator
    gsap.timeline({
      scrollTrigger: {
        trigger: "#solar",
        start: "top bottom",
        end: "bottom top",
        scrub: 1
      }
    })
    .to(energySphere.position, { x: 14, y: -4, z: 2, ease: "none" })
    .to(energySphere.scale, { x: 0.95, y: 0.95, z: 0.95, ease: "none" }, 0);

    // Fade-in stagger for 7 LiFE theme cards
    gsap.from(".life-theme-card", {
      scrollTrigger: {
        trigger: "#lifeThemesSection",
        start: "top 75%",
        toggleActions: "play none none reverse"
      },
      y: 40,
      opacity: 0,
      stagger: 0.12,
      duration: 0.8,
      ease: "power2.out"
    });
  }
}
