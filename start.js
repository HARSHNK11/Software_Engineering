import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start the application (no mandatory MongoDB check; app runs with in-memory fallback)
async function startApp() {
    const envPath = path.join(__dirname, 'server', '.env');
    const envProdPath = path.join(__dirname, 'server', '.env.production');
    
    if (!fs.existsSync(envPath) && fs.existsSync(envProdPath)) {
        fs.copyFileSync(envProdPath, envPath);
    }

    const server = spawn('npm', ['run', 'start:prod'], {
        cwd: path.join(__dirname, 'server'),
        stdio: 'inherit',
        shell: true
    });

    server.on('error', (err) => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });

    process.on('SIGINT', () => {
        server.kill();
        process.exit();
    });
}

startApp();