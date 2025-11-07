// Utilities module: money helpers, rate helpers, wealth factory, and ad-hoc parser
(function (global) {
  // Money utils (integers in pence to avoid floating errors)
  const toPence = (str) => {
    if (typeof str === 'number') return Math.round(str * 100);
    if (!str) return 0;
    const cleaned = String(str).replace(/[^0-9.\-]/g, '');
    const num = Number(cleaned);
    if (Number.isNaN(num)) return 0;
    return Math.round(num * 100);
  };
  const fromPence = (p) => (p / 100);
  const formatGBP = (p) => {
    const n = fromPence(p);
    return '£' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const clampNonNeg = (p) => (p < 0 ? 0 : p);

  // Rate helpers
  const mulRatePence = (pence, rate) => Math.round(pence * rate);
  const addRate = (rate) => 1 + rate;

  // Data structure for a year snapshot
  const wealth = (age, pensionStart, pensionEnd, savingsStart, savingsEnd, taxPaid, extraThisYear) => ({
    age, pensionStart, pensionEnd, savingsStart, savingsEnd, taxPaid, extraThisYear,
    totalEnd() { return this.pensionEnd + this.savingsEnd; }
  });

  // Parse ad hoc field: "62:5000; 70:10000"
  const parseAdhoc = (text) => {
    const map = {};
    if (!text || !text.trim()) return map;
    const pairs = text.split(';').map(s => s.trim()).filter(Boolean);
    for (const pair of pairs) {
      const [a, v] = pair.split(':').map(s => s.trim());
      const age = Number(a);
      const val = toPence(v);
      if (!Number.isNaN(age) && age > 0 && val >= 0) map[age] = val;
    }
    return map;
  };

  global.Utils = Object.assign({}, global.Utils, {
    toPence,
    fromPence,
    formatGBP,
    clampNonNeg,
    mulRatePence,
    addRate,
    wealth,
    parseAdhoc
  });
})(typeof window !== 'undefined' ? window : globalThis);
