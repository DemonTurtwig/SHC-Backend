// src/routes/apiRoutes.ts
import express from 'express';
import { registerUser, kakaoLogin, getOptions, getPricing, createBooking, getCurrentUser, loginUser, deleteUser} from '../controllers/apiController';
import { requireAuth } from '../middleware/authMiddleware';
import { getBookingInitializeData } from '../controllers/bookingController';


const router = express.Router();


router.post('/register', registerUser);
router.post('/kakao/login', kakaoLogin);
router.post('/login', loginUser);
router.get('/options', getOptions);       
router.get('/pricing', getPricing);
router.post('/booking', createBooking); 
router.get('/users/me', requireAuth, getCurrentUser);
router.get('/booking/initialize', getBookingInitializeData);
router.delete('/users/me', requireAuth, deleteUser);

export default router;
