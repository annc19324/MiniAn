// src/controllers/userController.ts
import { Request, Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';

// Lấy thông tin user (profile)
export const getUserProfile = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
            select: {
                id: true, username: true, fullName: true, avatar: true, bio: true,
                coins: true, role: true, isVip: true, createdAt: true,
                _count: {
                    select: { followers: true, following: true, posts: true }
                }
            }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Điểm danh hàng ngày
export const dailyCheckIn = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // Kiểm tra xem hôm nay đã nhận chưa
        const existingTx = await prisma.coinTransaction.findFirst({
            where: {
                userId,
                reason: 'Daily Check-in',
                createdAt: { gte: today }
            }
        });

        if (existingTx) {
            return res.status(400).json({ message: 'Hôm nay bạn đã điểm danh rồi!' });
        }

        // Cộng coin (ví dụ 5 coin)
        const coinAmount = 5;

        // Transaction (Cập nhật user + Tạo lịch sử)
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { coins: { increment: coinAmount } }
            }),
            prisma.coinTransaction.create({
                data: {
                    userId,
                    amount: coinAmount,
                    reason: 'Daily Check-in'
                }
            })
        ]);

        res.json({ message: `Điểm danh thành công! Bạn nhận được ${coinAmount} coin.`, coinsAdded: coinAmount });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi điểm danh', error });
    }
};

// ADMIN: Lấy danh sách user
export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        // Chỉ admin mới được xem
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }

        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, username: true, email: true, fullName: true,
                role: true, isVip: true, coins: true, isActive: true
            }
        });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách user' });
    }
};

// ADMIN: Cập nhật role / Vip / Khóa user
export const updateUserStatus = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { role, isVip, isActive } = req.body;

    try {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: Number(id) },
            data: { role, isVip, isActive },
            select: { id: true, username: true, role: true, isVip: true, isActive: true }
        });

        res.json({ message: 'Cập nhật thành công', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật user' });
    }
};
