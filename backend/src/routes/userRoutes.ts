// src/routes/userRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getUserProfile, dailyCheckIn, getAllUsers, updateUserStatus } from '../controllers/userController';

const router = express.Router();

// Public / Protected Routes
router.get('/profile/:id', getUserProfile);
router.post('/check-in', protect, dailyCheckIn);

// Admin Routes
router.get('/admin/users', protect, getAllUsers);
router.put('/admin/users/:id', protect, updateUserStatus);

export default router;
