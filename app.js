/**
 * EcoSphere Pro - App logic & calculations
 */

// Global State
const state = {
  // Calculator inputs
  calculator: {
    carMiles: 6000,
    carFuel: 'petrol', // petrol, diesel, electric, none
    flights: 2, // flights per year
    publicTransit: 5, // hours per week
    electricity: 250, // kWh per month
    gas: 20, // Therms per month
    oil: 10, // Gallons per month
    dietType: 'medium', // heavy, medium, vegetarian, vegan
    wasteRecycle: 'some', // all, most, some, none
    wasteShopping: 'average' // heavy, average, minimal
  },
  // Checklist states
  completedActions: new Set(),
  // Logged custom actions
  loggedActivities: [],
  // Offset simulated purchases
  offsetsPurchased: 0, // kg CO2
  offsetSpentUsd: 0,
  activeView: 'dashboard',
  
  // Pro: Active what-if scenario preset
  activeScenario: 'none', // none, electric, plant-based, absolute-zero
  
  // Pro: Library filter & search
  librarySearch: '',
  libraryFilter: 'all'
};

// Preset constants & emission factors
const EMISSION_FACTORS = {
  car: {
    petrol: 0.40,  // kg CO2 per mile
    diesel: 0.43,  // kg CO2 per mile
    electric: 0.12, // kg CO2 per mile (grid average)
    none: 0
  },
  flight: 250,     // kg CO2 per short/mid return flight
  transit: 0.15 * 52, // kg CO2 per weekly hour per year (approx 7.8 kg/hr-yr)
  electricity: 0.38 * 12, // kg CO2 per monthly kWh per year (4.56 kg/kWh-yr)
  gas: 5.3 * 12,    // kg CO2 per monthly Therm per year (63.6 kg/therm-yr)
  oil: 10.25 * 12,  // kg CO2 per monthly Gallon per year (123 kg/gallon-yr)
  diet: {
    heavy: 2800,    // kg CO2/year
    medium: 1700,   // kg CO2/year
    vegetarian: 1200, // kg CO2/year
    vegan: 800      // kg CO2/year
  },
  waste: {
    shopping: {
      heavy: 1000,
      average: 600,
      minimal: 200
    },
    recycle: {
      all: -400,
      most: -250,
      some: -100,
      none: 0
    }
  }
};

// Pro Checklist Actions (Adding Difficulty, Cost tags, upfront Investment, and Annual Savings)
const CHECKLIST_ACTIONS = [
  { id: 'act_led', name: 'Switch to 100% LED Lightbulbs', impact: 250, category: 'energy', difficulty: 'easy', cost: '$', investment: 30, savings: 120 },
  { id: 'act_bike', name: 'Commute by bicycle or walking (2 days/wk)', impact: 600, category: 'transport', difficulty: 'medium', cost: '$', investment: 0, savings: 340 },
  { id: 'act_meatless', name: 'Adopt Meatless Mondays', impact: 350, category: 'food', difficulty: 'easy', cost: '$', investment: 0, savings: 180 },
  { id: 'act_unplug', name: 'Unplug phantom energy loads', impact: 150, category: 'energy', difficulty: 'easy', cost: '$', investment: 0, savings: 50 },
  { id: 'act_dry', name: 'Line dry laundry instead of tumble drying', impact: 200, category: 'energy', difficulty: 'easy', cost: '$', investment: 0, savings: 80 },
  { id: 'act_thermostat', name: 'Install a smart thermostat', impact: 400, category: 'energy', difficulty: 'medium', cost: '$$', investment: 150, savings: 130 },
  { id: 'act_ev', name: 'Transition to Electric Vehicle (EV)', impact: 2500, category: 'transport', difficulty: 'hard', cost: '$$$', investment: 32000, savings: 1400 },
  { id: 'act_solar', name: 'Install rooftop solar panels', impact: 1800, category: 'energy', difficulty: 'hard', cost: '$$$', investment: 12000, savings: 1100 }
];

// Activity logging templates
const LOGGABLE_ACTIVITIES = [
  { id: 'log_transit', emoji: '🚌', name: 'Took public transit instead of driving', saving: 8.5 },
  { id: 'log_veg', emoji: '🥗', name: 'Eats all-vegetarian today', saving: 4.2 },
  { id: 'log_wash', emoji: '👕', name: 'Cold water wash & line dry', saving: 1.8 },
  { id: 'log_thermo', emoji: '🌡️', name: 'Turned thermostat down by 2°C', saving: 3.5 },
  { id: 'log_led', emoji: '💡', name: 'Replaced a halogen bulb with LED', saving: 12.0 },
  { id: 'log_recycle', emoji: '♻️', name: 'Sorted and recycled home waste', saving: 2.0 }
];

