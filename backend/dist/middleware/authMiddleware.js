"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const server_1 = require("../server"); // singleton prisma từ server.ts
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await server_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, username: true, email: true, fullName: true, avatar: true, coins: true, role: true, isVip: true },
        });
        if (!user) {
            return res.status(401).json({ message: 'User không tồn tại' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
    }
};
exports.protect = protect;
//# sourceMappingURL=authMiddleware.js.map