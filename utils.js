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
  // Backwards compatible: last four params default to 0 so old callers still work.
  const wealth = (age, pensionStart, pensionEnd, savingsStart, savingsEnd, taxPaid, extraThisYear, isaStart = 0, isaEnd = 0, otherStart = 0, otherEnd = 0) => ({
    age,
    pensionStart,
    pensionEnd,
    savingsStart,
    savingsEnd,
    taxPaid,
    extraThisYear,
    // New detailed savings breakdown
    isaStart,
    isaEnd,
    otherStart,
    otherEnd,
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

  // Spend from savings with priority: Other Savings first, then ISA
  const spendFromSavings = (need, otherP, isaP) => {
    let useOther = Math.min(need, otherP);
    otherP -= useOther;
    need -= useOther;
    let useIsa = Math.min(need, isaP);
    isaP -= useIsa;
    need -= useIsa;
    return { spent: useOther + useIsa, otherP, isaP, need };
  };

  // Withdraw an exact amount from savings pools (up to available), prioritized Other then ISA
  const withdrawFromSavings = (amount, otherP, isaP) => {
    const takeOther = Math.min(amount, otherP);
    otherP -= takeOther;
    const remainder = amount - takeOther;
    const takeIsa = Math.min(remainder, isaP);
    isaP -= takeIsa;
    return { withdrawn: takeOther + takeIsa, otherP, isaP };
  };

  global.Utils = Object.assign({}, global.Utils, {
    toPence,
    fromPence,
    formatGBP,
    clampNonNeg,
    mulRatePence,
    addRate,
    wealth,
    parseAdhoc,
    spendFromSavings,
    withdrawFromSavings
  });
})(typeof window !== 'undefined' ? window : globalThis);
