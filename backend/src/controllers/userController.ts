// src/controllers/userController.ts
import { Request, Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';
import { uploadImage } from '../utils/upload';

// Lấy thông tin user (profile)
// Lấy thông tin user (profile)
// Lấy thông tin user (profile)
export const getUserProfile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    console.log(`[getUserProfile] Request for ID: ${id}`);

    try {
        if (!req.user) {
            console.error('[getUserProfile] No user in request');
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const currentUserId = req.user.id;

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

        if (!user) {
            console.log(`[getUserProfile] User ${id} not found`);
            return res.status(404).json({ message: 'User not found' });
        }

        // Check isFollowing (Me -> Them)
        const following = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: currentUserId,
                    followingId: Number(id)
                }
            }
        });

        // Check isFollowedBy (Them -> Me)
        const follower = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: Number(id),
                    followingId: currentUserId
                }
            }
        });

        const isFriend = !!following && !!follower;

        console.log(`[getUserProfile] Success for ID: ${id}`);
        res.json({ ...user, isFollowing: !!following, isFollowedBy: !!follower, isFriend });
    } catch (error) {
        console.error('[getUserProfile] Error:', error);
        res.status(500).json({ message: 'Server error', error: String(error) });
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

// Tìm kiếm User
export const searchUsers = async (req: AuthRequest, res: Response) => {
    const { q } = req.query;

    if (!q) return res.json([]);

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: String(q), mode: 'insensitive' } },
                    { fullName: { contains: String(q), mode: 'insensitive' } },
                ],
                isActive: true
            },
            select: { id: true, username: true, fullName: true, avatar: true, isVip: true },
            take: 10
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi tìm kiếm' });
    }
};

// Follow / Unfollow
export const followUser = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id; // Me
    const targetId = Number(req.params.id); // Person to follow

    if (userId === targetId) return res.status(400).json({ message: 'Không thể follow chính mình' });

    try {
        const existingFollow = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: userId, followingId: targetId } }
        });

        if (existingFollow) {
            // Unfollow
            await prisma.follow.delete({
                where: { followerId_followingId: { followerId: userId, followingId: targetId } }
            });
            res.json({ message: 'Unfollowed', isFollowing: false });
        } else {
            // Follow
            await prisma.follow.create({
                data: { followerId: userId, followingId: targetId }
            });

            // Notification
            const notif = await prisma.notification.create({
                data: {
                    type: 'follow',
                    content: `${req.user?.username} đã bắt đầu theo dõi bạn`,
                    userId: targetId,
                    senderId: userId
                }
            });

            // Socket Emit
            const { io } = require('../server');
            io.to(targetId.toString()).emit('new_notification', notif);

            res.json({ message: 'Followed', isFollowing: true });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi follow' });
    }
};

// Cập nhật Profile (User tự cập nhật)
// Cập nhật Profile (User tự cập nhật)
// Cập nhật Profile (User tự cập nhật)
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { fullName, bio, username, email } = req.body;
    const file = req.file;

    try {
        console.log("Update Body:", req.body);

        // Validation: Unique username
        if (username) {
            const userWithUsername = await prisma.user.findFirst({
                where: {
                    username: { equals: username, mode: 'insensitive' },
                    NOT: { id: userId }
                }
            });
            if (userWithUsername) {
                return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
            }
        }

        // Validation: Unique email
        if (email) {
            const userWithEmail = await prisma.user.findFirst({
                where: {
                    email: { equals: email, mode: 'insensitive' },
                    NOT: { id: userId }
                }
            });
            if (userWithEmail) {
                return res.status(400).json({ message: 'Email đã tồn tại' });
            }
        }

        let imageUrl: string | undefined;
        if (file) {
            try {
                console.log('Starting avatar upload...', file.originalname);
                imageUrl = await uploadImage(file);
                console.log('Avatar uploaded:', imageUrl);
            } catch (uploadError) {
                console.error('Upload Error:', uploadError);
                return res.status(500).json({ message: 'Lỗi tải lên ảnh đại diện', error: String(uploadError) });
            }
        }

        const dataToUpdate: any = {};
        if (fullName) dataToUpdate.fullName = fullName;
        if (bio !== undefined) dataToUpdate.bio = bio;
        if (username) dataToUpdate.username = username;
        if (email) dataToUpdate.email = email;
        if (imageUrl) dataToUpdate.avatar = imageUrl;

        console.log("Final dataToUpdate:", dataToUpdate);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
            select: { id: true, username: true, email: true, fullName: true, avatar: true, bio: true, coins: true }
        });

        res.json({ message: 'Cập nhật thành công', user: updatedUser });
    } catch (error) {
        console.error("Lỗi cập nhật profile:", error);
        res.status(500).json({ message: 'Lỗi cập nhật profile', error: String(error) });
    }
};

// Đổi mật khẩu
import bcrypt from 'bcryptjs';
export const changePassword = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi đổi mật khẩu' });
    }
};

// Lấy bảng xếp hạng (Top 10 Coin)
export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { coins: 'desc' },
            take: 10,
            select: { id: true, username: true, fullName: true, avatar: true, coins: true, isVip: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy bảng xếp hạng' });
    }
};
