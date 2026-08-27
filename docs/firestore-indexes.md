# Firestore indexes

Every composite index Orelis needs, why it exists, and what breaks without it.

## Deploying

```bash
firebase deploy --only firestore:indexes
```

Index builds are asynchronous. A large collection can take minutes to hours, and
queries needing an index that is still building fail exactly as if it did not
exist. Deploy indexes **before** shipping the code that depends on them.

## Why this file is not optional

A composite index is required whenever a query combines an equality filter with
an ordering on a different field. Firestore does not degrade gracefully: the
query throws `failed-precondition` at runtime, on the device, with a console link
to create the index by hand. There is no compile-time or deploy-time warning, so
a missing index is discovered by a clinician, not by CI.

`src/lib/offline/sync.ts` catches this specific error and retries without the
ordering, so hydration still populates the mirror — but with an arbitrary slice
of records instead of the most recent ones. It logs loudly when it does. That is
a safety net for a fresh project, not a substitute for deploying these.

## The indexes

### Hydration — `clinicId` + recency

`hydrateClinicData` reads a bounded, newest-first slice of each collection so a
device that goes offline holds what a clinician will actually open.

| Collection | Fields |
|---|---|
| `patients` | `clinicId` ASC, `registrationDate` DESC |
| `encounters` | `clinicId` ASC, `date` DESC |
| `appointments` | `clinicId` ASC, `appointmentDate` DESC |
| `prescriptions` | `clinicId` ASC, `date` DESC |
| `lab_orders` | `clinicId` ASC, `requestedAt` DESC |
| `admissions` | `clinicId` ASC, `admittedAt` DESC |
| `invoices` | `clinicId` ASC, `date` DESC |

`medications`, `wards` and `beds` are fetched with a `clinicId` equality filter
and no ordering. A single-field filter uses the automatic index, so they need no
entry here.

The ordering field for each collection must stay in step with `TIME_FIELD` in
`src/lib/offline/sqlite.ts`. That map decides the `created_at` column the local
mirror sorts on. If the two disagree, the server hands back the newest 800 rows
by one definition of "newest" and the app pages through them by another — so
records appear and disappear depending on whether the read was served locally or
remotely.

### Charts — `patientId` + recency

Opening a patient is the most frequent read in the app, and every tab on that
screen is one of these.

| Collection | Fields |
|---|---|
| `encounters` | `patientId` ASC, `date` DESC |
| `appointments` | `patientId` ASC, `appointmentDate` DESC |
| `prescriptions` | `patientId` ASC, `date` DESC |
| `lab_orders` | `patientId` ASC, `requestedAt` DESC |
| `admissions` | `patientId` ASC, `admittedAt` DESC |
| `invoices` | `patientId` ASC, `date` DESC |

Deliberately keyed on `patientId` alone rather than `clinicId` + `patientId`. A
patient id is already unique to one clinic, so adding `clinicId` would double the
index count for no additional selectivity. Access control is enforced by
`firestore.rules`, which is where it belongs — an index is not a security
boundary.

### Scheduling

| Collection | Fields | Used by |
|---|---|---|
| `appointments` | `clinicId` ASC, `status` ASC, `appointmentDate` DESC | today's list, waitlist, no-show views |

### Audit trail

The collection is `audit_logs`. Ordering is on `timestamp` (a client ISO string),
not `createdAt` (`serverTimestamp()`), because `serverTimestamp()` resolves to
`null` until the write reaches the server — an event logged offline would sort to
the epoch and fall off the end of every ordered query. `createdAt` is still
written and is the value an investigation should trust, since a client clock can
be wrong or deliberately set back.

| Fields | Used by |
|---|---|
| `clinicId` ASC, `timestamp` DESC | activity feed |
| `clinicId` ASC, `userId` ASC, `timestamp` DESC | per-staff activity |
| `clinicId` ASC, `patientId` ASC, `timestamp` DESC | record-access log — who opened this chart |
| `clinicId` ASC, `action` ASC, `timestamp` DESC | filtering to one event type |

### Delta sync — `clinicId` + `updatedAt`

Present but **not yet used**. `DELTA_SYNC_ENABLED` in `src/lib/offline/sync.ts`
is `false`, and turning it on before a backfill loses records.

The query would be `where('clinicId','==',x)` + `where('updatedAt','>',stamp)`,
which is far cheaper than re-reading a collection. The trap is that Firestore
inequality filters match only documents that **have** the field. Any record
written before `withTimestamps()` existed has no `updatedAt` and is silently
excluded — not errored, excluded. The first delta sync would drop every
historical patient from the mirror, and the stamp it writes would then suppress
the full sync that would have restored them.

Before enabling it: run a one-off script that stamps `updatedAt` on every
existing document in `patients`, `encounters`, `appointments`, `prescriptions`,
`lab_orders`, `invoices` and `admissions`, then verify a count query returns zero
documents missing the field.

## Adding a query

1. Add the composite index here and to `firestore.indexes.json`.
2. Deploy indexes and wait for the build to finish.
3. Then ship the code.

Doing it in the other order means the first person to open that screen sees an
error, and on a clinical screen that reads as data loss.
