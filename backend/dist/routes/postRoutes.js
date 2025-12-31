"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/postRoutes.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const postController_1 = require("../controllers/postController");
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)(); // Xử lý upload file trong memory
router.post('/', authMiddleware_1.protect, upload.single('image'), postController_1.createPost);
router.get('/', authMiddleware_1.protect, postController_1.getFeed);
router.get('/user/:userId', authMiddleware_1.protect, postController_1.getUserPosts);
router.post('/:postId/like', authMiddleware_1.protect, postController_1.toggleLike);
router.post('/:postId/comment', authMiddleware_1.protect, postController_1.createComment);
router.get('/:id', authMiddleware_1.protect, postController_1.getPostById);
exports.default = router;
//# sourceMappingURL=postRoutes.js.map