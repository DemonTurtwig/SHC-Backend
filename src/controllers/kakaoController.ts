// src/controllers/kakaoController.ts
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import User from '../models/User';
import { generateUserId } from '../utils/generateUserId';

export const kakaoLogin = async (req: Request, res: Response): Promise<void> => {
  const { accessToken } = req.body;

  if (!accessToken) {
     res.status(400).json({ message: 'Access token is required.' });
    return
  }

  try {
    const kakaoRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    const kakaoUser = kakaoRes.data;
    const kakaoId = kakaoUser.id;
    const kakaoEmail = kakaoUser.kakao_account?.email || `kakao_${kakaoId}@noemail.com`;
    const kakaoNickname = kakaoUser.properties?.nickname || '카카오 유저';

    let user = await User.findOne({ email: kakaoEmail });
    if (!user) {
      const newUserId = await generateUserId();
      user = await User.create({
        email: kakaoEmail,
        name: kakaoNickname,
        provider: 'kakao',
        userId: newUserId,
        isGuest: false,
        isAdmin: false,
        emailVerified: true,
      });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        userId: user.userId,
        isAdmin: user.isAdmin,
        isGuest: user.isGuest,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err: any) {
    console.error('Kakao login error:', err?.response?.data || err.message);
    res.status(401).json({ message: '카카오 인증에 실패했습니다.' });
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
      const query = `${base} ${i}`;
      const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        },
        params: { query },
      });
      if (response.data.documents.length) {
        addresses.push(...response.data.documents);
        if (addresses.length >= 5) break;
      }
    }

    res.status(200).json(addresses);
  } catch (err: any) {
    console.error('searchExpandedRoad error:', err.response?.data || err.message);
    res.status(500).json({ message: '주소 확장 검색 실패' });
  }
};
