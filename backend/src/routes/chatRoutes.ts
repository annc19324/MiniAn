// src/routes/chatRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import multer from 'multer';
import {
    getConversations, getMessages, startConversation, sendMessage, markAsRead,
    deleteConversation, updateMessage, deleteMessage,
    createGroup, updateGroup, addGroupMember, removeGroupMember, leaveGroup, muteConversation
} from '../controllers/chatController';

const router = express.Router();
const upload = multer();

router.get('/conversations', protect, getConversations);
router.post('/conversation/start', protect, startConversation);
router.delete('/conversation/:id', protect, deleteConversation);

router.get('/:roomId/messages', protect, getMessages);
router.post('/:roomId/messages', protect, upload.single('file'), sendMessage);
router.put('/read/:roomId', protect, markAsRead);

router.put('/message/:id', protect, updateMessage);
router.delete('/message/:id', protect, deleteMessage);

// Group chat routes
router.post('/group/create', protect, createGroup);
router.put('/group/:id', protect, upload.single('image'), updateGroup);
router.post('/group/:id/member/add', protect, addGroupMember);
router.delete('/group/:id/member/remove', protect, removeGroupMember);
router.post('/group/:id/leave', protect, leaveGroup);
router.put('/conversation/:id/mute', protect, muteConversation);

export default router;

