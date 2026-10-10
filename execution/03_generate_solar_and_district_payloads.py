"""
execution/03_generate_solar_and_district_payloads.py
GEDA Mission LiFE Platform — Phase 3 & 4: Solar ROI & District Analytics Engine

Computes and exports:
1. src/data/solar_calculator_data.json — District-specific solar yields, PM Surya Ghar / GEDA subsidy matrix,
   precomputed system size lookups (1-10 kW), payback horizons, and approved vendor directories.
2. src/data/district_analytics.json — Comprehensive Gujarat district energy transition analytics,
   peak load shaving potential, CO2 abatement, and LiFE Points leaderboards.
3. src/data/forecast_data.json — Synchronized Phase 2 ML benchmark and 72-hour forecast curve payload.
"""

import json
import shutil
import sys
from pathlib import Path
import numpy as np

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Workspace paths
BASE_DIR = Path(__file__).resolve().parent.parent
TMP_DIR = BASE_DIR / ".tmp"
SRC_DATA_DIR = BASE_DIR / "src" / "data"
SRC_DATA_DIR.mkdir(parents=True, exist_ok=True)

SOLAR_PAYLOAD_PATH = SRC_DATA_DIR / "solar_calculator_data.json"
DISTRICT_PAYLOAD_PATH = SRC_DATA_DIR / "district_analytics.json"
FORECAST_PAYLOAD_PATH = SRC_DATA_DIR / "forecast_data.json"
EVAL_RESULTS_PATH = TMP_DIR / "evaluation_results.json"

# Gujarat Solar Standards & Financial Parameters
BENCHMARK_COST_PER_KW_INR = 52000.0   # Turnkey EPC cost in Gujarat (Tier-1 modules + inverter + net meter)
AVERAGE_TARIFF_INR_PER_KWH = 6.10      # Blended residential tariff across Gujarat DISCOMs (UGVCL, DGVCL, etc.)
CEA_CO2_FACTOR_KG_PER_KWH = 0.716      # CEA CO2 grid baseline factor
PERFORMANCE_RATIO = 0.76               # Typical Gujarat PR considering ambient summer heat derating
PANEL_DEGRADATION_FACTOR_25YR = 0.90   # Discount factor for 25-year panel degradation & maintenance

# Gujarat District Climatological Profiles (Grounded in NASA POWER & IMD Solar Radiation Atlas)
DISTRICT_PROFILES = {
    "Gandhinagar": {
        "lat": 23.2156,
        "lon": 72.6369,
        "region_type": "Administrative Capital",
        "specific_yield_kwh_kwp": 1540.0,
        "daily_psh": 5.55,
        "solar_irradiance_annual_kwh_m2": 2025.0,
        "target_mw": 85.0,
        "installed_mw": 58.4,
        "active_prosumers": 18240,
        "avg_monthly_kwh_residential": 240.0,
        "monthly_irradiance_wm2": [168, 195, 235, 268, 282, 230, 185, 178, 212, 224, 186, 158]
    },
    "Ahmedabad": {
        "lat": 23.0225,
        "lon": 72.5714,
        "region_type": "Metropolitan Megacity",
        "specific_yield_kwh_kwp": 1520.0,
        "daily_psh": 5.48,
        "solar_irradiance_annual_kwh_m2": 2000.0,
        "target_mw": 320.0,
        "installed_mw": 245.8,
        "active_prosumers": 68400,
        "avg_monthly_kwh_residential": 310.0,
        "monthly_irradiance_wm2": [165, 192, 231, 264, 278, 226, 182, 174, 208, 220, 182, 155]
    },
    "Surat": {
        "lat": 21.1702,
        "lon": 72.8311,
        "region_type": "Commercial & Textile Hub",
        "specific_yield_kwh_kwp": 1460.0,
        "daily_psh": 5.26,
        "solar_irradiance_annual_kwh_m2": 1920.0,
        "target_mw": 260.0,
        "installed_mw": 198.2,
        "active_prosumers": 52100,
        "avg_monthly_kwh_residential": 290.0,
        "monthly_irradiance_wm2": [160, 185, 222, 252, 265, 210, 165, 158, 195, 210, 175, 150]
    },
    "Vadodara": {
        "lat": 22.3072,
        "lon": 73.1812,
        "region_type": "Industrial & Cultural Core",
        "specific_yield_kwh_kwp": 1490.0,
        "daily_psh": 5.37,
        "solar_irradiance_annual_kwh_m2": 1960.0,
        "target_mw": 190.0,
        "installed_mw": 134.6,
        "active_prosumers": 39500,
        "avg_monthly_kwh_residential": 265.0,
        "monthly_irradiance_wm2": [162, 188, 226, 258, 272, 218, 174, 166, 202, 215, 178, 152]
    },
    "Rajkot": {
        "lat": 22.3039,
        "lon": 70.8022,
        "region_type": "Saurashtra Arid High-Solar Hub",
        "specific_yield_kwh_kwp": 1595.0,
        "daily_psh": 5.75,
        "solar_irradiance_annual_kwh_m2": 2095.0,
        "target_mw": 160.0,
        "installed_mw": 128.5,
        "active_prosumers": 36800,
        "avg_monthly_kwh_residential": 250.0,
        "monthly_irradiance_wm2": [172, 201, 242, 275, 290, 238, 192, 184, 218, 230, 191, 162]
    }
}

