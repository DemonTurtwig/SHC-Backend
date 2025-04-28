// src/controllers/apiController.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { getKakaoUserInfo } from '../services/kakaoService';
import { generateUserId } from '../utils/generateUserId'; 
import { ServiceType } from '../models/applianceModel';
import Booking from '../models/bookingModel';
import { TimeSlot } from '../models/timeslotModel';

const JWT_SECRET = process.env.JWT_SECRET as string;

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

export const loginUser = async (req: Request, res: Response): Promise<void> => {

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !user.password) {
      res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      return;
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
      return;
    }
    
    const token = jwt.sign(
      { _id: user._id, userId: user.userId }, 
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: '서버 오류로 로그인 실패' });
  }
};

// Get all time slots
export const getAllTimeSlots = async (req: Request, res: Response) : Promise<void> => {
  try {
    const docs = await TimeSlot.find({});
    console.log('✅ ALL timeslots fetched:', docs);

    if (docs.length === 0) {
      console.error('❌ No timeslot documents in collection');
      res.json([]);
      return; 
    }

    res.json(docs[0].slots);
  } catch (err) {
    console.error('❌ Failed to fetch timeslots:', err);
    res.status(500).json({ message: 'Failed to fetch timeslots' });
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


export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: '권한이 없습니다.' });
      return;
    }

    const user = await User.findById(req.user?.userId).select('-password');

    if (!user) {
      res.status(404).json({ message: '유저를 찾지 못하였습니다.' });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndDelete(req.user?.userId); // or req.user._id depending on middleware
    res.status(200).json({ message: '유저 삭제 성공!' });
  } catch (err) {
    res.status(500).json({ message: '계정 삭제 실패' });
  }
};

export const getAllServiceTypes = async (req: Request, res: Response) => {
  const serviceTypes = await ServiceType.find();
  res.json(serviceTypes);
};

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  const { subtypeId, serviceTypeId, tier, options, reservationDate, reservationTime, totalPrice } = req.body;

  try {
    const existingBooking = await Booking.findOne({ reservationDate, reservationTime });
    if (existingBooking) {
      res.status(400).json({ message: '이미 해당 날짜와 시간에 예약이 존재합니다.' });
      return;
    }

    let bookerName = '불명';

    if (req.user?.userId) {
      const userDoc = await User.findOne({ userId: req.user.userId }).select('name');
      if (userDoc) {
        bookerName = userDoc.name;
      }
    }

    const newBooking = new Booking({
      user: req.user?.userId ?? null,
      name: bookerName, 
      isGuest: req.user?.isGuest ?? false,
      subtype: subtypeId,
      serviceType: serviceTypeId,
      tier,
      options,
      reservationDate,
      reservationTime,
      totalPrice,
    });

    await newBooking.save();
    res.status(201).json({ message: '예약이 완료되었습니다.' });

  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ message: '예약 생성에 실패했습니다.' });
  }
};

export const getMyBookings = async (req: Request, res: Response) => {
  const { from, to } = req.query;
  const userId = (req as any).user?.userId;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const criteria: any = { user: userId };
  if (from && to) criteria.reservationDate = { $gte: from, $lte: to };

  const docs = await Booking.find(criteria)
               .populate('serviceType', 'label')
               .lean();
  res.json(docs);
};

export const getUserBookingHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await Booking.find({
      user: req.user?.userId ?? null
    }).select('serviceType reservationDate reservationTime name');

    res.json(bookings);
  } catch (err) {
    console.error('Failed to fetch user booking history', err);
    res.status(500).json({ message: '예약 내역을 불러오지 못했습니다.' });
  }
};
