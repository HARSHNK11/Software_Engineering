# Local Setup Guide - Plant-E-Tree

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ installed ([Download here](https://nodejs.org/))
- A terminal/command prompt

### Step 1: Install Dependencies

Open a terminal in the project root directory and run:

```bash
cd server
npm install
```

### Step 2: Create Environment File (Optional)

The server will work with defaults, but you can create `server/.env` for custom settings:

```bash
# In the server/ directory, create a file named .env with:
PORT=4000
CLIENT_ORIGIN=http://localhost:4000
JWT_SECRET=test_secret_key_12345
RAZORPAY_KEY_ID=rzp_test_1DP5mmOlF5G5ag
RAZORPAY_KEY_SECRET=test_secret
```

**Note:** The server works without this file using default values.

### Step 3: Start the Server

From the `server/` directory:

```bash
npm start
```

Or for auto-reload during development:

```bash
npm run dev
```

You should see:
```
🌱 Automatically seeded 50 products
API listening on http://localhost:4000
Frontend available at http://localhost:4000
Test mode: ENABLED
Admin login: admin@plante-tree.local / admin123
```

### Step 4: Open in Browser

Open your web browser and go to:

**Main Application:**
- http://localhost:4000/app.html

**Other Pages:**
- http://localhost:4000/index.html (Homepage)
- http://localhost:4000/buyer.html (Buyer interface)
- http://localhost:4000/vendor.html (Vendor dashboard)
- http://localhost:4000/admin.html (Admin panel)

---

## Alternative: Using Root Script

You can also start from the project root:

```bash
# From project root
npm install
npm start
```

This runs `start.js` which checks for MongoDB (optional) and starts the server.

---

## Default Login Credentials

**Admin:**
- Email: `admin@plante-tree.local`
- Password: `admin123`

**Buyer/Vendor:**
- Register new accounts through the UI

---

## Troubleshooting

### Port Already in Use
If port 4000 is busy, change it in `server/.env`:
```
PORT=4001
```

Then access at http://localhost:4001

### Dependencies Not Installing
Make sure you're in the `server/` directory:
```bash
cd server
npm install
```

### Frontend Not Loading
- Make sure the server is running
- Check the console for errors
- Verify you're accessing http://localhost:4000/app.html

### API Errors
- The server uses in-memory storage - data resets on restart
- Products auto-seed on server start
- Check browser console for API errors

---

## What's Running?

- **Backend API:** http://localhost:4000/api/*
- **Frontend:** http://localhost:4000/app.html
- **WebSocket:** ws://localhost:4000 (for real-time messaging)

---

## Next Steps

1. Open http://localhost:4000/app.html
2. Register as a buyer or vendor
3. Browse the auto-seeded plant catalog
4. Add items to cart and test checkout (Razorpay test mode)
5. Try the admin panel with the default credentials

Enjoy! 🌱


