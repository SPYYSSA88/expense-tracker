import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.LIFF_ID || '2008862805-LFu74yKh';
const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;

// Rich Menu Configuration
const richMenuObject = {
    size: {
        width: 2500,
        height: 843
    },
    selected: true,
    name: 'Money Secrets Menu',
    chatBarText: '📊 เมนู',
    areas: [
        // Left: หน้าหลัก (Home) - Open LIFF App with LINE Login
        {
            bounds: { x: 0, y: 0, width: 833, height: 843 },
            action: { type: 'uri', uri: LIFF_URL }
        },
        // Center: สรุป (Summary) - Send text command
        {
            bounds: { x: 833, y: 0, width: 834, height: 843 },
            action: { type: 'message', text: 'ยอด' }
        },
        // Right: ตั้งค่า (Settings) - Open LIFF App with settings tab
        {
            bounds: { x: 1667, y: 0, width: 833, height: 843 },
            action: { type: 'uri', uri: `${LIFF_URL}?tab=profile` }
        }
    ]
};

async function createRichMenu() {
    try {
        console.log('🎨 กำลังสร้าง Rich Menu...');

        // Step 1: Create Rich Menu
        const createResponse = await axios.post(
            'https://api.line.me/v2/bot/richmenu',
            richMenuObject,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
                }
            }
        );

        const richMenuId = createResponse.data.richMenuId;
        console.log('✅ สร้าง Rich Menu สำเร็จ! ID:', richMenuId);

        // Step 2: Upload Image
        console.log('📤 กำลังอัปโหลดรูปภาพ...');
        const imagePath = path.join(__dirname, 'public', 'images', 'rich_menu.png');
        const imageBuffer = fs.readFileSync(imagePath);

        await axios.post(
            `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
            imageBuffer,
            {
                headers: {
                    'Content-Type': 'image/png',
                    'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
                }
            }
        );

        console.log('✅ อัปโหลดรูปภาพสำเร็จ!');

        // Step 3: Set as Default
        console.log('🔧 กำลังตั้งเป็นเมนูเริ่มต้น...');
        await axios.post(
            `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
                }
            }
        );

        console.log('🎉 เสร็จสมบูรณ์! Rich Menu พร้อมใช้งานแล้ว!');
        console.log('📱 ลองเปิดแชทบอทดูได้เลยครับ');

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.response?.data || error.message);
    }
}

// Run
createRichMenu();
