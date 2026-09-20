# Sustainability Score Optimization & Evaluation (Phase 9a Task A)

This document presents hand-computed scores for three distinct user profiles across three scoring formula options to evaluate fairness, sensitivity, and motivation.

---

## 1. Profiles & Benchmark Consumption

### Reference Household Benchmark
- **Ref Water**: 250 L/day
- **Ref Energy**: 6.0 kWh/day

### User Profiles
1. **Default Profile** (Household = 2, Shower = 10 min electric, AC = 4h, Fan = 8h, Laptop = 8h, Laundry = 3 loads/week topLoad):
   - **Water**: 164.29 L/day (`ratio_water = 164.29 / 250 = 0.6572`)
   - **Energy**: 8.699 kWh/day (`ratio_energy = 8.699 / 6.0 = 1.4498`)
2. **Low-Use Profile** (Household = 4, Shower = 5 min electric, AC = 0h, Fan = 4h, Laptop = 4h, Laundry = 1 load/week frontLoad):
   - **Water**: 49.29 L/day (`ratio_water = 49.29 / 250 = 0.1972`)
   - **Energy**: 1.621 kWh/day (`ratio_energy = 1.621 / 6.0 = 0.2702`)
3. **High-Use Profile** (Household = 1, Shower = 20 min electric, AC = 12h, Fan = 12h, Laptop = 10h, Laundry = 7 loads/week topLoad):
   - **Water**: 240.00 L/day (`ratio_water = 240.00 / 250 = 0.9600`)
   - **Energy**: 23.360 kWh/day (`ratio_energy = 23.360 / 6.0 = 3.8933`)

---

## 2. Formula Options Analyzed

### Option 1: Current Formula (Anchored @ ratio 0.5 = 100, 1.0 = 50, 1.5+ = 0)
- `score = clamp(100 - (ratio - 0.5) * 100, 0, 100)`

### Option 2: Raised Reference (Ref Water = 300 L, Ref Energy = 10 kWh)
- `score = clamp(100 - (ratio - 0.5) * 100, 0, 100)` using raised benchmarks.

### Option 3: Softer Bands (Non-linear Logistic / Smooth Decay)
- `score = clamp(100 / (1 + (ratio / 1.0)^1.8), 0, 100)`

---

## 3. Hand-Computed Results Table

| Profile | Resource | Option 1 (Current) | Option 2 (Raised Ref) | Option 3 (Softer Bands) |
| :--- | :--- | :---: | :---: | :---: |
| **Default Profile** | Water | 84.3 | 94.8 | 66.8 |
| | Energy | 5.0 | 55.0 | 33.6 |
| | **Overall** | **44.7** | **74.9** | **50.2** |
| **Low-Use Profile** | Water | 100.0 | 100.0 | 95.8 |
| | Energy | 100.0 | 100.0 | 91.5 |
| | **Overall** | **100.0** | **100.0** | **93.7** |
| **High-Use Profile** | Water | 54.0 | 70.0 | 51.9 |
| | Energy | 0.0 | 0.0 | 8.8 |
| | **Overall** | **27.0** | **35.0** | **30.4** |

---

## 4. Analysis & Recommendation

### Key Findings
1. **Option 1 (Current)** penalizes realistic energy consumption harshly (Option 1 gives 5.0 for default profile energy) because typical household split-AC usage exceeds 6.0 kWh/day quickly.
2. **Option 2 (Raised Reference)** increases scores across all profiles but distorts relative water efficiency comparisons.
3. **Option 3 (Softer Bands)** provides smooth, continuous feedback:
   - Low-use users achieve ~94 (encouraging further improvement without capping trivially at 100).
   - Default users achieve ~50 (a balanced baseline score).
   - High-use users receive ~30 (clear motivation to reduce without hitting a hard flat 0 floor too early).

### Recommendation
**(Recommended) Adopt Option 3 (Softer Bands)** in Phase 9b. It provides smooth, encouraging scoring gradients while maintaining distinction between low, typical, and high consumption.
