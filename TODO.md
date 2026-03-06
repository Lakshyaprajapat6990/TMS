# Vercel Deployment TODO

## Plan Overview
Convert the Express server to Vercel serverless API routes for deployment.

## Tasks

### Step 1: Create MongoDB connection utility for Vercel
- [x] Create `lib/mongodb.js` - MongoDB connection utility for serverless environment

### Step 2: Convert Express routes to Vercel API routes
- [x] Create `api/buildings.js` - Buildings API endpoint
- [x] Create `api/flats.js` - Flats API endpoint
- [x] Create `api/tenants.js` - Tenants API endpoint
- [x] Create `api/rent.js` - Rent payments API endpoint
- [x] Create `api/dashboard.js` - Dashboard API endpoint

### Step 3: Update configuration files
- [x] Update root `package.json` - Add Vercel scripts and configuration
- [x] Create `vercel.json` - Configure Vercel routing
- [x] Update `client/src/api/axios.js` - Add production API URL
- [x] Update `server/package.json` - Add "type": "module" for ESM support

### Step 4: Update client for production
- [x] Update `client/vite.config.js` - Add proper proxy for dev, API for prod
- [x] Update `client/package.json` - Add Vercel deployment configuration

### Step 5: Convert models to ESM
- [x] Update `server/models/Building.js` - Convert to ESM
- [x] Update `server/models/Flat.js` - Convert to ESM
- [x] Update `server/models/Tenant.js` - Convert to ESM
- [x] Update `server/models/RentPayment.js` - Convert to ESM

## Build Configuration Fixes Applied

### vercel.json fixes:
- Added client dependencies installation: `npm install --prefix client`
- Updated build script to properly install and build client
- Fixed output directory path to `client/dist`

### package.json fixes:
- Changed build command from `cd client && npm install && npm run build` to `npm install --prefix client && npm run build --prefix client`
- Updated Vercel install command to include client

### server/package.json fixes:
- Added `"type": "module"` to enable ES6 imports in server models

## Notes
- User has MongoDB Atlas URI ready
- All Express routes converted to Vercel's handler format (req, res)
- MongoDB connection is cached in global scope for serverless functions

## Deployment Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `MONGODB_URI` with your MongoDB Atlas connection string

3. **Deploy to Vercel:**
   ```bash
   vercel deploy
   ```
   Or connect your GitHub repository to Vercel for automatic deployments.

4. **For local development with Vercel API:**
   ```bash
   npm run dev
   ```

