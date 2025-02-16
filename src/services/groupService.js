// src/services/groupService.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class GroupService {
    constructor(PrismaClient) {
        this.prisma = PrismaClient;
    }

    async createGroup(name, userId) {
        try {
            const group = await this.prisma.$transaction(async (tx) => {
                const newGroup = await tx.group.create({
                    data: { name }
                });

                await tx.userGroup.create({
                    data: {
                        userId,
                        groupId: newGroup.id
                    }
                });

                return newGroup;
            });

            return group;
        } catch (error) {
            throw error;
        }
    }

    async addMemberToGroup(groupId, email, requesterId) {
        try {
            const requesterMembership = await this.prisma.userGroup.findUnique({
                where: {
                    userId_groupId: {
                        userId: requesterId,
                        groupId
                    }
                }
            });

            if (!requesterMembership) {
                throw new Error('Not authorized to add members to this group');
            }

            const user = await this.prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                throw new Error('User not found with this email');
            }

            const existingMembership = await this.prisma.userGroup.findUnique({
                where: {
                    userId_groupId: {
                        userId: user.id,
                        groupId
                    }
                }
            });

            if (existingMembership) {
                throw new Error('User is already a member of this group');
            }

            await this.prisma.userGroup.create({
                data: {
                    userId: user.id,
                    groupId
                }
            });

            return { message: 'Member added successfully' };
        } catch (error) {
            throw error;
        }
    }

    async addExpenseToGroup(expenseData, userId) {
        try {
            // First verify that the user is a member of the group
            const userGroupMembership = await this.prisma.userGroup.findUnique({
                where: {
                    userId_groupId: {
                        userId: userId,
                        groupId: expenseData.groupId
                    }
                }
            });

            if (!userGroupMembership) {
                throw new Error('User is not a member of this group');
            }

            // Calculate individual split amounts based on splitType
            const splits = await this.calculateSplits(
                expenseData.amount,
                expenseData.splitType,
                expenseData.splits,
                expenseData.groupId
            );

            // Create the expense and its splits in a transaction
            const expense = await this.prisma.$transaction(async (tx) => {
                // Create the main expense record
                const newExpense = await tx.expense.create({
                    data: {
                        amount: expenseData.amount,
                        description: expenseData.description,
                        paidById: userId,
                        groupId: expenseData.groupId,
                        splitType: expenseData.splitType
                    }
                });

                // Create all the split records
                const splitPromises = splits.map(split => 
                    tx.expenseSplit.create({
                        data: {
                            expenseId: newExpense.id,
                            userId: split.userId,
                            amount: split.amount,
                            percentage: split.percentage,
                            shares: split.shares
                        }
                    })
                );

                await Promise.all(splitPromises);

                return newExpense;
            });

            return expense;
        } catch (error) {
            throw error;
        }
    }

    async calculateSplits(totalAmount, splitType, splits, groupId) {
        // Verify all users in splits are group members
        await this.verifyGroupMembers(splits.map(s => s.userId), groupId);

        switch (splitType) {
            case 'EQUAL': {
                // For equal splits, divide total amount by number of participants
                const splitAmount = totalAmount / splits.length;
                return splits.map(split => ({
                    userId: split.userId,
                    amount: splitAmount
                }));
            }

            case 'EXACT': {
                // For exact splits, verify total matches expense amount
                const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
                if (Math.abs(totalSplit - totalAmount) > 0.01) {
                    throw new Error('Split amounts must equal total expense amount');
                }
                return splits;
            }

            case 'PERCENTAGE': {
                // For percentage splits, verify percentages total 100
                const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
                if (Math.abs(totalPercentage - 100) > 0.01) {
                    throw new Error('Percentages must total 100%');
                }
                
                return splits.map(split => ({
                    userId: split.userId,
                    percentage: split.percentage,
                    amount: (split.percentage / 100) * totalAmount
                }));
            }

            case 'SHARES': {
                // For share splits, calculate based on proportion of total shares
                const totalShares = splits.reduce((sum, split) => sum + split.shares, 0);
                return splits.map(split => ({
                    userId: split.userId,
                    shares: split.shares,
                    amount: (split.shares / totalShares) * totalAmount
                }));
            }

            default:
                throw new Error('Invalid split type');
        }
    }

    async verifyGroupMembers(userIds, groupId) {
        const groupMembers = await this.prisma.userGroup.findMany({
            where: {
                groupId,
                userId: {
                    in: userIds
                }
            }
        });

        if (groupMembers.length !== userIds.length) {
            throw new Error('All users must be members of the group');
        }
    }
}

const groupService = new GroupService(prisma);
export default groupService;