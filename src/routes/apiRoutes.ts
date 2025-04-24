// src/routes/apiRoutes.ts
import express from 'express';
import { registerUser, kakaoLogin, getOptions, getPricing, createBooking, getCurrentUser } from '../controllers/apiController';
import { requireAuth } from '../middleware/authMiddleware';
import { getBookingInitializeData } from '../controllers/bookingController';


const router = express.Router();

// --- Auth
router.post('/register', registerUser);
router.post('/kakao/login', kakaoLogin);

// --- Options
router.get('/options', getOptions);       

// --- Pricing
router.get('/pricing', getPricing);

// --- Booking
router.post('/booking', createBooking); 

router.get('/users/me', requireAuth, getCurrentUser);

router.get('/booking/initialize', getBookingInitializeData);

export default router;
