// src/services/kakaoService.ts
import axios from 'axios';
import User from '../models/User';
import {generateUserId} from '../utils/generateUserId';

export const findOrCreateKakaoUser = async (kakaoProfile: any) => {
  const kakaoId = kakaoProfile.id;
  const kakaoEmail = kakaoProfile.kakao_account?.email || `kakao_${kakaoId}@noemail.com`;
  const kakaoNickname = kakaoProfile.properties?.nickname || '카카오 유저';

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

  return user;
};

export const getKakaoUserInfo = async (accessToken: string) => {
  const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

export const searchKakaoAddress = async (query: string) => {
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    console.error('❌ Kakao REST API key is missing. Check your .env setup.');
    throw new Error('Kakao API key not found');
  }

  const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
    headers: {
      Authorization: `KakaoAK ${apiKey}`,
    },
    params: {
      query,
    },
  });

  return response.data;
};

