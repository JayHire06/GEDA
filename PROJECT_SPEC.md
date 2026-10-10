# PROJECT_SPEC.md — GEDA Mission LiFE Platform Specification

## 1. Context & Client
* **Client:** Gujarat Energy Development Agency (GEDA)
* **Initiative:** Mission LiFE (Lifestyle for Environment) — Gujarat State Transition
* **Target Users:** Everyday Gujarat citizens (residential energy consumers) & GEDA Administrative Officials / District Energy Engineers.

## 2. Core Functional Requirements

### Feature 1: Smart Energy Tracker (Peak-Shifting Engine)
* **Purpose:** Help citizens monitor daily hourly electricity usage ($kWh$) and shift heavy appliance loads (AC, washing machines, pumps) away from grid peak hours.
* **ML Task:** Hourly household load forecasting model trained on temporal features (hour, day of week, lagged demand $t-1, t-24$) and ambient temperature/humidity.
* **User Output:** Recommended off-peak operational windows for appliances and predicted bill reductions.

### Feature 2: Rooftop Solar Savings Calculator
* **Purpose:** Allow citizens to enter their district/city in Gujarat and monthly bill to calculate rooftop solar feasibility and financial return on investment (ROI).
* **ML Task:** Solar generation yield regression engine estimating annual yield ($kWh/m^2$) based on localized solar irradiance (NSRDB/IMD Gujarat parameters) and roof area.
* **User Output:** Instant annual cost savings, payback period (years), and connection to GEDA-approved solar vendors.

### Feature 3: LiFE Points Reward System
* **Purpose:** Gamify energy conservation by awarding points for verified peak-hour reductions or rooftop solar adoption.
* **Logic:** Point multipliers tied to percentage load reduction vs. historical baseline. Points redeemable for future municipal rebate discounts.

### Feature 4: GEDA Administrative Control Panel
* **Purpose:** Private control panel for GEDA officials to monitor macro-level energy transition data.
* **Features:** District-level electricity savings heatmaps, state-wide solar feasibility query analytics, aggregate load curves, and district performance rankings.

## 3. Data & Region Constraints
* **Region Focus:** Gujarat, India (Districts: Ahmedabad, Surat, Vadodara, Rajkot, Gandhinagar, etc.).
* **Grid Context:** High daytime solar potential, peak residential demand between 6 PM – 10 PM.

## 4. Real Public Data Sources
* **Household Demand Data:**
  - **Source:** UCI Individual Household Electric Power Consumption dataset.
  - **URL:** `https://archive.ics.uci.edu/static/public/235/individual+household+electric+power+consumption.zip`
  - **Temporal Resolution:** Minute-level electric power consumption aggregated/resampled to 1-hour intervals (`kWh`).
  - **Metrics:** Global active power, active energy, voltage, sub-metering breakdown.
* **Weather & Solar Irradiance Data:**
  - **Source:** NASA POWER (Prediction of Worldwide Energy Resources) Hourly API.
  - **Target Coordinates:** Gandhinagar, Gujarat, India (Latitude: `23.2156`, Longitude: `72.6369`).
  - **Parameters:**
    - `ALLSKY_SFC_SW_DWN`: All-Sky Surface Shortwave Downward Irradiance ($W/m^2$ or $MJ/m^2$).
    - `T2M`: Temperature at 2 meters above surface ($^\circ C$).
    - `RH2M`: Relative Humidity at 2 meters above surface (%).