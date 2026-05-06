# tco-chart — spec delta

## ADDED Requirements

### Requirement: Opportunity cost rendered as separate stacked-area layer
WHEN the chart renders any mode's `CostBreakdown`,
the system SHALL render `opportunityCost` as a stacked-area layer distinct
from the `interestAndFees` layer (visually distinguishable color, separate
legend entry, separate sr-only table column).

#### Scenario: Two distinct legend entries
- **GIVEN** the chart is rendered
- **WHEN** the user inspects the legend
- **THEN** "Interest & fees" and "Opportunity cost" appear as separate entries
- **AND** each is a `<button aria-pressed>` with independent toggle state

#### Scenario: Sum invariant across the split
- **GIVEN** identical TcoInputs evaluated against the pre-split and post-split implementations
- **WHEN** comparing the cumulative chart total at any month
- **THEN** `interestAndFees[m] + opportunityCost[m]` post-split equals `financing[m]` pre-split (within floating-point tolerance)

#### Scenario: Hidden series toggle
- **GIVEN** the chart is rendered
- **WHEN** the user clicks the "Opportunity cost" legend toggle
- **THEN** the opportunityCost layer disappears from the stack
- **AND** other layers (including interestAndFees) remain visible
- **AND** the sr-only table still shows the full data regardless of toggle state

## MODIFIED Requirements

### Requirement: Cost categories
The chart's stacked-area layers correspond to discrete `CostCategory`
values. The `financing` category is replaced by two finer-grained
categories: `interestAndFees` (real cash outflows for borrowing) and
`opportunityCost` (return foregone on capital tied up).

#### Scenario: Type definition shape
- **GIVEN** `CostCategory` is consulted at type-check time
- **WHEN** any consumer references it
- **THEN** valid values are: `depreciationOrLease`, `interestAndFees`, `opportunityCost`, `fuel`, `insurance`, `maintenance`, `leaseEnd`
- **AND** `financing` is no longer a valid value
