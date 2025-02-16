// src/routes/settlementRoutes.js
import express from 'express';
import settlementController from '../controllers/settlementController.js';
import auth from '../middleware/auth.js';
import validationMiddleware from '../middleware/validation.js';

const router = express.Router();

router.post('/', 
    auth, 
    validationMiddleware.validateSettlementCreation, 
    settlementController.createSettlement
);

router.get('/group/:groupId',
    auth,
    settlementController.getGroupSettlements
);

router.get('/user',
    auth,
    settlementController.getUserSettlements
);

export default router;