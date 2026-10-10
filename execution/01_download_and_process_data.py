"""
execution/01_download_and_process_data.py
GEDA Mission LiFE Platform — Phase 1 Deterministic Data Ingestion & Processing

Downloads:
1. UCI Individual Household Electric Power Consumption dataset.
2. NASA POWER Hourly Weather & Solar Irradiance for Gandhinagar, Gujarat (Lat: 23.2156, Lon: 72.6369).

Processes:
- Resamples to 1-hour frequency (demand in kWh).
- Cleans missing records via interpolation.
- Constructs strictly non-leaking historical lag features (t-1, t-24, rolling 24h).
- Creates cyclical calendar features (hour, day of week, peak hours).
- Enforces chronological 80/20 train/validation partition.
- Exports cleaned dataset to .tmp/processed_data.csv.
"""

import os
import sys
import json
import zipfile
import urllib.request
import ssl
from pathlib import Path
import pandas as pd
import numpy as np

# Workspace directories
BASE_DIR = Path(__file__).resolve().parent.parent
TMP_DIR = BASE_DIR / ".tmp"
TMP_DIR.mkdir(parents=True, exist_ok=True)

UCI_ZIP_PATH = TMP_DIR / "household_power_consumption.zip"
UCI_TXT_PATH = TMP_DIR / "household_power_consumption.txt"
NASA_JSON_PATH = TMP_DIR / "nasa_power_gandhinagar_hourly.json"
PROCESSED_CSV_PATH = TMP_DIR / "processed_data.csv"

# Gandhinagar, Gujarat coordinates
GANDHINAGAR_LAT = 23.2156
GANDHINAGAR_LON = 72.6369

UCI_URL = "https://archive.ics.uci.edu/static/public/235/individual+household+electric+power+consumption.zip"


