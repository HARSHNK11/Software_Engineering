const API = window.API_BASE_URL || window.location.origin;

// Helper function to handle API responses
async function handleApiResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || 'API Error');
        } catch (e) {
            throw new Error('Network response was not ok');
        }
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    throw new Error('Invalid response format');
}
let cart = [];

function headers() { return { 'Content-Type': 'application/json' }; }

async function login(email, pass) {
    try {
        const r = await fetch(API + '/api/auth/login', { 
            method: 'POST', 
            credentials: 'include', 
            headers: headers(), 
            body: JSON.stringify({ email, password: pass }) 
        });
        if (!r.ok) {
            const errorData = await r.json().catch(() => ({}));
            if (r.status === 429) {
                throw new Error(errorData.message || 'Too many login attempts. Please try again later.');
            }
            if (r.status === 401) {
                throw new Error('Invalid email or password. Please check your credentials.');
            }
            throw new Error(errorData.error || 'Login failed. Please try again.');
        }
        return await r.json();
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

async function register(email, pass, role, name = '') {
    try {
        const r = await fetch(API + '/api/auth/register', { 
            method: 'POST', 
            credentials: 'include', 
            headers: headers(), 
            body: JSON.stringify({ email, password: pass, role, name }) 
        });
        return await handleApiResponse(r);
    } catch (error) {
        console.error('Registration error:', error);
        if (error.message.includes('User already exists') || error.message.includes('User exists')) {
            throw new Error('This email is already registered. Please login instead.');
        }
        if (error.message.includes('Validation failed')) {
            throw new Error('Please check your email and password format.');
        }
        if (error.message.includes('Password must')) {
            throw new Error(error.message);
        }
        throw new Error(error.message || 'Registration failed. Please try again.');
    }
}

async function me() {
    try {
        const r = await fetch(API + '/api/auth/me', { credentials: 'include' });
        return await handleApiResponse(r);
    } catch (error) {
        console.error('Auth check error:', error);
        throw error;
    }
}

async function logout() {
    try {
        const r = await fetch(API + '/api/auth/logout', { 
            method: 'POST', 
            credentials: 'include' 
        });
        return await handleApiResponse(r);
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

async function getProfile() {
    const r = await fetch(API + '/api/profile', { credentials: 'include' });
    return handleApiResponse(r);
}

async function updateProfile(data) {
    const r = await fetch(API + '/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return handleApiResponse(r);
}

async function listProducts() {
    try {
        const r = await fetch(API + '/api/products');
        return await handleApiResponse(r);
    } catch (error) {
        console.error('List products error:', error);
        throw error;
    }
}

async function addProduct(name, price, stock, description) {
    try {
        const r = await fetch(API + '/api/products', { 
            method: 'POST', 
            credentials: 'include', 
            headers: headers(), 
            body: JSON.stringify({ 
                name, 
                price: Number(price), 
                stock: Number(stock), 
                description 
            }) 
        });
        return await handleApiResponse(r);
    } catch (error) {
        console.error('Add product error:', error);
        throw error;
    }
}

async function listOrders() {
    try {
        const r = await fetch(API + '/api/orders', { credentials: 'include' });
        return await handleApiResponse(r);
    } catch (error) {
        console.error('List orders error:', error);
        throw error;
    }
}

async function checkout() {
    try {
        const r = await fetch(API + '/api/orders', { 
            method: 'POST', 
            credentials: 'include', 
            headers: headers(), 
            body: JSON.stringify({ items: cart }) 
        });
        return await handleApiResponse(r);
    } catch (error) {
        console.error('Checkout error:', error);
        throw error;
    }
}

// Razorpay payment functions
async function createRazorpayOrder() {
    const r = await fetch(API + '/api/payments/create-order', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify({ items: cart }) });
    return r.json();
}

async function verifyPayment(paymentData) {
    const r = await fetch(API + '/api/payments/verify', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(paymentData) });
    return r.json();
}

async function checkoutWithRazorpay() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    // Check if Razorpay is loaded
    if (typeof Razorpay === 'undefined') {
        alert('Razorpay SDK not loaded. Please refresh the page and try again.');
        console.error('Razorpay SDK not available');
        return;
    }
    
    try {
        // Create Razorpay order
        const orderData = await createRazorpayOrder();
        if (orderData.error) {
            alert('Error creating order: ' + orderData.error + (orderData.details ? '\n' + orderData.details : ''));
            console.error('Order creation error:', orderData);
            return;
        }
        
        // Validate order data
        if (!orderData.key || !orderData.id || !orderData.amount) {
            alert('Invalid order data received. Please try again.');
            console.error('Invalid order data:', orderData);
            return;
        }
        
        // Open Razorpay checkout
        const options = {
            key: orderData.key,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'Plant-E-Tree',
            description: 'Plant Purchase',
            order_id: orderData.id,
            handler: async function (response) {
                // Payment successful, verify on server
                try {
                    const verifyData = {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        items: cart
                    };
                    
                    const result = await verifyPayment(verifyData);
                    if (result.verified && result.order) {
                        alert('Payment successful! Order #' + result.order.id + ' placed.');
                        cart = [];
                        renderCart();
                        const ords = await listOrders();
                        renderOrders(ords, 'orders');
                    } else {
                        alert('Payment verification failed. Please contact support.');
                    }
                } catch (error) {
                    console.error('Verification error:', error);
                    alert('Error verifying payment. Please contact support.');
                }
            },
            prefill: {
                name: '',
                email: '',
                contact: ''
            },
            theme: {
                color: '#2e8b57'
            },
            modal: {
                ondismiss: function() {
                    console.log('Payment cancelled');
                }
            }
        };
        
        try {
            const razorpay = new Razorpay(options);
            razorpay.open();
            razorpay.on('payment.failed', function (response) {
                alert('Payment failed: ' + (response.error?.description || 'Unknown error'));
                console.error('Payment failed:', response);
            });
        } catch (razorpayError) {
            console.error('Razorpay initialization error:', razorpayError);
            alert('Error opening payment window: ' + razorpayError.message);
        }
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error initiating payment: ' + (error.message || 'Unknown error') + '\n\nPlease check the browser console for details.');
    }
}

async function sendDM(toId, message) {
    const r = await fetch(API + '/api/dm', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify({ toId: Number(toId), message }) });
    return r.json();
}
async function listDM() { const r = await fetch(API + '/api/dm', { credentials: 'include' }); return r.json(); }

async function listServices() { const r = await fetch(API + '/api/services'); return r.json(); }
async function listAppointments() { const r = await fetch(API + '/api/appointments', { credentials: 'include' }); return r.json(); }
async function bookAppointment(serviceCode, date) { const r = await fetch(API + '/api/appointments', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify({ serviceCode, date }) }); return r.json(); }

