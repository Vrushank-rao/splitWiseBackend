// src/services/userService.js
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
prisma.$connect().then(() => console.log('Connected!')).catch(console.error)
class UserService {
    constructor(PrismaClient) {
        this.prisma = PrismaClient;
    }

    async registerUser(userData) {
        try {
            const { name, email, phone, password } = userData;

            // Check if user already exists
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { email },
                        { phone }
                    ]
                }
            });

            if (existingUser) {
                throw new Error('User already exists with this email or phone');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create new user
            const newUser = await this.prisma.user.create({
                data: {
                    email,
                    phone,
                    name,
                    password: hashedPassword
                }
            });

            // Remove password from response
            const { password: _, ...userWithoutPassword } = newUser;
            return userWithoutPassword;
        } catch (error) {
            throw error;
        }
    }

    async loginUser(email, password) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                throw new Error('User not found');
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid password');
            }

            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '24h' }
            );

            const { password: _, ...userWithoutPassword } = user;
            return { user: userWithoutPassword, token };
        } catch (error) {
            throw error;
        }
    }

    async getUserProfile(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    userGroups: {
                        include: {
                            group: true
                        }
                    }
                }
            });

            if (!user) {
                throw new Error('User not found');
            }

            return user;
        } catch (error) {
            throw error;
        }
    }

    async getUserBalances(userId) {
        try {
            // Splits where user owes the payer
            const userSplits = await this.prisma.expenseSplit.findMany({
                where: { userId, isSettled: false },
                include: { expense: { select: { paidById: true } } }
            });

            // Expenses paid by user — others owe user
            const paidExpenses = await this.prisma.expense.findMany({
                where: { paidById: userId },
                include: {
                    splits: { where: { userId: { not: userId }, isSettled: false } }
                }
            });

            // Settlements between users
            const settlements = await this.prisma.settlement.findMany({
                where: {
                    OR: [{ fromUserId: userId }, { toUserId: userId }]
                }
            });

            const balances = new Map();

            for (const split of userSplits) {
                const payerId = split.expense.paidById;
                if (payerId !== userId) {
                    balances.set(payerId, (balances.get(payerId) || 0) - Number(split.amount));
                }
            }

            for (const expense of paidExpenses) {
                for (const split of expense.splits) {
                    balances.set(split.userId, (balances.get(split.userId) || 0) + Number(split.amount));
                }
            }

            for (const settlement of settlements) {
                if (settlement.fromUserId === userId) {
                    // User paid someone — reduces what user owes them
                    balances.set(settlement.toUserId, (balances.get(settlement.toUserId) || 0) + Number(settlement.amount));
                } else {
                    // Someone paid user — reduces what they owe user
                    balances.set(settlement.fromUserId, (balances.get(settlement.fromUserId) || 0) - Number(settlement.amount));
                }
            }

            return Array.from(balances.entries())
                .filter(([, amount]) => Math.abs(amount) > 0.01)
                .map(([otherId, amount]) => ({ userId: otherId, amount }));
        } catch (error) {
            throw error;
        }
    }
}

// Create default instance
const userService = new UserService(prisma);

// Export both class and default instance
export default userService ;