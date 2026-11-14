# Regal HMS: Backend Specification

For the Python backend developer. The frontend (React + Vite) is finished against demo data. This document says what the server must provide
so that setting `VITE_USE_MOCK=false` makes the app work with no screen changes.

**The golden rule:** the screens hide buttons for convenience, but that is not security. The server decides who may do what, from the signed-in
session, on every request. Never trust a role, name, staff ID or status sent by the browser.

Source of truth for every rule below: `src/services/api.js` (each mock function documents the checks the server must repeat) and `src/utils/*.js`
(the shared rule files: `permissions.js`, `tasks.js`, `laboratory.js`, `pharmacy.js`, `interactions.js`, `messaging.js`, `staff.js`, `billing.js`, `aftercare.js`).

---

## 1. Setup and conventions

| Item | Value |
|---|---|
| Base URL | `/api` (Vite proxies to `http://localhost:8000`, see `vite.config.js`) |
| Format | JSON in, JSON out. Dates `YYYY-MM-DD`; timestamps ISO 8601 UTC |
| Session | httpOnly, Secure, SameSite cookie. The browser sends `credentials: 'include'` |
| `401` | Not signed in or session expired. The app signs the user out |
| `403` / `400` / `409` / `422` | Refusal. **Body must be `{ "message": "plain English reason" }`.** The app shows `message` to the user |
| Money | Whole naira in the prototype. Store as exact decimal or kobo. Never floats |
| IDs | Strings: `RPS-1042` (patient), `ST-05` (staff), `L-7001` (lab), `RX-8001` (prescription), `TK-1` (task), `T-1` (thread) |

Suggested stack: FastAPI or Django REST, PostgreSQL, argon2 password hashing, an audit-log table.

### Roles (7)
`director` (Medical Director), `surgeon`, `nurse`, `pharmacist`, `frontdesk`, `finance`, `hr` (Staff Administrator).
Roles come only from the `staff` table.

### Departments (7)
`frontdesk`, `clinic`, `theatre`, `aftercare`, `laboratory`, `pharmacy`, `finance`. The Medical Director and Staff Administrator have no department.
Each department has at most one **head** (`isHead`). Only an active staff member can be a head.

### The signed-in user object (`GET /auth/me`, returned after sign-in)
```json
{ "staffId": "ST-05", "name": "Nurse Joy", "title": "Theatre and recovery nurse", "email": "joy@regal.example",
  "role": "nurse", "department": "aftercare", "isHead": true }
```
`isHead` is true only for an **active** head. The Medical Director is never a head.

---

## 2. Authentication and staff accounts

Registration is by invitation only. Nobody chooses their own role.

| Call | Who | What |
|---|---|---|
| `POST /auth/login` `{email,password}` | public | `{step:'mfa',challenge}` or `{step:'enrol',challenge,secret,uri}`. Same error for unknown email and wrong password. A valid trusted-device cookie skips the code |
| `POST /auth/verify-mfa` `{challenge,code,remember}` | public | Checks TOTP or a backup code, starts the session. `remember` sets a 30-day trusted-device cookie |
| `POST /auth/confirm-enrolment` `{challenge,code,remember}` | public | Finishes authenticator setup; returns 8 backup codes **once** |
| `GET /auth/me`, `POST /auth/logout` | signed in | Check / end session |
| `POST /auth/forgot-password` `{email}` | public | Always `{sent:true}`. Link lasts 30 min, single use. Never removes two-step |
| `GET /auth/reset/:token`, `GET /auth/invite/:token` | public | Validate a link |
| `POST /auth/reset-password` `{token,password}` | public | |
| `POST /auth/activate` `{token,password,acknowledged}` | public | Accept an invitation; returns authenticator setup |
| `POST /auth/change-password` `{current,next}` | signed in | Forgets all trusted devices |
| `GET /staff/accounts` | hr | Account status per person (never secrets or links to the director) |
| `POST /staff/:id/invite`, `/reset-password`, `/reset-two-step`, `/unlock` | hr | |
| `GET /staff` | director, hr | Directory |
| `POST /staff`, `PUT /staff/:id` | hr | Validate with `validateStaff()` and `protectedRoleProblem()` (see `utils/staff.js`) |
| `GET /staff/portal`, `POST /staff/import` `{rows}` | hr | Read the staff portal with a **read-only** DB account. Never return passwords |
| `GET /staff/colleagues` | any signed-in | Active staff with accounts: `{id,name,title,role,department,isHead}`. Used by pickers |

