# Directive: 03_solar_and_district_analytics.md — Solar ROI Yield Engine & District Analytics

## Objective
Establish deterministic computation and JSON export pipelines for:
1. **Rooftop Solar Yield & ROI Engine (Citizen Portal):** Localized solar yield modeling ($kWh/kWp/yr$) across major Gujarat districts based on NASA POWER solar irradiance data, PM Surya Ghar / GEDA state subsidy tier formulas, and financial payback projections.
2. **District Energy Transition Analytics (Admin Control Panel):** Macro-level aggregation of district adoption metrics, peak load shaving capacity ($MW$), $\text{CO}_2$ mitigation, and LiFE Points citizen rankings.
3. **Payload Exporter:** Persisting standalone static JSON payloads to `src/data/` for consumption by the zero-dependency browser frontend.

---

## 1. Inputs & District Climatology
District-level coordinates across Gujarat:
- **Gandhinagar (Admin Capital):** Lat `23.2156`, Lon `72.6369` (High solar irradiance, state administrative hub)
- **Ahmedabad (Mega Metro):** Lat `23.0225`, Lon `72.5714` (Dense urban rooftop potential)
- **Surat (Diamond/Commercial):** Lat `21.1702`, Lon `72.8311` (Coastal irradiance profile, high commercial tariff)
- **Vadodara (Industrial Corridor):** Lat `22.3072`, Lon `73.1812` (Mixed residential-industrial rooftop demand)
- **Rajkot (Saurashtra Arid Core):** Lat `22.3039`, Lon `70.8022` (Exceptional clear-sky irradiance days)

### Solar Climatology Parameters (NASA POWER Grounded)
- Average Daily Peak Sun Hours ($PSH$): $5.2$ to $5.8\text{ kWh/m}^2/\text{day}$.
- Annual Horizontal Irradiance: $1,900$ to $2,150\text{ kWh/m}^2/\text{year}$.
- Standard PV System Performance Ratio ($PR$): $0.76$ (accounts for inverter efficiency $97\%$, thermal derating $-0.35\%/^\circ\text{C}$ in hot summers, soiling/dust factor $3\%$, cabling losses $2\%$).
- Rooftop specific footprint: $\approx 10\text{ m}^2$ (or $100\text{ sq ft}$) per $1\text{ kWp}$ panel capacity.

---

## 2. Mathematical Models & Business Logic

### A. Solar Generation Yield
For a system with rated DC capacity $P_{dc}$ (in kW) or roof area $A$ (in m²):
1. **Recommended Capacity:**
   $$P_{dc} = \min\left(\frac{A}{10}, \frac{\text{Monthly Consumption } (kWh)}{120}\right)$$
2. **Annual Solar Output ($kWh$):**
   $$E_{annual} = P_{dc} \times \text{Specific Yield}_{district} \times PR$$
   *(Specific Yield in Gujarat typically ranges from $1,450$ to $1,620\text{ kWh/kWp/year}$)*

### B. Financial Capital Expenditure & GEDA Subsidy Matrix
Grounded in **PM Surya Ghar: Muft Bijli Yojana & GEDA Gujarat State Policy**:
- **Gross Benchmark CapEx:** ₹$52,000$ per kW (includes Tier-1 Mono-PERC modules, grid-tied inverter, structure, bi-directional net meter, and commissioning).
- **Government Subsidy Schedule:**
  - Up to $1\text{ kW}$: ₹$30,000$ flat.
  - $2\text{ kW}$: ₹$60,000$ flat (₹30,000/kW).
  - $3\text{ kW}$: ₹$78,000$ flat (maximum residential subsidy cap).
  - Above $3\text{ kW}$: Capped at ₹$78,000$.
- **Net Citizen CapEx:**
  $$\text{CapEx}_{net} = (P_{dc} \times 52,000) - \text{Subsidy}(P_{dc})$$

### C. Utility Bill Savings & Payback Timeline
- **Blended Gujarat Residential Tariff:** ₹$6.10/\text{kWh}$ (UGVCL / DGVCL / PGVCL / MGVCL slab average).
- **Annual Cost Savings:**
  $$\text{Savings}_{annual} = E_{annual} \times \text{Tariff Rate}$$
- **Simple Payback Period:**
  $$\text{Payback (Years)} = \frac{\text{CapEx}_{net}}{\text{Savings}_{annual}}$$
- **25-Year Lifecycle Net Savings:**
  $$\text{Lifecycle Savings} = (\text{Savings}_{annual} \times 25 \times 0.90) - \text{CapEx}_{net}$$
  *(0.90 degradation discount factor for 25-year panel degradation at $0.5\%/\text{year}$ and inverter replacement)*
- **Environmental Impact:**
  $$\text{Avoided CO}_2 (\text{kg/yr}) = E_{annual} \times 0.716\text{ kg CO}_2/\text{kWh}$$
- **Mission LiFE Points:**
  $$\text{LiFE Points} = \text{round}(E_{annual} \times 2)$$

---

## 3. District Analytics Aggregation Logic
For each of the 5 primary Gujarat districts:
- Registered citizen participants & solar prosumers.
- Total installed rooftop solar capacity ($MW$).
- Grid peak load shaving potential during 18:00–22:00 IST ($MW$).
- Cumulative annual electricity generation ($MWh$).
- Total $\text{CO}_2$ mitigation (metric tonnes).
- District LiFE Points leaderboard and sustainability ranking.
- Monthly solar profile (12-month solar irradiance curve in $W/m^2$).

---

## 4. Deliverables & Outputs
- Execution Script: `execution/03_generate_solar_and_district_payloads.py`
- Deliverable Files:
  - `src/data/solar_calculator_data.json`: Static lookup tables, district yields, subsidy slabs, and default configuration for the citizen calculator.
  - `src/data/district_analytics.json`: District metrics, heatmaps, peak shaving potential, and rankings for the GEDA administrative dashboard.
  - `src/data/forecast_data.json`: Copied/synced from `.tmp/evaluation_results.json` to ensure the web dashboard can render Phase 2 XGBoost curves seamlessly.

---

## 5. Self-Annealing Edge Cases & Operating Notes
- **Windows Terminal Codepage Handling:** When reporting currency in console tables on Windows hosts (defaulting to `cp1252`), direct printing of Unicode Rupee (`₹`) raises `UnicodeEncodeError`. Scripts must include `sys.stdout.reconfigure(encoding='utf-8')` and fall back to standardized ASCII `INR` strings in CLI summaries.
- **Subsidy Capping Threshold:** Residential subsidies under PM Surya Ghar / GEDA are strictly capped at 3 kW (₹78,000 maximum). Systems larger than 3 kW (e.g. 4–10 kW) still receive ₹78,000 rather than linear scaling, ensuring realistic financial payback models for larger homes.
