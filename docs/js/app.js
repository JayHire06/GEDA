/**
 * src/js/app.js
 * GEDA Mission LiFE Citizen Portal — Peak-Shifting & Load Forecasting Controller
 */

let forecastChart = null;
let rawForecastData = null;

// Default fallback data for local file:// execution if fetch is blocked by browser CORS
const FALLBACK_FORECAST = {
  metadata: { dataset_total_hours: 34198, region: "Gandhinagar, Gujarat" },
  models_scorecard: {
    XGBoost_Regressor: { overall: { rmse: 0.4692, mae: 0.3245, mape: 41.77 } },
    Naive_24h_Persistence: { overall: { rmse: 0.7781, mae: 0.5208, mape: 66.02 } }
  },
  sample_forecast_72h: {
    timestamps: Array.from({ length: 72 }, (_, i) => `2026-10-10 ${String(i % 24).padStart(2, '0')}:00`),
    actual_demand_kwh: Array.from({ length: 72 }, (_, i) => {
      const h = i % 24;
      const isPeak = (h >= 18 && h <= 22);
      return Number((0.6 + (isPeak ? 1.4 : 0.3) + Math.sin(i * 0.25) * 0.2).toFixed(2));
    }),
    xgboost_kwh: Array.from({ length: 72 }, (_, i) => {
      const h = i % 24;
      const isPeak = (h >= 18 && h <= 22);
      return Number((0.65 + (isPeak ? 1.35 : 0.32) + Math.sin(i * 0.25) * 0.18).toFixed(2));
    }),
    naive_24h_kwh: Array.from({ length: 72 }, (_, i) => {
      const h = i % 24;
      const isPeak = (h >= 18 && h <= 22);
      return Number((0.7 + (isPeak ? 1.2 : 0.35) + Math.cos(i * 0.3) * 0.25).toFixed(2));
    }),
    is_peak_hours: Array.from({ length: 72 }, (_, i) => ((i % 24 >= 18 && i % 24 <= 22) ? 1 : 0)),
    solar_irradiance_wm2: Array.from({ length: 72 }, (_, i) => {
      const h = i % 24;
      return (h >= 6 && h <= 18) ? Math.round(Math.sin((h - 6) / 12 * Math.PI) * 950) : 0;
    })
  }
};

// Appliance electrical specifications
const APPLIANCE_DEFAULTS = {
  ac: { name: "Air Conditioner (1.5 Ton)", power_kw: 1.5, default_peak_hours: 3.0 },
  pump: { name: "Water Submersible Pump", power_kw: 1.0, default_peak_hours: 1.5 },
  ev: { name: "EV 2-Wheeler / 4-Wheeler Charger", power_kw: 3.3, default_peak_hours: 2.0 },
  washer: { name: "Washing Machine / Geyser", power_kw: 1.2, default_peak_hours: 1.0 }
};

const TARIFF_SAVING_PER_KWH = 2.10; // INR/kWh savings between Peak (Rs 6.20) and Solar Day (Rs 4.10)
const LIFE_POINTS_PER_KWH = 10;

document.addEventListener("DOMContentLoaded", () => {
  initApplianceSliders();
  loadForecastData();
});

async function loadForecastData() {
  try {
    const response = await fetch("data/forecast_data.json");
    if (!response.ok) throw new Error("Network response not ok");
    rawForecastData = await response.json();
  } catch (err) {
    console.warn("Using fallback forecast data (CORS or offline mode):", err);
    rawForecastData = FALLBACK_FORECAST;
  }

  renderForecastChart(rawForecastData.sample_forecast_72h);
  updateModelMetricsSummary(rawForecastData.models_scorecard);
}

function renderForecastChart(chartData) {
  const ctx = document.getElementById("forecastChart");
  if (!ctx) return;

  const labels = chartData.timestamps.map(ts => {
    const parts = ts.split(" ");
    return parts.length > 1 ? parts[1].slice(0, 5) : ts;
  });

  if (forecastChart) {
    forecastChart.destroy();
  }

  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Actual Household Demand (kWh)",
          data: chartData.actual_demand_kwh,
          borderColor: "#10b981", // Emerald
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 6,
          yAxisID: "y"
        },
        {
          label: "XGBoost 3.4 ML Forecast (kWh)",
          data: chartData.xgboost_kwh,
          borderColor: "#38bdf8", // Cyan
          borderWidth: 2,
          borderDash: [4, 4],
          tension: 0.3,
          fill: false,
          pointRadius: 1.5,
          pointHoverRadius: 6,
          yAxisID: "y"
        },
        {
          label: "Naive 24h Baseline (t-24)",
          data: chartData.naive_24h_kwh,
          borderColor: "#94a3b8", // Slate
          borderWidth: 1.5,
          tension: 0.2,
          borderDash: [2, 2],
          fill: false,
          pointRadius: 0,
          yAxisID: "y"
        },
        {
          label: "Solar Irradiance (W/m²)",
          data: chartData.solar_irradiance_wm2,
          borderColor: "rgba(245, 158, 11, 0.4)",
          backgroundColor: "rgba(245, 158, 11, 0.05)",
          borderWidth: 1,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#e2e8f0",
            font: { family: "Inter", size: 12 },
            boxWidth: 16
          }
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#38bdf8",
          bodyColor: "#f1f5f9",
          borderColor: "rgba(255, 255, 255, 0.15)",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            afterTitle: (context) => {
              const idx = context[0].dataIndex;
              const isPeak = chartData.is_peak_hours[idx] === 1;
              return isPeak ? "⚡ GUJARAT EVENING PEAK WINDOW (18:00 - 22:00 IST)" : "☀️ OFF-PEAK / SOLAR PERIOD";
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: {
            color: "#94a3b8",
            maxTicksLimit: 18,
            font: { family: "Inter", size: 11 }
          }
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: { display: true, text: "Hourly Consumption (kWh)", color: "#10b981", font: { size: 12 } },
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8" }
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: { display: true, text: "Solar Radiation (W/m²)", color: "#f59e0b", font: { size: 12 } },
          grid: { drawOnChartArea: false },
          ticks: { color: "#d97706" }
        }
      }
    }
  });
}

