# Render Backend Deployment Guide

This guide provides step-by-step instructions to deploy the **WrkUp Backend Service** on [Render](https://render.com).

---

## 📋 Overview & Architecture

The WrkUp backend is a Node.js + Express application featuring:
- **Prisma ORM** with **PostgreSQL** database
- **Socket.io** for real-time WebSocket communication
- **Redis** for geospatial matching and fast caching
- **TypeScript** compiled build system

---

## 🛠️ Prerequisites

Before deploying, ensure you have:
1. A **Render Account** ([dashboard.render.com](https://dashboard.render.com)).
2. A **PostgreSQL Database** (Render PostgreSQL, Supabase, Neon, or Railway).
3. API credentials for external services (**Razorpay**, **Firebase**, **Sentry** optional).
4. Your codebase pushed to a **GitHub** or **GitLab** repository.

---

## 🚀 Option 1: Automated Blueprint Deployment (Recommended)

Render Blueprints allow you to provision your Web Service and Redis database automatically using the `render.yaml` configuration file included in this repository.

### Step 1: Push `render.yaml` to GitHub
Ensure the `render.yaml` file exists in the root of your repository (or in `apps/render.yaml`).

### Step 2: Create a New Blueprint Instance
1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right corner and select **Blueprint**.
3. Connect your GitHub/GitLab repository.
4. Render will scan your repository and detect the `render.yaml` specification.
5. Enter a **Service Group Name** (e.g., `WrkUp-production`).

### Step 3: Set Required Environment Variables
Render will prompt you for variables marked `sync: false`:
- `DATABASE_URL`: Your PostgreSQL connection string (e.g. `postgresql://user:pass@ep-xyz.neon.tech/WrkUp?sslmode=require`)
- `RAZORPAY_KEY_ID`: Your Razorpay Key ID
- `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret

*Note: `JWT_SECRET` and `REDIS_URL` will be automatically generated and linked by Render.*

### Step 4: Deploy
Click **Apply**. Render will automatically provision:
1. `WrkUp-redis` (Internal Redis service)
2. `WrkUp-backend` (Node.js Web Service)

---

## 🛠️ Option 2: Manual Deployment via Render Dashboard

If you prefer to configure services manually via the UI:

### Step 1: Deploy / Obtain PostgreSQL Database
- **Option A (Render Postgres)**: Go to **New +** -> **PostgreSQL**. Create database, copy the **Internal Database URL**.
- **Option B (External DB)**: Create a free database on [Supabase](https://supabase.com) or [Neon](https://neon.tech), copy the connection string (`postgresql://...`).

### Step 2: Deploy Redis Service on Render
1. Go to **New +** -> **Redis**.
2. **Name**: `WrkUp-redis`
3. **Plan**: Free (or Starter)
4. Click **Create Redis**.
5. Once created, copy the **Internal Redis URL** (`redis://red-xxxxxxxx:6379`).

### Step 3: Create Web Service for Backend
1. Go to **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `WrkUp-backend` |
| **Language / Environment** | `Node` |
| **Region** | Select the region closest to your users (e.g., Oregon, Frankfurt, Singapore) |
| **Branch** | `main` |
| **Root Directory** | `apps/backend` |
| **Build Command** | `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/health` |

### Step 4: Configure Environment Variables
In the **Environment** section of your Web Service, add:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
REDIS_URL=redis://red-xxxxxxxx:6379
JWT_SECRET=your_super_secret_jwt_key_here
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
SOCKET_CORS_ORIGIN=*
SENTRY_DSN=optional_sentry_dsn
```

Click **Create Web Service**.

---

## 🗄️ Prisma Migrations on Render

During every deployment, the build command executes:
```bash
npx prisma migrate deploy
```
This automatically updates your production PostgreSQL database schema to match `schema.prisma` safely without prompt errors or data loss.

> ⚠️ **Important**: Ensure your PostgreSQL database permits remote SSL connections (`?sslmode=require` appended to `DATABASE_URL`).

---

## 🔌 Socket.io & WebSocket Support

Render natively supports WebSockets over standard HTTP/HTTPS ports!
- **CORS Config**: By default `SOCKET_CORS_ORIGIN` is set to `*`. In production, you can restrict this to your specific frontend or mobile domain.
- **Mobile Integration**: Update your Expo mobile app `.env` to point to your live Render backend URL:
  ```env
  EXPO_PUBLIC_API_URL=https://WrkUp-backend.onrender.com
  EXPO_PUBLIC_SOCKET_URL=https://WrkUp-backend.onrender.com
  ```

---

## ✅ Verification & Testing

1. **Health Check**: Open `https://WrkUp-backend.onrender.com/health` in your browser.
   - Expected Output: `{"status":"ok"}`
2. **View Deployment Logs**:
   - Go to your Render Web Service dashboard -> **Logs** tab.
   - Verify log line: `Server running on port 10000`.
3. **Test Database Connection**:
   - Check logs for any Prisma connection errors.

---

## 🔍 Troubleshooting & FAQs

### 1. Build Fails: "Cannot find module '@prisma/client'"
- **Cause**: Prisma client was not generated before compiling TypeScript.
- **Fix**: Ensure your Build Command contains `npx prisma generate`:
  `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`

### 2. Cold Start Delays (Render Free Tier)
- Render Free Web Services automatically spin down after 15 minutes of inactivity.
- The first request after spin-down takes ~30 to 50 seconds to boot up.
- **Solution**: Upgrade to Render **Individual/Starter Plan** ($7/mo) for 24/7 uninterrupted uptime.

### 3. Redis Connection Error: `ECONNREFUSED`
- **Cause**: Using external Redis URL instead of internal URL, or missing `REDIS_URL`.
- **Fix**: On Render, always use the internal connection string (`redis://red-xxx:6379`) when connecting services in the same Render region.

---
