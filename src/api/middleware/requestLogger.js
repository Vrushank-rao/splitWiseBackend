// src/api/middleware/requestLogger.js
export const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log request details
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

    // Once response is finished, log the response time
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.path} ` +
            `${res.statusCode} ${duration}ms`
        );
    });

    next();
};