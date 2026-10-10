/**
 * src/js/admin.js
 * GEDA Administrative Control Panel — District Macro Transition Controller
 */

let districtData = null;
let districtProgressChart = null;
let seasonalityChart = null;

// Fallback data if running locally via file:// without web server
const FALLBACK_DISTRICTS = {
  statewide_summary: {
    total_districts_monitored: 5,
    total_installed_solar_mw: 765.5,
    total_target_solar_mw: 1015.0,
    state_achievement_pct: 75.4,
    total_registered_prosumers: 215040,
    annual_generation_gwh: 1158.44,
    annual_co2_abated_tonnes: 829440,
    total_peak_shaving_potential_mw: 168.4,
    statewide_life_points_issued: 2316880000
  },
  districts: [
    { sustainability_rank: 1, district: "Rajkot", region_type: "Saurashtra Arid Hub", installed_mw: 128.5, target_mw: 160.0, achievement_pct: 80.3, active_prosumers: 36800, peak_shaving_capacity_mw: 28.3, annual_co2_mitigation_tonnes: 146750, annual_financial_savings_crores_inr: 125.02, total_life_points: 409918000 },
    { sustainability_rank: 2, district: "Ahmedabad", region_type: "Metropolitan Megacity", installed_mw: 245.8, target_mw: 320.0, achievement_pct: 76.8, active_prosumers: 68400, peak_shaving_capacity_mw: 54.1, annual_co2_mitigation_tonnes: 267509, annual_financial_savings_crores_inr: 227.91, total_life_points: 747232000 },
    { sustainability_rank: 3, district: "Surat", region_type: "Commercial Hub", installed_mw: 198.2, target_mw: 260.0, achievement_pct: 76.2, active_prosumers: 52100, peak_shaving_capacity_mw: 43.6, annual_co2_mitigation_tonnes: 207190, annual_financial_savings_crores_inr: 176.52, total_life_points: 578744000 },
    { sustainability_rank: 4, district: "Vadodara", region_type: "Industrial Corridor", installed_mw: 134.6, target_mw: 190.0, achievement_pct: 70.8, active_prosumers: 39500, peak_shaving_capacity_mw: 29.6, annual_co2_mitigation_tonnes: 143597, annual_financial_savings_crores_inr: 122.34, total_life_points: 401108000 },
    { sustainability_rank: 5, district: "Gandhinagar", region_type: "Administrative Capital", installed_mw: 58.4, target_mw: 85.0, achievement_pct: 68.7, active_prosumers: 18240, peak_shaving_capacity_mw: 12.8, annual_co2_mitigation_tonnes: 64394, annual_financial_savings_crores_inr: 54.86, total_life_points: 179872000 }
  ]
};

document.addEventListener("DOMContentLoaded", () => {
  loadAdminAnalytics();
});

async function loadAdminAnalytics() {
  try {
    const res = await fetch("data/district_analytics.json");
    if (!res.ok) throw new Error("Network error loading district analytics");
    districtData = await res.json();
  } catch (err) {
    console.warn("Using fallback district data (CORS or offline mode):", err);
    districtData = FALLBACK_DISTRICTS;
  }

  renderStatewideKPIs(districtData.statewide_summary);
  renderDistrictTable(districtData.districts);
  renderDistrictProgressChart(districtData.districts);
  renderSeasonalityChart(districtData.districts);
}

function renderStatewideKPIs(summary) {
  if (!summary) return;
  setText("adminTotalInstalledMw", `${summary.total_installed_solar_mw.toFixed(1)} MW`);
  setText("adminTargetProgress", `${summary.state_achievement_pct.toFixed(1)}% of ${summary.total_target_solar_mw.toFixed(0)} MW`);
  setText("adminTotalProsumers", summary.total_registered_prosumers.toLocaleString("en-IN"));
  setText("adminPeakShaveMw", `${summary.total_peak_shaving_potential_mw.toFixed(1)} MW`);
  setText("adminAnnualGwh", `${summary.annual_generation_gwh.toFixed(1)} GWh`);
  setText("adminCo2Abated", `${Math.round(summary.annual_co2_abated_tonnes).toLocaleString("en-IN")} tonnes`);

  const progressEl = document.getElementById("adminStateProgressBar");
  if (progressEl) {
    progressEl.style.width = `${summary.state_achievement_pct}%`;
  }
}

