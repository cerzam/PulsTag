# PulsTag — Sistema de Identificación de Pacientes por NFC

A hospital patient NFC bracelet system. Each patient gets a UUID-based URL written to an NFC tag on their bracelet. Scanning the tag opens a mobile-friendly medical ID page — no app required.

---

## Requirements

- Node.js 18+
- PostgreSQL 13+ (with `pgcrypto` or built-in `gen_random_uuid()` support)

---

## Setup

### 1. Clone and install dependencies

```bash
cd PulsTag
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/pulstag
JWT_SECRET=replace_with_a_long_random_string_at_least_32_chars
```

### 3. Create the database

```bash
psql -U your_user -c "CREATE DATABASE pulstag;"
```

The tables are created automatically on first run. No migration files needed.

### 4. Start the server

```bash
npm start
```

On first run the server will:
- Create the `patients` and `admins` tables
- Seed 5 example patients
- Create an admin account: **admin / admin123**

---

## URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000/` | Public landing page |
| `http://localhost:3000/admin` | Admin panel (login required) |
| `http://localhost:3000/p/:uuid` | Patient medical ID page (NFC destination) |

---

## API Reference

All `/admin/*` endpoints (except `/admin/login`) require a `Bearer` JWT token in the `Authorization` header.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admin/login` | No | Returns JWT token |
| `GET` | `/admin/patients` | Yes | List all patients |
| `POST` | `/admin/patients` | Yes | Create patient (UUID auto-generated) |
| `PUT` | `/admin/patients/:id` | Yes | Update patient |
| `DELETE` | `/admin/patients/:id` | Yes | Delete patient |
| `GET` | `/p/:uuid` | No | Patient public medical ID page |

### Login

```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## NFC Workflow

1. Create a patient in the admin panel
2. After creation, copy the URL displayed (e.g. `http://your-server/p/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
3. Use an NFC writing app (NFC Tools, NXP TagWriter, etc.) to write that URL to an NFC tag
4. Place the tag on the patient's bracelet
5. Any smartphone that scans the bracelet will open the patient's medical ID instantly

---

## Default credentials

```
Username: admin
Password: admin123
```

**Change the password before deploying to production** — run `UPDATE admins SET password_hash = ... WHERE username = 'admin';` with a bcrypt hash, or add a change-password endpoint.

---

## Development

```bash
npm run dev   # starts with nodemon for auto-reload
```

---

## Project structure

```
PulsTag/
├── backend/
│   ├── server.js              # Entry point, DB init, route wiring
│   ├── db.js                  # PostgreSQL pool
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   └── routes/
│       ├── public.js          # GET /p/:uuid — server-rendered patient page
│       └── admin.js           # CRUD + login
├── frontend/
│   ├── public/
│   │   └── index.html         # Public landing page
│   └── admin/
│       └── index.html         # Admin SPA (login + patient management)
├── .env.example
├── package.json
└── README.md
```
