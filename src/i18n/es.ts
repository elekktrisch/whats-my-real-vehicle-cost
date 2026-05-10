import type { Translation } from '@jsverse/transloco';

// Spanish catalog. Mirror the structure of `en.ts`. Every key in en MUST
// have a corresponding entry here, or Transloco falls back to the key string.
export const es: Translation = {
  common: {
    auto: 'auto',
    reset: 'restab.',
    resetToAuto: 'Restablecer al valor automático',
    advanced: '+ Avanzado',
    close: 'Cerrar',
    moreInfo: 'Más información',
    skipToMain: 'Saltar al contenido principal',
  },

  units: {
    months: '{count} meses',
    monthsAbbr: 'meses',
    years: '{count} años',
    yearsAbbr: 'años',
  },

  splash: {
    heroTitle: 'La cuota mensual',
    heroTitleAccent: 'no es el coste real.',
    heroSubtitle:
      'Un gráfico. Lo que un coche te cuesta de verdad a lo largo de los años — financiación, depreciación, combustible, seguro y mantenimiento, comparados entre leasing, financiación y contado.',
    priceLabel: 'Precio negociado',
    powertrainLabel: 'Motorización',
    cta: 'Empezar',
  },

  nav: {
    reset: 'Restablecer',
    share: 'Compartir',
    github: 'GitHub',
  },

  regionSelector: {
    aria: 'Región',
    US: 'Región Estados Unidos',
    EU: 'Región Unión Europea',
  },

  languageSelector: {
    aria: 'Idioma',
  },

  powertrain: {
    aria: 'Motorización',
    ICE: '🔥 Térmica / Híbrida',
    EV: '⚡ 100% Eléctrica',
  },

  mode: {
    lease: 'Leasing',
    finance: 'Préstamo',
    cash: 'Contado',
  },

  modeCard: {
    total: 'Total',
    monthly: 'Mensual',
    perDistance: 'Por {unit}',
    best: 'Top',
    bestAria: 'Recomendado — mejor relación calidad-precio',
    conflictBadge: '{count, plural, one {# conflicto de regla} other {# conflictos de regla}}',
    conflictBadgeTitle: 'Este modo presenta conflictos de regla',
  },

  comparison: {
    tablist: 'Modos de financiación',
    tip: {
      total:
        'Coste total real durante el período de tenencia. {cashOut} de desembolso + {oppCost} de coste de oportunidad sobre el capital inmovilizado − {asset} valor residual al final = {total}.',
      monthly:
        '{total} total ÷ {months} meses de tenencia = {monthly}/mes. El equivalente "cuota mensual constante".',
      perDistance:
        '{total} total ÷ {distance} {unit} recorridos durante la tenencia = {perDistance}/{unit}. Útil para comparar escenarios con kilometrajes diferentes.',
    },
  },

  recommendation: {
    reason: '{winner} tiene el coste más bajo por {unit} en {winnerCost} — frente a {others}.',
  },

  modeDetail: {
    scrollToLeversAria: 'Desplazarse más allá del gráfico hasta los controles',
    tweakLevers: 'Ajustar los parámetros',
  },

  globals: {
    groupTitle: 'Vehículo',
    caption: 'PVP {msrp} · {category}',
    category: {
      economy: 'Utilitario',
      mid: 'Medio',
      luxury: 'Lujo',
    },
    advancedDisclosure: '+ Avanzado',
    annualMileage: {
      label: 'Kilometraje anual',
      tip: 'Cuánto conduces al año. Determina el coste de combustible y (junto con la duración de tenencia) el riesgo de exceso de kilometraje en leasing.',
    },
    vehicleAge: {
      label: 'Edad del vehículo',
      tip: '0 = nuevo. Para usados, deducimos el PVP original a partir de este valor y el precio de compra.',
    },
    keepDuration: {
      label: 'Duración de tenencia',
      tip: 'Cuántos años piensas conservar el coche. Define el horizonte del gráfico y el método de financiación recomendado.',
    },
    residualValue: {
      label: 'Valor residual',
      tip: 'Deducido automáticamente de la curva de depreciación en edad-vehículo + duración-tenencia. Sustitúyelo por el valor residual de tu contrato de leasing para una comparación coherente.',
    },
    insurance: {
      label: 'Seguro / año',
      tip: 'Seguro a todo riesgo anual. Por defecto: precio de compra × 2% (US) o 1,5% (EU), ajustado por categoría. Sustitúyelo por tu cotización.',
    },
    fuelEfficiency: {
      label: 'Consumo',
      tip: 'Eficiencia del vehículo. Térmicos: mpg (US) o L/100km (EU). EV: mi/kWh (US) o kWh/100km (EU).',
    },
    evEfficiency: {
      label: 'Eficiencia EV',
    },
    fuelPrice: {
      label: 'Precio del combustible',
      tip: 'Precio por unidad de combustible o electricidad a la tarifa típica de tu región.',
    },
    electricityPrice: {
      label: 'Precio de la electricidad',
    },
  },

  lease: {
    fields: {
      groupTitle: 'Financiación leasing',
      apr: {
        label: '{region, select, US {Money factor (TAE)} EU {Coeficiente leasing (TAE)} other {TAE}}',
        tip: 'La tasa anual equivalente. Internamente la convertimos en money factor. Los contratos US calculan intereses sobre la media capital + residual; los contratos EU solo sobre el importe financiado — misma TAE, cálculo de comisiones distinto.',
      },
      term: {
        label: 'Duración del leasing',
        tip: 'Duración del contrato de leasing. Plazos comunes: 24, 36, 48 o 60 meses.',
      },
      downPayment: {
        label: 'Entrada',
        tip: 'Entrada del leasing. Almacenada por separado de la entrada del préstamo, para poder comparar p. ej. 5.000 € en leasing frente a 0 € en préstamo. Limitada al precio de compra.',
      },
    },
  },

  finance: {
    fields: {
      groupTitle: 'Préstamo auto',
      apr: {
        label: 'TAE',
        tip: 'Tasa anual equivalente del préstamo auto. Tasas típicas para coche nuevo en 2026: 5–8%.',
      },
      term: {
        label: 'Duración del préstamo',
        tip: 'Cuánto tiempo financias el coche. Plazos comunes: 36, 48, 60 o 72 meses. Plazos más largos bajan la cuota pero suben el total de intereses.',
      },
      downPayment: {
        label: 'Entrada',
        tip: 'Entrada del préstamo. Almacenada por separado de la entrada del leasing, para poder comparar p. ej. 5.000 € en leasing frente a 0 € en préstamo. Limitada al precio de compra.',
      },
    },
  },

  cash: {
    fields: {
      intro:
        'Al contado lo pagas todo de golpe — sin TAE, sin plazo, sin entrada. Usa el precio de compra arriba y la rentabilidad esperada en "Tu situación" abajo para ajustar el TCO al contado.',
    },
  },

  leaseEnd: {
    label: 'Fin de leasing',
    aria: 'Decisión al final del leasing',
    handBackDesc:
      'Cambias de coche al final del leasing y firmas un nuevo contrato. Comisión de devolución + excesos de kilometraje/desgaste se pagan al final de cada ciclo; cada nuevo ciclo exige una nueva entrada.',
    buyOutDesc:
      'Compras el coche al final del leasing. Precio de compra ≈ {residual} (valor residual), pagado al contado. Tras la compra solo quedan seguro, mantenimiento y combustible.',
    choice: {
      handBack: 'Renovar leasing',
      buyOut: 'Comprar',
    },
    residual: {
      label: 'Residual al final del leasing',
      tip: 'Valor residual contractual al final del leasing. Determina la fórmula de la cuota mensual (depreciación del capital hasta este valor durante el plazo). Deducido automáticamente de la curva de depreciación en edad-vehículo + duración-leasing; sustitúyelo por el valor de tu contrato.',
    },
    dispositionFee: {
      label: 'Comisión de devolución',
      tip: 'Comisión única al devolver el vehículo en leasing. Habitual 300–500.',
    },
    excessWear: {
      label: 'Estimación desgaste excesivo',
      tip: 'Provisión aproximada para gastos de desgaste al final del leasing. ~500–1500 típico para un leasing de 3 años; 2000+ con niños, mascotas o aparcamiento urbano.',
    },
    mileageOverage: {
      label: 'Tarifa exceso km (por {unit})',
      tip: 'Sobreprecio por unidad de distancia por encima del límite contractual. Habitual 0,15–0,30 por milla / 0,10–0,20 por km.',
    },
    buyoutFee: {
      label: 'Comisión de compra',
      tip: 'Comisión administrativa única además del valor residual al ejercer la compra del leasing. Habitual 300–500.',
    },
    earlyTermination: {
      label: 'Penalización por cancelación anticipada',
      tip: 'Importe total que cobra el arrendador al salir antes del fin del leasing. Por defecto, una aproximación basada en la depreciación ((plazo − tenencia) / plazo × depreciación total); sustitúyelo por el importe exacto de la tabla de salida de tu contrato. Limitado al 90% de la parte financiada. Aplica tanto para renovar como para comprar.',
      notApplicable:
        'No aplicable: la duración de tenencia ({keep} años) alcanza o supera el plazo del leasing ({term} meses) — no hay salida anticipada.',
    },
  },

  situation: {
    groupTitle: 'Tu situación',
    oppCost: {
      label: 'Coste de oportunidad',
      description:
        '¿Qué harías con el dinero si no? Aplicamos esta tasa a la entrada de cada modo de financiación (o al precio completo en contado).',
      savings: 'Ahorro · 1%',
      investing: 'Inversión · 6%',
    },
    charger: {
      label: 'Cargador en casa',
      description:
        '"Comprando" añade el coste de instalación al TCO; "Instalado" se trata como coste hundido y no se cuenta.',
      none: 'Ninguno',
      installed: 'Instalado',
      buying: 'Comprando',
    },
    solar: {
      label: 'Solar',
      gating: 'solo relevante con cargador en casa',
      description:
        'Suposición: 85% de carga en casa con solar (≈ gratis) y 15% pública a la tarifa de red. Activado, el coste de electricidad EV baja a ~15% del precio de red.',
      off: 'Off',
      on: 'On',
    },
  },

  maintenance: {
    label: 'Mantenimiento',
    tip: 'Calculado a partir de PVP × tasa base × multiplicador de categoría × factor kilometraje, modulado por la curva de mantenimiento según la edad. La renovación de leasing reinicia la curva en cada ciclo (coche nuevo cada vez).',
    display: {
      resetsEachCycle: '{perYear} / año (se reinicia cada ciclo)',
      flatDuringLease: '{perYear} / año (constante durante el leasing)',
      flatThenOwned: 'constante durante el leasing → {perYear} / año (año 1 tras compra)',
      range: '{yr1} / año (año 1) → {yrN} / año (año {year})',
    },
  },

  hero: {
    cashEyebrow: 'Contado',
    ownershipEyebrow: 'Propiedad',
    oppCostLine: 'Sin contar {amount} de coste de oportunidad',
    oppCostNote: 'Incluido en el coste real, no en el desembolso total.',
    totalCashOut: 'Desembolso total',
    line: {
      downPayment: '{count, plural, one {Entrada} other {Entradas}}',
      leasePayments: 'Cuotas leasing',
      buyout: 'Compra',
      handbackFee: '{count, plural, one {Comisión de devolución} other {Comisiones de devolución}}',
      loanPayments: 'Cuotas préstamo',
      purchasePrice: 'Precio de compra',
      insurance: 'Seguro',
      maintenance: 'Mantenimiento',
      fuel: 'Combustible',
      electricity: 'Electricidad',
      chargerInstall: 'Instalación cargador',
    },
    detail: {
      monthlyTimes: '{amount} × {months} meses',
      cyclesTimes: '{cycles} × {amount}',
      residual: '{amount} residual',
      fee: '{amount} de comisión',
      earlyExit: '{amount} salida anticipada',
    },
    cap: {
      year1: 'sobre todo año 1',
      year1Mobile: 'a. 1',
      yearRange: 'sobre todo años 1-{through}',
      yearRangeMobile: 'a. 1-{through}',
    },
    assetCaption: {
      afterYears: 'tras {years} años',
      afterYearsMobile: 'tras {years} a.',
      afterYearsBoughtOut: 'tras {years} años (comprado en el año {term})',
      afterYearsBoughtOutMobile: 'tras {years} a. · comprado',
      afterYearsReturned: 'tras {years} años (vehículo devuelto)',
      afterYearsReturnedMobile: 'tras {years} a. · devuelto',
    },
  },

  conflicts: {
    apply: 'Aplicar',
    keep: 'Mantener {value}',
    body: {
      recommending: 'recomendado',
      insteadOf: 'en lugar de',
      because: 'porque',
    },
    leaseApr: {
      label: 'TAE leasing',
      reason:
        'los coches nuevos (edad-vehículo = 0) suelen acceder a financiación promocional del fabricante ~1%, los usados están en torno al 3%.',
    },
    residualValue: {
      label: 'Valor residual',
      reason:
        'la curva de depreciación en edad-vehículo + duración-tenencia sugiere este valor al final de la tenencia. Sustitúyelo por el valor de tu contrato para una comparación coherente.',
    },
    insurance: {
      label: 'Seguro / año',
      reason:
        'precio de compra × tasa regional × categoría de vehículo da esta base. Sustitúyelo por una cotización real para mayor precisión.',
    },
    fuelEfficiency: {
      label: 'Consumo',
      reason:
        'es el consumo típico en {region}. Sustitúyelo por los datos de la ficha técnica de tu vehículo.',
    },
    evEfficiency: {
      label: 'Eficiencia EV',
      reason:
        'es la eficiencia EV típica en {region}. Sustitúyela por los datos de la ficha técnica de tu vehículo.',
    },
    fuelPrice: {
      label: 'Precio del combustible',
      reason: 'es el precio típico en surtidor en {region}. Sustitúyelo por los precios locales actuales.',
    },
    electricityPrice: {
      label: 'Precio de la electricidad',
      reason:
        'es la tarifa típica de electricidad en {region}. Sustitúyela por la tarifa de tu comercializadora.',
    },
    leaseEndChoice: {
      label: 'Fin de leasing',
      reason:
        'duración de tenencia vs. plazo del leasing elige el resultado más barato — tenencia ≤ plazo → renovar, tenencia > plazo → comprar.',
    },
    earlyTerminationFee: {
      label: 'Penalización por cancelación anticipada',
      reason:
        '(plazo − tenencia) / plazo × depreciación total aproxima las tablas típicas de los arrendadores. Sustitúyelo por el importe exacto de tu contrato.',
    },
    leaseEndResidual: {
      label: 'Residual al final del leasing',
      reason:
        'la curva de depreciación en edad-vehículo + duración-leasing da este residual contractual. Sustitúyelo por el valor de tu contrato de leasing.',
    },
  },

  slider: {
    resetTitle: 'Restablecer al valor calculado automáticamente',
  },

  curveEditor: {
    overrideActive: 'Personalización activa',
    yearAbbr: 'a.',
    tooltipYear: 'Año {year}',
    resetToDefault: 'Restablecer al predeterminado',
    done: 'Hecho',
    residualAtLeaseEnd: 'Residual @ fin de leasing',
    residualAtKeepEnd: 'Residual @ fin de tenencia',
    depreciation: {
      trigger: 'Editar curva de depreciación',
      title: 'Curva de depreciación',
      description:
        'Establece el valor de reventa como fracción del PVP en cada año clave. Los predeterminados difieren entre térmicos y EV; tu personalización se aplica independientemente de la motorización.',
      tooltipPercent: '{percent}% del precio actual',
    },
    maintenance: {
      trigger: 'Editar curva de mantenimiento',
      title: 'Curva de mantenimiento',
      description:
        'Establece el coste de mantenimiento anual como porcentaje del PVP en cada año clave. Los predeterminados difieren entre térmicos y EV; tu personalización se aplica independientemente de la motorización.',
      year1: 'Año 1',
      yearN: 'Año {year}',
      percentMsrp: '% PVP',
      tooltipPerYear: '{amount} / año',
    },
  },

  share: {
    pageTitle: 'Coste real de mi vehículo',
    dialogTitle: 'Compartir escenario',
    generating: 'Generando enlace corto…',
    copy: 'Copiar',
    copied: '¡Copiado!',
    shortenFailed: 'No se pudo acortar — usando enlace completo.',
    orSendVia: 'O enviar vía',
    systemShare: 'Usar compartir del sistema',
    tagline:
      'Lo que este coche cuesta de verdad en {years, plural, one {1 año} other {# años}}',
  },

  footer: {
    seeAlso: 'Calculadoras de costes de verdad',
    fineprint:
      'Letra pequeña — esto es un proyecto personal, vibe-codeado los fines de semana por un tipo cualquiera de internet. Los números son estimaciones aproximadas con un montón de suposiciones simplificadoras (curvas de depreciación, valores regionales por defecto, multiplicadores de categoría, etc.). Útil como prueba de plausibilidad; no sustituye al contrato real del concesionario, una cotización de seguro real, tus propios cálculos ni a un asesor financiero acreditado. No firmes un contrato de cinco cifras solo porque un gráfico en la web de un desconocido lo diga.',
  },

  chart: {
    title: 'Coste total de propiedad acumulado',
    monthLabel: 'Mes',
    tableCaption: 'Coste total de propiedad acumulado por año y categoría',
    colYear: 'Año',
    colTotal: 'Coste total',
    ariaSummary:
      'Coste total de propiedad acumulado durante {months} meses. Coste total {total}, desembolso {cashOut}. Mayor componente de coste: {largestLabel} con {largestAmount}.',
    legend: {
      depreciationOrLease: 'Depreciación / leasing',
      interestAndFees: 'Intereses y comisiones',
      opportunityCost: 'Coste de oportunidad',
      fuel: 'Combustible',
      electricity: 'Electricidad',
      insurance: 'Seguro',
      maintenance: 'Mantenimiento',
      leaseEnd: 'Comisiones fin de leasing',
      cashOut: 'Contado',
    },
  },
};
