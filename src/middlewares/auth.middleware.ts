import { Request, Response, NextFunction } from 'express';
import { dbGet } from '../db';
import crypto from 'crypto';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const apiKey = await dbGet<any>('SELECT * FROM api_keys WHERE is_active = 1 AND key = ?', [token]);
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    const tokenBuffer = Buffer.from(token);
    const storedKeyBuffer = Buffer.from(apiKey.key);
    
    if (tokenBuffer.length !== storedKeyBuffer.length || !crypto.timingSafeEqual(tokenBuffer, storedKeyBuffer)) {
       return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};