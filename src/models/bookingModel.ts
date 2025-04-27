import { Schema, model, Types } from 'mongoose';

interface IBookingOption {
  option: Types.ObjectId;  // FK → Option
  choice: string;          // e.g. 'yes', '3M 이상', etc.
}

interface IBooking {
  user:       Types.ObjectId | null;    // FK → User (nullable for guest)
  isGuest:    boolean;
  subtype:    Types.ObjectId;           // FK → SubType
  serviceType: Types.ObjectId;          // FK → ServiceType
  timeSlot:   Types.ObjectId;           // FK → TimeSlot
  options:    IBookingOption[];         // 선택된 옵션들
  status:     '대기' | '확정' | '완료' | '취소'; // 상태
  totalPrice: number;                   // 최종 결제 금액
  createdAt:  Date;
}

const BookingOptionSchema = new Schema<IBookingOption>({
  option: { type: Schema.Types.ObjectId, ref: 'Option', required: true },
  choice: { type: String, required: true }
}, { _id: false });

const BookingSchema = new Schema<IBooking>({
  user:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
  isGuest:    { type: Boolean, default: false },
  subtype:    { type: Schema.Types.ObjectId, ref: 'SubType', required: true },
  serviceType:{ type: Schema.Types.ObjectId, ref: 'ServiceType', required: true },
  timeSlot:   { type: Schema.Types.ObjectId, ref: 'TimeSlot', required: true },
  options:    { type: [BookingOptionSchema], default: [] },
  status:     { type: String, enum: ['대기', '확정', '완료', '취소'], default: '대기' },
  totalPrice: { type: Number, required: true },
  createdAt:  { type: Date, default: Date.now }
});

interface ITimeSlot {
  date: Date | null;
  type: string;  // e.g. 'generic'
  slots: { time: string }[]; // Array of { time: '06:00' }
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

export const TimeSlot = model<ITimeSlot>('TimeSlot', TimeSlotSchema);


export default model<IBooking>('Booking', BookingSchema);
