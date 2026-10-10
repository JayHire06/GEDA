/**
 * src/js/calculator.js
 * GEDA Mission LiFE Rooftop Solar Yield & ROI Interactive Calculator
 */

let solarData = null;

// Fallback solar data if opened directly without a web server
const FALLBACK_SOLAR = {
  metadata: {
    benchmark_cost_per_kw_inr: 52000,
    tariff_rate_inr_per_kwh: 6.10,
    subsidy_scheme: "PM Surya Ghar: Muft Bijli Yojana & GEDA Integration"
  },
  district_solar_data: {
    "Gandhinagar": { specific_yield_kwh_kwp: 1540, daily_psh: 5.55 },
    "Ahmedabad": { specific_yield_kwh_kwp: 1520, daily_psh: 5.48 },
    "Surat": { specific_yield_kwh_kwp: 1460, daily_psh: 5.26 },
    "Vadodara": { specific_yield_kwh_kwp: 1490, daily_psh: 5.37 },
    "Rajkot": { specific_yield_kwh_kwp: 1595, daily_psh: 5.75 }
  },
  approved_vendors: [
    { name: "Gujarat Surya Urja Solutions", district: "Gandhinagar", rating: 4.9, installations_count: 4820, contact_phone: "+91 79 2328 7100" },
    { name: "Sabarmati Solar Power Infra", district: "Ahmedabad", rating: 4.8, installations_count: 9250, contact_phone: "+91 79 2685 4400" },
    { name: "Tapi Green Energy Ventures", district: "Surat", rating: 4.8, installations_count: 6410, contact_phone: "+91 261 245 8820" },
    { name: "Sayaji CleanTech & Renewables", district: "Vadodara", rating: 4.7, installations_count: 5120, contact_phone: "+91 265 233 1900" },
    { name: "Saurashtra Surya Power Systems", district: "Rajkot", rating: 4.9, installations_count: 5890, contact_phone: "+91 281 257 6630" }
  ]
};

document.addEventListener("DOMContentLoaded", () => {
  initSolarCalculator();
});

async function initSolarCalculator() {
  try {
    const res = await fetch("data/solar_calculator_data.json");
    if (!res.ok) throw new Error("Network error loading solar data");
    solarData = await res.json();
  } catch (err) {
    console.warn("Using fallback solar data (CORS or offline mode):", err);
    solarData = FALLBACK_SOLAR;
  }

  setupEventListeners();
  recalculateSolarROI();
}

function setupEventListeners() {
  const districtSelect = document.getElementById("solarDistrictSelect");
  const monthlyBillInput = document.getElementById("monthlyBillInput");
  const systemSizeSlider = document.getElementById("systemSizeSlider");
  const roofAreaInput = document.getElementById("roofAreaInput");

  if (districtSelect) districtSelect.addEventListener("change", () => {
    updateDistrictVendorDirectory();
    recalculateSolarROI();
  });

  if (systemSizeSlider) systemSizeSlider.addEventListener("input", (e) => {
    const val = document.getElementById("systemSizeVal");
    if (val) val.innerText = `${Number(e.target.value).toFixed(1)} kW`;
    recalculateSolarROI();
  });

  if (monthlyBillInput) monthlyBillInput.addEventListener("input", () => {
    const bill = Number(monthlyBillInput.value);
    if (bill > 0) {
      // Auto-suggest optimal system size: monthly units approx bill / 6.10, kW approx monthly units / 120
      const estUnits = bill / 6.10;
      const recKw = Math.min(10, Math.max(1, Math.round((estUnits / 120) * 2) / 2));
      if (systemSizeSlider) {
        systemSizeSlider.value = recKw;
        const val = document.getElementById("systemSizeVal");
        if (val) val.innerText = `${recKw.toFixed(1)} kW`;
      }
    }
    recalculateSolarROI();
  });

  if (roofAreaInput) roofAreaInput.addEventListener("input", () => {
    const sqft = Number(roofAreaInput.value);
    if (sqft > 0) {
      // 100 sq ft per 1 kW
      const maxKw = Math.min(10, Math.max(1, Math.floor(sqft / 100)));
      if (systemSizeSlider && maxKw >= 1) {
        systemSizeSlider.value = maxKw;
        const val = document.getElementById("systemSizeVal");
        if (val) val.innerText = `${maxKw.toFixed(1)} kW`;
      }
    }
    recalculateSolarROI();
  });

  updateDistrictVendorDirectory();
}

function calculateSubsidy(kw) {
  if (kw <= 1.0) return 30000.0 * kw;
  if (kw <= 2.0) return 60000.0;
  return 78000.0; // Capped at Rs 78,000 for 3 kW and above
}

