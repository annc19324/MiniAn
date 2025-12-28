// src/routes/notificationRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getNotifications, markRead, markAllRead } from '../controllers/notificationController';

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markRead);
router.put('/read-all', protect, markAllRead);

export default router;
