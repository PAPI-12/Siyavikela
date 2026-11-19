# SANBS RIDE — Transport coordination prototype

SANBS RIDE demonstrates how a single transport booking moves between a donor, a driver, SANBS staff and Transport Operations. The prototype opens in Thabo Mokoena’s Donor App.

## Run locally

With Node.js 20.19+ or 22.12+:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. Run `npm test` for booking lifecycle and dispatch rules, and `npm run build` to produce the static app in `dist/`.

## Suggested stakeholder walkthrough

1. In **Donor → Home**, select **Request transport** and continue with the pre-filled Sandton appointment, pickup and return preference.
2. Use **Demo mode → SANBS Staff** to open Thabo’s new record in **Site overview**. The booking is tagged **Donor self-booked**.
3. In **Transport Operations → Dispatch queue**, assign the outbound trip to **Sipho Dlamini**.
4. Switch to **Driver**. The demo automatically selects the driver assigned to Thabo’s active trip. Acknowledge the assignment, start navigation, mark arrival at pickup, confirm pickup, then mark arrival at the donation site.
5. In **SANBS Staff → Return readiness**, open Thabo’s record, select **Confirm donor arrived**, then **Confirm donor ready for return**. Only the second action makes a return leg dispatchable.
6. Back in **Transport Operations → Dispatch queue**, assign the return trip. Choose **Lerato Nkosi** to demonstrate the independent-driver offer flow, or assign Sipho again.
7. In **Driver**, accept or acknowledge the trip and take it through to completion. In **Donor → My Journey**, verify **Journey completed**.

To try a staff-assisted booking, search for **Nomsa Khumalo** in **SANBS Staff → New booking**. To see how exceptions flow, report a delay in the driver app and open **Transport Operations → Exceptions**. **Demo mode → Reset demo** clears changes, returns to the Donor App and restores the sample booking already in progress with James Peterson.

## Prototype boundaries

- All four roles use the same in-browser records, persisted in `localStorage`. Updates also appear in other open tabs on the same origin. There is no backend or cross-device synchronisation.
- The role switcher is a presentation tool, not authentication. Only use synthetic data. Pickup locations, map routes, driver movement, provider events, contact and notifications are simulated. There are no SANBS, payment, messaging or partner integrations.
- The wordmark and drop icon are a prototype placeholder, not an official SANBS logo.
- `ride/state.js` holds the state transitions and guardrails. The donor and driver views are in `ride/mobile.js`; staff and dispatch views are in `ride/operations.js`.

## Preserved Siyavikela presentation

The original brand strategy site is available at `/siyavikela.html`, including its original artwork and `brand-strategy.pdf`. Its Python source (`build_pdf.py`) remains unchanged. Neighbourhood photography and mockups in that presentation are concept visuals, not documentary claims about current Siyavikela operations or service capacity.
