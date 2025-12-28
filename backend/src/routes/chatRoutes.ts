// src/routes/chatRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getConversations, getMessages, startConversation, sendMessage } from '../controllers/chatController';

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.post('/conversation/start', protect, startConversation);
router.get('/:roomId/messages', protect, getMessages);
router.post('/:roomId/messages', protect, sendMessage);

export default router;