def create_insecure_ssl_context():
    """Create an SSL context bypassing expired CA certificates for legacy hosts."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def download_uci_dataset():
    """Download and extract the UCI household power consumption dataset."""
    if UCI_TXT_PATH.exists() and UCI_TXT_PATH.stat().st_size > 1000000:
        print(f"[UCI] Found existing extracted file: {UCI_TXT_PATH.name} ({UCI_TXT_PATH.stat().st_size / 1e6:.1f} MB)")
        return

    if not UCI_ZIP_PATH.exists() or UCI_ZIP_PATH.stat().st_size < 1000000:
        print(f"[UCI] Downloading dataset from {UCI_URL} ...")
        ctx = create_insecure_ssl_context()
        req = urllib.request.Request(UCI_URL, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp, open(UCI_ZIP_PATH, "wb") as f_out:
            total_bytes = 0
            while True:
                chunk = resp.read(1024 * 512)
                if not chunk:
                    break
                f_out.write(chunk)
                total_bytes += len(chunk)
                print(f"\r[UCI] Downloaded: {total_bytes / 1e6:.2f} MB", end="", flush=True)
            print()
        print(f"[UCI] Saved archive to: {UCI_ZIP_PATH}")

    print("[UCI] Extracting archive...")
    with zipfile.ZipFile(UCI_ZIP_PATH, "r") as z:
        z.extractall(TMP_DIR)
    print(f"[UCI] Extraction complete: {UCI_TXT_PATH}")


def fetch_nasa_power_data(start_year=2007, end_year=2010):
    """Fetch hourly weather & solar irradiance from NASA POWER API for Gandhinagar."""
    if NASA_JSON_PATH.exists() and NASA_JSON_PATH.stat().st_size > 100000:
        print(f"[NASA] Found cached NASA POWER data at: {NASA_JSON_PATH.name}")
        with open(NASA_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    print(f"[NASA] Querying NASA POWER API for Gandhinagar ({GANDHINAGAR_LAT}, {GANDHINAGAR_LON}) [{start_year}-{end_year}]...")
    combined_parameters = {
        "ALLSKY_SFC_SW_DWN": {},
        "T2M": {},
        "RH2M": {}
    }

    ctx = create_insecure_ssl_context()
    for yr in range(start_year, end_year + 1):
        start_date = f"{yr}0101"
        end_date = f"{yr}1231"
        url = (
            f"https://power.larc.nasa.gov/api/temporal/hourly/point?"
            f"parameters=T2M,RH2M,ALLSKY_SFC_SW_DWN&community=RE&"
            f"longitude={GANDHINAGAR_LON}&latitude={GANDHINAGAR_LAT}&"
            f"start={start_date}&end={end_date}&format=JSON"
        )
        print(f"[NASA] Fetching year {yr} ...", end=" ", flush=True)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, context=ctx, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                props = data.get("properties", {}).get("parameter", {})
                for k in ["ALLSKY_SFC_SW_DWN", "T2M", "RH2M"]:
                    if k in props:
                        combined_parameters[k].update(props[k])
                print(f"OK ({len(props.get('T2M', {}))} hours)")
        except Exception as e:
            print(f"Error fetching year {yr}: {e}")
            raise e

    with open(NASA_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(combined_parameters, f)
    print(f"[NASA] Successfully cached {len(combined_parameters['T2M'])} hourly records to {NASA_JSON_PATH.name}")
    return combined_parameters


def parse_nasa_to_dataframe(nasa_data):
    """Convert NASA POWER JSON records into an indexed hourly DataFrame."""
    records = []
    t2m_dict = nasa_data.get("T2M", {})
    rh2m_dict = nasa_data.get("RH2M", {})
    solar_dict = nasa_data.get("ALLSKY_SFC_SW_DWN", {})

    all_keys = sorted(t2m_dict.keys())
    for ts_str in all_keys:
        try:
            # Format: YYYYMMDDHH
            dt = pd.to_datetime(ts_str, format="%Y%m%d%H")
            records.append({
                "timestamp": dt,
                "temp_c": t2m_dict.get(ts_str, np.nan),
                "humidity_pct": rh2m_dict.get(ts_str, np.nan),
                "solar_irradiance_wm2": solar_dict.get(ts_str, np.nan)
            })
        except Exception:
            continue

    df_nasa = pd.DataFrame(records)
    df_nasa.set_index("timestamp", inplace=True)
    df_nasa = df_nasa.resample("1h").mean().interpolate(method="time")
    return df_nasa


def process_and_align_datasets():
    """Main ETL pipeline for demand and solar/weather feature assembly."""
    print("\n--- Step 1: Ingesting Data Sources ---")
    download_uci_dataset()
    nasa_data = fetch_nasa_power_data(start_year=2007, end_year=2010)
    df_nasa = parse_nasa_to_dataframe(nasa_data)

    print("\n--- Step 2: Processing UCI Demand Data ---")
    print(f"Loading {UCI_TXT_PATH.name}...")
    df_raw = pd.read_csv(
        UCI_TXT_PATH,
        sep=";",
        na_values=["?", "NA", ""],
        low_memory=False,
        usecols=["Date", "Time", "Global_active_power", "Voltage"]
    )
    print(f"Raw minute-level records: {len(df_raw):,}")

    print("Parsing datetime index...")
    df_raw["datetime"] = pd.to_datetime(
        df_raw["Date"] + " " + df_raw["Time"],
        format="%d/%m/%Y %H:%M:%S",
        errors="coerce"
    )
    df_raw.dropna(subset=["datetime"], inplace=True)
    df_raw.set_index("datetime", inplace=True)

    # Convert minute kW active power to hourly consumption (kWh)
    # Average kW over 1 hour = kWh consumed in that hour
    print("Resampling to 1-hour intervals (kW mean -> kWh)...")
    df_hourly = df_raw[["Global_active_power", "Voltage"]].resample("1h").mean()
    df_hourly.rename(columns={"Global_active_power": "demand_kwh", "Voltage": "voltage_v"}, inplace=True)

    # Impute missing values with forward-fill and linear interpolation
    missing_count = df_hourly["demand_kwh"].isna().sum()
    print(f"Missing hourly demand values before imputation: {missing_count} ({missing_count / len(df_hourly):.2%})")
    df_hourly["demand_kwh"] = df_hourly["demand_kwh"].interpolate(method="time", limit=6).bfill()
    df_hourly["voltage_v"] = df_hourly["voltage_v"].interpolate(method="time", limit=6).bfill()

    print("\n--- Step 3: Aligning Demand and Gujarat Weather/Solar Series ---")
    # Join on matching timestamp
    df_merged = df_hourly.join(df_nasa, how="inner")
    print(f"Overlapping hourly records: {len(df_merged):,} (from {df_merged.index.min()} to {df_merged.index.max()})")

    print("\n--- Step 4: Strict Non-Leakage Temporal Feature Engineering ---")
    df_feat = pd.DataFrame(index=df_merged.index)
    
    # Target at timestamp t
    df_feat["target_demand_kwh"] = df_merged["demand_kwh"]

    # Calendar & Cyclical features (known at forecast time)
    df_feat["hour"] = df_feat.index.hour
    df_feat["day_of_week"] = df_feat.index.dayofweek
    df_feat["month"] = df_feat.index.month
    df_feat["is_weekend"] = (df_feat["day_of_week"] >= 5).astype(int)
    # Gujarat peak residential window: 18:00 to 22:00 (6 PM - 10 PM)
    df_feat["is_peak_hours"] = ((df_feat["hour"] >= 18) & (df_feat["hour"] <= 22)).astype(int)

    # Strict historical lags (t-1, t-24) to guarantee zero lookahead leakage
    # Lag 1: value at previous hour (t-1)
    df_feat["demand_lag_1h"] = df_merged["demand_kwh"].shift(1)
    # Lag 24: value at same hour yesterday (t-24)
    df_feat["demand_lag_24h"] = df_merged["demand_kwh"].shift(24)
    # Rolling 24-hour mean ending strictly at t-1
    df_feat["demand_rolling_mean_24h"] = df_merged["demand_kwh"].shift(1).rolling(24).mean()
    # Rolling 24-hour std ending strictly at t-1
    df_feat["demand_rolling_std_24h"] = df_merged["demand_kwh"].shift(1).rolling(24).std().bfill()

    # Weather & Solar historical lags
    df_feat["solar_irradiance_wm2"] = df_merged["solar_irradiance_wm2"]
    df_feat["solar_lag_1h"] = df_merged["solar_irradiance_wm2"].shift(1)
    df_feat["solar_lag_24h"] = df_merged["solar_irradiance_wm2"].shift(24)

    df_feat["temp_c"] = df_merged["temp_c"]
    df_feat["temp_lag_1h"] = df_merged["temp_c"].shift(1)
    
    df_feat["humidity_pct"] = df_merged["humidity_pct"]
    df_feat["humidity_lag_1h"] = df_merged["humidity_pct"].shift(1)

    # Drop warm-up lag rows (first 24 hours)
    initial_len = len(df_feat)
    df_feat.dropna(inplace=True)
    print(f"Dropped {initial_len - len(df_feat)} initial warm-up lag records. Remaining: {len(df_feat):,}")

    print("\n--- Step 5: Chronological 80/20 Train/Validation Split ---")
    df_feat.sort_index(inplace=True)
    split_index = int(len(df_feat) * 0.8)
    
    df_feat["split"] = "train"
    df_feat.iloc[split_index:, df_feat.columns.get_loc("split")] = "val"

    train_count = (df_feat["split"] == "train").sum()
    val_count = (df_feat["split"] == "val").sum()
    print(f"Train set: {train_count:,} records ({train_count / len(df_feat):.1%})")
    print(f"Val set:   {val_count:,} records ({val_count / len(df_feat):.1%})")

    print(f"\n--- Step 6: Exporting Clean Dataset to {PROCESSED_CSV_PATH} ---")
    df_feat.to_csv(PROCESSED_CSV_PATH, index=True, index_label="timestamp")
    print(f"Exported successfully! File size: {PROCESSED_CSV_PATH.stat().st_size / 1e6:.2f} MB")

    return df_feat


def print_summary_report(df):
    """Print structured summary table of features, split distributions, and metrics."""
    train_df = df[df["split"] == "train"]
    val_df = df[df["split"] == "val"]
    
    peak_mask = df["is_peak_hours"] == 1
    peak_demand = df.loc[peak_mask, "target_demand_kwh"]
    offpeak_demand = df.loc[~peak_mask, "target_demand_kwh"]

    print("\n" + "=" * 76)
    print("           GEDA MISSION LiFE — DATASET PIPELINE SUMMARY REPORT           ")
    print("=" * 76)
    
    print("\n[TEMPORAL BOUNDARIES]")
    print(f"  • Start Timestamp : {df.index.min().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  • End Timestamp   : {df.index.max().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  • Total Hours     : {len(df):,} hours ({len(df)/24:.1f} days)")

    print("\n[CHRONOLOGICAL SPLIT]")
    print(f"  • Train Hours     : {len(train_df):,} ({len(train_df)/len(df):.1%}) [{train_df.index.min().date()} -> {train_df.index.max().date()}]")
    print(f"  • Validation Hours: {len(val_df):,} ({len(val_df)/len(df):.1%}) [{val_df.index.min().date()} -> {val_df.index.max().date()}]")

    print("\n[FEATURE MATRIX SCHEMA] (Total: 17 columns)")
    feature_cols = [c for c in df.columns if c not in ["target_demand_kwh", "split"]]
    for idx, col in enumerate(feature_cols, 1):
        sample_val = df[col].iloc[100]
        dtype = str(df[col].dtype)
        print(f"  {idx:2d}. {col:<26} [{dtype:<7}] (e.g., {sample_val:.2f} if numeric)")

    print("\n[TARGET DISTRIBUTION: target_demand_kwh (Hourly Electricity Consumed)]")
    print(f"  • Mean            : {df['target_demand_kwh'].mean():.4f} kWh")
    print(f"  • Std Dev         : {df['target_demand_kwh'].std():.4f} kWh")
    print(f"  • Min             : {df['target_demand_kwh'].min():.4f} kWh")
    print(f"  • 25th Percentile : {df['target_demand_kwh'].quantile(0.25):.4f} kWh")
    print(f"  • Median (50th)   : {df['target_demand_kwh'].median():.4f} kWh")
    print(f"  • 75th Percentile : {df['target_demand_kwh'].quantile(0.75):.4f} kWh")
    print(f"  • Max             : {df['target_demand_kwh'].max():.4f} kWh")

    print("\n[PEAK VS OFF-PEAK DEMAND (Gujarat Residential 18:00 - 22:00 IST)]")
    print(f"  • Peak Hours Mean Demand    : {peak_demand.mean():.4f} kWh (Count: {len(peak_demand):,})")
    print(f"  • Off-Peak Hours Mean Demand: {offpeak_demand.mean():.4f} kWh (Count: {len(offpeak_demand):,})")
    peak_diff_pct = (peak_demand.mean() - offpeak_demand.mean()) / offpeak_demand.mean() * 100
    print(f"  • Peak Surge Over Baseline  : +{peak_diff_pct:.2f}%")

    print("\n[METEOROLOGY & SOLAR PROFILE (Gandhinagar Coordinates: 23.2156 N, 72.6369 E)]")
    print(f"  • Solar Irradiance Mean     : {df['solar_irradiance_wm2'].mean():.2f} W/m² (Max: {df['solar_irradiance_wm2'].max():.2f} W/m²)")
    print(f"  • Ambient Temperature Mean  : {df['temp_c'].mean():.2f} °C (Min: {df['temp_c'].min():.2f} °C, Max: {df['temp_c'].max():.2f} °C)")
    print(f"  • Relative Humidity Mean    : {df['humidity_pct'].mean():.2f} %")
    print("=" * 76 + "\n")


if __name__ == "__main__":
    try:
        processed_df = process_and_align_datasets()
        print_summary_report(processed_df)
    except Exception as e:
        print(f"\n[FATAL ERROR in data pipeline]: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
