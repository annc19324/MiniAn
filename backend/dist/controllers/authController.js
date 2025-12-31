"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const server_1 = require("../server"); // singleton prisma từ server.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const generateToken_1 = require("../utils/generateToken");
// Đăng ký
const register = async (req, res) => {
    const { username, email, password, fullName } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ username, email và password' });
    }
    try {
        // Kiểm tra trùng username hoặc email
        const existingUser = await server_1.prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email },
                ],
            },
        });
        if (existingUser) {
            return res.status(400).json({ message: 'Username hoặc email đã được sử dụng' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Tạo user mới
        const user = await server_1.prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                fullName: fullName || username,
                coins: 100, // Tặng coin khởi đầu
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                avatar: true,
                coins: true,
                role: true,
                isVip: true,
            },
        });
        // Trả token
        res.status(201).json({
            message: 'Đăng ký thành công!',
            user,
            token: (0, generateToken_1.generateToken)(user.id),
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
};
exports.register = register;
// Đăng nhập
const login = async (req, res) => {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập email/username và mật khẩu' });
    }
    try {
        // Tìm user bằng email hoặc username
        const user = await server_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: emailOrUsername },
                    { username: emailOrUsername },
                ],
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                avatar: true,
                password: true,
                coins: true,
                role: true,
                isVip: true,
            },
        });
        // Kiểm tra user và password
        if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
            return res.status(401).json({ message: 'Email/Username hoặc mật khẩu không đúng' });
        }
        // Xóa password khỏi response
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            message: 'Đăng nhập thành công!',
            user: userWithoutPassword,
            token: (0, generateToken_1.generateToken)(user.id),
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
};
exports.login = login;
//# sourceMappingURL=authController.js.map