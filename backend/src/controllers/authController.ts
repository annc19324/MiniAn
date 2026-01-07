// src/controllers/authController.ts
import { Request, Response } from 'express';
import { prisma } from '../db';  // singleton prisma
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
    let { username, email, password, fullName } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ username, email và password' });
    }

    // 1. Normalize Input
    username = username.trim(); // No lowercase forcing here, store as provided
    email = email.trim();
    fullName = fullName ? fullName.trim() : '';

    // 2. Validate Username
    // 6-50 chars, a-z A-Z 0-9 .
    const usernameRegex = /^[a-zA-Z0-9.]{6,50}$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json({ message: 'Username phải từ 6-50 ký tự, chỉ gồm chữ, số và dấu chấm, không chứa dấu cách' });
    }

    // 3. Validate FullName
    // 2-50 chars, a-z A-Z 0-9 (allowing spaces for readability)
    if (fullName) {
        if (fullName.length < 2 || fullName.length > 60) {
            return res.status(400).json({ message: 'Họ tên phải từ 2-60 ký tự' });
        }
        // Support Unicode letters, numbers and spaces
        const fullNameRegex = /^[\p{L}\p{N}\s]+$/u;
        if (!fullNameRegex.test(fullName)) {
            return res.status(400).json({ message: 'Họ tên chỉ được chứa chữ cái và số' });
        }
    }

    // 4. Validate Password
    // 8-50 chars, 1 Uppercase, 1 Lowercase, 1 Number, 1 Special
    if (password.length < 8 || password.length > 50) {
        return res.status(400).json({ message: 'Mật khẩu phải từ 8-50 ký tự' });
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt' });
    }

    try {
        // Kiểm tra trùng username hoặc email (Case Insensitive)
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: username, mode: 'insensitive' } },
                    { email: { equals: email, mode: 'insensitive' } },
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
                username, // Store exact casing
                email,
                password: hashedPassword,
                fullName: fullName || username,
                coins: 10,
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
    let { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập email/username và mật khẩu' });
    }

    // Auto trim input
    emailOrUsername = emailOrUsername.trim();

    try {
        // Tìm user bằng email hoặc username (Case Insensitive)
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: emailOrUsername, mode: 'insensitive' } },
                    { username: { equals: emailOrUsername, mode: 'insensitive' } },
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