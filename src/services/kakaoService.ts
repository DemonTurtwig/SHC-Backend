// src/services/kakaoService.ts
import axios from "axios";
import User from "../models/User";
import { generateUserId } from "../utils/generateUserId";

export const findOrCreateKakaoUser = async (profile: any) => {
  const kakaoId = String(profile.id);
  const acct = profile.kakao_account ?? {};
  const email = acct.email ?? `kakao_${kakaoId}@noemail.com`;
  const phone = profile.phone as string;
  const phoneNeedsUpdate = profile.phoneNeedsUpdate as boolean ?? false;
  const nick = profile.properties?.nickname ?? "카카오 유저";

  let user = await User.findOne({ kakaoId });
  if (!user) {
    user = await User.create({
      email,
      name: nick,
      phone,
      provider: "kakao",
      userId: await generateUserId(),
      kakaoId,
      isGuest: false,
      isAdmin: false,
      emailVerified: true,
      address: profile.shippingAddr?.base_address ?? '',
      addressDetail: profile.shippingAddr?.detail_address ?? '',
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
