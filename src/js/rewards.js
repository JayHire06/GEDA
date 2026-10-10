/**
 * src/js/rewards.js
 * GEDA Mission LiFE — Rewards Marketplace & Voucher Vault Controller
 */

const VOUCHER_CATALOG = [
  {
    id: "VOUCH-FOOD-01",
    brand: "La Pino'z Pizza",
    category: "Food",
    logoText: "🍕",
    title: "₹200 Off on Medium/Large Pizza",
    description: "Valid across all La Pino'z outlets in Gujarat (Ahmedabad, Gandhinagar, Surat, Rajkot, Vadodara).",
    costPoints: 1200,
    validDays: 60,
    colorScheme: "from-red-950/40 to-slate-900 border-red-500/30 text-red-400"
  },
  {
    id: "VOUCH-FOOD-02",
    brand: "Zomato",
    category: "Food",
    logoText: "🍔",
    title: "₹150 Food Delivery Voucher",
    description: "Instant discount on orders above ₹399 on Zomato app in Gujarat.",
    costPoints: 950,
    validDays: 45,
    colorScheme: "from-rose-950/40 to-slate-900 border-rose-500/30 text-rose-400"
  },
  {
    id: "VOUCH-FOOD-03",
    brand: "Swiggy Gourmet",
    category: "Food",
    logoText: "🥗",
    title: "₹250 Gourmet Dining Discount",
    description: "Redeemable on healthy organic meals and cloud kitchen partners.",
    costPoints: 1500,
    validDays: 60,
    colorScheme: "from-orange-950/40 to-slate-900 border-orange-500/30 text-orange-400"
  },
  {
    id: "VOUCH-SHOP-01",
    brand: "Lifestyle Stores",
    category: "Shopping",
    logoText: "🛍️",
    title: "₹500 Sustainable Fashion Gift Card",
    description: "Valid on organic cotton, khadi, and sustainable apparel at Lifestyle Gujarat.",
    costPoints: 3000,
    validDays: 90,
    colorScheme: "from-purple-950/40 to-slate-900 border-purple-500/30 text-purple-400"
  },
  {
    id: "VOUCH-SHOP-02",
    brand: "Reliance Digital",
    category: "Shopping",
    logoText: "⚡",
    title: "₹1,000 Energy-Star Tech Voucher",
    description: "Instant discount on 5-Star BEE inverter ACs, solar inverters, or BLDC fans.",
    costPoints: 5500,
    validDays: 90,
    colorScheme: "from-blue-950/40 to-slate-900 border-blue-500/30 text-blue-400"
  },
  {
    id: "VOUCH-UTIL-01",
    brand: "Gujarat DISCOM Rebate",
    category: "Utilities",
    logoText: "💡",
    title: "₹250 Direct Electricity Bill Rebate",
    description: "Credited automatically to your next UGVCL, DGVCL, MGVCL, or PGVCL monthly bill.",
    costPoints: 1800,
    validDays: 30,
    colorScheme: "from-emerald-950/40 to-slate-900 border-emerald-500/30 text-emerald-400"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  renderVoucherMarketplace();
  renderRewardsVault();

  // Listen to profile updates
  if (window.gedaAuthDB) {
    window.gedaAuthDB.onProfileChange(profile => {
      updateMarketplaceBalances(profile);
      renderRewardsVault(profile);
    });
  }
});

