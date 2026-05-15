import { Router } from 'express';
import { generateToken } from './call.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/token', requireAuth, generateToken);

export const callRouter = router;
