// src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  userId?: number;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  address?: string;
  addressDetail?: string;
  isGuest: boolean;
  isAdmin: boolean;
  kakaoId?: string;
  provider?: 'standard' | 'kakao' | 'guest';
  providerId?: string;
  emailVerified: boolean;
}


const UserSchema = new mongoose.Schema({
  userId: {
    type: Number,
    unique: true,
    sparse: true, // guests may not have it yet
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required(this: IUser) {
      return this.provider === 'standard' || this.provider === 'guest';
    },
  },
  email: {
    type: String,
    required: function (this: any) {
      return this.provider !== 'guest';
    },
  },
  password: {
    type: String,
    required: function (this: any) {
      return this.provider !== 'guest' && this.provider !== 'kakao';
    },
  },
  
  address: {
    type: String,
    required: false,
  },
  addressDetail: {
    type: String,
    required: false,
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  kakaoId: {
    type: String,
    required: false,
  },
  provider: {
    type: String,
    enum: ['standard', 'kakao', 'guest', null],
    default: 'standard',
  },
  providerId: {
    type: String,
    required: false,
  },
  
  emailVerified: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
export default User;