function renderVoucherMarketplace() {
  const container = document.getElementById("vouchersMarketplaceGrid");
  if (!container) return;

  const profile = window.gedaAuthDB ? window.gedaAuthDB.getProfile() : { lifePoints: 7470 };

  container.innerHTML = VOUCHER_CATALOG.map(v => {
    const canAfford = (profile.lifePoints || 0) >= v.costPoints;
    return `
      <div class="glass-card p-5 rounded-2xl border ${v.colorScheme} flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
              <span>${v.logoText}</span>
              <span>${v.brand}</span>
            </span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ★ ${v.costPoints.toLocaleString("en-IN")} pts
            </span>
          </div>

          <h4 class="text-base font-bold text-white mb-1.5 leading-snug">${v.title}</h4>
          <p class="text-xs text-slate-400 leading-relaxed mb-4">${v.description}</p>
        </div>

        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span class="text-[11px] text-slate-500">Validity: ${v.validDays} Days</span>
          <button 
            onclick="redeemVoucher('${v.id}')" 
            class="px-3.5 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
              canAfford 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }"
            ${!canAfford ? 'disabled' : ''}
          >
            <span>${canAfford ? 'Redeem Voucher' : 'Need More Points'}</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function updateMarketplaceBalances(profile) {
  renderVoucherMarketplace();
}

function redeemVoucher(voucherId) {
  const voucher = VOUCHER_CATALOG.find(v => v.id === voucherId);
  if (!voucher || !window.gedaAuthDB) return;

  const profile = window.gedaAuthDB.getProfile();
  if (profile.lifePoints < voucher.costPoints) {
    alert(`Insufficient LiFE Points. You have ${profile.lifePoints.toLocaleString("en-IN")} pts, but this voucher requires ${voucher.costPoints.toLocaleString("en-IN")} pts.`);
    return;
  }

  const confirmed = confirm(`Redeem ${voucher.brand} "${voucher.title}" for ${voucher.costPoints.toLocaleString("en-IN")} LiFE Points?`);
  if (!confirmed) return;

  const success = window.gedaAuthDB.deductPoints(voucher.costPoints);
  if (!success) return;

  // Generate unique coupon code
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  const codePrefix = voucher.brand.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "GUJ");
  const uniqueCode = `GUJ-${codePrefix}-${randomChars}`;

  const expDate = new Date();
  expDate.setDate(expDate.getDate() + voucher.validDays);
  const expStr = expDate.toISOString().split("T")[0];

  const newCoupon = {
    id: `CPN-${Date.now()}`,
    brand: voucher.brand,
    title: voucher.title,
    code: uniqueCode,
    category: voucher.category,
    redeemedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    expiresAt: expStr
  };

  window.gedaAuthDB.addCoupon(newCoupon);

  // Show celebratory alert
  showRedemptionCelebrationModal(newCoupon, voucher);
}

function renderRewardsVault(profile) {
  const container = document.getElementById("myRewardsVaultContainer");
  const countEl = document.getElementById("vaultCountBadge");
  if (!container) return;

  const currentProfile = profile || (window.gedaAuthDB ? window.gedaAuthDB.getProfile() : {});
  const coupons = currentProfile.vaultCoupons || [];

  if (countEl) countEl.innerText = `${coupons.length} Active`;

  if (coupons.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-xs col-span-full">
        Your Rewards Vault is empty. Shift peak loads or calculate solar to earn points and claim brand vouchers above!
      </div>
    `;
    return;
  }

  container.innerHTML = coupons.map(c => `
    <div class="bg-gradient-to-r from-slate-900 to-[#120a24] p-4 rounded-2xl border border-slate-700/80 flex flex-col justify-between shadow-lg">
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-amber-400">${c.brand}</span>
          <span class="text-[10px] text-slate-500">Expires: ${c.expiresAt}</span>
        </div>
        <h5 class="text-sm font-semibold text-white mb-2">${c.title}</h5>
        
        <div class="bg-slate-950/80 p-2.5 rounded-xl border border-dashed border-emerald-500/40 flex items-center justify-between my-2">
          <span class="font-mono text-xs font-bold text-emerald-400 tracking-wider">${c.code}</span>
          <button onclick="copyToClipboard('${c.code}', this)" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition">
            Copy Code
          </button>
        </div>
      </div>
      <div class="text-[10px] text-slate-500 mt-2">
        Redeemed on ${c.redeemedAt}
      </div>
    </div>
  `).join("");
}

function showRedemptionCelebrationModal(coupon, voucher) {
  const modalHtml = `
    <div id="celebrationModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div class="glass-panel p-6 rounded-3xl border border-emerald-500/40 max-w-md w-full text-center space-y-4">
        <div class="text-4xl animate-bounce">🎉</div>
        <h3 class="text-xl font-black text-white">Voucher Successfully Redeemed!</h3>
        <p class="text-xs text-slate-300">
          You claimed <strong>${coupon.brand} — ${coupon.title}</strong> using verified Mission LiFE points.
        </p>

        <div class="bg-slate-950 p-4 rounded-2xl border border-dashed border-emerald-500/50 my-3">
          <div class="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Your Unique Voucher Code</div>
          <div class="font-mono text-lg font-black text-emerald-400 tracking-widest">${coupon.code}</div>
          <div class="text-[10px] text-slate-400 mt-1">Valid until ${coupon.expiresAt}</div>
        </div>

        <button onclick="document.getElementById('celebrationModal').remove()" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition">
          View in My Rewards Vault
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerText;
    btn.innerText = "Copied!";
    btn.className = "text-[10px] bg-emerald-600 text-white px-2 py-1 rounded transition";
    setTimeout(() => {
      btn.innerText = orig;
      btn.className = "text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition";
    }, 2000);
  });
}