function renderProducts(list) {
    const el = document.getElementById('products');
    if (!el) return;
    const getImage = typeof getPlantImage !== 'undefined' ? getPlantImage : (name) => 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop';
    el.innerHTML = list.map(p => `
        <div class="product-card">
            <div class="product-image">
                <img src="${getImage(p.name)}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${p.name}</h3>
                <p class="product-description">${p.description || ''}</p>
                <div class="product-details">
                    <span class="product-price">Rs.${p.price}</span>
                    <span class="product-stock">Stock: ${p.stock}</span>
                </div>
                ${p.category ? `<span class="product-category">${p.category}</span>` : ''}
                ${p.vendorName ? `<div class="product-vendor">By ${p.vendorName}</div>` : ''}
                <button data-id="${p.id}" class="btn add-to-cart">Add to Cart</button>
            </div>
        </div>
    `).join('');
    el.querySelectorAll('button.add-to-cart, button.add').forEach(b => {
        b.onclick = () => {
            const pid = Number(b.getAttribute('data-id'));
            const existing = cart.find(c => c.productId === pid);
            if (existing) existing.qty += 1; else cart.push({ productId: pid, qty: 1 });
            renderCart();
        };
    });
}
function renderCart() {
    const el = document.getElementById('cart');
    if (!el) return;
    if (cart.length === 0) {
        el.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 1rem;">Your cart is empty</p>';
        return;
    }
    el.innerHTML = cart.map(c => {
        const product = Array.from(document.querySelectorAll('.product-card')).find(card => {
            const btn = card.querySelector('button[data-id]');
            return btn && Number(btn.getAttribute('data-id')) === c.productId;
        });
        const productName = product ? product.querySelector('.product-name')?.textContent || `Product ${c.productId}` : `Product ${c.productId}`;
        return `<div class="cart-item">
            <span>${productName}</span>
            <span>Qty: ${c.qty}</span>
        </div>`;
    }).join('');
}
function renderOrders(list, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = list.map(o => `<div>Order #${o.id} - Rs.${o.total} (${o.status})</div>`).join('');
}
function renderInventory(list) {
    const el = document.getElementById('inventory');
    if (!el) return;
    el.innerHTML = list.map(p => `<div class="inventory-item">#${p.id} <b>${p.name}</b> • Rs.${p.price} • stock ${p.stock}${p.vendorName ? ` • ${p.vendorName}` : ''}</div>`).join('');
}

