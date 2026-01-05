import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getNotifications, markRead, markAllRead, getUnreadNotificationCount } from '../controllers/notificationController';
import { subscribe } from '../controllers/pushController';

const router = express.Router();

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadNotificationCount);
router.put('/:id/read', protect, markRead);
router.put('/read-all', protect, markAllRead);
router.post('/subscribe', protect, subscribe);

export default router;
