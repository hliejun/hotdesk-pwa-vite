# Backend ER Diagram (Proposed)

This project currently uses an in-browser DB persisted to `localStorage` (`src/api/db.ts`).
This ERD is a proposed backend data model that matches the domain types and behaviors used
by the app.

```mermaid
erDiagram
  USER {
    string id PK
    string name
    string role "EMPLOYEE|ADMIN"
  }

  DESK {
    string id PK
    string label
    string zone
    string status "ACTIVE|INACTIVE"
    string[] amenities
  }

  BOOKING {
    string id PK
    string deskId FK
    string userId FK
    string actorUserId "nullable"
    string date "YYYY-MM-DD"
    string slot "MORNING|NOON|AFTERNOON|EVENING"
    string status "ACTIVE|CANCELLED"
    datetime createdAt
    datetime cancelledAt "nullable"
    string details "nullable"
  }

  FAULT {
    string id PK
    string deskId FK
    string reporterUserId FK
    string bookingId "nullable"
    string status "OPEN|RESOLVED"
    string description
    datetime createdAt
    datetime resolvedAt "nullable"
    string resolvedByUserId "nullable"
  }

  APP_CONFIG {
    int maxBookingsPerDay
    string[] zones
  }

  USER ||--o{ BOOKING : "books"
  DESK ||--o{ BOOKING : "is booked"

  USER ||--o{ FAULT : "reports"
  DESK ||--o{ FAULT : "has"

  BOOKING o|--o{ FAULT : "relates to"

  USER o|--o{ BOOKING : "acts for"
  USER o|--o{ FAULT : "resolves"
```

## Notes / Constraints

- `BOOKING.date` is a calendar day and `BOOKING.slot` is a time-of-day bucket; together they form the "time" uniqueness.
- Enforce uniqueness for ACTIVE bookings by desk/time:
  - unique index: `(deskId, date, slot)` where `status = 'ACTIVE'`.
- Enforce per-user daily limit (config-driven):
  - count of ACTIVE bookings where `(userId, date)` must be `<= APP_CONFIG.maxBookingsPerDay`.
- A `FAULT` may optionally reference the booking that discovered it (`bookingId`).
- `actorUserId` enables "admin books for someone else" auditing.
- `APP_CONFIG` is conceptually a singleton row/document.
