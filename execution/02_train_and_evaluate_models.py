"""
execution/02_train_and_evaluate_models.py
GEDA Mission LiFE Platform — Phase 2 ML Model Training & Benchmarking

Implements:
1. Chronological partition of .tmp/processed_data.csv (80% Train, 20% Holdout Validation).
2. Naive 24h Persistence Baseline (demand at t-24).
3. OLS Linear Regression Baseline.
4. Random Forest Regressor (Non-linear ensemble).
5. XGBoost Regressor (Gradient Boosting Champion).
6. Metrics computation: RMSE, MAE, MAPE on both Overall validation and Peak Hours (18:00-22:00 IST).
7. Residual error audit and bias analysis.
8. Peak-Shifting scenario simulations (15%, 25%, 35% load shifts).
9. Exports complete validation metrics and chart payloads to .tmp/evaluation_results.json.
"""

import sys
import json
import time
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error

# Try importing xgboost with clear messaging if absent
try:
    import xgboost as xgb
except ImportError:
    print("[ERROR] xgboost is not installed. Please run: pip install xgboost", file=sys.stderr)
    sys.exit(1)

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
TMP_DIR = BASE_DIR / ".tmp"
DATA_PATH = TMP_DIR / "processed_data.csv"
OUTPUT_JSON_PATH = TMP_DIR / "evaluation_results.json"


def compute_mape(y_true, y_pred, eps=1e-4):
    """Compute Mean Absolute Percentage Error safely."""
    denom = np.maximum(np.abs(y_true), eps)
    return np.mean(np.abs((y_true - y_pred) / denom)) * 100.0


def evaluate_predictions(y_true, y_pred, is_peak_mask):
    """Calculate overall and peak-specific error metrics."""
    # Overall metrics
    rmse_overall = np.sqrt(mean_squared_error(y_true, y_pred))
    mae_overall = mean_absolute_error(y_true, y_pred)
    mape_overall = compute_mape(y_true, y_pred)

    # Peak hours metrics (18:00 - 22:00 IST)
    y_true_peak = y_true[is_peak_mask]
    y_pred_peak = y_pred[is_peak_mask]

    rmse_peak = np.sqrt(mean_squared_error(y_true_peak, y_pred_peak))
    mae_peak = mean_absolute_error(y_true_peak, y_pred_peak)
    mape_peak = compute_mape(y_true_peak, y_pred_peak)
    # Bias: mean(actual - predicted). Positive = underpredicting peaks; Negative = overpredicting
    residual_bias_peak = np.mean(y_true_peak - y_pred_peak)

    return {
        "overall": {
            "rmse": float(rmse_overall),
            "mae": float(mae_overall),
            "mape": float(mape_overall)
        },
        "peak_hours": {
            "rmse": float(rmse_peak),
            "mae": float(mae_peak),
            "mape": float(mape_peak),
            "bias": float(residual_bias_peak)
        }
    }


