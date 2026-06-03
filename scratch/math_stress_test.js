const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. Read the HTML file and extract the main script block
const htmlPath = path.resolve(__dirname, '../economic-tasks.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let scriptCode = '';
while ((match = scriptRegex.exec(html)) !== null) {
  if (match[1].includes('function ci()')) {
    scriptCode = match[1];
    break;
  }
}

if (!scriptCode) {
  console.error("Error: Could not extract script containing function ci() from economic-tasks.html");
  process.exit(1);
}

// 2. Set up the Mock DOM environment
const domData = {};
const writtenData = {};

class MockElement {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.classList = {
      add: (c) => {},
      remove: (c) => {},
      toggle: (c, cond) => {},
      contains: (c) => false
    };
  }
  get value() {
    return domData[this.id] !== undefined ? String(domData[this.id]) : '';
  }
  set value(val) {
    domData[this.id] = val;
  }
  get textContent() {
    return writtenData[this.id]?.textContent || '';
  }
  set textContent(val) {
    if (!writtenData[this.id]) writtenData[this.id] = {};
    writtenData[this.id].textContent = val;
  }
  get innerHTML() {
    return writtenData[this.id]?.innerHTML || '';
  }
  set innerHTML(val) {
    if (!writtenData[this.id]) writtenData[this.id] = {};
    writtenData[this.id].innerHTML = val;
  }
  get innerText() {
    return writtenData[this.id]?.innerText || '';
  }
  set innerText(val) {
    if (!writtenData[this.id]) writtenData[this.id] = {};
    writtenData[this.id].innerText = val;
  }
}

const getElementById = (id) => {
  if (!elements[id]) {
    elements[id] = new MockElement(id);
  }
  return elements[id];
};

const elements = {};

