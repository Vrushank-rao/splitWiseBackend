// src/api/routes/index.js
//This contains all the locations to other routers
import express from 'express';
import userRoutes from './userRoutes.js';
import groupRoutes from './groupRoutes.js';
import settlementRoutes from './settlementRoutes.js';
const router = express.Router();


// Mount routes
router.use('/users', userRoutes);
router.use('/groups',groupRoutes);
router.use('/settlements', settlementRoutes);
export default router;