Security the server must add: argon2/bcrypt hashing; encrypted TOTP secrets; hashed backup codes; rate-limit by IP and account
(prototype: lock 5 minutes after 5 wrong passwords or codes, one shared counter); breached-password check (8+ characters);
CSRF protection; invitations expire after 72 hours and are single-use; end sessions when someone is made inactive; 30-minute idle expiry;
audit log of sign-ins, role changes, resets, imports.

Staff rules: a unique email; one active head per department; at least one active Medical Director must always exist; the Staff
Administrator cannot create or change Medical Director or Staff Administrator accounts, cannot change those roles, and cannot turn off their own account.

---

## 3. Tasks and requests between departments (`/tasks`)

Two kinds of work (`kind`):
- **assigned**: the **head** of a department gives work to someone **in their own department**. The **Medical Director** may also assign a task to a department **head** (never to anyone else inside a department).
- **request**: a person asks another department. It lands in that department's **queue** (`assigneeId = null`). Any member can claim it; the head can assign it to a person.

| Call | What |
|---|---|
| `GET /tasks` | Only tasks the user may see (below) |
| `POST /tasks` `{title,details,priority,dueDate,patientId,toDept,assigneeId}` | Three cases. (1) `toDept` equals the user's own department: **assign**, head only, `assigneeId` required, another active person in that department. (2) The user is the **Medical Director** and sends `assigneeId`: it must be an **active department head**; set `toDept` to that head's department on the server, `kind = 'assigned'`, `fromDept = ''`. (3) Anything else is a **request** to a department's queue (`assigneeId = null`) |
| `POST /tasks/:id/{start,done,claim,assign,cancel,reopen}` `{note,assigneeId}` | Each checked against `taskActions()` |

**Visibility** (`canSeeTask`): the Medical Director sees all; a person sees tasks they sent or were given; a department member sees unassigned tasks in their department's queue;
a head sees all tasks to or from their department.

**Actions** (`taskActions`), only on open tasks (To do / In progress):
- `start`, `done`: the assignee. `claim`: any member of the target department when nobody is assigned.
- `assign`: the **head of the target department only**, to an active person in that department.
- `cancel` (note required): the sender, or the head of the target department. `reopen` (note required): the sender, on a Done task.

**The Medical Director** sees every task and may (a) send a request to **any** department's queue, or (b) **assign a task to a department head**. The Director can **never assign work to anyone else inside a department**:
refuse `POST /tasks/:id/assign` from the director, and refuse a `POST /tasks` whose `assigneeId` from the director is not an active head, with: *"The Medical Director gives work to a department head. The head then gives it to a person on their team."*
Once the head holds the task, the head may `start`/`done` it themselves or `assign` it to an active person in their department (the target-department head can always `assign`).
Other users may only request departments paired with theirs in `DEPARTMENT_PAIRS` (`utils/interactions.js`, two-way pairs).

Validation: title required, up to 120 characters; details up to 1000; due date not in the past; the patient (if any) must exist.
Every change appends `{at,by,text}` to `history`.

**Task object**
```json
{ "id":"TK-3", "title":"…", "details":"…", "priority":"Normal|Urgent", "dueDate":"2026-11-20|''", "status":"To do|In progress|Done|Cancelled",
  "kind":"assigned|request", "fromId":"ST-05", "fromName":"Nurse Joy", "fromDept":"aftercare", "fromDeptLabel":"Aftercare",
  "toDept":"pharmacy", "toDeptLabel":"Pharmacy", "assigneeId":null, "assigneeName":"", "patientId":"RPS-1039", "patient":"Tamuno Briggs",
  "doneNote":"", "createdAt":"…", "updatedAt":"…", "history":[{"at":"…","by":"…","text":"…"}] }
```

---

## 4. Laboratory (`/lab-requests`)

