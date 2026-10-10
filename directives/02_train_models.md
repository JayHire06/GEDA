# Directive: 02_train_models.md — ML Model Training, Benchmarking & Peak-Hour Evaluation

## Objective
Train, evaluate, and benchmark hourly household electricity load forecasting models for the **GEDA Mission LiFE Peak-Shifting Engine**. Models predict electricity consumption ($kWh$) for target timestamp $t$ using strictly historical observations and cyclical time features. Compare simplistic baselines against modern non-linear tree ensembles on holdout validation data, conduct a targeted peak-hour (18:00–22:00 IST) residual audit, and export precomputed scenario results to `.tmp/evaluation_results.json`.

---

## 1. Inputs
- Dataset: `.tmp/processed_data.csv` (contains 34,198 hourly records, 17 features, and chronological `split` tags).
- Training set: First 80% (27,358 hours, `2007-01-02` to `2010-02-14`).
- Validation set: Last 20% (6,840 hours, `2010-02-14` to `2010-11-26`).

### Feature Matrix Schema
- **Calendar & Cyclical:** `hour`, `day_of_week`, `month`, `is_weekend`, `is_peak_hours`
- **Autoregressive Demand Lags (Zero-Leakage):** `demand_lag_1h` ($t-1$), `demand_lag_24h` ($t-24$), `demand_rolling_mean_24h`, `demand_rolling_std_24h`
- **Meteorology & Solar Lags:** `solar_irradiance_wm2`, `solar_lag_1h`, `solar_lag_24h`, `temp_c`, `temp_lag_1h`, `humidity_pct`, `humidity_lag_1h`
- **Target Variable:** `target_demand_kwh` ($kWh$ consumed at hour $t$)

---

## 2. Models to Benchmark

### A. Baselines
1. **Naive 24-Hour Persistence Baseline**:
   - $\hat{y}_t = y_{t-24}$
   - Assumes current hour demand mirrors the exact same hour from the previous day.
2. **Ordinary Least Squares (OLS) Linear Regression**:
   - Linear combination of all features using scikit-learn `LinearRegression()`.

### B. Non-Linear Tree Ensembles
3. **Random Forest Regressor**:
   - `RandomForestRegressor(n_estimators=100, max_depth=14, min_samples_split=5, random_state=42, n_jobs=-1)`
4. **XGBoost Regressor (Champion Model)**:
   - `XGBRegressor(n_estimators=180, max_depth=6, learning_rate=0.05, subsample=0.85, colsample_bytree=0.85, random_state=42, n_jobs=-1)`

---

## 3. Evaluation Criteria & Audits

### Overall Validation Metrics
Compute on the 6,840 holdout validation hours:
- **RMSE (Root Mean Squared Error):** Penalizes large forecast misses heavily ($\sqrt{\frac{1}{N}\sum(y - \hat{y})^2}$).
- **MAE (Mean Absolute Error):** Average magnitude of forecast error ($\frac{1}{N}\sum|y - \hat{y}|$).
- **MAPE (Mean Absolute Percentage Error):** Normalized percentage error ($\frac{100\%}{N}\sum\left|\frac{y - \hat{y}}{y}\right|$).

### Targeted Peak-Hour Residual Audit (18:00–22:00 IST)
Because grid strain and tariff surcharges occur during evening peaks:
- Calculate peak-specific RMSE, MAE, and MAPE for hours where `is_peak_hours == 1`.
- Compute **Mean Residual Error / Bias** ($\text{Mean}(y - \hat{y})$) to detect systematic under-prediction or over-prediction during high demand windows.

### Peak-Shifting Scenario Simulation (Mission LiFE Engine)
Simulate shifting flexible residential appliance loads from evening peak (18:00–22:00) into solar surplus midday hours (11:00–15:00):
- Scenarios: **15% Shift**, **25% Shift**, and **35% Shift**.
- Calculate:
  - Daily & Annual avoided peak kWh per household.
  - Household bill savings using Gujarat residential tariff rates (average ₹6.20/kWh peak rate vs ₹4.10/kWh solar off-peak rate).
  - LiFE Points awarded (10 points per kWh shifted).
  - Scaled district impact (100,000 households in Gandhinagar / Ahmedabad).

---

## 4. Deliverables
- Deterministic Execution Script: `execution/02_train_and_evaluate_models.py`
- Precomputed Web Payload: `.tmp/evaluation_results.json`
  - Model comparison scorecard
  - Feature importances
  - 48-hour sample forecast curve (Actual vs Predicted vs Baseline)
  - Peak-shifting scenario metrics
- Console Summary Report: Benchmark performance table comparing all 4 models.
