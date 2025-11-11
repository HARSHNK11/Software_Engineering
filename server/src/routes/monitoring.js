import express from 'express';
import os from 'os';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        // System metrics
        const metrics = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: process.memoryUsage()
            },
            cpu: {
                load: os.loadavg(),
                cores: os.cpus().length
            },
            database: {
                status: dbStatus,
                connections: mongoose.connection.states
            }
        };

        res.json({
            status: 'healthy',
            ...metrics
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

export default router;