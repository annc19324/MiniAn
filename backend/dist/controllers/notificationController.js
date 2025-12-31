"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadNotificationCount = exports.markAllRead = exports.markRead = exports.getNotifications = void 0;
const server_1 = require("../server");
// Lấy danh sách thông báo
const getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const notifications = await server_1.prisma.notification.findMany({
            where: { userId },
            include: {
            // Ai tạo ra thông báo (người like, comment)
            // Lưu ý: trong schema senderId không có relation trực tiếp, ta phải query thêm hoặc sửa schema. 
            // Tuy nhiên, schema hiện tại: senderId Int?. 
            // Để đơn giản, ta sẽ lấy thông báo trước, frontend có thể hiện "Ai đó đã like".
            // Tốt hơn: thêm relation sender vào Notification model nếu chưa có.
            // Kiểm tra lại schema: Notification có senderId nhưng không có relation 'sender'.
            // Sửa schema mất công migrate. Ta dùng tạm senderId để fetch user nếu cần, 
            // hoặc sửa schema ngay bây giờ? 
            // Schema hiện tại: senderId Int?
            // Thôi, ta sẽ sửa schema sau nếu cần thiết. Hiện tại trả về list.
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        // Để hiển thị tên người gửi, ta cần manual populate hoặc sửa schema.
        // Cách nhanh: Lấy list senderId unique và fetch users
        const senderIds = [...new Set(notifications.map(n => n.senderId).filter(id => id !== null))];
        const senders = await server_1.prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, username: true, avatar: true }
        });
        // Map sender info vào notification
        const notificationsWithSender = notifications.map(n => {
            const sender = senders.find(s => s.id === n.senderId);
            return { ...n, sender };
        });
        res.json(notificationsWithSender);
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi lấy thông báo' });
    }
};
exports.getNotifications = getNotifications;
// Đánh dấu đã đọc
const markRead = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        await server_1.prisma.notification.updateMany({
            where: { id: Number(id), userId },
            data: { read: true }
        });
        const { io } = require('../server');
        io.to(userId.toString()).emit('refresh_unread');
        res.json({ message: 'Đã đọc' });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật' });
    }
};
exports.markRead = markRead;
// Đánh dấu tất cả đã đọc
const markAllRead = async (req, res) => {
    const userId = req.user.id;
    try {
        await server_1.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        const { io } = require('../server');
        io.to(userId.toString()).emit('refresh_unread');
        res.json({ message: 'Đã đọc tất cả' });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật' });
    }
};
exports.markAllRead = markAllRead;
// Lấy số lượng thông báo chưa đọc
const getUnreadNotificationCount = async (req, res) => {
    const userId = req.user.id;
    try {
        const count = await server_1.prisma.notification.count({
            where: {
                userId,
                read: false
            }
        });
        res.json({ count });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi lấy số thông báo chưa đọc' });
    }
};
exports.getUnreadNotificationCount = getUnreadNotificationCount;
//# sourceMappingURL=notificationController.js.map