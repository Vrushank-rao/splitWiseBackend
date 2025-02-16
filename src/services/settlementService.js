// src/services/settlementService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class SettlementService {
  async calculateGroupSettlements(groupId) {
    // Get all unsettled expenses in the group
    const events = await prisma.event.findMany({
      where: { groupId },
      include: {
        expenses: {
          include: {
            participations: {
              where: { settled: false }
            },
            paidBy: true
          }
        }
      }
    });

    // Calculate net balances for each user
    const balances = new Map();

    for (const event of events) {
      for (const expense of event.expenses) {
        // Add what the payer is owed
        const payerBalance = balances.get(expense.paidById) || 0;
        balances.set(
          expense.paidById, 
          payerBalance + Number(expense.totalAmount)
        );

        // Subtract what each participant owes
        for (const participation of expense.participations) {
          const participantBalance = balances.get(participation.userId) || 0;
          balances.set(
            participation.userId,
            participantBalance - Number(participation.amount)
          );
        }
      }
    }

    return this.minimizeTransfers(balances);
  }

  minimizeTransfers(balances) {
    const balanceArray = Array.from(balances.entries())
      .map(([userId, amount]) => ({ userId, amount }))
      .filter(b => Math.abs(b.amount) > 0.01);

    balanceArray.sort((a, b) => a.amount - b.amount);

    const transfers = [];
    let i = 0;  // Index for debtors (negative balance)
    let j = balanceArray.length - 1;  // Index for creditors (positive balance)

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

// Create default instance
const settlementService = new SettlementService(prisma);

// Export both class and default instance
export default settlementService ;