// Pro: Searchable Carbon Library Database
const ECO_LIBRARY_DB = [
  { name: 'Red Meat (Beef/Lamb)', category: 'food', carbonFactor: '27.0 kg CO₂e per kg', description: 'High digestive methane release (enteric fermentation) and land clearance emissions.' },
  { name: 'Poultry (Chicken)', category: 'food', carbonFactor: '6.9 kg CO₂e per kg', description: 'Low digestive gases, highly optimized industrial feed conversion ratio.' },
  { name: 'Dairy Cow Milk', category: 'food', carbonFactor: '3.2 kg CO₂e per liter', description: 'Intense herd farming outputs and feed cultivation carbon cycles.' },
  { name: 'Oat/Almond Milk', category: 'food', carbonFactor: '0.7 kg CO₂e per liter', description: 'Low carbon emissions, though almonds have high localized water stress factors.' },
  { name: 'Coal Electricity grid', category: 'energy', carbonFactor: '0.95 kg CO₂e per kWh', description: 'Very high soot and CO₂ profile from burning solid hydrocarbons.' },
  { name: 'Solar PV Panels', category: 'energy', carbonFactor: '0.04 kg CO₂e per kWh', description: 'Negligible operation footprint; lifecycle calculation captures smelting panel silica.' },
  { name: 'Onshore Wind Grid', category: 'energy', carbonFactor: '0.01 kg CO₂e per kWh', description: 'Lowest environmental impact factor; tracks construction concrete base.' },
  { name: 'Natural Gas Boiler', category: 'energy', carbonFactor: '5.3 kg CO₂e per Therm', description: 'Burns methane gas locally; releases gaseous carbon.' },
  { name: 'Short-Haul Return Flight', category: 'transport', carbonFactor: '0.24 kg CO₂e per passenger mile', description: 'Heavy taxiing and thermal cycles; high atmospheric forcing index.' },
  { name: 'Long-Haul Return Flight', category: 'transport', carbonFactor: '0.15 kg CO₂e per passenger mile', description: 'High fuel burn overall, but cruise phases run at optimal thermodynamic heights.' },
  { name: 'Subway Electric Rail', category: 'transport', carbonFactor: '0.04 kg CO₂e per passenger mile', description: 'Highly optimized passenger load balancing runs on clean rail grids.' },
  { name: 'Single-Driver Petrol Car', category: 'transport', carbonFactor: '0.40 kg CO₂e per mile', description: 'Fossil combustion. Major global carbon source.' },
  { name: 'Electric Car (EV)', category: 'transport', carbonFactor: '0.12 kg CO₂e per mile', description: 'Assumes average US grid power mix; zero tailpipe emissions.' }
];

// Leaderboard Mock Database
const MOCK_LEADERBOARD = [
  { name: 'Sarah Jenkins', avatar: 'SJ', level: 'Eco Warrior', saved: 3420, active: false },
  { name: 'David Miller', avatar: 'DM', level: 'Carbon Cutter', saved: 2150, active: false },
  { name: 'Alex Rivera', avatar: 'AR', level: 'Forest Guardian', saved: 1840, active: false },
  { name: 'Emma Watson', avatar: 'EW', level: 'Sapling', saved: 980, active: false },
  { name: 'Liam Chen', avatar: 'LC', level: 'Seedling', saved: 420, active: false }
];

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromLocalStorage();
  setupNavigation();
  setupCalculatorControls();
  setupActionChecklist();
  setupLogActivities();
  setupOffsetSimulator();
  
  // Pro setups
  setupLibraryControls();
  setupScenarioPresets();
  
  // Set current date UI
  const dateIndicator = document.getElementById('current-date-element');
  if (dateIndicator) {
    const d = new Date();
    dateIndicator.textContent = `Carbon Ledger: ${d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
  }
  
  // Perform initial calculations & rendering
  updateCalculations();
});

// Navigation View Swapping
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      switchView(targetView);
    });
  });
}

function switchView(viewName) {
  state.activeView = viewName;
  
  // Update sidebar active classes
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Switch display elements
  document.querySelectorAll('.view-section').forEach(section => {
    if (section.id === `${viewName}-view`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  // Specific view updates
  if (viewName === 'dashboard') {
    renderDashboardCharts();
  } else if (viewName === 'community') {
    renderCommunityView();
  } else if (viewName === 'learn') {
    renderLibraryTable();
  }
}

// Calculator Event Listeners & Binding
function setupCalculatorControls() {
  const sliders = [
    { id: 'carMiles', stateKey: 'carMiles', outputId: 'val-carMiles' },
    { id: 'flights', stateKey: 'flights', outputId: 'val-flights' },
    { id: 'publicTransit', stateKey: 'publicTransit', outputId: 'val-publicTransit' },
    { id: 'electricity', stateKey: 'electricity', outputId: 'val-electricity' },
    { id: 'gas', stateKey: 'gas', outputId: 'val-gas' },
    { id: 'oil', stateKey: 'oil', outputId: 'val-oil' }
  ];

  sliders.forEach(sliderConfig => {
    const el = document.getElementById(sliderConfig.id);
    const out = document.getElementById(sliderConfig.outputId);
    if (el) {
      el.value = state.calculator[sliderConfig.stateKey];
      out.textContent = formatValueWithUnits(sliderConfig.id, el.value);

      el.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.calculator[sliderConfig.stateKey] = val;
        out.textContent = formatValueWithUnits(sliderConfig.id, val);
        updateCalculations();
      });
    }
  });

  // Radio cards binding (Fuel, Diet, Shopping, Recycling)
  setupRadioGroup('carFuel', 'carFuel');
  setupRadioGroup('dietType', 'dietType');
  setupRadioGroup('wasteShopping', 'wasteShopping');
  setupRadioGroup('wasteRecycle', 'wasteRecycle');
}

function setupRadioGroup(groupName, stateKey) {
  const inputs = document.querySelectorAll(`input[name="${groupName}"]`);
  inputs.forEach(input => {
    if (input.value === state.calculator[stateKey]) {
      input.checked = true;
    }
    input.addEventListener('change', (e) => {
      state.calculator[stateKey] = e.target.value;
      updateCalculations();
    });
  });
}

function formatValueWithUnits(id, val) {
  switch (id) {
    case 'carMiles': return `${val.toLocaleString()} miles/yr`;
    case 'flights': return `${val} flights/yr`;
    case 'publicTransit': return `${val} hrs/wk`;
    case 'electricity': return `${val} kWh/mo`;
    case 'gas': return `${val} Therms/mo`;
    case 'oil': return `${val} Gallons/mo`;
    default: return val;
  }
}

// Pro Action Checklist with Financial ROI detail columns
function setupActionChecklist() {
  const listContainer = document.getElementById('action-plan-checklist');
  if (!listContainer) return;
  
  listContainer.innerHTML = '';
  
  CHECKLIST_ACTIONS.forEach(action => {
    const isChecked = state.completedActions.has(action.id);
    const card = document.createElement('div');
    card.className = `pro-action-card ${isChecked ? 'completed' : ''}`;
    card.id = `card-${action.id}`;
    
    // Payback calculation text
    let paybackText = 'N/A';
    if (action.investment > 0 && action.savings > 0) {
      const years = action.investment / action.savings;
      paybackText = years < 1 ? `${(years * 12).toFixed(0)} mos` : `${years.toFixed(1)} yrs`;
    } else if (action.investment === 0 && action.savings > 0) {
      paybackText = 'Instant';
    }
    
    card.innerHTML = `
      <div class="action-row-left">
        <label class="checkbox-wrapper">
          <input type="checkbox" id="chk-${action.id}" ${isChecked ? 'checked' : ''}>
          <span class="checkbox-custom"></span>
        </label>
        <div class="action-details">
          <span class="action-name ${isChecked ? 'completed' : ''}" id="lbl-${action.id}">${action.name}</span>
          <span class="action-impact">Impact: -${(action.impact / 1000).toFixed(2)} t CO₂e/yr</span>
        </div>
      </div>
      <div>
        <span class="difficulty-badge difficulty-${action.difficulty}">${action.difficulty}</span>
      </div>
      <div>
        <span class="cost-tag">${action.cost}</span>
        <span style="font-size:0.68rem; color:var(--text-dim); display:block; margin-top:2px;">Est: $${action.investment}</span>
      </div>
      <div>
        <span class="savings-tag">+$${action.savings}/yr</span>
        <span style="font-size:0.68rem; color:var(--text-dim); display:block; margin-top:2px;">Payback: ${paybackText}</span>
      </div>
    `;
    
    listContainer.appendChild(card);
    
    const checkbox = card.querySelector(`#chk-${action.id}`);
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.completedActions.add(action.id);
        card.classList.add('completed');
        card.querySelector(`#lbl-${action.id}`).classList.add('completed');
      } else {
        state.completedActions.delete(action.id);
        card.classList.remove('completed');
        card.querySelector(`#lbl-${action.id}`).classList.remove('completed');
      }
      updateCalculations();
    });
  });
}

