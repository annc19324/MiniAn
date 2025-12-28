// src/routes/postRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { createPost, getFeed, toggleLike, createComment } from '../controllers/postController';
import multer from 'multer';

const router = express.Router();
const upload = multer(); // Xử lý upload file trong memory

router.post('/', protect, upload.single('image'), createPost);
router.get('/', protect, getFeed);
router.post('/:postId/like', protect, toggleLike);
router.post('/:postId/comment', protect, createComment);

export default router;