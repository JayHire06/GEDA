# Directive: 05_enterprise_redesign.md — Enterprise Upgrades, Cinematic Onboarding, Database & Rewards

## Objective
Elevate the **GEDA Mission LiFE Platform** to an enterprise-grade, highly engaging web application featuring:
1. **Authentic Gujarat State & National LiFE Identity:** Official GEDA logo, Gujarat Climate Change Department emblem, and Mission LiFE badge integrated into header, footer, and admin portals with DISCOM selection (UGVCL, DGVCL, MGVCL, PGVCL, Torrent Power).
2. **Cinematic 3D Onboarding ("Begin Your Mission"):** A Cyera-inspired full-screen interactive overlay with dark space-eco gradients (`#120826`, `#2B1055`), glowing canvas particle fields, and an interactive journey through the **7 Core Themes of Mission LiFE**.
3. **Scroll-Driven 3D Canvas Engine (`src/js/hero_3d.js`):** A persistent WebGL Three.js canvas rendering a wireframe energy node/planet, paired with Lenis smooth scrolling and GSAP ScrollTrigger to rotate and scale the 3D element across the 7 LiFE theme cards.
4. **Persistent Profile & Database Layer (`src/js/auth_db.js`):** Synchronizes user authentication, consumer number, selected DISCOM, appliance schedules, and LiFE Points using Firebase Realtime Database with an automated structured LocalStorage fallback for zero-setup offline operation.
5. **Mission LiFE Rewards Marketplace (`src/js/rewards.js`):** Interactive redemption hub with real brand vouchers (La Pino'z Pizza, Zomato, Swiggy, Lifestyle, Reliance Digital, and DISCOM Bill Rebates), real-time point deduction, unique coupon code generation, and "My Rewards Vault".

---

## 1. Brand Assets & Visual System
- `src/assets/geda_logo.jpg`: Gujarat Energy Development Agency official emblem.
- `src/assets/climate_bg.jpg`: Gujarat Climate Change Department branding.
- `src/assets/life_logo.png`: Government of India Mission LiFE national logo.
- Color Tokens:
  - Space Eco Dark: `#0B0819` to `#160B2E`
  - Emerald Energy: `#10B981` / `#059669`
  - Solar Amber: `#F59E0B` / `#FBBF24`
  - Cyber Cyan: `#06B6D4` / `#38BDF8`
  - Royal Violet: `#7C3AED` / `#A855F7`

---

## 2. The 7 Core Themes of Mission LiFE
1. **Save Energy:** Grid peak shifting (18:00–22:00 IST), LED adoption, and rooftop solar integration.
2. **Save Water:** Efficient micro-irrigation, solar water pumps, and wastewater recycling.
3. **Say No to Single-Use Plastics:** Cloth/jute alternatives, zero-waste lifestyle, eco packaging.
4. **Adopt Sustainable Food Systems:** Organic millets promotion, indigenous crops, reduced food wastage.
5. **Reduce Waste (Circular Economy):** Segregation at source, wet waste composting, repair over replace.
6. **Adopt Healthy Lifestyles:** Non-motorized transport (bicycles), EV adoption, carbon-neutral habits.
7. **Reduce E-Waste:** Responsible solar panel PV recycling, certified electronic scrappage centers.

---

## 3. Persistent Database & Authentication Protocol (`src/js/auth_db.js`)
- Stores user profile object:
  ```json
  {
    "userId": "user_guj_1024",
    "name": "Hardik Patel",
    "consumerNumber": "01234/56789/0",
    "discom": "UGVCL (Uttar Gujarat Vij Company)",
    "district": "Gandhinagar",
    "lifePoints": 7470,
    "applianceSchedule": { "ac": 25, "pump": 40, "ev": 30, "washer": 50 },
    "vaultCoupons": []
  }
  ```
- Dual-mode storage:
  - Online: Firebase REST/SDK integration.
  - Offline/Default: Structured `localStorage` key `geda_life_profile_v2` with state listeners that update all UI badges, header counters, and slider values immediately.

---

## 4. Rewards Marketplace Protocol (`src/js/rewards.js`)
- **Brand Vouchers:**
  - *Food:* La Pino'z Pizza (₹200 Off / 1,200 pts), Zomato (₹150 Voucher / 950 pts), Swiggy Gourmet (₹250 Voucher / 1,500 pts)
  - *Shopping:* Lifestyle Stores (₹500 Gift Card / 3,000 pts), Reliance Digital (₹1,000 Tech Voucher / 5,500 pts)
  - *Utilities:* Gujarat DISCOM Electricity Bill Rebate (₹250 Direct Credit / 1,800 pts)
- **Redemption Transaction Logic:**
  1. Validate `user.lifePoints >= voucher.costPoints`.
  2. Deduct points atomically via `auth_db.deductPoints()`.
  3. Generate cryptographic 8-character voucher code (e.g. `GUJ-LPZ-8F29A`).
  4. Append to `user.vaultCoupons` with timestamp and expiry.
  5. Trigger celebratory modal and update DOM balances.

---

## 5. 3D Canvas & Scroll-Trigger Motion Engine (`src/js/hero_3d.js`)
- Full-screen WebGL Three.js background canvas `#bg3dCanvas`.
- Wireframe icosahedron/sphere representing the Gujarat Clean Energy Grid surrounded by 1,200 floating star/energy particles.
- Lenis smooth scroll inertia controller.
- GSAP ScrollTrigger timelines translating `mesh.position`, `mesh.rotation`, and `mesh.scale` across the 7 LiFE theme cards.
- Cursor mouse-parallax tilt listener.