The laboratory is a **department of its own**, like Theatre or Aftercare, with its own staff (nurses or surgeons whose `department` is `laboratory`).
Other departments **interact with it**: the clinic, theatre and aftercare (see `DEPARTMENT_PAIRS`) send it requests and receive the results.
Requests wait in the laboratory's **queue**. Nobody assigns them: a member of the laboratory **takes** one and does the lab work.

Status flow, in order, no skipping: `Requested` → `Collected` → `Resulted` → `Reviewed`. `Cancelled` is possible until Reviewed.

| Call | What |
|---|---|
| `GET /lab-requests?patientId=` | director, surgeon, nurse (anyone who can open the Laboratory page) |
| `GET /lab-requests/:id` | |
| `POST /lab-requests` `{patientId,tests[],priority,clinicalNote}` | The Medical Director, the laboratory itself, or a department paired with it (`clinic`, `theatre`, `aftercare`); otherwise refuse with *"Your department doesn’t work with the laboratory. Ask the Medical Director."* Store `requestedById`, `requestedBy` and `requestedByDept` from the session. One request per test. Refuse a duplicate that is still open for the same patient and test. Lab requests are also created automatically when a consultation lists investigations |
| `POST /lab-requests/:id/take` | **Laboratory department staff only** (`department = laboratory` and role `nurse` or `surgeon`). Nurses and surgeons in other departments are refused. Only while status is Requested or Collected and nobody has taken it. Sets `takenById`, `takenByName`, `takenAt` from the session. `409` if already taken |
| `POST /lab-requests/:id/release` | The person who took it, **or** the head of the laboratory department. Clears the three fields |
| `PUT /lab-requests/:id` | Moves to the next status, or to Cancelled. Rules below |

**Rules for `PUT`** (`labActions()` in `utils/laboratory.js`; the server writes the names and timestamps itself):
- To `Collected` or `Resulted`: the user must be laboratory staff (as above) **and be the person who took the request** (`takenById === session user`). Otherwise: *"Take this request from the queue first"* or *"X took this request, so only they can do the lab work."*
- To `Resulted`: every required field of the test must be filled, and numbers must be numbers of 0 or more (`missingFields`, `validateResults`). Store `resultedById`.
- To `Reviewed`: role `surgeon` or `director` (so surgeons from other departments can sign off the results they asked for), **and not the person who entered the results** (`resultedById !== user`), so nobody signs off their own work. If any value is outside its reference range (`flaggedResults`), a `reviewNote` is required.
- To `Cancelled`: surgeon or director, with a reason.
- The Medical Director requests, signs off and cancels but does **not** do the lab work (no take, collect or enter results).
- A normal (not flagged) Reviewed result ticks the matching "Result reviewed: <test>" item on the patient's open surgical-plan checklist, in the same transaction.

**Lab request object**
```json
{ "id":"L-7001", "patientId":"RPS-1036", "patient":"Chiamaka Obi", "sex":"Female", "test":"Full blood count", "priority":"Routine|Urgent",
  "requestedBy":"Dr. Amadi", "requestedById":"ST-03", "requestedByDept":"clinic", "requestedAt":"…", "consultationId":null, "source":"Manual|Consultation C-…", "clinicalNote":"",
  "status":"Requested|Collected|Resulted|Reviewed|Cancelled",
  "takenById":"", "takenByName":"", "takenAt":null,
  "collectedAt":null, "collectedBy":"", "sampleNote":"",
  "results":{"hb":"11.2","wbc":"6.4","plt":"270"}, "resultedAt":null, "resultedById":"", "resultedBy":"",
  "reviewedAt":null, "reviewedBy":"", "reviewNote":"", "cancelReason":"" }
```
Tests, fields and reference ranges are in `src/utils/laboratory.js` (`TESTS`). They are adult placeholders: replace them with the laboratory's own ranges and keep one copy.

---

## 5. Pharmacy (`/medications`, `/prescriptions`)