function showBuyerMessage(message, type = 'error') {
    const container = document.getElementById('buyer-message-container');
    if (container) {
        container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => { container.innerHTML = ''; }, 5000);
    }
}

async function checkBuyerAuth() {
    const authSection = document.getElementById('buyer-auth-section');
    const loggedInSection = document.getElementById('buyer-logged-in');
    const userInfo = document.getElementById('buyer-user-info');
    
    try {
        const userData = await me();
        if (userData && userData.user) {
            if (authSection) authSection.style.display = 'none';
            if (loggedInSection) loggedInSection.style.display = 'block';
            if (userInfo) userInfo.textContent = `Logged in as: ${userData.user.email} (${userData.user.role})`;
            return true;
        }
    } catch {
        if (authSection) authSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
    }
    return false;
}

const buyerLogoutBtn = document.getElementById('buyer-logout');
if (buyerLogoutBtn) {
    buyerLogoutBtn.onclick = async () => {
        try {
            await logout();
            showBuyerMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            showBuyerMessage('Logout failed', 'error');
        }
    };
}

(async () => {
    const isAuthenticated = await checkBuyerAuth();
    if (isAuthenticated) {
        try {
            const prods = await listProducts();
            renderProducts(prods);
            const ords = await listOrders();
            renderOrders(ords, 'orders');
        } catch (error) {
            console.error('Failed to load buyer data:', error);
        }
    }
})();

function showVendorMessage(message, type = 'error') {
    const container = document.getElementById('vendor-message-container');
    if (container) {
        container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => { container.innerHTML = ''; }, 5000);
    }
}

async function checkVendorAuth() {
    const authSection = document.getElementById('vendor-auth-section');
    const loggedInSection = document.getElementById('vendor-logged-in');
    const userInfo = document.getElementById('vendor-user-info');
    
    try {
        const userData = await me();
        if (userData && userData.user && (userData.user.role === 'vendor' || userData.user.role === 'admin')) {
            if (authSection) authSection.style.display = 'none';
            if (loggedInSection) loggedInSection.style.display = 'block';
            if (userInfo) userInfo.textContent = `Logged in as: ${userData.user.email} (${userData.user.role})`;
            return true;
        }
    } catch {
        if (authSection) authSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
    }
    return false;
}

const vendorLogoutBtn = document.getElementById('vendor-logout');
if (vendorLogoutBtn) {
    vendorLogoutBtn.onclick = async () => {
        try {
            await logout();
            showVendorMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            showVendorMessage('Logout failed', 'error');
        }
    };
}

