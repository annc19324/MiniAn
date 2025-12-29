// src/routes/postRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { createPost, getFeed, toggleLike, createComment, getUserPosts, getPostById } from '../controllers/postController';
import multer from 'multer';

const router = express.Router();
const upload = multer(); // Xử lý upload file trong memory

router.post('/', protect, upload.single('image'), createPost);
router.get('/', protect, getFeed);
router.get('/user/:userId', protect, getUserPosts);
router.post('/:postId/like', protect, toggleLike);
router.post('/:postId/comment', protect, createComment);
router.get('/:id', protect, getPostById);

export default router;