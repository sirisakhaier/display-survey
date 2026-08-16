# 📺 Display Survey

A production web application for gathering display unit counts across retail stores. Store staff select their store location, enter model quantities by category and brand, and submit the survey. Admins can view analytics dashboards, manage store/model dimensions, and export data.

---

## 🌐 Live Application

| Environment | URL |
|---|---|
| **Production** | Deployed on [Railway](https://railway.app) — auto-deploys on every GitHub push |
| **Survey (Staff)** | `/` — Main survey entry page |
| **Admin / Viewer** | `/login` — Admin dashboard |

---

## ✨ Features

### Staff Survey Flow
- 📍 Cascading store selection: **Customer → Region → Store**
- ⚠️ Warning if store already has submitted data (option to revise or continue)
- 👤 Name & phone number input (phone must start with `0`, exactly 10 digits)
- 📦 Model input organized by **Category → Brand → Model** hierarchy
- 📊 Live input summary table (updates as you type)
- ✅ Full review screen before final submission

### Admin Panel (`/login`)
- 📊 **Dashboard** — KPI cards, brand/category charts, customer progress table, top 10 stores
- 📋 **Entries** — All survey submissions with search, filter by customer/region/date, export CSV, delete
- 🗄️ **Dimension Manager** — Manage stores and models:
  - Toggle Active/Inactive individually or in bulk (by customer, region, brand, or category)
  - SubCategory filter is scoped to selected Category
  - Upload & Replace CSV to update store/model data
  - Download current dimension data as CSV
  - Audit log of all changes

### Access Roles

| Role | Username | Default Password | Access |
|---|---|---|---|
| Admin | `admin` | `admin1234` | Full access — edit, delete, upload, bulk update |
| Viewer | `viewer` | `viewer1234` | Read-only — view and download CSV only |

> ⚠️ **Change default passwords immediately after first login** via the database.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Charts | [Recharts](https://recharts.org) |
| Icons | [Lucide React](https://lucide.dev) |
| CSV Parsing | [PapaParse](https://www.papaparse.com) |
| Deployment | [Railway](https://railway.app) |
| Source Control | GitHub |

---

## 📁 Project Structure

```
display-survey/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Staff survey page (main flow)
│   │   ├── login/                # Admin login page
│   │   ├── admin/
│   │   │   ├── layout.tsx        # Admin sidebar navigation
│   │   │   ├── dashboard/        # Analytics dashboard
│   │   │   ├── entries/          # Survey submission history
│   │   │   └── dimensions/       # Store & Model management
│   │   └── api/
│   │       ├── auth/             # Login, logout, /me
│   │       ├── user/             # Survey APIs (stores, models, submit)
│   │       └── admin/            # Admin APIs (entries, dimensions, export)
│   └── lib/
│       ├── db.ts                 # SQLite connection (better-sqlite3)
│       └── auth.ts               # JWT authentication utilities
├── scripts/
│   └── seed.mjs                  # Database seeder (runs before build)
├── data/                         # SQLite database file (auto-created, git-ignored)
├── Dimension Store.csv           # Source data — store list
├── Dimension Model.csv           # Source data — product model list
└── package.json
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js** v18 or higher
- **npm** v9 or higher
- macOS / Linux / Windows (WSL recommended)

### 1. Clone the repository

```bash
git clone https://github.com/sirisakhaier/display-survey.git
cd display-survey
```

### 2. Install dependencies

```bash
npm install
```

### 3. Seed the database (first time only)

```bash
npm run seed
```

This reads `Dimension Store.csv` and `Dimension Model.csv` and creates the SQLite database in `data/survey.db`.

### 4. Start the development server

```bash
npm run dev
```

Open in browser:

| URL | Description |
|---|---|
| `http://localhost:3000` | Staff survey page |
| `http://localhost:3000/login` | Admin login |

**Login credentials:**
- Admin: `admin` / `admin1234`
- Viewer: `viewer` / `viewer1234`

---

## ☁️ Deploy to Railway (Step-by-Step)

Railway automatically builds and deploys on every GitHub push to `main`.

### Step 1 — Create a Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway to access your GitHub

### Step 2 — Create a New Project

1. Click **"New Project"** (top right)
2. Select **"Deploy from GitHub repo"**
3. If prompted, click **"Configure GitHub App"** and grant access to `sirisakhaier/display-survey`
4. Select the repo **`sirisakhaier/display-survey`**
5. Click **"Deploy Now"**

Railway will:
- Detect Node.js automatically
- Run `npm install` → `npm run build` → `npm run start`
- The build step runs the seeder and seeds the database

### Step 3 — Get a Public URL

After deployment succeeds (green ✅):

1. Click on the **display-survey** service card (the box on the canvas)
2. In the panel that opens on the right, click the **Settings** tab
3. Scroll down to the **Networking** section
4. Click **"Generate Domain"**
5. Copy your public URL e.g. `https://display-survey-production.up.railway.app`

### Step 4 — Share with Staff

- **Survey page**: `https://your-url.up.railway.app/`
- **Admin page**: `https://your-url.up.railway.app/login`

---

## 🔄 Auto-Deploy Workflow

Every push to the `main` branch on GitHub automatically triggers a new Railway deployment.

```
Edit code locally
       ↓
git add -A && git commit -m "your message"
       ↓
git push origin main
       ↓
Railway detects the push → Builds → Deploys
       ↓
Live in ~3 minutes ✅
```

To push updates:

```bash
git add -A
git commit -m "describe your change"
git push origin main
```

Check deployment status in: Railway Dashboard → **display-survey** service → **Deployments** tab.

---

## 🗄️ Database Management

The SQLite database is stored in `data/survey.db` on the Railway server (not in GitHub — it's git-ignored).

### Tables

| Table | Description |
|---|---|
| `stores` | All retail store locations |
| `models` | All product models with category/brand info |
| `survey_entries` | Submitted survey sessions (one per store visit) |
| `survey_items` | Individual model quantities per entry |
| `users` | Admin/viewer login accounts |
| `dimension_audit_log` | History of store/model status changes |

### Update Store or Model Data

**Option A — Via Admin Panel (Recommended, no technical skills needed)**

1. Login as `admin` → go to **Dimensions** tab
2. Click **"Upload & Replace"** button
3. Upload your new CSV file (same format as original)
4. Review the preview and confirm

**Option B — Replace CSV and Push to GitHub**

1. Replace `Dimension Store.csv` or `Dimension Model.csv` in the project folder
2. Push to GitHub — Railway rebuilds and re-seeds automatically

```bash
# Example: update store list
cp /path/to/new-stores.csv "Dimension Store.csv"
git add "Dimension Store.csv"
git commit -m "update store dimension"
git push origin main
```

> ⚠️ Replacing CSV via GitHub only affects stores/models. Existing survey submissions are always preserved.

### CSV Format Requirements

**`Dimension Store.csv`** — Required columns (exact names):
```
STORE_ID, Customer, Store_Name_TH, Province_TH, Region_TH, Store_ID_Customer, Active_Inactive
```

**`Dimension Model.csv`** — Required columns (exact names):
```
Model, Brand, Category, SubCategory, Active_Inactive, Remark, Update_by, Update_date
```

- `Active_Inactive` must be `Active` or `Not active`
- `STORE_ID` and `Model` must be unique (Primary Keys)

---

## 👤 Managing User Accounts

### Default Accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `admin1234` | Full admin access |
| `viewer` | `viewer1234` | Read-only access |

### Change Password (Local)

```bash
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./data/survey.db');
const hash = bcrypt.hashSync('yournewpassword', 12);
db.prepare(\"UPDATE users SET password_hash = ? WHERE username = 'admin'\").run(hash);
console.log('Password updated successfully');
"
```

### Add a New User (Local)

```bash
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./data/survey.db');
const hash = bcrypt.hashSync('newpassword', 12);
db.prepare(\"INSERT INTO users (username, password_hash, role) VALUES ('newuser', ?, 'viewer')\").run(hash);
console.log('User created');
"
```

---

## 📊 API Reference

### Staff APIs (no authentication required)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/user/stores` | Get customer → region → store hierarchy |
| `GET` | `/api/user/models` | Get models by category/brand |
| `GET` | `/api/user/store-previous/[storeId]` | Check if store has prior submission |
| `POST` | `/api/user/submit` | Submit a survey |

### Admin APIs (JWT cookie required)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Current session info |
| `GET` | `/api/admin/dashboard` | Analytics summary |
| `GET` | `/api/admin/entries` | List all entries |
| `DELETE` | `/api/admin/entries/[id]` | Delete an entry |
| `GET` | `/api/admin/dimensions/stores` | List stores |
| `PATCH` | `/api/admin/dimensions/stores` | Update store status |
| `GET` | `/api/admin/dimensions/models` | List models |
| `PATCH` | `/api/admin/dimensions/models` | Update model status |
| `POST` | `/api/admin/dimensions/replace` | Upload/replace CSV |
| `GET` | `/api/admin/dimensions/export/store` | Download store CSV |
| `GET` | `/api/admin/dimensions/export/model` | Download model CSV |
| `GET` | `/api/admin/dimensions/logs` | Audit log |

---

## 🔒 Security Notes

- All admin routes are protected by **JWT** stored in `HttpOnly` cookies (not accessible from JavaScript)
- Passwords are hashed with `bcryptjs` (12 rounds)
- The `data/` directory is **git-ignored** — the database never goes to GitHub
- **Change default passwords** before sharing the admin URL publicly

---

## 🚨 Troubleshooting

### Railway build fails

1. Go to Railway Dashboard → **display-survey** → **Deployments** → **View Logs**
2. Look for error messages starting with `[Seed]` or `Error:`
3. Most common causes:
   - Missing or malformed CSV files
   - Node.js native module compile error (should not happen on Railway)

### App loads but data is empty

- The seed script only inserts data if the tables are empty
- If you need to reseed: delete `data/survey.db` and redeploy

### Cannot login to admin

- Default credentials: `admin` / `admin1234`
- If password was changed and forgotten, you need to reset it via the database script above

### Models or stores not showing in survey

- Check that `Active_Inactive` = `Active` in the Dimensions manager
- Inactive stores/models are hidden from the staff survey page

### Railway free trial runs out

- Railway gives $5 free credit. To continue: go to Railway Dashboard → **Billing** → Add a credit card (Hobby Plan = $5/month)

---

## 📝 Changelog

| Version | Date | Changes |
|---|---|---|
| v1.0.0 | Aug 2026 | Initial release |
| v1.1.0 | Aug 2026 | Store warning modal, live input summary, full review page |
| v1.2.0 | Aug 2026 | English UI for admin panel, subcategory filter by category, bulk status modal improvements |

---

## 📄 License

Internal use — Haier Thailand Display Survey System.
