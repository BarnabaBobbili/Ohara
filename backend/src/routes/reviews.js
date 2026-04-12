import express from 'express';
import adminRouter from '../reviews/router.admin.js';
import memberRouter from '../reviews/router.member.js';
import publicRouter from '../reviews/router.public.js';

const router = express.Router();

router.use(publicRouter);
router.use(adminRouter);
router.use(memberRouter);

export default router;