def run_pipeline():
    print("=" * 80)
    print("      GEDA MISSION LiFE — PHASE 2: ML MODEL TRAINING & BENCHMARKING      ")
    print("=" * 80)

    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Processed dataset not found at {DATA_PATH}. Run execution/01_download_and_process_data.py first.")

    print(f"\n[1/6] Loading processed dataset: {DATA_PATH.name} ...")
    df = pd.read_csv(DATA_PATH, index_col="timestamp", parse_dates=True)
    print(f"Total records loaded: {len(df):,} hours ({df.index.min()} -> {df.index.max()})")

    # Feature matrix & Target split
    feature_cols = [c for c in df.columns if c not in ["target_demand_kwh", "split"]]
    target_col = "target_demand_kwh"

    train_mask = df["split"] == "train"
    val_mask = df["split"] == "val"

    X_train = df.loc[train_mask, feature_cols]
    y_train = df.loc[train_mask, target_col].values

    X_val = df.loc[val_mask, feature_cols]
    y_val = df.loc[val_mask, target_col].values
    is_peak_val = (X_val["is_peak_hours"] == 1).values

    print(f"Training observations  : {len(X_train):,} ({len(X_train)/len(df):.1%})")
    print(f"Validation observations: {len(X_val):,} ({len(X_val)/len(df):.1%}) [Holdout]")
    print(f"Features in matrix     : {len(feature_cols)} features")

    results = {}
    predictions_dict = {}

    # ---------------------------------------------------------
    # Model 1: Naive 24h Persistence Baseline
    # ---------------------------------------------------------
    print("\n[2/6] Evaluating Model 1: Naive 24-Hour Persistence Baseline (y_t = y_{t-24}) ...")
    t0 = time.time()
    y_pred_naive = X_val["demand_lag_24h"].values
    predictions_dict["naive_24h"] = y_pred_naive
    metrics_naive = evaluate_predictions(y_val, y_pred_naive, is_peak_val)
    metrics_naive["training_time_sec"] = round(time.time() - t0, 3)
    results["Naive_24h_Persistence"] = metrics_naive
    print(f"  -> RMSE: {metrics_naive['overall']['rmse']:.4f} | MAE: {metrics_naive['overall']['mae']:.4f} | MAPE: {metrics_naive['overall']['mape']:.2f}%")

    # ---------------------------------------------------------
    # Model 2: OLS Linear Regression Baseline
    # ---------------------------------------------------------
    print("\n[3/6] Fitting Model 2: OLS Linear Regression Baseline ...")
    t0 = time.time()
    lr_model = LinearRegression()
    lr_model.fit(X_train, y_train)
    fit_time_lr = time.time() - t0
    y_pred_lr = lr_model.predict(X_val)
    predictions_dict["linear_regression"] = y_pred_lr
    metrics_lr = evaluate_predictions(y_val, y_pred_lr, is_peak_val)
    metrics_lr["training_time_sec"] = round(fit_time_lr, 3)
    results["Linear_Regression"] = metrics_lr
    print(f"  -> RMSE: {metrics_lr['overall']['rmse']:.4f} | MAE: {metrics_lr['overall']['mae']:.4f} | MAPE: {metrics_lr['overall']['mape']:.2f}% (Fit: {fit_time_lr:.2f}s)")

    # ---------------------------------------------------------
    # Model 3: Random Forest Regressor
    # ---------------------------------------------------------
    print("\n[4/6] Fitting Model 3: Random Forest Regressor (n_estimators=100, max_depth=14) ...")
    t0 = time.time()
    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=14,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    fit_time_rf = time.time() - t0
    y_pred_rf = rf_model.predict(X_val)
    predictions_dict["random_forest"] = y_pred_rf
    metrics_rf = evaluate_predictions(y_val, y_pred_rf, is_peak_val)
    metrics_rf["training_time_sec"] = round(fit_time_rf, 3)
    results["Random_Forest"] = metrics_rf
    print(f"  -> RMSE: {metrics_rf['overall']['rmse']:.4f} | MAE: {metrics_rf['overall']['mae']:.4f} | MAPE: {metrics_rf['overall']['mape']:.2f}% (Fit: {fit_time_rf:.2f}s)")

    # ---------------------------------------------------------
    # Model 4: XGBoost Regressor (Champion Model)
    # ---------------------------------------------------------
    print("\n[5/6] Fitting Model 4: XGBoost Regressor (n_estimators=180, max_depth=6, lr=0.05) ...")
    t0 = time.time()
    xgb_model = xgb.XGBRegressor(
        n_estimators=180,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        n_jobs=-1
    )
    xgb_model.fit(X_train, y_train)
    fit_time_xgb = time.time() - t0
    y_pred_xgb = xgb_model.predict(X_val)
    predictions_dict["xgboost"] = y_pred_xgb
    metrics_xgb = evaluate_predictions(y_val, y_pred_xgb, is_peak_val)
    metrics_xgb["training_time_sec"] = round(fit_time_xgb, 3)
    results["XGBoost_Regressor"] = metrics_xgb
    print(f"  -> RMSE: {metrics_xgb['overall']['rmse']:.4f} | MAE: {metrics_xgb['overall']['mae']:.4f} | MAPE: {metrics_xgb['overall']['mape']:.2f}% (Fit: {fit_time_xgb:.2f}s)")

    # Feature Importances (XGBoost)
    xgb_importance = dict(zip(feature_cols, [float(v) for v in xgb_model.feature_importances_]))
    sorted_importance = sorted(xgb_importance.items(), key=lambda x: x[1], reverse=True)

    # ---------------------------------------------------------
    # Peak-Shifting Scenario Simulation (Mission LiFE Engine)
    # ---------------------------------------------------------
    print("\n[6/6] Computing Mission LiFE Peak-Shifting Scenarios & Savings ...")
    # Base daily peak consumption per residential household (18:00 - 22:00, 5 hours)
    peak_hours_df = df.loc[df["is_peak_hours"] == 1]
    # Average peak hour demand in kWh * 5 peak hours
    avg_peak_hour_kwh = float(peak_hours_df["target_demand_kwh"].mean())
    daily_peak_kwh_per_hh = avg_peak_hour_kwh * 5.0  # 5 hours: 18, 19, 20, 21, 22

    # Gujarat residential tariff structure
    PEAK_TARIFF_INR_PER_KWH = 6.20       # Normal/Peak slab tariff
    SOLAR_OFFPEAK_TARIFF_INR = 4.10     # Solar daytime net-metered/off-peak rate
    TARIFF_SAVING_INR_PER_KWH = PEAK_TARIFF_INR_PER_KWH - SOLAR_OFFPEAK_TARIFF_INR  # 2.10 INR/kWh
    CEA_EMISSION_FACTOR_KG_CO2 = 0.716   # CEA India Grid CO2 factor per kWh
    DISTRICT_HOUSEHOLDS = 100_000        # Baseline district size (Gandhinagar / Ahmedabad urban block)

    scenarios = {}
    for pct in [15, 25, 35]:
        shift_ratio = pct / 100.0
        daily_shifted_kwh = daily_peak_kwh_per_hh * shift_ratio
        annual_shifted_kwh = daily_shifted_kwh * 365.0
        annual_savings_inr = annual_shifted_kwh * TARIFF_SAVING_INR_PER_KWH
        life_points = int(annual_shifted_kwh * 10)  # 10 LiFE points per shifted kWh

        # District-scale impacts (100k households)
        district_annual_mwh = (annual_shifted_kwh * DISTRICT_HOUSEHOLDS) / 1000.0
        district_peak_shaving_mw = (daily_shifted_kwh / 5.0 * DISTRICT_HOUSEHOLDS) / 1000.0
        district_savings_crores_inr = (annual_savings_inr * DISTRICT_HOUSEHOLDS) / 1e7
        district_co2_offset_tonnes = (annual_shifted_kwh * DISTRICT_HOUSEHOLDS * CEA_EMISSION_FACTOR_KG_CO2) / 1000.0

        scenarios[f"shift_{pct}pct"] = {
            "shift_percentage": pct,
            "household_daily_shifted_kwh": round(daily_shifted_kwh, 3),
            "household_annual_shifted_kwh": round(annual_shifted_kwh, 1),
            "household_annual_savings_inr": round(annual_savings_inr, 2),
            "household_life_points": life_points,
            "district_peak_shaving_mw": round(district_peak_shaving_mw, 2),
            "district_annual_shifted_mwh": round(district_annual_mwh, 1),
            "district_annual_savings_crores_inr": round(district_savings_crores_inr, 2),
            "district_annual_co2_offset_tonnes": round(district_co2_offset_tonnes, 1)
        }

    # 72-hour sample curve for dashboard visualization (3 consecutive validation days)
    val_sample_slice = df.loc[val_mask].iloc[240:312]  # 72 hours
    sample_timestamps = [ts.strftime("%Y-%m-%d %H:%M") for ts in val_sample_slice.index]
    actual_values = [round(float(v), 3) for v in val_sample_slice["target_demand_kwh"].values]
    naive_values = [round(float(v), 3) for v in predictions_dict["naive_24h"][240:312]]
    lr_values = [round(float(v), 3) for v in predictions_dict["linear_regression"][240:312]]
    rf_values = [round(float(v), 3) for v in predictions_dict["random_forest"][240:312]]
    xgb_values = [round(float(v), 3) for v in predictions_dict["xgboost"][240:312]]
    is_peak_list = [int(v) for v in val_sample_slice["is_peak_hours"].values]
    solar_list = [round(float(v), 1) for v in val_sample_slice["solar_irradiance_wm2"].values]

    sample_curve_payload = {
        "timestamps": sample_timestamps,
        "actual_demand_kwh": actual_values,
        "naive_24h_kwh": naive_values,
        "linear_regression_kwh": lr_values,
        "random_forest_kwh": rf_values,
        "xgboost_kwh": xgb_values,
        "is_peak_hours": is_peak_list,
        "solar_irradiance_wm2": solar_list
    }

    # Assemble JSON export payload
    export_payload = {
        "metadata": {
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "dataset_total_hours": len(df),
            "train_hours": len(X_train),
            "validation_hours": len(X_val),
            "features_used": feature_cols,
            "region": "Gandhinagar, Gujarat, India (23.2156 N, 72.6369 E)"
        },
        "models_scorecard": results,
        "feature_importance_ranking": sorted_importance,
        "peak_shifting_scenarios": scenarios,
        "sample_forecast_72h": sample_curve_payload
    }

    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(export_payload, f, indent=2)
    print(f"\n[OK] Successfully exported evaluation metrics and dashboard payloads to: {OUTPUT_JSON_PATH}")

    # Print Formatted Comparison Table
    print_benchmark_table(results)
    print_peak_hour_audit_table(results)
    print_scenarios_table(scenarios, daily_peak_kwh_per_hh)


