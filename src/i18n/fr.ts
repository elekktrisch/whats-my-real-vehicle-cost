import type { Translation } from '@jsverse/transloco';

// French catalog. Mirror the structure of `en.ts`. Every key in en MUST
// have a corresponding entry here, or Transloco falls back to the key string.
export const fr: Translation = {
  common: {
    auto: 'auto',
    reset: 'réinit.',
    resetToAuto: 'Réinitialiser sur la valeur automatique',
    advanced: '+ Avancé',
    close: 'Fermer',
    moreInfo: 'Plus d\'informations',
    skipToMain: 'Aller au contenu principal',
  },

  units: {
    months: '{count} mois',
    monthsAbbr: 'mois',
    years: '{count} ans',
    yearsAbbr: 'ans',
  },

  splash: {
    heroTitle: 'La mensualité',
    heroTitleAccent: 'n\'est pas le coût réel.',
    heroSubtitle:
      'Un graphique. Ce qu\'une voiture te coûte vraiment au fil des ans — financement, dépréciation, carburant, assurance et entretien, comparés entre leasing, crédit et comptant.',
    priceLabel: 'Prix négocié',
    powertrainLabel: 'Motorisation',
    cta: 'Commencer',
  },

  nav: {
    reset: 'Réinitialiser',
    share: 'Partager',
    github: 'GitHub',
  },

  regionSelector: {
    aria: 'Région',
    US: 'Région États-Unis',
    EU: 'Région Union européenne',
  },

  languageSelector: {
    aria: 'Langue',
  },

  powertrain: {
    aria: 'Motorisation',
    ICE: '🔥 Thermique / Hybride',
    EV: '⚡ 100% Électrique',
  },

  mode: {
    lease: 'Leasing',
    finance: 'Crédit',
    cash: 'Comptant',
  },

  modeCard: {
    total: 'Total',
    monthly: 'Mensuel',
    perDistance: 'Par {unit}',
    best: 'Top',
    bestAria: 'Recommandé — meilleur rapport qualité-prix',
    conflictBadge: '{count, plural, one {# conflit de règle} other {# conflits de règle}}',
    conflictBadgeTitle: 'Ce mode présente des conflits de règle',
  },

  comparison: {
    tablist: 'Modes de financement',
    tip: {
      total:
        'Coût total réel sur la durée de détention. {cashOut} de décaissement + {oppCost} de coût d\'opportunité sur le capital immobilisé − {asset} valeur résiduelle en fin de détention = {total}.',
      monthly:
        '{total} total ÷ {months} mois de détention = {monthly}/mois. L\'équivalent "mensualité constante".',
      perDistance:
        '{total} total ÷ {distance} {unit} parcourus sur la durée de détention = {perDistance}/{unit}. Utile pour comparer des scénarios à kilométrages différents.',
    },
  },

  recommendation: {
    reason: '{winner} a le coût le plus bas par {unit} à {winnerCost} — contre {others}.',
  },

  modeDetail: {
    scrollToLeversAria: 'Faire défiler au-delà du graphique vers les contrôles',
    tweakLevers: 'Ajuster les paramètres',
  },

  globals: {
    groupTitle: 'Véhicule',
    caption: 'Prix catalogue {msrp} · {category}',
    category: {
      economy: 'Citadine',
      mid: 'Moyenne',
      luxury: 'Luxe',
    },
    advancedDisclosure: '+ Avancé',
    annualMileage: {
      label: 'Kilométrage annuel',
      tip: 'Combien tu roules par an. Détermine le coût du carburant et (combiné à la durée de détention) le risque de dépassement de kilométrage en leasing.',
    },
    vehicleAge: {
      label: 'Âge du véhicule',
      tip: '0 = neuf. Pour les occasions, on déduit le prix catalogue d\'origine de cette valeur et du prix d\'achat.',
    },
    keepDuration: {
      label: 'Durée de détention',
      tip: 'Combien d\'années tu comptes garder la voiture. Définit l\'horizon du graphique et la méthode de financement recommandée.',
    },
    residualValue: {
      label: 'Valeur résiduelle',
      tip: 'Déduite automatiquement de la courbe de dépréciation à âge-véhicule + durée-détention. Remplace par la valeur résiduelle de ton contrat de leasing pour une comparaison cohérente.',
    },
    insurance: {
      label: 'Assurance / an',
      tip: 'Assurance tous risques annuelle. Par défaut : prix d\'achat × 2% (US) ou 1,5% (EU), ajusté par catégorie. Remplace par ton devis.',
    },
    fuelEfficiency: {
      label: 'Consommation',
      tip: 'Efficacité du véhicule. Thermiques : mpg (US) ou L/100km (EU). EV : mi/kWh (US) ou kWh/100km (EU).',
    },
    evEfficiency: {
      label: 'Efficacité EV',
    },
    fuelPrice: {
      label: 'Prix du carburant',
      tip: 'Prix par unité de carburant ou d\'électricité au tarif typique de ta région.',
    },
    electricityPrice: {
      label: 'Prix de l\'électricité',
    },
  },

  lease: {
    fields: {
      groupTitle: 'Financement leasing',
      apr: {
        label: '{region, select, US {Money factor (TAEG)} EU {Coefficient leasing (TAEG)} other {TAEG}}',
        tip: 'Le taux annuel effectif global. Converti en interne en money factor. Les contrats US calculent les intérêts sur la moyenne capital + résiduel ; les contrats EU uniquement sur le montant financé — même TAEG, calcul des frais différent.',
      },
      term: {
        label: 'Durée du leasing',
        tip: 'Durée du contrat de leasing. Durées courantes : 24, 36, 48 ou 60 mois.',
      },
      downPayment: {
        label: 'Apport',
        tip: 'Apport sur le leasing. Stocké séparément de l\'apport du crédit, pour pouvoir comparer p. ex. 5 000 € sur le leasing contre 0 € sur le crédit. Plafonné au prix d\'achat.',
      },
    },
  },

  finance: {
    fields: {
      groupTitle: 'Crédit auto',
      apr: {
        label: 'TAEG',
        tip: 'Taux annuel effectif global du crédit auto. Taux typiques pour véhicule neuf en 2026 : 5–8%.',
      },
      term: {
        label: 'Durée du crédit',
        tip: 'Durée de financement de la voiture. Durées courantes : 36, 48, 60 ou 72 mois. Les durées longues abaissent la mensualité mais augmentent le total des intérêts.',
      },
      downPayment: {
        label: 'Apport',
        tip: 'Apport sur le crédit. Stocké séparément de l\'apport du leasing, pour pouvoir comparer p. ex. 5 000 € sur le leasing contre 0 € sur le crédit. Plafonné au prix d\'achat.',
      },
    },
  },

  cash: {
    fields: {
      intro:
        'En comptant, tu paies tout d\'un coup — pas de TAEG, pas de durée, pas d\'apport. Utilise le prix d\'achat en haut et l\'attente de rendement dans "Ta situation" ci-dessous pour ajuster le TCO comptant.',
    },
  },

  leaseEnd: {
    label: 'Fin du leasing',
    aria: 'Choix en fin de leasing',
    handBackDesc:
      'Tu changes de voiture en fin de leasing et signes un nouveau contrat. Frais de restitution + dépassement km/usure payés à chaque fin de cycle ; chaque nouveau cycle exige un nouvel apport.',
    buyOutDesc:
      'Tu rachètes la voiture en fin de leasing. Prix de rachat ≈ {residual} (valeur résiduelle), payé comptant. Après le rachat, restent assurance, entretien et carburant.',
    choice: {
      handBack: 'Renouveler leasing',
      buyOut: 'Racheter',
    },
    residual: {
      label: 'Résiduel en fin de leasing',
      tip: 'Valeur résiduelle contractuelle à la fin du leasing. Détermine la formule de mensualité (dépréciation du capital jusqu\'à cette valeur sur la durée). Déduite automatiquement de la courbe de dépréciation à âge-véhicule + durée-leasing ; remplace par la valeur de ton contrat.',
    },
    dispositionFee: {
      label: 'Frais de restitution',
      tip: 'Frais ponctuels à la restitution du véhicule en leasing. Typiquement 300–500.',
    },
    excessWear: {
      label: 'Estimation usure excessive',
      tip: 'Provision approximative pour frais d\'usure en fin de leasing. ~500–1500 typique pour un leasing de 3 ans ; 2000+ avec enfants, animaux ou stationnement urbain.',
    },
    mileageOverage: {
      label: 'Tarif dépassement km (par {unit})',
      tip: 'Surcoût par unité de distance au-delà du plafond contractuel. Typiquement 0,15–0,30 par mile / 0,10–0,20 par km.',
    },
    buyoutFee: {
      label: 'Frais de rachat',
      tip: 'Frais administratifs ponctuels en plus de la valeur résiduelle lors du rachat du leasing. Typiquement 300–500.',
    },
    earlyTermination: {
      label: 'Pénalité de résiliation anticipée',
      tip: 'Montant total facturé par le bailleur en cas de sortie anticipée du leasing. Par défaut une approximation basée sur la dépréciation ((durée − détention) / durée × dépréciation totale) ; remplace par le montant exact du barème de sortie de ton contrat. Plafonné à 90% de la part financée. S\'applique au renouvellement et au rachat.',
      notApplicable:
        'Non applicable : la durée de détention ({keep} ans) atteint ou dépasse la durée du leasing ({term} mois) — pas de sortie anticipée.',
    },
  },

  situation: {
    groupTitle: 'Ta situation',
    oppCost: {
      label: 'Coût d\'opportunité',
      description:
        'Que ferais-tu de l\'argent autrement ? On applique ce taux à l\'apport de chaque mode de financement (ou au prix complet pour le comptant).',
      savings: 'Épargne · 1%',
      investing: 'Investissement · 6%',
    },
    charger: {
      label: 'Borne à domicile',
      description:
        '"À installer" ajoute le coût d\'installation au TCO ; "Installée" est traité comme coût irrécupérable et n\'est pas compté.',
      none: 'Aucune',
      installed: 'Installée',
      buying: 'À installer',
    },
    solar: {
      label: 'Photovoltaïque',
      gating: 'pertinent uniquement avec borne à domicile',
      description:
        'Hypothèse : 85% de recharge à domicile depuis le solaire (≈ gratuit) et 15% en public au tarif réseau. Activé, le coût d\'électricité EV chute à ~15% du prix réseau.',
      off: 'Off',
      on: 'On',
    },
  },

  maintenance: {
    label: 'Entretien',
    tip: 'Calculé depuis prix catalogue × taux de base × multiplicateur de catégorie × facteur kilométrage, modulé par la courbe d\'entretien selon l\'âge. Le renouvellement leasing réinitialise la courbe à chaque cycle (voiture neuve à chaque fois).',
    display: {
      resetsEachCycle: '{perYear} / an (réinitialisé à chaque cycle)',
      flatDuringLease: '{perYear} / an (constant pendant le leasing)',
      flatThenOwned: 'constant pendant le leasing → {perYear} / an (an 1 après rachat)',
      range: '{yr1} / an (an 1) → {yrN} / an (an {year})',
    },
  },

  hero: {
    cashEyebrow: 'Comptant',
    ownershipEyebrow: 'Propriété',
    oppCostLine: 'Hors {amount} de coût d\'opportunité',
    oppCostNote: 'Inclus dans le coût réel, pas dans le total décaissé.',
    totalCashOut: 'Décaissement total',
    line: {
      downPayment: '{count, plural, one {Apport} other {Apports}}',
      leasePayments: 'Mensualités leasing',
      buyout: 'Rachat',
      handbackFee: '{count, plural, one {Frais de restitution} other {Frais de restitution}}',
      loanPayments: 'Mensualités crédit',
      purchasePrice: 'Prix d\'achat',
      insurance: 'Assurance',
      maintenance: 'Entretien',
      fuel: 'Carburant',
      electricity: 'Électricité',
      chargerInstall: 'Installation borne',
    },
    detail: {
      monthlyTimes: '{amount} × {months} mois',
      cyclesTimes: '{cycles} × {amount}',
      residual: '{amount} résiduel',
      fee: '{amount} de frais',
      earlyExit: '{amount} sortie anticipée',
    },
    cap: {
      year1: 'surtout an 1',
      year1Mobile: 'an 1',
      yearRange: 'surtout années 1-{through}',
      yearRangeMobile: 'an 1-{through}',
    },
    assetCaption: {
      afterYears: 'après {years} ans',
      afterYearsMobile: 'après {years} ans',
      afterYearsBoughtOut: 'après {years} ans (rachat à l\'an {term})',
      afterYearsBoughtOutMobile: 'après {years} ans · rachat',
      afterYearsReturned: 'après {years} ans (véhicule rendu)',
      afterYearsReturnedMobile: 'après {years} ans · rendu',
    },
  },

  conflicts: {
    apply: 'Appliquer',
    keep: 'Conserver {value}',
    body: {
      recommending: 'recommandation',
      insteadOf: 'au lieu de',
      because: 'car',
    },
    leaseApr: {
      label: 'TAEG leasing',
      reason:
        'les voitures neuves (âge-véhicule = 0) bénéficient en général d\'un financement constructeur promotionnel ~1%, les occasions sont autour de 3%.',
    },
    residualValue: {
      label: 'Valeur résiduelle',
      reason:
        'la courbe de dépréciation à âge-véhicule + durée-détention donne cette valeur en fin de détention. Remplace par la valeur de ton contrat pour une comparaison cohérente.',
    },
    insurance: {
      label: 'Assurance / an',
      reason:
        'prix d\'achat × taux régional × catégorie de véhicule donne cette base. Remplace par un devis réel pour plus de précision.',
    },
    fuelEfficiency: {
      label: 'Consommation',
      reason:
        'c\'est la consommation typique en {region}. Remplace par les valeurs de la fiche technique de ton véhicule.',
    },
    evEfficiency: {
      label: 'Efficacité EV',
      reason:
        'c\'est l\'efficacité EV typique en {region}. Remplace par les valeurs de la fiche technique de ton véhicule.',
    },
    fuelPrice: {
      label: 'Prix du carburant',
      reason: 'c\'est le prix typique à la pompe en {region}. Remplace par les prix locaux actuels.',
    },
    electricityPrice: {
      label: 'Prix de l\'électricité',
      reason:
        'c\'est le tarif typique de l\'électricité en {region}. Remplace par le tarif de ton fournisseur.',
    },
    leaseEndChoice: {
      label: 'Fin du leasing',
      reason:
        'durée de détention vs. durée du leasing choisit le résultat le moins cher — détention ≤ durée → renouveler, détention > durée → racheter.',
    },
    earlyTerminationFee: {
      label: 'Pénalité de résiliation anticipée',
      reason:
        '(durée − détention) / durée × dépréciation totale approche les barèmes typiques des bailleurs. Remplace par le montant exact de ton contrat.',
    },
    leaseEndResidual: {
      label: 'Résiduel en fin de leasing',
      reason:
        'la courbe de dépréciation à âge-véhicule + durée-leasing donne ce résiduel contractuel. Remplace par la valeur de ton contrat de leasing.',
    },
  },

  slider: {
    resetTitle: 'Réinitialiser sur la valeur calculée automatiquement',
  },

  curveEditor: {
    overrideActive: 'Personnalisation active',
    yearAbbr: 'an',
    tooltipYear: 'Année {year}',
    resetToDefault: 'Réinitialiser au défaut',
    done: 'Terminé',
    residualAtLeaseEnd: 'Résiduel @ fin de leasing',
    residualAtKeepEnd: 'Résiduel @ fin de détention',
    depreciation: {
      trigger: 'Modifier la courbe de dépréciation',
      title: 'Courbe de dépréciation',
      description:
        'Définis la valeur de revente comme fraction du prix catalogue à chaque année repère. Les défauts diffèrent entre thermiques et EV ; ta personnalisation s\'applique quel que soit le motopropulseur.',
      tooltipPercent: '{percent}% du prix actuel',
    },
    maintenance: {
      trigger: 'Modifier la courbe d\'entretien',
      title: 'Courbe d\'entretien',
      description:
        'Définis le coût d\'entretien annuel en pourcentage du prix catalogue à chaque année repère. Les défauts diffèrent entre thermiques et EV ; ta personnalisation s\'applique quel que soit le motopropulseur.',
      year1: 'Année 1',
      yearN: 'Année {year}',
      percentMsrp: '% catalogue',
      tooltipPerYear: '{amount} / an',
    },
  },

  share: {
    pageTitle: 'Coût réel de mon véhicule',
    dialogTitle: 'Partager le scénario',
    generating: 'Génération du lien court…',
    copy: 'Copier',
    copied: 'Copié !',
    shortenFailed: 'Raccourcissement impossible — utilisation du lien complet.',
    orSendVia: 'Ou envoyer via',
    systemShare: 'Utiliser le partage système',
    tagline:
      'Ce que cette voiture coûte vraiment sur {years, plural, one {1 an} other {# ans}}',
  },

  footer: {
    fineprint:
      'Petites lignes — c\'est un projet perso, vibe-codé le week-end par un type lambda sur internet. Les chiffres sont des estimations grossières avec un tas d\'hypothèses simplificatrices (courbes de dépréciation, défauts régionaux, multiplicateurs de catégorie, etc.). Utile pour un sanity-check ; ne remplace ni le contrat réel du concessionnaire, ni un vrai devis d\'assurance, ni tes propres calculs, ni un conseiller financier diplômé. Ne signe pas un contrat à cinq chiffres parce qu\'un graphique sur le site d\'un inconnu te le dit.',
  },

  chart: {
    title: 'Coût total de possession cumulé',
    monthLabel: 'Mois',
    tableCaption: 'Coût total de possession cumulé par année et catégorie',
    colYear: 'Année',
    colTotal: 'Coût total',
    ariaSummary:
      'Coût total de possession cumulé sur {months} mois. Coût total {total}, décaissement {cashOut}. Plus gros poste de coût : {largestLabel} à {largestAmount}.',
    legend: {
      depreciationOrLease: 'Dépréciation / leasing',
      interestAndFees: 'Intérêts et frais',
      opportunityCost: 'Coût d\'opportunité',
      fuel: 'Carburant',
      electricity: 'Électricité',
      insurance: 'Assurance',
      maintenance: 'Entretien',
      leaseEnd: 'Frais fin de leasing',
      cashOut: 'Comptant',
    },
  },
};
