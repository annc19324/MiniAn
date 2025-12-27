// src/server.ts
import express from 'express';
import dotenv from 'dotenv';

import cors from 'cors';
import { PrismaClient } from '@prisma/client';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// app.get('/', (req, res) => {
//     res.send('MiniAn Backend is running! Hello from server.ts');
// });
// Test kết nối Prisma
app.get('/test-db', async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        res.json({ message: 'Kết nối database OK!', userCount });
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed', details: error });
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});