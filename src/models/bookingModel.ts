import mongoose, { Schema, model, Types } from 'mongoose';

// Booking Option
interface IBookingOption {
  option: Types.ObjectId;
  choice: string;
}

interface IBooking {
  user: Types.ObjectId | null;
  isGuest: boolean;
  subtype: Types.ObjectId;
  serviceType: Types.ObjectId;
  timeSlot: Types.ObjectId;
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
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  isGuest: { type: Boolean, default: false },
  subtype: { type: Schema.Types.ObjectId, ref: 'SubType', required: true },
  serviceType: { type: Schema.Types.ObjectId, ref: 'ServiceType', required: true },
  timeSlot: { type: Schema.Types.ObjectId, ref: 'TimeSlot', required: true },
  options: { type: [BookingOptionSchema], default: [] },
  status: { type: String, enum: ['대기', '확정', '완료', '취소'], default: '대기' },
  totalPrice: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// TimeSlot
interface ITimeSlot {
  date: Date | null;
  type: string;
  slots: { time: string }[];
}

const TimeSlotSchema = new Schema<ITimeSlot>({
  date: { type: Date, default: null },
  type: { type: String, required: true },
  slots: [
    {
      time: { type: String, required: true }
    }
  ]
});

export const TimeSlot = (mongoose.models.TimeSlot as mongoose.Model<ITimeSlot>) || model<ITimeSlot>('TimeSlot', TimeSlotSchema, 'timeslots');

export default model<IBooking>('Booking', BookingSchema);

