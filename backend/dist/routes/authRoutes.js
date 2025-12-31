"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/authRoutes.ts
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Đăng ký
router.post('/register', authController_1.register);
// Đăng nhập
router.post('/login', authController_1.login);
// Lấy thông tin user hiện tại (test protected route)
router.get('/me', authMiddleware_1.protect, (req, res) => {
    res.json({ user: req.user });
});
exports.default = router;
//# sourceMappingURL=authRoutes.js.map