// src/controllers/groupController.js
import groupService from '../../services/groupService.js';

class GroupController {
    async createGroup(req, res, next) {
        try {
            const { name,members } = req.validatedData;
            const userId = req.user.id;
            const group = await groupService.createGroup(name, userId,members);
            res.status(201).json(group);
        } catch (error) {
            next(error);
        }
    }

    async addMember(req, res, next) {
        try {
            const { userIds, groupId, notFoundEmails } = req.validatedData;
            const requesterId = req.user.id;
            
            // Track successful and failed additions
            const results = {
                successful: [],
                failed: [],
                notFound: notFoundEmails || []
            };
            
            // Add each user to the group
            for (const userId of userIds) {
                try {
                    await groupService.addMemberToGroup(groupId, userId, requesterId);
                    results.successful.push(userId);
                } catch (error) {
                    results.failed.push({
                        userId,
                        reason: error.message
                    });
                }
            }
            
            // Prepare a user-friendly response
            const response = {
                message: `Added ${results.successful.length} members to the group`,
                details: results
            };
            
            if (results.notFound.length > 0) {
                response.message += `. ${results.notFound.length} emails not found`;
            }
            
            if (results.failed.length > 0) {
                response.message += `. ${results.failed.length} additions failed`;
            }
            
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
    async addExpense(req, res, next) {
        try {
            const expenseData = req.validatedExpense;
            const userId = req.user.id;
            const expense = await groupService.addExpenseToGroup(expenseData, userId);
            res.status(201).json(expense);
        } catch (error) {
            next(error);
        }
    }

    async getUserGroups(req, res, next) {
        try {
            const groups = await groupService.getUserGroups(req.user.id);
            res.status(200).json(groups);
        } catch (error) {
            next(error);
        }
    }

    async getGroupDetails(req, res, next) {
        try {
            const group = await groupService.getGroupDetails(req.params.groupId, req.user.id);
            res.status(200).json(group);
        } catch (error) {
            next(error);
        }
    }

    async getGroupExpenses(req, res, next) {
        try {
            const expenses = await groupService.getGroupExpenses(req.params.groupId, req.user.id);
            res.status(200).json(expenses);
        } catch (error) {
            next(error);
        }
    }
}

const groupController = new GroupController();
export default groupController;