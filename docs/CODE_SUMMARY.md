# Regal HMS Frontend: Summary of the Code

React 18 + Vite + React Router + Recharts + Lucide. About 180 files. Everything runs on demo data until `VITE_USE_MOCK=false`.
Run it: `npm install`, `npm run dev` (http://localhost:5173). Demo password and codes are shown on the login page.

## 1. How the code is organised

| Folder | What lives there |
|---|---|
| `src/pages/<Module>/` | One folder per screen: Dashboard, Patients, Appointments, Consultations, SurgicalPlanning, Surgery, Aftercare, Billing, Pharmacy, Laboratory, Tasks, Messages, Staff (with department reports), Auth (login, activate, reset), Account |
| `src/components/<module>/` | Forms and pieces used by those pages (e.g. `pharmacy/RxForm.jsx`, `laboratory/ResultsTable.jsx`, `tasks/TaskDetail.jsx`) and `common/` (FormModal, StatusBadge, PageHeader) |
| `src/utils/` | **Rule files**: plain functions that say who may do what and what is valid. The screens use them to show or hide buttons; the backend must repeat them |
| `src/services/api.js` | The **only** place that talks to the server. In demo mode each function runs against `mockData.js` and applies the same rules the server must |
| `src/services/mockData.js`, `persist.js`, `reports.js` | Demo data, saving the demo in `localStorage`, and department report figures |
| `src/routes/` | `modules.js` (sidebar entries and which roles open each page) and `index.jsx` (routes) |
| `src/context/` | `AuthContext` (session, idle sign-out), `RoleContext` (role from the signed-in user) |
| `docs/` | `BACKEND.md` (what the server must provide) and this file |

Key design ideas:
1. **One list per rule.** `permissions.js` (roles), `interactions.js` (department pairs, `canRequestDepartment`), `messaging.js` (`MESSAGE_GROUPS`), `tasks.js`, `laboratory.js`, `pharmacy.js`. Change a rule in one place.
2. **Hiding is not security.** Every mock function in `api.js` re-checks the rule with a `throw`/`reject`, as the real server must.
3. **Roles come from the server**, never from the browser. The signed-in user carries `role`, `department` and `isHead`.
4. **Access is checked twice**: the sidebar hides pages, and `AppLayout` blocks typed URLs (`moduleForPath`, `canOpen`).

## 2. What each module does

- **Dashboard**: KPIs, today's theatre list, alerts (urgent labs, low stock, money alerts only for director/finance/front desk), revenue chart (director/finance).
- **Patients**: registration, profile, allergies (with "no known allergies" confirmation), conditions, timeline, allergy banner shown wherever medicines are prescribed.
- **Appointments**: calendar grid and booking with opening hours, no Sundays and double-booking checks.
- **Consultations**: assessment, diagnosis and plan, addenda after completion; ticked investigations create lab requests automatically.
- **Surgical planning**: procedure, consent, clearance, pre-op checklist and a readiness card; a plan is "Ready" only when blockers are cleared.
- **Surgery and theatre**: scheduling with theatre conflict checks, safety checks, running the case; handover to aftercare on completion.
- **Recovery and aftercare**: observations with computed flags, flagged readings need review, scheduled follow-ups that book real appointments, discharge rules.
- **Billing**: quotation → invoice → payments → receipts; discount limit, expiry, whole-naira money, money overview (director/finance).
- **Pharmacy**: stock with batches and expiry, first-expiry-first-out dispensing, controlled-drug witness, allergy checks, prescriptions.
- **Laboratory**: lab requests from sample to signed-off result, with reference ranges and abnormal flags.
- **Messages**: staff and department messaging governed by `MESSAGE_GROUPS`.
- **Tasks**: assigned work inside a department, and requests between departments.
- **Staff and reports**: staff directory, portal import, invitations, permissions matrix, monthly department reports (head writes, director reviews).
- **Auth**: invitation-only accounts, password + authenticator app (TOTP) with backup codes, trusted devices, lockout, idle sign-out.

## 3. What was done in this round of work

### Prescriptions sent to a nurse or surgeon now get a reply with an action taken
- `utils/pharmacy.js`: new `RX_REPLIES` (Approve, Record an action taken, Send back for a change, Decline) and `rxBlocked()`.
- `pages/Pharmacy/PrescriptionView.jsx`: the old Receive / Send back buttons became four reply buttons with a hint, a note box (required except for Approve) and a confirm.
- `services/api.js` `respondPrescription`: actions `approve | act | return | decline`; one reply only; only the recipient. `dispensePrescription` refuses Returned and Declined.
- `pages/Pharmacy/Pharmacy.jsx` and `RxForm.jsx`: wording ("Waiting for a reply") and the list shows each reply and who gave it.

### Laboratory is a department of its own, with a queue its team works from
The laboratory has its own staff (department `laboratory`). The clinic, theatre and aftercare send it requests and receive the results. Only laboratory staff take and do the lab work.
- `utils/laboratory.js`: new `labActions(request, user)` returning `take`, `release`, `work`, `review`, `ownWork`, `cancel`; plus `isLabStaff` (department = laboratory), `canRequestLab` (director, the lab, and departments paired with it), `inLabQueue`, `isLabOpen`.
- `services/mockData.js`: lab requests gained `takenById/takenByName/takenAt` and `resultedById`; two new sample requests (one in the queue, one taken).
- `services/api.js`: new `takeLabRequest` and `releaseLabRequest`; `saveLabRequest` rewritten to take the person from the session, require that the taker does the collect/result steps, and stop anyone signing off their own results.
- `pages/Laboratory/Laboratory.jsx`: rewritten. Laboratory staff see **Lab queue / My work / All requests** and a **Take request** button. Everyone else sees **My requests / All requests** and follows their tests to a result.
- `pages/Laboratory/LabRequest.jsx`: now uses the signed-in user and `labActions`; shows who took it, Take / Put back in the queue, and explains when you can't sign off your own work.
- Sidebar count: `getBadges` now returns `laboratory`.
- `createLabRequests` now only accepts requests from the director, the laboratory and departments paired with it, and records who asked (`requestedById`, `requestedByDept`).
- Surgeons from other departments sign off the results they asked for, but never their own work.
- **Decision to confirm:** the Medical Director no longer enters lab results (they still request, sign off and cancel).

### The Medical Director sees all tasks, assigns tasks to department heads, and sends requests
- The Director has a new button, **Assign to a department head**, that picks a head from the staff list. The task goes to that head's department and is assigned to the head, who can do it or hand it to someone on their team.
- The Director never assigns to people inside a department. `utils/tasks.js`: `taskActions` excludes the director from `assign`, `validateTask` has a `head` mode, and `isHeadOf` is added. `api.createTask` accepts a director's `assigneeId` only when it is an active head, and sets the department from that head.
- `pages/Tasks/Tasks.jsx` and `components/tasks/TaskForm.jsx` (new `head` mode). Tasks show "Assigned by the Medical Director". One sample task (to the laboratory head) was added.

### Other
- `utils/permissions.js` (the Actions table shown in Staff → Permissions) updated for the new lab and prescription rules.
- `api.js` `request()` now shows the server's `{message}` text when a call is refused.
- `README.md` updated; **`docs/BACKEND.md`** added with every endpoint, rule, object shape and a test checklist.

## 4. Earlier work already in the code (from the README and file dates)
Authentication with authenticator app and invitations; Staff Administrator tools and portal import; department reports; Messages; Tasks and department pairs;
Pharmacy prescriptions from pharmacists to surgeons/nurses; Billing with the money overview; Recovery and aftercare; demo data saved in the browser.

## 5. Known gaps and placeholders (decide before going live)
- Reference ranges (`TESTS`), aftercare flag thresholds, the 10% discount limit, stock expiry warning days and the 30-minute idle time are **placeholders**.
- **Refunds and payment reversals are not built.**
- Dispensing a pharmacist's prescription is **not** blocked while it is still waiting for a reply (only Returned/Declined block it). Add that rule if the reply must come first.
- A pharmacist sees a prescription's reply on the prescription and in the list, but there is no sidebar alert for it yet.
- The production bundle is about 970 kB. Consider route-level code splitting.
- In demo mode data lives in the browser (`localStorage`). Use "Reset the demo data" on the login page after updates to see new sample data.
