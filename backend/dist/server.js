"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.prisma = void 0;
// backend/src/server.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Database Setup
const pool = new pg_1.default.Pool({
    connectionString: process.env.DATABASE_URL
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prismaInstance = new client_1.PrismaClient({ adapter });
exports.prisma = prismaInstance;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/posts', postRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.get('/', (req, res) => {
    res.send('🚀 MiniAn Backend is running.');
});
app.get('/test-db', async (req, res) => {
    try {
        const userCount = await exports.prisma.user.count();
        res.json({
            message: 'Kết nối database thành công!',
            userCount,
            tip: 'Nếu userCount > 0 thì admin đã được seed!',
        });
    }
    catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({
            error: 'Lỗi kết nối DB',
            details: error instanceof Error ? error.message : error
        });
    }
});
// Socket.io Setup
const httpServer = (0, http_1.createServer)(app);
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*", // Cập nhật domain frontend khi deploy
        methods: ["GET", "POST"]
    }
});
app.set('io', exports.io); // Make io accessible in controllers via req.app.get('io')
exports.io.on("connection", (socket) => {
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
    await exports.prisma.$disconnect();
    await pool.end();
    process.exit(0);
});
// Start Server
httpServer.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map