# Multi-Branch SaaS Digital Menu (Web & Mobile)

A multi-tenant, multi-branch SaaS Digital Menu, Kitchen Order Ticket (KOT), and POS Billing platform for restaurants, resorts, cafes, and multi-outlet food chains. 

---

## 🚀 Key Features

### 🏢 1. Multi-Branch SaaS Architecture
- **Tenant Management**: Multi-tenant isolation supporting independent restaurant groups or SaaS clients.
- **Branch / Property Management**: Create, configure, and manage multiple branches/outlets under one tenant.
- **Branch Options**: Custom branch code, name, address, contact phone/email, location maps link, and GSTIN.
- **Multi-Branch Context Switching**: Seamless top-bar branch switcher for switching between properties.

### 👑 2. Super Admin Options
- **Global Overview**: Real-time analytics across all tenants and branches.
- **Tenant Subscriptions**: Manage SaaS plans (Starter, Growth, Enterprise), trial periods, and billing cycles.
- **Universal Branch Oversight**: Ability to inspect and configure any branch across the entire SaaS ecosystem.
- **Role & Access Governance**: Super Admin user creation and global permission controls.

### 👥 3. Branch Admin & User Management
- **Branch Admin Control**: Branch admins manage their branch without seeing data from other branches.
- **User / Staff Creation**: Branch admin can create users/employees assigned directly to their branch.
- **Role-Based Access Control (RBAC)**:
  - **Branch Admin / Manager**: Full branch operations, settings, catalog, and staff management.
  - **Cashier / POS Billing**: Sales order management, billing with/without GST, bill printing, and payment settlement.
  - **Kitchen / Chef**: Live Kitchen Order Ticket (KOT) queue, ingredient stock tracking, and order state transitions.
  - **Waiter / Captain**: Taking table orders, room delivery requests, and live table status updates.

### 🍽️ 4. Branch / Property-Wise Menu & Item Management
- **Branch-Scoped Categories**: Create and organize menu categories per branch (e.g. Starters, Main Course, Drinks, Desserts).
- **Branch-Wise Item Add & Catalog**:
  - Item name, description, category, and pricing.
  - Room service / Dine-in differential pricing.
  - Veg / Non-Veg / Vegan / Egg badges.
  - Real-time in-stock / out-of-stock availability toggle.
  - Time-wise availability and item images.

### 🍳 5. Sales, Kitchen Order Ticket (KOT) & Billing
- **Real-Time KOT Generation**: Automatic KOT creation when an order is placed from Customer QR, Waiter app, or Web POS.
- **Kitchen Workflow**: Live status transitions (`Pending` ➔ `Preparing / In Progress` ➔ `Ready` ➔ `Completed / Served`).
- **One-Click KOT Slip Print**: Formatted thermal slip for kitchen cooks with KOT #, Table / Room #, items with bold quantities, and special chef preparation notes.
- **Flexible Billing (With or Without GST)**:
  - **Bill With GST**: Automatically applies branch food GST % (e.g., 2.5% CGST + 2.5% SGST = 5.0% or 18%) with complete tax breakdown.
  - **Bill Without GST**: Zero-tax / composite bill generation with no GST calculated.
  - **Per-Order Override**: Cashiers can dynamically toggle GST on/off for specific bills or configure it branch-wide.
  - **Bill / Invoice Printing**: Clean printable Tax Invoice or Non-Tax receipt with branch branding and GSTIN.
  - **Payment Modes**: Cash, UPI, Card, or Room Tab with instant settlement.

### 📱 6. Multi-Platform Support (Web & Mobile)
- **Web Admin Dashboard (`web-admin`)**: Complete React management suite for Super Admins and Branch Admins.
- **Customer QR Digital Menu (`web-digitalmenu`)**: Mobile-responsive web portal where diners scan a table QR code (`#/table/:id` or `#/menu`), browse the menu, and place orders.
- **Mobile App (`mobile/employee`)**: Cross-platform Flutter app for waiters, kitchen display (KOT), and branch managers.

---

## 📁 Repository Structure

