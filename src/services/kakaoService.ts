// src/services/kakaoService.ts
import User from '../models/User';
import { generateUserId } from '../utils/generateUserId';

interface Shipping {
  base_address?: string;
  detail_address?: string;
}
interface Params {
  kakaoProfile: any;
  phone: string;
  shippingAddr?: Shipping | null;
}

export const findOrCreateKakaoUser = async ({
  kakaoProfile,
  phone,
  shippingAddr = null,
}: Params) => {
  const kakaoId = String(kakaoProfile.id);
  const acct    = kakaoProfile.kakao_account ?? {};
  const email   = acct.email ?? `kakao_${kakaoId}@noemail.com`;
  const nick    = kakaoProfile.properties?.nickname ?? '카카오 유저';

  let user = await User.findOne({ kakaoId });

  /* ────────────── 1. create on first login ────────────── */
  if (!user) {
    user = await User.create({
      email,
      name: nick,
      phone,                     // 010-1234-5678 (already formatted)
      provider: 'kakao',
      userId: await generateUserId(),
      kakaoId,
      isGuest: false,
      isAdmin: false,
      emailVerified: true,
      address:       shippingAddr?.base_address   ?? '',
      addressDetail: shippingAddr?.detail_address ?? '',
    });
    return user;                 // brand-new user is already up-to-date
  }

  /* ────────────── 2. keep existing user in sync ───────── */
  let dirty = false;

  // a) address
  if (shippingAddr?.base_address) {
    const newBase = shippingAddr.base_address.trim();
    if (!user.address?.trim() || user.address !== newBase) {
      user.address = newBase;
      dirty = true;
    }
  }
  if (shippingAddr?.detail_address) {
    const newDetail = shippingAddr.detail_address.trim();
    if (!user.addressDetail?.trim() || user.addressDetail !== newDetail) {
      user.addressDetail = newDetail;
      dirty = true;
    }
  }

  // b) phone – replace dummy 010-0000-xxxx only once we have the real one
  if (
    user.phone?.startsWith('010-0000') &&
    phone !== user.phone &&              // formatted real phone
    phone.length === 13                  // 010-1234-5678
  ) {
    user.phone = phone;
    dirty = true;
  }

  if (dirty) {
    await user.save();
    console.log('[Kakao] user updated →', {
      _id: user._id,
      address: user.address,
      addressDetail: user.addressDetail,
      phone: user.phone,
    });
  }

  return user;
};
