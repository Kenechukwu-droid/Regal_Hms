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


## Roles and privacy
`src/utils/permissions.js` is the single list of who may see what. Seven roles: Medical Director, Surgeon, Nurse, **Pharmacist**, Front Desk, Finance and
**Staff Administrator** (HR). `routes/modules.js` decides which pages each role can open, and `AppLayout` enforces it for typed addresses too.
Hiding things in the screen is not security: the backend must apply the same rules before sending data.

- **Money:** company revenue and the money overview (Billing, "Money overview" tab) are for **Finance and the Medical Director only**.
- **Staff:** only the **Staff Administrator** adds or edits staff, imports from the portal, sends invitations, resets passwords or two-step
  verification, and unlocks accounts. The Medical Director can look at the staff list but never sees sign-in links.
  The Staff Administrator can't create or change Medical Director or Staff Administrator accounts (the system administrator does that in the backend).
- **Department reports:** each department has one head. The head writes a monthly report (the system fills in the figures, with no money in them),
  submits it, and the Medical Director acknowledges it or sends it back. Heads see only their own department. A non-head clinician has no reports page.

## Built modules
Dashboard, Patients, Appointments, Consultations, Surgical planning, Surgery and theatre, Recovery and aftercare, Billing (with the money overview),
Laboratory, Pharmacy, Messages, Staff and reports. Patient Photography was dropped.

## Sign-in and registration
Registration is **by invitation only**. Nobody picks their own role. The Staff Administrator adds a person (by hand, from the staff portal, or from a CSV),
the system emails a one-time link, and the person (1) chooses a password and accepts the confidentiality statement, then (2) links an authenticator
app (the code checks itself on the sixth digit) and gets 8 backup codes. The account goes live only when the authenticator works. Roles come from the server, never from the browser.

Sign-in is built to be strong but quick:
- Password rules are short: 8+ characters and not an easy-to-guess one. One password box with a show button, no retyping.
- Second step: a 6-digit code that submits itself. On a device the person ticks "don't ask again", the code is skipped for 30 days.
  That trust is forgotten when the password changes, two-step is reset, or the account is turned off. Without the tick, a correct password alone never creates a session.
- Lockout is 5 wrong tries, then 5 minutes (it unlocks itself). Idle sign-out is 30 minutes.

| Call | Purpose |
|---|---|
| `POST /auth/login` `{email,password}` | Returns `{step:'mfa',challenge}` or `{step:'enrol',challenge,secret,uri}`. Same error for unknown email and wrong password. |
| `POST /auth/verify-mfa` `{challenge,code,remember}` | Checks the code or a backup code, then starts the session (httpOnly cookie). With `remember`, also sets a 30-day trusted-device cookie, which `/auth/login` accepts in place of the code. |
| `POST /auth/confirm-enrolment` `{challenge,code}` | Finishes authenticator setup; returns the 8 backup codes once. |
| `GET /auth/me`, `POST /auth/logout` | Check or end the session. A `401` anywhere signs the user out. |
| `POST /auth/forgot-password`, `GET /auth/reset/:token`, `POST /auth/reset-password` | Always answers `{sent:true}`. Link lasts 30 minutes, single use. A reset never removes two-step. |
| `GET /auth/invite/:token`, `POST /auth/activate` | Validate an invitation, then set the password. Returns the authenticator setup. |
| `POST /auth/change-password` | For a signed-in user. |
| `GET /staff/accounts`, `POST /staff/:id/invite`, `/reset-password`, `/reset-two-step`, `/unlock` | Staff Administrator only. |
| `GET /staff`, `POST /staff`, `PUT /staff/:id`, `GET /staff/portal`, `POST /staff/import` | Read: Medical Director and Staff Administrator. Write: Staff Administrator only. |
| `GET /department-reports?month=`, `GET/PUT /department-reports/:dept/:month`, `POST .../submit`, `POST .../review` | Heads write their own; the Medical Director reviews. |
| `GET /billing/money-report?from=&to=` | Finance and Medical Director only. |

The staff portal feed (`GET /staff/portal`) should read the portal database with a **read-only** account and return name, job title, department, email,
phone and a portal ID. Never passwords.

The server must: hash passwords (argon2 or bcrypt), encrypt the authenticator secrets, hash backup codes, rate-limit by IP and by account (the prototype
locks an account for 5 minutes after 5 wrong passwords or codes), check passwords against a breached-password list, add CSRF protection to the cookie
session, expire invitations after 72 hours, make every link single-use, end sessions when a staff member is made inactive, and log sign-ins, role changes,
resets and imports. The 30-minute idle sign-out (`VITE_IDLE_MINUTES`) is a convenience: the server must expire sessions too.
In the prototype the demo accounts, demo password and demo codes are shown on the login page; they vanish when `VITE_USE_MOCK=false`.

