"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/notificationRoutes.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const notificationController_1 = require("../controllers/notificationController");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, notificationController_1.getNotifications);
router.get('/unread-count', authMiddleware_1.protect, notificationController_1.getUnreadNotificationCount);
router.put('/:id/read', authMiddleware_1.protect, notificationController_1.markRead);
router.put('/read-all', authMiddleware_1.protect, notificationController_1.markAllRead);
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map