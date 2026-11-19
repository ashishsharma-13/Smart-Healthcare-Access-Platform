# Smart Healthcare Access Platform (SHAP)

> **Centralized Healthcare Discovery, Specialist Allocation, and Real-Time Emergency Coordination Platform**

SHAP is an enterprise-grade healthcare access and emergency dispatch platform engineered with a **Hybrid Client–Server + Layered Server Architecture** (Presentation, Business Logic, Data Access, and Database layers).

The platform replaces fragmented phone calls and blind hospital routing with intelligent geospatial emergency dispatch, parallel WebSocket notifications, single-destination temporary bed holds, QR-verified physician presence, and strict double-booking concurrency prevention.

---

## Table of Contents

- [Core Business Rules Enforced](#core-business-rules-enforced)
- [System Architecture](#system-architecture)
- [Module Directory (Modules 1–19)](#module-directory-modules-119)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Demo Test Credentials](#demo-test-credentials)
- [Quick Start Guide](#quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Standard Local Setup](#standard-local-setup)
  - [Root Package Helper Scripts](#root-package-helper-scripts)
  - [Database Seeding Options](#database-seeding-options)
  - [Docker Compose Deployment](#docker-compose-deployment)
- [Automated Testing Suite](#automated-testing-suite)
- [REST API Reference](#rest-api-reference)
- [Emergency Fallback & Indian Healthcare Infrastructure](#emergency-fallback--indian-healthcare-infrastructure)
- [Security & Compliance](#security--compliance)

---

## Core Business Rules Enforced

1. **Nearest Suitable Facility (Not Just Nearest Hospital):**
   Emergency matching evaluates capability, active physician presence, available critical care resources (ICU beds, ER bays, ventilators), and travel time. A facility without verified on-duty specialists or capacity is never prioritized merely due to physical proximity.
2. **Parallel Emergency Beep Broadcast:**
   Alerts all qualified participating trauma centers simultaneously via WebSocket rooms (`org:<orgId>`). Sequential calling and manual hospital dispatch delays are eliminated.
3. **No Automatic Bulk Reservations:**
   Resources are **never** locked at every facility that responds `ACCEPT`. Only after patient or dispatcher destination selection and final confirmation is a single resource temporarily locked.
4. **15-Minute Temporary Hold & Expiry:**
   Temporary reservations carry an automatic hold countdown timer (default 15 minutes). If the patient fails to arrive or cancels, the hold expires and the resource is atomically returned to available capacity.
5. **Doctor Presence vs. Availability Strict Distinction:**
   Physical presence (verified via QR check-in on-site) is kept strictly distinct from appointment and emergency availability. A published schedule is never treated as proof of physical presence.
6. **Verified Medical Practitioners & Hospitals:**
   Only verified doctors with validated State Medical Council registrations and approved hospital facilities appear in patient search and emergency matching.
7. **Emergency Fallback & Search Expansion:**
   When no participating hospital can accept within the initial radius, the platform initiates a 5-tier search expansion (5 km $\to$ 10 km $\to$ 20 km $\to$ 40 km $\to$ 80 km) alongside immediate routing to government/public apex trauma institutions and emergency dispatch (108 / 112 / 102).
8. **Patient Consent & Emergency Data Minimization:**
   During emergency dispatch, only critical life-saving clinical information (blood group, allergies, active conditions, medications, emergency contacts) is attached to the destination handoff snapshot.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│  React 18 + Vite | Tailwind CSS | React Router v6 | Leaflet Maps      │
│  Patient Portal  | Doctor Portal   | Hospital Desk  | Admin Console   │
└───────────────────▲──────────────────────────────────▲─────────────────┘
                    │ REST API (Axios + JWT)           │ WebSocket (Socket.IO)
┌───────────────────▼──────────────────────────────────▼─────────────────┐
│                        APPLICATION LAYER (Express.js)                  │
│  Controllers  ──>  Business Logic Services  ──>  Repositories         │
│  - Auth & RBAC     - Emergency Matcher       - Fallback Recovery       │
│  - QR Presence     - Telemetry Tracking      - Concurrency Guard       │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │ Mongoose ODM
┌──────────────────────────────────────▼─────────────────────────────────┐
│                        DATA PERSISTENCE LAYER                          │
│  MongoDB / MongoMemoryServer (Zero-Config Development Fallback)       │
│  Collections: Users, Doctors, Organizations, Resources, Requests...    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Module Directory (Modules 1–19)

| Module | Title | Primary Capabilities |
| :--- | :--- | :--- |
| **Module 1** | **System Foundation & Security** | JWT authentication, RBAC (`patient`, `doctor`, `organization`, `admin`), password hashing, secure cookie & bearer auth. |
| **Module 2** | **Doctor Registration & Licensure** | Medical council verification, qualification vetting, practice history, biometric/avatar credentials. |
| **Module 3** | **Organization & Infrastructure** | Hospital accreditation, operational departments, trauma capabilities, ICU/ER bed capacity catalog. |
| **Module 4** | **Doctor-Organization Affiliations** | Primary & visiting appointments, department assignment, shift schedules, multi-facility affiliations. |
| **Module 5** | **Doctor Schedule Management** | Shift recurrence, consultation slot duration, buffer periods, dynamic slot generator. |
| **Module 6** | **Healthcare Discovery & Booking** | Search by specialization/distance, atomic slot booking, double-booking prevention, digital appointment passes. |
| **Module 7** | **QR Physical Presence Tracking** | Dynamic encrypted QR check-in/out, GPS geofencing, audit logs, presence vs. schedule separation. |
| **Module 8** | **Availability Synchronization** | Real-time duty toggling (`availableForEmergency`, `consultationActive`), live presence synchronization. |
| **Module 9** | **Emergency Request Creation** | GPS auto-detection, OpenStreetMap Nominatim reverse geocoding, manual Indian city selection, emergency triage. |
| **Module 10** | **Intelligent Facility Matching** | Multi-factor matching score (distance, travel time, available ICU/ER bays, active trauma surgeon presence). |
| **Module 11** | **Parallel Emergency Beep** | Multi-hospital WebSocket broadcast (`org:<orgId>`), synchronized response countdown timer, accept/decline triage. |
| **Module 12** | **Destination & Bed Hold Lock** | Single-center selection, atomic temporary reservation lock, 15-minute hold timer, zero-bulk-reservation rule. |
| **Module 13** | **En-Route Tracking & Telemetry** | Patient location streaming, dynamic ETA calculation, Leaflet route rendering, hospital emergency desk view. |
| **Module 14** | **Patient Arrival & Resource Allocation** | Arrival verification, conversion from temporary hold to occupied bed, case closure, clinical handoff. |
| **Module 15** | **Emergency Fallback & Recovery** | 5-tier search expansion (5–80 km), destination recovery, public government trauma directory, 108/112 helpline cards. |
| **Module 16** | **Administrative Governance & Audit** | Doctor/hospital approval queues, system health analytics, security audit trails, platform configuration toggles. |
| **Module 17** | **Advanced Healthcare Search** | Multi-filter discovery (experience, qualification, Indian cities, rating, organization, distance radius). |
| **Module 18** | **Patient Profile & Medical History** | Demographic data, emergency contacts, blood group, medical conditions, allergies, consent management. |
| **Module 19** | **System Integration & QA** | End-to-end stabilization, WCAG 2.2 AA contrast compliance, automated regression suite, responsive design. |

---

## Technology Stack

- **Frontend:**
  - **Framework:** React 18 with Vite
  - **Styling:** Tailwind CSS (Custom healthcare design tokens & WCAG 2.2 AA high contrast)
  - **Icons:** Lucide React
  - **Maps & Geolocation:** Leaflet, React-Leaflet, OpenStreetMap Tile Service
  - **Networking:** Axios with central interceptors, Socket.IO Client
  - **QR Scanning:** `html5-qrcode` & HTML Canvas QR generation
- **Backend:**
  - **Runtime:** Node.js (ES Modules, `type: "module"`)
  - **Web Framework:** Express.js 4
  - **Security:** Helmet, CORS, Express Rate Limit, BCrypt.js, JsonWebToken
  - **Real-Time Communication:** Socket.IO with dynamic room management
- **Database:**
  - **Primary Engine:** MongoDB via Mongoose ODM
  - **Development Engine:** `mongodb-memory-server` (starts automatically if local MongoDB is not running)
- **Testing:**
  - **Framework:** Jest with `--experimental-vm-modules`
  - **HTTP Assertions:** Supertest

---

## Project Directory Structure

```
Smart-Healthcare-Access-Platform/
├── client/                               # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/                   # Reusable UI & Layout Components
│   │   │   ├── common/                   # BrandMark, LeafletMap, Modal, Navbar
│   │   │   ├── graphics/                 # HeroClinicalCommand, DoctorAvatar
│   │   │   └── ui/                       # Button, Badge, Card, Toast, Table
│   │   ├── context/                      # AuthContext, LocationContext, SocketContext
│   │   ├── pages/                        # Role-Specific Portals & Workflows
│   │   │   ├── admin/                    # AdminDashboard, AuditLogs, SystemHealth
│   │   │   ├── doctor/                   # DoctorDashboard, PresencePage, SchedulePage
│   │   │   ├── organization/             # OrgDashboard, ResourcesPage, QrDeskPage
│   │   │   ├── patient/                  # HealthcareSearch, Appointments, Emergency Pages
│   │   │   │   ├── EmergencyActivatePage.jsx
│   │   │   │   ├── EmergencyBroadcastPage.jsx
│   │   │   │   ├── EmergencyTrackingPage.jsx
│   │   │   │   ├── EmergencyFallbackPage.jsx
│   │   │   │   └── PatientProfilePage.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   └── LoginPage.jsx
│   │   ├── services/                     # Central Axios API client
│   │   └── utils/                        # geoUtils.js (Haversine distance, travel time)
│   ├── package.json
│   └── vite.config.js
├── server/                               # Node.js + Express Backend Application
│   ├── src/
│   │   ├── config/                       # db.js (MongoDB + MongoMemoryServer fallback)
│   │   ├── controllers/                  # Auth, Doctor, Emergency, Fallback, Org
│   │   ├── middleware/                   # authMiddleware, rbac, errorHandler
│   │   ├── models/                       # User, Doctor, Organization, Resource, etc.
│   │   ├── repositories/                 # Data access repositories (Haversine queries)
│   │   ├── routes/                       # Express route routers (/api/*)
│   │   ├── services/                     # Core business logic services
│   │   │   ├── EmergencyBeepService.js
│   │   │   ├── EmergencyMatchingService.js
│   │   │   ├── ExternalFacilityDirectoryService.js
│   │   │   └── DestinationRecoveryService.js
│   │   ├── utils/                        # Seed data & Indian hospital coordinates
│   │   └── server.js                     # Express app & HTTP/Socket.IO bootstrap
│   ├── tests/                            # Jest integration test suites (Modules 1–18)
│   └── package.json
├── docker-compose.yml                    # Multi-container deployment specification
├── package.json                          # Root package with helper scripts
└── README.md                             # Project documentation
```

---

## Demo Test Credentials

All demo accounts share the standard password: **`password123`** *(or `ShapDemo@2026` for multi-city demo accounts)*.

| Role | Name | Email | Password | Access & Features |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | SHAP System Administrator | `admin@shap.com` | `password123` | Doctor/Hospital approvals, system audit logs, metrics |
| **Patient** | Aarav Mehta | `patient@shap.com` | `password123` | Emergency Beep, search, booking, health profile |
| **Doctor (Cardiology)** | Dr. Sneha Sen | `sarah.jenkins@shap.com` | `password123` | QR presence check-in, appointments, emergency duty |
| **Doctor (Emergency Med)** | Dr. Vikram Malhotra | `marcus.chen@shap.com` | `password123` | Trauma bay triage, QR check-in, emergency alerts |
| **Hospital (Apex Metro)** | Apex Metro Hospital Staff | `apex@hospital.com` | `password123` | Level-1 Trauma Desk, live resource hold & bed allocation |
| **Hospital (St. Jude)** | St. Jude Operations | `stjude@hospital.com` | `password123` | Emergency Center, QR check-in scanner desk |
| **Clinic (City Care)** | City Care Clinic | `citycare@clinic.com` | `password123` | Outpatient clinic, appointment schedule management |

*(Quick 1-click login buttons for all roles are provided directly on the `/login` page).*

---

## Quick Start Guide

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Git**
- *(Optional)* Docker and Docker Compose

---

### Standard Local Setup

#### Step 1: Clone the repository
```bash
git clone https://github.com/your-org/Smart-Healthcare-Access-Platform.git
cd Smart-Healthcare-Access-Platform
```

#### Step 2: Install dependencies
Install dependencies for both root, backend, and frontend:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Return to root
cd ..
```

#### Step 3: Configure Environment Variables (Optional)
The backend operates out-of-the-box with built-in zero-config fallbacks (including `MongoMemoryServer` and pre-generated JWT secrets).

If connecting to a standalone MongoDB instance:
Create `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shap_healthcare
JWT_SECRET=shap_production_secure_jwt_secret_key_2026
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

#### Step 4: Run the Application
In **Terminal 1** (Backend):
```bash
cd server
npm start
```
*The server starts on port `5000`. If an external MongoDB is not reachable, it automatically initializes an in-memory database and seeds core demo data.*

In **Terminal 2** (Frontend):
```bash
cd client
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

### Root Package Helper Scripts

You can also run commands directly from the root repository directory:

```bash
# Start backend server
npm run server

# Start backend in development mode with nodemon
npm run server:dev

# Start client development server
npm run client

# Build frontend client for production
npm run build:client

# Run backend test suite
npm run test

# Run database seed
npm run seed
```

---

### Database Seeding Options

The project includes specialized seed scripts tailored for different regions:

```bash
# Seed standard core demo accounts (Patients, Doctors, Hospitals, Admins)
npm run seed --prefix server

# Seed 10 accredited Hyderabad hospitals around University of Hyderabad / Gachibowli
npm run seed:hyderabad --prefix server

# Seed multi-city healthcare network (Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata)
npm run seed:multi-city --prefix server

# Seed demo Indian accounts with standard passwords
npm run seed:demo-accounts --prefix server
```

---

### Docker Compose Deployment

Run the complete multi-container stack (Client + Server + MongoDB):
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- MongoDB: `mongodb://localhost:27017`

---

## Automated Testing Suite

The platform includes a comprehensive automated test suite covering all 18 functional modules, security validations, and edge cases.

To run the complete test suite:
```bash
cd server
npm test
```

To run a specific module test suite:
```bash
# Module 1: Auth & RBAC
npm test -- tests/authModule1.test.js --prefix server

# Module 4: Doctor Affiliations
npm test -- tests/doctorAffiliationModule4.test.js --prefix server

# Module 6: Appointments & Double-Booking Prevention
npm test -- tests/appointmentManagementModule6.test.js --prefix server

# Module 7: QR Doctor Presence
npm test -- tests/doctorPresenceModule7.test.js --prefix server

# Module 10: Emergency Beep & Parallel Broadcast
npm test -- tests/emergencyBeepModule10.test.js --prefix server

# Module 11: Destination Reservation & Bed Hold
npm test -- tests/destinationReservationModule11.test.js --prefix server

# Module 15: Emergency Fallback & Search Expansion
npm test -- tests/emergencyFallbackModule15.test.js --prefix server

# Module 17: Healthcare Search & Discovery
npm test -- tests/healthcareSearchModule17.test.js --prefix server

# Module 18: Patient Profile & Information Management
npm test -- tests/patientProfileModule18.test.js --prefix server
```

---

## REST API Reference

### Authentication & Profiles (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new Patient, Doctor, or Healthcare Organization |
| `POST` | `/api/auth/login` | Authenticate with email/phone and obtain JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & permissions |
| `POST` | `/api/auth/forgot-password` | Request 6-digit password reset OTP |
| `POST` | `/api/auth/reset-password` | Reset password using verified OTP |

### Doctors & Presence (`/api/doctors`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/doctors` | Search verified doctors with multi-filter query params |
| `GET` | `/api/doctors/profile/:id` | Get public doctor profile, qualifications & affiliations |
| `GET` | `/api/doctors/me` | Doctor portal authenticated profile |
| `GET` | `/api/doctors/qr-credential` | Generate tamper-proof doctor QR check-in credential |
| `POST` | `/api/doctors/presence/check-in` | On-site hospital QR scan check-in |
| `POST` | `/api/doctors/presence/check-out` | On-site hospital exit check-out |
| `PUT` | `/api/doctors/availability` | Toggle appointment availability and emergency duty status |
| `GET` | `/api/doctors/presence/history` | Doctor physical presence history log |

### Appointments (`/api/appointments`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/appointments/slots/:doctorId` | Available time slots for specified doctor and date |
| `POST` | `/api/appointments/book` | Reserve slot with atomic double-booking prevention |
| `GET` | `/api/appointments/my` | Patient appointment passes and digital verification tokens |
| `PUT` | `/api/appointments/:id/reschedule` | Reschedule existing appointment slot |
| `PUT` | `/api/appointments/:id/cancel` | Cancel appointment and free time slot |

### Emergency Dispatch & Coordination (`/api/emergency`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/emergency/beep` | Activate emergency request & parallel hospital broadcast |
| `GET` | `/api/emergency/:id` | Live emergency request status, hospital responses & telemetry |
| `POST` | `/api/emergency/:id/respond` | Hospital desk responds `ACCEPT` or `DECLINE` |
| `POST` | `/api/emergency/:id/select-destination` | Patient selects target facility from accepting hospitals |
| `POST` | `/api/emergency/:id/confirm-reservation` | Locks 1x temporary resource hold (15-minute countdown) |
| `POST` | `/api/emergency/:id/en-route` | Patient transitions to en-route navigation mode |
| `POST` | `/api/emergency/:id/telemetry` | Patient streams real-time GPS telemetry updates |
| `POST` | `/api/emergency/:id/arrived` | Hospital verifies arrival and converts hold to admitted bed |
| `POST` | `/api/emergency/:id/cancel` | Cancel emergency and release reserved hospital resources |
| `GET` | `/api/emergency/external-facilities` | Discover public trauma centers near GPS coordinates |

### Emergency Fallback & Recovery (`/api/emergency/requests/:id`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `.../fallback-options` | Fetch fallback candidates & external public trauma centers |
| `POST` | `.../expand-search` | Expand geographic search radius to next tier (5–80 km) |
| `POST` | `.../retry-matching` | Re-run intelligent matching engine with updated criteria |
| `GET` | `.../recovery-status` | Active destination recovery session status |
| `POST` | `.../change-destination` | Seamlessly switch destination during en-route recovery |

### Patient Health Profile (`/api/patient/profile`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/patient/profile` | Retrieve comprehensive medical profile & emergency contacts |
| `PUT` | `/api/patient/profile` | Update demographics, blood group, and contact details |
| `POST` | `/api/patient/profile/contacts` | Add primary/secondary emergency contact |
| `POST` | `/api/patient/profile/allergies` | Add allergen record and severity level |
| `POST` | `/api/patient/profile/conditions` | Add diagnosed medical conditions |
| `POST` | `/api/patient/profile/medications` | Add active daily prescriptions |

### Administration & Governance (`/api/admin`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | System-wide operational metrics and capacity ratios |
| `GET` | `/api/admin/doctors/pending` | Doctor medical license verification review queue |
| `POST` | `/api/admin/doctors/:id/approve` | Approve doctor license & assign `doctorUniqueId` |
| `POST` | `/api/admin/doctors/:id/reject` | Reject doctor registration with audit note |
| `GET` | `/api/admin/organizations/pending` | Hospital accreditation verification queue |
| `POST` | `/api/admin/organizations/:id/approve` | Approve hospital facility |
| `GET` | `/api/admin/audit-logs` | Tamper-evident security and dispatch audit logs |

---

## Emergency Fallback & Indian Healthcare Infrastructure

The platform incorporates comprehensive localized healthcare directory data across major Indian metropolitan areas:

### 1. Dual-Mode Geolocation Engine
- **Live GPS Detection:** Utilizes the HTML5 Geolocation API with high-accuracy mode, reverse-geocoded in real time via OpenStreetMap Nominatim.
- **Manual City Search:** Seamlessly query doctors and hospitals across **Hyderabad**, **New Delhi**, **Mumbai**, **Bengaluru**, **Chennai**, and **Kolkata**.

### 2. Multi-Tier Fallback Structure
When immediate private partner hospitals have no unreserved capacity, the fallback page (`/emergency/fallback`) activates:
- **Tier 1 (5 km):** Immediate Urban Primary Health Centers (UPHCs), Primary Health Centers (PHCs), and local Area Hospitals (e.g., UPHC Gachibowli, UPHC Serilingampally, Govt Area Hospital Kondapur).
- **Tier 2 (10 km):** Regional public sector undertaking (PSU) and ESIC hospitals (e.g., BHEL General Hospital, ESI Hospital RC Puram).
- **Tier 3 (20 km):** Apex tertiary medical institutes (e.g., NIMS Hyderabad, Osmania General Hospital, Gandhi Hospital, AIIMS Trauma Center New Delhi, Safdarjung Hospital).
- **National Emergency Desks:** 1-tap direct emergency phone routing:
  - **108:** National Emergency Medical & Ambulance Dispatch
  - **112:** Unified Emergency Police, Fire & Disaster Helpline
  - **102:** Maternal and Neonatal Rapid Ambulance Transport

---

## Security & Compliance

- **Role-Based Access Control (RBAC):** Strict per-route role guards prevent privilege escalation between patients, doctors, hospitals, and platform administrators.
- **Resource Lock Concurrency Guard:** Database transactions and atomic conditional updates (`{ availableCapacity: { $gt: 0 } }`) prevent race conditions, overbooking, and duplicate resource allocations.
- **Tamper-Evident QR Presence:** Doctor QR credentials contain signed cryptographic tokens verified against hospital GPS geofences and physical premises check-in records.
- **WCAG 2.2 AA Accessibility:** User interface incorporates compliant color contrast ratios across light and dark modes, explicit alert boundaries, and high-visibility emergency dispatch controls.

---

## License

This project is licensed under the MIT License.
