import { Request, Response } from 'express';
import Booking from '../models/bookingModel';
import User from '../models/User';

// GET /api/admin/bookings
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await Booking.find().sort({ reservationDate: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: '전체 예약 조회 실패' });
  }
};

// POST /api/admin/bookings/filter
export const filterAdminBookings = async (req: Request, res: Response) => {
  try {
    /* accept either key set */
    const start = req.body.start     ?? req.body.startDate;
    const end   = req.body.end       ?? req.body.endDate;

    if (!start || !end) {
     res.status(400).json({ message: 'start / end date required' });
     return
    }

    const bookings = await Booking.find({
      reservationDate: { $gte: start, $lte: end },
    }).sort({ reservationDate: -1 });

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/admin/bookings/:id/status
export const updateBookingStatus = async (req: Request, res: Response):Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) res.status(404).json({ message: '예약을 찾을 수 없습니다.' });
    res.json(updated);
    return;
  } catch (err) {
    res.status(500).json({ message: '상태 업데이트 실패' });
  }
  return;
};

// DELETE /api/admin/bookings/:id
export const deleteBookingById = async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await Booking.findByIdAndDelete(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: '예약이 존재하지 않습니다.' });
        return;
      }
      res.json({ message: '예약이 삭제되었습니다.' });
      return;
    } catch (err) {
      res.status(500).json({ message: '예약 삭제 실패' });
      return;
    }
  };
  export const updateIsAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(404).json({ message: '유저를 찾을수 없습니다.' });
        return;
      }
  
      if (typeof req.body.isAdmin !== 'boolean') {
        res.status(400).json({ message: 'isAdmin는 boolean이여야 합니다.' });
        return;
      }
  
      user.isAdmin = req.body.isAdmin;
      await user.save();
  
      res.json({ message: 'updated', isAdmin: user.isAdmin });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: '서버 오류' });
    }
  };

  export const getAllAdminUsers = async (_req: Request, res: Response) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  };
