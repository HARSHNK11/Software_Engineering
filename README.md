# 🌿 Plant-E-Tree — E-Commerce Platform for Saplings & Garden Services

> A full-stack web application enabling users to buy & sell saplings and book maintenance services.

---

## 📌 Overview
PlantE-Tree is an online marketplace for gardening enthusiasts. Customers can browse, purchase saplings, and request maintenance services for their plants. Vendors can list their saplings and offer services, while the admin manages the platform and user activities.

This web application was developed as part of a Software Engineering course project.
---

## 📛 Badges

![Node](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express.js-Backend-black)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)
![Razorpay](https://img.shields.io/badge/Payments-Razorpay-blue)
![HTML](https://img.shields.io/badge/Frontend-HTML-orange)
![CSS](https://img.shields.io/badge/Style-CSS-blue)
![License](https://img.shields.io/badge/License-Academic-purple)

---

## 👥 User Roles

### ✅ Buyer
- Browse & purchase saplings
- Book maintenance & gardening services
- Secure payment support via Razorpay

### ✅ Vendor
- List saplings/products
- Provide garden care services
- Manage their service offerings

### ✅ Admin
- Manage vendors & buyers
- Approve/delete listings
- Monitor site health

---

## ⚙️ Tech Stack

| Layer        | Technology Used |
|--------------|-----------------|
| Frontend     | HTML, CSS (spa_project/app.html) |
| Backend      | Node.js, Express.js, JWT Auth |
| Database     | In-memory (demo), MongoDB planned |
| Payment      | Razorpay (Test + Live mode supported) |

---


## 🏗️ System Details

### 🔹 Backend
- Location: `server/`
- Entrypoint: `src/server.js`
- Environment variables (`server/.env`):
  ```env
  PORT=4000
  CLIENT_ORIGIN=http://localhost:5500
  JWT_SECRET=test_secret_key_12345 # change in production
  RAZORPAY_KEY_ID=rzp_test_...
  RAZORPAY_KEY_SECRET=test_secret
  ```
- Install dependencies:
  ```bash
  cd server
  npm install
  ```
- Start server:
  ```bash
  npm start
  # or
  npm run dev
  ```
- Quick setup guide in `QUICK_START.md`

---

### 🔹 Frontend
- Open static demo:
  ```
  spa_project/app.html
  ```
- Communicates with API at `http://localhost:4000`

---

## ✅ Key Features
- Three Login Portals — Admin, Buyer & Vendor
- Vendor product & service listing
- Razorpay integration for payments
- Secure authentication
- Admin monitoring & control
- Scalable Express backend
- MongoDB planned for production

---

## 🧾 Razorpay Integration
- Razorpay integrated for processing
- Payment flow: order → modal → verify → store
- Uses HMAC SHA256 validation
- Test mode enabled
- Test card: `4111 1111 1111 1111`

---

## 🌱 Plant Catalog
- Seed DB endpoint:
  ```bash
  POST http://localhost:4000/api/test/seed
  ```
- See `PLANT_CATALOG.md`

---

## 👨‍💻 Team Members
| Member         | Work / Contribution                       |
|----------------|-------------------------------------------|
| HARSHA N K     |   Design, Payment gateway & Database      |
| BARRI HARSHIT  |   Backend , JWT Authentication & Database |
| MOHAN SRAVANTH VARMA|   Frontend and Testing                    |

---

## 📂 Project Structure

```
plant-e-tree/
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   └── utils/
│   └── server.js
├── spa_project/
│   ├── app.html
│   ├── styles.css
│   └── ...
└── README.md
```

---

## 📄 License
Academic use only.

---

> “Let’s make the world greener, one sapling at a time!” 🌱

