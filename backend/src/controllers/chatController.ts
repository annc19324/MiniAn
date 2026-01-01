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
                    where: {
                        NOT: {
                            deletedBy: { has: userId }
                        }
                    },
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
                        isRead: false,
                        NOT: {
                            deletedBy: { has: userId }
                        }
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
    const userId = req.user!.id;

    try {
        const messages = await prisma.message.findMany({
            where: {
                roomId: Number(roomId),
                NOT: {
                    deletedBy: { has: userId }
                }
            },
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
// Xóa cuộc trò chuyện
export const deleteConversation = async (req: AuthRequest, res: Response) => {
    const { id } = req.params; // Room ID
    const userId = req.user!.id;

    try {
        const room = await prisma.room.findUnique({
            where: { id: Number(id) },
            include: { users: true }
        });

        if (!room) return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });

        // Check is member
        const isMember = room.users.some(u => u.userId === userId);
        if (!isMember) return res.status(403).json({ message: 'Không có quyền xóa cuộc trò chuyện này' });

        // Delete dependencies first (messages, user_rooms)
        await prisma.message.deleteMany({ where: { roomId: Number(id) } });
        await prisma.userRoom.deleteMany({ where: { roomId: Number(id) } });
        await prisma.room.delete({ where: { id: Number(id) } });

        // Emit socket needed? Not necessarily, user will just see it gone on refresh. 
        // Or emit 'conversation_deleted' to users.
        const io = req.app.get('io');
        room.users.forEach(u => {
            io.to(u.userId.toString()).emit('conversation_deleted', { roomId: Number(id) });
        });

        res.json({ message: 'Đã xóa cuộc trò chuyện' });
    } catch (error) {
        console.error("Delete conv error:", error);
        res.status(500).json({ message: 'Lỗi xóa cuộc trò chuyện', error });
    }
};

// Xóa tin nhắn (Thu hồi hoặc Xóa phía tôi)
export const deleteMessage = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { type } = req.body; // 'recall' | 'me'
    const userId = req.user!.id;

    try {
        const message = await prisma.message.findUnique({ where: { id: Number(id) } });
        if (!message) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });

        if (type === 'me') {
            // Delete for me only (Soft Delete)
            await prisma.message.update({
                where: { id: Number(id) },
                data: {
                    deletedBy: { push: [userId] }
                }
            });
            return res.json({ message: 'Đã xóa tin nhắn phía bạn' });
        } else {
            // Recall (Delete for everyone) - Default if no type specified
            if (message.senderId !== userId) {
                return res.status(403).json({ message: 'Không có quyền thu hồi tin nhắn này' });
            }

            // Check 1h limit
            const OneHour = 60 * 60 * 1000;
            if (new Date().getTime() - new Date(message.createdAt).getTime() > OneHour) {
                return res.status(400).json({ message: 'Chỉ có thể thu hồi tin nhắn trong vòng 1 giờ' });
            }

            await prisma.message.delete({ where: { id: Number(id) } });

            // Emit socket
            const io = req.app.get('io');
            io.to(message.roomId.toString()).emit('message_deleted', { messageId: Number(id), roomId: message.roomId });

            return res.json({ message: 'Đã thu hồi tin nhắn' });
        }
    } catch (error) {
        console.error("Delete message error:", error);
        res.status(500).json({ message: 'Lỗi xử lý tin nhắn', error });
    }
};

// Sửa tin nhắn
export const updateMessage = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    try {
        const message = await prisma.message.findUnique({ where: { id: Number(id) } });
        if (!message) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });

        if (message.senderId !== userId) {
            return res.status(403).json({ message: 'Không có quyền sửa tin nhắn này' });
        }

        const updatedMessage = await prisma.message.update({
            where: { id: Number(id) },
            data: { content },
            include: {
                sender: { select: { id: true, username: true, avatar: true } }
            }
        });

        // Emit socket
        const io = req.app.get('io');
        io.to(message.roomId.toString()).emit('message_updated', { message: updatedMessage });

        res.json(updatedMessage);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi sửa tin nhắn', error });
    }
};

// ==== GROUP CHAT FUNCTIONS ====

// Tạo nhóm chat
export const createGroup = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, memberIds } = req.body; // memberIds: array of user IDs to add

    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Tên nhóm không được để trống' });
    }

    try {
        // Create group with creator + members
        const allMemberIds = [userId, ...(memberIds || [])].filter((id, idx, arr) => arr.indexOf(id) === idx); // Remove duplicates

        const group = await prisma.room.create({
            data: {
                name: name.trim(),
                isGroup: true,
                createdBy: userId,
                users: {
                    create: allMemberIds.map(id => ({ userId: id }))
                }
            },
            include: {
                users: {
                    include: {
                        user: {
                            select: { id: true, username: true, fullName: true, avatar: true }
                        }
                    }
                }
            }
        });

        res.status(201).json(group);
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ message: 'Lỗi tạo nhóm chat', error });
    }
};

