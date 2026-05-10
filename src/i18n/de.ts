import type { Translation } from '@jsverse/transloco';

// German catalog. Mirror the structure of `en.ts`. Every key in en MUST
// have a corresponding entry here, or Transloco falls back to the key string.
export const de: Translation = {
  common: {
    auto: 'auto',
    reset: 'zurück',
    resetToAuto: 'Auf automatisch zurücksetzen',
    advanced: '+ Erweitert',
    close: 'Schließen',
    moreInfo: 'Mehr Informationen',
    skipToMain: 'Direkt zum Hauptinhalt',
  },

  units: {
    months: '{count} Mon.',
    monthsAbbr: 'Mon.',
    years: '{count} J.',
    yearsAbbr: 'J.',
  },

  splash: {
    heroTitle: 'Die Monatsraten',
    heroTitleAccent: 'sind nicht die einzigen Kosten.',
    heroSubtitle:
      'Ein Diagramm. Was ein Auto über die Jahre wirklich kostet — Finanzierung, Wertverlust, Kraftstoff, Versicherung und Wartung, im Vergleich für Leasing, Kredit und Barkauf.',
    priceLabel: 'Verhandelter Preis',
    powertrainLabel: 'Antrieb',
    cta: 'Los geht\'s',
  },

  nav: {
    reset: 'Zurücksetzen',
    share: 'Teilen',
    github: 'GitHub',
  },

  regionSelector: {
    aria: 'Region',
    US: 'Region: USA',
    EU: 'Region: Europäische Union',
  },

  languageSelector: {
    aria: 'Sprache',
  },

  powertrain: {
    aria: 'Antrieb',
    ICE: '🔥 Fossil / Hybrid',
    EV: '⚡ 100% Elektro',
  },

  mode: {
    lease: 'Leasing',
    finance: 'Kredit',
    cash: 'Bar',
  },

  modeCard: {
    total: 'Gesamt',
    monthly: 'Monatlich',
    perDistance: 'Pro {unit}',
    best: 'Top',
    bestAria: 'Empfehlung — bestes Preis-Leistungs-Verhältnis',
    conflictBadge: '{count, plural, one {# Regelkonflikt} other {# Regelkonflikte}}',
    conflictBadgeTitle: 'In diesem Modus gibt es Regelkonflikte',
  },

  comparison: {
    tablist: 'Finanzierungsarten',
    tip: {
      total:
        'Tatsächliche Gesamtkosten über die Haltedauer. {cashOut} ausgezahlt + {oppCost} entgangene Rendite auf gebundenes Kapital − {asset} Restwert am Ende = {total}.',
      monthly:
        '{total} insgesamt ÷ {months} Monate = {monthly}/Monat. Das gemittelte „äquivalente Monatlich".',
      perDistance:
        '{total} insgesamt ÷ {distance} {unit} über die Haltedauer = {perDistance}/{unit}. Nützlich für den Vergleich von Szenarien mit unterschiedlichen Fahrleistungen.',
    },
  },

  recommendation: {
    reason: '{winner} hat die niedrigsten Kosten pro {unit} mit {winnerCost} — gegenüber {others}.',
  },

  modeDetail: {
    scrollToLeversAria: 'Am Diagramm vorbei zu den Reglern',
    tweakLevers: 'Regler einstellen',
  },

  globals: {
    groupTitle: 'Fahrzeug',
    caption: 'UVP {msrp} · {category}',
    category: {
      economy: 'Kompakt',
      mid: 'Mittelklasse',
      luxury: 'Premium',
    },
    advancedDisclosure: '+ Erweitert',
    annualMileage: {
      label: 'Jahreskilometer',
      tip: 'Wie viel du pro Jahr fährst. Beeinflusst die Kraftstoffkosten und (zusammen mit der Haltedauer) das Risiko von Mehrkilometern beim Leasing.',
    },
    vehicleAge: {
      label: 'Fahrzeugalter',
      tip: '0 = Neuwagen. Bei Gebrauchten leiten wir den ursprünglichen UVP aus diesem Wert und dem Kaufpreis ab.',
    },
    keepDuration: {
      label: 'Haltedauer',
      tip: 'Wie viele Jahre du das Auto behalten willst. Bestimmt den Diagramm-Horizont und die empfohlene Finanzierungsart.',
    },
    residualValue: {
      label: 'Restwert',
      tip: 'Automatisch abgeleitet aus der Wertverlustkurve bei Fahrzeugalter + Haltedauer. Überschreibe ihn mit dem Restwert aus deinem Leasingvertrag für einen fairen Vergleich.',
    },
    insurance: {
      label: 'Versicherung / Jahr',
      tip: 'Jährliche Vollkasko. Standard ist Kaufpreis × 2% (US) oder 1,5% (EU), angepasst nach Kategorie. Überschreibe ihn mit deinem Angebot.',
    },
    fuelEfficiency: {
      label: 'Verbrauch',
      tip: 'Fahrzeugeffizienz. Fossile Fahrzeuge nutzen mpg (US) oder L/100km (EU). EV nutzen mi/kWh (US) oder kWh/100km (EU).',
    },
    evEfficiency: {
      label: 'EV-Effizienz',
    },
    fuelPrice: {
      label: 'Kraftstoffpreis',
      tip: 'Preis pro Einheit für Energie zum üblichen Tarif deiner Region.',
    },
    electricityPrice: {
      label: 'Strompreis',
    },
  },

  lease: {
    fields: {
      groupTitle: 'Leasing-Finanzierung',
      apr: {
        label: '{region, select, US {Money-Faktor (Effektivzins)} EU {Leasingfaktor} other {Effektivzins}}',
        tip: 'Der effektive Jahreszins. Intern wird er in einen Leasingfaktor umgerechnet. US-Verträge berechnen Zinsen auf den Mittelwert von Restwert und Kapital; EU-Verträge nur auf den finanzierten Betrag — gleicher Zinssatz, andere Gebührenrechnung.',
      },
      term: {
        label: 'Leasinglaufzeit',
        tip: 'Wie lange das Leasing läuft. Übliche Laufzeiten sind 24, 36, 48 oder 60 Monate.',
      },
      downPayment: {
        label: 'Sonderzahlung',
        tip: 'Anzahlung auf das Leasing. Wird separat von der Kredit-Anzahlung gespeichert, damit du z. B. 5.000 € Sonderzahlung beim Leasing gegen 0 € beim Kredit vergleichen kannst. Auf den Kaufpreis gedeckelt.',
      },
    },
  },

  finance: {
    fields: {
      groupTitle: 'Kredit-Finanzierung',
      apr: {
        label: 'Effektivzins',
        tip: 'Effektiver Jahreszins für den Autokredit. Übliche Zinssätze für Neuwagen liegen 2026 bei 5–8%.',
      },
      term: {
        label: 'Kreditlaufzeit',
        tip: 'Wie lange du das Auto finanzierst. Übliche Laufzeiten: 36, 48, 60 oder 72 Monate. Längere Laufzeiten senken die Monatsrate, erhöhen aber die Gesamtzinsen.',
      },
      downPayment: {
        label: 'Anzahlung',
        tip: 'Anzahlung auf den Kredit. Wird separat von der Leasing-Sonderzahlung gespeichert, damit du z. B. 5.000 € Sonderzahlung beim Leasing gegen 0 € beim Kredit vergleichen kannst. Auf den Kaufpreis gedeckelt.',
      },
    },
  },

  cash: {
    fields: {
      intro:
        'Bar zahlst du komplett — kein Zins, keine Laufzeit, keine Anzahlung. Nutze den Kaufpreis im Header und die Renditeerwartung unter „Deine Situation" weiter unten, um die Bar-TCO zu kalibrieren.',
    },
  },

  leaseEnd: {
    label: 'Leasingende',
    aria: 'Wahl bei Leasingende',
    handBackDesc:
      'Du wechselst am Leasingende auf einen Neuwagen und schließt einen neuen Vertrag. Rückgabegebühr + Mehrkilometer/Verschleiß werden zu jedem Zyklusende fällig; jeder neue Zyklus erfordert eine frische Sonderzahlung.',
    buyOutDesc:
      'Du übernimmst das Auto am Leasingende. Übernahmepreis ≈ {residual} (Restwert), bar bezahlt. Nach der Übernahme nur noch Versicherung, Wartung und Energie.',
    choice: {
      handBack: 'Neu leasen',
      buyOut: 'Übernehmen',
    },
    residual: {
      label: 'Restwert bei Leasingende',
      tip: 'Vertraglich vereinbarter Restwert am Ende der Leasinglaufzeit. Bestimmt die Monatsraten-Formel (Wertverlust vom Kapital bis zu diesem Wert über die Laufzeit). Automatisch aus der Wertverlustkurve bei Fahrzeugalter + Leasinglaufzeit; überschreibe ihn mit dem Wert aus deinem Vertrag.',
    },
    dispositionFee: {
      label: 'Rückgabegebühr',
      tip: 'Einmalige Gebühr bei Rückgabe des Leasingfahrzeugs. Üblich 300–500.',
    },
    excessWear: {
      label: 'Verschleiß-Schätzung',
      tip: 'Grobe Reserve für Verschleißkosten am Leasingende. ~500–1500 üblich für 3 Jahre; 2000+ mit Kindern, Haustieren oder Stadtparken.',
    },
    mileageOverage: {
      label: 'Mehrkilometer-Satz (pro {unit})',
      tip: 'Aufpreis pro Strecke, wenn du das vereinbarte Limit überschreitest. Üblich 0,15–0,30 pro Meile / 0,10–0,20 pro Kilometer.',
    },
    buyoutFee: {
      label: 'Übernahmegebühr',
      tip: 'Einmalige Verwaltungsgebühr zusätzlich zum Restwert bei Übernahme des Leasingfahrzeugs. Üblich 300–500.',
    },
    earlyTermination: {
      label: 'Vorzeitige Kündigungsgebühr',
      tip: 'Gesamtbetrag, den der Leasinggeber bei vorzeitigem Ausstieg verlangt. Standard ist eine wertverlustbasierte Annäherung an typische Leasinggeber-Tabellen ((Laufzeit − Haltedauer) / Laufzeit × Gesamtwertverlust); überschreibe ihn mit dem genauen Wert aus deiner Vertragstabelle. Auf 90% des finanzierten Anteils gedeckelt. Gilt für Neu-Leasing und Übernahme.',
      notApplicable:
        'Nicht relevant: Haltedauer ({keep} J.) erreicht oder überschreitet die Leasinglaufzeit ({term} Mon.) — kein vorzeitiger Ausstieg.',
    },
  },

  situation: {
    groupTitle: 'Deine Situation',
    oppCost: {
      label: 'Renditeerwartung',
      description:
        'Was würdest du sonst mit dem Geld machen? Diesen Zinssatz berechnen wir auf die Anzahlung jeder Finanzierungsart (oder den vollen Preis bei Bar).',
      savings: 'Sparkonto · 1%',
      investing: 'Anlegen · 6%',
    },
    charger: {
      label: 'Wallbox zuhause',
      description:
        '„Anschaffung" addiert die Installationskosten zur TCO; „Vorhanden" gilt als versunkene Kosten und zählt nicht.',
      none: 'Keine',
      installed: 'Vorhanden',
      buying: 'Anschaffung',
    },
    solar: {
      label: 'Solar',
      gating: 'nur relevant mit Wallbox',
      description:
        'Annahme: 85% zuhause aus Solar (≈ kostenlos) und 15% öffentlich zum Netzpreis. Wenn an, sinken die EV-Stromkosten auf ~15% des Netzpreises.',
      off: 'Aus',
      on: 'An',
    },
  },

  maintenance: {
    label: 'Wartung',
    tip: 'Berechnet aus UVP × Basisrate × Kategoriefaktor × Kilometerfaktor, moduliert über die Wartungskurve nach Alter. Beim Neu-Leasing wird die Kurve in jedem Zyklus zurückgesetzt (jedesmal neuer Wagen).',
    display: {
      resetsEachCycle: '{perYear} / J. (zurückgesetzt pro Zyklus)',
      flatDuringLease: '{perYear} / J. (konstant während Leasing)',
      flatThenOwned: 'konstant während Leasing → {perYear} / J. (Jahr 1 nach Übernahme)',
      range: '{yr1} / J. (Jahr 1) → {yrN} / J. (Jahr {year})',
    },
  },

  hero: {
    cashEyebrow: 'Bar',
    ownershipEyebrow: 'Eigentum',
    oppCostLine: 'Ohne {amount} entgangene Rendite',
    oppCostNote: 'In den echten Kosten enthalten, nicht im Bar-Out-of-Pocket.',
    totalCashOut: 'Gesamt-Auszahlung',
    line: {
      downPayment: '{count, plural, one {Anzahlung} other {Anzahlungen}}',
      leasePayments: 'Leasingraten',
      buyout: 'Übernahme',
      handbackFee: '{count, plural, one {Rückgabegebühr} other {Rückgabegebühren}}',
      loanPayments: 'Kreditraten',
      purchasePrice: 'Kaufpreis',
      insurance: 'Versicherung',
      maintenance: 'Wartung',
      fuel: 'Kraftstoff',
      electricity: 'Strom',
      chargerInstall: 'Wallbox-Installation',
    },
    detail: {
      monthlyTimes: '{amount} × {months} Mon.',
      cyclesTimes: '{cycles} × {amount}',
      residual: '{amount} Restwert',
      fee: '{amount} Gebühr',
      earlyExit: '{amount} vorz. Ausstieg',
    },
    cap: {
      year1: 'vor allem Jahr 1',
      year1Mobile: 'J. 1',
      yearRange: 'vor allem Jahre 1-{through}',
      yearRangeMobile: 'J. 1-{through}',
    },
    assetCaption: {
      afterYears: 'nach {years} Jahren',
      afterYearsMobile: 'nach {years} J.',
      afterYearsBoughtOut: 'nach {years} Jahren (übernommen in Jahr {term})',
      afterYearsBoughtOutMobile: 'nach {years} J. · übernommen',
      afterYearsReturned: 'nach {years} Jahren (zurückgegeben)',
      afterYearsReturnedMobile: 'nach {years} J. · zurückgegeben',
    },
  },

  conflicts: {
    apply: 'Übernehmen',
    keep: 'Behalten {value}',
    body: {
      recommending: 'empfohlen wird',
      insteadOf: 'statt',
      because: 'weil',
    },
    leaseApr: {
      label: 'Leasing-Effektivzins',
      reason:
        'Neuwagen (Fahrzeugalter = 0) qualifizieren sich meist für Hersteller-Sonderkonditionen ~1%, Gebrauchte liegen bei ~3%.',
    },
    residualValue: {
      label: 'Restwert',
      reason:
        'die Wertverlustkurve bei Fahrzeugalter + Haltedauer ergibt diesen Wert am Ende der Haltedauer. Überschreibe ihn mit dem Wert aus deinem Vertrag für einen fairen Vergleich.',
    },
    insurance: {
      label: 'Versicherung / Jahr',
      reason:
        'Kaufpreis × regionaler Satz × Fahrzeugkategorie ergibt diesen Standardwert. Überschreibe ihn mit deinem Angebot.',
    },
    fuelEfficiency: {
      label: 'Verbrauch',
      reason:
        'das ist der typische Verbrauch in {region}. Überschreibe ihn mit den Werten aus deinem Datenblatt.',
    },
    evEfficiency: {
      label: 'EV-Effizienz',
      reason:
        'das ist die typische EV-Effizienz in {region}. Überschreibe sie mit den Werten aus deinem Datenblatt.',
    },
    fuelPrice: {
      label: 'Kraftstoffpreis',
      reason:
        'das ist der typische Tankstellenpreis in {region}. Überschreibe ihn mit aktuellen lokalen Preisen.',
    },
    electricityPrice: {
      label: 'Strompreis',
      reason:
        'das ist der typische Strompreis in {region}. Überschreibe ihn mit deinem Versorger-Tarif.',
    },
    leaseEndChoice: {
      label: 'Leasingende',
      reason:
        'Haltedauer vs. Leasinglaufzeit wählt das günstigere Ergebnis — Halten ≤ Laufzeit → Neu leasen, Halten > Laufzeit → Übernehmen.',
    },
    earlyTerminationFee: {
      label: 'Vorzeitige Kündigungsgebühr',
      reason:
        '(Laufzeit − Haltedauer) / Laufzeit × Gesamtwertverlust nähert übliche Leasinggeber-Tabellen an. Ersetze sie mit dem genauen Wert aus deinem Vertrag.',
    },
    leaseEndResidual: {
      label: 'Restwert bei Leasingende',
      reason:
        'die Wertverlustkurve bei Fahrzeugalter + Leasinglaufzeit ergibt diesen vertraglichen Restwert. Überschreibe ihn mit dem Wert aus deinem Leasingvertrag.',
    },
  },

  slider: {
    resetTitle: 'Auf automatisch berechneten Wert zurücksetzen',
  },

  curveEditor: {
    overrideActive: 'Anpassung aktiv',
    yearAbbr: 'J.',
    tooltipYear: 'Jahr {year}',
    resetToDefault: 'Auf Standard zurücksetzen',
    done: 'Fertig',
    residualAtLeaseEnd: 'Restwert @ Leasingende',
    residualAtKeepEnd: 'Restwert @ Ende Haltedauer',
    depreciation: {
      trigger: 'Wertverlustkurve bearbeiten',
      title: 'Wertverlustkurve',
      description:
        'Lege den Wiederverkaufswert als Anteil vom UVP für jedes Meilenstein-Jahr fest. Standardwerte unterscheiden sich für Verbrenner und EV; deine Anpassung gilt unabhängig vom Antrieb.',
      tooltipPercent: '{percent}% des heutigen Preises',
    },
    maintenance: {
      trigger: 'Wartungskurve bearbeiten',
      title: 'Wartungskurve',
      description:
        'Lege die jährlichen Wartungskosten als Prozent vom UVP für jedes Meilenstein-Jahr fest. Standardwerte unterscheiden sich für Verbrenner und EV; deine Anpassung gilt unabhängig vom Antrieb.',
      year1: 'Jahr 1',
      yearN: 'Jahr {year}',
      percentMsrp: '% UVP',
      tooltipPerYear: '{amount} / J.',
    },
  },

  share: {
    pageTitle: 'Echte Kosten meines Fahrzeugs',
    dialogTitle: 'Szenario teilen',
    generating: 'Kurzlink wird erzeugt…',
    copy: 'Kopieren',
    copied: 'Kopiert!',
    shortenFailed: 'Verkürzen fehlgeschlagen — verwende vollen Link.',
    orSendVia: 'Oder senden via',
    systemShare: 'Systemfreigabe verwenden',
    tagline:
      'Was dieses Auto wirklich über {years, plural, one {1 Jahr} other {# Jahre}} kostet',
  },

  footer: {
    fineprint:
      'Kleingedrucktes — diese Page wurde von einem Kerl aus dem Internet vibe-coded. Die Zahlen sind grobe Schätzungen mit einem Haufen vereinfachender Annahmen (Wertverlustkurven, regionale Vorgaben, Kategoriefaktoren, etc.). Taugt als Plausibilitätscheck; ersetzt aber weder den echten Vertrag vom Händler, ein echtes Versicherungsangebot, deine eigene Rechnung, noch einen Finanzberater mit Lizenz. Bitte unterschreib keinen fünfstelligen Vertrag, weil ein Diagramm auf der Website von einem Fremden das so meint.',
  },

  chart: {
    title: 'Kumulierte Gesamtkosten',
    monthLabel: 'Mon',
    tableCaption: 'Kumulierte Gesamtkosten nach Jahr und Kategorie',
    colYear: 'Jahr',
    colTotal: 'Gesamtkosten',
    ariaSummary:
      'Kumulierte Gesamtkosten über {months} Monate. Gesamtkosten {total}, Bar-Auszahlung {cashOut}. Größter Kostenblock: {largestLabel} mit {largestAmount}.',
    legend: {
      depreciationOrLease: 'Wertverlust / Leasing',
      interestAndFees: 'Zinsen & Gebühren',
      opportunityCost: 'Entgangene Rendite',
      fuel: 'Kraftstoff',
      electricity: 'Strom',
      insurance: 'Versicherung',
      maintenance: 'Wartung',
      leaseEnd: 'Leasingende-Gebühren',
      cashOut: 'Bar',
    },
  },
};
