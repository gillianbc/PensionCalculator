(function (global) {
  const { addRate, wealth } = global.Utils;

  function strategy2(savingsP, pensionP, requiredNetP, adhoc, params) {
    const { START_AGE, END_AGE, STATE_PENSION_P, PERSONAL_ALLOWANCE_P, BASIC_RATE, PENSION_GROWTH_RATE } = params;
    const TAX_FREE_PORTION = (typeof params.TAX_FREE_PORTION === 'number' ? params.TAX_FREE_PORTION : 0.25), TAXED_PORTION = 1 - TAX_FREE_PORTION;
    const NET_FACTOR = TAX_FREE_PORTION + TAXED_PORTION * (1 - BASIC_RATE);

    const len = END_AGE - START_AGE + 1;
    const timeline = new Array(len);

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
      const fromSavings = Math.min(need, savingsP);
      savingsP -= fromSavings;
      need -= fromSavings;

      if (need > 0 && pensionP > 0) {
        let allowanceLeft = PERSONAL_ALLOWANCE_P - statePensionIncome;
        if (allowanceLeft < 0) allowanceLeft = 0;

        const thresholdGrossWithinAllowance = Math.round(allowanceLeft / TAXED_PORTION);
        let grossRequired;
        if (need <= thresholdGrossWithinAllowance) {
          grossRequired = need;
        } else {
          const adjustedNeed = need - Math.round(allowanceLeft * BASIC_RATE);
          grossRequired = Math.round(adjustedNeed / NET_FACTOR);
        }
        const grossWithdraw = Math.min(grossRequired, pensionP);

        const taxablePortion = Math.round(grossWithdraw * TAXED_PORTION);
        const zeroTaxOnTaxable = Math.min(taxablePortion, allowanceLeft);
        let taxedAboveAllowance = taxablePortion - zeroTaxOnTaxable;
        if (taxedAboveAllowance < 0) taxedAboveAllowance = 0;

        const taxForThisWithdrawal = Math.round(taxedAboveAllowance * BASIC_RATE);
        taxPaid += taxForThisWithdrawal;

        const netFromPension = grossWithdraw - taxForThisWithdrawal;

        need -= netFromPension;
        if (need < 0) need = 0;

        pensionP -= grossWithdraw;
      }

      pensionP = Math.round(pensionP * addRate(PENSION_GROWTH_RATE));

      const pensionEnd = Math.round(pensionP);
      const savingsEnd = Math.round(savingsP);
      timeline[idx] = wealth(age, pensionStart, pensionEnd, savingsStart, savingsEnd, Math.round(taxPaid), Math.round(extra));
    }
    return timeline;
  }

  global.Strategies = Object.assign({}, global.Strategies, { strategy2 });
})(typeof window !== 'undefined' ? window : globalThis);
