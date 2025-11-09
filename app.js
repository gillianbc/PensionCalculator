// Utilities and strategies have been moved to separate files (utils.js and strategies/*.js).
// This file now assumes window.Utils and window.Strategies are loaded before these functions are invoked.

// Simple loader to ensure dependencies are present
const ensureAppReady = (() => {
  let loadingPromise = null;

  function haveAll() {
    return (
      window.Utils &&
      typeof window.Utils.toPence === 'function' &&
      window.Strategies &&
      typeof window.Strategies.strategy1 === 'function' &&
      typeof window.Strategies.strategy2 === 'function' &&
      typeof window.Strategies.strategy3 === 'function' &&
      typeof window.Strategies.strategy3A === 'function' &&
      typeof window.Strategies.strategy4 === 'function' &&
      typeof window.Strategies.strategy5 === 'function'
    );
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.getElementsByTagName('script'))
        .find(s => (s.getAttribute('src') || '').endsWith(src));
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          resolve();
        } else {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)));
        }
        return;
      }
      const el = document.createElement('script');
      el.src = src;
      el.async = false;
      el.onload = () => { el.dataset.loaded = 'true'; resolve(); };
      el.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(el);
    });
  }

  return function ensureAppReady() {
    if (haveAll()) return Promise.resolve();
    if (loadingPromise) return loadingPromise;

    // Load utils first, then strategies
    const strategyFiles = [
      'strategies/strategy1.js',
      'strategies/strategy2.js',
      'strategies/strategy3.js',
      'strategies/strategy3A.js',
      'strategies/strategy4.js',
      'strategies/strategy5.js',
    ];

    loadingPromise = loadScript('utils.js')
      .then(() => Promise.all(strategyFiles.map(loadScript)))
      .then(() => { if (!haveAll()) throw new Error('Dependencies not initialized'); });

    return loadingPromise;
  };
})();

// Report builder