| Call | Who | What |
|---|---|---|
| `GET /medications`, `GET /medications/:id` | director, surgeon, nurse, pharmacist | Item with batches; the detail also returns stock movements |
| `POST /medications/:id/receive` `{batchNo,expiry,qty}` | director, nurse, pharmacist | |
| `POST /medications/:id/adjust` `{batchNo,newQty,reason}` | same | Reason required |
| `POST /medications/:id/write-off-expired` | same | |
| `GET /prescriptions?patientId=`, `GET /prescriptions/:id` | pharmacy roles | |
| `POST /prescriptions` | director, surgeon, pharmacist | A **pharmacist's** prescription must include `sendToId`: an active **surgeon or nurse** other than the author. A surgeon's/director's names `prescriberId` |
| `POST /prescriptions/:id/respond` `{action,note}` | **only the person it was sent to** | see below |
| `POST /prescriptions/:id/cancel` `{reason}` | director, surgeon, or the pharmacist who wrote it | Only while nothing has been dispensed. Reason required |
| `POST /prescriptions/:id/dispense` `{lines,witness}` | director, nurse, pharmacist | see below |

**Replying to a prescription sent to you**: `action` is one of

| `action` | Stored `receipt.state` | Note | Blocks dispensing |
|---|---|---|---|
| `approve` | Approved | optional | no |
| `act` | Action taken | **required** (what was done) | no |
| `return` | Returned | **required** (what to change) | **yes** |
| `decline` | Declined | **required** (why) | **yes** |

One reply only (`409` after that). Refuse if the prescription is cancelled or was not sent to the caller. Store `receipt = {state,at,byId,note}`.
Older records may hold the state `Received`: treat it as Approved.

**Dispensing rules:** refuse if cancelled or blocked (Returned/Declined); quantities are whole numbers within what is left on that line; stock is taken
**first-expiry-first-out** and **expired stock is never dispensed**; a medicine that matches a recorded patient allergy needs the prescriber's written
override on the prescription; a controlled medicine needs a witness name; every stock change writes a ledger entry in the same transaction.
**Prescribing rule:** a medicine matching a recorded allergy needs `allergyOverride.reason`.

**Prescription object**
```json
{ "id":"RX-8002", "patientId":"…", "patient":"…", "prescriberId":null, "prescriberName":"Pharm. Chioma Okoye", "createdById":"ST-11",
  "sentToId":"ST-05", "sentToName":"Nurse Joy", "sentToRole":"nurse", "sentAt":"…",
  "receipt":{"state":"Approved","at":"…","byId":"ST-05","note":""}, "receiptByName":"Nurse Joy",
  "source":"Manual|Pharmacy|Aftercare", "createdAt":"…", "notes":"", "allergyOverride":null,
  "lines":[{"itemId":"M-04","name":"…","dose":"1 tablet","frequency":"Three times daily","days":7,"qty":21,"controlled":false,"dispensedQty":0}],
  "dispensings":[{"id":1,"at":"…","by":"…","witness":"","lines":[{"itemId":"M-04","name":"…","qty":10,"batches":[{"batchNo":"AC2404","qty":10}]}]}],
  "cancelledAt":null, "cancelReason":"" }
```
Status is derived: Cancelled, Dispensed, Part-dispensed, Pending (`rxStatus`).

---

## 6. Messages and badges

Who may message whom is `MESSAGE_GROUPS` in `utils/messaging.js`: surgeon+nurse+pharmacist+frontdesk together; frontdesk+finance; pharmacist+finance; hr alone;
the Medical Director with everyone. A department can be messaged only if the sender may message **every** active member. Nobody reads a thread they are not
a member of, including the Medical Director. Subject up to 120 characters, body up to 2000.

`GET /messages/directory`, `GET/POST /messages/threads` `{toStaff,toDepartments,subject,body}`, `GET /messages/threads/:id`, `POST …/reply` `{body}`, `POST …/read`, `GET /messages/unread-count`.

`GET /badges` returns the sidebar numbers:
```json
{ "messages": 1, "tasks": 3, "pharmacy": 2, "laboratory": 4 }
```
- `tasks`: open tasks assigned to me, plus unassigned open tasks in my department's queue.
- `pharmacy`: prescriptions sent to me that I haven't replied to (not cancelled).
- `laboratory`: laboratory department staff only: requests in the lab queue (open and untaken) plus open requests I took. Everyone else gets 0.