const documentMock = {
  getElementById,
  querySelectorAll: (selector) => {
    // Return dummy elements that support classList toggles
    return [new MockElement('dummy')];
  },
  querySelector: (selector) => {
    return new MockElement('dummy');
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

const locationMock = {
  hash: '',
  replace: () => {}
};

const historyMock = {
  replaceState: () => {}
};

const windowMock = {
  addEventListener: () => {},
  removeEventListener: () => {},
  location: locationMock,
  history: historyMock
};

// Mock Chart.js
const ChartMock = class {
  constructor(el, cfg) {
    this.el = el;
    this.cfg = cfg;
    if (!writtenData.charts) writtenData.charts = {};
    writtenData.charts[el.id || el] = cfg;
  }
  destroy() {}
};
ChartMock.defaults = {
  color: '',
  borderColor: '',
  font: { family: '' }
};

// 3. Create context for execution
const contextObject = {
  console: {
    log: () => {}, // suppress logs from script
    error: console.error,
    warn: console.warn
  },
  document: documentMock,
  window: windowMock,
  location: locationMock,
  history: historyMock,
  Chart: ChartMock,
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  Math,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  Array,
  Object,
  String,
  Number
};

const context = vm.createContext(contextObject);

// Run the script to initialize all variables and functions in context
try {
  vm.runInContext(scriptCode, context);
} catch (e) {
  console.error("Error during initial script load:", e);
  process.exit(1);
}

// Helper to set DOM values
function setInputs(inputs) {
  for (const [id, val] of Object.entries(inputs)) {
    getElementById(id).value = val;
  }
}

// Helper to read DOM outputs
function getOutputs(ids) {
  const outs = {};
  for (const id of ids) {
    const el = elements[id];
    outs[id] = el ? {
      textContent: el.textContent,
      innerHTML: el.innerHTML,
      value: el.value
    } : null;
  }
  return outs;
}

const results = {};

// Test suite runner
function runTest(funcName, inputs, outputIds) {
  setInputs(inputs);
  // Clear written data for the targets
  for (const id of outputIds) {
    if (writtenData[id]) delete writtenData[id];
  }
  if (writtenData.charts) delete writtenData.charts;

  let error = null;
  let executionTime = 0;
  const start = Date.now();
  try {
    context[funcName]();
    executionTime = Date.now() - start;
  } catch (e) {
    error = e.message;
    executionTime = Date.now() - start;
  }

  const outs = getOutputs(outputIds);
  const chartData = writtenData.charts ? JSON.parse(JSON.stringify(writtenData.charts)) : null;

  return {
    inputs,
    outputs: outs,
    chart: chartData,
    error,
    executionTime
  };
}

// Define stress tests for each function
results.ci = [
  { name: 'Normal', inputs: { c_pv: 50000, c_r: 12, c_n: 5, c_m: 4 }, outputs: ['r_fv', 'r_int', 'r_ear', 'r_mult', 'r_r72', 't_ci'] },
  { name: 'Zero Principal', inputs: { c_pv: 0, c_r: 12, c_n: 5, c_m: 4 }, outputs: ['r_fv', 'r_int', 'r_ear', 'r_mult', 'r_r72', 't_ci'] },
  { name: 'Zero Rate', inputs: { c_pv: 50000, c_r: 0, c_n: 5, c_m: 4 }, outputs: ['r_fv', 'r_int', 'r_ear', 'r_mult', 'r_r72', 't_ci'] },
  { name: 'Zero Compounding m=0 (Div by Zero)', inputs: { c_pv: 50000, c_r: 12, c_n: 5, c_m: 0 }, outputs: ['r_fv', 'r_int', 'r_ear', 'r_mult', 'r_r72', 't_ci'] },
  { name: 'Negative Compounding m=-1', inputs: { c_pv: 50000, c_r: 12, c_n: 5, c_m: -1 }, outputs: ['r_fv', 'r_int', 'r_ear', 'r_mult', 'r_r72', 't_ci'] },
  { name: 'Negative Rate r=-12', inputs: { c_pv: 50000, c_r: -12, c_n: 5, c_m: 4 }, outputs: ['r_fv', 'r_int', 'r_ear', 'r_mult', 'r_r72', 't_ci'] },
  { name: 'NaN inputs', inputs: { c_pv: 'NaN', c_r: 'NaN', c_n: 'NaN', c_m: 'NaN' }, outputs: ['r_fv', 'r_int', 'r_ear', 'r_mult', 'r_r72', 't_ci'] },
  { name: 'Extremely Large n=10000 (Hang check)', inputs: { c_pv: 50000, c_r: 12, c_n: 10000, c_m: 4 }, outputs: ['r_fv', 'r_int', 'r_ear', 'r_mult', 'r_r72', 't_ci'] }
];

results.an = [
  { name: 'Normal', inputs: { a_pv: 300000, a_r: 18, a_n: 10, a_dp: 20 }, outputs: ['r_apay', 'r_atot', 'r_aover', 'r_abody', 'r_apct', 't_an'] },
  { name: 'Zero inputs (Zero Loan & Rate)', inputs: { a_pv: 0, a_r: 0, a_n: 5, a_dp: 0 }, outputs: ['r_apay', 'r_atot', 'r_aover', 'r_abody', 'r_apct', 't_an'] },
  { name: 'Zero Years (N=0, Div by Zero)', inputs: { a_pv: 300000, a_r: 18, a_n: 0, a_dp: 20 }, outputs: ['r_apay', 'r_atot', 'r_aover', 'r_abody', 'r_apct', 't_an'] },
  { name: 'Negative Years n=-5', inputs: { a_pv: 300000, a_r: 18, a_n: -5, a_dp: 20 }, outputs: ['r_apay', 'r_atot', 'r_aover', 'r_abody', 'r_apct', 't_an'] },
  { name: 'Over 100% Downpayment dp=120%', inputs: { a_pv: 300000, a_r: 18, a_n: 10, a_dp: 120 }, outputs: ['r_apay', 'r_atot', 'r_aover', 'r_abody', 'r_apct', 't_an'] },
  { name: 'NaN inputs', inputs: { a_pv: 'NaN', a_r: 'NaN', a_n: 'NaN', a_dp: 'NaN' }, outputs: ['r_apay', 'r_atot', 'r_aover', 'r_abody', 'r_apct', 't_an'] },
  { name: 'Large Years n=1000', inputs: { a_pv: 300000, a_r: 18, a_n: 1000, a_dp: 20 }, outputs: ['r_apay', 'r_atot', 'r_aover', 'r_abody', 'r_apct', 't_an'] }
];

results.calcNPV = [
  { name: 'Normal', inputs: { n_ic: 500, n_r: 15, n_cf1: 80, n_cf2: 120, n_cf3: 150, n_cf4: 180, n_cf5: 200, n_cf6: 200 }, outputs: ['r_npv', 'r_npi', 'r_irr', 'r_ndec', 't_npv', 's_npv'] },
  { name: 'Zero Investment ic=0', inputs: { n_ic: 0, n_r: 15, n_cf1: 80, n_cf2: 120, n_cf3: 150, n_cf4: 180, n_cf5: 200, n_cf6: 200 }, outputs: ['r_npv', 'r_npi', 'r_irr', 'r_ndec', 't_npv', 's_npv'] },
  { name: 'Negative Investment ic=-100', inputs: { n_ic: -100, n_r: 15, n_cf1: 80, n_cf2: 120, n_cf3: 150, n_cf4: 180, n_cf5: 200, n_cf6: 200 }, outputs: ['r_npv', 'r_npi', 'r_irr', 'r_ndec', 't_npv', 's_npv'] },
  { name: 'Rate r=-100 (Div by Zero in df)', inputs: { n_ic: 500, n_r: -100, n_cf1: 80, n_cf2: 120, n_cf3: 150, n_cf4: 180, n_cf5: 200, n_cf6: 200 }, outputs: ['r_npv', 'r_npi', 'r_irr', 'r_ndec', 't_npv', 's_npv'] },
  { name: 'All positive CF (IRR should be NaN/infinite)', inputs: { n_ic: -100, n_r: 15, n_cf1: 80, n_cf2: 120, n_cf3: 150, n_cf4: 180, n_cf5: 200, n_cf6: 200 }, outputs: ['r_npv', 'r_npi', 'r_irr', 'r_ndec', 't_npv', 's_npv'] },
  { name: 'NaN inputs', inputs: { n_ic: 'NaN', n_r: 'NaN', n_cf1: 'NaN', n_cf2: 'NaN', n_cf3: 'NaN', n_cf4: 'NaN', n_cf5: 'NaN', n_cf6: 'NaN' }, outputs: ['r_npv', 'r_npi', 'r_irr', 'r_ndec', 't_npv', 's_npv'] }
];

results.dep = [
  { name: 'Normal', inputs: { d_cv: 500, d_sv: 50, d_n: 8, d_k: 2 }, outputs: ['r_dsl', 'r_drate', 'r_dtot', 'r_dres', 't_dep'] },
  { name: 'Zero years n=0 (Div by Zero)', inputs: { d_cv: 500, d_sv: 50, d_n: 0, d_k: 2 }, outputs: ['r_dsl', 'r_drate', 'r_dtot', 'r_dres', 't_dep'] },
  { name: 'Negative years n=-5', inputs: { d_cv: 500, d_sv: 50, d_n: -5, d_k: 2 }, outputs: ['r_dsl', 'r_drate', 'r_dtot', 'r_dres', 't_dep'] },
  { name: 'Zero Cost cv=0 (Div by Zero in rate)', inputs: { d_cv: 0, d_sv: 50, d_n: 8, d_k: 2 }, outputs: ['r_dsl', 'r_drate', 'r_dtot', 'r_dres', 't_dep'] },
  { name: 'Salvage value > Cost sv=600', inputs: { d_cv: 500, d_sv: 600, d_n: 8, d_k: 2 }, outputs: ['r_dsl', 'r_drate', 'r_dtot', 'r_dres', 't_dep'] },
  { name: 'NaN inputs', inputs: { d_cv: 'NaN', d_sv: 'NaN', d_n: 'NaN', d_k: 'NaN' }, outputs: ['r_dsl', 'r_drate', 'r_dtot', 'r_dres', 't_dep'] },
  { name: 'Large Years n=10000 (Hang check)', inputs: { d_cv: 500, d_sv: 50, d_n: 10000, d_k: 2 }, outputs: ['r_dsl', 'r_drate', 'r_dtot', 'r_dres', 't_dep'] }
];

results.be = [
  { name: 'Normal', inputs: { b_fc: 80000, b_p: 800, b_vc: 450, b_q: 400 }, outputs: ['r_bq', 'r_bs', 'r_bm', 'r_bp', 'r_bpl', 'r_dol', 't_be'] },
  { name: 'Price equals VC (cm=0)', inputs: { b_fc: 80000, b_p: 800, b_vc: 800, b_q: 400 }, outputs: ['r_bq', 'r_bs', 'r_bm', 'r_bp', 'r_bpl', 'r_dol', 't_be'] },
  { name: 'Price less than VC (cm<0)', inputs: { b_fc: 80000, b_p: 500, b_vc: 800, b_q: 400 }, outputs: ['r_bq', 'r_bs', 'r_bm', 'r_bp', 'r_bpl', 'r_dol', 't_be'] },
  { name: 'Zero price p=0', inputs: { b_fc: 80000, b_p: 0, b_vc: 450, b_q: 400 }, outputs: ['r_bq', 'r_bs', 'r_bm', 'r_bp', 'r_bpl', 'r_dol', 't_be'] },
  { name: 'Zero volume q=0', inputs: { b_fc: 80000, b_p: 800, b_vc: 450, b_q: 0 }, outputs: ['r_bq', 'r_bs', 'r_bm', 'r_bp', 'r_bpl', 'r_dol', 't_be'] },
  { name: 'Close to zero contribution margin (bq explodes)', inputs: { b_fc: 80000, b_p: 800.0001, b_vc: 800, b_q: 400 }, outputs: ['r_bq', 'r_bs', 'r_bm', 'r_bp', 'r_bpl', 'r_dol', 't_be'] },
  { name: 'NaN inputs', inputs: { b_fc: 'NaN', b_p: 'NaN', b_vc: 'NaN', b_q: 'NaN' }, outputs: ['r_bq', 'r_bs', 'r_bm', 'r_bp', 'r_bpl', 'r_dol', 't_be'] }
];

results.rp = [
  { name: 'Normal', inputs: { rp_rev: 8500, rp_np: 1200, rp_a: 12000, rp_e: 7000, rp_eb: 2100, rp_cg: 5800 }, outputs: ['rr_roa', 'rr_roe', 'rr_ros', 'rr_em', 't_dupont', 't_rp'] },
  { name: 'Zero inputs (Falsy override check)', inputs: { rp_rev: 0, rp_np: 0, rp_a: 0, rp_e: 0, rp_eb: 0, rp_cg: 0 }, outputs: ['rr_roa', 'rr_roe', 'rr_ros', 'rr_em', 't_dupont', 't_rp'] },
  { name: 'Negative inputs', inputs: { rp_rev: 8500, rp_np: -1200, rp_a: -12000, rp_e: -7000, rp_eb: 2100, rp_cg: 5800 }, outputs: ['rr_roa', 'rr_roe', 'rr_ros', 'rr_em', 't_dupont', 't_rp'] },
  { name: 'NaN inputs', inputs: { rp_rev: 'NaN', rp_np: 'NaN', rp_a: 'NaN', rp_e: 'NaN', rp_eb: 'NaN', rp_cg: 'NaN' }, outputs: ['rr_roa', 'rr_roe', 'rr_ros', 'rr_em', 't_dupont', 't_rp'] }
];

results.liq = [
  { name: 'Normal', inputs: { l_ca: 3200, l_inv: 800, l_cash: 400, l_cl: 1800, l_rev: 12000, l_ar: 600, l_cogs: 8400, l_ta: 9500, l_eq: 5000 }, outputs: ['lr_cl', 'lr_ql', 'lr_al', 'lr_at', 'lr_it', 'lr_dso', 't_liq'] },
  { name: 'Zero inputs (Falsy override check)', inputs: { l_ca: 0, l_inv: 0, l_cash: 0, l_cl: 0, l_rev: 0, l_ar: 0, l_cogs: 0, l_ta: 0, l_eq: 0 }, outputs: ['lr_cl', 'lr_ql', 'lr_al', 'lr_at', 'lr_it', 'lr_dso', 't_liq'] },
  { name: 'Negative equity eq=-100', inputs: { l_ca: 3200, l_inv: 800, l_cash: 400, l_cl: 1800, l_rev: 12000, l_ar: 600, l_cogs: 8400, l_ta: 9500, l_eq: -100 }, outputs: ['lr_cl', 'lr_ql', 'lr_al', 'lr_at', 'lr_it', 'lr_dso', 't_liq'] },
  { name: 'Inventory > Current Assets inv=4000', inputs: { l_ca: 3200, l_inv: 4000, l_cash: 400, l_cl: 1800, l_rev: 12000, l_ar: 600, l_cogs: 8400, l_ta: 9500, l_eq: 5000 }, outputs: ['lr_cl', 'lr_ql', 'lr_al', 'lr_at', 'lr_it', 'lr_dso', 't_liq'] },
  { name: 'NaN inputs', inputs: { l_ca: 'NaN', l_inv: 'NaN', l_cash: 'NaN', l_cl: 'NaN', l_rev: 'NaN', l_ar: 'NaN', l_cogs: 'NaN', l_ta: 'NaN', l_eq: 'NaN' }, outputs: ['lr_cl', 'lr_ql', 'lr_al', 'lr_at', 'lr_it', 'lr_dso', 't_liq'] }
];

results.waccCalc = [
  { name: 'Normal', inputs: { w_d: 3000, w_e: 7000, w_rd: 8, w_t: 18, w_rf: 5, w_beta: 1.2, w_rm: 12 }, outputs: ['wr_wacc', 'wr_re', 'wr_rdnt', 'wr_wd', 'wr_shield', 't_wacc'] },
  { name: 'Zero Debt & Equity (Div by Zero)', inputs: { w_d: 0, w_e: 0, w_rd: 8, w_t: 18, w_rf: 5, w_beta: 1.2, w_rm: 12 }, outputs: ['wr_wacc', 'wr_re', 'wr_rdnt', 'wr_wd', 'wr_shield', 't_wacc'] },
  { name: 'Zero Equity w_e=0 (handled by fallback or not?)', inputs: { w_d: 3000, w_e: 0, w_rd: 8, w_t: 18, w_rf: 5, w_beta: 1.2, w_rm: 12 }, outputs: ['wr_wacc', 'wr_re', 'wr_rdnt', 'wr_wd', 'wr_shield', 't_wacc'] },
  { name: 'Opposing Debt and Equity E=-D (V=0, Div by Zero)', inputs: { w_d: 3000, w_e: -3000, w_rd: 8, w_t: 18, w_rf: 5, w_beta: 1.2, w_rm: 12 }, outputs: ['wr_wacc', 'wr_re', 'wr_rdnt', 'wr_wd', 'wr_shield', 't_wacc'] },
  { name: 'Negative tax rate (t=-20)', inputs: { w_d: 3000, w_e: 7000, w_rd: 8, w_t: -20, w_rf: 5, w_beta: 1.2, w_rm: 12 }, outputs: ['wr_wacc', 'wr_re', 'wr_rdnt', 'wr_wd', 'wr_shield', 't_wacc'] },
  { name: 'NaN inputs', inputs: { w_d: 'NaN', w_e: 'NaN', w_rd: 'NaN', w_t: 'NaN', w_rf: 'NaN', w_beta: 'NaN', w_rm: 'NaN' }, outputs: ['wr_wacc', 'wr_re', 'wr_rdnt', 'wr_wd', 'wr_shield', 't_wacc'] }
];

results.bondCalc = [
  { name: 'Normal', inputs: { bo_fv: 1000, bo_cr: 10, bo_n: 5, bo_y: 12, bo_m: 2 }, outputs: ['bor_price', 'bor_prem', 'bor_cy', 'bor_dur', 'bor_mdur', 't_bond'] },
  { name: 'Zero m (compounding frequency, Div by Zero)', inputs: { bo_fv: 1000, bo_cr: 10, bo_n: 5, bo_y: 12, bo_m: 0 }, outputs: ['bor_price', 'bor_prem', 'bor_cy', 'bor_dur', 'bor_mdur', 't_bond'] },
  { name: 'Negative yield y=-100% (r=-0.5, Div by Zero)', inputs: { bo_fv: 1000, bo_cr: 10, bo_n: 5, bo_y: -100, bo_m: 2 }, outputs: ['bor_price', 'bor_prem', 'bor_cy', 'bor_dur', 'bor_mdur', 't_bond'] },
  { name: 'Zero Years n=0 (no loop, price=0, Div by Zero in dur)', inputs: { bo_fv: 1000, bo_cr: 10, bo_n: 0, bo_y: 12, bo_m: 2 }, outputs: ['bor_price', 'bor_prem', 'bor_cy', 'bor_dur', 'bor_mdur', 't_bond'] },
  { name: 'NaN inputs', inputs: { bo_fv: 'NaN', bo_cr: 'NaN', bo_n: 'NaN', bo_y: 'NaN', bo_m: 'NaN' }, outputs: ['bor_price', 'bor_prem', 'bor_cy', 'bor_dur', 'bor_mdur', 't_bond'] },
  { name: 'Large Years n=10000 (Hang check)', inputs: { bo_fv: 1000, bo_cr: 10, bo_n: 10000, bo_y: 12, bo_m: 2 }, outputs: ['bor_price', 'bor_prem', 'bor_cy', 'bor_dur', 'bor_mdur', 't_bond'] }
];

results.stockCalc = [
  { name: 'Normal', inputs: { st_d0: 5, st_g: 4, st_rf: 5, st_beta: 1.1, st_rm: 12, st_eps: 8, st_pe: 15, st_mp: 110 }, outputs: ['str_d1', 'str_ddm', 'str_pe', 'str_re', 'str_verdict', 'str_vsub', 't_stock_sens'] },
  { name: 'Zero market price (Div by Zero in deviation)', inputs: { st_d0: 5, st_g: 4, st_rf: 5, st_beta: 1.1, st_rm: 12, st_eps: 8, st_pe: 15, st_mp: 0 }, outputs: ['str_d1', 'str_ddm', 'str_pe', 'str_re', 'str_verdict', 'str_vsub', 't_stock_sens'] },
  { name: 're <= g (growth >= required return)', inputs: { st_d0: 5, st_g: 15, st_rf: 5, st_beta: 1.1, st_rm: 12, st_eps: 8, st_pe: 15, st_mp: 110 }, outputs: ['str_d1', 'str_ddm', 'str_pe', 'str_re', 'str_verdict', 'str_vsub', 't_stock_sens'] },
  { name: 'NaN inputs', inputs: { st_d0: 'NaN', st_g: 'NaN', st_rf: 'NaN', st_beta: 'NaN', st_rm: 'NaN', st_eps: 'NaN', st_pe: 'NaN', st_mp: 'NaN' }, outputs: ['str_d1', 'str_ddm', 'str_pe', 'str_re', 'str_verdict', 'str_vsub', 't_stock_sens'] }
];

results.projComp = [
  { name: 'Normal', inputs: { pc_r: 12, pa_ic: 500, pb_ic: 600, pc_ic: 700, pa_cf1: 100, pa_cf2: 150, pa_cf3: 200, pa_cf4: 250, pa_cf5: 300, pb_cf1: 120, pb_cf2: 180, pb_cf3: 240, pb_cf4: 300, pb_cf5: 350, pc_cf1: 150, pc_cf2: 220, pc_cf3: 300, pc_cf4: 380, pc_cf5: 450 }, outputs: ['t_projcomp'] },
  { name: 'Zero Investment (Div by Zero for PI & PP)', inputs: { pc_r: 12, pa_ic: 0, pb_ic: 600, pc_ic: 700, pa_cf1: 100, pa_cf2: 150, pa_cf3: 200, pa_cf4: 250, pa_cf5: 300, pb_cf1: 120, pb_cf2: 180, pb_cf3: 240, pb_cf4: 300, pb_cf5: 350, pc_cf1: 150, pc_cf2: 220, pc_cf3: 300, pc_cf4: 380, pc_cf5: 450 }, outputs: ['t_projcomp'] },
  { name: 'Rate r=-100% (Div by Zero)', inputs: { pc_r: -100, pa_ic: 500, pb_ic: 600, pc_ic: 700, pa_cf1: 100, pa_cf2: 150, pa_cf3: 200, pa_cf4: 250, pa_cf5: 300, pb_cf1: 120, pb_cf2: 180, pb_cf3: 240, pb_cf4: 300, pb_cf5: 350, pc_cf1: 150, pc_cf2: 220, pc_cf3: 300, pc_cf4: 380, pc_cf5: 450 }, outputs: ['t_projcomp'] },
  { name: 'NaN inputs', inputs: { pc_r: 'NaN', pa_ic: 'NaN', pb_ic: 'NaN', pc_ic: 'NaN' }, outputs: ['t_projcomp'] }
];

results.riskScen = [
  { name: 'Normal', inputs: { sc_p1: 0.2, sc_p2: 0.6, sc_p3: 0.2, sc_npv1: -200, sc_npv2: 300, sc_npv3: 800, sc_ic: 500, sc_r: 15 }, outputs: ['scr_enpv', 'scr_sigma', 'scr_cv', 'scr_ppos', 'scr_dec', 'scr_dsub', 't_riskscen'] },
  { name: 'Probs don\'t sum to 1', inputs: { sc_p1: 0.3, sc_p2: 0.6, sc_p3: 0.2, sc_npv1: -200, sc_npv2: 300, sc_npv3: 800, sc_ic: 500, sc_r: 15 }, outputs: ['scr_enpv', 'scr_sigma', 'scr_cv', 'scr_ppos', 'scr_dec', 'scr_dsub', 't_riskscen'] },
  { name: 'Expected NPV is 0 (Div by Zero for CV)', inputs: { sc_p1: 0.5, sc_p2: 0.0, sc_p3: 0.5, sc_npv1: -200, sc_npv2: 300, sc_npv3: 200, sc_ic: 500, sc_r: 15 }, outputs: ['scr_enpv', 'scr_sigma', 'scr_cv', 'scr_ppos', 'scr_dec', 'scr_dsub', 't_riskscen'] },
  { name: 'Negative prob sc_p2=-0.2 (bypassing check if sum=1, e.g. 0.6, -0.2, 0.6)', inputs: { sc_p1: 0.6, sc_p2: -0.2, sc_p3: 0.6, sc_npv1: -200, sc_npv2: 300, sc_npv3: 800, sc_ic: 500, sc_r: 15 }, outputs: ['scr_enpv', 'scr_sigma', 'scr_cv', 'scr_ppos', 'scr_dec', 'scr_dsub', 't_riskscen'] },
  { name: 'NaN inputs', inputs: { sc_p1: 'NaN', sc_p2: 'NaN', sc_p3: 'NaN', sc_npv1: 'NaN' }, outputs: ['scr_enpv', 'scr_sigma', 'scr_cv', 'scr_ppos', 'scr_dec', 'scr_dsub', 't_riskscen'] }
];

results.maDirect = [
  { name: 'Normal', inputs: { ma_p: 800, ma_vc: 450, ma_fmoh: 100000, ma_fsa: 50000, ma_qp: 1000, ma_qs: 900 }, outputs: ['r_madp', 'r_maap', 'r_madiff', 'r_mainv', 'r_macm', 't_ma_direct'] },
  { name: 'qp=0 and qs=0 (Handled by Math.max(x, 1))', inputs: { ma_p: 800, ma_vc: 450, ma_fmoh: 100000, ma_fsa: 50000, ma_qp: 0, ma_qs: 0 }, outputs: ['r_madp', 'r_maap', 'r_madiff', 'r_mainv', 'r_macm', 't_ma_direct'] },
  { name: 'Price < VC (Negative CM)', inputs: { ma_p: 400, ma_vc: 450, ma_fmoh: 100000, ma_fsa: 50000, ma_qp: 1000, ma_qs: 900 }, outputs: ['r_madp', 'r_maap', 'r_madiff', 'r_mainv', 'r_macm', 't_ma_direct'] },
  { name: 'NaN inputs', inputs: { ma_p: 'NaN', ma_vc: 'NaN', ma_qp: 'NaN' }, outputs: ['r_madp', 'r_maap', 'r_madiff', 'r_mainv', 'r_macm', 't_ma_direct'] }
];

results.maBudget = [
  { name: 'Normal', inputs: { mb_bq: 1000, mb_aq: 1200, mb_bp: 800, mb_ap: 820, mb_bvc: 450, mb_avc: 460, mb_bf: 100000, mb_af: 105000 }, outputs: ['r_mbrev', 'r_mbvc', 'r_mbf', 'r_mbop', 'r_mbflex', 't_ma_budget'] },
  { name: 'Zero quantities', inputs: { mb_bq: 0, mb_aq: 0, mb_bp: 800, mb_ap: 820, mb_bvc: 450, mb_avc: 460, mb_bf: 100000, mb_af: 105000 }, outputs: ['r_mbrev', 'r_mbvc', 'r_mbf', 'r_mbop', 'r_mbflex', 't_ma_budget'] },
  { name: 'NaN inputs', inputs: { mb_bq: 'NaN', mb_aq: 'NaN' }, outputs: ['r_mbrev', 'r_mbvc', 'r_mbf', 'r_mbop', 'r_mbflex', 't_ma_budget'] }
];

results.faTrend = [
  { name: 'Normal', inputs: { fa_r0: 10000, fa_r1: 12000, fa_c0: 6000, fa_c1: 7000, fa_o0: 2000, fa_o1: 2200, fa_a0: 15000, fa_a1: 16000, fa_e0: 8000, fa_e1: 9000 }, outputs: ['r_farg', 'r_fam', 'r_faat', 'r_faeg', 'r_fav', 'r_favsub', 't_fa_trend'] },
  { name: 'Base year revenue r0=0 (handled by fallback to 1)', inputs: { fa_r0: 0, fa_r1: 12000, fa_c0: 6000, fa_c1: 7000, fa_o0: 2000, fa_o1: 2200, fa_a0: 15000, fa_a1: 16000, fa_e0: 8000, fa_e1: 9000 }, outputs: ['r_farg', 'r_fam', 'r_faat', 'r_faeg', 'r_fav', 'r_favsub', 't_fa_trend'] },
  { name: 'Base year revenue r0=0.0001 (extremely small, huge growth)', inputs: { fa_r0: 0.0001, fa_r1: 12000, fa_c0: 6000, fa_c1: 7000, fa_o0: 2000, fa_o1: 2200, fa_a0: 15000, fa_a1: 16000, fa_e0: 8000, fa_e1: 9000 }, outputs: ['r_farg', 'r_fam', 'r_faat', 'r_faeg', 'r_fav', 'r_favsub', 't_fa_trend'] },
  { name: 'NaN inputs', inputs: { fa_r0: 'NaN', fa_r1: 'NaN' }, outputs: ['r_farg', 'r_fam', 'r_faat', 'r_faeg', 'r_fav', 'r_favsub', 't_fa_trend'] }
];

results.faStable = [
  { name: 'Normal', inputs: { fs_a: 16000, fs_e: 9000, fs_d: 7000, fs_ca: 8000, fs_cl: 5000, fs_ebit: 2500, fs_int: 500, fs_cfo: 3000, fs_ds: 2000 }, outputs: ['r_fsaut', 'r_fscr', 'r_fsicr', 'r_fsdscr', 'r_fsver', 'r_fssub', 't_fa_stable'] },
  { name: 'Zero assets & debts (handled by fallback)', inputs: { fs_a: 0, fs_e: 0, fs_d: 0, fs_ca: 0, fs_cl: 0, fs_ebit: 0, fs_int: 0, fs_cfo: 0, fs_ds: 0 }, outputs: ['r_fsaut', 'r_fscr', 'r_fsicr', 'r_fsdscr', 'r_fsver', 'r_fssub', 't_fa_stable'] },
  { name: 'Negative equity e=-5000', inputs: { fs_a: 16000, fs_e: -5000, fs_d: 7000, fs_ca: 8000, fs_cl: 5000, fs_ebit: 2500, fs_int: 500, fs_cfo: 3000, fs_ds: 2000 }, outputs: ['r_fsaut', 'r_fscr', 'r_fsicr', 'r_fsdscr', 'r_fsver', 'r_fssub', 't_fa_stable'] },
  { name: 'NaN inputs', inputs: { fs_a: 'NaN', fs_e: 'NaN' }, outputs: ['r_fsaut', 'r_fscr', 'r_fsicr', 'r_fsdscr', 'r_fsver', 'r_fssub', 't_fa_stable'] }
];

// Execute tests and collect results
const executionResults = {};

for (const [funcName, tests] of Object.entries(results)) {
  executionResults[funcName] = [];
  for (const t of tests) {
    const res = runTest(funcName, t.inputs, t.outputs);
    executionResults[funcName].push({
      caseName: t.name,
      inputs: res.inputs,
      outputs: res.outputs,
      error: res.error,
      time: res.executionTime,
      chart: res.chart ? true : false
    });
  }
}

// Output detailed results as JSON
console.log(JSON.stringify(executionResults, null, 2));
