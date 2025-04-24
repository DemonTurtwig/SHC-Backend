import { Request, Response } from 'express';
import Booking from '../models/bookingModel';

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
    const { startDate, endDate } = req.body;
    const bookings = await Booking.find({
      reservationDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ reservationDate: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: '예약 필터링 실패' });
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
