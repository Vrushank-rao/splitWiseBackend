// src/api/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Handle Prisma errors
    if (err.code) {
        switch (err.code) {
            case 'P2002': // Unique constraint violation
                return res.status(409).json({
                    error: 'Resource already exists'
                });
            case 'P2025': // Record not found
                return res.status(404).json({
                    error: 'Resource not found'
                });
        }
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.details
        });
    }

    // Default error response
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
};