// Activity Logging logic
function setupLogActivities() {
  const optionsContainer = document.getElementById('log-options-grid');
  if (!optionsContainer) return;
  
  optionsContainer.innerHTML = '';
  
  LOGGABLE_ACTIVITIES.forEach(act => {
    const card = document.createElement('div');
    card.className = 'activity-option-card';
    card.innerHTML = `
      <div class="activity-icon-text">
        <span class="activity-badge-emoji">${act.emoji}</span>
        <div class="activity-name-sub">
          <span class="activity-display-name">${act.name}</span>
          <span class="activity-display-saving">-${act.saving.toFixed(1)} kg CO₂e</span>
        </div>
      </div>
      <button class="btn-log-action" id="btn-log-${act.id}">Log</button>
    `;
    optionsContainer.appendChild(card);
    
    card.querySelector(`#btn-log-${act.id}`).addEventListener('click', () => {
      logActivity(act.name, act.saving, 'activity');
    });
  });
  
  renderLoggedActivities();
}

function logActivity(title, kgSaved, type) {
  const newLog = {
    id: 'log_' + Date.now(),
    title: title,
    carbonSaved: kgSaved,
    type: type,
    timestamp: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  };
  
  state.loggedActivities.unshift(newLog);
  if (state.loggedActivities.length > 20) {
    state.loggedActivities.pop();
  }
  
  saveStateToLocalStorage();
  renderLoggedActivities();
  updateCalculations();
}

function renderLoggedActivities() {
  const list = document.getElementById('logged-actions-list');
  if (!list) return;
  
  if (state.loggedActivities.length === 0) {
    list.innerHTML = `
      <div class="empty-log-state">
        <span class="empty-log-icon">🌿</span>
        <strong>No activities logged yet</strong>
        <span>Log daily green steps or purchase offsets to build carbon reduction credits!</span>
      </div>
    `;
    return;
  }
  
  list.innerHTML = '';
  state.loggedActivities.forEach(entry => {
    const row = document.createElement('div');
    row.className = `log-entry-row ${entry.type === 'offset' ? 'offset-type' : ''}`;
    row.innerHTML = `
      <div class="log-info">
        <span class="log-title">${entry.title}</span>
        <span class="log-date">${entry.timestamp}</span>
      </div>
      <span class="log-saving">-${entry.carbonSaved.toFixed(1)} kg CO₂</span>
    `;
    list.appendChild(row);
  });
}

