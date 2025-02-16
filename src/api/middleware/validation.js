// src/middleware/validation.js
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class ValidationSchemas {
    static userSchema = z.object({
        email: z.string()
            .email('Invalid email format')
            .max(255, 'Email must be less than 255 characters')
            .trim(),
        password: z.string()
            .min(8, 'Password must be at least 8 characters')
            .max(100, 'Password must be less than 100 characters')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
            ),
        name: z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(50, 'Name must be less than 50 characters')
            .trim()
    });

    static groupSchema = z.object({
        name: z.string()
            .min(3, 'Group name must be at least 3 characters')
            .max(100, 'Group name must be less than 100 characters')
            .trim(),
        description: z.string()
            .max(500, 'Description must be less than 500 characters')
            .trim()
            .optional(),
        members: z.array(z.string().uuid()).optional()
    });

    static expenseSchema = z.object({
        description: z.string()
            .min(3, 'Description must be at least 3 characters')
            .max(100, 'Description must be less than 100 characters')
            .trim(),
        totalAmount: z.number()
            .positive('Amount must be positive')
            .max(1000000, 'Amount seems unusually high')
            .transform(val => Number(val.toFixed(2))),
        splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']),
        groupId: z.string().uuid().optional(),
        participants: z.array(
            z.object({
                userId: z.string().uuid(),
                amount: z.number().positive().optional(),
                percentage: z.number().min(0).max(100).optional(),
                shares: z.number().positive().optional()
            })
        ).min(1, 'At least one participant is required')
    }).refine(data => {
        const { splitType, participants } = data;
        switch(splitType) {
            case 'EXACT':
                return participants.every(p => typeof p.amount === 'number');
            case 'PERCENTAGE':
                return participants.every(p => typeof p.percentage === 'number');
            case 'SHARES':
                return participants.every(p => typeof p.shares === 'number');
            default:
                return true;
        }
    }, {
        message: "Participant amounts must match the split type"
    });
}

class SplitValidator {
    async validateParticipantSplits(splitType, participants, totalAmount, groupId) {
        try {
            switch (splitType) {
                case 'EXACT': {
                    const total = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
                    if (Math.abs(total - totalAmount) > 0.01) {
                        throw new Error(`Split amounts total (${total}) doesn't match expense amount (${totalAmount})`);
                    }
                    break;
                }
                case 'PERCENTAGE': {
                    const total = participants.reduce((sum, p) => sum + (p.percentage || 0), 0);
                    if (Math.abs(total - 100) > 0.01) {
                        throw new Error(`Percentages total (${total}) must equal 100%`);
                    }
                    break;
                }
                case 'SHARES': {
                    if (!participants.every(p => p.shares && p.shares > 0)) {
                        throw new Error('All participants must have positive share values');
                    }
                    break;
                }
            }

            await this.validateParticipants(participants, groupId);
        } catch (error) {
            throw new Error(`Split validation failed: ${error.message}`);
        }
    }

    async validateParticipants(participants, groupId) {
        const participantIds = participants.map(p => p.userId);
        const existingUsers = await prisma.user.findMany({
            where: { id: { in: participantIds } }
        });

        if (existingUsers.length !== participantIds.length) {
            throw new Error('One or more participant IDs are invalid');
        }

        if (groupId) {
            const groupMembers = await prisma.groupMember.findMany({
                where: { 
                    AND: [
                        { groupId },
                        { userId: { in: participantIds } }
                    ]
                }
            });

            if (groupMembers.length !== participantIds.length) {
                throw new Error('All participants must be members of the group');
            }
        }
    }
}

class ValidationMiddleware {
    constructor() {
        this.splitValidator = new SplitValidator();
    }

    async validateRegistration(req, res, next) {
        try {
            const validatedData = ValidationSchemas.userSchema.parse(req.body);
            
            const existingUser = await prisma.user.findUnique({
                where: { email: validatedData.email }
            });
            
            if (existingUser) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: ['Email already registered']
                });
            }
            
            req.validatedData = validatedData;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(e => e.message)
                });
            }
            next(error);
        }
    }

    async validateExpenseCreation(req, res, next) {
        try {
            const validatedData = ValidationSchemas.expenseSchema.parse(req.body);
            await this.splitValidator.validateParticipantSplits(
                validatedData.splitType,
                validatedData.participants,
                validatedData.totalAmount,
                validatedData.groupId
            );
            req.validatedExpense = validatedData;
            next();
        } catch (error) {
            res.status(400).json({
                error: 'Validation failed',
                details: error instanceof z.ZodError 
                    ? error.errors.map(e => e.message)
                    : [error.message]
            });
        }
    }

    // Add validateLogin method since it's used in routes
    async validateLogin(req, res, next) {
        try {
            const loginSchema = z.object({
                email: ValidationSchemas.userSchema.shape.email,
                password: ValidationSchemas.userSchema.shape.password
            });

            const validatedData = loginSchema.parse(req.body);
            req.validatedData = validatedData;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(e => e.message)
                });
            }
            next(error);
        }
    }
    async validateGroupCreation(req, res, next) {
        try {
            const validatedData = ValidationSchemas.groupSchema.parse(req.body);
            req.validatedData = validatedData;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(e => e.message)
                });
            }
            next(error);
        }
    }
    
    async validateAddMember(req, res, next) {
        try {
            const schema = z.object({
                email: z.string().email('Invalid email format')
            });
            
            const validatedData = schema.parse(req.body);
            req.validatedData = validatedData;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(e => e.message)
                });
            }
            next(error);
        }
    }


    async validateSettlementCreation(req, res, next) {
        try {
            const validatedData = ValidationSchemas.settlementSchema.parse(req.body);
            
            // Ensure user isn't trying to settle with themselves
            if (validatedData.toUserId === req.user.id) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: ['Cannot create settlement with yourself']
                });
            }
    
            req.validatedData = validatedData;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(e => e.message)
                });
            }
            next(error);
        }
    }
}





// Create and export a single instance
const validationMiddleware = new ValidationMiddleware();
export default validationMiddleware;
