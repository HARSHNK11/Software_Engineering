import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Configure Helmet to allow Razorpay script
// Disable CSP in development, or configure it to allow Razorpay
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
    contentSecurityPolicy: isProduction ? {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://checkout.razorpay.com", "'unsafe-inline'"],
            scriptSrcElem: ["'self'", "https://checkout.razorpay.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.razorpay.com"],
            frameSrc: ["'self'", "https://checkout.razorpay.com"],
        },
    } : false, // Disable CSP in development for easier testing
}));
// Reflect request origin in development; use explicit env in production
app.use(cors({
    origin: isProduction
        ? (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
        : true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// API Routes - These need to come BEFORE static file serving
app.use('/api', (req, res, next) => {
    res.header('Content-Type', 'application/json');
    next();
});

// Auth routes and other API endpoints remain here...

// Serve static files from spa_project directory
const spaPath = path.join(__dirname, '../../spa_project');
app.use(express.static(spaPath));

// Serve Razorpay script
app.get('/razorpay.js', (req, res) => {
    res.redirect('https://checkout.razorpay.com/v1/checkout.js');
});

// Always serve index.html for non-API routes (SPA support)
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(spaPath, 'index.html'));
});

// In-memory token cache (per userId -> latest JWT)
const tokenCache = new Map();

// Login attempt rate limiting (email -> { count, resetTime })
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Roles: buyer | vendor | admin
const Roles = Object.freeze({ Buyer: 'buyer', Vendor: 'vendor', Admin: 'admin' });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@plante-tree.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

// Minimal in-memory user store to let you run without DB (replace with Mongo later)
const users = new Map(); // email -> { id, email, passwordHash, role, name, createdAt, lastLogin }
let userSeq = 1;
const profiles = new Map(); // userId -> { name, avatarUrl, phone, address, bio }
const CATALOG_VENDOR_ID = 0;
const CATALOG_VENDOR_NAME = 'Plant-E-Tree Catalog';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { plantCatalog } from './plantCatalog.js';

function signAuthToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '2h' });
}

function auth(required = true) {
    return (req, res, next) => {
        const token = (req.cookies && req.cookies['auth_token']) || (req.headers.authorization || '').replace('Bearer ', '');
        if (!token) return required ? res.status(401).json({ error: 'Unauthorized' }) : next();
        try {
            const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
            const latest = tokenCache.get(String(data.id));
            if (latest && latest !== token) return res.status(401).json({ error: 'Session superseded' });
            req.user = data;
            next();
        } catch (e) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
}

function requireRoles(...allowed) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
        next();
    };
}

function checkLoginRateLimit(email) {
    const attempt = loginAttempts.get(email);
    if (!attempt) return { allowed: true };
    
    if (attempt.resetTime && Date.now() < attempt.resetTime) {
        return { 
            allowed: false, 
            remainingTime: Math.ceil((attempt.resetTime - Date.now()) / 1000 / 60) 
        };
    }
    
    if (attempt.resetTime && Date.now() >= attempt.resetTime) {
        loginAttempts.delete(email);
    }
    return { allowed: true };
}

function recordFailedLogin(email) {
    const attempt = loginAttempts.get(email) || { count: 0 };
    attempt.count += 1;
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        attempt.resetTime = Date.now() + LOGIN_LOCKOUT_TIME;
        attempt.count = 0;
    }
    loginAttempts.set(email, attempt);
}

function clearLoginAttempts(email) {
    loginAttempts.delete(email);
}

function validatePasswordStrength(password) {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (password.length > 128) {
        return { valid: false, message: 'Password must be less than 128 characters' };
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasLowerCase || !hasUpperCase || !hasNumber) {
        return { 
            valid: false, 
            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
        };
    }
    return { valid: true };
}