// Cập nhật thông tin nhóm (tên, avatar)
export const updateGroup = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, avatar } = req.body;

    try {
        const room = await prisma.room.findUnique({
            where: { id: Number(id) }
        });

        if (!room) return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        if (!room.isGroup) return res.status(400).json({ message: 'Không phải nhóm chat' });

        // Only creator can update group info (or could check if user is member)
        if (room.createdBy !== userId) {
            return res.status(403).json({ message: 'Chỉ người tạo nhóm mới có quyền cập nhật' });
        }

        const updatedRoom = await prisma.room.update({
            where: { id: Number(id) },
            data: {
                ...(name && { name: name.trim() }),
                ...(avatar !== undefined && { avatar })
            },
            include: {
                users: {
                    include: {
                        user: {
                            select: { id: true, username: true, fullName: true, avatar: true }
                        }
                    }
                }
            }
        });

        // Emit socket to notify members
        const io = req.app.get('io');
        updatedRoom.users.forEach(u => {
            io.to(u.userId.toString()).emit('group_updated', { group: updatedRoom });
        });

        res.json(updatedRoom);
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ message: 'Lỗi cập nhật nhóm', error });
    }
};

// Thêm thành viên vào nhóm
export const addGroupMember = async (req: AuthRequest, res: Response) => {
    const { id } = req.params; // Room ID
    const userId = req.user!.id;
    const { memberId } = req.body; // User ID to add

    try {
        const room = await prisma.room.findUnique({
            where: { id: Number(id) },
            include: { users: true }
        });

        if (!room) return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        if (!room.isGroup) return res.status(400).json({ message: 'Không phải nhóm chat' });

        // Check if current user is member
        const isMember = room.users.some(u => u.userId === userId);
        if (!isMember) return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });

        // Check if target user is already member
        const isAlreadyMember = room.users.some(u => u.userId === memberId);
        if (isAlreadyMember) return res.status(400).json({ message: 'Người dùng đã trong nhóm' });

        // Add member
        await prisma.userRoom.create({
            data: {
                userId: memberId,
                roomId: Number(id)
            }
        });

        // Fetch updated room
        const updatedRoom = await prisma.room.findUnique({
            where: { id: Number(id) },
            include: {
                users: {
                    include: {
                        user: {
                            select: { id: true, username: true, fullName: true, avatar: true }
                        }
                    }
                }
            }
        });

        // Emit socket
        const io = req.app.get('io');
        updatedRoom?.users.forEach(u => {
            io.to(u.userId.toString()).emit('group_member_added', { group: updatedRoom, newMemberId: memberId });
        });

        res.json(updatedRoom);
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ message: 'Lỗi thêm thành viên', error });
    }
};

// Xóa thành viên khỏi nhóm
export const removeGroupMember = async (req: AuthRequest, res: Response) => {
    const { id } = req.params; // Room ID
    const userId = req.user!.id;
    const { memberId } = req.body; // User ID to remove

    try {
        const room = await prisma.room.findUnique({
            where: { id: Number(id) },
            include: { users: true }
        });

        if (!room) return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        if (!room.isGroup) return res.status(400).json({ message: 'Không phải nhóm chat' });

        // Only creator can remove members (or member can remove themselves)
        if (room.createdBy !== userId && memberId !== userId) {
            return res.status(403).json({ message: 'Chỉ người tạo nhóm hoặc chính bạn mới có quyền xóa' });
        }

        // Cannot remove creator
        if (memberId === room.createdBy && memberId !== userId) {
            return res.status(400).json({ message: 'Không thể xóa người tạo nhóm' });
        }

        // Remove member
        await prisma.userRoom.delete({
            where: {
                userId_roomId: {
                    userId: memberId,
                    roomId: Number(id)
                }
            }
        });

        // Fetch updated room
        const updatedRoom = await prisma.room.findUnique({
            where: { id: Number(id) },
            include: {
                users: {
                    include: {
                        user: {
                            select: { id: true, username: true, fullName: true, avatar: true }
                        }
                    }
                }
            }
        });

        // Emit socket
        const io = req.app.get('io');
        updatedRoom?.users.forEach(u => {
            io.to(u.userId.toString()).emit('group_member_removed', { group: updatedRoom, removedMemberId: memberId });
        });
        // Also notify removed member
        io.to(memberId.toString()).emit('removed_from_group', { roomId: Number(id) });

        res.json(updatedRoom);
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Lỗi xóa thành viên', error });
    }
};

// Rời nhóm (leave group)
export const leaveGroup = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    try {
        const room = await prisma.room.findUnique({
            where: { id: Number(id) },
            include: { users: true }
        });

        if (!room) return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        if (!room.isGroup) return res.status(400).json({ message: 'Không phải nhóm chat' });

        // Creator cannot leave (must transfer ownership or delete group)
        if (room.createdBy === userId) {
            return res.status(400).json({ message: 'Người tạo nhóm không thể rời khỏi nhóm. Vui lòng chuyển quyền quản trị hoặc xóa nhóm.' });
        }

        // Remove self
        await prisma.userRoom.delete({
            where: {
                userId_roomId: {
                    userId: userId,
                    roomId: Number(id)
                }
            }
        });

        // Emit socket
        const io = req.app.get('io');
        room.users.forEach(u => {
            io.to(u.userId.toString()).emit('group_member_removed', { roomId: Number(id), removedMemberId: userId });
        });

        res.json({ message: 'Đã rời khỏi nhóm' });
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ message: 'Lỗi rời nhóm', error });
    }
};