# GEDA-Approved Solar Vendor Sample Directory
GEDA_APPROVED_VENDORS = [
    {
        "id": "VEND-GEDA-01",
        "name": "Gujarat Surya Urja Solutions Pvt Ltd",
        "district": "Gandhinagar",
        "headquarters": "GIDC Electronic Estate, Sector 26, Gandhinagar",
        "rating": 4.9,
        "installations_count": 4820,
        "tier1_panels": True,
        "warranty_years": 25,
        "contact_phone": "+91 79 2328 7100"
    },
    {
        "id": "VEND-GEDA-02",
        "name": "Sabarmati Solar Power Infra",
        "district": "Ahmedabad",
        "headquarters": "SG Highway, Prahlad Nagar, Ahmedabad",
        "rating": 4.8,
        "installations_count": 9250,
        "tier1_panels": True,
        "warranty_years": 25,
        "contact_phone": "+91 79 2685 4400"
    },
    {
        "id": "VEND-GEDA-03",
        "name": "Tapi Green Energy Ventures",
        "district": "Surat",
        "headquarters": "Ring Road, Surat Textile Market, Surat",
        "rating": 4.8,
        "installations_count": 6410,
        "tier1_panels": True,
        "warranty_years": 25,
        "contact_phone": "+91 261 245 8820"
    },
    {
        "id": "VEND-GEDA-04",
        "name": "Sayaji CleanTech & Renewables",
        "district": "Vadodara",
        "headquarters": "Alkapuri, Vadodara",
        "rating": 4.7,
        "installations_count": 5120,
        "tier1_panels": True,
        "warranty_years": 25,
        "contact_phone": "+91 265 233 1900"
    },
    {
        "id": "VEND-GEDA-05",
        "name": "Saurashtra Surya Power Systems",
        "district": "Rajkot",
        "headquarters": "150 Feet Ring Road, Rajkot",
        "rating": 4.9,
        "installations_count": 5890,
        "tier1_panels": True,
        "warranty_years": 25,
        "contact_phone": "+91 281 257 6630"
    }
]


def calculate_subsidy_inr(capacity_kw):
    """
    PM Surya Ghar: Muft Bijli Yojana & GEDA Gujarat Residential Subsidy Formula:
    - 1 kW: ₹30,000
    - 2 kW: ₹60,000 (₹30,000/kW)
    - 3 kW: ₹78,000
    - > 3 kW: Capped at ₹78,000
    """
    if capacity_kw <= 1.0:
        return 30000.0 * capacity_kw
    elif capacity_kw <= 2.0:
        return 60000.0
    else:
        return 78000.0


