# Regal HMS: staff profiles, account activation and department tasks

The frontend now treats each registered staff record as the source profile for that person's HMS account.

## Staff registration and sign-in lifecycle

1. A Staff Administrator creates a staff record using `POST /staff` (or edits it using `PUT /staff/:id`).
2. When the administrator selects **Create the HMS sign-in account and send setup link**, the frontend calls `POST /staff/:id/invite`.
3. The backend creates an invitation-only account and emails a single-use setup link. An invited account must not be able to sign in yet.
4. The staff member opens `/activate`, chooses a password and accepts the confidentiality notice. The backend activates the account after successful setup.
5. The staff member can then sign in and view `/my-profile`. The staff member cannot change their role, department or employment status themselves.
6. Deactivating a staff profile must disable its linked sign-in account and revoke active sessions.

The backend must hash passwords, use expiring single-use invitation tokens, enforce rate limits, and return only safe profile fields. Never return password hashes, invitation tokens, MFA secrets or reset tokens.

## Profile endpoints

- `GET /staff/me` — authenticated user's profile, including `staffId`, name, title, email, phone, role, department, `isHead`, joined date and professional registration details where relevant.
- `GET /staff` — existing staff directory endpoint, restricted to authorized roles.
- `GET /staff/department` — department head's active staff only, restricted server-side to the caller's own department.

## Task endpoints

- `GET /tasks` — return tasks assigned to the caller; department heads also see tasks in their own department; the Medical Director may have centre-wide visibility.
- `POST /tasks` — body: `{ "title": "...", "description": "...", "assignedTo": "staff-id", "priority": "Normal|High|Urgent", "dueDate": "YYYY-MM-DD" }`.
- `PATCH /tasks/:id/status` — body: `{ "status": "Pending|In progress|Completed|Blocked" }`.

### Mandatory server-side task rules

- Only an authenticated department head (`isHead`) can create/assign tasks.
- The assignee must be an active staff member whose department matches the head's department.
- A staff member may update the status of tasks assigned to them.
- A department head may update tasks in their own department; the Medical Director may have oversight access.
- Record `assignedBy`, `assignedTo`, department, timestamps and status changes for auditability.
- Do not rely on frontend filtering for authorization.

## Prototype note

When `VITE_USE_MOCK` is enabled, profile and task data are held in in-memory demo data. For multi-user use across devices, implement the endpoints above with a shared database and enforce every permission on the Python backend.
