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
            // Get all expenses where user is involved
            const expenseSplits = await this.prisma.expenseSplit.findMany({
                where: {
                    userId
                },
                include: {
                    expense: {
                        include: {
                            paidBy: true
                        }
                    }
                }
            });

            // Get all settlements involving the user
            const settlements = await this.prisma.settlement.findMany({
                where: {
                    OR: [
                        { payerId: userId },
                        { receiverId: userId }
                    ]
                }
            });

            // Calculate balances...
            const balances = new Map();
            
            // Process expenses
            expenseSplits.forEach(split => {
                const expense = split.expense;
                const otherUserId = expense.paidById === userId ? split.userId : expense.paidById;
                
                if (expense.paidById === userId) {
                    balances.set(otherUserId, (balances.get(otherUserId) || 0) + split.amount);
                } else {
                    balances.set(otherUserId, (balances.get(otherUserId) || 0) - split.amount);
                }
            });

            // Convert Map to array
            const balanceArray = Array.from(balances.entries()).map(([userId, amount]) => ({
                userId,
                amount
            }));

            return balanceArray;
        } catch (error) {
            throw error;
        }
    }
}

// Create default instance
const userService = new UserService(prisma);

// Export both class and default instance
export default userService ;