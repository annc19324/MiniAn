// src/routes/postRoutes.ts
import express from 'express';
import multer from 'multer';
import { createPost, getFeed, toggleLike, createComment } from '../controllers/postController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // lưu tạm trong RAM

router.post('/', protect, upload.single('image'), createPost);
router.get('/feed', protect, getFeed);
router.post('/:postId/like', protect, toggleLike);
router.post('/:postId/comment', protect, createComment);

export default router;