// Generate a full timeline report (per strategy) with rows for each age from START_AGE to END_AGE
function generateFullReport(savings, pension, requiredAmounts, adhoc, params) {
  const { strategyRowTitles, strategyClasses, strategyDescriptions } = getStrategyMeta(params);
  const len = params.END_AGE - params.START_AGE + 1;

  const format = (p) => window.Utils.formatGBP(p);

  // Precompute all timelines for each requested spending amount
  const timelinesByAmt = requiredAmounts.map(req => ({
    req,
    s1: window.Strategies.strategy1(savings, pension, req, adhoc, params),
    s2: window.Strategies.strategy2(savings, pension, req, adhoc, params),
    s3: window.Strategies.strategy3(savings, pension, req, adhoc, params),
    s3a: window.Strategies.strategy3A(savings, pension, req, adhoc, params),
    s4: window.Strategies.strategy4(savings, pension, req, adhoc, params),
    s5: window.Strategies.strategy5(savings, pension, req, adhoc, params),
  }));

  const renderTimelineTable = (title, cssClass, timeline, description) => {
    let html = '';
    html += `<h3 class="${cssClass}">${title}</h3>`;
    html += `<details class="strategy-desc"><summary>About this strategy</summary><div class="strategy-desc-content">${description}</div></details>`;
    html += `<table class="full-timeline"><thead><tr>
      <th>Age</th>
      <th>Pension Start</th>
      <th>Pension End</th>
      <th>ISA Start</th>
      <th>ISA End</th>
      <th>Other Start</th>
      <th>Other End</th>
      <th>Tax Paid</th>
      <th>Extra This Year</th>
    </tr></thead><tbody>`;
    for (let i = 0; i < timeline.length; i++) {
      const w = timeline[i];
      html += `<tr>
        <td>${w.age}</td>
        <td class="currency">${format(w.pensionStart)}</td>
        <td class="currency">${format(w.pensionEnd)}</td>
        <td class="currency">${format(w.isaStart)}</td>
        <td class="currency">${format(w.isaEnd)}</td>
        <td class="currency">${format(w.otherStart)}</td>
        <td class="currency">${format(w.otherEnd)}</td>
        <td class="currency">${format(w.taxPaid)}</td>
        <td class="currency">${format(w.extraThisYear)}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    return html;
  };

  let html = '';
  html += `<div class="summary-block">
    <h3>Full Timeline Report</h3>
    <p><strong>Initial Savings:</strong> ${format((params.INITIAL_OTHER_SAVINGS_P || 0) + (params.INITIAL_ISA_SAVINGS_P || 0))}</p>
    <p><strong>Initial Pension:</strong> ${format(pension)}</p>
    <p><strong>Annual Spending Amounts:</strong> ${requiredAmounts.map(format).join(', ')}</p>
    <p><strong>Years:</strong> ${params.START_AGE}–${params.END_AGE}</p>
  </div>`;

  for (const block of timelinesByAmt) {
    html += `<h2>Spending: ${format(block.req)} per year</h2>`;

    // Strategy 1..5 and 3A in the same order as meta
    const perStrategy = [
      { title: strategyRowTitles[0], cls: strategyClasses[0], tl: block.s1, desc: strategyDescriptions[0] },
      { title: strategyRowTitles[1], cls: strategyClasses[1], tl: block.s2, desc: strategyDescriptions[1] },
      { title: strategyRowTitles[2], cls: strategyClasses[2], tl: block.s3, desc: strategyDescriptions[2] },
      { title: strategyRowTitles[3], cls: strategyClasses[3], tl: block.s3a, desc: strategyDescriptions[3] },
      { title: strategyRowTitles[4], cls: strategyClasses[4], tl: block.s4, desc: strategyDescriptions[4] },
      { title: strategyRowTitles[5], cls: strategyClasses[5], tl: block.s5, desc: strategyDescriptions[5] },
    ];

    for (const row of perStrategy) {
      html += renderTimelineTable(row.title, row.cls, row.tl, row.desc);
    }
  }

  return html;
}

// Collapsible top-of-page Strategy Info builder
function buildStrategyInfoInnerHTML(strategyRowTitles, strategyDescriptions, params) {
  const growthRatePercent = (params.PENSION_GROWTH_RATE * 100).toFixed(2);
  return `
    <h3>Strategy Descriptions:</h3>
    <ul>
      ${strategyRowTitles.map((title, idx) =>
        `<li><strong>${title.replace('Strategy', 'Strategy ')}:</strong> ${strategyDescriptions[idx]}</li>`
      ).join('')}
    </ul>
    <h3>Assumptions</h3>
    <ul>
      <li><strong>Pension growth rate above inflation:</strong> ${growthRatePercent}%</li>
      <li><strong>Personal allowance:</strong> ${window.Utils.formatGBP(params.PERSONAL_ALLOWANCE_P)}</li>
      <li><strong>State pension (annual):</strong> ${window.Utils.formatGBP(params.STATE_PENSION_P)}</li>
      <li><strong>Basic-rate band width:</strong> ${window.Utils.formatGBP(params.BASIC_RATE_BAND_P)}</li>
      <li><strong>Tax-free pension portion:</strong> ${(params.TAX_FREE_PORTION * 100).toFixed(0)}%</li>
      <li><strong>Savings interest:</strong> None (and no inflation either)</li>
    </ul>
    <p><em>Generated on: ${new Date().toISOString().replace('T',' ').slice(0,19)}</em></p>
  `.trim();
}

function updateStrategyInfoPanel(strategyRowTitles, strategyDescriptions, params) {
  if (typeof document === 'undefined') return;
  const reportDiv = document.getElementById('report');

  // Try to find the "Advanced Parameters" section to insert above it
  function findAdvancedParamsAnchor() {
    const byId = document.getElementById('advancedParameters') || document.getElementById('advancedParams');
    if (byId) return byId;

    // Look for a <details> (or similar) whose <summary> contains "Advanced Parameters"
    const candidates = Array.from(document.querySelectorAll('details, .advanced-params, .advanced-parameters'));
    for (const el of candidates) {
      const sum = el.querySelector('summary');
      const txt = sum ? sum.textContent.trim().toLowerCase() : '';
      if (txt.includes('advanced parameters')) return el;
    }

    // Fallback: any heading mentioning Advanced Parameters
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5'));
    for (const h of headings) {
      const txt = (h.textContent || '').trim().toLowerCase();
      if (txt.includes('advanced parameters')) return h;
    }

    return null;
  }

  let details = document.getElementById('strategyInfoPanel');
  if (!details) {
    details = document.createElement('details');
    details.id = 'strategyInfoPanel';
    details.className = 'advanced';
    details.open = false; // default hidden (closed)

    const summary = document.createElement('summary');
    summary.textContent = 'Additional Information';

    const content = document.createElement('div');
    content.className = 'strategy-info-content';
    content.innerHTML = buildStrategyInfoInnerHTML(strategyRowTitles, strategyDescriptions, params);

    details.appendChild(summary);
    details.appendChild(content);

    const anchor = findAdvancedParamsAnchor();
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(details, anchor);
    } else if (reportDiv && reportDiv.parentNode) {
      reportDiv.parentNode.insertBefore(details, reportDiv);
    } else {
      document.body.prepend(details);
    }
  } else {
    const content = details.querySelector('.strategy-info-content');
    if (content) {
      content.innerHTML = buildStrategyInfoInnerHTML(strategyRowTitles, strategyDescriptions, params);
    }
    // Ensure it's positioned above Advanced Parameters if possible
    const anchor = findAdvancedParamsAnchor();
    if (anchor && anchor.parentNode && details.previousSibling !== anchor) {
      anchor.parentNode.insertBefore(details, anchor);
    }
    // Ensure summary label
    const summary = details.querySelector('summary');
    if (summary) summary.textContent = 'Additional Information';
  }
}

// Titles/classes/descriptions provider reused by both report and the panel
function getStrategyMeta(params) {
  const tfpPct = Math.round(((typeof params.TAX_FREE_PORTION === 'number' ? params.TAX_FREE_PORTION : 0.25)) * 100);
  const taxedPct = 100 - tfpPct;
  return {
    strategyRowTitles: ["Strategy1", "Strategy2", "Strategy3", "Strategy3A", "Strategy4", "Strategy5"],
    strategyClasses: ["strategy-1","strategy-2","strategy-3","strategy-3a","strategy-4","strategy-5"],
    strategyDescriptions: [
      `1. Use savings first. Then crystallise all and withdraw ${tfpPct}% tax-free lump sum into savings. 
      Then drawdown remaining pension when no savings remain (tax rules apply).
      For example: Want to spend £30K per year.  Have  £10K savings, £100K pension.  
      Take lump sum of 25% tax free = £25K.  
      So £5K savings remains at end of year 1 and £75K pension plus growth, but there is no more tax free portion.`,

      `2. Use savings first, then crystallise what I need each year into drawdown account (${tfpPct}% tax-free / ${taxedPct}% taxable).
      For example: Want to spend £30K per year.  Have  £10K savings, £100K pension.  
      Spend £10K savings then need another £20K net from pension.  Have to crystallise more than £20K to get £20K net.`,

      `3. Crystallise and withdraw each year but make use of full personal allowance every year. 
      The tax-free portion is ${tfpPct}%. 
      Use savings to make up any remaining spending needs.
      For example, currently, you can drawdown £16760 per annum without paying tax.  So crystallise and withdraw this amount
      every year, even at the start when you have plenty of savings.  This makes the most of the tax free allowance every year.  
      e.g. if I need £25K, then take £16760 from pension and £8240 from savings.
      When I reach age 67, I'll have state pension income, currently £${params.STATE_PENSION_P/100}, so I'd crystallise less to 
      keep below tax threshold and start using more from savings to meet my spending needs.  
      Once savings depleted, I'll need to increase what I crystallise each year and will have to pay tax
      Bear in mind that the withdrawals need to be made monthly to avoid getting over taxed and having to claim it back
      `,

      "4. Same as Strategy 3, plus annual £3,600 gross contribution (net £2,880 with 20% relief) at ages ≤ 75.  " +
      "i.e. you can continue contributing to a pension, even when you are drawing down from it and have no salary." +
      " However, you could get caught out by HMRC's pension recycling rules (so I'd be wary of this one)",

      "5. Fill personal allowance (0%) then fill basic-rate band (20%)—surplus to savings. i.e. you can have income of " +
      "12570.00 + 37700.00 = £50270 before paying higher rate tax",

      `Drawdown from pension (${tfpPct}% tax-free / ${taxedPct}% taxable). Only use savings if no pension remains.
      Example:  if you need £30K then you'd withdraw £32337 to achieve a net amount of £30K`
    ]
  };
}

