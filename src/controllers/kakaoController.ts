import { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { findOrCreateKakaoUser } from "../services/kakaoService";

export const kakaoLogin = async (req: Request, res: Response): Promise<void> => {
  const { accessToken } = req.body;
  if (!accessToken) {
    res.status(400).json({ message: "Access token is required." });
    return;
  }

  try {
    /* 1 ─ fetch user profile from Kakao */
    const { data: kakaoProfile } = await axios.get(
      "https://kapi.kakao.com/v2/user/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      }
    );

    /* 2 ─ normalise / fallback phone */
    const acct = kakaoProfile.kakao_account ?? {};
    const rawPhone = acct.phone_number?.replace(/\D/g, "");
    const phone =
      rawPhone ||
      `010${(kakaoProfile.id % 10_000_000_00).toString().padStart(8, "0")}`; // placeholder

    /* 3 ─ create or find user */
    const user = await findOrCreateKakaoUser({ ...kakaoProfile, phone });

    /* 4 ─ issue JWT */
    const token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        userId: user.userId,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    /* 5 ─ if placeholder used, tell client to prompt real phone */
    if (!rawPhone) {
      res.status(409).json({
        code: "PHONE_REQUIRED",
        message: "전화번호 권한이 허용되지 않았습니다.",
        user,
      });
      return;
    }

    /* 6 ─ success */
    res.status(200).json({
      message: "카카오 로그인에 성공했습니다.",
      user,
      token,
    });
  } catch (err) {
    console.error("Kakao login error:", err);
    res.status(500).json({ message: "카카오 로그인에 실패했습니다." });
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
