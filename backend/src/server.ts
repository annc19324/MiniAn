// backend/src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
// Database Setup
import { createServer } from 'http';
import { Server } from 'socket.io';

import postRoutes from './routes/postRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import chatRoutes from './routes/chatRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Database Setup
import { prisma, pool } from './db';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
    res.send('🚀 MiniAn Backend is running.');
});

app.get('/test-db', async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        res.json({
            message: 'Kết nối database thành công!',
            userCount,
            tip: 'Nếu userCount > 0 thì admin đã được seed!',
        });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({
            error: 'Lỗi kết nối DB',
            details: error instanceof Error ? error.message : error
        });
    }
});

app.get('/debug-posts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const posts = await prisma.post.findMany({
            where: { authorId: Number(userId) },
            include: { comments: true } // simple include
        });
        res.json(posts);
    } catch (error: any) {
        res.status(500).json({
            message: 'Debug Error',
            name: error.name,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        });
    }
});

// Socket.io Setup
const httpServer = createServer(app);
export const io = new Server(httpServer, {
    cors: {
        origin: "*", // Cập nhật domain frontend khi deploy
        methods: ["GET", "POST"]
    }
});
app.set('io', io); // Make io accessible in controllers via req.app.get('io')

// Map UserId -> Set<SocketId>
const userSocketMap = new Map<number, Set<string>>();

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomId) => {
        socket.join(String(roomId));
    });

    // Online Status Tracking
    socket.on('user_connected', async (userId: number) => {
        try {
            const uid = Number(userId);
            if (!userSocketMap.has(uid)) {
                userSocketMap.set(uid, new Set());
            }
            userSocketMap.get(uid)!.add(socket.id);
            (socket as any).userId = uid;

            // Update DB if first connection
            if (userSocketMap.get(uid)!.size === 1) {
                await prisma.user.update({
                    where: { id: uid },
                    data: { isOnline: true }
                });
                socket.broadcast.emit('user_status_change', { userId: uid, isOnline: true });
            }
        } catch (e) {
            console.error("Error updating online status:", e);
        }
    });

    socket.on('disconnect', async () => {
        const userId = (socket as any).userId;
        if (userId) {
            const uid = Number(userId);
            if (userSocketMap.has(uid)) {
                userSocketMap.get(uid)!.delete(socket.id);
                if (userSocketMap.get(uid)!.size === 0) {
                    userSocketMap.delete(uid);
                    try {
                        const now = new Date();
                        await prisma.user.update({
                            where: { id: uid },
                            data: { isOnline: false, lastSeen: now }
                        });
                        socket.broadcast.emit('user_status_change', { userId: uid, isOnline: false, lastSeen: now });
                    } catch (e) {
                        console.error("Error updating offline status:", e);
                    }
                }
            }
        }
    });

    socket.on("send_message", (data) => {
        // data: { roomId, message, senderId ... }
        // Lưu vào DB ở đây hoặc gọi controller
        console.log(`Broadcasting message to room ${data.roomId}`);
        socket.to(String(data.roomId)).emit("receive_message", data);
    });

    // WebRTC Signaling Events
    socket.on('call_user', (data) => {
        const { userToCall, signalData, fromUser } = data;
        const targetSockets = userSocketMap.get(Number(userToCall));
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                console.log(`Forwarding call from ${fromUser} to ${userToCall}`);
                io.to(socketId).emit("call_incoming", data); // Forward full data
            });
        }
    });

    socket.on("answer_call", (data) => {
        const { to, signal, name, avatar } = data;
        const targetSockets = userSocketMap.get(Number(to));
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                console.log(`Forwarding answer to ${to}`);
                io.to(socketId).emit("call_accepted", { signal, name, avatar });
            });
        }
    });

    socket.on("ice_candidate", (data) => {
        const { to, candidate } = data;
        const targetSockets = userSocketMap.get(Number(to));
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                io.to(socketId).emit("ice_candidate_received", candidate);
            });
        }
    });

    socket.on("end_call", (data) => {
        const { to } = data;
        const targetSockets = userSocketMap.get(Number(to));
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                io.to(socketId).emit("call_ended");
            });
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// App Shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
});

// Start Server
httpServer.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log('Backend restarted verifying fix');
});