def calculate_system_roi(capacity_kw, specific_yield):
    """Calculate detailed financial and physical ROI metrics for a given capacity and district."""
    annual_gen_kwh = capacity_kw * specific_yield
    gross_capex_inr = capacity_kw * BENCHMARK_COST_PER_KW_INR
    subsidy_inr = calculate_subsidy_inr(capacity_kw)
    net_capex_inr = max(0.0, gross_capex_inr - subsidy_inr)

    annual_savings_inr = annual_gen_kwh * AVERAGE_TARIFF_INR_PER_KWH
    payback_years = round(net_capex_inr / annual_savings_inr, 2) if annual_savings_inr > 0 else 0.0

    # 25-Year lifecycle savings (accounting for 10% lifetime degradation & maintenance factor)
    lifecycle_25yr_savings_inr = round((annual_savings_inr * 25.0 * PANEL_DEGRADATION_FACTOR_25YR) - net_capex_inr, 2)
    annual_co2_kg = round(annual_gen_kwh * CEA_CO2_FACTOR_KG_PER_KWH, 1)
    lifecycle_co2_tonnes = round((annual_co2_kg * 25.0 * PANEL_DEGRADATION_FACTOR_25YR) / 1000.0, 1)
    life_points_annual = int(round(annual_gen_kwh * 2.0))

    roof_sq_m = round(capacity_kw * 10.0, 1)
    roof_sq_ft = round(roof_sq_m * 10.7639, 1)

    return {
        "capacity_kw": capacity_kw,
        "roof_area_sq_m": roof_sq_m,
        "roof_area_sq_ft": roof_sq_ft,
        "annual_generation_kwh": round(annual_gen_kwh, 1),
        "monthly_generation_kwh": round(annual_gen_kwh / 12.0, 1),
        "daily_generation_kwh": round(annual_gen_kwh / 365.0, 2),
        "gross_capex_inr": round(gross_capex_inr, 2),
        "geda_subsidy_inr": round(subsidy_inr, 2),
        "net_capex_inr": round(net_capex_inr, 2),
        "annual_bill_savings_inr": round(annual_savings_inr, 2),
        "monthly_bill_savings_inr": round(annual_savings_inr / 12.0, 2),
        "payback_years": payback_years,
        "lifecycle_25yr_net_savings_inr": lifecycle_25yr_savings_inr,
        "annual_co2_offset_kg": annual_co2_kg,
        "lifecycle_25yr_co2_offset_tonnes": lifecycle_co2_tonnes,
        "annual_life_points": life_points_annual
    }


def generate_solar_calculator_payload():
    """Build and write the solar_calculator_data.json payload."""
    standard_sizes_kw = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0]

    district_lookups = {}
    for d_name, d_info in DISTRICT_PROFILES.items():
        spec_yield = d_info["specific_yield_kwh_kwp"]
        district_lookups[d_name] = {
            "specific_yield_kwh_kwp": spec_yield,
            "daily_psh": d_info["daily_psh"],
            "solar_irradiance_annual_kwh_m2": d_info["solar_irradiance_annual_kwh_m2"],
            "precomputed_capacities": [
                calculate_system_roi(kw, spec_yield) for kw in standard_sizes_kw
            ]
        }

    payload = {
        "metadata": {
            "title": "GEDA Mission LiFE Rooftop Solar Yield & ROI Engine",
            "version": "1.0.0",
            "benchmark_cost_per_kw_inr": BENCHMARK_COST_PER_KW_INR,
            "tariff_rate_inr_per_kwh": AVERAGE_TARIFF_INR_PER_KWH,
            "cea_co2_factor_kg_kwh": CEA_CO2_FACTOR_KG_PER_KWH,
            "subsidy_scheme": "PM Surya Ghar: Muft Bijli Yojana & GEDA State Integration",
            "districts_covered": list(DISTRICT_PROFILES.keys())
        },
        "subsidy_rules": [
            {"tier": "Up to 1 kW", "subsidy_inr": 30000, "formula": "₹30,000 / kW"},
            {"tier": "2 kW System", "subsidy_inr": 60000, "formula": "₹60,000 flat (₹30,000 / kW)"},
            {"tier": "3 kW System", "subsidy_inr": 78000, "formula": "₹78,000 flat"},
            {"tier": "Above 3 kW", "subsidy_inr": 78000, "formula": "Capped at ₹78,000"}
        ],
        "district_solar_data": district_lookups,
        "approved_vendors": GEDA_APPROVED_VENDORS
    }

    with open(SOLAR_PAYLOAD_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"[OK] Exported Solar Calculator Payload: {SOLAR_PAYLOAD_PATH} ({SOLAR_PAYLOAD_PATH.stat().st_size / 1e3:.1f} KB)")
    return payload


