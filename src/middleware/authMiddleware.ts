import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        isAdmin: boolean;
        isGuest: boolean;
      };
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return; 
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    req.user = {
      userId: decoded.userId,
      isAdmin: decoded.isAdmin,
      isGuest: decoded.isGuest,
    };

    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
    return;
  }
};


export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.isAdmin) {
    res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    return; 
  }
  next();
};