## Messages
Staff can message each other and whole departments. Who may message whom is one list, `MESSAGE_GROUPS` in `src/utils/messaging.js`:
the clinical team (surgeon, nurse, pharmacist) together; front desk and finance together; Staff Administrator alone; the Medical Director with everyone.
A department can be messaged only if the sender may message every active member of it. Nobody can read a conversation they aren't in, including the Medical Director.

| Call | Purpose |
|---|---|
| `GET /messages/directory` | People and departments the signed-in user may message. |
| `GET /messages/threads`, `POST /messages/threads` | Inbox, and start a conversation `{toStaff,toDepartments,subject,body}`. |
| `GET /messages/threads/:id`, `POST .../reply`, `POST .../read` | Read, reply, mark read. Members only. |
| `GET /messages/unread-count` | The badge in the sidebar (checked every 30 seconds). |

The server must check every recipient against the rules itself, keep messages for the records period the centre needs, and log who read what.


## Demo data is saved in the browser (prototype only)
While `VITE_USE_MOCK=true`, everything created in the demo (staff, invitations, accounts, tasks, prescriptions) is saved in `localStorage` by `src/services/persist.js`,
so an invitation link opened in a new tab or after a refresh still works. It is shared by tabs of the same browser, not between browsers. "Reset the demo data" is on the login page.
With the real backend this file is not used: the database keeps everything.

## Tasks and departments working together
`/tasks` (`src/pages/Tasks`, rules in `src/utils/tasks.js`, department pairs in `src/utils/interactions.js`).
- **Assigned task:** the head of a department gives work to someone in their own department. Nobody else can assign inside a department, except that **the Medical Director can assign a task to a department head**, who then gives it to a person on their team.
- **Request:** anyone asks a department their department works with (`DEPARTMENT_PAIRS`). It lands in that department's queue; any member can take it, the head can hand it to a person.
- Visibility: the Medical Director sees all; people see what they sent or were given; a department sees its queue; heads see their whole department's work.
- Messages follow the same idea (`MESSAGE_GROUPS`): the front desk can now message the clinical team, and pharmacy can message finance.

| Call | Purpose |
|---|---|
| `GET /tasks`, `POST /tasks` | List what the signed-in person may see; create (`toDept` = own department means assign, otherwise a request). |
| `POST /tasks/:id/{start,done,claim,assign,cancel,reopen}` `{note,assigneeId}` | Each checked against `taskActions()` on the server. |
| `GET /staff/colleagues` | Active staff (id, name, title, role, department, head flag) for the pickers. |
| `GET /badges` | `{messages,tasks,pharmacy}` counts for the sidebar. |

## Pharmacy prescriptions to surgeons and nurses
A pharmacist can write a prescription and must send it to an active surgeon or nurse. The recipient sees it under Pharmacy, "Sent to me", and **replies with the action taken**:
Approve (note optional), Record an action taken, Send back for a change, or Decline (a note is required for all but Approve). Returned and Declined can't be dispensed until the prescription is corrected or cancelled.
The reply and who gave it show on the prescription and in the Pharmacy list. `RX_REPLIES` in `src/utils/pharmacy.js` is the one list of replies.
`POST /prescriptions` (pharmacist: `sendToId` required), `POST /prescriptions/:id/respond` `{action:'approve'|'act'|'return'|'decline',note}`.
The server must check that the recipient is a surgeon or nurse, that only that person can reply, and that they reply once.

## Laboratory: a department with its own queue
The laboratory is **a department of its own**, with its own staff (department `laboratory`). The clinic, theatre and aftercare work with it (`DEPARTMENT_PAIRS`): they send requests and receive results.
Lab requests wait in the laboratory's queue (Laboratory page, "Lab queue" tab). **A member of the laboratory takes a request** and then does the lab work: collects the sample (or does the procedure) and enters the results. Nurses and surgeons in other departments can't take it.
Only the person who took it can do those steps. They, or the head of the laboratory, can put it back in the queue. A **different** surgeon (or the Medical Director) signs the result off, so nobody signs off their own work.
The Medical Director requests tests, signs off and can cancel, but doesn't do the lab work. Rules: `labActions()`, `isLabStaff()` and `canRequestLab()` in `src/utils/laboratory.js`.

| Call | Purpose |
|---|---|
| `POST /lab-requests/:id/take`, `POST /lab-requests/:id/release` | Laboratory staff take a request from the queue, or put it back. The server takes the person from the session. |
| `POST /lab-requests` | The director, the laboratory and departments paired with it may ask for tests. |
| `PUT /lab-requests/:id` | Collect, enter results, sign off or cancel. The server checks the person against `labActions()` and writes the names itself. |
| `GET /badges` | Now also `laboratory`: queue size plus the person's own open requests (laboratory staff only). |

## The Medical Director and tasks
The Medical Director sees all tasks, can send a request to any department, and can assign a task to a department head (button "Assign to a department head"). The Director never assigns to other people inside a department: the head gives it to a person on their team (`taskActions()` and `POST /tasks` both refuse it).
