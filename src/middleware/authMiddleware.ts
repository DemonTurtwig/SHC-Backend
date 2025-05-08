import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        userId?: number | string;
        isAdmin: boolean;
        isGuest: boolean;
      };
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('→ requireAuth for', req.path);
  if (!token) {
    res.status(401).json({ message: '토큰이 없습니다.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      _id: decoded._id,
      userId: decoded.userId,
      isAdmin: decoded.isAdmin,
      isGuest: decoded.isGuest,
    };

    next();
  } catch (err) {
    console.error('Invalid token:', err);
    res.status(403).json({ message: '토큰이 유효하지 않습니다.' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.isAdmin) {
    res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    return; 
  }
  next();
};

