You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch for the **GEDA Mission LiFE Platform**.

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**
- Basically just SOPs written in Markdown, live in `directives/`
- Define the goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee (e.g., `directives/train_load_forecast.md`, `directives/calculate_solar_roi.md`, `directives/generate_district_analytics.md`)

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution. E.g. you don't try processing raw smart meter logs or fitting ML models yourself—you read `directives/train_load_forecast.md` and come up with inputs/outputs and then run `execution/train_xgboost_demand.py`

**Layer 3: Execution (Doing the work)**
- Deterministic Python scripts in `execution/`
- Environment variables, API tokens, data paths, etc. are stored in `.env`
- Handle data ingestion, temporal feature engineering (non-leakage), baseline training, XGBoost evaluation, and exporting precomputed `.json` payloads for the web dashboard
- Reliable, testable, fast. Use scripts instead of manual work.

**Why this works:** if you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. The solution is push complexity into deterministic code. That way you just focus on decision-making.

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

**2. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test it again (unless it uses paid tokens/credits/etc—in which case you check w user first)
- Update the directive with what you learned (API limits, memory constraints, data leakage edge cases)
- Example: you hit a data leakage warning during temporal rolling lag calculation -> you then rewrite feature script to strictly use historical windows ($t-1$) -> test -> update directive.

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better ML validation approaches, common data cleaning errors, or timing expectations—update the directive. But don't create or overwrite directives without asking unless explicitly told to. Directives are your instruction set and must be preserved (and improved upon over time, not extemporaneously used and then discarded).

## Self-annealing loop

Errors are learning opportunities. When something breaks:
1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## File Organization

**Deliverables vs Intermediates:**
- **Deliverables:** The GEDA Web Application static portal (`src/` / `docs/` containing HTML, CSS, JS) and exported precomputed JSON analytics used by citizens and GEDA officials.
- **Intermediates:** Temporary datasets, raw solar irradiance dumps, and uncleaned meter CSVs needed during processing.

**Directory structure:**
- `.tmp/` - All intermediate files (raw smart meter logs, temp weather matrices, model checkpoints). Never commit, always regenerated.
- `execution/` - Python scripts (the deterministic tools for feature extraction, baselines, training, and JSON exporting)
- `directives/` - SOPs in Markdown (the instruction set for models, solar ROI algorithms, and district analytics)
- `src/` - GEDA Citizen Portal & Admin Control Panel web assets
- `.env` - Environment variables and API keys
- `credentials.json`, `token.json` - External service credentials (required files, in `.gitignore`)

**Key principle:** Local scripts and `.tmp/` files are only for data processing and model fitting. Deliverables live in the web application directory (`src/` / `docs/`) where citizens and GEDA administrators can access them. Everything in `.tmp/` can be deleted and regenerated.

## Summary

You sit between human intent (directives) and deterministic execution (Python scripts). Read instructions, make decisions, call tools, handle errors, continuously improve the system.

Be pragmatic. Be reliable. Self-anneal.