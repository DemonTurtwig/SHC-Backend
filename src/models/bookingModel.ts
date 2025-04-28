import mongoose, { Schema, model, Types } from 'mongoose';


interface IBookingOption {
  option: Types.ObjectId;
  choice: string;
}

interface IBooking {
  user: number | null;
  isGuest: boolean;
  subtype: Types.ObjectId;
  serviceType: Types.ObjectId;
  reservationDate: string; // YYYY-MM-DD format
  reservationTime: string; // e.g., "06:30"
  options: IBookingOption[];
  status: '대기' | '확정' | '완료' | '취소';
  totalPrice: number;
  createdAt: Date;
}

const BookingOptionSchema = new Schema<IBookingOption>({
  option: { type: Schema.Types.ObjectId, ref: 'Option', required: true },
  choice: { type: String, required: true }
}, { _id: false });

const BookingSchema = new Schema<IBooking>({
  user: { type: Number, ref: 'User', default: null },
  isGuest: { type: Boolean, default: false },
  subtype: { type: Schema.Types.ObjectId, ref: 'SubType', required: true },
  serviceType: { type: Schema.Types.ObjectId, ref: 'ServiceType', required: true },
  reservationDate: { type: String, required: true },
  reservationTime: { type: String, required: true },
  options: { type: [BookingOptionSchema], default: [] },
  status: { type: String, enum: ['대기', '확정', '완료', '취소'], default: '대기' },
  totalPrice: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default model<IBooking>('Booking', BookingSchema);
