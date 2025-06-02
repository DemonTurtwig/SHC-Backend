// src/services/kakaoService.ts
import axios from "axios";
import User from "../models/User";
import { generateUserId } from "../utils/generateUserId";

export const findOrCreateKakaoUser = async ({ kakaoProfile, phone, shippingAddr }: { kakaoProfile: any; phone: string; shippingAddr?: any }) => {
  const kakaoId = String(kakaoProfile.id);
  const acct = kakaoProfile.kakao_account ?? {};
  const email = acct.email ?? `kakao_${kakaoId}@noemail.com`;
  const nick = kakaoProfile.properties?.nickname ?? "카카오 유저";

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
      address: shippingAddr?.base_address ?? '',
      addressDetail: shippingAddr?.detail_address ?? '',
    });
  } else {
    let updated = false;
    if (!user.address && shippingAddr?.base_address) {
      user.address = shippingAddr.base_address;
      updated = true;
    }
    if (!user.addressDetail && shippingAddr?.detail_address) {
      user.addressDetail = shippingAddr.detail_address;
      updated = true;
    }
    if (updated) await user.save();
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
