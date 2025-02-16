// src/routes/groupRoutes.js
import express from 'express';
import groupController from '../controllers/groupController.js';
import auth  from '../middleware/auth.js';
import validationMiddleware from '../middleware/validation.js';

const router = express.Router();

router.post('/',  auth, validationMiddleware.validateGroupCreation, groupController.createGroup);
router.post('/:groupId/members',  auth,validationMiddleware.validateAddMember, groupController.addMember);
router.post('/:groupId/expenses', auth, validationMiddleware.validateExpenseCreation, groupController.addExpense);
export default router;