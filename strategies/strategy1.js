(function (global) {
  const { addRate, wealth } = global.Utils;

  function strategy1(savingsP, pensionP, requiredNetP, adhoc, params) {
    const { START_AGE, END_AGE, STATE_PENSION_P, PERSONAL_ALLOWANCE_P, BASIC_RATE, PENSION_GROWTH_RATE } = params;
    const len = END_AGE - START_AGE + 1;
    const timeline = new Array(len);
    let lumpSumTaken = false;

    let age = START_AGE;
    for (let idx = 0; idx < len; idx++, age++) {
      const pensionStart = Math.round(pensionP);
      const savingsStart = Math.round(savingsP);
      let taxPaid = 0;

      const statePensionIncome = age >= 67 ? STATE_PENSION_P : 0;
      const extra = adhoc[age] || 0;

      let need = requiredNetP + extra - statePensionIncome;
      if (need < 0) need = 0;

      // Use savings first
      let fromSavings = Math.min(need, savingsP);
      savingsP -= fromSavings;
      need -= fromSavings;

      // One-time lump sum: configurable tax-free portion of pension into savings if still needed
      if (need > 0 && !lumpSumTaken && pensionP > 0) {
        const lump = Math.round(pensionP * (typeof params.TAX_FREE_PORTION === 'number' ? params.TAX_FREE_PORTION : 0.25));
        pensionP -= lump;
        savingsP += lump;
        lumpSumTaken = true;

        const fromSavings2 = Math.min(need, savingsP);
        savingsP -= fromSavings2;
        need -= fromSavings2;
      }

      // If still needed, withdraw from pension applying tax rules
      if (need > 0 && pensionP > 0) {
        let allowanceLeft = PERSONAL_ALLOWANCE_P - statePensionIncome;
        if (allowanceLeft < 0) allowanceLeft = 0;

        // If within allowance: gross = need; else split across allowance and taxed-at-basic
        let grossRequired;
        if (need <= allowanceLeft) {
          grossRequired = need;
        } else {
          const remainingNet = need - allowanceLeft;
          const grossAbove = Math.round(remainingNet / (1 - BASIC_RATE));
          grossRequired = allowanceLeft + grossAbove;
        }
        const grossWithdraw = Math.min(grossRequired, pensionP);

        const zeroTaxPortion = Math.min(grossWithdraw, allowanceLeft);
        let basicTaxPortion = grossWithdraw - zeroTaxPortion;
        if (basicTaxPortion < 0) basicTaxPortion = 0;

        const netFromPension = zeroTaxPortion + Math.round(basicTaxPortion * (1 - BASIC_RATE));
        const taxForThisWithdrawal = Math.round(basicTaxPortion * BASIC_RATE);
        taxPaid += taxForThisWithdrawal;

        need -= netFromPension;
        if (need < 0) need = 0;

        pensionP -= grossWithdraw;
      }

      // End-of-year growth
      pensionP = Math.round(pensionP * addRate(PENSION_GROWTH_RATE));

      const pensionEnd = Math.round(pensionP);
      const savingsEnd = Math.round(savingsP);
      timeline[idx] = wealth(age, pensionStart, pensionEnd, savingsStart, savingsEnd, Math.round(taxPaid), Math.round(extra));
    }
    return timeline;
  }

  global.Strategies = Object.assign({}, global.Strategies, { strategy1 });
})(typeof window !== 'undefined' ? window : globalThis);
