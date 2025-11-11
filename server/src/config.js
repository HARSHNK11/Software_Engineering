import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load appropriate .env file based on environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

export const config = {
    port: process.env.PORT || 4000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plante_tree',
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    clientOrigin: process.env.CLIENT_ORIGIN,
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET
    },
    isProduction: process.env.NODE_ENV === 'production',
    security: {
        bcryptRounds: 12,
        cookieSecure: process.env.NODE_ENV === 'production',
        cookieSameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
};

// Validate required configuration
const requiredConfigs = [
    'mongoUri',
    'jwtSecret',
    'sessionSecret',
    'clientOrigin',
    'razorpay.keyId',
    'razorpay.keySecret'
];

for (const cfg of requiredConfigs) {
    const keys = cfg.split('.');
    let value = config;
    for (const key of keys) {
        value = value[key];
    }
    if (!value) {
        throw new Error(`Missing required configuration: ${cfg}`);
    }
}