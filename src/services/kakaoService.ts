// src/services/kakaoService.ts
import axios from "axios";
import User from "../models/User";
import { generateUserId } from "../utils/generateUserId";

export const findOrCreateKakaoUser = async (kakao: any) => {
  const kakaoId    = kakao.id;
  const acct       = kakao.kakao_account ?? {};
  const nick       = kakao.properties?.nickname ?? '카카오 유저';
  const email      = acct.email ?? `kakao_${kakaoId}@noemail.com`;
  const rawPhone   = acct.phone_number?.replace(/\D/g, '');

  // fallback: 010 + last 8 digits of kakaoId + random digit
  const phone      = rawPhone || `010${(kakaoId % 10_000_000_00)
                                     .toString()
                                     .padStart(8, '0')}`;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      name: nick,
      phone,
      provider: 'kakao',
      userId: await generateUserId(),
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
