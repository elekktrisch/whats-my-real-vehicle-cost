# Contributing

Thanks for taking the time. This is a small Angular 21 SPA — bug fixes, calculation accuracy improvements, and locale tweaks are all welcome.

## Getting set up

```bash
npm install
npm start                                              # dev server at http://localhost:4200
npm test -- --watch=false --browsers=ChromeHeadless    # one-shot unit tests
npm run e2e:install                                    # one-time: download Playwright Chromium
npm run e2e                                            # end-to-end happy-case suite
npm run build                                          # production build
```

## Where things live

- `src/app/scenario/scenario.store.ts` — central signal store. State + computed derivations live here.
- `src/app/scenario/calculations/` — pure functions, no Angular imports. The math is here. Each file has a co-located `*.spec.ts`.
  - `tco.ts` is the dispatcher; `tco-{lease,finance,cash}.ts` are per-mode accumulators.
- `src/app/shared/atoms/` & `src/app/shared/molecules/` — view components, Angular 21 signal I/O (`input()`, `output()`, `model()`).
- `src/app/features/` — feature shells (chart, mode-detail-view).
- `e2e/` — Playwright happy-case specs (desktop + mobile).

For deeper docs see [PRODUCT.md](./PRODUCT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [USE_CASES.md](./USE_CASES.md), and [CLAUDE.md](./CLAUDE.md).

## House rules

- **Pure calc functions take plain objects, not signals.** The store calls them via `computed()`.
- **Atoms are dumb** — no business logic, no internal state beyond view-only derivations. All I/O via `input()` / `output()` / `model()`.
- **Tailwind utility classes inline**, using existing tokens (`bg-surface`, `text-tx`, `font-mono`, …) defined in `src/styles.css`.
- **Prettier** — 100-char lines, single quotes. Run `npx prettier --write .` before committing.

## Tests

- Add a `*.spec.ts` next to anything in `calculations/` you change. The pure-function layer is the regression net.
- Touched the store? Update `scenario.store.spec.ts`.
- Visual change visible end-to-end? Add or update an `e2e/*.spec.ts`. Keep them happy-case — failure-case coverage is in the unit tests.

## Branches & commits

- Branch off `master`. PR back to `master`.
- Commit messages: lowercase, imperative, short (`fix off-by-one in handback cycle`, `add EU insurance baseline`). Match the existing `git log` voice.
- One PR per logical change is easier to review than a sprawling one.
