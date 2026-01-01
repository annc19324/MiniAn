// backend/src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
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
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prismaInstance = new PrismaClient({ adapter });
export const prisma = prismaInstance;

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

// Socket.io Setup
const httpServer = createServer(app);
export const io = new Server(httpServer, {
    cors: {
        origin: "*", // Cập nhật domain frontend khi deploy
        methods: ["GET", "POST"]
    }
});
app.set('io', io); // Make io accessible in controllers via req.app.get('io')

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomId) => {
        socket.join(String(roomId));
        console.log(`User ${socket.id} joined room ${String(roomId)}`);
    });

    socket.on("send_message", (data) => {
        // data: { roomId, message, senderId ... }
        // Lưu vào DB ở đây hoặc gọi controller
        console.log(`Broadcasting message to room ${data.roomId}`);
        socket.to(String(data.roomId)).emit("receive_message", data);
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
});