function recalculateSolarROI() {
  const districtSelect = document.getElementById("solarDistrictSelect");
  const districtName = districtSelect ? districtSelect.value : "Gandhinagar";
  
  const slider = document.getElementById("systemSizeSlider");
  const capacityKw = slider ? Number(slider.value) : 3.0;

  const districtConfig = solarData?.district_solar_data?.[districtName] || { specific_yield_kwh_kwp: 1540 };
  const specificYield = districtConfig.specific_yield_kwh_kwp;

  const benchmarkCostPerKw = solarData?.metadata?.benchmark_cost_per_kw_inr || 52000;
  const tariffRate = solarData?.metadata?.tariff_rate_inr_per_kwh || 6.10;

  // Engineering calculations
  const annualGenKwh = capacityKw * specificYield;
  const monthlyGenKwh = annualGenKwh / 12;
  const grossCapex = capacityKw * benchmarkCostPerKw;
  const subsidy = calculateSubsidy(capacityKw);
  const netCapex = Math.max(0, grossCapex - subsidy);
  const annualSavings = annualGenKwh * tariffRate;
  const monthlySavings = annualSavings / 12;
  const paybackYears = annualSavings > 0 ? (netCapex / annualSavings).toFixed(1) : 0;
  const lifecycle25yrSavings = (annualSavings * 25 * 0.90) - netCapex;
  const annualCo2Kg = Math.round(annualGenKwh * 0.716);
  const lifePoints = Math.round(annualGenKwh * 2);
  const roofReqSqft = Math.round(capacityKw * 100);

  // Update DOM elements
  setText("calcCapKw", `${capacityKw.toFixed(1)} kW`);
  setText("calcGrossCapex", `₹${Math.round(grossCapex).toLocaleString("en-IN")}`);
  setText("calcSubsidy", `₹${Math.round(subsidy).toLocaleString("en-IN")}`);
  setText("calcNetCapex", `₹${Math.round(netCapex).toLocaleString("en-IN")}`);
  setText("calcAnnualGen", `${Math.round(annualGenKwh).toLocaleString("en-IN")} kWh`);
  setText("calcMonthlyGen", `${Math.round(monthlyGenKwh).toLocaleString("en-IN")} kWh`);
  setText("calcAnnualSavings", `₹${Math.round(annualSavings).toLocaleString("en-IN")}`);
  setText("calcMonthlySavings", `₹${Math.round(monthlySavings).toLocaleString("en-IN")}`);
  setText("calcPaybackYears", `${paybackYears} Years`);
  setText("calcLifecycleSavings", `₹${Math.round(lifecycle25yrSavings).toLocaleString("en-IN")}`);
  setText("calcCo2Offset", `${annualCo2Kg.toLocaleString("en-IN")} kg/yr`);
  setText("calcLifePoints", lifePoints.toLocaleString("en-IN"));
  setText("calcRoofArea", `${roofReqSqft} sq.ft (${Math.round(capacityKw * 10)} m²)`);

  // Update Payback progress bar (scale 0-5 years)
  const pbProgress = document.getElementById("paybackProgressBar");
  if (pbProgress) {
    const pct = Math.min(100, Math.max(10, (paybackYears / 5) * 100));
    pbProgress.style.width = `${pct}%`;
  }
}

function updateDistrictVendorDirectory() {
  const districtSelect = document.getElementById("solarDistrictSelect");
  const selectedDistrict = districtSelect ? districtSelect.value : "Gandhinagar";
  const vendorContainer = document.getElementById("vendorListContainer");
  if (!vendorContainer) return;

  const vendors = solarData?.approved_vendors || [];
  // Prioritize vendors in the selected district, followed by others
  const sorted = [...vendors].sort((a, b) => {
    if (a.district === selectedDistrict) return -1;
    if (b.district === selectedDistrict) return 1;
    return b.rating - a.rating;
  });

  vendorContainer.innerHTML = sorted.map(v => {
    const isLocal = v.district === selectedDistrict;
    return `
      <div class="glass-card p-4 rounded-xl border ${isLocal ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800'} flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${isLocal ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}">
              ${v.district} ${isLocal ? '• Local Certified' : ''}
            </span>
            <div class="flex items-center text-amber-400 text-xs font-bold">
              ★ ${v.rating}
            </div>
          </div>
          <h4 class="text-sm font-bold text-white mb-1">${v.name}</h4>
          <p class="text-xs text-slate-400 mb-2">${v.installations_count?.toLocaleString("en-IN") || '4,000+'} installations in Gujarat</p>
        </div>
        <div class="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between">
          <span class="text-xs text-slate-300 font-mono">${v.contact_phone}</span>
          <button onclick="alert('Contacting GEDA approved vendor: ${v.name}\\nHelpline: ${v.contact_phone}')" class="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition">
            Book Inspection
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}
