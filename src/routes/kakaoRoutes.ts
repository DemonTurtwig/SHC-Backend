import express from 'express';
import { searchKakaoAddress } from '../controllers/kakaoController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/address', requireAuth, searchKakaoAddress);

export default router;