```
c:\Developer\Digitalmenu/
├── backend/                     # FastAPI Backend
│   ├── app/
│   │   ├── api/                 # REST Endpoints (Branch, SuperAdmin, Food Orders, Menu, Billing, Users, Public)
│   │   ├── curd/                # Database CRUD operations
│   │   ├── models/              # SQLAlchemy Models (Tenant, Branch, User, Role, FoodItem, FoodOrder, Table)
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── utils/               # Auth, JWT, GST calculations, Timezone, Invoice utilities
│   │   ├── database.py          # Database connection
│   │   └── main.py              # FastAPI application initialization
│   ├── alembic/                 # Alembic migrations
│   ├── Dockerfile               # Backend Docker container specification
│   ├── requirements.txt         # Python dependencies
│   └── main.py                  # Entry point script
│
├── web-admin/                   # React Web Admin Dashboard
│   ├── public/                  # Public assets
│   ├── src/
│   │   ├── contexts/            # BranchContext (multi-branch switcher), NotificationContext
│   │   ├── layout/              # DashboardLayout & Navigation
│   │   ├── pages/               # SuperAdminDashboard, BranchManagement, Users, FoodOrders, Billing, Fooditem, Settings
│   │   └── services/            # Axios API client
│   ├── Dockerfile               # Admin Dashboard Docker container specification
│   └── package.json
│
├── web-digitalmenu/             # Customer-Facing Web QR Digital Menu
│   ├── public/                  # Public assets
│   ├── src/
│   │   ├── GuestRoomPortal.js   # QR Menu, Table Dine-in & Cart Ordering
│   │   └── App.js               # Multi-branch routing, theme selection, table QR route handler
│   ├── Dockerfile               # Digital Menu Docker container specification
│   └── package.json
│
├── mobile/                      # Flutter Mobile Application
│   └── employee/                # Waiter POS, Kitchen KOT Dashboard, Staff & Manager screens
│       ├── lib/
│       │   ├── config/          # App constants & API base URL
│       │   ├── presentation/    # Screens: KOT, Waiter Ordering, Attendance, Manager
│       │   └── main.dart        # Flutter entry point
│       └── pubspec.yaml
│
├── nginx/                       # Reverse Proxy Gateway
│   └── default.conf             # Unified Nginx routing configuration
│
├── docker-compose.yml           # Multi-container Docker orchestration
├── .env.docker                  # Docker environment variables
├── docker_start.bat             # 1-Click Docker start script (Windows)
├── docker_stop.bat              # 1-Click Docker stop script (Windows)
└── README.md                    # System documentation
```

---

## 🐳 Running Inside Docker

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Quick Start (Windows)
Double-click `docker_start.bat` or run in PowerShell:
```powershell
.\docker_start.bat
```

### Manual Docker Compose Command (Linux / macOS / Windows)
```bash
docker compose --env-file .env.docker up --build -d
```

### Access Endpoints
| Component | Local Port | Gateway URL | Purpose |
|---|---|---|---|
| **Admin Dashboard** | `http://localhost:3000` | `http://localhost:8080/admin` | Super Admin & Branch Admin management |
| **Digital Menu (Customer)** | `http://localhost:3002` | `http://localhost:8080/` | QR Digital Menu for table orders |
| **Backend API Docs** | `http://localhost:8011/docs` | `http://localhost:8080/api/docs` | OpenAPI / Swagger Documentation |
| **PostgreSQL Database** | `localhost:5432` | Internal (`db:5432`) | `digitalmenu_db` (user: `postgres`) |
| **Unified Gateway** | `http://localhost:8080` | `http://localhost:8080` | Nginx reverse proxy |

To stop all containers:
```powershell
.\docker_stop.bat
# Or: docker compose down
```

---

## ⚙️ Initial Setup & First Admin User

1. Start the Docker containers using `docker_start.bat`.
2. Open the Backend API docs at `http://localhost:8011/docs`.
3. Call `POST /api/users/setup-admin` with:
   ```json
   {
     "name": "Super Admin",
     "email": "superadmin@digitalmenu.com",
     "password": "AdminPassword123"
   }
   ```
4. Log in to the Admin Dashboard at `http://localhost:3000` or `http://localhost:8080/admin` with these credentials.
5. In **Branch Management** (`/branch-management`), add your branches (e.g. "Main Branch", "Beachfront Outpost").
6. In **Menu Management** (`/food-categories` and `/food-items`), add categories and dishes with branch-specific pricing.
7. Print table QR codes pointing to `http://localhost:3002/#/table/{table_number}` for your tables!

---

## 📱 Running the Mobile Flutter App

1. Ensure the backend Docker container is running (`http://localhost:8011`).
2. Navigate to `mobile/employee`:
   ```bash
   cd mobile/employee
   flutter pub get
   flutter run
   ```
3. The mobile app automatically routes to:
   - `http://10.0.2.2:8011/api` on the Android emulator.
   - `http://localhost:8011/api` on iOS simulator, web, and desktop.
