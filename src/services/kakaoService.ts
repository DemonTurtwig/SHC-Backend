// src/services/kakaoService.ts
import User from '../models/User';
import { generateUserId } from '../utils/generateUserId';

interface Params {
  kakaoProfile: any;
  phone: string;
  shippingAddr?: { base_address?: string; detail_address?: string } | null;
}

export const findOrCreateKakaoUser = async ({
  kakaoProfile,
  phone,
  shippingAddr,
}: Params) => {
  const kakaoId = String(kakaoProfile.id);
  const acct    = kakaoProfile.kakao_account ?? {};
  const email   = acct.email ?? `kakao_${kakaoId}@noemail.com`;
  const nick    = kakaoProfile.properties?.nickname ?? '카카오 유저';

  // 1️⃣  create if absent
  let user = await User.findOne({ kakaoId });
  if (!user) {
    user = await User.create({
      email,
      name:    nick,
      phone,                     // formatted “010-1234-5678”
      provider: 'kakao',
      userId:  await generateUserId(),
      kakaoId,
      isGuest: false,
      isAdmin: false,
      emailVerified: true,
      address:       shippingAddr?.base_address  ?? '',
      addressDetail: shippingAddr?.detail_address ?? '',
    });
  }

  // 2️⃣  **always** run an up-to-date check
  let mutated = false;

  // address / detail — fill in if we finally have them
  if (!user.address && shippingAddr?.base_address) {
    user.address = shippingAddr.base_address;
    mutated = true;
  }
  if (!user.addressDetail && shippingAddr?.detail_address) {
    user.addressDetail = shippingAddr.detail_address;
    mutated = true;
  }

  // phone — update if it was the dummy value and we now have a real one
  if (user.phone?.startsWith('010-0000') && phone && phone !== user.phone) {
    user.phone = phone;
    mutated = true;
  }

  if (mutated) await user.save();
  return user;
};
