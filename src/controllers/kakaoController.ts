import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { findOrCreateKakaoUser } from '../services/kakaoService';

export const kakaoLogin = async (req: Request, res: Response): Promise<void> => {
  const { accessToken } = req.body;

  if (!accessToken) {
   res.status(400).json({ message: 'Access token is required.' });
   return;
  }

  try {
    const kakaoUserRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    const kakaoProfile = kakaoUserRes.data;

    const user = await findOrCreateKakaoUser(kakaoProfile);

    const token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        userId: user.userId,
        isAdmin: user.isAdmin || false,
      },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
        );

        res.status(200).json({
          message: '카카오 로그인에 성공했습니다.',
          user,
          token,
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
