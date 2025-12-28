// backend/src/server.ts
import express from 'express';
import dotenv from 'dotenv';
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

dotenv.config();

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

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
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Cập nhật domain frontend khi deploy
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("send_message", (data) => {
        // data: { roomId, message, senderId ... }
        // Lưu vào DB ở đây hoặc gọi controller
        socket.to(data.roomId).emit("receive_message", data);
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