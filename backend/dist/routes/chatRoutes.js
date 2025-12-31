"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/chatRoutes.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const chatController_1 = require("../controllers/chatController");
const router = express_1.default.Router();
router.get('/conversations', authMiddleware_1.protect, chatController_1.getConversations);
router.post('/conversation/start', authMiddleware_1.protect, chatController_1.startConversation);
router.get('/:roomId/messages', authMiddleware_1.protect, chatController_1.getMessages);
router.post('/:roomId/messages', authMiddleware_1.protect, chatController_1.sendMessage);
router.put('/read/:roomId', authMiddleware_1.protect, chatController_1.markAsRead);
exports.default = router;
//# sourceMappingURL=chatRoutes.js.map