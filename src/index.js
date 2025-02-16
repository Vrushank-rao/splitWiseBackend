// src/index.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import routes from './api/routes/index.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import { requestLogger } from './api/middleware/requestLogger.js';
import { apiLimiter } from './api/middleware/rateLimit.js';

// Initialize Express application
const app = express();
const prisma = new PrismaClient();

// Setting up essential middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true // This allows cookies to be sent with requests
}));

app.use(cookieParser()); // Parse cookies from requests
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Apply request logging in non-production environments
if (process.env.NODE_ENV !== 'production') {
    app.use(requestLogger);
}

// Apply rate limiting to all routes
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Mount API routes
app.use('/api', routes);

// Error handling middleware should be last
app.use(errorHandler);

// Database connection and server startup
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('Successfully connected to database');

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log(`Database URL: ${process.env.DATABASE_URL}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Starting graceful shutdown...');
    
    try {
        await prisma.$disconnect();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Start the server
startServer().catch(error => {
    console.error('Startup error:', error);
    process.exit(1);
});

// Export app for testing purposes
export default app;