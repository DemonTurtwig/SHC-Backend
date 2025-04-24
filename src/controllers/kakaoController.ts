// src/controllers/kakaoController.ts
import { Request, Response } from 'express';
import axios from 'axios';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY!;

export const searchKakaoAddress = async (req: Request, res: Response): Promise<void> => {
  const query = req.query.query as string;
  if (!query) {
    res.status(400).json({ message: '주소 쿼리가 필요합니다.' });
    return;
  }
 
  try {
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
      params: { query },
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Kakao API 오류:', error.message);
    res.status(500).json({ message: '카카오 주소 검색 실패' });
  }
};
