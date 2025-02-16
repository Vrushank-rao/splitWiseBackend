// src/controllers/groupController.js
import groupService from '../../services/groupService.js';

class GroupController {
    async createGroup(req, res, next) {
        try {
            const { name } = req.validatedData;
            const userId = req.user.id;
            const group = await groupService.createGroup(name, userId);
            res.status(201).json(group);
        } catch (error) {
            next(error);
        }
    }

    async addMember(req, res, next) {
        try {
            const { groupId } = req.params;
            const { email } = req.validatedData;
            const userId = req.user.id;
            const result = await groupService.addMemberToGroup(groupId, email, userId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
    async addExpense(req, res, next) {
        try {
            // The expense data has already been validated by the middleware
            const expenseData = req.validatedExpense;
            const userId = req.user.id;
            
            const expense = await groupService.addExpenseToGroup(expenseData, userId);
            res.status(201).json(expense);
        } catch (error) {
            next(error);
        }
    }
}

const groupController = new GroupController();
export default groupController;