// src/tests/setup.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Test data configuration
const TEST_USERS = [
    { name: 'Alice Smith', email: 'alice@test.com', phone: '1234567890' },
    { name: 'Bob Johnson', email: 'bob@test.com', phone: '2345678901' },
    { name: 'Charlie Brown', email: 'charlie@test.com', phone: '3456789012' },
    { name: 'David Wilson', email: 'david@test.com', phone: '4567890123' },
    { name: 'Eva Davis', email: 'eva@test.com', phone: '5678901234' },
    { name: 'Frank Miller', email: 'frank@test.com', phone: '6789012345' },
    { name: 'Grace Lee', email: 'grace@test.com', phone: '7890123456' },
    { name: 'Henry Garcia', email: 'henry@test.com', phone: '8901234567' },
    { name: 'Ivy Chen', email: 'ivy@test.com', phone: '9012345678' },
    { name: 'Jack Taylor', email: 'jack@test.com', phone: '0123456789' }
];

const TEST_GROUPS = [
    { 
        name: 'Roommates',
        members: [0, 1, 2, 3] // indices from TEST_USERS
    },
    {
        name: 'Travel Group',
        members: [2, 4, 5, 6, 7] // Charlie is in both groups
    },
    {
        name: 'Dinner Club',
        members: [1, 5, 7, 8, 9] // Frank and Henry in multiple groups
    }
];

// Helper to create test expenses for a group
const createGroupExpenses = async (groupId, memberIds, count) => {
    const expenses = [];
    const splitTypes = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'];
    
    for (let i = 0; i < count; i++) {
        const amount = Math.floor(Math.random() * 900) + 100; // Random amount between 100-1000
        const paidById = memberIds[Math.floor(Math.random() * memberIds.length)];
        const splitType = splitTypes[Math.floor(Math.random() * splitTypes.length)];
        
        let splits;
        switch (splitType) {
            case 'EQUAL':
                splits = memberIds.map(userId => ({
                    userId,
                    amount: amount / memberIds.length
                }));
                break;
            case 'EXACT':
                // Randomly divide amount among members
                splits = memberIds.map((userId, index) => {
                    const isLast = index === memberIds.length - 1;
                    const remaining = amount - splits?.reduce((sum, s) => sum + s.amount, 0) || 0;
                    return {
                        userId,
                        amount: isLast ? remaining : Math.floor(amount / memberIds.length)
                    };
                });
                break;
            case 'PERCENTAGE':
                // Randomly assign percentages that sum to 100
                splits = memberIds.map((userId, index) => {
                    const isLast = index === memberIds.length - 1;
                    const remaining = 100 - splits?.reduce((sum, s) => sum + s.percentage, 0) || 0;
                    const percentage = isLast ? remaining : Math.floor(100 / memberIds.length);
                    return {
                        userId,
                        percentage,
                        amount: (percentage / 100) * amount
                    };
                });
                break;
            case 'SHARES':
                // Assign random shares
                const shares = memberIds.map(() => Math.floor(Math.random() * 5) + 1);
                const totalShares = shares.reduce((sum, share) => sum + share, 0);
                splits = memberIds.map((userId, index) => ({
                    userId,
                    shares: shares[index],
                    amount: (shares[index] / totalShares) * amount
                }));
                break;
        }

        const expense = await prisma.expense.create({
            data: {
                amount,
                description: `Test Expense ${i + 1}`,
                paidById,
                groupId,
                splitType,
                splits: {
                    create: splits
                }
            }
        });
        
        expenses.push(expense);
    }
    
    return expenses;
};

// Setup test database
export const setupTestData = async () => {
    // Clear existing data
    await prisma.$transaction([
        prisma.expenseSplit.deleteMany(),
        prisma.expense.deleteMany(),
        prisma.userGroup.deleteMany(),
        prisma.group.deleteMany(),
        prisma.settlement.deleteMany(),
        prisma.user.deleteMany()
    ]);

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = await Promise.all(
        TEST_USERS.map(user => 
            prisma.user.create({
                data: {
                    ...user,
                    password: hashedPassword
                }
            })
        )
    );

    // Create groups and add members
    const groups = await Promise.all(
        TEST_GROUPS.map(async groupData => {
            const group = await prisma.group.create({
                data: { name: groupData.name }
            });

            // Add members to group
            await Promise.all(
                groupData.members.map(userIndex =>
                    prisma.userGroup.create({
                        data: {
                            userId: users[userIndex].id,
                            groupId: group.id
                        }
                    })
                )
            );

            // Create 30 test expenses for each group
            await createGroupExpenses(
                group.id,
                groupData.members.map(index => users[index].id),
                30
            );

            return group;
        })
    );

    return { users, groups };
};

// Cleanup test database
export const cleanupTestData = async () => {
    await prisma.$transaction([
        prisma.expenseSplit.deleteMany(),
        prisma.expense.deleteMany(),
        prisma.userGroup.deleteMany(),
        prisma.group.deleteMany(),
        prisma.settlement.deleteMany(),
        prisma.user.deleteMany()
    ]);
};