function generateComparisonReport(savings, pension, requiredAmounts, targetAges, adhoc, params) {
  const len = params.END_AGE - params.START_AGE + 1;

  const timelinesByAmt = requiredAmounts.map(req => {
    return {
      s1: window.Strategies.strategy1(savings, pension, req, adhoc, params),
      s2: window.Strategies.strategy2(savings, pension, req, adhoc, params),
      s3: window.Strategies.strategy3(savings, pension, req, adhoc, params),
      s3a: window.Strategies.strategy3A(savings, pension, req, adhoc, params),
      s4: window.Strategies.strategy4(savings, pension, req, adhoc, params),
      s5: window.Strategies.strategy5(savings, pension, req, adhoc, params),
    };
  });

  const agesToUse = (targetAges && targetAges.length > 0) ? targetAges : [params.END_AGE];

  const { strategyRowTitles, strategyClasses, strategyDescriptions } = getStrategyMeta(params);

  const growthRatePercent = (params.PENSION_GROWTH_RATE * 100).toFixed(2);

  let html = '';
  html += `<div class="summary-block">
    <h3>Initial Parameters</h3>
    <p><strong>Initial Savings:</strong> ${window.Utils.formatGBP(savings)}</p>
    <p><strong>Initial Pension:</strong> ${window.Utils.formatGBP(pension)}</p>
    <p><strong>Example Annual Spending Amounts:</strong> ${requiredAmounts.map(window.Utils.formatGBP).join(', ')}</p>
    <p><strong>Target Ages:</strong> ${agesToUse.join(', ')}</p>
    <p><strong>Ad hoc withdrawals:</strong> ${
      (Object.keys(adhoc).length === 0)
        ? 'None'
        : Object.keys(adhoc).sort((a,b)=>a-b).map(a => `Age ${a}: ${window.Utils.formatGBP(adhoc[a])}`).join('; ')
    }</p>
  </div>`;

  for (const age of agesToUse) {
    const idx = Math.max(0, Math.min(len - 1, age - params.START_AGE));

    // compute max per column
    const maxForCol = requiredAmounts.map((_, j) => {
      const tb = timelinesByAmt[j];
      let m = tb.s1[idx].totalEnd();
      m = Math.max(m, tb.s2[idx].totalEnd());
      m = Math.max(m, tb.s3[idx].totalEnd());
      m = Math.max(m, tb.s3a[idx].totalEnd());
      m = Math.max(m, tb.s4[idx].totalEnd());
      m = Math.max(m, tb.s5[idx].totalEnd());
      return m;
    });

    html += `<h2 class="age-title">Total wealth remaining at end of year when aged ${age}</h2>
      <table>
        <thead>
          <tr>
            <th class="strategy-column"><span class="strategy-header-text">Strategy</span></th>
            ${requiredAmounts.map(a=>`<th>${window.Utils.formatGBP(a)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    for (let s = 0; s < strategyRowTitles.length; s++) {
      const rowTitle = strategyRowTitles[s];
      const rowTooltip = strategyDescriptions[s];
      html += `<tr class="${strategyClasses[s]}"><td class="strategy-column" title="${rowTooltip}">${rowTitle}</td>`;
      for (let j = 0; j < requiredAmounts.length; j++) {
        const tb = timelinesByAmt[j];

        // Get timeline point
        let timelinePoint;
        switch (s) {
          case 0: timelinePoint = tb.s1[idx]; break;
          case 1: timelinePoint = tb.s2[idx]; break;
          case 2: timelinePoint = tb.s3[idx]; break;
          case 3: timelinePoint = tb.s3a[idx]; break;
          case 4: timelinePoint = tb.s4[idx]; break;
          case 5: timelinePoint = tb.s5[idx]; break;
          default: timelinePoint = tb.s1[idx];
        }

        const cell = timelinePoint.totalEnd();
        const savings = timelinePoint.savingsEnd;
        const pension = timelinePoint.pensionEnd;
        const taxPaid = timelinePoint.taxPaid;

        const tooltip = `Savings: ${window.Utils.formatGBP(savings)}, Pension: ${window.Utils.formatGBP(pension)}, Tax paid: ${window.Utils.formatGBP(taxPaid)}`;
        const isBest = cell === maxForCol[j];
        const extraClass = isBest ? ' best' : '';
        html += `<td class="currency${extraClass}" title="${tooltip}">${window.Utils.formatGBP(cell)}</td>`;
      }
      html += `</tr>`;
    }

    html += `</tbody></table>`;
  }

  // Update the top Strategy Info panel instead of rendering it in the report footer
  if (typeof document !== 'undefined') {
    updateStrategyInfoPanel(strategyRowTitles, strategyDescriptions, params);
  }

  return html;
}

// UI logic
const el = (id) => document.getElementById(id);
const getParams = () => {
  // START_AGE and END_AGE are set in handleGenerate from target ages
  const PENSION_GROWTH_RATE = Number(String(el('pensionGrowthRate').value || '0.04'));
  const PERSONAL_ALLOWANCE_P = window.Utils.toPence(el('personalAllowance').value || '12570.00');
  const STATE_PENSION_P = window.Utils.toPence(el('statePension').value || '11973.00');
  const BASIC_RATE = Number(String(el('basicRate').value || '0.20'));
  const BASIC_RATE_BAND_P = window.Utils.toPence(el('basicRateBand').value || '37700.00');
  const NO_INCOME_CONTRIBUTION_LIMIT_P = window.Utils.toPence(el('noIncomeContributionLimit').value || '3600.00');
  const TAX_FREE_PORTION = Number(String(el('taxFreePortion').value || '0.25'));

  return {
    PENSION_GROWTH_RATE,
    PERSONAL_ALLOWANCE_P, STATE_PENSION_P,
    BASIC_RATE, BASIC_RATE_BAND_P, NO_INCOME_CONTRIBUTION_LIMIT_P,
    TAX_FREE_PORTION
    // START_AGE and END_AGE will be injected by handleGenerate
  };
};

const handleGenerate = async () => {
  try {
    await ensureAppReady();

    // Read split savings (fallback to single total if split inputs not present)
    const otherEl = el('initialOtherSavings');
    const isaEl = el('initialIsaSavings');
    let otherSavingsP = 0, isaSavingsP = 0, savings = 0;
    if (otherEl || isaEl) {
      otherSavingsP = window.Utils.toPence(otherEl?.value || '0');
      isaSavingsP = window.Utils.toPence(isaEl?.value || '0');
      savings = otherSavingsP + isaSavingsP;
    } else {
      savings = window.Utils.toPence(el('initialSavings').value || '0');
      otherSavingsP = savings;
      isaSavingsP = 0;
    }

    const pension = window.Utils.toPence(el('initialPension').value || '0');

    const spendingStr = el('spendingAmounts').value || '';
    const requiredAmounts = (spendingStr.split(',').map(s => s.trim()).filter(Boolean).map(window.Utils.toPence));
    if (requiredAmounts.length === 0) {
      alert('Please provide at least one annual spending amount.');
      return;
    }

    const agesStr = el('targetAges').value || '';
    const targetAges = agesStr
      ? agesStr.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
      : [];

    if (targetAges.length === 0) {
      alert('Please provide at least one target age.');
      return;
    }

    // Gather ad hoc withdrawals from new UI
    const adhoc = {};
    const adhocRowsEls = document.querySelectorAll('.adhoc-row');
    adhocRowsEls.forEach((row) => {
      const age = Number(row.querySelector('.adhoc-age').dataset.value);
      const amount = Number(row.querySelector('.adhoc-amount').dataset.value);
      if (!Number.isNaN(age) && age > 0 && !Number.isNaN(amount) && amount >= 0) {
        adhoc[age] = window.Utils.toPence(amount);
      }
    });

    // Automatically determine START_AGE and END_AGE
    const START_AGE = Math.min(...targetAges);
    const END_AGE = Math.max(...targetAges);

    // Get other params as usual
    const params = getParams();
    params.START_AGE = START_AGE;
    params.END_AGE = END_AGE;

    // Basic validation of target ages
    for (const a of targetAges) {
      if (a < 55 || a > 99) {
        alert(`Target age ${a} must be between 55 and 99.`);
        return;
      }
    }

    const html = generateComparisonReport(savings, pension, requiredAmounts, targetAges, adhoc, params);
    el('report').innerHTML = html;
  } catch (e) {
    console.error(e);
    alert('Failed to generate report: ' + (e?.message || e));
  }
};

const handleGenerateFull = async () => {
  try {
    await ensureAppReady();

    // Read split savings (fallback to single total if split inputs not present)
    const otherEl = el('initialOtherSavings');
    const isaEl = el('initialIsaSavings');
    let otherSavingsP = 0, isaSavingsP = 0, savings = 0;
    if (otherEl || isaEl) {
      otherSavingsP = window.Utils.toPence(otherEl?.value || '0');
      isaSavingsP = window.Utils.toPence(isaEl?.value || '0');
      savings = otherSavingsP + isaSavingsP;
    } else {
      savings = window.Utils.toPence(el('initialSavings').value || '0');
      otherSavingsP = savings; // default priority pool
      isaSavingsP = 0;
    }

    const pension = window.Utils.toPence(el('initialPension').value || '0');

    const spendingStr = el('spendingAmounts').value || '';
    const requiredAmounts = (spendingStr.split(',').map(s => s.trim()).filter(Boolean).map(window.Utils.toPence));
    if (requiredAmounts.length === 0) {
      alert('Please provide at least one annual spending amount.');
      return;
    }

    const agesStr = el('targetAges').value || '';
    const targetAges = agesStr
      ? agesStr.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
      : [];

    if (targetAges.length === 0) {
      alert('Please provide at least one target age.');
      return;
    }

    // Gather ad hoc withdrawals from UI
    const adhoc = {};
    const adhocRowsEls = document.querySelectorAll('.adhoc-row');
    adhocRowsEls.forEach((row) => {
      const age = Number(row.querySelector('.adhoc-age').dataset.value);
      const amount = Number(row.querySelector('.adhoc-amount').dataset.value);
      if (!Number.isNaN(age) && age > 0 && !Number.isNaN(amount) && amount >= 0) {
        adhoc[age] = window.Utils.toPence(amount);
      }
    });

    // Determine START_AGE and END_AGE from targets
    const START_AGE = Math.min(...targetAges);
    const END_AGE = Math.max(...targetAges);

    const params = getParams();
    params.START_AGE = START_AGE;
    params.END_AGE = END_AGE;
    params.INITIAL_OTHER_SAVINGS_P = otherSavingsP;
    params.INITIAL_ISA_SAVINGS_P = isaSavingsP;
    params.INITIAL_OTHER_SAVINGS_P = otherSavingsP;
    params.INITIAL_ISA_SAVINGS_P = isaSavingsP;

    // Validate ages
    for (const a of targetAges) {
      if (a < 55 || a > 99) {
        alert(`Target age ${a} must be between 55 and 99.`);
        return;
      }
    }

    const html = generateFullReport(savings, pension, requiredAmounts, adhoc, params);
    el('report').innerHTML = html;
  } catch (e) {
    console.error(e);
    alert('Failed to generate full report: ' + (e?.message || e));
  }
};

const handleDownload = async () => {
  const reportDiv = el('report');
  if (!reportDiv.innerHTML.trim()) {
    alert('Please generate a report first.');
    return;
  }

  await ensureAppReady();

  const params = getParams();
  const growthRatePercent = (params.PENSION_GROWTH_RATE * 100).toFixed(2);

  // Include the top strategy info panel in the download as well
  const infoPanelEl = document.getElementById('strategyInfoPanel');
  const infoPanelHtml = infoPanelEl ? infoPanelEl.outerHTML : '';

  // Compose a standalone HTML file with inline styles (reuse styles.css link)
  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Pension Strategy Comparison Report</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  ${document.querySelector('link[href="styles.css"]') ? '' : ''}
</style>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="app-container">
  <div class="card">
    <h1>Pension Strategy Comparison Report</h1>
    ${infoPanelHtml}
    ${reportDiv.innerHTML}
  </div>
</div>
</body>
</html>
  `.trim();

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  a.href = url;
  a.download = `pension-strategy-comparison-${ts}.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

window.addEventListener('DOMContentLoaded', () => {
  el('generateBtn').addEventListener('click', handleGenerate);
  el('downloadBtn').addEventListener('click', handleDownload);

  // Add a "Generate Full Report" button next to the Download button if not present
  const existingFullBtn = document.getElementById('generateFullBtn');
  if (!existingFullBtn) {
    const fullBtn = document.createElement('button');
    fullBtn.id = 'generateFullBtn';
    fullBtn.type = 'button';
    fullBtn.textContent = 'Generate Full Report';
    const downloadBtnEl = el('downloadBtn');
    // Copy classes and inline style from Download button so it matches existing styling
    if (downloadBtnEl) {
      fullBtn.className = downloadBtnEl.className || '';
      const inlineStyle = downloadBtnEl.getAttribute('style');
      if (inlineStyle) fullBtn.setAttribute('style', inlineStyle);
    }
    if (downloadBtnEl && downloadBtnEl.parentNode) {
      downloadBtnEl.parentNode.insertBefore(fullBtn, downloadBtnEl.nextSibling);
    } else {
      // Fallback: append to body
      document.body.appendChild(fullBtn);
    }
    fullBtn.addEventListener('click', handleGenerateFull);
  }

  // Add split savings inputs if not already present
  const initialSavingsEl = el('initialSavings');
  if (initialSavingsEl && !el('initialOtherSavings') && !el('initialIsaSavings')) {
    const container = initialSavingsEl.parentNode || document.body;

    const makeInput = (id, placeholder) => {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.step = '0.01';
      inp.id = id;
      inp.placeholder = placeholder;
      // Copy classes and some styles from the existing savings input for visual consistency
      inp.className = initialSavingsEl.className || '';
      const inlineStyle = initialSavingsEl.getAttribute('style');
      if (inlineStyle) inp.setAttribute('style', inlineStyle);
      return inp;
    };

    const otherLabel = document.createElement('label');
    otherLabel.setAttribute('for', 'initialOtherSavings');
    otherLabel.textContent = 'Other Savings (£): ';
    const otherInput = makeInput('initialOtherSavings', 'Other Savings');

    const isaLabel = document.createElement('label');
    isaLabel.setAttribute('for', 'initialIsaSavings');
    isaLabel.textContent = 'Stocks & Shares ISA (£): ';
    const isaInput = makeInput('initialIsaSavings', 'Stocks & Shares ISA');

    // Insert after the existing savings input
    if (initialSavingsEl.nextSibling) {
      container.insertBefore(otherLabel, initialSavingsEl.nextSibling);
      container.insertBefore(otherInput, otherLabel.nextSibling);
      container.insertBefore(isaLabel, otherInput.nextSibling);
      container.insertBefore(isaInput, isaLabel.nextSibling);
    } else {
      container.appendChild(otherLabel);
      container.appendChild(otherInput);
      container.appendChild(isaLabel);
      container.appendChild(isaInput);
    }
  }

    // Build Additional Information panel on load
    try {
      const params = getParams();
      const { strategyRowTitles, strategyDescriptions } = getStrategyMeta(params);
      updateStrategyInfoPanel(strategyRowTitles, strategyDescriptions, params);
    } catch (e) {
      console.warn('Failed to initialize Additional Information panel on load:', e);
    }

  // --- Ad hoc withdrawals UI logic ---
  const adhocRowsDiv = document.getElementById('adhocRows');
  const addAdhocBtn = document.getElementById('addAdhocBtn');
  const adhocAgeEl = document.getElementById('adhocAge');
  const adhocAmountEl = document.getElementById('adhocAmount');

  // Build Additional Information panel on load (after dependencies)
  ensureAppReady().then(() => {
    try {
      const params = getParams();
      const { strategyRowTitles, strategyDescriptions } = getStrategyMeta(params);
      updateStrategyInfoPanel(strategyRowTitles, strategyDescriptions, params);
    } catch (e) {
      console.warn('Failed to initialize Additional Information panel on load:', e);
    }
  });

  // Set min and max for Age control based on Target Ages
  const targetAgesEl = document.getElementById('targetAges');
  function updateAdhocAgeRange() {
    const val = targetAgesEl.value || '';
    const ages = val.split(',').map(s => Number(s.trim())).filter(a => !Number.isNaN(a));
    if (ages.length > 0) {
      const min = Math.min(...ages);
      const max = Math.max(...ages);
      adhocAgeEl.min = min;
      adhocAgeEl.max = max;
      adhocAgeEl.placeholder = `Age (${min}-${max})`;
      // If the current value is out of new bounds, clear it
      if (adhocAgeEl.value && (Number(adhocAgeEl.value) < min || Number(adhocAgeEl.value) > max)) {
        adhocAgeEl.value = '';
      }
    } else {
      adhocAgeEl.min = 0;
      adhocAgeEl.max = 120;
      adhocAgeEl.placeholder = "Age";
    }
  }
  // Initial setup and change listener
  updateAdhocAgeRange();
  targetAgesEl.addEventListener('input', updateAdhocAgeRange);

  function renderAdhocRows() {
    // Just update the display, nothing to do here since rows are directly managed
    // Could later add empty-message if needed
  }

  function removeAdhocRow(rowEl) {
    rowEl.parentNode.removeChild(rowEl);
    renderAdhocRows();
  }

  addAdhocBtn.addEventListener('click', () => {
    const age = Number(adhocAgeEl.value);
    const amount = Number(adhocAmountEl.value);
    // check using currently set min/max
    if (
      Number.isNaN(age) ||
      (adhocAgeEl.min && age < Number(adhocAgeEl.min)) ||
      (adhocAgeEl.max && age > Number(adhocAgeEl.max))
    ) {
      alert(`Please enter a valid age (${adhocAgeEl.min}–${adhocAgeEl.max}).`);
      return;
    }
    if (Number.isNaN(amount) || amount < 0) {
      alert('Please enter a valid amount (in £, 0 or positive).');
      return;
    }
    // Don't allow duplicate ages
    if ([...adhocRowsDiv.querySelectorAll('.adhoc-age')].some(e => Number(e.dataset.value) === age)) {
      alert('Age already added. Remove the row to change or add a different pair.');
      return;
    }

    // Create a row
    const row = document.createElement('div');
    row.className = 'adhoc-row';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '3px';
    // Age
    const ageSpan = document.createElement('span');
    ageSpan.textContent = `Age ${age}`;
    ageSpan.className = 'adhoc-age';
    ageSpan.dataset.value = age;
    ageSpan.style.width = "70px";
    // Amount
    const amtSpan = document.createElement('span');
    amtSpan.textContent = `£${Number(amount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    amtSpan.className = 'adhoc-amount';
    amtSpan.dataset.value = amount;
    amtSpan.style.width = "110px";
    amtSpan.style.marginLeft = "8px";
    // Remove button
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Remove';
    delBtn.type = 'button';
    delBtn.className = 'adhoc-remove-btn';
    delBtn.style.marginLeft = "10px";
    delBtn.addEventListener('click', () => removeAdhocRow(row));
    // Row composition
    row.appendChild(ageSpan);
    row.appendChild(amtSpan);
    row.appendChild(delBtn);

    adhocRowsDiv.appendChild(row);
    adhocAgeEl.value = '';
    adhocAmountEl.value = '';
    renderAdhocRows();
  });
});