function updateModelMetricsSummary(scorecard) {
  const xgb = scorecard?.XGBoost_Regressor?.overall;
  const naive = scorecard?.Naive_24h_Persistence?.overall;
  if (!xgb || !naive) return;

  const rmseEl = document.getElementById("xgbRmseValue");
  const maeEl = document.getElementById("xgbMaeValue");
  const imprvEl = document.getElementById("xgbImprvValue");

  if (rmseEl) rmseEl.innerText = `${xgb.rmse.toFixed(3)} kWh`;
  if (maeEl) maeEl.innerText = `${xgb.mae.toFixed(3)} kWh`;
  if (imprvEl) {
    const imprv = ((naive.rmse - xgb.rmse) / naive.rmse) * 100;
    imprvEl.innerText = `+${imprv.toFixed(1)}%`;
  }
}

function initApplianceSliders() {
  const appliances = ["ac", "pump", "ev", "washer"];

  appliances.forEach(app => {
    const slider = document.getElementById(`slider_${app}`);
    if (slider) {
      slider.addEventListener("input", () => {
        const valSpan = document.getElementById(`val_${app}`);
        if (valSpan) valSpan.innerText = `${slider.value}%`;
        calculatePeakShiftingImpact();
      });
    }
  });

  calculatePeakShiftingImpact();
}

function calculatePeakShiftingImpact() {
  let dailyShiftedKwh = 0;

  for (const [key, spec] of Object.entries(APPLIANCE_DEFAULTS)) {
    const slider = document.getElementById(`slider_${key}`);
    const pct = slider ? Number(slider.value) / 100 : 0.2;
    const applianceDailyKwh = spec.power_kw * spec.default_peak_hours;
    dailyShiftedKwh += applianceDailyKwh * pct;
  }

  const annualShiftedKwh = dailyShiftedKwh * 365;
  const annualSavingsInr = annualShiftedKwh * TARIFF_SAVING_PER_KWH;
  const monthlySavingsInr = annualSavingsInr / 12;
  const lifePointsAnnual = Math.round(annualShiftedKwh * LIFE_POINTS_PER_KWH);
  const co2OffsetKg = Math.round(annualShiftedKwh * 0.716);

  // Update DOM readouts
  const dailyShiftEl = document.getElementById("dailyShiftedKwh");
  const annualShiftEl = document.getElementById("annualShiftedKwh");
  const monthlySaveEl = document.getElementById("monthlySavingsInr");
  const annualSaveEl = document.getElementById("annualSavingsInr");
  const lifePtsEl = document.getElementById("totalLifePoints");
  const co2El = document.getElementById("co2OffsetKg");
  const badgeEl = document.getElementById("lifeTierBadge");

  if (dailyShiftEl) dailyShiftEl.innerText = `${dailyShiftedKwh.toFixed(2)} kWh/day`;
  if (annualShiftEl) annualShiftEl.innerText = `${Math.round(annualShiftedKwh)} kWh/yr`;
  if (monthlySaveEl) monthlySaveEl.innerText = `₹${Math.round(monthlySavingsInr).toLocaleString("en-IN")}`;
  if (annualSaveEl) annualSaveEl.innerText = `₹${Math.round(annualSavingsInr).toLocaleString("en-IN")}`;
  if (lifePtsEl) lifePtsEl.innerText = lifePointsAnnual.toLocaleString("en-IN");
  if (co2El) co2El.innerText = `${co2OffsetKg.toLocaleString("en-IN")} kg/yr`;

  // Dynamic Gamification Tier Badge
  if (badgeEl) {
    if (lifePointsAnnual >= 10000) {
      badgeEl.innerText = "Platinum Net-Zero Pioneer";
      badgeEl.className = "px-3 py-1 text-xs font-semibold rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-500/40";
    } else if (lifePointsAnnual >= 6000) {
      badgeEl.innerText = "Gold Solar Champion";
      badgeEl.className = "px-3 py-1 text-xs font-semibold rounded-full bg-amber-900/60 text-amber-300 border border-amber-500/40";
    } else if (lifePointsAnnual >= 3000) {
      badgeEl.innerText = "Silver Energy Conserver";
      badgeEl.className = "px-3 py-1 text-xs font-semibold rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-500/40";
    } else {
      badgeEl.innerText = "Bronze LiFE Participant";
      badgeEl.className = "px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-600";
    }
  }
}
