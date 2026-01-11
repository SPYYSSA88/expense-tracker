import { User } from './models.js';

/**
 * Authentication Middleware
 * ตรวจสอบสิทธิ์ผู้ใช้งานจาก LINE User ID
 * 
 * โครงสร้างนี้รองรับการขยายเป็น JWT verification ในอนาคต
 */
export const requireAuth = async (req, res, next) => {
    try {
        // ดึง LINE User ID จาก header
        const lineUserId = req.headers['x-line-user-id'];

        if (!lineUserId) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลการยืนยันตัวตน กรุณาเข้าสู่ระบบอีกครั้ง'
            });
        }

        // ค้นหาผู้ใช้ในฐานข้อมูล
        const user = await User.findOne({ lineUserId }).populate('currentGroupId');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบบัญชีผู้ใช้ กรุณาลงทะเบียนก่อนใช้งาน'
            });
        }

        // แนบข้อมูลผู้ใช้ไปกับ request
        req.user = user;
        req.lineUserId = lineUserId;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการยืนยันตัวตน'
        });
    }
};

/**
 * Optional Auth Middleware
 * ใช้กับ endpoint ที่ไม่บังคับต้องล็อกอิน
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const lineUserId = req.headers['x-line-user-id'];

        if (lineUserId) {
            const user = await User.findOne({ lineUserId }).populate('currentGroupId');
            if (user) {
                req.user = user;
                req.lineUserId = lineUserId;
            }
        }

        next();
    } catch (error) {
        console.error('Optional auth error:', error);
        next(); // Continue even if auth fails
    }
};

/**
 * Verify LINE Webhook Signature
 * ตรวจสอบลายเซ็นจาก LINE Platform
 */
export const verifyLineSignature = (channelSecret) => {
    return (req, res, next) => {
        const crypto = require('crypto');
        const signature = req.headers['x-line-signature'];

        if (!signature) {
            console.warn('Missing LINE signature');
            return res.status(400).json({ message: 'Missing signature' });
        }

        const body = JSON.stringify(req.body);
        const hash = crypto
            .createHmac('SHA256', channelSecret)
            .update(body)
            .digest('base64');

        if (hash !== signature) {
            console.warn('Invalid LINE signature');
            return res.status(400).json({ message: 'Invalid signature' });
        }

        next();
    };
};
