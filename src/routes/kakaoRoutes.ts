import express from 'express';
import { searchKakaoAddress } from '../controllers/kakaoController';

const router = express.Router();

router.get('/address', searchKakaoAddress);

export default router;
