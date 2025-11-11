Plant-E-Tree

Simple full-stack scaffold for the SRS using:
- Backend: Node/Express with JWT auth, role-based access, in-memory stores
- Frontend: Existing `spa_project` with an additional `app.html` wired to the API

Backend
- Location: `server/`
- Entrypoint: `src/server.js`
- Env: create `server/.env` (copy from `.env.example` or see TEST_SETUP.md)
  - `PORT=4000`
  - `CLIENT_ORIGIN=http://localhost:5500` (or your static origin)
  - `JWT_SECRET=test_secret_key_12345` (change in production)
  - `RAZORPAY_KEY_ID=rzp_test_...` (test keys - no account needed)
  - `RAZORPAY_KEY_SECRET=test_secret` (test keys)
- Install dependencies: `npm install` (in server directory)
- Start: `npm start` or `npm run dev` (auto-reload)
- Quick Start: See `QUICK_START.md` for 5-minute setup

Frontend
- Static demo: open `spa_project/app.html` in a browser. It calls the API at `http://localhost:4000`.

Roles and Logins
- Admin bootstrap: email `admin@plante-tree.local`, password `admin123`
- Register buyer/vendor in the app UI; sessions cached via httpOnly cookie and server-side token cache.

Payment Integration
- Razorpay is integrated for payment processing
- On checkout, a Razorpay order is created and payment modal opens
- After successful payment, order is verified and created with status 'paid'
- Payment verification uses HMAC SHA256 signature validation
- Test mode: Use test keys (no Razorpay account needed for testing)
- Test cards: `4111 1111 1111 1111` with any CVV and future expiry

Plant Catalog
- Comprehensive database with 50+ plant products
- 10 categories: Indoor, Succulent, Flowering, Herbs, Large, Hanging, Air Purifying, Rare, Outdoor
- Seed catalog: POST `http://localhost:4000/api/test/seed` (use Postman - see POSTMAN_GUIDE.md)
- See `PLANT_CATALOG.md` for complete catalog documentation

Notes
- Data is kept in-memory for demo (products, orders, dms). Replace with MongoDB models later per SRS.
- DM uses WebSocket broadcast; REST fetch for history.
- Orders created via Razorpay have status 'paid' and include paymentId and razorpayOrderId.




