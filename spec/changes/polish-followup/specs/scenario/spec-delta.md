# scenario — spec delta

## ADDED Requirements

### Requirement: Lease-end residual lever distinct from end-of-keep residual
WHEN the user is in lease mode with the buyout strategy selected,
the system SHALL provide a `leaseEndResidual` value used as the buyout
price, separate from `residualValue` (which continues to drive end-of-keep
asset display + finance/cash depreciation).

#### Scenario: Auto-derived when not overridden
- **GIVEN** `leaseEndResidualOverride === null` (the default)
- **WHEN** any consumer reads `store.leaseEndResidual()`
- **THEN** the value equals `msrp × depreciationFactor(vehicleAge + leaseTerm/12)`

#### Scenario: User override beats auto-derive
- **GIVEN** the user sets `store.leaseEndResidualOverride.set(20_000)`
- **WHEN** the lease-buyout TCO is computed
- **THEN** `buyoutTotal = 20_000 + buyoutFee + (earlyExitPenalty if applicable)`
- **AND** `residualValue` (end-of-keep asset display) remains independent

#### Scenario: Lease-buyout uses lease-end residual, not end-of-keep residual
- **GIVEN** lease term 36 months, keep duration 60 months, buyout selected
- **AND** end-of-keep `residualValue = $14,000`, lease-end `leaseEndResidual = $20,000`
- **WHEN** the lease-buyout TCO accumulates
- **THEN** the buyout cost charged at month 36 is based on $20,000, not $14,000
- **AND** the asset value displayed in the hero at end of keep is $14,000

#### Scenario: Snapshot round-trip
- **GIVEN** the user has set `leaseEndResidualOverride = 22_500`
- **WHEN** the snapshot is serialized to JSON, decoded, and applied to a fresh store
- **THEN** the override value is preserved

#### Scenario: Backward-compatible URL decode
- **GIVEN** an existing share-URL produced before this change (no `leaseEndResidual` field)
- **WHEN** the snapshot is decoded into a fresh store
- **THEN** `leaseEndResidualOverride` reads as `null` (auto-derive)
- **AND** the rendered scenario matches today's behavior modulo the new categorization
