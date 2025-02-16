// const userService = require('../../services/userService.js');
import userService from '../../services/userService.js';
class UserController {
    async register(req, res, next) {
        try {
            const userData = req.body;
            const user = await userService.registerUser(userData);
            res.status(201).json(user);
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await userService.loginUser(email, password);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req, res, next) {
        try {
            const userId = req.user.id; // From auth middleware
            const profile = await userService.getUserProfile(userId);
            res.status(200).json(profile);
        } catch (error) {
            next(error);
        }
    }

    async getBalances(req, res, next) {
        try {
            const userId = req.user.id; // From auth middleware
            const balances = await userService.getUserBalances(userId);
            res.status(200).json(balances);
        } catch (error) {
            next(error);
        }
    }
}

const userController = new UserController();
export default userController;