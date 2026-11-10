# Smart Healthcare Access Platform (SHAP)
## Healthcare Access and Real-Time Emergency Coordination Web Application

SHAP is a centralized healthcare access, specialist discovery, and real-time emergency coordination platform built with a **Hybrid Client–Server + Layered Server Architecture** (Presentation, Business Logic, Data Access, and Database layers).

The platform reproduces the UI design from the provided Figma screens and implements all business rules, including parallel Emergency Beep broadcasts, nearest suitable facility matching, destination-based temporary resource reservations, QR doctor presence, and double-booking concurrency prevention.

---

### Core Business Rules Enforced

1. **Nearest Suitable Facility (Not Just Nearest Hospital):** Emergency matching evaluates capability, active physician presence, available critical care resources (ICU beds, ER bays, ventilators), and travel time.
2. **Parallel Emergency Beep Broadcast:** Alerts all matching participating trauma centers simultaneously via WebSocket. No sequential hospital calling.
3. **No Automatic Bulk Reservations:** Resources are **never** reserved at every hospital that accepts. Only after destination selection and final confirmation is a resource temporarily reserved.
4. **Temporary Hold & Expiry:** Temporary reservations carry an automatic hold timer (default 15 minutes). If the patient fails to arrive, the hold expires and the resource is atomically released.
5. **Doctor Presence vs. Availability:** Physical presence (verified via QR check-in on-site) is kept strictly distinct from appointment and emergency availability. Schedule is not treated as proof of physical presence.
6. **Verified Practitioners:** Only approved doctors with validated licenses appear in public search.

---

### Demo Test Credentials

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@shap.com` | `password123` | Doctor & hospital approvals, emergency audit |
| **Patient** | `patient@shap.com` | `password123` | Alex Mercer (Connaught Place) |
| **Doctor (Cardiology)** | `sarah.jenkins@shap.com` | `password123` | Dr. Sarah Jenkins (DOC-10024) |
| **Doctor (Emergency Med)** | `marcus.chen@shap.com` | `password123` | Dr. Marcus Chen (DOC-20412) |
| **Hospital (Apex Metro)** | `apex@hospital.com` | `password123` | Level 1 Trauma Center, 14 ICU beds, 11 ER bays |
| **Hospital (St. Jude)** | `stjude@hospital.com` | `password123` | Emergency Center, 7 ICU beds, 14 ER bays |

*(Fast 1-click login buttons are also provided on `/login`)*

---

### Architecture & Tech Stack

- **Client:** React (Vite), Tailwind CSS, React Router v6, Axios, Leaflet, React Leaflet, Lucide Icons, Socket.IO Client.
- **Server:** Node.js, Express.js (Layered Architecture: Controllers $\to$ Services $\to$ Repositories $\to$ Mongoose Models).
- **Authentication:** JWT with role-based middleware (`patient`, `doctor`, `organization`, `admin`).
- **Database:** MongoDB & Mongoose. Includes zero-configuration `MongoMemoryServer` fallback for instant offline development if an external MongoDB is not running.
- **Real-Time Communication:** Socket.IO with rooms (`emergency:<id>`, `org:<orgId>`).
- **Automated Testing:** Jest & Supertest.

---

### Quick Start (Local Development)

#### 1. Start Backend Server
```bash
cd server
npm start
```
*Note: The server will automatically connect to MongoDB or start the in-memory engine and seed the demonstration database automatically.*

#### 2. Start Frontend Client
In a second terminal:
```bash
cd client
npm run dev
```
Open **`http://localhost:5173`** in your browser.

#### 3. Run Automated Tests
```bash
cd server
npm test
```

---

### Docker Deployment
Run the full stack with MongoDB container:
```bash
docker-compose up --build
```
Client runs on `http://localhost:5173`, Backend runs on `http://localhost:5000`.

---

### REST API Endpoints Overview

#### Auth
- `POST /api/auth/register` - Register Patient, Doctor, or Organization
- `POST /api/auth/login` - Authenticate and receive JWT
- `GET /api/auth/me` - Authenticated profile

#### Doctors & Presence
- `GET /api/doctors` - Public search for verified doctors
- `GET /api/doctors/profile/:id` - Doctor details and affiliations
- `GET /api/doctors/me` - Doctor portal profile
- `GET /api/doctors/qr-credential` - Secure QR credential for verified doctor
- `POST /api/doctors/presence/check-in` - QR check-in at organization
- `POST /api/doctors/presence/check-out` - Exit check-out
- `PUT /api/doctors/availability` - Toggle appointment and emergency duty availability
- `GET /api/doctors/presence/history` - Presence log

#### Appointments
- `GET /api/appointments/slots/:doctorId?date=YYYY-MM-DD` - Available slots
- `POST /api/appointments/book` - Reserve slot with double-booking concurrency check
- `GET /api/appointments/my` - Patient appointment passes & QR tokens
- `PUT /api/appointments/:id/reschedule` - Reschedule appointment slot
- `PUT /api/appointments/:id/cancel` - Cancel appointment

#### Emergency & Emergency Beep
- `POST /api/emergency/beep` - Activate parallel broadcast
- `GET /api/emergency/:id` - Emergency request details & live telemetry
- `POST /api/emergency/:id/respond` - Hospital responds ACCEPT or DECLINE
- `POST /api/emergency/:id/select-destination` - Patient selects destination hospital
- `POST /api/emergency/:id/confirm-reservation` - Organization confirms and locks 1x bed hold
- `POST /api/emergency/:id/en-route` - Patient transitions to en-route
- `POST /api/emergency/:id/arrived` - Hospital marks arrival & allocates bed
- `POST /api/emergency/:id/cancel` - Cancel emergency and release reserved resource

#### Administrator
- `GET /api/admin/stats` - System overview metrics
- `GET /api/admin/doctors/pending` - Doctor verification queue
- `POST /api/admin/doctors/:id/approve` - Approve doctor & assign Unique ID
- `POST /api/admin/doctors/:id/reject` - Reject doctor submission
- `GET /api/admin/organizations/pending` - Organization verification queue
- `POST /api/admin/organizations/:id/approve` - Approve hospital