(async () => {
    const isAuthenticated = await checkVendorAuth();
    if (isAuthenticated) {
        try {
            const prods = await listProducts();
            renderInventory(prods);
            const ords = await listOrders();
            renderOrders(ords, 'vorders');
        } catch (error) {
            console.error('Failed to load vendor data:', error);
        }
    }
})();
const addProductBtn = document.getElementById('add-product');
if (addProductBtn) addProductBtn.onclick = async () => {
    const name = document.getElementById('pname').value;
    const price = document.getElementById('pprice').value;
    const stock = document.getElementById('pstock').value;
    const description = document.getElementById('pdesc').value;
    await addProduct(name, Number(price), Number(stock), description);
    const prods = await listProducts();
    renderInventory(prods);
};

function showAdminMessage(message, type = 'error') {
    const container = document.getElementById('admin-message-container');
    if (container) {
        container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => { container.innerHTML = ''; }, 5000);
    }
}

async function checkAdminAuth() {
    const authSection = document.getElementById('admin-auth-section');
    const loggedInSection = document.getElementById('admin-logged-in');
    const userInfo = document.getElementById('admin-user-info');
    
    try {
        const userData = await me();
        if (userData && userData.user && userData.user.role === 'admin') {
            if (authSection) authSection.style.display = 'none';
            if (loggedInSection) loggedInSection.style.display = 'block';
            if (userInfo) userInfo.textContent = `Logged in as: ${userData.user.email} (Admin)`;
            return true;
        } else {
            if (authSection) authSection.style.display = 'block';
            if (loggedInSection) loggedInSection.style.display = 'none';
        }
    } catch {
        if (authSection) authSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
    }
    return false;
}

const adminLogoutBtn = document.getElementById('admin-logout');
if (adminLogoutBtn) {
    adminLogoutBtn.onclick = async () => {
        try {
            await logout();
            showAdminMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            showAdminMessage('Logout failed', 'error');
        }
    };
}

(async () => {
    const isAuthenticated = await checkAdminAuth();
    if (isAuthenticated) {
        try {
            const r = await fetch(API + '/api/admin/users', { credentials: 'include' });
            const users = await r.json();
            const el = document.getElementById('users');
            if (el) el.innerHTML = users.map(u => `<div class="user-item">#${u.id} ${u.email} (${u.role})</div>`).join('');
        } catch (error) {
            console.error('Failed to load admin data:', error);
            showAdminMessage('Failed to load users', 'error');
        }
    }
})();

// Buyer checkout with Razorpay
const checkoutBtn = document.getElementById('checkout');
if (checkoutBtn) checkoutBtn.onclick = async () => {
    await checkoutWithRazorpay();
};

// DM
const sendBtn = document.getElementById('send');
if (sendBtn) sendBtn.onclick = async () => {
    const toId = document.getElementById('toId').value;
    const msg = document.getElementById('message').value;
    await sendDM(toId, msg);
    const msgs = await listDM();
    const el = document.getElementById('dm-list');
    if (el) el.innerHTML = msgs.map(m => `<div>${m.fromId} -> ${m.toId}: ${m.message}</div>`).join('');
};

const servicesContainer = document.getElementById('services');
const appointmentsContainer = document.getElementById('appointments');
const svcBookBtn = document.getElementById('svc-book');
(async () => {
    try {
        if (servicesContainer) {
            const svcs = await listServices();
            servicesContainer.innerHTML = svcs.map(s => `<div class="card"><b>${s.name}</b><div>${s.description}</div><div>Rs.${s.price} • ${s.cadence}</div><button class="btn add-svc" data-code="${s.code}">Select</button></div>`).join('');
            servicesContainer.querySelectorAll('button.add-svc').forEach(b => {
                b.onclick = () => {
                    const code = b.getAttribute('data-code');
                    const sel = document.getElementById('svc-code');
                    if (sel) sel.value = code;
                };
            });
        }
        if (appointmentsContainer) {
            const apps = await listAppointments();
            appointmentsContainer.innerHTML = apps.map(a => `<div>#${a.id} ${a.serviceCode} on ${a.date} (${a.status})</div>`).join('');
        }
    } catch { }
})();
if (svcBookBtn) svcBookBtn.onclick = async () => {
    const code = document.getElementById('svc-code').value;
    const date = document.getElementById('svc-date').value;
    await bookAppointment(code, date);
    const apps = await listAppointments();
    if (appointmentsContainer) appointmentsContainer.innerHTML = apps.map(a => `<div>#${a.id} ${a.serviceCode} on ${a.date} (${a.status})</div>`).join('');
};

