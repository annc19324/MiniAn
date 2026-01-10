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
import { sendPushNotification } from './controllers/pushController';

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
// Map ReceiverId -> CallData (Pending calls for users who are offline/background)
const pendingCalls = new Map<number, any>();

// Map ReceiverId -> Interval (For looping call notifications)
const callPulseIntervals = new Map<number, NodeJS.Timeout>();

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
                socket.broadcast.emit('user_status_change', { userId: uid, isOnline: true });
            }

            // Check for pending calls (Call waiting while offline/background)
            const pendingCall = pendingCalls.get(uid);
            if (pendingCall) {
                console.log(`Delivering pending call to ${uid}`);
                socket.emit("call_incoming", pendingCall);
            }
        } catch (e) {
            console.error("Error updating online status:", e);
        }
    });

    socket.on('disconnect', async () => {
        const userId = (socket as any).userId;
        if (userId) {
            const uid = Number(userId);

            // CLEANUP PULSE IF CALLER
            // If this user was calling someone, stop the pulse to that person
            // How do we know who they are calling? We iterate pendingCalls?
            for (const [receiverId, callData] of pendingCalls.entries()) {
                if (callData.fromUser === uid) {
                    pendingCalls.delete(receiverId);
                    // Stop Pulse
                    if (callPulseIntervals.has(receiverId)) {
                        clearInterval(callPulseIntervals.get(receiverId)!);
                        callPulseIntervals.delete(receiverId);
                    }
                    // Send End Call Signal?
                    const targetSockets = userSocketMap.get(receiverId);
                    if (targetSockets) targetSockets.forEach(s => io.to(s).emit("call_ended"));

                    // Send Push Cancellation
                    sendPushNotification(receiverId, { title: "Cuộc gọi đã kết thúc", body: "", type: 'call_ended' } as any).catch(e => { });
                }
            }

            if (userSocketMap.has(uid)) {
                userSocketMap.get(uid)!.delete(socket.id);
                if (userSocketMap.get(uid)!.size === 0) {
                    userSocketMap.delete(uid);
                    try {
                        const now = new Date();
                        await prisma.user.update({ where: { id: uid }, data: { isOnline: false, lastSeen: now } });
                        socket.broadcast.emit('user_status_change', { userId: uid, isOnline: false, lastSeen: now });
                    } catch (e) { console.error("Error updating offline status:", e); }
                }
            }

            // Cleanup pending calls initiated by this user
            for (const [receiverId, callData] of pendingCalls.entries()) {
                if (callData.fromUser === uid) {
                    pendingCalls.delete(receiverId);
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
        pendingCalls.set(Number(userToCall), data);

        const targetSockets = userSocketMap.get(Number(userToCall));
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                console.log(`Forwarding call from ${fromUser} to ${userToCall}`);
                io.to(socketId).emit("call_incoming", data); // Forward full data
            });
        }

        // === PULSE PUSH LOGIC (Looping Ring) ===
        // Clear any existing beat
        if (callPulseIntervals.has(Number(userToCall))) {
            clearInterval(callPulseIntervals.get(Number(userToCall))!);
        }

        const sendCallPush = () => {
            // Check if call is still pending
            if (!pendingCalls.has(Number(userToCall))) {
                if (callPulseIntervals.has(Number(userToCall))) {
                    clearInterval(callPulseIntervals.get(Number(userToCall))!);
                    callPulseIntervals.delete(Number(userToCall));
                }
                return;
            }

            sendPushNotification(Number(userToCall), {
                title: `Cuộc gọi video từ ${data.name || "Minian User"}`,
                body: "Nhấn để trả lời ngay",
                url: "/",
                // @ts-ignore
                android: {
                    channelId: 'minian_call_headsup', // Consistent Channel ID
                    sound: 'annc19324_sound.mp3'
                },
                type: 'call_incoming'
            }).catch(err => console.error("Call Push Error:", err));
        };

        // Send immediately
        sendCallPush();

        // Repeat every 6 seconds
        const interval = setInterval(sendCallPush, 6000);
        callPulseIntervals.set(Number(userToCall), interval);

        // Auto-stop after 60s (Timeout)
        setTimeout(() => {
            if (callPulseIntervals.has(Number(userToCall))) {
                clearInterval(callPulseIntervals.get(Number(userToCall))!);
                callPulseIntervals.delete(Number(userToCall));
            }
        }, 60000);
    });

    socket.on("answer_call", (data) => {
        const { to, signal, name, avatar } = data;

        // STOP PULSE
        // Actually, we must clear pulse for the User who WAS being called.
        // Data.to is the CALLER.
        // The one answering is... sending the event.
        const answeringUserId = (socket as any).userId;
        if (answeringUserId && callPulseIntervals.has(answeringUserId)) {
            clearInterval(callPulseIntervals.get(answeringUserId)!);
            callPulseIntervals.delete(answeringUserId);
        }

        const targetSockets = userSocketMap.get(Number(to));
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                console.log(`Forwarding answer to ${to}`, { name, avatar });
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
        pendingCalls.delete(Number(to));

        // STOP PULSE for target
        if (callPulseIntervals.has(Number(to))) {
            clearInterval(callPulseIntervals.get(Number(to))!);
            callPulseIntervals.delete(Number(to));
        }
        // Also stop pulse for Sender (if they were the one being called and decided to hang up?)
        const senderId = (socket as any).userId;
        if (senderId && callPulseIntervals.has(senderId)) {
            clearInterval(callPulseIntervals.get(senderId)!);
            callPulseIntervals.delete(senderId);
        }

        const targetSockets = userSocketMap.get(Number(to));
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                io.to(socketId).emit("call_ended");
            });
        }

        // Always send "Call Ended" push to cancel notification
        sendPushNotification(Number(to), {
            title: "Cuộc gọi đã kết thúc",
            body: "",
            // @ts-ignore
            type: 'call_ended'
        }).catch(err => console.error("Call End Push Error:", err));
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