// Offsets investment simulator
function setupOffsetSimulator() {
  const offsetSlider = document.getElementById('offsetSlider');
  const offsetTargetText = document.getElementById('offsetTargetText');
  const offsetCostText = document.getElementById('offsetCostText');
  
  if (!offsetSlider) return;
  
  offsetSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    const netFootprint = calculateBaseCarbonFootprint();
    const kgToOffset = (netFootprint * (val / 100)) * 1000;
    const costUsd = (kgToOffset / 1000) * 12;
    
    offsetTargetText.textContent = `${val}% (${(kgToOffset / 1000).toFixed(2)} t CO₂e)`;
    offsetCostText.textContent = `$${costUsd.toFixed(2)}`;
  });
  
  const projectsGrid = document.getElementById('offset-projects-container');
  if (!projectsGrid) return;
  
  const PROJECTS = [
    { id: 'proj_reforest', name: 'Amazon Basin Reforestation', costPerTon: 15, efficiency: 'High', img: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=400&q=80', desc: 'Restore biodiverse rainforest ecosystems in Peru to absorb carbon and preserve species.' },
    { id: 'proj_wind', name: 'Rajasthan Clean Wind Power', costPerTon: 10, efficiency: 'Medium', img: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=400&q=80', desc: 'Displace fossil-fuel grids with clean wind energy systems in Rajasthan, India.' },
    { id: 'proj_cook', name: 'Safe Water Clean Cookstoves', costPerTon: 12, efficiency: 'High', img: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80', desc: 'Provide clean cookstoves in East Africa to reduce fuel wood usage and cut local smoke emissions.' }
  ];
  
  projectsGrid.innerHTML = '';
  PROJECTS.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="project-image" style="background-image: url('${proj.img}')"></div>
      <div class="project-content">
        <div class="project-header">
          <span class="project-title">${proj.name}</span>
          <span class="project-price">$${proj.costPerTon}/ton</span>
        </div>
        <p class="project-desc">${proj.desc}</p>
        <div class="project-footer">
          <span class="project-efficiency">Co-Benefits: ${proj.efficiency}</span>
          <button class="btn-buy-offset" data-id="${proj.id}">Invest 1 Ton</button>
        </div>
      </div>
    `;
    projectsGrid.appendChild(card);
    
    card.querySelector(`[data-id="${proj.id}"]`).addEventListener('click', () => {
      state.offsetsPurchased += 1000;
      state.offsetSpentUsd += proj.costPerTon;
      
      logActivity(`Offset: 1 Ton via ${proj.name}`, 1000, 'offset');
      alert(`Thank you for supporting climate action! You have offset 1.0 Ton of carbon through the "${proj.name}" project.`);
    });
  });
}

// Pro: Setup searchable carbon database library
function setupLibraryControls() {
  const searchInput = document.getElementById('lib-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.librarySearch = e.target.value.toLowerCase();
      renderLibraryTable();
    });
  }

  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.libraryFilter = btn.getAttribute('data-filter');
      renderLibraryTable();
    });
  });
}

function renderLibraryTable() {
  const tbody = document.getElementById('library-table-body');
  if (!tbody) return;

  const filtered = ECO_LIBRARY_DB.filter(item => {
    // Category match
    const categoryMatch = state.libraryFilter === 'all' || item.category === state.libraryFilter;
    // Search match
    const text = (item.name + ' ' + item.description).toLowerCase();
    const searchMatch = state.librarySearch === '' || text.includes(state.librarySearch);
    
    return categoryMatch && searchMatch;
  });

  tbody.innerHTML = '';
  
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: var(--text-dim); padding: 2rem;">
          No matching carbon emission factors found.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600;">${item.name}</td>
      <td style="width: 100px;"><span class="difficulty-badge difficulty-easy" style="background:rgba(20,184,166,0.08); color:var(--color-teal); border-color:rgba(20,184,166,0.15)">${item.category}</span></td>
      <td class="coef-val" style="width: 150px; text-align:right;">${item.carbonFactor}</td>
      <td style="color: var(--text-muted); font-size: 0.8rem; max-width: 300px;">${item.description}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Pro: Setup "What-If" Preset Selectors
function setupScenarioPresets() {
  const cards = document.querySelectorAll('.scenario-preset-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      const preset = card.getAttribute('data-scenario');
      state.activeScenario = preset;
      
      calculateAndRenderScenario();
    });
  });
}

function calculateAndRenderScenario() {
  const baseTons = calculateBaseCarbonFootprint();
  let proposedTons = baseTons;

  // Compute what emissions would be in the selected scenario
  if (state.activeScenario === 'electric') {
    // Zero car petrol/diesel (acts like EV grid average: 1500kg for standard driving)
    const EVCarEmissions = state.calculator.carMiles * EMISSION_FACTORS.car.electric;
    const baseCarEmissions = state.calculator.carMiles * EMISSION_FACTORS.car[state.calculator.carFuel];
    
    // Switch utility electricity to wind/solar grid (replaces standard electricity grid factor 0.38 with 0.02)
    const SolarElectricEmissions = state.calculator.electricity * (0.02 * 12);
    const baseElectricEmissions = state.calculator.electricity * EMISSION_FACTORS.electricity;
    
    proposedTons = proposedTons - (baseCarEmissions / 1000) + (EVCarEmissions / 1000) - (baseElectricEmissions / 1000) + (SolarElectricEmissions / 1000);
  } else if (state.activeScenario === 'diet') {
    // Switches food category factor down to 0.8 tons (vegan diet baseline)
    const baseDiet = EMISSION_FACTORS.diet[state.calculator.dietType];
    proposedTons = proposedTons - (baseDiet / 1000) + (800 / 1000);
  } else if (state.activeScenario === 'netzero') {
    // Ideal net-zero: vegan diet (0.8t), zero flights (0), no car (0), renewable energy grid (0.02t), minimalist waste (0.2t)
    const transit = state.calculator.publicTransit * EMISSION_FACTORS.transit;
    proposedTons = (transit + (250 * 0.02 * 12) + 800 + 200) / 1000;
  }

  // Cap proposed footprint minimum at 0.3 tons
  proposedTons = Math.max(0.3, proposedTons);
  
  // Update UI values
  safeSetTextContent('val-scenario-base', `${baseTons.toFixed(1)} t`);
  safeSetTextContent('val-scenario-prop', `${proposedTons.toFixed(1)} t`);

  // Render SVG Scenario Chart
  renderScenarioChart(baseTons, proposedTons);
}

function renderScenarioChart(baseVal, proposedVal) {
  const container = document.getElementById('scenario-chart-container');
  if (!container) return;

  const maxVal = Math.max(16, baseVal);
  const chartHeight = 180;
  const chartWidth = 320;
  const padding = 40;

  const colWidth = (chartWidth - padding * 2) / 3;

  const data = [
    { name: 'Baseline', val: baseVal, color: 'var(--color-amber)' },
    { name: 'Scenario', val: proposedVal, color: 'var(--color-teal)' },
    { name: '1.5°C Goal', val: 2.0, color: 'var(--color-green)' }
  ];

  let bars = '';
  data.forEach((item, idx) => {
    const x = padding + idx * colWidth + (colWidth - 30) / 2;
    const barHeight = (item.val / maxVal) * (chartHeight - 40);
    const y = chartHeight - 20 - barHeight;

    bars += `
      <g>
        <rect 
          x="${x}" y="${y}" width="30" height="${barHeight}" 
          rx="6" 
          fill="${item.color}"
          style="transition: y 0.8s ease-in-out, height 0.8s ease-in-out;"
        />
        <text x="${x + 15}" y="${y - 8}" text-anchor="middle" fill="var(--text-main)" font-size="9" font-weight="600">${item.val.toFixed(1)}t</text>
        <text x="${x + 15}" y="${chartHeight - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="9">${item.name}</text>
      </g>
    `;
  });

  container.innerHTML = `
    <svg class="svg-chart" viewBox="0 0 ${chartWidth} ${chartHeight}">
      <!-- Baseline axis -->
      <line x1="20" y1="${chartHeight - 20}" x2="${chartWidth - 20}" y2="${chartHeight - 20}" stroke="var(--border-glass)" stroke-width="1" />
      ${bars}
    </svg>
  `;
}

// Carbon Footprint Mathematics
function calculateBaseCarbonFootprint() {
  const c = state.calculator;
  
  const carEmissions = c.carMiles * EMISSION_FACTORS.car[c.carFuel];
  const flightEmissions = c.flights * EMISSION_FACTORS.flight;
  const transitEmissions = c.publicTransit * EMISSION_FACTORS.transit;
  const transportTotal = carEmissions + flightEmissions + transitEmissions;
  
  const electricEmissions = c.electricity * EMISSION_FACTORS.electricity;
  const gasEmissions = c.gas * EMISSION_FACTORS.gas;
  const oilEmissions = c.oil * EMISSION_FACTORS.oil;
  const energyTotal = electricEmissions + gasEmissions + oilEmissions;
  
  const dietTotal = EMISSION_FACTORS.diet[c.dietType];
  
  const wasteBase = EMISSION_FACTORS.waste.shopping[c.wasteShopping];
  const recycleOffset = EMISSION_FACTORS.waste.recycle[c.wasteRecycle];
  const wasteTotal = Math.max(100, wasteBase + recycleOffset);
  
  const grandTotalKg = transportTotal + energyTotal + dietTotal + wasteTotal;
  return grandTotalKg / 1000;
}

function calculateCategoryBreakdown() {
  const c = state.calculator;
  
  const transport = (c.carMiles * EMISSION_FACTORS.car[c.carFuel]) + (c.flights * EMISSION_FACTORS.flight) + (c.publicTransit * EMISSION_FACTORS.transit);
  const energy = (c.electricity * EMISSION_FACTORS.electricity) + (c.gas * EMISSION_FACTORS.gas) + (c.oil * EMISSION_FACTORS.oil);
  const food = EMISSION_FACTORS.diet[c.dietType];
  const waste = Math.max(100, EMISSION_FACTORS.waste.shopping[c.wasteShopping] + EMISSION_FACTORS.waste.recycle[c.wasteRecycle]);
  
  return {
    transport: transport / 1000,
    energy: energy / 1000,
    food: food / 1000,
    waste: waste / 1000
  };
}

// State synchronization & overall outputs recalculation
function updateCalculations() {
  const baseTons = calculateBaseCarbonFootprint();
  
  // Pro: Checklist reductions & Financial Savings
  let checklistSavingsKg = 0;
  let cashSavingsUsd = 0;
  state.completedActions.forEach(actionId => {
    const act = CHECKLIST_ACTIONS.find(a => a.id === actionId);
    if (act) {
      checklistSavingsKg += act.impact;
      cashSavingsUsd += act.savings;
    }
  });
  const checklistSavingsTons = checklistSavingsKg / 1000;
  
  // Activity logger savings
  let activitySavingsKg = 0;
  state.loggedActivities.forEach(entry => {
    if (entry.type === 'activity') {
      activitySavingsKg += entry.carbonSaved;
    }
  });
  const activitySavingsTons = activitySavingsKg / 1000;
  
  // Offset purchases
  const offsetTons = state.offsetsPurchased / 1000;
  
  // Net emissions
  const netEmissions = Math.max(0, baseTons - checklistSavingsTons - activitySavingsTons - offsetTons);
  const totalSavings = checklistSavingsTons + activitySavingsTons + offsetTons;
  
  // Update Dashboard Text Elements
  safeSetTextContent('val-total-emissions', baseTons.toFixed(1));
  safeSetTextContent('val-net-emissions', netEmissions.toFixed(1));
  safeSetTextContent('val-total-savings', totalSavings.toFixed(2));
  
  // Update Calculator Summary View Tickers
  safeSetTextContent('val-calc-total', `${baseTons.toFixed(1)} tons`);
  
  // Pro: Update Financial Tickers in Action Plan
  safeSetTextContent('val-cash-savings', `$${cashSavingsUsd.toLocaleString()}`);

  // Pro: Update Carbon Budget Ledger (Target is 3.0 tons)
  const budgetBar = document.getElementById('val-budget-bar');
  const budgetStatusText = document.getElementById('val-budget-status');
  if (budgetBar && budgetStatusText) {
    const percent = Math.min(100, (netEmissions / 8.0) * 100); // 8 tons max scale
    budgetBar.style.width = `${percent}%`;
    
    if (netEmissions <= 3.0) {
      budgetBar.className = 'budget-bar-fill';
      budgetStatusText.textContent = `${(3.0 - netEmissions).toFixed(1)} t budget remaining (Under Target)`;
      budgetStatusText.style.color = 'var(--color-green)';
    } else {
      budgetBar.className = 'budget-bar-fill warning';
      budgetStatusText.textContent = `${(netEmissions - 3.0).toFixed(1)} t over annual target budget!`;
      budgetStatusText.style.color = 'var(--color-red)';
    }
  }

  // Update comparative stats (US Average is 15.5 tons)
  const pctDiff = ((baseTons - 15.5) / 15.5) * 100;
  const compLabel = document.getElementById('comp-average-label');
  const compVal = document.getElementById('comp-average-val');
  if (compLabel && compVal) {
    if (pctDiff > 0) {
      compLabel.textContent = 'ABOVE US AVERAGE';
      compVal.textContent = `+${pctDiff.toFixed(0)}%`;
      compVal.className = 'stat-sub negative';
    } else {
      compLabel.textContent = 'BELOW US AVERAGE';
      compVal.textContent = `${pctDiff.toFixed(0)}%`;
      compVal.className = 'stat-sub positive';
    }
  }

  // Update offset summary panels
  safeSetTextContent('offset-summary-total', offsetTons.toFixed(1));
  safeSetTextContent('offset-summary-spent', `$${state.offsetSpentUsd.toFixed(0)}`);
  
  // Update badges
  checkAndUnlockBadges(baseTons, totalSavings);
  
  // Update Coach Gaia Dialogue
  updateGaiaCoach(baseTons, calculateCategoryBreakdown());
  
  // Re-render visual elements
  renderDashboardCharts();
  
  // Pro: Update scenarios presets
  calculateAndRenderScenario();
  
  // Save State
  saveStateToLocalStorage();
}

function safeSetTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// Badge system check
function checkAndUnlockBadges(baseTons, totalSavingsTons) {
  const badges = [
    { id: 'badge-seed', unlocked: true },
    { id: 'badge-logger', unlocked: state.loggedActivities.filter(a => a.type === 'activity').length >= 3 },
    { id: 'badge-eco', unlocked: totalSavingsTons >= 1.0 },
    { id: 'badge-netzero', unlocked: totalSavingsTons >= baseTons || (state.offsetsPurchased / 1000) >= baseTons }
  ];

  let userLevel = 'Seedling';
  let activeBadgesCount = 0;
  
  badges.forEach(b => {
    const el = document.getElementById(b.id);
    if (el) {
      if (b.unlocked) {
        el.classList.add('unlocked');
        activeBadgesCount++;
      } else {
        el.classList.remove('unlocked');
      }
    }
  });

  if (activeBadgesCount === 2) userLevel = 'Carbon Cutter';
  if (activeBadgesCount === 3) userLevel = 'Forest Guardian';
  if (activeBadgesCount === 4) userLevel = 'Net-Zero Hero';

  safeSetTextContent('user-level-badge', userLevel);
}

// Personalized Gaia AI Coach
function updateGaiaCoach(totalFootprint, breakdown) {
  const speechBubble = document.getElementById('gaia-speech-bubble');
  const suggestionBox = document.getElementById('gaia-suggestions-list');
  if (!speechBubble || !suggestionBox) return;

  let maxCat = 'transport';
  let maxVal = breakdown.transport;
  
  if (breakdown.energy > maxVal) { maxCat = 'energy'; maxVal = breakdown.energy; }
  if (breakdown.food > maxVal) { maxCat = 'food'; maxVal = breakdown.food; }
  if (breakdown.waste > maxVal) { maxCat = 'waste'; maxVal = breakdown.waste; }

  let feedbackText = '';
  let tips = [];

  if (totalFootprint > 12) {
    feedbackText = `Hello! I'm Gaia, your Eco-Coach. Looking at your profile, your annual footprint of **${totalFootprint.toFixed(1)} tons** is quite high. Your primary driver is **${maxCat.toUpperCase()}**, accounting for **${maxVal.toFixed(1)} tons**. We should prioritize cutting this down immediately.`;
  } else if (totalFootprint > 5) {
    feedbackText = `Hi there! I'm Gaia. Your carbon footprint is **${totalFootprint.toFixed(1)} tons**, which is a solid moderate score! Your highest area is **${maxCat.toUpperCase()}**. Making a few tweaks here could push you below the global target of 2.0 tons!`;
  } else {
    feedbackText = `Wonderful! I'm Gaia. You're doing amazing! Your carbon footprint is just **${totalFootprint.toFixed(1)} tons**—extremely close to target climate levels. Let's work on minor habits in your **${maxCat.toUpperCase()}** area to hit complete net-zero!`;
  }

  // Generate action recommendations
  if (maxCat === 'transport') {
    tips = [
      'Try replacing 2 short car trips per week with walking or bicycling.',
      'Consider transit routing: a bus or train ride emits 80% less CO₂ than single-occupancy driving.',
      'Check out hybrid or electric vehicles; they will cut your transportation impact by over 70%!'
    ];
  } else if (maxCat === 'energy') {
    tips = [
      'Install LED light bulbs; they consume 85% less electricity than incandescent ones.',
      'Set your home thermostat 1-2 degrees Celsius cooler in winter to shave off oil/gas footprint.',
      'Look into clean utility options; many power grids now let you subscribe to 100% wind/solar power.'
    ];
  } else if (maxCat === 'food') {
    tips = [
      'Swap beef or lamb for chicken or plant-based proteins just three days a week.',
      'Prioritize locally grown or seasonal produce to eliminate transport emissions ("food miles").',
      'Reduce food waste: Planning meals and freezing leftovers keeps organic waste out of high-methane landfills.'
    ];
  } else {
    tips = [
      'Strive to recycle all glass, cardboards, and clean plastics; this lowers upstream manufacturer footprint.',
      'Practice a "Low-Buy" lifestyle: buying high-quality, durable items reduces direct industrial output.',
      'Compost raw organic vegetable waste at home if space allows.'
    ];
  }

  speechBubble.innerHTML = feedbackText;
  suggestionBox.innerHTML = '';
  tips.forEach(tip => {
    const li = document.createElement('li');
    li.style.marginBottom = '0.65rem';
    li.style.paddingLeft = '1rem';
    li.style.position = 'relative';
    li.innerHTML = `<span style="position:absolute; left:0; color:var(--color-teal)">•</span> ${tip}`;
    suggestionBox.appendChild(li);
  });
}

// Chart Rendering Logic
function renderDashboardCharts() {
  if (state.activeView !== 'dashboard') return;
  
  const baseEmissions = calculateBaseCarbonFootprint();
  const breakdown = calculateCategoryBreakdown();
  
  const radialCircle = document.getElementById('radial-score-circle');
  if (radialCircle) {
    const circ = 314.16;
    const percent = Math.min(100, (baseEmissions / 20) * 100);
    const offset = circ - (percent / 100) * circ;
    radialCircle.style.strokeDasharray = `${circ}`;
    radialCircle.style.strokeDashoffset = `${offset}`;
  }

  renderDonutChart(breakdown);
  renderComparisonChart(baseEmissions);
  renderForecastChart(baseEmissions);
}

function renderDonutChart(breakdown) {
  const container = document.getElementById('donut-chart-container');
  if (!container) return;

  const total = breakdown.transport + breakdown.energy + breakdown.food + breakdown.waste;
  if (total === 0) {
    container.innerHTML = '<span style="color:var(--text-dim)">Complete the calculator to view breakdown.</span>';
    return;
  }

  const pTransport = (breakdown.transport / total) * 100;
  const pEnergy = (breakdown.energy / total) * 100;
  const pFood = (breakdown.food / total) * 100;
  const pWaste = (breakdown.waste / total) * 100;

  safeSetTextContent('leg-transport-val', `${breakdown.transport.toFixed(1)} t (${pTransport.toFixed(0)}%)`);
  safeSetTextContent('leg-energy-val', `${breakdown.energy.toFixed(1)} t (${pEnergy.toFixed(0)}%)`);
  safeSetTextContent('leg-food-val', `${breakdown.food.toFixed(1)} t (${pFood.toFixed(0)}%)`);
  safeSetTextContent('leg-waste-val', `${breakdown.waste.toFixed(1)} t (${pWaste.toFixed(0)}%)`);

  const radius = 60;
  const circ = 2 * Math.PI * radius; // 377
  const center = 100;

  let currentOffset = 0;

  const categories = [
    { name: 'Transport', pct: pTransport, color: 'var(--color-green)' },
    { name: 'Energy', pct: pEnergy, color: 'var(--color-teal)' },
    { name: 'Food', pct: pFood, color: 'var(--color-purple)' },
    { name: 'Waste', pct: pWaste, color: 'var(--color-amber)' }
  ];

  let svgElements = '';
  categories.forEach(cat => {
    if (cat.pct <= 0) return;
    const strokeDash = (cat.pct / 100) * circ;
    const strokeOffset = circ - strokeDash + currentOffset;
    
    svgElements += `
      <circle 
        cx="${center}" cy="${center}" r="${radius}"
        fill="none" 
        stroke="${cat.color}" 
        stroke-width="16"
        stroke-dasharray="${circ}"
        stroke-dashoffset="${strokeOffset}"
        stroke-linecap="round"
        style="transform: rotate(-90deg); transform-origin: ${center}px ${center}px; transition: stroke-dashoffset 0.8s ease-in-out;"
      />
    `;
    currentOffset -= strokeDash;
  });

  container.innerHTML = `
    <svg class="svg-chart" viewBox="0 0 200 200">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="16" />
      ${svgElements}
      <circle cx="${center}" cy="${center}" r="45" fill="var(--bg-dark)" />
      <text x="${center}" y="${center - 5}" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-family="var(--font-body)">TOTAL</text>
      <text x="${center}" y="${center + 12}" text-anchor="middle" fill="var(--text-main)" font-size="16" font-family="var(--font-title)" font-weight="700">${total.toFixed(1)}t</text>
    </svg>
  `;
}

function renderComparisonChart(userVal) {
  const container = document.getElementById('comparison-chart-container');
  if (!container) return;

  const BENCHMARKS = [
    { name: 'You', val: userVal, color: 'url(#gradient-user)' },
    { name: 'India', val: 1.9, color: 'var(--color-teal)' },
    { name: 'Target', val: 2.0, color: 'var(--color-green)' },
    { name: 'EU Avg', val: 8.5, color: 'rgba(255,255,255,0.2)' },
    { name: 'USA Avg', val: 15.5, color: 'var(--color-amber)' }
  ];

  const maxVal = Math.max(16, userVal);
  const chartHeight = 180;
  const chartWidth = 320;
  const padding = 30;

  let bars = '';
  const colWidth = (chartWidth - padding * 2) / BENCHMARKS.length;

  BENCHMARKS.forEach((item, idx) => {
    const x = padding + idx * colWidth + (colWidth - 28) / 2;
    const barHeight = (item.val / maxVal) * (chartHeight - 40);
    const y = chartHeight - 20 - barHeight;

    bars += `
      <g>
        <rect 
          x="${x}" y="${y}" width="28" height="${barHeight}" 
          rx="6" 
          fill="${item.color}"
          style="transition: y 0.8s ease-in-out, height 0.8s ease-in-out;"
        />
        <text x="${x + 14}" y="${y - 8}" text-anchor="middle" fill="var(--text-main)" font-size="9" font-weight="600">${item.val.toFixed(1)}t</text>
        <text x="${x + 14}" y="${chartHeight - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-family="var(--font-body)">${item.name}</text>
      </g>
    `;
  });

  container.innerHTML = `
    <svg class="svg-chart" viewBox="0 0 ${chartWidth} ${chartHeight}">
      <defs>
        <linearGradient id="gradient-user" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-green)" />
          <stop offset="100%" stop-color="var(--color-teal)" />
        </linearGradient>
      </defs>
      <line x1="15" y1="${chartHeight - 20}" x2="${chartWidth - 15}" y2="${chartHeight - 20}" stroke="var(--border-glass)" stroke-width="1" />
      ${bars}
    </svg>
  `;
}

function renderForecastChart(currentEmissions) {
  const container = document.getElementById('forecast-chart-container');
  if (!container) return;

  const years = [2026, 2028, 2030, 2032, 2034, 2036];
  const chartHeight = 180;
  const chartWidth = 320;
  const paddingX = 35;
  const paddingY = 20;

  const startVal = currentEmissions;
  const maxVal = Math.max(16, startVal);

  const bau = years.map((y, idx) => startVal * (1 + (idx * 0.01)));
  const target = years.map((y, idx) => {
    const fraction = idx / (years.length - 1);
    return startVal - (startVal - 2.0) * fraction;
  });

  const getPointsStr = (values) => {
    return values.map((val, idx) => {
      const x = paddingX + (idx / (years.length - 1)) * (chartWidth - paddingX * 2);
      const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
      return `${x},${y}`;
    }).join(' ');
  };

  const pointsBau = getPointsStr(bau);
  const pointsTarget = getPointsStr(target);

  let gridLines = '';
  let yearLabels = '';
  years.forEach((yr, idx) => {
    const x = paddingX + (idx / (years.length - 1)) * (chartWidth - paddingX * 2);
    gridLines += `<line x1="${x}" y1="${paddingY}" x2="${x}" y2="${chartHeight - paddingY}" stroke="rgba(255,255,255,0.02)" stroke-width="1" />`;
    yearLabels += `<text x="${x}" y="${chartHeight - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="8">${yr}</text>`;
  });

  const targetY = chartHeight - paddingY - (2.0 / maxVal) * (chartHeight - paddingY * 2);
  const limitLine = `
    <line x1="${paddingX}" y1="${targetY}" x2="${chartWidth - paddingX}" y2="${targetY}" stroke="rgba(16, 185, 129, 0.2)" stroke-dasharray="4,4" stroke-width="1.5" />
    <text x="${chartWidth - paddingX + 5}" y="${targetY + 3}" fill="var(--color-green)" font-size="7" font-weight="700">1.5°CLimit (2.0t)</text>
  `;

  container.innerHTML = `
    <svg class="svg-chart" viewBox="0 0 ${chartWidth} ${chartHeight}">
      <line x1="${paddingX}" y1="${paddingY}" x2="${paddingX}" y2="${chartHeight - paddingY}" stroke="var(--border-glass)" stroke-width="1" />
      <text x="${paddingX - 6}" y="${paddingY + 3}" text-anchor="end" fill="var(--text-dim)" font-size="7">${maxVal.toFixed(0)}t</text>
      <text x="${paddingX - 6}" y="${chartHeight - paddingY + 3}" text-anchor="end" fill="var(--text-dim)" font-size="7">0t</text>
      ${gridLines}
      ${limitLine}
      <polyline fill="none" stroke="var(--color-amber)" stroke-width="2" stroke-dasharray="2,2" opacity="0.6" points="${pointsBau}" />
      <polyline fill="none" stroke="var(--color-green)" stroke-width="3" points="${pointsTarget}" />
      ${yearLabels}
    </svg>
  `;
}

// Render Community leaderboard list
function renderCommunityView() {
  const tableBody = document.getElementById('leaderboard-body');
  if (!tableBody) return;

  const baseTons = calculateBaseCarbonFootprint();
  
  let totalSavingsKg = 0;
  state.completedActions.forEach(actionId => {
    const act = CHECKLIST_ACTIONS.find(a => a.id === actionId);
    if (act) totalSavingsKg += act.impact;
  });
  state.loggedActivities.forEach(entry => {
    if (entry.type === 'activity') totalSavingsKg += entry.carbonSaved;
  });
  totalSavingsKg += state.offsetsPurchased;
  
  const userScore = totalSavingsKg;

  let currentLevel = 'Seedling';
  const unlockedBadges = document.querySelectorAll('.badge-item.unlocked').length;
  if (unlockedBadges === 2) currentLevel = 'Carbon Cutter';
  if (unlockedBadges === 3) currentLevel = 'Forest Guardian';
  if (unlockedBadges === 4) currentLevel = 'Net-Zero Hero';

  const userProfile = {
    name: 'You (EcoSphere Citizen)',
    avatar: 'U',
    level: currentLevel,
    saved: userScore,
    active: true
  };

  const combined = [...MOCK_LEADERBOARD, userProfile];
  combined.sort((a, b) => b.saved - a.saved);

  tableBody.innerHTML = '';
  combined.forEach((person, idx) => {
    const isGold = idx === 0;
    const isSilver = idx === 1;
    const isBronze = idx === 2;
    
    let rankBadge = idx + 1;
    if (isGold) rankBadge = `<span class="rank-indicator rank-1">1</span>`;
    else if (isSilver) rankBadge = `<span class="rank-indicator rank-2">2</span>`;
    else if (isBronze) rankBadge = `<span class="rank-indicator rank-3">3</span>`;
    else rankBadge = `<span class="rank-indicator">${idx + 1}</span>`;

    const row = document.createElement('tr');
    row.className = `leaderboard-row ${person.active ? 'user-row' : ''}`;
    row.innerHTML = `
      <td style="width: 50px;">${rankBadge}</td>
      <td>
        <div class="leaderboard-user">
          <div class="leaderboard-avatar" style="background: ${person.active ? 'linear-gradient(135deg, var(--color-green), var(--color-teal))' : 'rgba(255,255,255,0.06)'}; color: ${person.active ? '#0b1329' : 'var(--text-main)'}">
            ${person.avatar}
          </div>
          <span style="font-weight: ${person.active ? '700' : '500'}">${person.name}</span>
        </div>
      </td>
      <td><span class="leaderboard-level">${person.level}</span></td>
      <td class="leaderboard-saving">${(person.saved / 1000).toFixed(2)} t CO₂</td>
    `;
    tableBody.appendChild(row);
  });
}

// Local Storage Handlers
function saveStateToLocalStorage() {
  const serializableState = {
    calculator: state.calculator,
    completedActions: Array.from(state.completedActions),
    loggedActivities: state.loggedActivities,
    offsetsPurchased: state.offsetsPurchased,
    offsetSpentUsd: state.offsetSpentUsd
  };
  localStorage.setItem('ecosphere_state_2026', JSON.stringify(serializableState));
}

function loadStateFromLocalStorage() {
  const saved = localStorage.getItem('ecosphere_state_2026');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.calculator) state.calculator = parsed.calculator;
      if (parsed.completedActions) state.completedActions = new Set(parsed.completedActions);
      if (parsed.loggedActivities) state.loggedActivities = parsed.loggedActivities;
      if (parsed.offsetsPurchased !== undefined) state.offsetsPurchased = parsed.offsetsPurchased;
      if (parsed.offsetSpentUsd !== undefined) state.offsetSpentUsd = parsed.offsetSpentUsd;
    } catch (e) {
      console.error('Error parsing localStorage state:', e);
    }
  }
}
