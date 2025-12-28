// src/routes/userRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getUserProfile, dailyCheckIn, getAllUsers, updateUserStatus, searchUsers, followUser } from '../controllers/userController';

const router = express.Router();

// Public / Protected Routes
router.get('/profile/:id', protect, getUserProfile);
router.post('/check-in', protect, dailyCheckIn);
router.get('/search', protect, searchUsers);
router.post('/follow/:id', protect, followUser);

// Admin Routes
router.get('/admin/users', protect, getAllUsers);
router.put('/admin/users/:id', protect, updateUserStatus);

export default router;
