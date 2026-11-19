# SANBS RIDE — Transport coordination prototype

SANBS RIDE demonstrates how a single transport booking moves between a donor, a driver, SANBS staff and Transport Operations. The prototype opens in Thabo Mokoena’s Donor App.

## Run locally

With Node.js 20.19+ or 22.12+:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. Run `npm test` for booking lifecycle and dispatch rules, and `npm run build` to produce the static app in `dist/`.

## Deploy from GitHub to Vercel

1. Import the GitHub repository into Vercel with the **Vite** framework preset, or use the existing linked project. Push the branch to get a Vercel Preview deployment on its pull request. `vercel.json` builds the frontend in `dist/`; Vercel also deploys the `/api/rooms` serverless function.
2. In the Vercel project, connect an **Upstash Redis** database from Storage/Marketplace and include the **Preview** environment. The function reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` and `KV_REST_API_TOKEN`). Keep the token server-side; do not prefix it with `VITE_`. For instant push updates, also add the same database’s native TLS connection URL as a server-only `REDIS_URL` (the function also recognises `KV_URL` and `UPSTASH_REDIS_URL`). Without a native URL, clients use the REST polling fallback. Redeploy the latest Preview after adding the integration. Add the Production environment only if you intend to run shared rooms there.
3. Open the Vercel preview and use **Demo mode → Shared testing → Create shared session**. Send the generated invite link, including the room query parameter, to all four testers. Each opens the same link and chooses a different role. If the preview is protected, first use Vercel’s sharing controls to give those testers access, then confirm a tester can open the final invite in a private browser window.

### Rehearse locally on separate browsers

```bash
SANBS_RIDE_LOCAL_ROOMS=1 npm run dev
```

Create a shared session and open the same invite URL in four separate browser profiles or private windows. The development-only memory store resets when Vite restarts. Vercel requires Redis: without it, the solo demo still works, but shared rooms are unavailable. For Redis-backed testing locally, copy `.env.example` to `.env.local` and supply the server-side variables.

## Suggested stakeholder walkthrough

1. In **Donor → Home**, select **Request transport** and continue with the pre-filled Sandton appointment, pickup and return preference.
2. Use **Demo mode → SANBS Staff** to open Thabo’s new record in **Arrivals worklist**. The booking is tagged **Donor self-booked**.
3. In **Transport Operations → Dispatch queue**, assign the outbound trip to **Sipho Dlamini**.
4. In **Driver**, the app automatically follows Thabo’s assigned driver unless the tester manually selects a different driver in **Demo mode**. Acknowledge the assignment, start navigation, mark arrival at pickup, confirm pickup, then mark arrival at the donation site.
5. In **SANBS Staff → Return readiness**, open Thabo’s record, select **Confirm donor arrived**, then **Confirm donor ready for return**. Only the second action makes a return leg dispatchable.
6. Back in **Transport Operations → Dispatch queue**, assign the return trip. Choose **Lerato Nkosi** to demonstrate the independent-driver offer flow, or assign Sipho again.
7. In **Driver**, accept or acknowledge the trip and take it through to completion. In **Donor → My Journey**, verify **Journey completed**.

To try a staff-assisted booking, search for **Nomsa Khumalo** in **SANBS Staff → New booking**. To see how exceptions flow, report a delay in the driver app and open **Transport Operations → Exceptions**. In solo mode, **Demo mode → Reset demo** clears local changes and restores the sample booking already in progress with James Peterson. For another collaborative run, leave the shared session and create a fresh invite.

## Prototype boundaries

- Solo mode uses `localStorage`. Shared mode stores one versioned record per invite in Redis. With a native Redis connection, a server-sent event tells connected browsers when a new revision is saved. Browsers re-read the record on reconnect and fall back to a two-second check when streaming is unavailable. Simultaneous writes cannot silently overwrite each other; the second tester sees the latest state and can try again. Shared sessions expire 24 hours after creation.
- Anyone with the invite can read the demo room and switch roles. Use only synthetic data and share the link only with testers. The server enforces which actions a selected role can take, but this is not account authentication or production access control. Pickup locations, map routes, driver movement, provider events, contact and notifications are simulated. There are no SANBS, payment, messaging or partner integrations.
- The SANBS logo is shown unchanged from the [Blood transfusion Genomics Consortium’s SANBS member profile](https://www.bgc.io/members/sanbs). The red in this prototype is sampled from that artwork. RIDE remains a stakeholder prototype, not an official SANBS product.
- `ride/state.js` holds the state transitions and guardrails. The donor and driver views are in `ride/mobile.js`; staff and dispatch views are in `ride/operations.js`.

## Preserved Siyavikela presentation

The original brand strategy site is available at `/siyavikela.html`, including its original artwork and `brand-strategy.pdf`. Its Python source (`build_pdf.py`) remains unchanged. Neighbourhood photography and mockups in that presentation are concept visuals, not documentary claims about current Siyavikela operations or service capacity.