(async () => {
    try { 
        const prods = await listProducts(); 
        renderProducts(prods); 
    } catch { }
    
    try {
        const userData = await me();
        if (userData && userData.user) {
            const role = userData.user.role;
            if (role === 'admin') {
                const adminSection = document.getElementById('admin-auth-section');
                const adminLoggedIn = document.getElementById('admin-logged-in');
                const adminUserInfo = document.getElementById('admin-user-info');
                if (adminSection) adminSection.style.display = 'none';
                if (adminLoggedIn) adminLoggedIn.style.display = 'block';
                if (adminUserInfo) adminUserInfo.textContent = `Logged in as: ${userData.user.email} (Admin)`;
                
                const r = await fetch(API + '/api/admin/users', { credentials: 'include' });
                const users = await r.json();
                const el = document.getElementById('users');
                if (el) el.innerHTML = users.map(u => `<div>#${u.id} ${u.email} (${u.role})</div>`).join('');
            }
        }
    } catch {}
})();

try {
    const ws = new WebSocket((API.replace('http', 'ws')));
    ws.onmessage = (e) => {
        const { type, data } = JSON.parse(e.data);
        if (type === 'dm') {
            const item = document.createElement('div');
            item.textContent = `${data.fromId} -> ${data.toId}: ${data.message}`;
            const container = document.getElementById('dm-list');
            if (container) container.prepend(item);
        }
    };
} catch { }






// Profile page handlers
(async () => {
    try {
        const form = document.getElementById('profile-form');
        if (!form) return;
        const statusEl = document.getElementById('p-status');
        const emailEl = document.getElementById('p-email');
        const roleEl = document.getElementById('p-role');
        const nameEl = document.getElementById('p-name');
        const avatarEl = document.getElementById('p-avatar');
        const avatarPrev = document.getElementById('avatar-preview');
        const phoneEl = document.getElementById('p-phone');
        const addressEl = document.getElementById('p-address');
        const bioEl = document.getElementById('p-bio');

        const meData = await getProfile();
        emailEl.value = meData.email || '';
        roleEl.value = meData.role || '';
        if (meData.profile) {
            nameEl.value = meData.profile.name || '';
            avatarEl.value = meData.profile.avatarUrl || '';
            phoneEl.value = meData.profile.phone || '';
            addressEl.value = meData.profile.address || '';
            bioEl.value = meData.profile.bio || '';
            const img = meData.profile.avatarUrl || (typeof getPlantImage !== 'undefined' ? getPlantImage('Snake Plant (Sansevieria)') : '');
            if (avatarPrev) avatarPrev.src = img;
        }

        avatarEl.addEventListener('input', () => {
            if (avatarPrev) avatarPrev.src = avatarEl.value || (typeof getPlantImage !== 'undefined' ? getPlantImage('Snake Plant (Sansevieria)') : '');
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            statusEl.textContent = '';
            const payload = {
                name: nameEl.value,
                avatarUrl: avatarEl.value,
                phone: phoneEl.value,
                address: addressEl.value,
                bio: bioEl.value
            };
            try {
                const res = await updateProfile(payload);
                statusEl.textContent = 'Saved';
                if (res.profile?.avatarUrl && avatarPrev) avatarPrev.src = res.profile.avatarUrl;
            } catch {
                statusEl.style.color = 'crimson';
                statusEl.textContent = 'Failed to save';
            }
        });
    } catch {}
})();

