// src/routes/chatRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getConversations, getMessages, startConversation, sendMessage, markAsRead, deleteConversation, updateMessage, deleteMessage } from '../controllers/chatController';

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.post('/conversation/start', protect, startConversation);
router.delete('/conversation/:id', protect, deleteConversation);

router.get('/:roomId/messages', protect, getMessages);
router.post('/:roomId/messages', protect, sendMessage);
router.put('/read/:roomId', protect, markAsRead);

router.put('/message/:id', protect, updateMessage);
router.delete('/message/:id', protect, deleteMessage);

export default router;
