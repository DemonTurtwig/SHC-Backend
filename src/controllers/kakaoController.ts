import { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { findOrCreateKakaoUser } from "../services/kakaoService";
import User from '../models/User';
import Booking from '../models/bookingModel';


export const kakaoLogin = async (req: Request, res: Response): Promise<void> => {
  const { accessToken } = req.body;
  if (!accessToken) {
    res.status(400).json({ message: 'Access token is required.' });
    return;
  }

  try {
    /* 1 ─ fetch user profile */
    const { data: kakaoProfile } = await axios.get(
      'https://kapi.kakao.com/v2/user/me',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );

    /* 2 ─ normalise / fallback phone */
    const acct = kakaoProfile.kakao_account ?? {};
    let rawPhone = acct.phone_number?.replace(/\D/g, '');
    let phone = '';

    if (rawPhone?.startsWith('82')) {
      rawPhone = '0' + rawPhone.slice(2); // 8210xxxxxxx → 010xxxxxxx
    }

    if (rawPhone && rawPhone.length === 11) {
      // Format to 010-1234-5678
      phone = `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`;
    } else {
      // Fallback: dummy number in same format
      const fallback = `010${(kakaoProfile.id % 10_000_000_00).toString().padStart(8, '0')}`;
      phone = `${fallback.slice(0, 3)}-${fallback.slice(3, 7)}-${fallback.slice(7)}`;
    }

    /* 3 ─ create / find user (without shipping address) */
    const user = await findOrCreateKakaoUser({
      ...kakaoProfile,
      phone,
      shippingAddr: null, // Explicitly null for clarity
    });

    /* 4 ─ prompt check */
    const needsPhoneUpdate = !rawPhone;

    /* 5 ─ sign JWT */
    const token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        userId: user.userId,
        isAdmin: user.isAdmin,
        provider: 'kakao',
        phoneNeedsUpdate: needsPhoneUpdate,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    /* 6 ─ respond */
    res.status(200).json({
      message: '카카오 로그인에 성공했습니다.',
      user,
      token,
      needsPhoneUpdate,
    });
  } catch (err: any) {
    console.error('Kakao login error:', err?.response?.data || err);
    res.status(500).json({ message: '카카오 로그인에 실패했습니다.' });
  }
};


export const searchKakaoAddress = async (req: Request, res: Response): Promise<void> => {
  const query = String(req.query.query ?? '').trim();

  if (!query) {
    res.status(400).json({ message: '주소 쿼리가 필요합니다.' });
    return;
  }
  if (!process.env.KAKAO_REST_API_KEY) {
    console.error('❗ Kakao REST API Key is missing');
    res.status(500).json({ message: '서버 환경변수 오류' });
    return;
  }

  try {
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
      },
      params: {
        query,
        category_group_code: 'AD5',
        size: 30,
      },
    });

    res.status(200).json(response.data);
  } catch (err: any) {
    console.error('Kakao API 오류:', err?.response?.data || err.message);
    res.status(500).json({ message: '카카오 주소 검색 실패' });
  }
};

export const searchExpandedRoad = async (req: Request, res: Response): Promise<void> => {
  const base = req.query.query?.toString();
  if (!base) {
    res.status(400).json({ message: 'query required' });
    return;
  }

  try {
    const addresses = [];

    for (let i = 1; i <= 30; i++) {
      const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        },
        params: { query: `${base} ${i}` },
      });

      const filtered = response.data.documents.filter((d: any) => d.road_address);
      if (filtered.length) {
        addresses.push(...filtered);
      }

      if (addresses.length >= 5) break;
    }

    res.status(200).json(addresses);
  } catch (err: any) {
    console.error('searchExpandedRoad error:', err.response?.data || err.message);
    res.status(500).json({ message: '주소 확장 검색 실패' });
  }
};
export { findOrCreateKakaoUser };

export const kakaoUnlink = async (req: Request, res: Response) : Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user || user.provider !== 'kakao' || !user.kakaoId) {
       res.status(400).json({ message: '유효하지 않은 카카오 유저입니다.' });
       return
    }

    await axios.post(
      'https://kapi.kakao.com/v1/user/unlink',
      `target_id_type=user_id&target_id=${user.kakaoId}`,
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    await user.deleteOne();
    res.status(204).end();
  } catch (err: any) {
    console.error('Kakao unlink error:', err?.response?.data || err);
    res.status(500).json({ message: '카카오 계정 해지에 실패했습니다.' });
  }
};

export const deleteKakaoAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user || user.provider !== 'kakao' || !user.kakaoId) {
      res.status(400).json({ message: '유효하지 않은 카카오 유저입니다.' });
      return;
    }

    // 1️⃣ Unlink Kakao
    try {
      await axios.post(
        'https://kapi.kakao.com/v1/user/unlink',
        `target_id_type=user_id&target_id=${user.kakaoId}`,
        {
          headers: {
            Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      console.log(`✅ Kakao unlink success for ${user.kakaoId}`);
    } catch (unlinkErr) {
      console.error('Kakao unlink failed:', (unlinkErr as any)?.response?.data || unlinkErr);
    }

    // 2️⃣ Delete bookings (if any)
    await Booking.deleteMany({ user: user._id });

    // 3️⃣ Delete user
    await user.deleteOne();

    res.status(200).json({ message: '카카오 계정과 관련 데이터가 삭제되었습니다.' });
  } catch (err) {
    console.error('deleteKakaoAccount error:', err);
    res.status(500).json({ message: '카카오 계정 삭제에 실패했습니다.' });
  }
};
