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

// ===========================================
// Rich Menu Configuration
// ===========================================

// Menu 1: For NEW users - "เข้าสู่ระบบ" (Login)
const loginMenuConfig = {
    size: { width: 2500, height: 422 },
    selected: true,
    name: 'Login Menu (New Users)',
    chatBarText: '🔐 เข้าสู่ระบบ',
    areas: [
        {
            bounds: { x: 0, y: 0, width: 2500, height: 422 },
            action: { type: 'uri', uri: LIFF_URL }
        }
    ]
};

// Menu 2: For EXISTING users - "หน้าแรก" (Home)
const homeMenuConfig = {
    size: { width: 2500, height: 422 },
    selected: true,
    name: 'Home Menu (Existing Users)',
    chatBarText: '🏠 หน้าแรก',
    areas: [
        {
            bounds: { x: 0, y: 0, width: 2500, height: 422 },
            action: { type: 'uri', uri: LIFF_URL }
        }
    ]
};

// ===========================================
// Helper Functions
// ===========================================
async function createMenu(menuConfig, imagePath, menuName) {
    try {
        console.log(`\n🎨 กำลังสร้าง ${menuName}...`);

        // Step 1: Create Rich Menu
        const createResponse = await axios.post(
            'https://api.line.me/v2/bot/richmenu',
            menuConfig,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
                }
            }
        );

        const richMenuId = createResponse.data.richMenuId;
        console.log(`✅ สร้าง ${menuName} สำเร็จ! ID: ${richMenuId}`);

        // Step 2: Upload Image
        console.log('📤 กำลังอัปโหลดรูปภาพ...');
        const imageBuffer = fs.readFileSync(imagePath);

        await axios.post(
            `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
            imageBuffer,
            {
                headers: {
                    'Content-Type': 'image/jpeg',
                    'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
                }
            }
        );
        console.log('✅ อัปโหลดรูปภาพสำเร็จ!');

        return richMenuId;
    } catch (error) {
        console.error(`❌ Error creating ${menuName}:`, error.response?.data || error.message);
        return null;
    }
}

async function setDefaultMenu(richMenuId) {
    try {
        await axios.post(
            `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
                }
            }
        );
        console.log('✅ ตั้งเป็นเมนูเริ่มต้นสำเร็จ!');
    } catch (error) {
        console.error('❌ Error setting default menu:', error.response?.data || error.message);
    }
}

async function deleteAllMenus() {
    try {
        const response = await axios.get(
            'https://api.line.me/v2/bot/richmenu/list',
            {
                headers: {
                    'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
                }
            }
        );

        const menus = response.data.richmenus || [];
        console.log(`🗑️ พบ ${menus.length} Rich Menu เดิม กำลังลบ...`);

        for (const menu of menus) {
            await axios.delete(
                `https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
                    }
                }
            );
            console.log(`   ลบ: ${menu.name}`);
        }
        console.log('✅ ลบ Rich Menu เดิมทั้งหมดเรียบร้อย!');
    } catch (error) {
        console.error('❌ Error deleting menus:', error.response?.data || error.message);
    }
}

// ===========================================
// Main Script
// ===========================================
async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('      🎨 Creating Neo-Brutalism Rich Menus');
    console.log('═══════════════════════════════════════════\n');

    // Step 1: Delete all existing menus
    await deleteAllMenus();

    // Step 2: Create Login Menu (for new users)
    const loginImagePath = path.join(__dirname, 'public', 'images', 'rich_menu_login_sized.jpg');
    const loginMenuId = await createMenu(loginMenuConfig, loginImagePath, 'Login Menu');

    // Step 3: Create Home Menu (for existing users)
    const homeImagePath = path.join(__dirname, 'public', 'images', 'rich_menu_home_sized.jpg');
    const homeMenuId = await createMenu(homeMenuConfig, homeImagePath, 'Home Menu');

    // Step 4: Set Login Menu as default (for new users)
    if (loginMenuId) {
        console.log('\n🔧 กำลังตั้ง Login Menu เป็นเมนูเริ่มต้น (สำหรับผู้ใช้ใหม่)...');
        await setDefaultMenu(loginMenuId);
    }

    // Step 5: Save menu IDs for later use
    const menuIds = {
        loginMenuId,
        homeMenuId,
        createdAt: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(__dirname, 'richMenuIds.json'),
        JSON.stringify(menuIds, null, 2)
    );
    console.log('\n💾 บันทึก Menu IDs ลงไฟล์ richMenuIds.json เรียบร้อย!');

    console.log('\n═══════════════════════════════════════════');
    console.log('      🎉 เสร็จสมบูรณ์!');
    console.log('═══════════════════════════════════════════');
    console.log(`\n📋 สรุป:`);
    console.log(`   • Login Menu ID: ${loginMenuId}`);
    console.log(`   • Home Menu ID:  ${homeMenuId}`);
    console.log(`\n📱 ลองเปิดแชทบอทดูได้เลยครับ!`);
    console.log(`   - ผู้ใช้ใหม่จะเห็น "เข้าสู่ระบบ"`);
    console.log(`   - หลัง Login จะสลับเป็น "หน้าแรก" อัตโนมัติ`);
}

main();
