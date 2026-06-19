# EcoSphere - Carbon Footprint Tracker & Action Guide

EcoSphere is a premium, static single-page dashboard application that helps individuals calculate, track, and offset their carbon footprint. Designed with glassmorphism aesthetics, custom real-time SVG charting, and an interactive AI-style Eco-Coach.

---

## 🌟 Premium Features

- **Interactive Carbon Calculator**: Smooth sliders to modify Transportation (cars, public transit, flights), Home Energy (electricity, gas, oil), Diet, and Shopping/Recycling outputs.
- **Gaia AI Eco-Coach**: Evaluates carbon inputs in real-time, delivering targeted feedback and challenges.
- **Decadal Net-Zero Line Chart**: Plots custom emission curves from 2026 to 2036 under "Business as Usual" vs "Reduction Path" scenarios.
- **Dynamic SVGs**: Custom rendering engines in JS draw Donut charts and Comparative Bar charts with zero dependencies.
- **Carbon Offset Simulator**: Toggles certified offset investments (e.g. Amazon reforestation, Wind turbines) to see net carbon reduction.
- **Community Leaderboard & Daily Logs**: Action checkboxes and gamified level ranks (Seedling, Carbon Cutter, Forest Guardian, Net-Zero Hero).

---

## 🔬 Emission Equations & Data Criteria

The calculator compiles annual emission metrics (metric tons of CO₂ equivalent, or `t CO₂e`) utilizing standard greenhouse gas metrics:

### 1. Transportation
- **Personal Car**: $Mileage \times Factor$. Factors (in kg CO₂/mile):
  - Petrol: `0.40 kg`
  - Diesel: `0.43 kg`
  - Electric: `0.12 kg` (power grid equivalent)
- **Flights**: Number of flights per year $\times$ `250 kg` (short-medium haul average return flight).
- **Public Transit**: Hours/week $\times$ 52 weeks $\times$ `0.15 kg/hour`.

### 2. Home Energy
- **Grid Electricity**: monthly kWh $\times$ 12 months $\times$ `0.38 kg/kWh`.
- **Natural Gas**: monthly Therms $\times$ 12 months $\times$ `5.3 kg/Therm`.
- **Heating Oil**: monthly Gallons $\times$ 12 months $\times$ `10.25 kg/Gallon`.

### 3. Diet & Lifestyle
- **Food Diet**: Meat-heavy: `2.8 t`, Balanced: `1.7 t`, Vegetarian: `1.2 t`, Vegan: `0.8 t`.
- **Shopping & Waste**: Shopping index baseline + Recycling modifier. Recycling offsets: Recycle All: `-0.4 t`, Most: `-0.25 t`, Some: `-0.1 t`, None: `0 t`.

---

## 🚀 Local Development (No Node Required)

Since this is built with modern static HTML, CSS3, and ES6 modules, no compiler or package installations are required! Run a simple local web server to test:

1. Open PowerShell or command prompt inside this folder.
2. Run Python's built-in HTTP server:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

---

## ⚡ Deployment to Vercel

EcoSphere is optimized for deployment to Vercel out of the box:

### Option A: Connecting a GitHub Repo (Recommended)
1. Push this folder to a GitHub repository.
2. Go to [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
3. Select your GitHub repository.
4. Keep the default settings (Framework Preset: **Other**, Build command: **None**, Output directory: **None**).
5. Click **Deploy**.

### Option B: Deploying via Vercel CLI
1. Open PowerShell inside the project directory.
2. Run:
   ```bash
   vercel
   ```
3. Follow the CLI login prompts and select default answers. Your project will compile and deploy in seconds.
