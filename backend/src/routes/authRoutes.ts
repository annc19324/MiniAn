// src/routes/authRoutes.ts
import express from 'express';
import { register, login } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Đăng ký
router.post('/register', register);

// Đăng nhập
router.post('/login', login);

// Lấy thông tin user hiện tại (test protected route)
router.get('/me', protect, (req: any, res) => {
    res.json({ user: req.user });
});

export default router;