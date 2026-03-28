# Bhoomi Sethu

A full-stack real estate platform that connects land owners with developers in India. Land owners list their parcels, upload KYL (Know Your Landlord) documents, and receive a cumulative score from the admin after review. Builders browse verified listings and initiate deals through a managed deal room.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running the Backend](#running-the-backend)
  - [Running the Frontend](#running-the-frontend)
- [User Roles & Flow](#user-roles--flow)
- [API Overview](#api-overview)
- [Document Upload Rules](#document-upload-rules)
- [Admin Scoring](#admin-scoring)

---

## Features

- **Google OAuth** sign-in — no username/password required
- **Three roles**: Land Owner, Builder, Admin
- **Admin-controlled approval** — new accounts go live only after an admin approves them
- **Land owner KYL profile documents** — per-category upload with admin scoring and a cumulative average score
- **Land listings** — two-step flow: enter parcel details, then upload listing documents one category at a time
- **Listing document scoring** — admin can open each file, assign a score (0–100), and add a note; a cumulative listing score is shown to the land owner
- **Auto-submit** — listings automatically move from `draft` → `submitted` once all required document categories are covered
- **Admin dashboard** — unified review queue for both KYL profile documents and listing documents
- **Deal Room** — placeholder for builder–owner deal management (in progress)
- Responsive UI with mobile navigation drawer

---

## Tech Stack

| Layer         | Technology                                                     |
| ------------- | -------------------------------------------------------------- |
| Frontend      | React 19, TypeScript, Vite 8, React Router v7                  |
| Auth (client) | `@react-oauth/google`                                          |
| Backend       | Node.js, Express 5, TypeScript                                 |
| Database      | MongoDB via Mongoose 9                                         |
| Auth (server) | Google OAuth 2.0 (`google-auth-library`), JWT (`jsonwebtoken`) |
| File uploads  | Multer 2 (disk storage → `backend/uploads/`)                   |
| Security      | Helmet, CORS                                                   |

---

## Project Structure

```
Bhumisethu/
├── backend/
│   ├── src/
│   │   ├── config/          # env, multer configs, db connection
│   │   ├── data/            # documents.ts — canonical KYL document catalog
│   │   ├── middleware/      # requireAuth, requireRole, requireApproved ...
│   │   ├── models/          # Mongoose models (User, LandListing, ListingDocument, LandOwnerDocument)
│   │   ├── routes/          # auth, dashboard, land-documents, listing routes
│   │   ├── lib/             # token helpers, user auth utilities
│   │   └── server.ts        # entry point
│   ├── uploads/             # uploaded files (gitignored)
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/      # MainNav, AdminDocumentReviewSection, AdminListingReviewSection,
    │   │                    #   ListingDocumentsChecklist, LandOwnerDocumentsSection ...
    │   ├── context/         # AuthContext (global auth state)
    │   ├── lib/             # authApi.ts, listingsApi.ts, landDocumentsApi.ts
    │   ├── pages/           # HomePage, DashboardPage, AddListingPage, ListingsPage ...
    │   ├── styles/          # bhoomi.css (global styles)
    │   └── types/           # auth.ts (shared TypeScript types)
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A running MongoDB instance (local or Atlas)
- A Google Cloud project with OAuth 2.0 credentials (Client ID)

### Environment Variables

Create a `.env` file inside `backend/`:

```env
PORT=8080
FRONTEND_ORIGIN=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/bhumisethu
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
JWT_SECRET=a-long-random-secret-string
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

> The Google Client ID must be the same in both files.

### Running the Backend

```bash
cd backend
npm install
npm run dev        # ts-node-dev with hot reload on port 8080
```

### Running the Frontend

```bash
cd frontend
bun install        # or npm install
bun run dev        # or npm run dev — Vite dev server on port 5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## User Roles & Flow

### First-time sign-in

1. Click **Continue with Google** in the navbar.
2. Google redirects back — a JWT is issued and stored in `localStorage`.
3. The app redirects to **Complete Registration** where the user picks their role (Land Owner or Builder), enters Aadhaar, phone, address, and submits.
4. The account sits in **pending approval** state until an admin approves it.

> **Admin accounts** are created directly in the database (set `role: "admin"` and `isApproved: true`). There is no admin signup flow by design.

### Land Owner flow

| Step | Action                                                                                                    |
| ---- | --------------------------------------------------------------------------------------------------------- |
| 1    | Sign in with Google → complete registration (select Land Owner role)                                      |
| 2    | Wait for admin approval (or proceed to add a listing immediately — drafts are allowed before approval)    |
| 3    | Dashboard → **+ Add New Listing** → fill parcel details → save                                            |
| 4    | Upload listing documents one category at a time (choose document type from the allowed list, attach file) |
| 5    | Once all required categories are uploaded, the listing auto-submits for admin review                      |
| 6    | Admin scores each document; cumulative score appears on the listing                                       |

### Builder flow

Builders can browse verified listings on the **Land Listings** page and initiate deals through the Deal Room (coming soon).

### Admin flow

| Action                               | Where                                             |
| ------------------------------------ | ------------------------------------------------- |
| Approve pending users                | Dashboard → pending users list (top of dashboard) |
| Review & score KYL profile documents | Dashboard → **Document review queue**             |
| Review & score listing documents     | Dashboard → **Listing document review**           |

---

## API Overview

All routes are prefixed with `/api`.

### Auth — `/api/auth`

| Method  | Path                            | Description                                           |
| ------- | ------------------------------- | ----------------------------------------------------- |
| `POST`  | `/google`                       | Exchange Google ID token for a JWT                    |
| `GET`   | `/me`                           | Get current user profile                              |
| `PATCH` | `/profile`                      | Complete registration (role, Aadhaar, phone, address) |
| `GET`   | `/admin/pending-users`          | Admin: list unapproved accounts                       |
| `PATCH` | `/admin/approve-user/:googleId` | Admin: approve an account                             |

### Land Documents (KYL profile) — `/api/land-documents`

| Method  | Path                     | Description                                          |
| ------- | ------------------------ | ---------------------------------------------------- |
| `GET`   | `/catalog`               | Public: full document catalog                        |
| `GET`   | `/my`                    | Land owner: my uploaded documents + cumulative score |
| `POST`  | `/upload`                | Land owner: upload a KYL profile document            |
| `GET`   | `/file/:submissionId`    | Owner or admin: stream a file                        |
| `GET`   | `/admin/pending`         | Admin: all documents pending review                  |
| `PATCH` | `/admin/submissions/:id` | Admin: approve/reject + score a document             |

### Listings — `/api/listings`

| Method  | Path                                  | Description                                      |
| ------- | ------------------------------------- | ------------------------------------------------ |
| `POST`  | `/`                                   | Land owner: create a listing (returns draft)     |
| `GET`   | `/mine`                               | Land owner: my listings with cumulative scores   |
| `GET`   | `/:listingId/documents`               | Land owner: document checklist for a listing     |
| `POST`  | `/:listingId/documents/upload`        | Land owner: upload one document (multipart form) |
| `GET`   | `/:listingId/documents/file/:docId`   | Land owner: stream a listing document            |
| `GET`   | `/admin/submitted`                    | Admin: all submitted/reviewed listings           |
| `GET`   | `/admin/:listingId/docs`              | Admin: all documents for a listing               |
| `GET`   | `/admin/:listingId/docs/file/:docId`  | Admin: stream a listing document                 |
| `PATCH` | `/admin/:listingId/docs/:docId/score` | Admin: score a document (0–100)                  |

---

## Document Upload Rules

- **Allowed formats**: PDF, JPEG, PNG, WebP, GIF
- **Max file size**: 15 MB per file
- **Storage**: all files are saved to `backend/uploads/` with a unique timestamped filename
- **One upload per category**: each document category (e.g. "Ownership & Title") requires exactly one file. If a category offers multiple document types (e.g. Sale Deed, Gift Deed, Partition Deed), the user selects which type they are uploading.
- **Replacing a file**: re-uploading a category replaces the previous file on disk and resets its admin score.

---

## Admin Scoring

Each uploaded listing document can receive an admin score between **0 and 100**.

- The admin opens the file in a new tab, reviews it, enters a score and an optional note, then clicks **Save score**.
- The **cumulative score** for the listing is the average of all scored documents, rounded to one decimal place.
- Once every uploaded document has been scored, the listing status changes from `submitted` → `reviewed`.
- The cumulative score is visible to the land owner on their dashboard and in the listing document checklist.

The same scoring logic applies to KYL profile documents, where the cumulative score reflects the owner's overall document quality across their profile.