def print_benchmark_table(results):
    """Print ASCII comparison table of models on holdout validation data."""
    naive_rmse = results["Naive_24h_Persistence"]["overall"]["rmse"]
    naive_mae = results["Naive_24h_Persistence"]["overall"]["mae"]

    print("\n" + "=" * 90)
    print("        GEDA MISSION LiFE — HOLDOUT VALIDATION BENCHMARK (6,840 HOURS)        ")
    print("=" * 90)
    print(f"{'Model Architecture':<26} | {'RMSE (kWh)':<10} | {'MAE (kWh)':<10} | {'MAPE (%)':<9} | {'RMSE Imprv':<11} | {'Fit Time':<8}")
    print("-" * 90)

    for model_name, metrics in results.items():
        rmse = metrics["overall"]["rmse"]
        mae = metrics["overall"]["mae"]
        mape = metrics["overall"]["mape"]
        t_time = metrics["training_time_sec"]

        if model_name == "Naive_24h_Persistence":
            imprv_str = "Baseline"
        else:
            pct_imprv = ((naive_rmse - rmse) / naive_rmse) * 100.0
            imprv_str = f"+{pct_imprv:.1f}%"

        display_name = model_name.replace("_", " ")
        print(f"{display_name:<26} | {rmse:<10.4f} | {mae:<10.4f} | {mape:<8.2f}% | {imprv_str:<11} | {t_time:<6.2f}s")
    print("=" * 90)


