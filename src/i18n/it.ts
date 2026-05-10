import type { Translation } from '@jsverse/transloco';

// Italian catalog. Mirror the structure of `en.ts`. Every key in en MUST
// have a corresponding entry here, or Transloco falls back to the key string.
export const it: Translation = {
  common: {
    auto: 'auto',
    reset: 'reimposta',
    resetToAuto: 'Reimposta sul valore automatico',
    advanced: '+ Avanzate',
    close: 'Chiudi',
    moreInfo: 'Maggiori informazioni',
    skipToMain: 'Vai al contenuto principale',
  },

  units: {
    months: '{count} mesi',
    monthsAbbr: 'mesi',
    years: '{count} anni',
    yearsAbbr: 'anni',
  },

  splash: {
    heroTitle: 'La rata mensile',
    heroTitleAccent: 'non è il vero costo.',
    heroSubtitle:
      'Un grafico. Cosa ti costa davvero un\'auto negli anni — finanziamento, deprezzamento, carburante, assicurazione e manutenzione, a confronto tra leasing, finanziamento e contanti.',
    priceLabel: 'Prezzo trattato',
    powertrainLabel: 'Motorizzazione',
    cta: 'Inizia',
  },

  nav: {
    reset: 'Reimposta',
    share: 'Condividi',
    github: 'GitHub',
  },

  regionSelector: {
    aria: 'Regione',
    US: 'Regione Stati Uniti',
    EU: 'Regione Unione Europea',
  },

  languageSelector: {
    aria: 'Lingua',
  },

  powertrain: {
    aria: 'Motorizzazione',
    ICE: '🔥 Termica / Ibrida',
    EV: '⚡ 100% Elettrica',
  },

  mode: {
    lease: 'Leasing',
    finance: 'Finanziamento',
    cash: 'Contanti',
  },

  modeCard: {
    total: 'Totale',
    monthly: 'Mensile',
    perDistance: 'Per {unit}',
    best: 'Top',
    bestAria: 'Consigliato — miglior rapporto qualità-prezzo',
    conflictBadge: '{count, plural, one {# conflitto di regola} other {# conflitti di regola}}',
    conflictBadgeTitle: 'Questa modalità presenta conflitti di regola',
  },

  comparison: {
    tablist: 'Modalità di finanziamento',
    tip: {
      total:
        'Costo totale reale sulla durata di possesso. {cashOut} di esborso + {oppCost} di costo opportunità sul capitale immobilizzato − {asset} valore residuo a fine possesso = {total}.',
      monthly:
        '{total} totale ÷ {months} mesi di possesso = {monthly}/mese. L\'equivalente "rata mensile costante".',
      perDistance:
        '{total} totale ÷ {distance} {unit} percorsi nella durata di possesso = {perDistance}/{unit}. Utile per confrontare scenari con percorrenze diverse.',
    },
  },

  recommendation: {
    reason: '{winner} ha il costo più basso per {unit} a {winnerCost} — contro {others}.',
  },

  modeDetail: {
    scrollToLeversAria: 'Scorri oltre il grafico fino ai controlli',
    tweakLevers: 'Regola i parametri',
  },

  globals: {
    groupTitle: 'Veicolo',
    caption: 'Listino {msrp} · {category}',
    category: {
      economy: 'Utilitaria',
      mid: 'Media',
      luxury: 'Lusso',
    },
    advancedDisclosure: '+ Avanzate',
    annualMileage: {
      label: 'Percorrenza annua',
      tip: 'Quanto guidi ogni anno. Determina il costo del carburante e (insieme alla durata di possesso) il rischio di superamento del chilometraggio nel leasing.',
    },
    vehicleAge: {
      label: 'Età del veicolo',
      tip: '0 = nuovo. Per le auto usate ricaviamo il listino originale da questo valore e dal prezzo d\'acquisto.',
    },
    keepDuration: {
      label: 'Durata di possesso',
      tip: 'Quanti anni pensi di tenere l\'auto. Definisce l\'orizzonte del grafico e il metodo di finanziamento consigliato.',
    },
    residualValue: {
      label: 'Valore residuo',
      tip: 'Ricavato automaticamente dalla curva di deprezzamento a età-veicolo + durata-possesso. Sostituiscilo con il valore residuo del tuo contratto di leasing per un confronto coerente.',
    },
    insurance: {
      label: 'Assicurazione / anno',
      tip: 'Assicurazione kasko annuale. Predefinita: prezzo d\'acquisto × 2% (US) o 1,5% (EU), corretta per categoria. Sostituiscila con la tua quotazione.',
    },
    fuelEfficiency: {
      label: 'Consumo',
      tip: 'Efficienza del veicolo. Termiche: mpg (US) o L/100km (EU). EV: mi/kWh (US) o kWh/100km (EU).',
    },
    evEfficiency: {
      label: 'Efficienza EV',
    },
    fuelPrice: {
      label: 'Prezzo carburante',
      tip: 'Prezzo per unità di carburante o energia al tariffario tipico della tua regione.',
    },
    electricityPrice: {
      label: 'Prezzo energia',
    },
  },

  lease: {
    fields: {
      groupTitle: 'Finanziamento leasing',
      apr: {
        label: '{region, select, US {Money factor (TAEG)} EU {Coefficiente leasing (TAEG)} other {TAEG}}',
        tip: 'Il tasso annuo effettivo globale. Internamente lo convertiamo in money factor. I contratti US calcolano gli interessi sulla media tra capitale e residuo; i contratti EU solo sull\'importo finanziato — stesso TAEG, calcolo delle commissioni diverso.',
      },
      term: {
        label: 'Durata leasing',
        tip: 'Quanto dura il leasing. Durate comuni: 24, 36, 48 o 60 mesi.',
      },
      downPayment: {
        label: 'Anticipo',
        tip: 'Anticipo sul leasing. Memorizzato separatamente dall\'anticipo del finanziamento, così puoi confrontare ad esempio 5.000 € sul leasing contro 0 € sul finanziamento. Limitato al prezzo d\'acquisto.',
      },
    },
  },

  finance: {
    fields: {
      groupTitle: 'Finanziamento',
      apr: {
        label: 'TAEG',
        tip: 'Tasso annuo effettivo globale del prestito auto. Tassi tipici per auto nuova nel 2026: 5–8%.',
      },
      term: {
        label: 'Durata finanziamento',
        tip: 'Quanto tempo finanzi l\'auto. Durate comuni: 36, 48, 60 o 72 mesi. Durate più lunghe abbassano la rata ma aumentano il totale degli interessi.',
      },
      downPayment: {
        label: 'Anticipo',
        tip: 'Anticipo sul finanziamento. Memorizzato separatamente dall\'anticipo del leasing, così puoi confrontare ad esempio 5.000 € sul leasing contro 0 € sul finanziamento. Limitato al prezzo d\'acquisto.',
      },
    },
  },

  cash: {
    fields: {
      intro:
        'In contanti paghi tutto subito — niente TAEG, niente durata, niente anticipo. Usa il prezzo d\'acquisto in alto e l\'aspettativa di rendimento in "La tua situazione" qui sotto per calibrare il TCO in contanti.',
    },
  },

  leaseEnd: {
    label: 'Fine leasing',
    aria: 'Scelta a fine leasing',
    handBackDesc:
      'Cambi auto a fine leasing e firmi un nuovo contratto. La penale di restituzione + le eccedenze di chilometraggio/usura si pagano a ogni fine ciclo; ogni nuovo ciclo richiede un nuovo anticipo.',
    buyOutDesc:
      'Riscatti l\'auto a fine leasing. Prezzo di riscatto ≈ {residual} (valore residuo), pagato in contanti. Dopo il riscatto restano solo assicurazione, manutenzione e carburante.',
    choice: {
      handBack: 'Rinnova leasing',
      buyOut: 'Riscatta',
    },
    residual: {
      label: 'Residuo a fine leasing',
      tip: 'Valore residuo contrattuale a fine durata leasing. Determina la formula della rata mensile (deprezzamento dal capitale fino a questo valore sulla durata). Ricavato automaticamente dalla curva di deprezzamento a età-veicolo + durata-leasing; sostituiscilo con il valore del tuo contratto.',
    },
    dispositionFee: {
      label: 'Spese di restituzione',
      tip: 'Spesa una tantum alla restituzione del veicolo in leasing. Tipicamente 300–500.',
    },
    excessWear: {
      label: 'Stima usura eccedente',
      tip: 'Cuscinetto approssimativo per le spese di usura a fine leasing. ~500–1500 tipico per un leasing di 3 anni; 2000+ con bambini, animali o parcheggio in città.',
    },
    mileageOverage: {
      label: 'Tariffa eccedenza km (per {unit})',
      tip: 'Sovrapprezzo per km in eccesso rispetto al limite contrattuale. Tipicamente 0,15–0,30 per miglio / 0,10–0,20 per km.',
    },
    buyoutFee: {
      label: 'Spese di riscatto',
      tip: 'Spesa amministrativa una tantum aggiunta al valore residuo all\'esercizio del riscatto. Tipicamente 300–500.',
    },
    earlyTermination: {
      label: 'Penale di recesso anticipato',
      tip: 'Importo totale richiesto dal locatore in caso di uscita anticipata dal leasing. Predefinito su un\'approssimazione basata sul deprezzamento ((durata − possesso) / durata × deprezzamento totale); sostituiscilo con il valore esatto della tabella di recesso del tuo contratto. Limitato al 90% della parte finanziata. Si applica sia al rinnovo leasing che al riscatto.',
      notApplicable:
        'Non applicabile: la durata di possesso ({keep} anni) raggiunge o supera la durata leasing ({term} mesi) — nessuna uscita anticipata.',
    },
  },

  situation: {
    groupTitle: 'La tua situazione',
    oppCost: {
      label: 'Costo opportunità',
      description:
        'Cosa faresti altrimenti con i soldi? Applichiamo questo tasso all\'anticipo di ogni metodo di finanziamento (o al prezzo intero in caso di contanti).',
      savings: 'Risparmio · 1%',
      investing: 'Investimento · 6%',
    },
    charger: {
      label: 'Wallbox domestica',
      description:
        '"Da acquistare" aggiunge il costo di installazione al TCO; "Installata" è considerato costo sommerso e non viene contato.',
      none: 'Nessuna',
      installed: 'Installata',
      buying: 'Da acquistare',
    },
    solar: {
      label: 'Fotovoltaico',
      gating: 'rilevante solo con wallbox domestica',
      description:
        'Ipotesi: 85% di ricarica a casa da fotovoltaico (≈ gratis) e 15% pubblica al prezzo di rete. Quando attivo, il costo dell\'energia EV scende a ~15% del prezzo di rete.',
      off: 'Off',
      on: 'On',
    },
  },

  maintenance: {
    label: 'Manutenzione',
    tip: 'Calcolata da listino × tasso base × moltiplicatore di categoria × fattore chilometraggio, modulata dalla curva di manutenzione sull\'età. Il rinnovo leasing reimposta la curva a ogni ciclo (auto nuova ogni volta).',
    display: {
      resetsEachCycle: '{perYear} / anno (reimposta a ogni ciclo)',
      flatDuringLease: '{perYear} / anno (costante durante il leasing)',
      flatThenOwned: 'costante durante il leasing → {perYear} / anno (anno 1 dopo riscatto)',
      range: '{yr1} / anno (anno 1) → {yrN} / anno (anno {year})',
    },
  },

  hero: {
    cashEyebrow: 'Contanti',
    ownershipEyebrow: 'Proprietà',
    oppCostLine: 'Senza contare {amount} di costo opportunità',
    oppCostNote: 'Incluso nel costo reale, non nel totale di esborso.',
    totalCashOut: 'Esborso totale',
    line: {
      downPayment: '{count, plural, one {Anticipo} other {Anticipi}}',
      leasePayments: 'Rate leasing',
      buyout: 'Riscatto',
      handbackFee: '{count, plural, one {Spesa di restituzione} other {Spese di restituzione}}',
      loanPayments: 'Rate finanziamento',
      purchasePrice: 'Prezzo d\'acquisto',
      insurance: 'Assicurazione',
      maintenance: 'Manutenzione',
      fuel: 'Carburante',
      electricity: 'Energia',
      chargerInstall: 'Installazione wallbox',
    },
    detail: {
      monthlyTimes: '{amount} × {months} mesi',
      cyclesTimes: '{cycles} × {amount}',
      residual: '{amount} residuo',
      fee: '{amount} di spesa',
      earlyExit: '{amount} uscita anticipata',
    },
    cap: {
      year1: 'soprattutto anno 1',
      year1Mobile: 'a. 1',
      yearRange: 'soprattutto anni 1-{through}',
      yearRangeMobile: 'a. 1-{through}',
    },
    assetCaption: {
      afterYears: 'dopo {years} anni',
      afterYearsMobile: 'dopo {years} a.',
      afterYearsBoughtOut: 'dopo {years} anni (riscattata all\'anno {term})',
      afterYearsBoughtOutMobile: 'dopo {years} a. · riscattata',
      afterYearsReturned: 'dopo {years} anni (auto restituita)',
      afterYearsReturnedMobile: 'dopo {years} a. · restituita',
    },
  },

  conflicts: {
    apply: 'Applica',
    keep: 'Mantieni {value}',
    body: {
      recommending: 'consigliato',
      insteadOf: 'invece di',
      because: 'perché',
    },
    leaseApr: {
      label: 'TAEG leasing',
      reason:
        'le auto nuove (età-veicolo = 0) di solito accedono a finanziamenti promozionali del produttore al ~1%, mentre le usate sono intorno al 3%.',
    },
    residualValue: {
      label: 'Valore residuo',
      reason:
        'la curva di deprezzamento a età-veicolo + durata-possesso suggerisce questo valore a fine possesso. Sostituiscilo con il valore del tuo contratto per un confronto coerente.',
    },
    insurance: {
      label: 'Assicurazione / anno',
      reason:
        'prezzo d\'acquisto × tasso regionale × categoria del veicolo dà questo valore di base. Sostituiscilo con una quotazione reale per maggiore precisione.',
    },
    fuelEfficiency: {
      label: 'Consumo',
      reason:
        'è il consumo tipico in {region}. Sostituiscilo con i dati della scheda tecnica del tuo veicolo.',
    },
    evEfficiency: {
      label: 'Efficienza EV',
      reason:
        'è l\'efficienza EV tipica in {region}. Sostituiscila con i dati della scheda tecnica del tuo veicolo.',
    },
    fuelPrice: {
      label: 'Prezzo carburante',
      reason: 'è il prezzo tipico alla pompa in {region}. Sostituiscilo con i prezzi locali attuali.',
    },
    electricityPrice: {
      label: 'Prezzo energia',
      reason:
        'è la tariffa tipica dell\'energia in {region}. Sostituiscila con la tariffa del tuo fornitore.',
    },
    leaseEndChoice: {
      label: 'Fine leasing',
      reason:
        'durata di possesso vs. durata leasing sceglie l\'esito più conveniente — possesso ≤ durata → rinnova leasing, possesso > durata → riscatta.',
    },
    earlyTerminationFee: {
      label: 'Penale di recesso anticipato',
      reason:
        '(durata − possesso) / durata × deprezzamento totale approssima le tabelle tipiche dei locatori. Sostituiscilo con il valore esatto del tuo contratto.',
    },
    leaseEndResidual: {
      label: 'Residuo a fine leasing',
      reason:
        'la curva di deprezzamento a età-veicolo + durata-leasing fornisce questo residuo contrattuale. Sostituiscilo con il valore del tuo contratto di leasing.',
    },
  },

  slider: {
    resetTitle: 'Reimposta sul valore calcolato automaticamente',
  },

  curveEditor: {
    overrideActive: 'Personalizzazione attiva',
    yearAbbr: 'a.',
    tooltipYear: 'Anno {year}',
    resetToDefault: 'Reimposta al default',
    done: 'Fatto',
    residualAtLeaseEnd: 'Residuo @ fine leasing',
    residualAtKeepEnd: 'Residuo @ fine possesso',
    depreciation: {
      trigger: 'Modifica curva di deprezzamento',
      title: 'Curva di deprezzamento',
      description:
        'Imposta il valore di rivendita come frazione del listino per ciascun anno chiave. I default differiscono per termiche ed EV; la tua personalizzazione vale indipendentemente dalla motorizzazione.',
      tooltipPercent: '{percent}% del prezzo odierno',
    },
    maintenance: {
      trigger: 'Modifica curva di manutenzione',
      title: 'Curva di manutenzione',
      description:
        'Imposta il costo di manutenzione annuale come percentuale del listino per ciascun anno chiave. I default differiscono per termiche ed EV; la tua personalizzazione vale indipendentemente dalla motorizzazione.',
      year1: 'Anno 1',
      yearN: 'Anno {year}',
      percentMsrp: '% listino',
      tooltipPerYear: '{amount} / anno',
    },
  },

  share: {
    pageTitle: 'Costo reale del mio veicolo',
    dialogTitle: 'Condividi scenario',
    generating: 'Generazione del link breve…',
    copy: 'Copia',
    copied: 'Copiato!',
    shortenFailed: 'Impossibile accorciare — uso il link completo.',
    orSendVia: 'Oppure invia tramite',
    systemShare: 'Usa la condivisione di sistema',
    tagline:
      'Quanto costa davvero quest\'auto in {years, plural, one {1 anno} other {# anni}}',
  },

  footer: {
    seeAlso: 'Calcolatori di costi seri',
    fineprint:
      'Note legali — questo è un side project, vibe-coded nei weekend da un tipo a caso su internet. I numeri sono stime approssimative con un mucchio di assunzioni semplificative (curve di deprezzamento, default regionali, moltiplicatori di categoria, ecc.). Utile per un controllo di plausibilità; non sostituisce il contratto reale del concessionario, una vera quotazione assicurativa, i tuoi conti né un consulente finanziario abilitato. Non firmare un contratto a cinque cifre solo perché un grafico sul sito di uno sconosciuto te lo dice.',
  },

  chart: {
    title: 'Costo totale di possesso cumulato',
    monthLabel: 'Mese',
    tableCaption: 'Costo totale di possesso cumulato per anno e categoria',
    colYear: 'Anno',
    colTotal: 'Costo totale',
    ariaSummary:
      'Costo totale di possesso cumulato su {months} mesi. Costo totale {total}, esborso effettivo {cashOut}. Voce di costo principale: {largestLabel} con {largestAmount}.',
    legend: {
      depreciationOrLease: 'Deprezzamento / leasing',
      interestAndFees: 'Interessi e spese',
      opportunityCost: 'Costo opportunità',
      fuel: 'Carburante',
      electricity: 'Energia',
      insurance: 'Assicurazione',
      maintenance: 'Manutenzione',
      leaseEnd: 'Spese fine leasing',
      cashOut: 'Contanti',
    },
  },
};
