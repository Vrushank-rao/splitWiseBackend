// src/services/settlementService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class SettlementService {
    constructor(prismaClient) {
        this.prisma = prismaClient;
    }

    async createSettlement(fromUserId, toUserId, amount, notes) {
        return this.prisma.settlement.create({
            data: { fromUserId, toUserId, amount, notes }
        });
    }

    async getGroupSettlements(groupId) {
        const members = await this.prisma.userGroup.findMany({
            where: { groupId },
            select: { userId: true }
        });
        const memberIds = members.map(m => m.userId);

        return this.prisma.settlement.findMany({
            where: {
                fromUserId: { in: memberIds },
                toUserId: { in: memberIds }
            },
            orderBy: { settledAt: 'desc' }
        });
    }

    async getUserSettlements(userId) {
        return this.prisma.settlement.findMany({
            where: {
                OR: [{ fromUserId: userId }, { toUserId: userId }]
            },
            orderBy: { settledAt: 'desc' }
        });
    }

    minimizeTransfers(balances) {
        const balanceArray = Array.from(balances.entries())
            .map(([userId, amount]) => ({ userId, amount }))
            .filter(b => Math.abs(b.amount) > 0.01);

        balanceArray.sort((a, b) => a.amount - b.amount);

        const transfers = [];
        let i = 0;
        let j = balanceArray.length - 1;

        while (i < j) {
            const transferAmount = Math.min(
                -balanceArray[i].amount,
                balanceArray[j].amount
            );

            if (transferAmount > 0) {
                transfers.push({
                    from: balanceArray[i].userId,
                    to: balanceArray[j].userId,
                    amount: transferAmount
                });
                balanceArray[i].amount += transferAmount;
                balanceArray[j].amount -= transferAmount;
            }

            if (Math.abs(balanceArray[i].amount) < 0.01) i++;
            if (Math.abs(balanceArray[j].amount) < 0.01) j--;
        }

        return transfers;
    }
}

const settlementService = new SettlementService(prisma);
export default settlementService;