def generate_district_analytics_payload():
    """Build and write the district_analytics.json payload for GEDA Admin Control Panel."""
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    district_cards = []
    total_state_installed_mw = 0.0
    total_state_target_mw = 0.0
    total_state_prosumers = 0
    total_state_annual_mwh = 0.0
    total_state_co2_tonnes = 0.0
    total_state_peak_shaving_mw = 0.0
    total_state_life_points = 0

    for d_name, d_info in DISTRICT_PROFILES.items():
        installed_mw = d_info["installed_mw"]
        target_mw = d_info["target_mw"]
        prosumers = d_info["active_prosumers"]
        spec_yield = d_info["specific_yield_kwh_kwp"]
        
        # Annual generation in MWh = installed_mw * 1000 kW * spec_yield / 1000
        annual_gen_mwh = installed_mw * spec_yield
        annual_co2_tonnes = (annual_gen_mwh * 1000.0 * CEA_CO2_FACTOR_KG_PER_KWH) / 1000.0
        annual_savings_crores = (annual_gen_mwh * 1000.0 * AVERAGE_TARIFF_INR_PER_KWH) / 1e7
        
        # Peak Shaving Potential: Evening peak (18:00-22:00) residential demand reduction enabled by battery/solar shift
        # Approximately 22% of installed rooftop solar capacity can be stored/shifted to flatten the evening peak
        peak_shave_mw = round(installed_mw * 0.22, 2)
        life_points = int(round(annual_gen_mwh * 2000.0))
        target_achievement_pct = round((installed_mw / target_mw) * 100.0, 1)

        total_state_installed_mw += installed_mw
        total_state_target_mw += target_mw
        total_state_prosumers += prosumers
        total_state_annual_mwh += annual_gen_mwh
        total_state_co2_tonnes += annual_co2_tonnes
        total_state_peak_shaving_mw += peak_shave_mw
        total_state_life_points += life_points

        # 12-month solar irradiance curve
        monthly_irradiance = [
            {"month": m, "irradiance_wm2": val, "est_generation_mwh": round(val / 200.0 * (annual_gen_mwh / 12.0), 1)}
            for m, val in zip(months, d_info["monthly_irradiance_wm2"])
        ]

        district_cards.append({
            "district": d_name,
            "region_type": d_info["region_type"],
            "coordinates": {"lat": d_info["lat"], "lon": d_info["lon"]},
            "target_mw": target_mw,
            "installed_mw": installed_mw,
            "achievement_pct": target_achievement_pct,
            "active_prosumers": prosumers,
            "specific_yield_kwh_kwp": spec_yield,
            "annual_generation_mwh": round(annual_gen_mwh, 1),
            "peak_shaving_capacity_mw": peak_shave_mw,
            "annual_financial_savings_crores_inr": round(annual_savings_crores, 2),
            "annual_co2_mitigation_tonnes": round(annual_co2_tonnes, 1),
            "total_life_points": life_points,
            "monthly_solar_profile": monthly_irradiance
        })

    # Sort districts by achievement percentage for leaderboard
    district_cards.sort(key=lambda x: x["achievement_pct"], reverse=True)
    for rank, d in enumerate(district_cards, 1):
        d["sustainability_rank"] = rank

    payload = {
        "metadata": {
            "platform": "GEDA Mission LiFE Administrative Control Panel",
            "state": "Gujarat, India",
            "last_updated": "2026-10-10",
            "reporting_period": "FY 2026-27"
        },
        "statewide_summary": {
            "total_districts_monitored": len(DISTRICT_PROFILES),
            "total_installed_solar_mw": round(total_state_installed_mw, 2),
            "total_target_solar_mw": round(total_state_target_mw, 2),
            "state_achievement_pct": round((total_state_installed_mw / total_state_target_mw) * 100.0, 1),
            "total_registered_prosumers": total_state_prosumers,
            "annual_generation_gwh": round(total_state_annual_mwh / 1000.0, 2),
            "annual_co2_abated_tonnes": round(total_state_co2_tonnes, 1),
            "total_peak_shaving_potential_mw": round(total_state_peak_shaving_mw, 2),
            "statewide_life_points_issued": total_state_life_points
        },
        "districts": district_cards
    }

    with open(DISTRICT_PAYLOAD_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"[OK] Exported District Analytics Payload: {DISTRICT_PAYLOAD_PATH} ({DISTRICT_PAYLOAD_PATH.stat().st_size / 1e3:.1f} KB)")
    return payload


