// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { getKakaoUserInfo } from '../services/kakaoService';
import { generateUserId } from '../utils/generateUserId'; 

const JWT_SECRET = process.env.JWT_SECRET as string;

// POST /api/auth/register
// If req.body.isGuest === true, registers a guest user.
// Otherwise does a normal email+password signup.
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      isGuest,
      name,
      phone,
      email,
      password,
      address,
      addressDetail,
    } = req.body;

    // —— Guest registration branch ——
    if (isGuest === true) {
      if (!name || !phone || !address) {
        res.status(400).json({ message: '비회원은 이름·휴대폰·주소가 필요합니다.' });
        return;
      }

      // generate numeric userId
      const newUserId = await generateUserId();

      const guest = new User({
        userId: newUserId,
        name,
        phone,
        address,
        addressDetail,
        isGuest: true,
        provider: 'guest',
      });

      await guest.save();
      res.status(201).json({ message: '비회원 정보가 저장되었습니다.', userId: guest.userId });
      return;
    }

    // —— Standard registration branch ——
    if (!name || !phone || !email || !password || !address) {
      res.status(400).json({ message: '모든 필드를 입력해주세요.' });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ message: '이미 등록된 이메일입니다.' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUserId = await generateUserId(); // also assign to standard users

    const user = new User({
      userId: newUserId,
      name,
      phone,
      email,
      password: hashed,
      address,
      addressDetail,
      isGuest: false,
      provider: 'standard',
    });

    await user.save();
    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// POST /api/auth/kakao/login
export const kakaoLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ message: '엑세스 토큰이 필요합니다.' });
      return;
    }

    const kakaoData = await getKakaoUserInfo(accessToken);
    const kakaoId = kakaoData.id.toString();
    const name    = kakaoData.kakao_account.profile.nickname;
    const phone   = kakaoData.kakao_account.phone_number || '';

    // find or create
    let user = await User.findOne({ kakaoId });
    if (!user) {
      user = new User({ name, phone, kakaoId, isGuest: false });
      await user.save();
    }

    // issue JWT
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token });
  } catch (err) {
    console.error('Kakao login error:', err);
    res.status(401).json({ message: '카카오 로그인에 실패했습니다.' });
  }
  
};

// --- GET /api/options?subtype=... or ?serviceType=...
import { Option } from '../models/applianceModel';


export const getOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subtype, serviceType } = req.query;

    const query: any = {};
    if (subtype)      query.appliesTo = subtype;
    if (serviceType)  query.appliesTo = serviceType;

    const options = await Option.find(query);
    res.json(options);
  } catch (err) {
    console.error('Error fetching options:', err);
    res.status(500).json({ message: '옵션 정보를 불러오지 못했습니다.' });
  }
};

// --- GET /api/pricing?subtype=...&serviceType=...
import {Pricing} from '../models/applianceModel'; // must be defined

export const getPricing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subtype, serviceType } = req.query;
    if (!subtype || !serviceType) {
      res.status(400).json({ message: 'subtype 및 serviceType 쿼리가 필요합니다.' });
      return;
    }

    const price = await Pricing.findOne({
      subtype,
      serviceType
    });

    if (!price) {
      res.status(404).json({ message: '해당 가격 정보를 찾을 수 없습니다.' });
      return;
    }

    res.json(price);
  } catch (err) {
    console.error('Error fetching pricing:', err);
    res.status(500).json({ message: '가격 정보를 불러오지 못했습니다.' });
  }
};

// --- POST /api/booking
import Booking from '../models/bookingModel';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user, subtype, serviceType, timeSlot, options
    } = req.body;

    const booking = new Booking({
      user,
      subtype,
      serviceType,
      timeSlot,
      options
    });

    await booking.save();
    res.status(201).json({ message: '예약이 완료되었습니다.', bookingId: booking._id });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ message: '예약 처리 중 오류가 발생했습니다.' });
  }

};

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findOne({ userId: req.user.userId }).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};
