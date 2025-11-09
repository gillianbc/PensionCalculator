(function (global) {
  const { addRate, wealth } = global.Utils;

  function strategy4(savingsP, pensionP, requiredNetP, adhoc, params) {
    const { START_AGE, END_AGE, STATE_PENSION_P, PERSONAL_ALLOWANCE_P, BASIC_RATE, BASIC_RATE_BAND_P, PENSION_GROWTH_RATE } = params;
    const TAX_FREE_PORTION = (typeof params.TAX_FREE_PORTION === 'number' ? params.TAX_FREE_PORTION : 0.25), TAXED_PORTION = 1 - TAX_FREE_PORTION;

    const len = END_AGE - START_AGE + 1;
    const timeline = new Array(len);

    let otherSavingsP = params.INITIAL_OTHER_SAVINGS_P || 0;
    let isaSavingsP = params.INITIAL_ISA_SAVINGS_P || 0;

    let age = START_AGE;
    for (let idx = 0; idx < len; idx++, age++) {
      const pensionStart = Math.round(pensionP);
      const savingsStart = Math.round(otherSavingsP + isaSavingsP);
      let taxPaid = 0;

      const statePensionIncome = age >= 67 ? STATE_PENSION_P : 0;
      const extra = adhoc[age] || 0;

      let need = requiredNetP + extra - statePensionIncome;
      if (need < 0) need = 0;

      let allowanceLeft = PERSONAL_ALLOWANCE_P - statePensionIncome;
      if (allowanceLeft < 0) allowanceLeft = 0;

      // Step A: zero-tax UFPLS within allowance
      if (pensionP > 0 && allowanceLeft > 0) {
        const grossCapWithinAllowance = Math.round(allowanceLeft / TAXED_PORTION);
        const grossZero = Math.min(grossCapWithinAllowance, pensionP);
        if (grossZero > 0) {
          const taxableZero = Math.round(grossZero * TAXED_PORTION);
          const netZero = grossZero;
          pensionP -= grossZero;
          const consumed = Math.min(taxableZero, allowanceLeft);
          allowanceLeft -= consumed; if (allowanceLeft < 0) allowanceLeft = 0;
          // We'll apply net to needs later as a pool
          var netFromPensionTotal = netZero;
        } else {
          var netFromPensionTotal = 0;
        }
      } else {
        var netFromPensionTotal = 0;
      }

      // Step B: fill basic-rate band
      if (pensionP > 0) {
        let taxableFromStatePension = statePensionIncome - PERSONAL_ALLOWANCE_P;
        if (taxableFromStatePension < 0) taxableFromStatePension = 0;
        let remainingBasicBand = BASIC_RATE_BAND_P - taxableFromStatePension;
        if (remainingBasicBand < 0) remainingBasicBand = 0;

        if (remainingBasicBand > 0) {
          const grossFillTarget = Math.round((remainingBasicBand + allowanceLeft) / TAXED_PORTION);
          const grossFill = Math.min(grossFillTarget, pensionP);
          if (grossFill > 0) {
            const taxablePortion = Math.round(grossFill * TAXED_PORTION);
            const zeroTaxOnTaxable = Math.min(taxablePortion, allowanceLeft);
            let taxedAboveAllowance = taxablePortion - zeroTaxOnTaxable;
            if (taxedAboveAllowance < 0) taxedAboveAllowance = 0;

            const tax = Math.round(taxedAboveAllowance * BASIC_RATE);
            taxPaid += tax;
            const netFill = grossFill - tax;

            pensionP -= grossFill;
            allowanceLeft -= zeroTaxOnTaxable; if (allowanceLeft < 0) allowanceLeft = 0;

            netFromPensionTotal += netFill;
          }
        }
      }

      // Apply net pension to spending; surplus to savings
      if (netFromPensionTotal > 0) {
        const spendFromPension = Math.min(netFromPensionTotal, need);
        need -= spendFromPension;
        const surplus = netFromPensionTotal - spendFromPension;
        if (surplus > 0) otherSavingsP += surplus;
      }

      // If still needed, top up from savings (Other then ISA)
      if (need > 0 && (otherSavingsP > 0 || isaSavingsP > 0)) {
        const res = global.Utils.spendFromSavings(need, otherSavingsP, isaSavingsP);
        otherSavingsP = res.otherP; isaSavingsP = res.isaP; need = res.need; if (need < 0) need = 0;
      }

      pensionP = Math.round(pensionP * addRate(PENSION_GROWTH_RATE));

      timeline[idx] = wealth(age, Math.round(pensionStart), Math.round(pensionP), Math.round(savingsStart), Math.round(otherSavingsP + isaSavingsP), Math.round(taxPaid), Math.round(extra));
    }
    return timeline;
  }

  global.Strategies = Object.assign({}, global.Strategies, { strategy4 });
})(typeof window !== 'undefined' ? window : globalThis);
