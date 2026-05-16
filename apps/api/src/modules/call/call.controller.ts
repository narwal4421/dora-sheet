import { Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';

export const generateToken = async (req: Request, res: Response) => {
  try {
    const room = req.query.room as string;
    // req.user is set by authMiddleware
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (req as any).user?.name || req.query.userName as string || 'Anonymous';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseUserId = (req as any).user?.userId;
    const isPublicUser = baseUserId === 'public-user-id';
    const userId = isPublicUser || !baseUserId 
      ? `guest-${Math.random().toString(36).substring(7)}` 
      : baseUserId;

    if (!room) {
      return res.status(400).json({ success: false, message: 'Room name is required' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ success: false, message: 'LiveKit credentials missing in environment' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
    });

    at.addGrant({ roomJoin: true, room: room });

    const token = await at.toJwt();

    return res.json({ success: true, data: { token } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to generate LiveKit token', message);
    return res.status(500).json({ success: false, message });
  }
};