def sync_forecast_payload():
    """Synchronize evaluation_results.json from Phase 2 into src/data/forecast_data.json."""
    if EVAL_RESULTS_PATH.exists():
        shutil.copyfile(EVAL_RESULTS_PATH, FORECAST_PAYLOAD_PATH)
        print(f"[OK] Synchronized Forecast Payload to: {FORECAST_PAYLOAD_PATH} ({FORECAST_PAYLOAD_PATH.stat().st_size / 1e3:.1f} KB)")
    else:
        print(f"[WARN] {EVAL_RESULTS_PATH} not found; skipping forecast synchronization.")


def print_executive_summary(solar_data, district_data):
    """Print ASCII summary table for Solar ROI and District Transition."""
    print("\n" + "=" * 90)
    print("        GEDA MISSION LiFE — DISTRICT SOLAR ROOFTOP & FINANCIAL ROI SUMMARY        ")
    print("=" * 90)
    print(f"{'District':<14} | {'Specific Yield':<15} | {'3 kW Gross':<11} | {'Subsidy':<10} | {'3 kW Net':<10} | {'Payback':<10} | {'25-Yr Net Sav'}")
    print("-" * 90)

    for d_name in DISTRICT_PROFILES.keys():
        d_calc = solar_data["district_solar_data"][d_name]
        spec_yield = d_calc["specific_yield_kwh_kwp"]
        # 3 kW sample system (standard residential size)
        p3kw = [p for p in d_calc["precomputed_capacities"] if p["capacity_kw"] == 3.0][0]
        
        gross_c = f"INR {p3kw['gross_capex_inr']:,.0f}"
        sub_c = f"INR {p3kw['geda_subsidy_inr']:,.0f}"
        net_c = f"INR {p3kw['net_capex_inr']:,.0f}"
        payback = f"{p3kw['payback_years']} yrs"
        savings_25yr = f"INR {p3kw['lifecycle_25yr_net_savings_inr']:,.0f}"

        print(f"{d_name:<14} | {spec_yield:.0f} kWh/kWp/yr  | {gross_c:<11} | {sub_c:<10} | {net_c:<10} | {payback:<10} | {savings_25yr}")
    print("=" * 90)

    print("\n" + "=" * 90)
    print("         GEDA ADMINISTRATIVE CONTROL PANEL — DISTRICT TRANSITION SCORECARD        ")
    print("=" * 90)
    print(f"{'Rank & District':<18} | {'Installed/Target':<17} | {'Progress':<9} | {'Prosumers':<10} | {'Peak Shave':<11} | {'CO2 Offset/Yr'}")
    print("-" * 90)

    for d in district_data["districts"]:
        rank_name = f"#{d['sustainability_rank']} {d['district']}"
        mw_str = f"{d['installed_mw']:.1f} / {d['target_mw']:.0f} MW"
        prog_str = f"{d['achievement_pct']:.1f}%"
        pros_str = f"{d['active_prosumers']:,}"
        shave_str = f"{d['peak_shaving_capacity_mw']:.1f} MW"
        co2_str = f"{d['annual_co2_mitigation_tonnes']:,.0f} t"

        print(f"{rank_name:<18} | {mw_str:<17} | {prog_str:<9} | {pros_str:<10} | {shave_str:<11} | {co2_str}")
    print("=" * 90)

    state = district_data["statewide_summary"]
    print(f"\nSTATEWIDE TOTALS: {state['total_installed_solar_mw']:.1f} MW Installed ({state['state_achievement_pct']:.1f}% of {state['total_target_solar_mw']:.0f} MW Target) across {state['total_registered_prosumers']:,} Households.")
    print(f"Total Peak Shaving Capacity: {state['total_peak_shaving_potential_mw']:.1f} MW | Annual Clean Generation: {state['annual_generation_gwh']:.2f} GWh | CO2 Abated: {state['annual_co2_abated_tonnes']:,.0f} tonnes.")
    print("=" * 90 + "\n")


if __name__ == "__main__":
    print("=" * 90)
    print("  GEDA MISSION LiFE — GENERATING SOLAR ROI & DISTRICT ANALYTICS PAYLOADS  ")
    print("=" * 90)
    solar_payload = generate_solar_calculator_payload()
    district_payload = generate_district_analytics_payload()
    sync_forecast_payload()
    print_executive_summary(solar_payload, district_payload)
