// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';  // singleton prisma từ server.ts

export interface AuthRequest extends Request {
    user?: any;  // sau này có thể định nghĩa type User chi tiết hơn
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, username: true, email: true, fullName: true, avatar: true, coins: true, role: true, isVip: true },
        });

        if (!user) {
            return res.status(401).json({ message: 'User không tồn tại' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
    }
};