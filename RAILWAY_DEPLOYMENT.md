# Railway Backend Deployment & Mobile App Connection Guide

This guide provides complete, step-by-step instructions for deploying the **WrkUp Backend Service** on [Railway](https://railway.app) and connecting your Expo mobile app to the live deployed backend.

---

## 📋 Overview & Architecture

The WrkUp monorepo backend is built with:
- **Node.js & Express** with **TypeScript**
- **Prisma ORM** connecting to **PostgreSQL**
- **Socket.io** for real-time WebSocket matching and chat
- **Redis** (`ioredis`) for active geospatial tracking & fast caching

---

## 🛠️ Prerequisites

Before starting, make sure you have:
1. A **Railway Account** ([railway.app](https://railway.app)).
2. Your codebase pushed to a **GitHub** repository.
3. Node.js (v18+) and Git installed locally (if using Railway CLI).
4. Environment variables and credentials for external services (PostgreSQL, Redis, Razorpay, Firebase, Sentry).

---

## 🚀 Step 1: Deploy Backend to Railway

You can deploy using either the **Railway Web Dashboard** (Recommended) or the **Railway CLI**.

### Option A: Via Railway Web Dashboard (Recommended)

#### 1. Create a New Project on Railway
1. Log into your [Railway Dashboard](https://railway.app/dashboard).
2. Click **+ New Project**.
3. Select **Deploy from GitHub repo**.
4. Choose your `WrkUp` repository from the list.

#### 2. Add PostgreSQL & Redis Databases (If not using external providers)
1. Inside your Railway project canvas, click **+ New** -> **Database** -> **Add PostgreSQL**.
2. Click **+ New** -> **Database** -> **Add Redis**.
3. Railway automatically generates internal connection variables (`DATABASE_URL`, `REDIS_URL`).

#### 3. Configure Backend Web Service
1. Click on your connected GitHub service node in the project canvas.
2. Navigate to the **Settings** tab:
   - **Root Directory**: Set to `apps/backend` (or leave empty if using root `railway.json`).
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npx prisma migrate deploy && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
3. Alternatively, if deploying from the root directory, Railway automatically reads the root [`railway.json`](file:///c:/Users/lalmo/OneDrive/Documents/App_G/GGG/railway.json):
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "cd apps/backend && npm install && npx prisma generate && npm run build"
     },
     "deploy": {
       "startCommand": "cd apps/backend && npm start",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

#### 4. Set Environment Variables
Go to the **Variables** tab of your service node and add the following required variables:

| Variable Name | Description / Recommended Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Railway automatically binds to `${{PORT}}` dynamically) |
| `DATABASE_URL` | Your PostgreSQL string (or link Railway Postgres via `${{Postgres.DATABASE_URL}}`) |
| `REDIS_URL` | Your Redis string (or link Railway Redis via `${{Redis.REDIS_URL}}`) |
| `JWT_SECRET` | A secure random string for JWT token verification |
| `RAZORPAY_KEY_ID` | Your Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay API Secret |
| `SOCKET_CORS_ORIGIN` | `*` (or your app domain) |

> 💡 **Tip**: If using Railway's built-in Postgres and Redis plugins, click **Add Reference** -> select `Postgres` -> `DATABASE_URL` and `Redis` -> `REDIS_URL`.

#### 5. Generate Public Domain
1. In your service settings, scroll down to **Networking** / **Public Networking**.
2. Click **Generate Domain** (or set a custom domain).
3. Railway will generate a public URL like:
   `https://gigwork-backend-production-2fa6.up.railway.app`

---

### Option B: Via Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```
2. **Login**:
   ```bash
   railway login
   ```
3. **Initialize or Link Project**:
   ```bash
   railway link
   ```
4. **Deploy Application**:
   ```bash
   railway up
   ```

---

## 📱 Step 2: Connect the Mobile App (Expo / React Native)

Your Expo mobile application reads the backend URL through environment configuration in [`apps/mobile/src/services/apiClient.ts`](file:///c:/Users/lalmo/OneDrive/Documents/App_G/GGG/apps/mobile/src/services/apiClient.ts).

### 1. Update Environment Variables in `apps/mobile/.env`

Create or edit `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://gigwork-backend-production-2fa6.up.railway.app
```

> ⚠️ Replace the URL above with your actual Railway public domain generated in Step 1.5.

### 2. Configure `app.json` or `eas.json` (For Production Builds)

If deploying via **EAS Build** or building a standalone APK/IPA:

In `apps/mobile/eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://gigwork-backend-production-2fa6.up.railway.app"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://gigwork-backend-production-2fa6.up.railway.app"
      }
    }
  }
}
```

Or pass `extra` config in `apps/mobile/app.json`:
```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_API_URL": "https://gigwork-backend-production-2fa6.up.railway.app"
    }
  }
}
```

### 3. Verify How the Mobile App Handles API & Sockets

- **REST API** ([`apiClient.ts`](file:///c:/Users/lalmo/OneDrive/Documents/App_G/GGG/apps/mobile/src/services/apiClient.ts)):
  Automatically prefixes all HTTP requests (`axios`) with your `EXPO_PUBLIC_API_URL`.
- **WebSockets** ([`useSocketSetup.ts`](file:///c:/Users/lalmo/OneDrive/Documents/App_G/GGG/apps/mobile/src/hooks/useSocketSetup.ts)):
  Establishes real-time connection to `getApiBaseUrl()` over WSS automatically on user login.

---

## ✅ Step 3: Verification & Health Check

1. **Verify Backend Health**:
   Open in browser or run curl:
   ```bash
   curl https://gigwork-backend-production-2fa6.up.railway.app/health
   ```
   **Expected Response**: `{"status":"ok"}` or status 200 OK.

2. **Verify Database Migrations**:
   Check the Railway deployment log output for:
   ```text
   Prisma Schema loaded from prisma/schema.prisma
   Migrations applied successfully.
   ```

3. **Verify Mobile App Connection**:
   - Run the mobile app:
     ```bash
     cd apps/mobile
     npx expo start --clear
     ```
   - Test logging in or signing up. Observe request logs in the Railway Dashboard **Deploy Logs** tab.

---

## ❓ Troubleshooting & FAQs

### 1. `PrismaClientInitializationError`: Can't connect to database
- **Solution**: Ensure `DATABASE_URL` contains `?sslmode=require` if using an external database (e.g. Supabase, Neon). If using Railway PostgreSQL plugin, use the internal reference `${{Postgres.DATABASE_URL}}`.

### 2. CORS Error / Socket Connection Refused
- **Solution**: Ensure `SOCKET_CORS_ORIGIN=*` is configured in your Railway environment variables.

### 3. Port Binding Issue
- **Solution**: Railway dynamically assigns `$PORT`. Ensure `apps/backend/src/index.ts` uses:
  ```typescript
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => { ... });
  ```

### 4. Build Fails: Missing `@prisma/client`
- **Solution**: Ensure your build command includes `npx prisma generate` before `npm run build`.

---

## 🎯 Summary Checklist

- [x] Create project on Railway & connect GitHub repository.
- [x] Configure Postgres & Redis environment variables (`DATABASE_URL`, `REDIS_URL`).
- [x] Set Build Command to include Prisma generation and migrations.
- [x] Copy Railway Public Domain (e.g., `https://gigwork-backend-production-2fa6.up.railway.app`).
- [x] Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` & `eas.json`.
- [x] Restart Expo dev server (`npx expo start --clear`) and test auth flow.
