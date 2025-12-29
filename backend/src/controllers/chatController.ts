// src/controllers/chatController.ts
import { Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';

// Lấy danh sách cuộc trò chuyện (Rooms)
export const getConversations = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    try {
        const conversations = await prisma.room.findMany({
            where: {
                users: {
                    some: { userId: userId }
                }
            },
            include: {
                users: {
                    include: {
                        user: {
                            select: { id: true, username: true, fullName: true, avatar: true }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        console.log(`Found ${conversations.length} conversations for user ${userId}`);

        // Format lại data để dễ hiển thị ở frontend & Sort by last message
        const formattedConversations = await Promise.all(conversations.map(async (room) => {
            // Tìm người kia trong box chat (giả sử chat 1-1)
            const otherMember = room.users.find(u => u.userId !== userId)?.user;

            // Count unread messages
            let unreadCount = 0;
            try {
                unreadCount = await prisma.message.count({
                    where: {
                        roomId: room.id,
                        senderId: { not: userId },
                        isRead: false
                    }
                });
            } catch (err) {
                console.error(`Error counting unread for room ${room.id}:`, err);
            }

            return {
                id: room.id,
                name: otherMember?.fullName || room.name || 'Chat Group',
                avatar: otherMember?.avatar,
                lastMessage: room.messages[0],
                otherMemberId: otherMember?.id,
                unreadCount
            };
        }));

        formattedConversations.sort((a, b) => {
            const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        res.json(formattedConversations);
    } catch (error) {
        console.error("Error in getConversations:", error);
        res.status(500).json({ message: 'Lỗi lấy danh sách chat' });
    }
};

// Lấy tin nhắn của một Room
export const getMessages = async (req: AuthRequest, res: Response) => {
    const { roomId } = req.params;

    try {
        const messages = await prisma.message.findMany({
            where: { roomId: Number(roomId) },
            include: {
                sender: {
                    select: { id: true, username: true, avatar: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Debug logging
        // console.log("Fetched messages sample:", messages.slice(-1)); 

        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: 'Lỗi lấy tin nhắn' });
    }
};

// Bắt đầu cuộc trò chuyện (Tạo Room mới hoặc lấy Room cũ)
export const startConversation = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { targetUserId } = req.body;

    if (userId === targetUserId) return res.status(400).json({ message: 'Không thể chat với chính mình' });

    try {
        // Kiểm tra xem đã có room chung chưa (chỉ xét 1-1 đơn giản)
        // Tìm các room mà current user tham gia, sau đó check xem room đó có targetUser không
        const existingRooms = await prisma.room.findMany({
            where: {
                AND: [
                    { users: { some: { userId: userId } } },
                    { users: { some: { userId: targetUserId } } },
                    { isGroup: false } // Chỉ lấy chat 1-1
                ]
            }
        });

        if (existingRooms.length > 0) {
            return res.json(existingRooms[0]);
        }

        // Tạo room mới
        const newRoom = await prisma.room.create({
            data: {
                isGroup: false,
                users: {
                    create: [
                        { userId: userId },
                        { userId: targetUserId }
                    ]
                }
            }
        });

        res.status(201).json(newRoom);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi tạo cuộc trò chuyện', error });
    }
};

// Gửi tin nhắn
export const sendMessage = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { roomId } = req.params;
    const { content } = req.body;

    try {
        const message = await prisma.message.create({
            data: {
                content,
                senderId: userId,
                roomId: Number(roomId)
            },
            include: {
                sender: { select: { id: true, username: true, avatar: true } }
            }
        });

        // Notify Receiver for global unread count
        const room = await prisma.room.findUnique({
            where: { id: Number(roomId) },
            include: { users: true }
        });

        if (room) {
            const receiverFn = room.users.find(u => u.userId !== userId);
            if (receiverFn) {
                const io = req.app.get('io');
                io.to(receiverFn.userId.toString()).emit('new_message_alert', { roomId: Number(roomId) });
            }
        }

        res.status(201).json(message);
    } catch (error) {
        console.error("Send message error:", error);
        res.status(500).json({ message: 'Lỗi gửi tin nhắn' });
    }
};

// Đánh dấu đã đọc tin nhắn trong Room
export const markAsRead = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { roomId } = req.params;

    try {
        // Update tất cả tin nhắn trong room mà người gửi KHÔNG phải là user hiện tại
        // và chưa được đọc
        await prisma.message.updateMany({
            where: {
                roomId: Number(roomId),
                senderId: { not: userId },
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        // Emit socket event
        const io = req.app.get('io');
        const roomStr = String(roomId);
        console.log(`Emitting messages_read to room: ${roomStr} for reader: ${userId}`);
        io.to(roomStr).emit('messages_read', { roomId: Number(roomId), readerId: userId });

        // Notify the reader to update their global unread count (e.g. clear badge)
        io.to(userId.toString()).emit('refresh_unread');

        res.json({ success: true, message: 'Đã đánh dấu đã xem' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi cập nhật trạng thái đã xem' });
    }
};
