// src/services/kakaoService.ts
import axios from 'axios';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY as string;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI as string;

// 1. Exchange authorization code for access token
export const getKakaoAccessToken = async (authorizationCode: string) => {
  const response = await axios.post(
    'https://kauth.kakao.com/oauth/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KAKAO_REST_API_KEY,
      redirect_uri: KAKAO_REDIRECT_URI,
      code: authorizationCode,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    }
  );
  return response.data.access_token;
};

// 2. Get user info using Kakao access token
export const getKakaoUserInfo = async (accessToken: string) => {
  const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

export const searchAddress = async (query: string) => {
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