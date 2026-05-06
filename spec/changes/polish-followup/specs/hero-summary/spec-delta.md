# hero-summary — spec delta

## ADDED Requirements

### Requirement: Hero details auto-close on direct user-input scroll
WHEN the user provides direct scroll input (mouse wheel, touch drag, or a
keyboard key recognized as a scroll command),
the hero `+ Details` disclosure SHALL close.

The system SHALL NOT close the disclosure on synthetic / layout-driven
scroll events (browser scroll-anchoring after sticky-stack height changes,
hydration / restored scroll position, programmatic `scrollIntoView`, etc.).

Recognized scroll keys: `PageUp`, `PageDown`, `Home`, `End`, `ArrowUp`,
`ArrowDown`, `Space` (when the focus is not in an input/textarea).

#### Scenario: Mouse wheel closes details
- **GIVEN** the comparison page is loaded with `+ Details` open
- **WHEN** the user rolls the mouse wheel (any direction)
- **THEN** `detailsOpen` flips to false
- **AND** the disclosure body unmounts

#### Scenario: Touch drag closes details
- **GIVEN** the comparison page is loaded with `+ Details` open on a touch device
- **WHEN** a `touchmove` event fires on `window`
- **THEN** `detailsOpen` flips to false

#### Scenario: Keyboard scroll closes details
- **GIVEN** the comparison page is loaded with `+ Details` open and focus is on the body (not in an input)
- **WHEN** the user presses `PageDown`, `ArrowDown`, `Space`, `Home`, `End`, etc.
- **THEN** `detailsOpen` flips to false

#### Scenario: Keyboard scroll while typing in an input does not close
- **GIVEN** focus is on the negotiated-price input or any other text input
- **WHEN** the user presses `Space` (which would be a normal text-entry character)
- **THEN** `detailsOpen` does NOT change

#### Scenario: Sticky-stack collapse does not close details
- **GIVEN** the user has `+ Details` open and is scrolling down
- **WHEN** the page crosses the `[data-scrolled]` threshold and the sticky stack height shrinks (which may trigger a synthetic `scroll` event from browser scroll-anchoring)
- **THEN** the disclosure closes ONCE from the user's actual scroll input — not a second time from the layout-shift-induced scroll event

#### Scenario: Page hydration with restored scroll position does not close details
- **GIVEN** the page loads via a `?s=` URL that restores a non-zero scroll position
- **WHEN** the page renders and the browser fires a synthetic `scroll` event during hydration
- **THEN** `detailsOpen` is unaffected (no `wheel` / `touchmove` / `keydown` was issued)

#### Scenario: Programmatic scrollIntoView does not close details
- **GIVEN** the user has `+ Details` open
- **WHEN** the "Tweak the levers" button calls `scrollIntoView({behavior: 'smooth'})`
- **THEN** `detailsOpen` is unaffected (no user input was issued)

### Requirement: Per-mode "Out of pocket" caption explains spend timing
WHEN the comparison page renders the hero summary,
the hero column captioning the `outOfPocket` total SHALL convey when the
money is actually spent using a short year-range format. Desktop uses
"year N" / "years 1-N"; mobile abbreviates to "yr" / "yrs".

#### Scenario: Cash mode caption
- **GIVEN** the active mode is Cash
- **WHEN** the hero renders
- **THEN** the desktop caption reads "year 1"
- **AND** the mobile caption reads "yr 1"

#### Scenario: Finance mode with non-zero down payment
- **GIVEN** the active mode is Finance with `downPayment > 0`
- **WHEN** the hero renders
- **THEN** the desktop caption reads "year 1"
- **AND** the mobile caption reads "yr 1"
- **AND** rationale: year 1 = down payment + 12 monthly payments, materially larger than years 2..N which are only 12 monthlies

#### Scenario: Finance mode with zero down payment
- **GIVEN** the active mode is Finance with `downPayment === 0` and loan term `T` months (`N = T / 12`)
- **WHEN** the hero renders
- **THEN** the desktop caption reads "years 1-{N}"
- **AND** the mobile caption reads "yrs 1-{N}"

#### Scenario: Lease (renew) caption
- **GIVEN** the active mode is Lease (renew) with keep duration `K` years
- **WHEN** the hero renders
- **THEN** the desktop caption reads "years 1-{K}"
- **AND** the mobile caption reads "yrs 1-{K}"
- **AND** rationale: monthly payments span the full keep; cyclic spikes (down + handback) further confirm spend across the full duration

#### Scenario: Lease (buyout) caption
- **GIVEN** the active mode is Lease (buyout) with lease term `T` months (`N = T / 12`) and keep duration `K > N`
- **WHEN** the hero renders
- **THEN** the desktop caption reads "years 1-{N}"
- **AND** the mobile caption reads "yrs 1-{N}"
- **AND** rationale: monthly payments + buyout fire by year N; later years are only running costs (already in their own breakdown lines)

#### Scenario: Lease (buyout) where keep equals term
- **GIVEN** the active mode is Lease (buyout) with `K === N` (1-cycle equivalent)
- **WHEN** the hero renders
- **THEN** the caption matches the buyout pattern: "years 1-{N}" / "yrs 1-{N}"

### Requirement: Hero opportunity-cost footnote
WHEN the comparison page renders the hero summary,
the hero card SHALL display a footnote stating the approximate opportunity
cost over the keep duration and clarifying that opportunity cost is part of
the chart's true-cost view but not the hero's `outOfPocket` total.

#### Scenario: Footnote present on every mode
- **GIVEN** any active mode
- **WHEN** the hero renders
- **THEN** a footnote is visible
- **AND** its currency value is approximately `purchasePrice × opportunityCostRate × keepDuration`
- **AND** the copy explicitly mentions that this number is in the chart but not the cash-out total

#### Scenario: Footnote collapses in compact state
- **GIVEN** the page is scrolled past the compact threshold
- **WHEN** `[data-scrolled='true']` is set
- **THEN** the footnote collapses with `opacity 0` + `max-height 0` over the standard 300 ms transition