def print_peak_hour_audit_table(results):
    """Print targeted peak hours audit table."""
    print("\n" + "=" * 90)
    print("      PEAK-HOUR RESIDUAL ERROR AUDIT (18:00–22:00 IST RESIDENTIAL EVENING SURGE)      ")
    print("=" * 90)
    print(f"{'Model Architecture':<26} | {'Peak RMSE':<10} | {'Peak MAE':<10} | {'Peak MAPE':<10} | {'Residual Bias':<14} | {'Status'}")
    print("-" * 90)

    for model_name, metrics in results.items():
        peak = metrics["peak_hours"]
        bias = peak["bias"]
        status = "Underpredicts" if bias > 0.05 else ("Overpredicts" if bias < -0.05 else "Balanced")
        display_name = model_name.replace("_", " ")
        print(f"{display_name:<26} | {peak['rmse']:<10.4f} | {peak['mae']:<10.4f} | {peak['mape']:<9.2f}% | {bias:<+13.4f} | {status}")
    print("=" * 90)


def print_scenarios_table(scenarios, base_peak_kwh):
    """Print Mission LiFE peak-shifting potential table."""
    print("\n" + "=" * 90)
    print("       MISSION LiFE PEAK-SHIFTING SCENARIOS (APPLIANCE LOAD SHIFT TO SOLAR MIDDAY)    ")
    print(f"       Baseline Evening Peak Demand (18:00-22:00 IST): {base_peak_kwh:.2f} kWh/household/day")
    print("=" * 90)
    print(f"{'Scenario':<12} | {'Daily Shift':<12} | {'Annual Shift':<13} | {'Annual Save':<13} | {'LiFE Pts':<10} | {'District Peak Shave':<20}")
    print("-" * 90)

    for s_name, data in scenarios.items():
        pct = data["shift_percentage"]
        daily = f"{data['household_daily_shifted_kwh']:.2f} kWh"
        annual = f"{data['household_annual_shifted_kwh']:.0f} kWh"
        savings = f"INR {data['household_annual_savings_inr']:,.0f}"
        pts = f"{data['household_life_points']:,} pts"
        mw = f"{data['district_peak_shaving_mw']:.1f} MW ({data['district_annual_savings_crores_inr']:.2f} Cr INR)"
        print(f"{pct}% Shift    | {daily:<12} | {annual:<13} | {savings:<13} | {pts:<10} | {mw:<20}")
    print("=" * 90 + "\n")


if __name__ == "__main__":
    run_pipeline()
