import { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { findOrCreateKakaoUser } from "../services/kakaoService";
import User from '../models/User';


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

    /* 1-b ─ fetch default shipping address (no-scope → ignore) */
    let shippingAddr:
      | { base_address?: string; detail_address?: string }
      | null = null;

    try {
      const { data: addrRes } = await axios.get(
        'https://kapi.kakao.com/v1/user/shipping_address',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { address_id: 'default' },
        }
      );

      const def = addrRes.shipping_addresses?.find((a: any) => a.is_default);
      if (def) {
        shippingAddr = {
          base_address: def.base_address,
          detail_address: def.detail_address ?? '',
        };
      }
    } catch (_) {
      /* 403 when user hasn’t granted the scope → just continue */
    }

    /* 2 ─ normalise / fallback phone */
    const acct = kakaoProfile.kakao_account ?? {};
    const rawPhone = acct.phone_number?.replace(/\D/g, '');
    const phone =
      rawPhone ||
      `010${(kakaoProfile.id % 10_000_000_00).toString().padStart(8, '0')}`; // placeholder

    /* 3 ─ create / find user */
    const user = await findOrCreateKakaoUser({
      ...kakaoProfile,
      phone,
      shippingAddr,
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
      shippingAddr,
    });
  } catch (err) {
    console.error('Kakao login error:', err);
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
