# Regal Plastic Surgery Centre: HMS Frontend

React · Vite · React Router · Recharts · Lucide

    npm install
    npm run dev        # http://localhost:5173

Demo data only. Not a live medical system.

## Connecting the Python backend
All network calls live in `src/services/api.js`. Copy `.env.example` to `.env`,
set `VITE_USE_MOCK=false`, and the app calls `/api/*` (proxied to `localhost:8000` in `vite.config.js`).
Agree endpoint shapes with the backend developer: `/dashboard`, `/patients`, `/appointments`, `/surgeries`, `/aftercare`, `/quotations`, `/invoices`, `/receipts`.

## Adding a module
1. Add it to `src/routes/modules.js` (path, icon, priority, roles).
2. Build its page in `src/pages/<Module>/`.
3. Register the route in `src/routes/index.jsx`.

## Recovery & aftercare: rules the backend must enforce
The screens check these for convenience; the server is the authority (see comments in `src/services/api.js`).
- Moving a surgery to `Completed` ("Hand over to aftercare") creates one aftercare record in the same transaction, with the four follow-ups below.
- Observation flags are computed on the server from the readings (`getFlags` in `src/utils/aftercare.js` shows the rules). Thresholds and the follow-up schedule are placeholders in `src/components/aftercare/constants.js`: replace them with the centre's own protocol.
- Only a surgeon or the Medical Director may review a flagged reading (a note is required) or discharge to routine follow-up.
- Discharge is refused while any flagged reading is unreviewed, or when no observation has been recorded.
- Booking a follow-up creates a normal appointment, with the same opening-hours and double-booking rules as `/appointments`, and returns the record with each follow-up's appointment joined in.

Endpoints: `GET /aftercare?status&patientId`, `GET /aftercare/:id`, `GET /surgeries/:id/aftercare`, `POST /aftercare/:id/observations`,
`POST /aftercare/:id/observations/:obsId/review`, `POST /aftercare/:id/follow-ups/:key/book`, `POST /aftercare/:id/discharge`.

## Billing: rules the backend must enforce
The screens check these for convenience; the server is the authority (see comments in `src/services/api.js` and `src/utils/billing.js`).
- Money is whole naira in the prototype. Store it as an exact decimal or in kobo on the server. Never use floats.
- Flow: quotation (Draft, Sent, Accepted or Declined) then invoice then payments, each of which issues a receipt.
- Only a **Draft** can be edited. A sent quotation is locked; "Take back to draft" is the only way to change it.
- "Expired" is never stored. A Sent quotation past its valid-until date reads as Expired and can't be accepted.
- A discount above the limit (10%, placeholder in `components/billing/constants.js`) can only be saved or sent by the Medical Director. A discount can never exceed the subtotal, and the total must be above zero.
- Only an **Accepted** quotation can be invoiced, once. Invoice lines are copied so later price changes never alter an issued invoice.
- A plan can have only one live quotation (Draft, Sent and unexpired, or Accepted). Declining frees it.
- Payments: whole naira, more than 0, never more than the balance; transfers and POS need a reference. Each payment stores its receipt number and the balance after it. Payments are never edited or deleted.
- An invoice with any payment can't be voided. **Refunds and payment reversals aren't built yet**; add them before going live.
- Invoice status is derived: Void, Paid, Overdue (balance above 0 and past due), Part-paid, Unpaid.
- Dashboard money alerts carry `roles`; the server must only return them to director, frontdesk and finance.

Endpoints: `GET/POST /quotations`, `GET/PUT /quotations/:id`, `POST /quotations/:id/{send,withdraw,decision,invoice}`,
`GET /invoices`, `GET /invoices/:id`, `POST /invoices/:id/{payments,void}`, `GET /receipts`, `GET /receipts/:no`, `GET /surgical-plans?quoted=false`.
