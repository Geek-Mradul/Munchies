# Munchies — Hostel-Based Food Ordering Platform

Munchies is a local food ordering platform designed for campus hostel wings. It lets students run small food stalls out of their hostel rooms, publish digital menus, configure promotional discounts, and manage orders. Other students in the hostel can browse wing stores, maintain separate carts for different rooms, place orders, and track active bookings.

Administrators moderate the system by approving or rejecting new merchant requests, issuing warnings to students who fail to collect their orders on time, and blocking bad actors globally or at specific wings.

---

## Technical Stack

This project is built using a clean monorepo workspace structured as follows:

* **`apps/server`**: Express API backend. Handles auth pipelines, order transactions, background schedulers, cache controls, and Nodemailer subscriptions.
* **`apps/web`**: Next.js v16 (Turbopack + App Router) using Tailwind CSS v4 for simple, responsive, and mobile-friendly user portals.

### Backend Details

* **Runtime & Script Execution**: Node.js + TypeScript (run locally via `tsx`).
* **Database & Schema**: PostgreSQL configured using Prisma ORM.
* **API Documentation**: Interactive REST references using Swagger at `/docs`.
* **Caching**: Custom in-memory TTL caching on high-read endpoints (`/stores`, store details, and menu items) with automatic database triggers to invalidate the cache on menu updates, checkouts, or store launches.
* **Background Scheduler**: A background worker loop executing every 60 seconds to toggle scheduling campaigns, automatically cancel orders uncollected for more than 24 hours, and handle warning counts.

---

## Default Roles & Seeded Credentials

When you run the database seeder (`npx prisma db seed`), the database is populated with test data. You can log into `http://localhost:3000` with the following predefined accounts (all passwords are set to `password`):

### 1. Student (USER role)

* **Login URL**: `http://localhost:3000/login`
* **Seeded Email**: `user1@munchies.com`
* **Features**:
  * Browse wing kitchens and check menu items.
  * Manage a shopping cart (limited to **7 items** per checkout).
  * Track active orders (Placed, Accepted, Ready, Completed) and request booking cancellations.
  * View personal analytics and a **6-month spending breakdown chart** by clicking your avatar or visiting `/user`.

### 2. Merchant Store Owner (STORE_OWNER role)

* **Login URL**: `http://localhost:3000/owner`
* **Seeded Emails**: `owner1@munchies.com` through `owner12@munchies.com` (each unique owner manages exactly 1 hostel wing store)
* **Features**:
  * Add, edit, or delete items from the digital menu card.
  * Accept incoming orders, trigger the **Ready-state countdown**, and close completed sales.
  * Create scheduled coupon discount campaigns.
  * Access the **Store Settings** tab to customize your store's display name and catchy marketing tagline in real-time, complete with an interactive live mockup of the student catalog preview card.
  * Access the **Live Store Analytics** dashboard tab to view total revenues, item sale metrics, and stock warning levels.

### 3. Campus Admin (ADMIN role)

* **Login URL**: `http://localhost:3000/admin`
* **Seeded Email**: `admin@munchies.com`
* **Features**:
  * Approve or reject pending merchant request applications.
  * Audit students, issue platform warnings, and globally suspend checkout permissions for users who exceed warning limits.

---

## Environment Variables Configuration

Create a `.env` file in the root directory. Use these parameters:

```env
# PostgreSQL Database Connection URI
DATABASE_URL="postgresql://username:password@localhost:5432/database"

# Secret string used to sign JWTs
JWT_SECRET="your-jwt-secret-key"

# Gmail SMTP Mailer Credentials (for order cancellations and policy warnings)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASS="your-app-password"
SMTP_FROM='"Munchies Support" <your-email@example.com>'
```

For the Next.js web application (`apps/web`), the following environment variable points to the API backend (defaults to `http://localhost:4000`):

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## Setup & Running Locally

Follow these quick commands to bootstrap and run both the API backend and the Next.js web client locally:

### 1. Install Dependencies

Make sure you have Node.js and `pnpm` installed. Bootstrap the workspace dependencies:

```bash
pnpm install
```

### 2. Prepare the Database & Seed Data

Initialize your PostgreSQL database schemas and seed test accounts without modifying tables manually:

```bash
# Push schema designs and create database tables automatically
npx prisma db push

# Generate the local Prisma client
npx prisma generate

# Seed the database with test stores, items, and historical order data
npx prisma db seed
```

### 3. Start the Express API Backend

```bash
cd apps/server
pnpm dev
```

The Express server boots up on **port 4000**:

* **Backend URL**: `http://localhost:4000`
* **Interactive API Reference**: `http://localhost:4000/docs`

### 4. Start the Next.js Web Application

Open a new terminal window or tab and run:

```bash
cd apps/web
pnpm dev
```

The Next.js development server boots up on **port 3000**:

* **Web Portal**: `http://localhost:3000`
