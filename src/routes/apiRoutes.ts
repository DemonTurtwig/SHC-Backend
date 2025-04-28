// src/routes/apiRoutes.ts
import express from 'express';
import { registerUser, createBooking, kakaoLogin, getOptions, getPricing, getCurrentUser, loginUser, deleteUser, getAllServiceTypes, getAllTimeSlots, getUserBookingHistory} from '../controllers/apiController';
import { requireAuth } from '../middleware/authMiddleware';
import { getBookingInitializeData } from '../controllers/bookingController';



const router = express.Router();


router.post('/register', registerUser);
router.post('/kakao/login', kakaoLogin);
router.post('/login', loginUser);
router.get('/options', getOptions);       
router.get('/pricing', getPricing);
router.post('/booking', requireAuth, createBooking);
router.get('/timeslots', getAllTimeSlots);
router.get('/users/me', requireAuth, getCurrentUser);
router.get('/booking/initialize', getBookingInitializeData);
router.delete('/users/me', requireAuth, deleteUser);
router.get('/servicetypes', getAllServiceTypes);
router.get('/history', requireAuth, getUserBookingHistory);
export default router;


