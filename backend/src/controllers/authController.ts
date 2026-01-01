// src/controllers/authController.ts
import { Request, Response } from 'express';
import { prisma } from '../server';  // singleton prisma từ server.ts
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/generateToken';

interface RegisterBody {
    username: string;
    email: string;
    password: string;
    fullName?: string;
}

interface LoginBody {
    emailOrUsername: string;
    password: string;
}

// Đăng ký
export const register = async (req: Request<{}, {}, RegisterBody>, res: Response) => {
    const { username, email, password, fullName } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ username, email và password' });
    }

    try {
        // Kiểm tra trùng username hoặc email
        const existingUser = await prisma.user.findFirst({
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
        const hashedPassword = await bcrypt.hash(password, 12);

        // Tạo user mới
        const user = await prisma.user.create({
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
            token: generateToken(user.id),
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
};

// Đăng nhập
export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập email/username và mật khẩu' });
    }

    try {
        // Tìm user bằng email hoặc username
        const user = await prisma.user.findFirst({
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

        if (!user) {
            return res.status(404).json({ message: 'Tài khoản không tồn tại' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu không đúng' });
        }

        // Xóa password khỏi response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Đăng nhập thành công!',
            user: userWithoutPassword,
            token: generateToken(user.id),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
};