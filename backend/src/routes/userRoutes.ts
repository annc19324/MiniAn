// src/routes/userRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getUserProfile, dailyCheckIn, getAllUsers, updateUserStatus, searchUsers, followUser, updateUserProfile, getLeaderboard, changePassword } from '../controllers/userController';
import multer from 'multer';

const upload = multer();
const router = express.Router();

// Public / Protected Routes
router.get('/profile/:id', protect, getUserProfile);
router.put('/profile/update', protect, upload.single('avatar'), updateUserProfile); // User update profile
router.put('/profile/change-password', protect, changePassword);
router.post('/check-in', protect, dailyCheckIn);
router.get('/search', protect, searchUsers);
router.post('/follow/:id', protect, followUser);
router.get('/leaderboard', getLeaderboard); // Public

// Admin Routes
router.get('/admin/users', protect, getAllUsers);
router.put('/admin/users/:id', protect, updateUserStatus);

export default router;
