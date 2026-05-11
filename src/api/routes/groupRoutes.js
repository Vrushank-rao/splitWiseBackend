// src/routes/groupRoutes.js
import express from 'express';
import groupController from '../controllers/groupController.js';
import auth  from '../middleware/auth.js';
import validationMiddleware from '../middleware/validation.js';

const router = express.Router();

router.post('/', auth, validationMiddleware.validateGroupCreation.bind(validationMiddleware), groupController.createGroup);
router.get('/', auth, groupController.getUserGroups);
router.get('/:groupId', auth, groupController.getGroupDetails);
router.post('/:groupId/members', auth, validationMiddleware.validateAddMember.bind(validationMiddleware), groupController.addMember);
router.post('/:groupId/expenses', auth, validationMiddleware.validateExpenseCreation.bind(validationMiddleware), groupController.addExpense);
router.get('/:groupId/expenses', auth, groupController.getGroupExpenses);
export default router;