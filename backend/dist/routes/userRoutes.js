"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/userRoutes.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const userController_1 = require("../controllers/userController");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)();
const router = express_1.default.Router();
// Public / Protected Routes
router.get('/profile/:id', authMiddleware_1.protect, userController_1.getUserProfile);
router.put('/profile/update', authMiddleware_1.protect, upload.single('avatar'), userController_1.updateUserProfile); // User update profile
router.put('/profile/change-password', authMiddleware_1.protect, userController_1.changePassword);
router.post('/check-in', authMiddleware_1.protect, userController_1.dailyCheckIn);
router.get('/search', authMiddleware_1.protect, userController_1.searchUsers);
router.post('/follow/:id', authMiddleware_1.protect, userController_1.followUser);
router.get('/leaderboard', userController_1.getLeaderboard); // Public
// Admin Routes
router.get('/admin/users', authMiddleware_1.protect, userController_1.getAllUsers);
router.put('/admin/users/:id', authMiddleware_1.protect, userController_1.updateUserStatus);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map