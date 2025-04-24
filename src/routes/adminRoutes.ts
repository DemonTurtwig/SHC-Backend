import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import {getAllBookings, filterAdminBookings, deleteBookingById, updateBookingStatus} from '../controllers/adminController';


const router = express.Router();

router.use('/', requireAuth, requireAdmin);

// Ensure all routes are protected
router.use(requireAuth, requireAdmin);

// --- Booking Management
router.get('/bookings', getAllBookings);
router.post('/bookings/filter', filterAdminBookings);
router.patch('/bookings/:id/status', updateBookingStatus);
router.delete('/bookings/:id', deleteBookingById);

export default router;