(function (global) {
  const { addRate, wealth } = global.Utils;

  function strategy3A(savingsP, pensionP, requiredNetP, adhoc, params) {
    const { START_AGE, END_AGE, STATE_PENSION_P, PERSONAL_ALLOWANCE_P, BASIC_RATE, PENSION_GROWTH_RATE, NO_INCOME_CONTRIBUTION_LIMIT_P } = params;
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

      // Pay up to £3,600 gross (net £2,880) from savings into pension if age <= 75
      if (age <= 75 && savingsP > 0) {
        const netCap = Math.round(NO_INCOME_CONTRIBUTION_LIMIT_P * (1 - BASIC_RATE)); // 2880
        const netFromSavings = Math.min(savingsP, netCap);
        if (netFromSavings > 0) {
          const gross = Math.round(netFromSavings / (1 - BASIC_RATE));
          savingsP -= netFromSavings;
          pensionP += gross;
        }
      }

      if (need > 0 && pensionP > 0) {
        let allowanceLeft = PERSONAL_ALLOWANCE_P - statePensionIncome;
        if (allowanceLeft < 0) allowanceLeft = 0;

        const grossCapWithinAllowance = Math.round(allowanceLeft / TAXED_PORTION);
        const grossZeroCandidate = Math.min(need, grossCapWithinAllowance, pensionP);
        const grossZero = Math.round(grossZeroCandidate);
        if (grossZero > 0) {
          const taxableZero = Math.round(grossZero * TAXED_PORTION);
          const netZero = grossZero;
          pensionP -= grossZero;
          need -= netZero; if (need < 0) need = 0;
          const consumed = Math.min(taxableZero, allowanceLeft);
          allowanceLeft -= consumed; if (allowanceLeft < 0) allowanceLeft = 0;
        }

        if (need > 0 && savingsP > 0) {
          const fromSavings = Math.min(need, savingsP);
          savingsP -= fromSavings; need -= fromSavings; if (need < 0) need = 0;
        }

        if (need > 0 && pensionP > 0) {
          let adjustedNeed = need - Math.round(allowanceLeft * BASIC_RATE);
          if (adjustedNeed < 0) adjustedNeed = 0;
          const grossRequired = Math.round(adjustedNeed / NET_FACTOR);
          const grossWithdraw = Math.min(grossRequired, pensionP);

          const taxablePortion = Math.round(grossWithdraw * TAXED_PORTION);
          const zeroTaxOnTaxable = Math.min(taxablePortion, allowanceLeft);
          let taxedAboveAllowance = taxablePortion - zeroTaxOnTaxable;
          if (taxedAboveAllowance < 0) taxedAboveAllowance = 0;
          const taxForThisWithdrawal = Math.round(taxedAboveAllowance * BASIC_RATE);
          taxPaid += taxForThisWithdrawal;

          const netFromPension = grossWithdraw - taxForThisWithdrawal;

          pensionP -= grossWithdraw;
          need -= netFromPension; if (need < 0) need = 0;

          allowanceLeft -= zeroTaxOnTaxable; if (allowanceLeft < 0) allowanceLeft = 0;
        }
      }

      if (need > 0 && savingsP > 0) {
        const fromSavings = Math.min(need, savingsP);
        savingsP -= fromSavings; need -= fromSavings; if (need < 0) need = 0;
      }

      pensionP = Math.round(pensionP * addRate(PENSION_GROWTH_RATE));

      timeline[idx] = wealth(age, Math.round(pensionStart), Math.round(pensionP), Math.round(savingsStart), Math.round(savingsP), Math.round(taxPaid), Math.round(extra));
    }

    return timeline;
  }

  global.Strategies = Object.assign({}, global.Strategies, { strategy3A });
})(typeof window !== 'undefined' ? window : globalThis);
