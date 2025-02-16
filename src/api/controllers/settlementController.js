// src/controllers/settlementController.js
import settlementService from '../../services/settlementService.js';

class SettlementController {
    async createSettlement(req, res, next) {
        try {
            const { toUserId, amount, notes } = req.validatedData;
            const fromUserId = req.user.id;

            const settlement = await settlementService.createSettlement(
                fromUserId,
                toUserId,
                amount,
                notes
            );

            res.status(201).json(settlement);
        } catch (error) {
            next(error);
        }
    }

    async getGroupSettlements(req, res, next) {
        try {
            const { groupId } = req.params;
            const settlements = await settlementService.getGroupSettlements(groupId);
            res.status(200).json(settlements);
        } catch (error) {
            next(error);
        }
    }

    async getUserSettlements(req, res, next) {
        try {
            const userId = req.user.id;
            const settlements = await settlementService.getUserSettlements(userId);
            res.status(200).json(settlements);
        } catch (error) {
            next(error);
        }
    }
}

const settlementController = new SettlementController();
export default settlementController;