import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plante_tree';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5500';

await mongoose.connect(MONGODB_URI);

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    passwordHash: String,
    role: { type: String, enum: ['buyer', 'vendor', 'admin'], default: 'buyer' }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    stock: Number,
    description: String,
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{ productId: Number, qty: Number }],
    lines: [{ productId: mongoose.Schema.Types.ObjectId, name: String, price: Number, qty: Number, lineTotal: Number }],
    total: Number,
    status: { type: String, default: 'placed' }
}, { timestamps: true });
const Order = mongoose.model('Order', orderSchema);

const messageSchema = new mongoose.Schema({
    fromId: Number,
    toId: Number,
    message: String
}, { timestamps: true });
const Message = mongoose.model('Message', messageSchema);

const serviceSchema = new mongoose.Schema({
    code: String,
    name: String,
    description: String,
    price: Number,
    cadence: String
});
const Service = mongoose.model('Service', serviceSchema);

const appointmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    serviceCode: String,
    date: String,
    status: { type: String, default: 'scheduled' }
}, { timestamps: true });
const Appointment = mongoose.model('Appointment', appointmentSchema);

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true },
    store: MongoStore.create({ mongoUrl: MONGODB_URI })
}));

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'unauthorized' });
    next();
}
function requireRole(role) {
    return async (req, res, next) => {
        if (!req.session.userId) return res.status(401).json({ error: 'unauthorized' });
        const u = await User.findById(req.session.userId);
        if (!u || (u.role !== role && u.role !== 'admin')) return res.status(403).json({ error: 'forbidden' });
        next();
    };
}

app.post('/api/auth/register', async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'invalid' });
    const hash = await bcrypt.hash(password, 10);
    try {
        const u = await User.create({ email, passwordHash: hash, role: role || 'buyer' });
        res.json({ id: u._id, email: u.email, role: u.role });
    } catch (e) {
        res.status(400).json({ error: 'exists' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const u = await User.findOne({ email });
    if (!u) return res.status(401).json({ error: 'invalid' });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid' });
    req.session.userId = u._id.toString();
    res.json({ id: u._id, email: u.email, role: u.role });
});
app.get('/api/auth/me', async (req, res) => {
    if (!req.session.userId) return res.json(null);
    const u = await User.findById(req.session.userId);
    if (!u) return res.json(null);
    res.json({ id: u._id, email: u.email, role: u.role });
});
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/products', async (req, res) => {
    const list = await Product.find({}).sort({ createdAt: -1 });
    const mapped = list.map(p => ({ id: p._id, name: p.name, price: p.price, stock: p.stock, description: p.description }));
    res.json(mapped);
});
app.post('/api/products', requireRole('vendor'), async (req, res) => {
    const { name, price, stock, description } = req.body;
    const p = await Product.create({ name, price, stock, description, vendorId: req.session.userId });
    res.json({ id: p._id, name: p.name, price: p.price, stock: p.stock, description: p.description });
});

app.get('/api/orders', requireAuth, async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (u.role === 'admin') {
        const all = await Order.find({}).sort({ createdAt: -1 });
        return res.json(all.map(o => ({ id: o._id, total: o.total, status: o.status })));
    }
    const list = await Order.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.json(list.map(o => ({ id: o._id, total: o.total, status: o.status })));
});
app.post('/api/orders', requireAuth, async (req, res) => {
    const { items } = req.body;
    const dbProducts = await Product.find({ _id: { $in: items.map(i => i.productId) } });
    const byId = new Map(dbProducts.map(p => [p._id.toString(), p]));
    const lines = [];
    let total = 0;
    for (const i of items) {
        const p = byId.get(String(i.productId));
        if (!p) continue;
        const qty = Number(i.qty) || 1;
        const lineTotal = p.price * qty;
        total += lineTotal;
        lines.push({ productId: p._id, name: p.name, price: p.price, qty, lineTotal });
    }
    const o = await Order.create({ userId: req.session.userId, items, lines, total, status: 'placed' });
    res.json({ id: o._id, total: o.total, status: o.status });
});

app.get('/api/admin/users', requireRole('admin'), async (req, res) => {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users.map(u => ({ id: u._id, email: u.email, role: u.role })));
});

app.get('/api/dm', requireAuth, async (req, res) => {
    const msgs = await Message.find({ $or: [{ fromId: 0 }, { toId: 0 }] }).sort({ createdAt: -1 }).limit(50);
    res.json(msgs.map(m => ({ fromId: m.fromId, toId: m.toId, message: m.message })));
});
app.post('/api/dm', requireAuth, async (req, res) => {
    const { toId, message } = req.body;
    const m = await Message.create({ fromId: 0, toId, message });
    const payload = JSON.stringify({ type: 'dm', data: { fromId: 0, toId, message } });
    wss.clients.forEach(c => { try { c.send(payload); } catch { } });
    res.json({ ok: true });
});

app.get('/api/services', async (req, res) => {
    const list = await Service.find({}).sort({ name: 1 });
    res.json(list.map(s => ({ code: s.code, name: s.name, description: s.description, price: s.price, cadence: s.cadence })));
});
app.post('/api/appointments', requireAuth, async (req, res) => {
    const { serviceCode, date } = req.body;
    const a = await Appointment.create({ userId: req.session.userId, serviceCode, date });
    const payload = JSON.stringify({ type: 'appointment', data: { id: a._id, serviceCode, date } });
    wss.clients.forEach(c => { try { c.send(payload); } catch { } });
    res.json({ id: a._id, status: a.status });
});
app.get('/api/appointments', requireAuth, async (req, res) => {
    const list = await Appointment.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.json(list.map(a => ({ id: a._id, serviceCode: a.serviceCode, date: a.date, status: a.status })));
});

const server = app.listen(PORT, async () => {
    const adminEmail = 'admin@plante-tree.local';
    const exists = await User.findOne({ email: adminEmail });
    if (!exists) {
        const hash = await bcrypt.hash('admin123', 10);
        await User.create({ email: adminEmail, passwordHash: hash, role: 'admin' });
    }
    const svcCount = await Service.countDocuments();
    if (!svcCount) {
        await Service.insertMany([
            { code: 'PRUNE_MONTHLY', name: 'Pruning Monthly', description: 'Monthly pruning and shaping', price: 799, cadence: 'monthly' },
            { code: 'FERT_SEASONAL', name: 'Seasonal Fertilization', description: 'Fertilizer application per season', price: 1299, cadence: 'seasonal' },
            { code: 'PEST_CONTROL', name: 'Pest Control', description: 'Inspection and pest management', price: 999, cadence: 'quarterly' }
        ]);
    }
});

const wss = new WebSocketServer({ server });
wss.on('connection', () => { });

setInterval(async () => {
    const payload = JSON.stringify({ type: 'reminder', data: { message: 'Service reminder' } });
    wss.clients.forEach(c => { try { c.send(payload); } catch { } });
}, 60000);