function renderDistrictTable(districts) {
  const tbody = document.getElementById("districtTableBody");
  if (!tbody || !districts) return;

  tbody.innerHTML = districts.map(d => {
    const rankColors = {
      1: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      2: "text-slate-300 bg-slate-500/10 border-slate-500/30",
      3: "text-amber-600 bg-amber-700/10 border-amber-700/30"
    };
    const badgeClass = rankColors[d.sustainability_rank] || "text-slate-400 bg-slate-800 border-slate-700";

    return `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
        <td class="py-3.5 px-4 font-mono font-semibold">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg border text-xs font-bold ${badgeClass}">
            #${d.sustainability_rank}
          </span>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-bold text-white text-sm">${d.district}</div>
          <div class="text-xs text-slate-400">${d.region_type}</div>
        </td>
        <td class="py-3.5 px-4 text-right">
          <div class="text-sm font-semibold text-white">${d.installed_mw.toFixed(1)} <span class="text-slate-500">/ ${d.target_mw.toFixed(0)} MW</span></div>
          <div class="w-24 bg-slate-800 h-1.5 rounded-full ml-auto mt-1 overflow-hidden">
            <div class="bg-emerald-500 h-full rounded-full" style="width: ${d.achievement_pct}%"></div>
          </div>
        </td>
        <td class="py-3.5 px-4 text-right font-medium text-emerald-400 text-sm">
          ${d.achievement_pct.toFixed(1)}%
        </td>
        <td class="py-3.5 px-4 text-right text-slate-300 text-sm font-mono">
          ${d.active_prosumers.toLocaleString("en-IN")}
        </td>
        <td class="py-3.5 px-4 text-right text-amber-400 font-semibold text-sm">
          ${d.peak_shaving_capacity_mw.toFixed(1)} MW
        </td>
        <td class="py-3.5 px-4 text-right text-slate-300 text-sm font-mono">
          ₹${d.annual_financial_savings_crores_inr.toFixed(1)} Cr
        </td>
        <td class="py-3.5 px-4 text-right text-cyan-400 font-mono text-sm">
          ${Math.round(d.annual_co2_mitigation_tonnes).toLocaleString("en-IN")} t
        </td>
      </tr>
    `;
  }).join("");
}

function renderDistrictProgressChart(districts) {
  const ctx = document.getElementById("districtProgressChart");
  if (!ctx || !districts) return;

  const names = districts.map(d => d.district);
  const installed = districts.map(d => d.installed_mw);
  const target = districts.map(d => d.target_mw);

  if (districtProgressChart) districtProgressChart.destroy();

  districtProgressChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: names,
      datasets: [
        {
          label: "Installed Rooftop Solar (MW)",
          data: installed,
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderRadius: 6
        },
        {
          label: "GEDA Target Capacity (MW)",
          data: target,
          backgroundColor: "rgba(51, 65, 85, 0.7)",
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { color: "#e2e8f0", font: { family: "Inter", size: 12 } }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8", font: { family: "Inter" } }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8" },
          title: { display: true, text: "Capacity (Megawatts)", color: "#10b981" }
        }
      }
    }
  });
}

function renderSeasonalityChart(districts) {
  const ctx = document.getElementById("seasonalityChart");
  if (!ctx || !districts) return;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Climatological normalized generation index for Gujarat
  const solarFactors = [0.82, 0.94, 1.10, 1.25, 1.30, 1.05, 0.78, 0.74, 0.95, 1.02, 0.88, 0.79];

  const datasets = districts.slice(0, 3).map((d, idx) => {
    const colors = ["#10b981", "#38bdf8", "#f59e0b"];
    const monthlyBaseMwh = (d.installed_mw * 1500) / 12;
    return {
      label: `${d.district} (MWh)`,
      data: solarFactors.map(f => Math.round(monthlyBaseMwh * f)),
      borderColor: colors[idx],
      backgroundColor: colors[idx] + "15",
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 3,
      fill: true
    };
  });

  if (seasonalityChart) seasonalityChart.destroy();

  seasonalityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { color: "#e2e8f0", font: { family: "Inter", size: 12 } }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#94a3b8" }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8" },
          title: { display: true, text: "Monthly Generation (MWh)", color: "#94a3b8" }
        }
      }
    }
  });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}
