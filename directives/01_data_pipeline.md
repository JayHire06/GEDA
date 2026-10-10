# Directive: 01_data_pipeline.md — Data Ingestion & Temporal Feature Engineering

## Objective
Establish a deterministic, reproducible data pipeline for Phase 1 of the GEDA Mission LiFE platform by ingesting real historical household electric demand data (UCI) and localized Gujarat weather & solar irradiance metrics (NASA POWER API for Gandhinagar), cleaning and aggregating them to an hourly temporal frequency, constructing strictly non-leaking lag features, and partitioning them via a chronological 80/20 split.

---

## 1. Inputs & Data Sources
1. **UCI Individual Household Electric Power Consumption Dataset**:
   - Source: `https://archive.ics.uci.edu/static/public/235/individual+household+electric+power+consumption.zip`
   - Uncompressed payload: `household_power_consumption.txt` (semicolon-separated).
   - Frequency: 1-minute measurements from 2006-12-16 to 2010-11-26.
   - Key attributes:
     - `Date` (dd/mm/yyyy), `Time` (hh:mm:ss)
     - `Global_active_power` (household global minute-averaged active power in kW)
     - Missing indicator: `?`
2. **NASA POWER Hourly Meteorology & Solar Irradiance**:
   - Endpoint: `https://power.larc.nasa.gov/api/temporal/hourly/point`
   - Location: Gandhinagar, Gujarat (Latitude: `23.2156`, Longitude: `72.6369`)
   - Parameters:
     - `ALLSKY_SFC_SW_DWN`: All-Sky Surface Shortwave Downward Irradiance ($W/m^2$ or $MJ/m^2$)
     - `T2M`: 2-meter air temperature ($^\circ C$)
     - `RH2M`: 2-meter relative humidity (%)
   - Request interval: Hourly data matching the overlapping timeframe with the demand series.

---

## 2. Tools & Scripts
- Execution Script: `execution/01_download_and_process_data.py`
- Intermediate storage: `.tmp/`
  - `.tmp/household_power_consumption.zip`
  - `.tmp/household_power_consumption.txt`
  - `.tmp/nasa_power_gandhinagar_hourly.json`
- Output target: `.tmp/processed_data.csv`

---

## 3. Data Processing SOP

### Step A: Download & Ingestion
1. Stream download the UCI zip file if not already present in `.tmp/`.
   - *SSL Edge Case:* Ensure an SSL unverified context fallback is configured in Python if the UCI certificate chain encounters expired authority errors on Windows.
2. Extract `household_power_consumption.txt` directly to `.tmp/`.
3. Query the NASA POWER API for Gandhinagar coordinates across the overlapping multi-year period (e.g. 2007-01-01 through 2010-11-26).
   - Chunk queries by calendar year to respect payload size limits and network timeouts.
   - Cache raw JSON in `.tmp/nasa_power_gandhinagar_hourly.json`.

### Step B: Temporal Aggregation & Missing Value Treatment
1. Parse datetime for the UCI dataset (`Date + Time` in `%d/%m/%Y %H:%M:%S`).
2. Replace `?` with `NaN` and cast `Global_active_power` to float.
3. Resample to 1-hour intervals (`1h`):
   - `demand_kwh = Global_active_power.mean()` (converting hourly mean kW to 1-hour energy consumption in kWh).
   - Linear interpolation for missing gaps up to 3 hours; drop extended unrecorded stretches.
4. Align NASA POWER hourly observations to identical datetime index.

### Step C: Strict Non-Leakage Feature Engineering
For any target prediction at timestamp $t$:
1. **Calendar / Cyclical Features**:
   - `hour`: Hour of the day (0–23).
   - `day_of_week`: Day of week (0=Monday, 6=Sunday).
   - `month`: Month of year (1–12).
   - `is_weekend`: Binary flag (1 if Saturday or Sunday, else 0).
   - `is_peak_hours`: Binary flag (1 if 18 <= hour <= 22, representing Gujarat residential evening peak).
2. **Strictly Historical Lag Features ($t-1, t-24$)**:
   - `demand_lag_1h`: Energy consumption at $t - 1$ hour.
   - `demand_lag_24h`: Energy consumption at $t - 24$ hours (same time yesterday).
   - `demand_rolling_mean_24h`: Rolling 24-hour mean of demand, shifted by 1 hour (strictly covers $[t-24, t-1]$).
   - `solar_lag_1h`: Surface solar irradiance at $t - 1$ hour.
   - `solar_lag_24h`: Surface solar irradiance at $t - 24$ hours.
   - `temp_lag_1h`: Ambient temperature at $t - 1$ hour.
   - `humidity_lag_1h`: Ambient relative humidity at $t - 1$ hour.
3. **Current Weather Foreknowledge / External Factors** (optional or separated):
   - Current weather conditions at timestamp $t$ (`temp_t2m`, `humidity_rh2m`, `solar_irradiance`) can be used if representing weather forecast inputs, but historical lags ensure causal forecasting integrity.

### Step D: Chronological Split (No Shuffling)
1. Sort index strictly in ascending chronological order.
2. Drop initial rows containing `NaN` resulting from 24-hour lag computation.
3. Apply an exact chronological **80% Training / 20% Validation** split:
   - First 80% assigned `split = 'train'`.
   - Remaining 20% assigned `split = 'val'`.
   - Never perform random K-fold or random shuffling on time-series records to prevent temporal lookahead leakage.

---

## 4. Deliverable Artifacts
- Processed output: `.tmp/processed_data.csv`
- Metadata summary containing:
  - Total records
  - Temporal span (Start Date to End Date)
  - Train/Val record count
  - Target distribution ($kWh$) and peak-hour statistics