---

## 7. Department reports and money

- `GET /department-reports?month=YYYY-MM` (director: list), `GET/PUT /department-reports/:dept/:month`, `POST …/submit`, `POST …/review` `{action:'acknowledge'|'return',note}`.
  Heads write only their own department's report. The figures are computed by the server (counts only, **no money**, `services/reports.js` shows the definitions). The director sees only **submitted** reports.
- `GET /billing/money-report?from=&to=` and the dashboard revenue: **director and finance only**. Dashboard alerts carry `roles`; filter them on the server.

---

## 8. Clinical and billing modules (summary)

These are already described in `README.md`; the mock function for each shows the validation to repeat.

| Area | Endpoints | Key rules |
|---|---|---|
| Patients | `GET/POST /patients`, `GET /patients/:id`, allergy and condition CRUD under `/patients/:id/…`, `POST …/allergies/confirm-none` | director, surgeon, nurse, frontdesk |
| Appointments | `GET /appointments?from&to`, `POST /appointments` | Opening hours, no Sundays, no double-booking (`utils/scheduling.js`) |
| Consultations | `/consultations`, `PUT /consultations/:id`, `POST …/complete`, `POST …/addenda`, `GET/POST /appointments/:id/consultation` | Only surgeon/director write the diagnosis and complete |
| Surgical planning | `/surgical-plans`, `GET/POST /consultations/:id/surgical-plan` | Consent, clearance and checklist gate "Ready" (`utils/planning.js`) |
| Surgery | `/surgeries`, `GET /surgical-plans?status=Ready&unscheduled=true` | Theatre conflict check (`utils/theatre.js`) |
| Aftercare | `/aftercare…`, `GET /surgeries/:id/aftercare` (the record is created when `PUT /surgeries/:id` moves a surgery to Completed) | Flags computed on the server; discharge refused while flagged readings are unreviewed |
| Billing | `/quotations…`, `/invoices…`, `/receipts…` | Quotation → invoice → payments; discount above 10% only by the director; payments never edited or deleted; no refunds yet |
| Dashboard | `GET /dashboard` | KPIs, revenue (director/finance), alerts, today's theatre list |

---

## 9. Suggested tables

`staff`, `accounts` (hash, mfa, lockout, trusted devices, invite/reset tokens), `patients`, `patient_allergies`, `patient_conditions`, `appointments`,
`consultations`, `surgical_plans`, `surgeries`, `aftercare_cases`, `observations`, `quotations`, `invoices`, `payments`,
`lab_requests`, `medications`, `medication_batches`, `stock_movements`, `prescriptions`, `prescription_lines`, `dispensings`,
`tasks`, `task_history`, `message_threads`, `message_members`, `messages`, `department_reports`, `audit_log`.

Use database transactions for: handover to aftercare, issuing a receipt, dispensing (stock + ledger + prescription), a Reviewed lab result ticking the plan, and invoicing an accepted quotation.

## 10. Test checklist for the new rules

1. A laboratory nurse takes a lab request: `200`. A second laboratory nurse taking it: `409`. A nurse or surgeon from theatre, clinic or aftercare, or the director, taking it: `403`.
2. Surgeon B tries to enter results on a request taken by nurse A: refused.
3. Surgeon who entered results tries to sign off: refused. Another surgeon or the director: allowed (abnormal result needs a note).
4. Pharmacist sends a prescription to a surgeon. Another nurse replying: `403`. The recipient replies `act` with no note: refused. `return` then `dispense`: refused.
5. Director `POST /tasks` with a head's `assigneeId`: `200` (task goes to that head's department, assigned to the head). With a non-head `assigneeId`, or `POST /tasks/:id/assign`: refused. Director request to any department (no `assigneeId`): `200`, lands in the queue.
   The head then `assign`s the task to someone on their team: `200`. A different department's head trying to: refused.
6. A pharmacy nurse creating a lab request: refused (pharmacy is not paired with the laboratory). A theatre surgeon creating one: `200`, and it appears in the lab queue.
7. Lab head `release`s a request taken by someone else: allowed. A plain nurse doing the same: refused.
8. A user who is not the head tries to assign inside their own department: refused.
