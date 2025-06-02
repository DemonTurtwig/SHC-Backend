// src/services/kakaoService.ts
import User from '../models/User';
import { generateUserId } from '../utils/generateUserId';

interface Params {
  kakaoProfile: any;
  phone: string;
  shippingAddr?: { base_address?: string; detail_address?: string } | null;
}

export const findOrCreateKakaoUser = async (
  { kakaoProfile, phone, shippingAddr }: {
    kakaoProfile: any; phone: string; shippingAddr?: { base_address?: string; detail_address?: string } | null;
  },
) => {
  const kakaoId = String(kakaoProfile.id);
  const acct    = kakaoProfile.kakao_account ?? {};
  const email   = acct.email ?? `kakao_${kakaoId}@noemail.com`;
  const nick    = kakaoProfile.properties?.nickname ?? '카카오 유저';

  let user = await User.findOne({ kakaoId });

  /* ───────────────────────────────────────── create ─ */
  if (!user) {
    user = await User.create({
      email,
      name:   nick,
      phone,                        // formatted 010-1234-5678
      provider: 'kakao',
      userId:  await generateUserId(),
      kakaoId,
      isGuest: false,
      isAdmin: false,
      emailVerified: true,
      address:       shippingAddr?.base_address   ?? '',
      addressDetail: shippingAddr?.detail_address ?? '',
    });
  }

  /* ─────────────────────────────── keep data in sync ─ */
  let dirty = false;

  // ① Address – overwrite if the user has granted the scope later.
  if (shippingAddr?.base_address && shippingAddr.base_address !== user.address) {
  user.address = shippingAddr.base_address;
  dirty = true;
}

  // ② Phone – replace the dummy “010-0000-xxxx” with the real one.
  if (user.phone?.startsWith('010-0000') && phone !== user.phone) {
    user.phone = phone;
    dirty = true;
  }

  if (dirty) await user.save();
  return user;
};