// Auth routes
app.post('/api/auth/register',
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters'),
    body('role').optional().isIn([Roles.Buyer, Roles.Vendor]).withMessage('Invalid role'),
    body('name').optional().isString().isLength({ max: 80 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        const { email, password, role = Roles.Buyer, name = '' } = req.body || {};
        
        const passwordCheck = validatePasswordStrength(password);
        if (!passwordCheck.valid) {
            return res.status(400).json({ error: passwordCheck.message });
        }
        
        if (email === ADMIN_EMAIL) {
            return res.status(409).json({ error: 'Admin account cannot be created via registration' });
        }
        if (users.has(email)) return res.status(409).json({ error: 'User already exists' });
        
        const passwordHash = await bcrypt.hash(password, 12);
        const id = userSeq++;
        const now = Date.now();
        users.set(email, { id, email, passwordHash, role, name, createdAt: now, lastLogin: null });
        profiles.set(id, { name: name || email.split('@')[0], avatarUrl: '', phone: '', address: '', bio: '' });
        return res.json({ ok: true, message: 'Registration successful' });
    }
);

app.post('/api/auth/login',
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isString().isLength({ min: 1 }).withMessage('Password required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        const { email, password } = req.body || {};
        
        const rateLimit = checkLoginRateLimit(email);
        if (!rateLimit.allowed) {
            return res.status(429).json({ 
                error: 'Too many login attempts', 
                message: `Please try again in ${rateLimit.remainingTime} minute(s)` 
            });
        }
        
        let found = users.get(email);

        if (email === ADMIN_EMAIL) {
            if (password !== ADMIN_PASSWORD) {
                recordFailedLogin(email);
                await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            const now = Date.now();
            const adminHash = await bcrypt.hash(password, 12);
            if (found) {
                found.passwordHash = adminHash;
                found.role = Roles.Admin;
                found.name = found.name || 'Admin';
                found.lastLogin = now;
            } else {
                const id = userSeq++;
                found = { id, email: ADMIN_EMAIL, passwordHash: adminHash, role: Roles.Admin, name: 'Admin', createdAt: now, lastLogin: now };
                users.set(ADMIN_EMAIL, found);
            }
            const profile = profiles.get(found.id) || { name: 'Admin', avatarUrl: '', phone: '', address: '', bio: '' };
            profiles.set(found.id, profile);
        } else {
            if (!found) {
                recordFailedLogin(email);
                await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            
            const passwordMatch = await bcrypt.compare(password, found.passwordHash);
            if (!passwordMatch) {
                recordFailedLogin(email);
                await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            found.lastLogin = Date.now();
        }
        
        clearLoginAttempts(email);
        const token = signAuthToken({ id: found.id, email: found.email, role: found.role, name: found.name });
        tokenCache.set(String(found.id), token);
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('auth_token', token, { 
            httpOnly: true, 
            secure: isProduction, 
            sameSite: isProduction ? 'strict' : 'lax', 
            maxAge: 2 * 60 * 60 * 1000 
        });
        return res.json({ token, user: { id: found.id, email: found.email, role: found.role, name: found.name } });
    }
);

app.post('/api/auth/logout', auth(), (req, res) => {
    tokenCache.delete(String(req.user.id));
    res.clearCookie('auth_token');
    return res.json({ ok: true });
});

app.get('/api/auth/me', auth(), (req, res) => {
    return res.json({ user: req.user });
});

// Profile endpoints
app.get('/api/profile', auth(), (req, res) => {
    const base = users.get(req.user.email);
    const prof = profiles.get(req.user.id) || { name: base?.name || '', avatarUrl: '', phone: '', address: '', bio: '' };
    return res.json({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        profile: prof
    });
});

app.put('/api/profile',
    auth(),
    body('name').optional().isString().isLength({ min: 1, max: 80 }),
    body('avatarUrl').optional().isString().isLength({ max: 500 }),
    body('phone').optional().isString().isLength({ max: 30 }),
    body('address').optional().isString().isLength({ max: 200 }),
    body('bio').optional().isString().isLength({ max: 400 }),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        const base = users.get(req.user.email);
        if (!base) return res.status(404).json({ error: 'User not found' });
        const current = profiles.get(req.user.id) || { name: base.name || '', avatarUrl: '', phone: '', address: '', bio: '' };
        const { name, avatarUrl, phone, address, bio } = req.body || {};
        const updated = {
            name: name !== undefined ? name : current.name,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : current.avatarUrl,
            phone: phone !== undefined ? phone : current.phone,
            address: address !== undefined ? address : current.address,
            bio: bio !== undefined ? bio : current.bio
        };
        profiles.set(req.user.id, updated);
        return res.json({ ok: true, profile: updated });
    }
);
// Products and Orders - in-memory demo stores
const products = new Map(); // id -> { id, name, price, stock, vendorId, description }
let productSeq = 1;
const orders = new Map(); // id -> { id, buyerId, items: [{productId, qty, price}], total, status }
let orderSeq = 1;

// Services and Appointments (in-memory)
const services = [
    { code: 'MAINT_MONTHLY', name: 'Monthly Maintenance', description: 'Monthly plant care and pruning', price: 499, cadence: 'Monthly' },
    { code: 'MAINT_WEEKLY', name: 'Weekly Maintenance', description: 'Weekly visit for watering and care', price: 1499, cadence: 'Weekly' },
    { code: 'DESIGN_CONSULT', name: 'Design Consultation', description: 'One-hour garden design consultation', price: 999, cadence: 'One-time' }
];
const appointments = []; // { id, userId, serviceCode, date, status }
let appointmentSeq = 1;

// Vendor inventory CRUD
app.post('/api/products', auth(), requireRoles(Roles.Vendor, Roles.Admin), (req, res) => {
    const { name, price, stock = 0, description = '', category = '', careLevel = '' } = req.body || {};
    if (!name || typeof price !== 'number' || Number.isNaN(price)) return res.status(400).json({ error: 'Invalid payload' });
    const normalizedName = name.trim();
    if (!normalizedName) return res.status(400).json({ error: 'Product name required' });

    const existing = Array.from(products.values()).find(p =>
        p.vendorId === req.user.id && p.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (existing) {
        existing.price = price;
        existing.stock = Math.max(0, (existing.stock || 0) + Number(stock || 0));
        existing.description = description ?? existing.description;
        existing.category = category ?? existing.category;
        existing.careLevel = careLevel ?? existing.careLevel;
        existing.vendorName = req.user.name || req.user.email || existing.vendorName || 'Vendor';
        products.set(existing.id, existing);
        return res.json({ ...existing, message: 'Product updated' });
    }

    const id = productSeq++;
    const product = {
        id,
        name: normalizedName,
        price,
        stock: Math.max(0, Number(stock || 0)),
        description,
        category,
        careLevel,
        vendorId: req.user.id,
        vendorName: req.user.name || req.user.email || 'Vendor'
    };
    products.set(id, product);
    return res.json({ ...product, message: 'Product created' });
});

app.get('/api/products', (req, res) => {
    const list = Array.from(products.values()).sort((a, b) => a.name.localeCompare(b.name));
    return res.json(list);
});

app.put('/api/products/:id', auth(), requireRoles(Roles.Vendor, Roles.Admin), (req, res) => {
    const id = Number(req.params.id);
    const existing = products.get(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === Roles.Vendor && existing.vendorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const { name, price, stock, description, category, careLevel } = req.body || {};
    if (name !== undefined) existing.name = name;
    if (price !== undefined) existing.price = price;
    if (stock !== undefined) existing.stock = stock;
    if (description !== undefined) existing.description = description;
    if (category !== undefined) existing.category = category;
    if (careLevel !== undefined) existing.careLevel = careLevel;
    products.set(id, existing);
    return res.json(existing);
});

app.delete('/api/products/:id', auth(), requireRoles(Roles.Vendor, Roles.Admin), (req, res) => {
    const id = Number(req.params.id);
    const existing = products.get(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === Roles.Vendor && existing.vendorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    products.delete(id);
    return res.json({ ok: true });
});

// Razorpay initialization
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';

// Warn if using test keys in production
if (process.env.NODE_ENV === 'production' && razorpayKeyId.startsWith('rzp_test_')) {
    console.warn('⚠️  WARNING: Using test Razorpay keys in production mode!');
}

const razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret
});

// Payment endpoints
app.post('/api/payments/create-order', auth(), requireRoles(Roles.Buyer), async (req, res) => {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Empty cart' });
    
    let total = 0;
    const lineItems = [];
    for (const item of items) {
        const p = products.get(Number(item.productId));
        const qty = Number(item.qty || 1);
        if (!p || qty <= 0 || p.stock < qty) return res.status(400).json({ error: 'Invalid item or stock' });
        lineItems.push({ productId: p.id, qty, price: p.price });
        total += p.price * qty;
    }
    
    // Create Razorpay order (INR only)
    const options = {
        amount: total * 100, // Convert to paise
        currency: 'INR',
        receipt: `order_${Date.now()}`,
        notes: {
            userId: req.user.id,
            items: JSON.stringify(lineItems)
        }
    };

    try {
        const razorpayOrder = await razorpay.orders.create(options);
        return res.json({
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: razorpayKeyId,
            orderItems: lineItems,
            total
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to create payment order', details: error.message });
    }
});

app.post('/api/payments/verify', auth(), requireRoles(Roles.Buyer), async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items } = req.body || {};
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Payment verification data missing' });
    }
    
    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
        .update(text)
        .digest('hex');
    
    if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
    }
    
    // Create order after successful payment
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Empty cart' });
    let total = 0;
    const lineItems = [];
    for (const item of items) {
        const p = products.get(Number(item.productId));
        const qty = Number(item.qty || 1);
        if (!p || qty <= 0 || p.stock < qty) return res.status(400).json({ error: 'Invalid item or stock' });
        p.stock -= qty;
        if (p.stock < 0) p.stock = 0;
        products.set(p.id, { ...p });
        lineItems.push({ productId: p.id, qty, price: p.price });
        total += p.price * qty;
    }
    
    const id = orderSeq++;
    const order = {
        id,
        buyerId: req.user.id,
        items: lineItems,
        total,
        status: 'paid',
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id
    };
    orders.set(id, order);
    
    return res.json({ order, verified: true });
});

// Buyer checkout and orders (legacy - kept for backward compatibility)
app.post('/api/orders', auth(), requireRoles(Roles.Buyer), (req, res) => {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Empty cart' });
    let total = 0;
    const lineItems = [];
    for (const item of items) {
        const p = products.get(Number(item.productId));
        const qty = Number(item.qty || 1);
        if (!p || qty <= 0 || p.stock < qty) return res.status(400).json({ error: 'Invalid item or stock' });
        p.stock -= qty;
        if (p.stock < 0) p.stock = 0;
        products.set(p.id, { ...p });
        lineItems.push({ productId: p.id, qty, price: p.price });
        total += p.price * qty;
    }
    const id = orderSeq++;
    const order = { id, buyerId: req.user.id, items: lineItems, total, status: 'placed' };
    orders.set(id, order);
    return res.json(order);
});

app.get('/api/orders', auth(), (req, res) => {
    const role = req.user.role;
    if (role === Roles.Buyer) {
        return res.json(Array.from(orders.values()).filter(o => o.buyerId === req.user.id));
    }
    if (role === Roles.Vendor) {
        const vendorProductIds = new Set(Array.from(products.values()).filter(p => p.vendorId === req.user.id).map(p => p.id));
        return res.json(Array.from(orders.values()).filter(o => o.items.some(it => vendorProductIds.has(it.productId))));
    }
    return res.json(Array.from(orders.values())); // admin
});

// Services catalog
app.get('/api/services', (req, res) => {
    return res.json(services);
});

// Appointments
app.get('/api/appointments', auth(), (req, res) => {
    const role = req.user.role;
    if (role === Roles.Admin) return res.json(appointments);
    return res.json(appointments.filter(a => a.userId === req.user.id));
});

app.post('/api/appointments', auth(), (req, res) => {
    const { serviceCode, date } = req.body || {};
    const svc = services.find(s => s.code === String(serviceCode));
    if (!svc) return res.status(400).json({ error: 'Invalid service code' });
    if (!date) return res.status(400).json({ error: 'Date required' });
    const id = appointmentSeq++;
    const appt = { id, userId: req.user.id, serviceCode: svc.code, date: String(date), status: 'scheduled' };
    appointments.push(appt);
    return res.json(appt);
});

// Simple DM system (user to user) via REST + WS broadcast
const dms = []; // { fromId, toId, message, ts }

app.post('/api/dm', auth(), (req, res) => {
    const { toId, message } = req.body || {};
    if (!toId || !message) return res.status(400).json({ error: 'toId and message required' });
    const dm = { fromId: req.user.id, toId: Number(toId), message: String(message), ts: Date.now() };
    dms.push(dm);
    // broadcast via ws
    const payload = JSON.stringify({ type: 'dm', data: dm });
    wss.clients.forEach((client) => {
        try { client.send(payload); } catch { }
    });
    return res.json(dm);
});

app.get('/api/dm', auth(), (req, res) => {
    const uid = req.user.id;
    return res.json(dms.filter(m => m.fromId === uid || m.toId === uid));
});

app.get('/api/admin/users', auth(), requireRoles(Roles.Admin), (req, res) => {
    return res.json(Array.from(users.values()).map(u => ({ id: u.id, email: u.email, role: u.role, name: u.name })));
});

app.get('/api/admin/users/:id/profile', auth(), requireRoles(Roles.Admin), (req, res) => {
    const userId = Number(req.params.id);
    const user = Array.from(users.values()).find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const prof = profiles.get(userId) || { name: user.name || '', avatarUrl: '', phone: '', address: '', bio: '' };
    return res.json({ id: user.id, email: user.email, role: user.role, profile: prof });
});

app.put('/api/admin/users/:id/profile',
    auth(),
    requireRoles(Roles.Admin),
    body('name').optional().isString().isLength({ min: 1, max: 80 }),
    body('avatarUrl').optional().isString().isLength({ max: 500 }),
    body('phone').optional().isString().isLength({ max: 30 }),
    body('address').optional().isString().isLength({ max: 200 }),
    body('bio').optional().isString().isLength({ max: 400 }),
    (req, res) => {
        const userId = Number(req.params.id);
        const user = Array.from(users.values()).find(u => u.id === userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        const current = profiles.get(userId) || { name: user.name || '', avatarUrl: '', phone: '', address: '', bio: '' };
        const { name, avatarUrl, phone, address, bio } = req.body || {};
        const updated = {
            name: name !== undefined ? name : current.name,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : current.avatarUrl,
            phone: phone !== undefined ? phone : current.phone,
            address: address !== undefined ? address : current.address,
            bio: bio !== undefined ? bio : current.bio
        };
        profiles.set(userId, updated);
        return res.json({ ok: true, profile: updated });
    }
);

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Test data seeding endpoint (for testing only)
app.post('/api/test/seed', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
    }
    
    const { clear = false, count = 'all' } = req.query || {};
    
    // Clear existing products if requested
    if (clear === 'true') {
        products.clear();
        productSeq = 1;
    }
    
    // Seed plant catalog products
    if (products.size === 0) {
        let plantsToSeed = plantCatalog;
        
        // Limit count if specified
        if (count !== 'all' && !isNaN(Number(count))) {
            plantsToSeed = plantCatalog.slice(0, Number(count));
        }
        
        plantsToSeed.forEach((plant) => {
            const id = productSeq++;
            products.set(id, { 
                id, 
                name: plant.name, 
                price: plant.price, 
                stock: plant.stock, 
                description: plant.description,
                category: plant.category,
                careLevel: plant.careLevel,
                vendorId: 1 // Assign to first vendor
            });
        });
        
        return res.json({ 
            message: `Plant catalog seeded successfully! Added ${plantsToSeed.length} products.`,
            count: plantsToSeed.length,
            total: plantCatalog.length,
            products: Array.from(products.values()).slice(0, 10) // Return first 10 as sample
        });
    }
    
    return res.json({ 
        message: 'Products already exist. Use ?clear=true to reset.',
        currentCount: products.size,
        totalInCatalog: plantCatalog.length
    });
});

// Get plant catalog info (categories, etc.)
app.get('/api/catalog/info', (req, res) => {
    const categories = [...new Set(plantCatalog.map(p => p.category))];
    const careLevels = [...new Set(plantCatalog.map(p => p.careLevel))];
    const priceRanges = {
        min: Math.min(...plantCatalog.map(p => p.price)),
        max: Math.max(...plantCatalog.map(p => p.price)),
        avg: Math.round(plantCatalog.reduce((sum, p) => sum + p.price, 0) / plantCatalog.length)
    };
    
    return res.json({
        totalPlants: plantCatalog.length,
        categories,
        careLevels,
        priceRanges,
        categoriesCount: categories.reduce((acc, cat) => {
            acc[cat] = plantCatalog.filter(p => p.category === cat).length;
            return acc;
        }, {})
    });
});

// Serve index.html or app.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(spaPath, 'index.html'), (err) => {
        if (err) {
            // If index.html doesn't exist, try app.html
            res.sendFile(path.join(spaPath, 'app.html'), (err2) => {
                if (err2) {
                    res.status(404).send('Frontend files not found. Please check spa_project directory.');
                }
            });
        }
    });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });
wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'welcome', data: 'Connected to Plant-E-Tree WS' }));
});

// API 404 fallback
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, async () => {
    // Auto-seed products if none exist
    if (products.size === 0) {
        plantCatalog.forEach((plant) => {
            const id = productSeq++;
            products.set(id, { 
                id, 
                name: plant.name, 
                price: plant.price, 
                stock: plant.stock, 
                description: plant.description,
                category: plant.category,
                careLevel: plant.careLevel,
                vendorId: CATALOG_VENDOR_ID,
                vendorName: CATALOG_VENDOR_NAME
            });
        });
        console.log(`🌱 Automatically seeded ${plantCatalog.length} products`);
    }

    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`Frontend available at http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`Test mode: ${process.env.NODE_ENV !== 'production' ? 'ENABLED' : 'DISABLED'}`);
    // eslint-disable-next-line no-console
    console.log(`Admin login: admin@plante-tree.local / Admin123!`);
});




