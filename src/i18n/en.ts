import type { Translation } from '@jsverse/transloco';

// English source-of-truth catalog. Keep `de.ts` mirrored — every key here
// must exist in both files or Transloco falls back to the raw key string at
// runtime.
export const en: Translation = {
  common: {
    auto: 'auto',
    reset: 'reset',
    resetToAuto: 'Reset to auto-derived choice',
    advanced: '+ Advanced',
    close: 'Close',
    moreInfo: 'More information',
    skipToMain: 'Skip to main content',
  },

  units: {
    months: '{count} mo',
    monthsAbbr: 'mo',
    years: '{count} yr',
    yearsAbbr: 'yr',
  },

  splash: {
    heroTitle: 'The monthly payment',
    heroTitleAccent: 'is not the cost.',
    heroSubtitle:
      'One chart. See what a car really costs you over the years — financing, depreciation, fuel, insurance and maintenance, side by side across lease, finance and cash.',
    priceLabel: 'Negotiated price',
    powertrainLabel: 'Powertrain',
    cta: 'Get started',
    regionDefaults: '{region, select, US {US defaults} EU {EU defaults} other {{region} defaults}}',
  },

  nav: {
    reset: 'Reset',
    share: 'Share',
    viewOnGitHub: 'View on GitHub',
  },

  regionSelector: {
    aria: 'Region',
    US: 'United States region',
    EU: 'European Union region',
  },

  languageSelector: {
    aria: 'Language',
  },

  powertrain: {
    aria: 'Powertrain',
    ICE: '🔥 ICE / Hybrid',
    EV: '⚡ 100% EV',
  },

  mode: {
    lease: 'Lease',
    finance: 'Loan',
    cash: 'Cash',
  },

  modeCard: {
    total: 'Total',
    monthly: 'Monthly',
    perDistance: 'Per {unit}',
    best: 'Best',
    bestAria: 'Recommended — best value',
    conflictBadge: '{count, plural, one {# rule conflict} other {# rule conflicts}}',
    conflictBadgeTitle: 'This mode has rule conflicts',
  },

  comparison: {
    tablist: 'Financing modes',
    tip: {
      total:
        'True total cost over your keep duration. {cashOut} cash out + {oppCost} opportunity cost on tied-up capital − {asset} asset retained at end of keep = {total}.',
      monthly:
        '{total} total ÷ {months} months keep = {monthly}/mo. The "level monthly" equivalent.',
      perDistance:
        '{total} total ÷ {distance} {unit} driven over keep duration = {perDistance}/{unit}. Useful for comparing scenarios with different mileages.',
    },
  },

  recommendation: {
    reason: '{winner} has the lowest cost per {unit} at {winnerCost} — vs {others}.',
  },

  modeDetail: {
    scrollToLeversAria: 'Scroll past the chart to the controls',
    tweakLevers: 'Tweak the levers',
  },

  globals: {
    groupTitle: 'Vehicle',
    caption: 'MSRP {msrp} · {category}',
    category: {
      economy: 'Economy',
      mid: 'Mid',
      luxury: 'Luxury',
    },
    advancedDisclosure: '+ Advanced',
    annualMileage: {
      label: 'Annual mileage',
      tip: 'How far you drive each year. Drives fuel cost and (combined with keep-duration) lease overage risk.',
    },
    vehicleAge: {
      label: 'Vehicle age',
      tip: '0 means new. For used cars we back-derive the original MSRP from this and the purchase price.',
    },
    keepDuration: {
      label: 'Keep duration',
      tip: 'How many years you plan to keep the car. Sets the chart horizon and the recommended financing method.',
    },
    residualValue: {
      label: 'Residual value',
      tip: 'Auto-derived from the depreciation curve at vehicleAge + keepDuration. Override with the residual percentage from your lease contract for an apples-to-apples lease comparison.',
    },
    insurance: {
      label: 'Insurance / yr',
      tip: 'Annual full-coverage insurance. Defaults to purchase price × 2% (US) or 1.5% (EU), tuned by category. Override with your quote.',
    },
    fuelEfficiency: {
      label: 'Fuel efficiency',
      tip: 'Vehicle efficiency. ICE uses mpg (US) or L/100km (EU). EV uses mi/kWh (US) or kWh/100km (EU).',
    },
    evEfficiency: {
      label: 'EV efficiency',
    },
    fuelPrice: {
      label: 'Fuel price',
      tip: "Per-unit price for fuel or electricity at your region's typical rate.",
    },
    electricityPrice: {
      label: 'Electricity price',
    },
  },

  lease: {
    fields: {
      groupTitle: 'Lease financing',
      apr: {
        label: '{region, select, US {Money factor (APR)} EU {Lease factor (APR)} other {APR}}',
        tip: 'The annual percentage rate (Effektiver Jahreszins in EU). Internally we convert to a money factor. US contracts charge interest on the average of cap + residual; EU contracts charge interest on the financed amount only — same APR, different finance-fee math.',
      },
      term: {
        label: 'Lease term',
        tip: 'How long the lease runs. Common terms are 24, 36, 48, or 60 months.',
      },
      downPayment: {
        label: 'Down payment',
        tip: 'Cash put down on the lease. Stored separately from the loan down payment so you can compare e.g. $5k down on a lease vs. $0 on a loan. Capped at the purchase price.',
      },
    },
  },

  finance: {
    fields: {
      groupTitle: 'Loan financing',
      apr: {
        label: 'APR',
        tip: 'Annual percentage rate on the auto loan. Typical new-car rates are 5–8% in 2026.',
      },
      term: {
        label: 'Loan term',
        tip: 'How long you finance the car. Common terms are 36, 48, 60 or 72 months. Longer terms drop the monthly payment but raise total interest.',
      },
      downPayment: {
        label: 'Down payment',
        tip: 'Cash put down on the loan. Stored separately from the lease down payment so you can compare e.g. $5k down on a lease vs. $0 on a loan. Capped at the purchase price.',
      },
    },
  },

  cash: {
    fields: {
      intro:
        'Cash buys outright — no APR, no term, no down payment. Use the purchase price in the header and the opportunity-cost preference in "Your situation" below to tune cash TCO.',
    },
  },

  leaseEnd: {
    label: 'End of lease',
    aria: 'Lease end choice',
    handBackDesc:
      'You switch for a new car at lease-end and sign a new lease. Disposition fee + wear/mileage overage are paid at every cycle boundary; each new cycle also requires a fresh down payment.',
    buyOutDesc:
      'You buy the car at lease-end. Buyout price ≈ {residual} (residual value), paid in cash. Costs after the buyout are insurance, maintenance and fuel only.',
    choice: {
      handBack: 'Renew lease',
      buyOut: 'Buy out',
    },
    residual: {
      label: 'Residual at lease end',
      tip: 'Contractual residual value at the end of the lease term. Drives the monthly lease payment formula (depreciates from cap cost down to this number over the term). Auto-derived from the depreciation curve at vehicleAge + leaseTerm; override with the figure from your contract.',
    },
    dispositionFee: {
      label: 'Disposition fee',
      tip: 'One-time fee paid when you return the leased car. Typical range 300–500.',
    },
    excessWear: {
      label: 'Excess wear estimate',
      tip: 'A rough buffer for end-of-lease wear charges. ~500–1500 typical for a 3-yr lease; 2000+ with kids, pets or city parking.',
    },
    mileageOverage: {
      label: 'Mileage overage rate (per {unit})',
      tip: "Per-distance charge for going over the lease's mileage cap. Typically 0.15–0.30 per mile / 0.10–0.20 per km.",
    },
    buyoutFee: {
      label: 'Buyout fee',
      tip: 'One-time administrative fee charged on top of the residual value when you exercise the lease buyout. Typical 300–500.',
    },
    earlyTermination: {
      label: 'Early termination penalty',
      tip: "Total amount the lessor charges when you exit before the lease term ends. Defaults to a depreciation-based approximation of typical lessor tables ((term − keep) / term × total depreciation); override with the exact figure from your contract's early-exit table. Capped at 90% of the financed portion. Applies to both renew-lease and buy-out modes.",
      notApplicable:
        'Not applicable: keep duration ({keep} yr) is at or beyond the lease term ({term} mo) — no early exit happens.',
    },
  },

  situation: {
    groupTitle: 'Your situation',
    oppCost: {
      label: 'Opportunity cost',
      description:
        "What would you do with the money instead? We charge this rate on each financing method's down payment (or full price for cash).",
      savings: 'Savings · 1%',
      investing: 'Investing · 6%',
    },
    charger: {
      label: 'Home charger',
      description:
        '"Buying" adds the install cost to TCO; "Installed" is treated as a sunk cost and isn\'t counted.',
      none: 'None',
      installed: 'Installed',
      buying: 'Buying',
    },
    solar: {
      label: 'Solar',
      gating: 'only relevant with a home charger',
      description:
        'Assumes 85% home charging from rooftop solar (≈ free) and 15% public charging at the grid rate. When on, EV electricity cost drops to ~15% of the grid price.',
      off: 'Off',
      on: 'On',
    },
  },

  maintenance: {
    label: 'Maintenance',
    tip: 'Auto-calculated from MSRP × baseline rate × category multiplier × mileage factor, modulated by the maintenance curve over age. Lease-renew resets the curve every cycle (new car each time).',
    display: {
      resetsEachCycle: '{perYear} / yr (resets each cycle)',
      flatDuringLease: '{perYear} / yr (flat during lease)',
      flatThenOwned: 'flat during lease → {perYear} / yr (year 1 owned)',
      range: '{yr1} / yr (year 1) → {yrN} / yr (year {year})',
    },
  },

  hero: {
    cashEyebrow: 'Cash',
    ownershipEyebrow: 'Ownership',
    oppCostLine: 'Ignoring {amount} in opportunity cost',
    oppCostNote: 'Included in the true-cost view, not in the cash-out total.',
    totalCashOut: 'Total cash out',
    line: {
      downPayment: '{count, plural, one {Down payment} other {Down payments}}',
      leasePayments: 'Lease payments',
      buyout: 'Buyout',
      handbackFee: '{count, plural, one {Handback fee} other {Handback fees}}',
      loanPayments: 'Loan payments',
      purchasePrice: 'Purchase price',
      insurance: 'Insurance',
      maintenance: 'Maintenance',
      fuel: 'Fuel',
      electricity: 'Electricity',
      chargerInstall: 'Home charger install',
    },
    detail: {
      monthlyTimes: '{amount} × {months} mo',
      cyclesTimes: '{cycles} × {amount}',
      residual: '{amount} residual',
      fee: '{amount} fee',
      earlyExit: '{amount} early-exit',
    },
    cap: {
      year1: 'mainly year 1',
      year1Mobile: 'yr 1',
      yearRange: 'mainly years 1-{through}',
      yearRangeMobile: 'yrs 1-{through}',
    },
    assetCaption: {
      afterYears: 'after {years} years',
      afterYearsMobile: 'after {years} yr',
      afterYearsBoughtOut: 'after {years} years (bought out at year {term})',
      afterYearsBoughtOutMobile: 'after {years} yr · bought out',
      afterYearsReturned: 'after {years} years (vehicle returned)',
      afterYearsReturnedMobile: 'after {years} yr · returned',
    },
  },

  conflicts: {
    apply: 'Apply',
    keep: 'Keep {value}',
    body: {
      recommending: 'recommending',
      insteadOf: 'instead of',
      because: 'because',
    },
    leaseApr: {
      label: 'Lease APR',
      reason:
        'new cars (vehicleAge = 0) typically qualify for promotional ~1% manufacturer financing, while used cars run ~3%.',
    },
    residualValue: {
      label: 'Residual value',
      reason:
        'the depreciation curve at vehicleAge + keepDuration suggests this end-of-keep value. Override with the figure from your contract for an apples-to-apples comparison.',
    },
    insurance: {
      label: 'Insurance / yr',
      reason:
        'purchase price × regional rate × vehicle category yields this baseline. Override with a real quote for accuracy.',
    },
    fuelEfficiency: {
      label: 'Fuel efficiency',
      reason:
        "this is the typical fuel efficiency in {region}. Override with your vehicle's spec sheet.",
    },
    evEfficiency: {
      label: 'EV efficiency',
      reason:
        "this is the typical EV efficiency in {region}. Override with your vehicle's spec sheet.",
    },
    fuelPrice: {
      label: 'Fuel price',
      reason: 'this is the typical pump price in {region}. Override with current local prices.',
    },
    electricityPrice: {
      label: 'Electricity price',
      reason:
        'this is the typical electricity rate in {region}. Override with your local utility tariff.',
    },
    leaseEndChoice: {
      label: 'End of lease',
      reason:
        'keep duration vs. lease term picks the cheaper outcome — keep ≤ term → renew lease, keep > term → buy out.',
    },
    earlyTerminationFee: {
      label: 'Early termination penalty',
      reason:
        '(term − keep) / term × total depreciation approximates typical lessor early-exit tables. Replace with the exact figure from your contract.',
    },
    leaseEndResidual: {
      label: 'Residual at lease end',
      reason:
        'the depreciation curve at vehicleAge + leaseTerm gives this contractual residual. Override with the figure from your lease contract.',
    },
  },

  slider: {
    resetTitle: 'Reset to auto-derived value',
  },

  curveEditor: {
    overrideActive: 'Override active',
    yearAbbr: 'Yr',
    tooltipYear: 'Year {year}',
    resetToDefault: 'Reset to default',
    done: 'Done',
    residualAtLeaseEnd: 'Residual @ lease end',
    residualAtKeepEnd: 'Residual @ end of keep',
    depreciation: {
      trigger: 'Edit depreciation curve',
      title: 'Depreciation curve',
      description:
        'Set the resale value as a fraction of MSRP at each milestone year. Defaults differ for ICE and EV; your override applies regardless of powertrain.',
      tooltipPercent: "{percent}% of today's price",
    },
    maintenance: {
      trigger: 'Edit maintenance curve',
      title: 'Maintenance curve',
      description:
        'Set the annual maintenance cost as a percentage of MSRP at each milestone year. Defaults differ for ICE and EV; your override applies regardless of powertrain.',
      year1: 'Year 1',
      yearN: 'Year {year}',
      percentMsrp: '% MSRP',
      tooltipPerYear: '{amount} / yr',
    },
  },

  share: {
    pageTitle: 'Real Cost of my Vehicle',
    dialogTitle: 'Share scenario',
    generating: 'Generating short link…',
    copy: 'Copy',
    copied: 'Copied!',
    shortenFailed: "Couldn't shorten — using full link.",
    orSendVia: 'Or send via',
    systemShare: 'Use system share sheet',
    tagline:
      "What this car really costs over {years, plural, one {1 year} other {# years}}",
  },

  footer: {
    fineprint:
      "Fineprint — this is a side project, vibe-coded on weekends by some dude on the internet. The numbers are rough estimates with a stack of simplifying assumptions baked in (depreciation curves, regional defaults, category multipliers, etc). Useful for a sanity check; not a substitute for the actual contract from your dealer, a real insurance quote, your own math, or a financial advisor with credentials. Don't sign a five-figure deal because a chart on a stranger's website said so.",
  },

  chart: {
    title: 'Cumulative total cost of ownership',
    monthLabel: 'Mo',
    tableCaption: 'Cumulative total cost of ownership by year and category',
    colYear: 'Year',
    colTotal: 'Total cost',
    ariaSummary:
      'Cumulative total cost of ownership over {months} months. Total cost {total}, cash out of pocket {cashOut}. Largest cost component: {largestLabel} at {largestAmount}.',
    legend: {
      depreciationOrLease: 'Depreciation / lease',
      interestAndFees: 'Interest & fees',
      opportunityCost: 'Opportunity cost',
      fuel: 'Fuel',
      electricity: 'Electricity',
      insurance: 'Insurance',
      maintenance: 'Maintenance',
      leaseEnd: 'Lease-end fees',
      cashOut: 'Cash',
    },
  },
};
