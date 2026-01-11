import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import * as line from '@line/bot-sdk';

import { User, Group, Category, Transaction, SavingsGoal, RecurringTransaction, DailyJournal, defaultCategories, defaultTags, achievements, moodOptions } from './models.js';
import { requireAuth, optionalAuth } from './middleware.js';

// Load environment variables
dotenv.config();

const app = express();

// ===========================================
// LINE Bot Config & Webhook
// ===========================================
const lineConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};

// Create LINE SDK Client
const client = new line.Client(lineConfig);

// ===========================================
// Rich Menu Switching Functions
// ===========================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of current file for correct path resolution
const currentFileDir = path.dirname(fileURLToPath(import.meta.url));

// Load Rich Menu IDs from saved file
const loadRichMenuIds = () => {
    try {
        const filePath = path.join(currentFileDir, 'richMenuIds.json');
        console.log('Loading Rich Menu IDs from:', filePath);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const menuIds = JSON.parse(data);
            console.log('Rich Menu IDs loaded:', menuIds);
            return menuIds;
        } else {
            console.log('richMenuIds.json not found at:', filePath);
        }
    } catch (error) {
        console.error('Error loading Rich Menu IDs:', error);
    }
    return null;
};

// Switch user's Rich Menu to Home Menu (after login)
const switchToHomeMenu = async (userId) => {
    try {
        const menuIds = loadRichMenuIds();
        if (!menuIds || !menuIds.homeMenuId) {
            console.log('Home Menu ID not found, skipping switch');
            return false;
        }

        await client.linkRichMenuToUser(userId, menuIds.homeMenuId);
        console.log(`✅ Switched Rich Menu to Home for user: ${userId}`);
        return true;
    } catch (error) {
        console.error('Error switching Rich Menu:', error);
        return false;
    }
};

// Switch user's Rich Menu to Login Menu (for new users)
const switchToLoginMenu = async (userId) => {
    try {
        const menuIds = loadRichMenuIds();
        if (!menuIds || !menuIds.loginMenuId) {
            console.log('Login Menu ID not found, skipping switch');
            return false;
        }

        await client.linkRichMenuToUser(userId, menuIds.loginMenuId);
        console.log(`✅ Switched Rich Menu to Login for user: ${userId}`);
        return true;
    } catch (error) {
        console.error('Error switching Rich Menu:', error);
        return false;
    }
};

// Webhook Route (MUST be before express.json)
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
    try {
        const events = req.body.events;
        // Process all events asynchronously
        const results = await Promise.all(events.map(handleEvent));
        res.json(results);
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).end();
    }
});

// ===========================================
// Middleware
// ===========================================
const corsOrigin = process.env.FRONTEND_URL === '*'
    ? true  // Allow all origins
    : process.env.FRONTEND_URL || 'http://localhost:5175';

app.use(cors({
    origin: corsOrigin,
    credentials: true
}));
app.use(express.json());

// Serve static files from 'public' folder (for images)
app.use('/public', express.static('public'));

// Serve frontend (for LIFF) - uses path/dirname from Rich Menu section above
app.use(express.static(path.join(currentFileDir, 'dist')));

// ===========================================
// Database Connection
// ===========================================
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/expense-tracker');
        console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');
    } catch (error) {
        console.error('❌ เชื่อมต่อ MongoDB ล้มเหลว:', error.message);
        process.exit(1);
    }
};

// ===========================================
// Helper: สร้างหมวดหมู่เริ่มต้น
// ===========================================
const createDefaultCategories = async (groupId) => {
    const categories = [];

    for (const cat of defaultCategories.expense) {
        categories.push({
            groupId,
            name: cat.name,
            icon: cat.icon,
            type: 'expense',
            color: cat.color,
            budgetLimit: 0
        });
    }

    for (const cat of defaultCategories.income) {
        categories.push({
            groupId,
            name: cat.name,
            icon: cat.icon,
            type: 'income',
            color: cat.color,
            budgetLimit: 0
        });
    }

    await Category.insertMany(categories);
};

// ===========================================
// Helper: LINE Event Handler
// ===========================================
const handleEvent = async (event) => {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    const { userId } = event.source;
    const text = event.message.text.trim();

    try {
        // 1. Find or Create User (Auto-register from chat!)
        let user = await User.findOne({ lineUserId: userId });

        if (!user) {
            // Fetch profile from LINE API
            let profile;
            try {
                profile = await client.getProfile(userId);
            } catch (profileError) {
                console.error('Failed to get LINE profile:', profileError);
                profile = { displayName: 'ผู้ใช้', pictureUrl: '' };
            }

            // Create new user
            user = new User({
                lineUserId: userId,
                displayName: profile.displayName || 'ผู้ใช้',
                pictureUrl: profile.pictureUrl || ''
            });

            // Create Personal Group
            const personalGroup = new Group({
                name: 'กระเป๋าส่วนตัว',
                type: 'personal',
                members: [userId],
                createdBy: userId
            });
            await personalGroup.save();

            // Create default categories
            await createDefaultCategories(personalGroup._id);

            user.currentGroupId = personalGroup._id;
            await user.save();

            console.log(`✅ Auto-registered user: ${profile.displayName}`);
        }

        // 2. Check for special commands first
        const lowerText = text.toLowerCase();

        // Handle "สรุป" (Summary) command
        if (lowerText === 'สรุป' || lowerText === 'summary') {
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            const groupId = user.currentGroupId;

            // Get transactions for current month
            const transactions = await Transaction.find({
                groupId,
                monthStr: currentMonth
            });

            // Calculate totals
            let totalIncome = 0;
            let totalExpense = 0;

            transactions.forEach(tx => {
                if (tx.type === 'income') {
                    totalIncome += tx.amount;
                } else {
                    totalExpense += tx.amount;
                }
            });

            const balance = totalIncome - totalExpense;
            const transactionCount = transactions.length;

            // Format month name in Thai
            const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
            const now = new Date();
            const thaiMonth = monthNames[now.getMonth()];
            const thaiYear = now.getFullYear() + 543;

            // Build image URL
            const baseUrl = process.env.PUBLIC_URL || 'https://expense-tracker-api-wxyb.onrender.com';
            const headerImage = `${baseUrl}/public/images/summary_header.png`;

            // Create summary Flex Message
            const summaryFlex = {
                type: 'flex',
                altText: `สรุปเดือน ${thaiMonth} ${thaiYear}`,
                contents: {
                    type: 'bubble',
                    size: 'mega',
                    hero: {
                        type: 'image',
                        url: headerImage,
                        size: 'full',
                        aspectRatio: '20:13',
                        aspectMode: 'cover'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: `📊 สรุปเดือน ${thaiMonth}`,
                                weight: 'bold',
                                size: 'xl',
                                color: '#1a1a1a'
                            },
                            {
                                type: 'text',
                                text: `พ.ศ. ${thaiYear}`,
                                size: 'sm',
                                color: '#888888',
                                margin: 'sm'
                            },
                            {
                                type: 'separator',
                                margin: 'lg'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'lg',
                                spacing: 'md',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: '💰 รายรับ', size: 'md', color: '#555555', flex: 1 },
                                            { type: 'text', text: `+฿${totalIncome.toLocaleString()}`, size: 'md', color: '#00C851', align: 'end', weight: 'bold' }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: '💸 รายจ่าย', size: 'md', color: '#555555', flex: 1 },
                                            { type: 'text', text: `-฿${totalExpense.toLocaleString()}`, size: 'md', color: '#FF4444', align: 'end', weight: 'bold' }
                                        ]
                                    },
                                    {
                                        type: 'separator',
                                        margin: 'md'
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        margin: 'md',
                                        contents: [
                                            { type: 'text', text: '🏦 คงเหลือ', size: 'lg', color: '#1a1a1a', flex: 1, weight: 'bold' },
                                            { type: 'text', text: `฿${balance.toLocaleString()}`, size: 'xl', color: balance >= 0 ? '#C9A962' : '#FF4444', align: 'end', weight: 'bold' }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                margin: 'lg',
                                contents: [
                                    { type: 'text', text: `📝 รายการทั้งหมด: ${transactionCount} รายการ`, size: 'xs', color: '#888888' }
                                ]
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'button',
                                style: 'primary',
                                color: '#C9A962',
                                action: {
                                    type: 'uri',
                                    label: '📱 ดูรายละเอียดเพิ่มเติม',
                                    uri: `https://liff.line.me/${process.env.LIFF_ID}`
                                }
                            }
                        ]
                    }
                }
            };

            return client.replyMessage(event.replyToken, summaryFlex);
        }

        // 3. Parse Text for transactions
        // Patterns:
        // "100" -> Expense (Category: Other)
        // "+100" -> Income (Category: Salary/Other)
        // "Food 100", "100 Food" -> Expense
        // "Salary 1000", "1000 Salary" -> Income (if match income category) or Expense (if using generic logic, but usually we can check category type)

        const numberPattern = /[\d,]+(\.\d+)?/;
        const amountMatch = text.match(numberPattern);

        if (!amountMatch) {
            // Not a transaction?
            return Promise.resolve(null);
        }

        const rawAmount = parseFloat(amountMatch[0].replace(/,/g, ''));
        const textWithoutNumber = text.replace(numberPattern, '').trim();

        // Default Type & Category
        let type = 'expense';
        let categoryName = textWithoutNumber || 'อื่นๆ';

        // Check for specific keywords
        if (text.includes('+') || text.includes('รายรับ') || text.includes('ได้')) {
            type = 'income';
            categoryName = categoryName.replace(/[+]/g, '').trim() || 'รายรับอื่นๆ';
        }

        // 3. Find Category
        // Get user's categories
        const categories = await Category.find({ groupId: user.currentGroupId });

        // Find best match
        let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

        // If not exact match, try partial or default
        if (!category) {
            // Try to find by type
            category = categories.find(c => c.type === type && (c.name === 'อื่นๆ' || c.name === 'Others' || c.name === 'General'));

            // If still no category and we have a name, maybe we should treat it as 'General' but keep note?
            // For now, let's just use the first category of that type or 'General'
            if (!category) {
                category = categories.find(c => c.type === type);
            }
        }

        // If we found a specific category corresponding to the name in text, switch type to that category's type
        const exactNameMatch = categories.find(c => textWithoutNumber && c.name.toLowerCase() === textWithoutNumber.toLowerCase());
        if (exactNameMatch) {
            category = exactNameMatch;
            type = category.type;
        }

        if (!category) {
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: '❌ ไม่พบหมวดหมู่และไม่สามารถบันทึกได้ กรุณาลองใหม่'
            });
        }

        // 4. Create Transaction
        const transaction = new Transaction({
            groupId: user.currentGroupId,
            userId: userId,
            type,
            amount: rawAmount,
            categoryId: category._id,
            date: new Date(),
            monthStr: new Date().toISOString().slice(0, 7), // YYYY-MM
            note: text // Save original text as note
        });

        await transaction.save();

        // 5. Reply with Flex Message
        const isExpense = type === 'expense';
        const amountColor = isExpense ? '#FF4444' : '#00C851';
        const amountPrefix = isExpense ? '-' : '+';
        const headerColor = isExpense ? '#FF6B6B' : '#51CF66';
        const headerText = isExpense ? 'จดแล้วค่ะ 💸' : 'รับเงินแล้ว 💰';

        // Build image URL from Render (production URL)
        const baseUrl = process.env.PUBLIC_URL || 'https://expense-tracker-api-wxyb.onrender.com';
        const heroImageUrl = isExpense
            ? `${baseUrl}/public/images/expense_header.png`
            : `${baseUrl}/public/images/income_header.png`;

        const flexMessage = {
            type: 'flex',
            altText: `บันทึก${isExpense ? 'รายจ่าย' : 'รายรับ'} ${rawAmount.toLocaleString()} บาท`,
            contents: {
                type: 'bubble',
                size: 'mega',
                hero: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: headerText,
                            color: '#FFFFFF',
                            size: 'xl',
                            weight: 'bold',
                            align: 'center'
                        },
                        {
                            type: 'text',
                            text: category.name,
                            color: '#FFFFFF',
                            size: 'lg',
                            align: 'center',
                            margin: 'sm'
                        }
                    ],
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: {
                        type: 'linearGradient',
                        angle: '0deg',
                        startColor: headerColor + 'CC',
                        endColor: headerColor + '99'
                    },
                    height: '120px',
                    paddingAll: '20px'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'image',
                            url: heroImageUrl,
                            size: 'full',
                            aspectRatio: '20:10',
                            aspectMode: 'cover'
                        },
                        {
                            type: 'text',
                            text: `${amountPrefix}${rawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
                            weight: 'bold',
                            size: 'xxl',
                            color: amountColor,
                            align: 'center',
                            margin: 'lg'
                        },
                        {
                            type: 'text',
                            text: `หมวดหมู่: ${category.name}`,
                            size: 'sm',
                            color: '#888888',
                            align: 'center',
                            margin: 'md'
                        }
                    ],
                    paddingAll: '15px'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `เรียบร้อย! '${textWithoutNumber || category.name}' ${rawAmount.toLocaleString()} บาท จดลงบัญชีให้แล้วนะคะ ✨`,
                            size: 'xs',
                            color: '#666666',
                            align: 'center',
                            wrap: true
                        }
                    ],
                    backgroundColor: '#F5F5F5',
                    paddingAll: '15px'
                }
            }
        };

        return client.replyMessage(event.replyToken, flexMessage);

    } catch (error) {
        console.error('Handle event error:', error);
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ เกิดข้อผิดพลาดในการบันทึก'
        });
    }
};

// ===========================================
// Auth Routes
// ===========================================

// POST /api/auth/login - เข้าสู่ระบบ/ลงทะเบียน
app.post('/api/auth/login', async (req, res) => {
    try {
        const { lineUserId, displayName, pictureUrl } = req.body;

        if (!lineUserId || !displayName) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุข้อมูลผู้ใช้ให้ครบถ้วน'
            });
        }

        let user = await User.findOne({ lineUserId });

        if (!user) {
            // สร้างผู้ใช้ใหม่
            user = new User({
                lineUserId,
                displayName,
                pictureUrl: pictureUrl || ''
            });

            // สร้าง Personal Group เริ่มต้น
            const personalGroup = new Group({
                name: 'กระเป๋าส่วนตัว',
                type: 'personal',
                members: [lineUserId],
                createdBy: lineUserId
            });
            await personalGroup.save();

            // สร้างหมวดหมู่เริ่มต้น
            await createDefaultCategories(personalGroup._id);

            user.currentGroupId = personalGroup._id;
            await user.save();
        } else {
            // อัพเดทข้อมูลผู้ใช้
            user.displayName = displayName;
            if (pictureUrl) user.pictureUrl = pictureUrl;
            await user.save();
        }

        // ดึงข้อมูล group
        await user.populate('currentGroupId');

        // สลับ Rich Menu เป็น Home Menu หลัง Login สำเร็จ
        switchToHomeMenu(lineUserId).catch(err =>
            console.error('Failed to switch Rich Menu:', err)
        );

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            data: {
                user: {
                    lineUserId: user.lineUserId,
                    displayName: user.displayName,
                    pictureUrl: user.pictureUrl,
                    currentGroup: user.currentGroupId
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
        });
    }
});

// ===========================================
// Transaction Routes
// ===========================================

// GET /api/transactions - ดึงรายการธุรกรรม
app.get('/api/transactions', requireAuth, async (req, res) => {
    try {
        const { month, limit = 50, page = 1, tag } = req.query;
        const groupId = req.user.currentGroupId?._id;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกกระเป๋าก่อนใช้งาน'
            });
        }

        const query = { groupId };

        if (month) {
            query.monthStr = month;
        }

        if (tag) {
            query.tags = tag;
        }

        const transactions = await Transaction.find(query)
            .populate('categoryId', 'name icon color type')
            .sort({ date: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลรายการได้'
        });
    }
});

// POST /api/transactions - สร้างธุรกรรมใหม่
app.post('/api/transactions', requireAuth, async (req, res) => {
    try {
        const { type, amount, categoryId, date, note, tags } = req.body;
        const groupId = req.user.currentGroupId?._id;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกกระเป๋าก่อนใช้งาน'
            });
        }

        if (!type || !amount || !categoryId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        // ตรวจสอบว่าหมวดหมู่มีอยู่จริง
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบหมวดหมู่ที่เลือก'
            });
        }

        const transactionDate = date ? new Date(date) : new Date();
        const monthStr = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;

        const transaction = new Transaction({
            groupId,
            userId: req.lineUserId,
            type,
            amount: parseFloat(amount),
            categoryId,
            date: transactionDate,
            note: note || '',
            tags: tags || [],
            monthStr
        });

        await transaction.save();
        await transaction.populate('categoryId', 'name icon color type');

        // ตรวจสอบ Budget Alert
        let budgetAlert = null;
        if (type === 'expense' && category.budgetLimit > 0) {
            // คำนวณยอดใช้จ่ายในเดือนนี้สำหรับหมวดหมู่นี้
            const monthlyTotal = await Transaction.aggregate([
                {
                    $match: {
                        groupId: new mongoose.Types.ObjectId(groupId),
                        categoryId: new mongoose.Types.ObjectId(categoryId),
                        monthStr,
                        type: 'expense'
                    }
                },
                {
                    $group: { _id: null, total: { $sum: '$amount' } }
                }
            ]);

            const spent = monthlyTotal[0]?.total || 0;
            const percentage = (spent / category.budgetLimit) * 100;

            if (percentage >= category.budgetAlertPercent) {
                budgetAlert = {
                    category: category.name,
                    spent,
                    budget: category.budgetLimit,
                    percentage: Math.round(percentage)
                };
            }
        }

        res.status(201).json({
            success: true,
            message: 'บันทึกรายการสำเร็จ',
            data: { transaction, budgetAlert }
        });
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถบันทึกรายการได้'
        });
    }
});

// DELETE /api/transactions/:id - ลบธุรกรรม
app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const groupId = req.user.currentGroupId?._id;

        const transaction = await Transaction.findOne({ _id: id, groupId });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบรายการที่ต้องการลบ'
            });
        }

        await transaction.deleteOne();

        res.json({
            success: true,
            message: 'ลบรายการสำเร็จ'
        });
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถลบรายการได้'
        });
    }
});

// ===========================================
// Report Routes
// ===========================================

// GET /api/report/monthly - รายงานประจำเดือน
app.get('/api/report/monthly', requireAuth, async (req, res) => {
    try {
        const { month } = req.query;
        const groupId = req.user.currentGroupId?._id;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกกระเป๋าก่อนใช้งาน'
            });
        }

        const now = new Date();
        const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Aggregate: รวมยอดตามประเภท
        const summary = await Transaction.aggregate([
            {
                $match: {
                    groupId: new mongoose.Types.ObjectId(groupId),
                    monthStr: targetMonth
                }
            },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        // Aggregate: รวมยอดตามหมวดหมู่ (เฉพาะรายจ่าย)
        const expensesByCategory = await Transaction.aggregate([
            {
                $match: {
                    groupId: new mongoose.Types.ObjectId(groupId),
                    monthStr: targetMonth,
                    type: 'expense'
                }
            },
            {
                $group: {
                    _id: '$categoryId',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $project: {
                    _id: 1,
                    total: 1,
                    count: 1,
                    name: '$category.name',
                    icon: '$category.icon',
                    color: '$category.color',
                    budgetLimit: '$category.budgetLimit'
                }
            },
            {
                $sort: { total: -1 }
            }
        ]);

        // คำนวณสรุป
        const income = summary.find(s => s._id === 'income')?.total || 0;
        const expense = summary.find(s => s._id === 'expense')?.total || 0;
        const balance = income - expense;

        res.json({
            success: true,
            data: {
                month: targetMonth,
                summary: {
                    income,
                    expense,
                    balance
                },
                expensesByCategory
            }
        });
    } catch (error) {
        console.error('Monthly report error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลรายงานได้'
        });
    }
});

// GET /api/report/comparison - เปรียบเทียบหลายเดือน
app.get('/api/report/comparison', requireAuth, async (req, res) => {
    try {
        const { months = 6 } = req.query;
        const groupId = req.user.currentGroupId?._id;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกกระเป๋าก่อนใช้งาน'
            });
        }

        // สร้าง list ของเดือนย้อนหลัง
        const monthList = [];
        const now = new Date();
        for (let i = parseInt(months) - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        // Aggregate: รวมยอดแต่ละเดือน
        const comparison = await Transaction.aggregate([
            {
                $match: {
                    groupId: new mongoose.Types.ObjectId(groupId),
                    monthStr: { $in: monthList }
                }
            },
            {
                $group: {
                    _id: { month: '$monthStr', type: '$type' },
                    total: { $sum: '$amount' }
                }
            },
            {
                $sort: { '_id.month': 1 }
            }
        ]);

        // จัดรูปแบบข้อมูล
        const result = monthList.map(month => {
            const income = comparison.find(c => c._id.month === month && c._id.type === 'income')?.total || 0;
            const expense = comparison.find(c => c._id.month === month && c._id.type === 'expense')?.total || 0;
            return {
                month,
                income,
                expense,
                balance: income - expense
            };
        });

        res.json({
            success: true,
            data: { comparison: result }
        });
    } catch (error) {
        console.error('Comparison report error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลได้'
        });
    }
});

// ===========================================
// Savings Goal Routes
// ===========================================

// GET /api/goals - ดึงเป้าหมายทั้งหมด
app.get('/api/goals', requireAuth, async (req, res) => {
    try {
        const groupId = req.user.currentGroupId?._id;

        const goals = await SavingsGoal.find({ groupId, userId: req.lineUserId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { goals }
        });
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลเป้าหมายได้'
        });
    }
});

// POST /api/goals - สร้างเป้าหมายใหม่
app.post('/api/goals', requireAuth, async (req, res) => {
    try {
        const { name, icon, targetAmount, deadline, color } = req.body;
        const groupId = req.user.currentGroupId?._id;

        if (!name || !targetAmount) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อและเป้าหมายจำนวนเงิน'
            });
        }

        const goal = new SavingsGoal({
            groupId,
            userId: req.lineUserId,
            name,
            icon: icon || '🎯',
            targetAmount: parseFloat(targetAmount),
            deadline: deadline ? new Date(deadline) : null,
            color: color || '#00FF88'
        });

        await goal.save();

        res.status(201).json({
            success: true,
            message: 'สร้างเป้าหมายสำเร็จ',
            data: { goal }
        });
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถสร้างเป้าหมายได้'
        });
    }
});

// PUT /api/goals/:id - อัพเดทเป้าหมาย (เช่น เพิ่มเงินออม)
app.put('/api/goals/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { addAmount, currentAmount, name, targetAmount } = req.body;

        const goal = await SavingsGoal.findOne({ _id: id, userId: req.lineUserId });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเป้าหมาย'
            });
        }

        if (addAmount) {
            goal.currentAmount += parseFloat(addAmount);
        }
        if (currentAmount !== undefined) {
            goal.currentAmount = parseFloat(currentAmount);
        }
        if (name) goal.name = name;
        if (targetAmount) goal.targetAmount = parseFloat(targetAmount);

        // ตรวจสอบว่าถึงเป้าหมายหรือยัง
        if (goal.currentAmount >= goal.targetAmount) {
            goal.isCompleted = true;
        }

        await goal.save();

        res.json({
            success: true,
            message: goal.isCompleted ? '🎉 ยินดีด้วย! บรรลุเป้าหมายแล้ว!' : 'อัพเดทสำเร็จ',
            data: { goal }
        });
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถอัพเดทได้'
        });
    }
});

// DELETE /api/goals/:id - ลบเป้าหมาย
app.delete('/api/goals/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const goal = await SavingsGoal.findOneAndDelete({ _id: id, userId: req.lineUserId });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเป้าหมาย'
            });
        }

        res.json({
            success: true,
            message: 'ลบเป้าหมายสำเร็จ'
        });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถลบได้'
        });
    }
});

// ===========================================
// Recurring Transaction Routes
// ===========================================

// GET /api/recurring - ดึงรายการประจำทั้งหมด
app.get('/api/recurring', requireAuth, async (req, res) => {
    try {
        const groupId = req.user.currentGroupId?._id;

        const recurring = await RecurringTransaction.find({ groupId, userId: req.lineUserId })
            .populate('categoryId', 'name icon color type')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { recurring }
        });
    } catch (error) {
        console.error('Get recurring error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลได้'
        });
    }
});

// POST /api/recurring - สร้างรายการประจำ
app.post('/api/recurring', requireAuth, async (req, res) => {
    try {
        const { type, amount, categoryId, note, tags, frequency, dayOfWeek, dayOfMonth } = req.body;
        const groupId = req.user.currentGroupId?._id;

        if (!type || !amount || !categoryId || !frequency) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        const recurring = new RecurringTransaction({
            groupId,
            userId: req.lineUserId,
            type,
            amount: parseFloat(amount),
            categoryId,
            note: note || '',
            tags: tags || [],
            frequency,
            dayOfWeek: dayOfWeek || null,
            dayOfMonth: dayOfMonth || 1
        });

        await recurring.save();
        await recurring.populate('categoryId', 'name icon color type');

        res.status(201).json({
            success: true,
            message: 'สร้างรายการประจำสำเร็จ',
            data: { recurring }
        });
    } catch (error) {
        console.error('Create recurring error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถสร้างได้'
        });
    }
});

// DELETE /api/recurring/:id - ลบรายการประจำ
app.delete('/api/recurring/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const recurring = await RecurringTransaction.findOneAndDelete({ _id: id, userId: req.lineUserId });

        if (!recurring) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบรายการ'
            });
        }

        res.json({
            success: true,
            message: 'ลบรายการประจำสำเร็จ'
        });
    } catch (error) {
        console.error('Delete recurring error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถลบได้'
        });
    }
});

// ===========================================
// Tags Routes
// ===========================================

// GET /api/tags - ดึงแท็กที่ใช้ทั้งหมด
app.get('/api/tags', requireAuth, async (req, res) => {
    try {
        const groupId = req.user.currentGroupId?._id;

        // ดึงแท็กที่ใช้จริงจาก transactions
        const usedTags = await Transaction.distinct('tags', { groupId });

        // รวมกับ default tags
        const allTags = [...new Set([...defaultTags, ...usedTags])].filter(t => t);

        res.json({
            success: true,
            data: { tags: allTags }
        });
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลได้'
        });
    }
});

// ===========================================
// Category Routes
// ===========================================

// GET /api/categories - ดึงหมวดหมู่ทั้งหมด
app.get('/api/categories', requireAuth, async (req, res) => {
    try {
        const { type } = req.query;
        const groupId = req.user.currentGroupId?._id;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกกระเป๋าก่อนใช้งาน'
            });
        }

        const query = { groupId };
        if (type) {
            query.type = type;
        }

        const categories = await Category.find(query).sort({ name: 1 });

        res.json({
            success: true,
            data: { categories }
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลหมวดหมู่ได้'
        });
    }
});

// PUT /api/categories/:id/budget - ตั้งงบประมาณ
app.put('/api/categories/:id/budget', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { budgetLimit, budgetAlertPercent } = req.body;

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบหมวดหมู่'
            });
        }

        if (budgetLimit !== undefined) category.budgetLimit = parseFloat(budgetLimit);
        if (budgetAlertPercent !== undefined) category.budgetAlertPercent = parseInt(budgetAlertPercent);

        await category.save();

        res.json({
            success: true,
            message: 'ตั้งงบประมาณสำเร็จ',
            data: { category }
        });
    } catch (error) {
        console.error('Update budget error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถอัพเดทได้'
        });
    }
});

// ===========================================
// Group Routes
// ===========================================

// GET /api/groups - ดึงกระเป๋าทั้งหมดของผู้ใช้
app.get('/api/groups', requireAuth, async (req, res) => {
    try {
        const groups = await Group.find({
            members: req.lineUserId
        });

        res.json({
            success: true,
            data: {
                groups,
                currentGroupId: req.user.currentGroupId?._id
            }
        });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลกระเป๋าได้'
        });
    }
});

// POST /api/groups/switch - สลับกระเป๋า
app.post('/api/groups/switch', requireAuth, async (req, res) => {
    try {
        const { groupId } = req.body;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุกระเป๋าที่ต้องการสลับ'
            });
        }

        const group = await Group.findOne({
            _id: groupId,
            members: req.lineUserId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบกระเป๋าที่เลือก หรือคุณไม่มีสิทธิ์เข้าถึง'
            });
        }

        req.user.currentGroupId = group._id;
        await req.user.save();

        res.json({
            success: true,
            message: `เปลี่ยนไปใช้ "${group.name}" สำเร็จ`,
            data: { group }
        });
    } catch (error) {
        console.error('Switch group error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถสลับกระเป๋าได้'
        });
    }
});

// ===========================================
// Export Routes
// ===========================================

// GET /api/export/csv - ส่งออก CSV
app.get('/api/export/csv', requireAuth, async (req, res) => {
    try {
        const { month } = req.query;
        const groupId = req.user.currentGroupId?._id;

        const query = { groupId };
        if (month) query.monthStr = month;

        const transactions = await Transaction.find(query)
            .populate('categoryId', 'name type')
            .sort({ date: -1 });

        // สร้าง CSV
        const headers = ['วันที่', 'ประเภท', 'หมวดหมู่', 'จำนวนเงิน', 'หมายเหตุ', 'แท็ก'];
        const rows = transactions.map(t => [
            new Date(t.date).toLocaleDateString('th-TH'),
            t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
            t.categoryId?.name || '',
            t.amount,
            t.note || '',
            (t.tags || []).join(', ')
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=expense-report-${month || 'all'}.csv`);
        res.send('\uFEFF' + csv); // BOM for Excel UTF-8
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถส่งออกได้'
        });
    }
});

// ===========================================
// LINE Webhook - Smart Input + Smart Commands
// ===========================================

// Helper: ส่งข้อความตอบกลับไปยัง LINE
const replyToLine = async (replyToken, messages) => {
    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!LINE_ACCESS_TOKEN || LINE_ACCESS_TOKEN === 'your_line_channel_access_token_here') {
        console.log('📝 LINE Reply (mock):', messages);
        return;
    }

    try {
        const axios = (await import('axios')).default;
        await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken,
            messages
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
            }
        });
    } catch (err) {
        console.error('LINE reply error:', err.response?.data || err.message);
    }
};

// Helper: Format currency
const formatMoney = (amount) => {
    return new Intl.NumberFormat('th-TH').format(amount);
};

// Helper: Get today's date string
const getTodayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Helper: Get current month string
const getCurrentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// ===========================================
// LINE Chat Simulator (For Testing)
// ===========================================
app.post('/api/simulate-line', requireAuth, async (req, res) => {
    try {
        const { message } = req.body;
        const lineUserId = req.lineUserId;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // Simulate LINE webhook processing
        const text = message.trim().toLowerCase();
        const originalText = message.trim();

        // Get user
        const user = await User.findOne({ lineUserId }).populate('currentGroupId');
        if (!user || !user.currentGroupId) {
            return res.json({
                success: true,
                response: {
                    type: 'text',
                    text: '❌ กรุณาลงทะเบียนในแอปก่อนใช้งาน'
                }
            });
        }

        const groupId = user.currentGroupId._id;
        const monthStr = getCurrentMonthStr();
        const LIFF_URL = process.env.LIFF_URL || 'https://liff.line.me/YOUR_LIFF_ID';

        // Process commands and return response
        let response = null;

        // สรุป
        if (text === 'สรุป' || text === 'สรุปเดือน') {
            const summary = await Transaction.aggregate([
                { $match: { groupId: new mongoose.Types.ObjectId(groupId), monthStr } },
                { $group: { _id: '$type', total: { $sum: '$amount' } } }
            ]);

            const income = summary.find(s => s._id === 'income')?.total || 0;
            const expense = summary.find(s => s._id === 'expense')?.total || 0;
            const balance = income - expense;

            response = {
                type: 'flex',
                data: {
                    title: '📊 สรุปเดือนนี้',
                    income: formatMoney(income),
                    expense: formatMoney(expense),
                    balance: formatMoney(balance),
                    isPositive: balance >= 0,
                    streak: user.streak,
                    badges: user.achievements.length
                }
            };
        }

        // สรุปวัน
        else if (text === 'สรุปวัน' || text === 'วันนี้') {
            const todayStr = getTodayStr();
            const todayStart = new Date(todayStr);
            const todayEnd = new Date(todayStr);
            todayEnd.setDate(todayEnd.getDate() + 1);

            const transactions = await Transaction.find({
                groupId,
                date: { $gte: todayStart, $lt: todayEnd }
            }).populate('categoryId', 'name icon');

            const income = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
            const expense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

            response = {
                type: 'today',
                data: {
                    title: '📅 สรุปวันนี้',
                    income: formatMoney(income),
                    expense: formatMoney(expense),
                    transactions: transactions.slice(0, 5).map(t => ({
                        icon: t.categoryId?.icon || '📦',
                        name: t.categoryId?.name || 'อื่นๆ',
                        amount: formatMoney(t.amount),
                        type: t.type
                    }))
                }
            };
        }

        // ดูหมวด
        else if (text === 'ดูหมวด' || text === 'หมวด' || text === 'หมวดหมู่') {
            const byCategory = await Transaction.aggregate([
                { $match: { groupId: new mongoose.Types.ObjectId(groupId), monthStr, type: 'expense' } },
                { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
                { $sort: { total: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
                { $unwind: '$cat' }
            ]);

            response = {
                type: 'categories',
                data: {
                    title: '🍕 TOP 5 รายจ่าย',
                    categories: byCategory.map((c, i) => ({
                        rank: i + 1,
                        icon: c.cat.icon,
                        name: c.cat.name,
                        amount: formatMoney(c.total)
                    }))
                }
            };
        }

        // เป้าหมาย
        else if (text === 'เป้าหมาย' || text === 'goals') {
            const goals = await SavingsGoal.find({ groupId, userId: lineUserId });

            response = {
                type: 'goals',
                data: {
                    title: '🎯 เป้าหมาย',
                    goals: goals.map(g => ({
                        icon: g.icon,
                        name: g.name,
                        current: formatMoney(g.currentAmount),
                        target: formatMoney(g.targetAmount),
                        percent: Math.round((g.currentAmount / g.targetAmount) * 100),
                        completed: g.isCompleted
                    }))
                }
            };
        }

        // ความสำเร็จ
        else if (text === 'ความสำเร็จ' || text === 'achievements' || text === 'badge') {
            response = {
                type: 'achievements',
                data: {
                    title: '🏆 ความสำเร็จ',
                    unlocked: user.achievements,
                    total: achievements.length,
                    streak: user.streak,
                    allAchievements: achievements
                }
            };
        }

        // สถิติ
        else if (text === 'สถิติ' || text === 'stats') {
            const txCount = await Transaction.countDocuments({ userId: lineUserId });
            const journalCount = await DailyJournal.countDocuments({ userId: lineUserId });
            const completedGoals = await SavingsGoal.countDocuments({ userId: lineUserId, isCompleted: true });

            response = {
                type: 'stats',
                data: {
                    title: '📊 สถิติ',
                    streak: user.streak,
                    transactions: txCount,
                    journals: journalCount,
                    completedGoals,
                    badges: user.achievements.length,
                    totalBadges: achievements.length
                }
            };
        }

        // help
        else if (text === 'help' || text === 'ช่วย' || text === 'ช่วยเหลือ' || text === 'คำสั่ง') {
            response = {
                type: 'help',
                data: {
                    title: '📖 คำสั่งทั้งหมด',
                    commands: [
                        { category: '📊 สรุป', items: ['สรุป', 'สรุปวัน', 'ดูหมวด', 'ล่าสุด'] },
                        { category: '✏️ บันทึก', items: ['ชานม 45 เย็น', 'อาหาร 150'] },
                        { category: '🎯 เป้าหมาย', items: ['เป้าหมาย', 'ตั้งเป้า iPhone 45000', 'ออม iPhone 1000'] },
                        { category: '📖 Journal', items: ['journal', 'อารมณ์ 5', 'จด ข้อความ'] },
                        { category: '🏆 อื่นๆ', items: ['ความสำเร็จ', 'สถิติ'] }
                    ]
                }
            };
        }

        // Smart Input - บันทึกรายการ
        else {
            const regex = /^(.+?)\s+(\d+(?:\.\d+)?)(?:\s+(.*))?$/;
            const match = originalText.match(regex);

            if (match) {
                const [, categoryName, amountStr, note] = match;
                const amount = parseFloat(amountStr);

                const category = await Category.findOne({
                    groupId,
                    name: { $regex: new RegExp(categoryName, 'i') }
                });

                if (!category) {
                    const cats = await Category.find({ groupId, type: 'expense' }).limit(8);
                    response = {
                        type: 'error',
                        data: {
                            title: '❌ ไม่พบหมวดหมู่',
                            message: `ไม่พบ "${categoryName}"`,
                            suggestions: cats.map(c => c.name)
                        }
                    };
                } else {
                    // Create transaction
                    const now = new Date();
                    const txMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    const todayStr = getTodayStr();

                    const transaction = new Transaction({
                        groupId,
                        userId: lineUserId,
                        type: category.type,
                        amount,
                        categoryId: category._id,
                        date: now,
                        note: note || '',
                        monthStr: txMonthStr
                    });

                    await transaction.save();

                    // Update streak
                    if (user.lastRecordDate !== todayStr) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

                        if (user.lastRecordDate === yesterdayStr) {
                            user.streak += 1;
                        } else {
                            user.streak = 1;
                        }
                        user.lastRecordDate = todayStr;

                        if (user.streak === 7 && !user.achievements.includes('week_streak')) {
                            user.achievements.push('week_streak');
                        }
                        if (!user.achievements.includes('first_record')) {
                            user.achievements.push('first_record');
                        }

                        await user.save();
                    }

                    response = {
                        type: 'transaction',
                        data: {
                            title: category.type === 'income' ? '💰 บันทึกรายรับ' : '💸 บันทึกรายจ่าย',
                            icon: category.icon,
                            name: category.name,
                            amount: formatMoney(amount),
                            note: note || '',
                            isIncome: category.type === 'income',
                            streak: user.streak,
                            badges: user.achievements.length
                        }
                    };
                }
            } else {
                response = {
                    type: 'unknown',
                    data: {
                        title: '❓ ไม่เข้าใจคำสั่ง',
                        message: `"${originalText}"`,
                        hint: 'พิมพ์ "help" เพื่อดูคำสั่งทั้งหมด'
                    }
                };
            }
        }

        res.json({ success: true, response });

    } catch (error) {
        console.error('Simulate LINE error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/webhook', async (req, res) => {
    try {
        const events = req.body.events || [];

        for (const event of events) {
            if (event.type !== 'message' || event.message.type !== 'text') {
                continue;
            }

            const text = event.message.text.trim().toLowerCase();
            const originalText = event.message.text.trim();
            const lineUserId = event.source.userId;
            const replyToken = event.replyToken;

            // Get user
            const user = await User.findOne({ lineUserId }).populate('currentGroupId');
            if (!user || !user.currentGroupId) {
                await replyToLine(replyToken, [{
                    type: 'text',
                    text: '❌ กรุณาลงทะเบียนในแอปก่อนใช้งาน\n\n🔗 เปิดแอป: [ลิงก์แอป]'
                }]);
                continue;
            }

            const groupId = user.currentGroupId._id;
            const monthStr = getCurrentMonthStr();

            // ========== RICH MENU COMMANDS ==========

            // Get LIFF URL from environment
            const LIFF_URL = process.env.LIFF_URL || 'https://liff.line.me/YOUR_LIFF_ID';

            // รายรับ - เปิดแอปเพิ่มรายรับ
            if (text === 'รายรับ' || text === 'income' || text === '+') {
                await replyToLine(replyToken, [{
                    type: 'template',
                    altText: '💰 เพิ่มรายรับ',
                    template: {
                        type: 'buttons',
                        title: '💰 เพิ่มรายรับ',
                        text: 'เลือกวิธีบันทึก',
                        actions: [
                            {
                                type: 'uri',
                                label: '📱 เปิดแอป',
                                uri: `${LIFF_URL}?tab=add&type=income`
                            },
                            {
                                type: 'message',
                                label: '⌨️ พิมพ์เอง',
                                text: 'วิธีบันทึกรายรับ'
                            }
                        ]
                    }
                }]);
                continue;
            }

            // วิธีบันทึกรายรับ
            if (text === 'วิธีบันทึกรายรับ') {
                const incomeCats = await Category.find({ groupId, type: 'income' });
                const catList = incomeCats.map(c => `${c.icon} ${c.name}`).join('\n');

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `💰 บันทึกรายรับ\n\nพิมพ์: [หมวด] [จำนวนเงิน] [หมายเหตุ]\n\nตัวอย่าง:\nเงินเดือน 25000\nโบนัส 5000 Q4\n\n📂 หมวดที่ใช้ได้:\n${catList}`
                }]);
                continue;
            }

            // รายจ่าย - เปิดแอปเพิ่มรายจ่าย
            if (text === 'รายจ่าย' || text === 'expense' || text === '-') {
                await replyToLine(replyToken, [{
                    type: 'template',
                    altText: '💸 เพิ่มรายจ่าย',
                    template: {
                        type: 'buttons',
                        title: '💸 เพิ่มรายจ่าย',
                        text: 'เลือกวิธีบันทึก',
                        actions: [
                            {
                                type: 'uri',
                                label: '📱 เปิดแอป',
                                uri: `${LIFF_URL}?tab=add&type=expense`
                            },
                            {
                                type: 'message',
                                label: '⌨️ พิมพ์เอง',
                                text: 'วิธีบันทึกรายจ่าย'
                            }
                        ]
                    }
                }]);
                continue;
            }

            // วิธีบันทึกรายจ่าย
            if (text === 'วิธีบันทึกรายจ่าย') {
                const expenseCats = await Category.find({ groupId, type: 'expense' });
                const catList = expenseCats.map(c => `${c.icon} ${c.name}`).join('\n');

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `💸 บันทึกรายจ่าย\n\nพิมพ์: [หมวด] [จำนวนเงิน] [หมายเหตุ]\n\nตัวอย่าง:\nชานม 45 เย็น\nอาหาร 120 มื้อเที่ยง\n\n📂 หมวดที่ใช้ได้:\n${catList}`
                }]);
                continue;
            }

            // ประจำ - รายการประจำ
            if (text === 'ประจำ' || text === 'recurring') {
                const recurring = await RecurringTransaction.find({ groupId, userId: lineUserId, isActive: true })
                    .populate('categoryId', 'name icon');

                if (recurring.length === 0) {
                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `🔄 รายการประจำ\n\nยังไม่มีรายการประจำ\n\n💡 ฟีเจอร์นี้ต้องตั้งค่าผ่านแอป\nเช่น: ค่าเน็ต, Netflix, ค่าเช่า`
                    }]);
                } else {
                    const freqMap = { daily: 'ทุกวัน', weekly: 'ทุกสัปดาห์', monthly: 'ทุกเดือน', yearly: 'ทุกปี' };
                    const list = recurring.map(r =>
                        `${r.categoryId?.icon || '📦'} ${r.categoryId?.name}: ฿${formatMoney(r.amount)} (${freqMap[r.frequency]})`
                    ).join('\n');

                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `🔄 รายการประจำ\n\n${list}\n\n💡 แก้ไขได้ในแอป`
                    }]);
                }
                continue;
            }

            // งบ - เปิดแอปดูงบประมาณ
            if (text === 'งบ' || text === 'budget' || text === 'งบประมาณ') {
                await replyToLine(replyToken, [{
                    type: 'template',
                    altText: '📋 งบประมาณ',
                    template: {
                        type: 'buttons',
                        title: '📋 งบประมาณ',
                        text: 'จัดการงบประมาณรายเดือน',
                        actions: [
                            {
                                type: 'uri',
                                label: '📱 เปิดแอป',
                                uri: `${LIFF_URL}?tab=settings&section=budget`
                            },
                            {
                                type: 'message',
                                label: '📊 ดูสถานะงบ',
                                text: 'สถานะงบ'
                            }
                        ]
                    }
                }]);
                continue;
            }

            // สถานะงบ - ดูสถานะงบประมาณ
            if (text === 'สถานะงบ') {
                const catsWithBudget = await Category.find({ groupId, type: 'expense', budgetLimit: { $gt: 0 } });

                if (catsWithBudget.length === 0) {
                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `📋 งบประมาณ\n\nยังไม่ได้ตั้งงบประมาณ\n\n💡 ตั้งงบในแอป หรือพิมพ์:\nตั้งงบ [หมวด] [จำนวน]\n\nตัวอย่าง:\nตั้งงบ ชานม 500`
                    }]);
                } else {
                    const budgetStatus = await Promise.all(catsWithBudget.map(async (cat) => {
                        const spent = await Transaction.aggregate([
                            { $match: { groupId: new mongoose.Types.ObjectId(groupId), categoryId: cat._id, monthStr } },
                            { $group: { _id: null, total: { $sum: '$amount' } } }
                        ]);
                        const spentAmount = spent[0]?.total || 0;
                        const percent = Math.round((spentAmount / cat.budgetLimit) * 100);
                        const status = percent >= 100 ? '🔴' : percent >= 80 ? '🟡' : '🟢';
                        return `${status} ${cat.icon} ${cat.name}\n   ฿${formatMoney(spentAmount)} / ฿${formatMoney(cat.budgetLimit)} (${percent}%)`;
                    }));

                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `📋 งบประมาณเดือนนี้\n\n${budgetStatus.join('\n\n')}\n\n🟢 ปกติ 🟡 ใกล้ครบ 🔴 เกิน`
                    }]);
                }
                continue;
            }

            // ตั้งงบ [หมวด] [จำนวน]
            const budgetMatch = originalText.match(/^ตั้งงบ\s+(.+?)\s+(\d+)$/i);
            if (budgetMatch) {
                const [, catName, limitStr] = budgetMatch;
                const budgetLimit = parseFloat(limitStr);

                const cat = await Category.findOne({
                    groupId,
                    type: 'expense',
                    name: { $regex: new RegExp(catName, 'i') }
                });

                if (!cat) {
                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `❌ ไม่พบหมวด "${catName}"\n\nดูหมวดทั้งหมด: พิมพ์ "หมวดทั้งหมด"`
                    }]);
                } else {
                    cat.budgetLimit = budgetLimit;
                    await cat.save();

                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `✅ ตั้งงบสำเร็จ!\n\n${cat.icon} ${cat.name}\nงบ: ฿${formatMoney(budgetLimit)} / เดือน\n\n💡 ดูสถานะ: พิมพ์ "งบ"`
                    }]);
                }
                continue;
            }

            // หมวด (from Rich Menu) - redirect to ดูหมวด
            if (text === 'หมวด') {
                const byCategory = await Transaction.aggregate([
                    { $match: { groupId: new mongoose.Types.ObjectId(groupId), monthStr, type: 'expense' } },
                    { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
                    { $sort: { total: -1 } },
                    { $limit: 5 },
                    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
                    { $unwind: '$cat' }
                ]);

                let catList = byCategory.map((c, i) =>
                    `${i + 1}. ${c.cat.icon} ${c.cat.name}: ฿${formatMoney(c.total)}`
                ).join('\n') || 'ยังไม่มีข้อมูล';

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `🍕 TOP 5 รายจ่ายเดือนนี้\n\n${catList}\n\n💡 ดูหมวดทั้งหมด: พิมพ์ "หมวดทั้งหมด"`
                }]);
                continue;
            }

            // ========== SMART COMMANDS ==========

            // สรุป / สรุปเดือน
            if (text === 'สรุป' || text === 'สรุปเดือน') {
                const summary = await Transaction.aggregate([
                    { $match: { groupId: new mongoose.Types.ObjectId(groupId), monthStr } },
                    { $group: { _id: '$type', total: { $sum: '$amount' } } }
                ]);

                const income = summary.find(s => s._id === 'income')?.total || 0;
                const expense = summary.find(s => s._id === 'expense')?.total || 0;
                const balance = income - expense;
                const balanceColor = balance >= 0 ? '#00FF88' : '#FF3366';

                await replyToLine(replyToken, [{
                    type: 'flex',
                    altText: `📊 สรุปเดือนนี้ คงเหลือ ฿${formatMoney(balance)}`,
                    contents: {
                        type: 'bubble',
                        size: 'kilo',
                        hero: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '📊 สรุปเดือนนี้',
                                    weight: 'bold',
                                    size: 'xl',
                                    color: '#000000',
                                    align: 'center'
                                }
                            ],
                            backgroundColor: '#FFEB00',
                            paddingAll: '20px'
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: '💰 รายรับ', flex: 1, weight: 'bold' },
                                        { type: 'text', text: `฿${formatMoney(income)}`, align: 'end', color: '#00FF88', weight: 'bold' }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: '💸 รายจ่าย', flex: 1, weight: 'bold' },
                                        { type: 'text', text: `฿${formatMoney(expense)}`, align: 'end', color: '#FF3366', weight: 'bold' }
                                    ],
                                    margin: 'md'
                                },
                                { type: 'separator', margin: 'lg' },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: balance >= 0 ? '✅ คงเหลือ' : '❌ ขาดทุน', flex: 1, weight: 'bold', size: 'lg' },
                                        { type: 'text', text: `฿${formatMoney(Math.abs(balance))}`, align: 'end', color: balanceColor, weight: 'bold', size: 'lg' }
                                    ],
                                    margin: 'lg'
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: `🔥 Streak: ${user.streak} วัน`, size: 'xs', color: '#FF6B35' },
                                        { type: 'text', text: `🏆 ${user.achievements.length} Badge`, size: 'xs', color: '#9B5DE5', align: 'end' }
                                    ],
                                    margin: 'lg'
                                }
                            ],
                            paddingAll: '15px'
                        },
                        footer: {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'button',
                                    action: { type: 'message', label: '📅 วันนี้', text: 'สรุปวัน' },
                                    style: 'secondary',
                                    height: 'sm'
                                },
                                {
                                    type: 'button',
                                    action: { type: 'message', label: '📂 หมวด', text: 'ดูหมวด' },
                                    style: 'secondary',
                                    height: 'sm'
                                }
                            ],
                            spacing: 'sm',
                            paddingAll: '10px'
                        }
                    }
                }]);
                continue;
            }

            // สรุปวัน / วันนี้
            if (text === 'สรุปวัน' || text === 'วันนี้') {
                const todayStr = getTodayStr();
                const todayStart = new Date(todayStr);
                const todayEnd = new Date(todayStr);
                todayEnd.setDate(todayEnd.getDate() + 1);

                const transactions = await Transaction.find({
                    groupId,
                    date: { $gte: todayStart, $lt: todayEnd }
                }).populate('categoryId', 'name icon');

                const income = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
                const expense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

                let txList = transactions.slice(0, 5).map(t =>
                    `${t.categoryId?.icon || '📦'} ${t.categoryId?.name}: ${t.type === 'income' ? '+' : '-'}฿${formatMoney(t.amount)}`
                ).join('\n') || 'ยังไม่มีรายการ';

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `📅 สรุปวันนี้\n\n💰 รายรับ: ฿${formatMoney(income)}\n💸 รายจ่าย: ฿${formatMoney(expense)}\n\n📝 รายการล่าสุด:\n${txList}`
                }]);
                continue;
            }

            // ดูหมวด / หมวดหมู่
            if (text === 'ดูหมวด' || text === 'หมวดหมู่') {
                const byCategory = await Transaction.aggregate([
                    { $match: { groupId: new mongoose.Types.ObjectId(groupId), monthStr, type: 'expense' } },
                    { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
                    { $sort: { total: -1 } },
                    { $limit: 5 },
                    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
                    { $unwind: '$cat' }
                ]);

                let catList = byCategory.map((c, i) =>
                    `${i + 1}. ${c.cat.icon} ${c.cat.name}: ฿${formatMoney(c.total)}`
                ).join('\n') || 'ยังไม่มีข้อมูล';

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `🍕 TOP 5 รายจ่ายเดือนนี้\n\n${catList}\n\n💡 TIP: ลดรายจ่ายอันดับ 1 ลง 20% จะประหยัดได้เยอะ!`
                }]);
                continue;
            }

            // เหลือเท่าไหร่ / ยอดคงเหลือ
            if (text === 'เหลือเท่าไหร่' || text === 'ยอดคงเหลือ' || text === 'balance') {
                const summary = await Transaction.aggregate([
                    { $match: { groupId: new mongoose.Types.ObjectId(groupId), monthStr } },
                    { $group: { _id: '$type', total: { $sum: '$amount' } } }
                ]);

                const income = summary.find(s => s._id === 'income')?.total || 0;
                const expense = summary.find(s => s._id === 'expense')?.total || 0;
                const balance = income - expense;

                const emoji = balance >= 0 ? '💰' : '😰';
                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `${emoji} ยอดคงเหลือเดือนนี้\n\n฿${formatMoney(balance)}`
                }]);
                continue;
            }

            // ใช้ไปเท่าไหร่
            if (text === 'ใช้ไปเท่าไหร่' || text === 'ใช้จ่าย') {
                const expense = await Transaction.aggregate([
                    { $match: { groupId: new mongoose.Types.ObjectId(groupId), monthStr, type: 'expense' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);

                const total = expense[0]?.total || 0;
                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `💸 ใช้จ่ายเดือนนี้\n\n฿${formatMoney(total)}`
                }]);
                continue;
            }

            // ========== GOALS COMMANDS ==========

            // ดูเป้าหมาย / เป้าหมาย / goals
            if (text === 'เป้าหมาย' || text === 'ดูเป้าหมาย' || text === 'goals') {
                const goals = await SavingsGoal.find({ groupId, userId: lineUserId });

                if (goals.length === 0) {
                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `🎯 ยังไม่มีเป้าหมาย\n\nสร้างใหม่:\nตั้งเป้า [ชื่อ] [จำนวนเงิน]\n\nตัวอย่าง:\nตั้งเป้า iPhone 45000`
                    }]);
                } else {
                    const goalList = goals.map(g => {
                        const percent = Math.round((g.currentAmount / g.targetAmount) * 100);
                        const status = g.isCompleted ? '✅' : `${percent}%`;
                        return `${g.icon} ${g.name}\n   ฿${formatMoney(g.currentAmount)} / ฿${formatMoney(g.targetAmount)} [${status}]`;
                    }).join('\n\n');

                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `🎯 เป้าหมายของคุณ\n\n${goalList}\n\n💡 เพิ่มเงิน: ออม [ชื่อเป้า] [จำนวน]`
                    }]);
                }
                continue;
            }

            // ตั้งเป้า [ชื่อ] [จำนวน]
            const goalMatch = originalText.match(/^ตั้งเป้า\s+(.+?)\s+(\d+)$/i);
            if (goalMatch) {
                const [, goalName, targetStr] = goalMatch;
                const targetAmount = parseFloat(targetStr);

                const newGoal = new SavingsGoal({
                    groupId,
                    userId: lineUserId,
                    name: goalName,
                    targetAmount,
                    icon: '🎯'
                });
                await newGoal.save();

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `✅ สร้างเป้าหมายสำเร็จ!\n\n🎯 ${goalName}\nเป้าหมาย: ฿${formatMoney(targetAmount)}\n\n💡 เพิ่มเงิน: ออม ${goalName} [จำนวน]`
                }]);
                continue;
            }

            // ออม [ชื่อเป้า] [จำนวน]
            const saveMatch = originalText.match(/^ออม\s+(.+?)\s+(\d+)$/i);
            if (saveMatch) {
                const [, goalName, addAmountStr] = saveMatch;
                const addAmount = parseFloat(addAmountStr);

                const goal = await SavingsGoal.findOne({
                    groupId,
                    userId: lineUserId,
                    name: { $regex: new RegExp(goalName, 'i') },
                    isCompleted: false
                });

                if (!goal) {
                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `❌ ไม่พบเป้าหมาย "${goalName}"\n\nดูเป้าหมายทั้งหมด: พิมพ์ "เป้าหมาย"`
                    }]);
                } else {
                    goal.currentAmount += addAmount;
                    if (goal.currentAmount >= goal.targetAmount) {
                        goal.isCompleted = true;
                        goal.currentAmount = goal.targetAmount;
                    }
                    await goal.save();

                    const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100);
                    const congrats = goal.isCompleted ? '\n\n🎉🎊 ยินดีด้วย! บรรลุเป้าหมายแล้ว! 🎊🎉' : '';

                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `💰 เพิ่มเงินสำเร็จ!\n\n${goal.icon} ${goal.name}\n+฿${formatMoney(addAmount)}\n\nยอดสะสม: ฿${formatMoney(goal.currentAmount)} / ฿${formatMoney(goal.targetAmount)}\nความคืบหน้า: ${percent}%${congrats}`
                    }]);
                }
                continue;
            }

            // ========== ACHIEVEMENTS COMMAND ==========

            if (text === 'ความสำเร็จ' || text === 'achievements' || text === 'badge' || text === 'แบดจ์') {
                const unlockedList = user.achievements.map(id => {
                    const ach = achievements.find(a => a.id === id);
                    return ach ? `${ach.icon} ${ach.name}` : null;
                }).filter(Boolean);

                const lockedCount = achievements.length - user.achievements.length;

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `🏆 ความสำเร็จของคุณ\n\n✅ ปลดล็อคแล้ว (${user.achievements.length}/${achievements.length}):\n${unlockedList.join('\n') || 'ยังไม่มี'}\n\n🔒 รอปลดล็อค: ${lockedCount} รายการ\n\n🔥 Streak ปัจจุบัน: ${user.streak} วัน`
                }]);
                continue;
            }

            // ========== JOURNAL COMMANDS ==========

            // อารมณ์ [1-5] หรือ mood [1-5]
            const moodMatch = text.match(/^(?:อารมณ์|mood)\s*(\d)$/);
            if (moodMatch) {
                const moodValue = parseInt(moodMatch[1]);
                if (moodValue >= 1 && moodValue <= 5) {
                    const todayStr = getTodayStr();
                    const moodEmojis = ['😢', '😔', '😐', '😊', '🤩'];

                    await DailyJournal.findOneAndUpdate(
                        { userId: lineUserId, date: todayStr },
                        { $set: { mood: moodValue } },
                        { upsert: true }
                    );

                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `📖 บันทึกอารมณ์สำเร็จ!\n\nวันนี้: ${moodEmojis[moodValue - 1]}\n\n💡 บันทึกเพิ่ม: จด [ข้อความ]`
                    }]);
                }
                continue;
            }

            // จด [ข้อความ] หรือ บันทึก [ข้อความ]
            const noteMatch = originalText.match(/^(?:จด|บันทึก|note)\s+(.+)$/i);
            if (noteMatch) {
                const noteText = noteMatch[1];
                const todayStr = getTodayStr();

                await DailyJournal.findOneAndUpdate(
                    { userId: lineUserId, date: todayStr },
                    { $set: { note: noteText } },
                    { upsert: true }
                );

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `📝 บันทึกสำเร็จ!\n\n"${noteText}"\n\n💡 ดูบันทึกวันนี้: พิมพ์ "journal"`
                }]);
                continue;
            }

            // ดู journal วันนี้
            if (text === 'journal' || text === 'ดูบันทึก' || text === 'บันทึกวันนี้') {
                const todayStr = getTodayStr();
                const journal = await DailyJournal.findOne({ userId: lineUserId, date: todayStr });
                const moodEmojis = ['😢', '😔', '😐', '😊', '🤩'];

                if (journal) {
                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `📖 บันทึกวันนี้\n\n💭 อารมณ์: ${moodEmojis[journal.mood - 1] || '❓'}\n🎯 เป้าหมาย: ${journal.todayGoal || '-'}\n📝 บันทึก: ${journal.note || '-'}\n\n💰 รายรับ: ฿${formatMoney(journal.totalIncome || 0)}\n💸 รายจ่าย: ฿${formatMoney(journal.totalExpense || 0)}`
                    }]);
                } else {
                    await replyToLine(replyToken, [{
                        type: 'text',
                        text: `📖 ยังไม่มีบันทึกวันนี้\n\n💡 เริ่มบันทึก:\n• อารมณ์ 5 (1=แย่มาก, 5=ดีมาก)\n• จด วันนี้สนุกมาก`
                    }]);
                }
                continue;
            }

            // ========== RECENT TRANSACTIONS ==========

            if (text === 'ล่าสุด' || text === 'รายการล่าสุด' || text === 'recent') {
                const recent = await Transaction.find({ groupId })
                    .populate('categoryId', 'name icon')
                    .sort({ date: -1 })
                    .limit(10);

                const list = recent.map(t => {
                    const sign = t.type === 'income' ? '+' : '-';
                    return `${t.categoryId?.icon || '📦'} ${t.categoryId?.name}: ${sign}฿${formatMoney(t.amount)}`;
                }).join('\n');

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `📋 10 รายการล่าสุด\n\n${list || 'ยังไม่มีรายการ'}`
                }]);
                continue;
            }

            // ========== CATEGORIES LIST ==========

            if (text === 'รายการหมวด' || text === 'หมวดทั้งหมด' || text === 'categories') {
                const cats = await Category.find({ groupId });
                const expenseCats = cats.filter(c => c.type === 'expense').map(c => `${c.icon} ${c.name}`).join(', ');
                const incomeCats = cats.filter(c => c.type === 'income').map(c => `${c.icon} ${c.name}`).join(', ');

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `📂 หมวดหมู่ทั้งหมด\n\n💸 รายจ่าย:\n${expenseCats}\n\n💰 รายรับ:\n${incomeCats}`
                }]);
                continue;
            }

            // ========== USER STATS ==========

            if (text === 'สถิติ' || text === 'stats' || text === 'ข้อมูล') {
                const txCount = await Transaction.countDocuments({ userId: lineUserId });
                const journalCount = await DailyJournal.countDocuments({ userId: lineUserId });
                const completedGoals = await SavingsGoal.countDocuments({ userId: lineUserId, isCompleted: true });

                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `📊 สถิติของคุณ\n\n🔥 Streak: ${user.streak} วัน\n📝 บันทึกทั้งหมด: ${txCount} รายการ\n📖 Journal: ${journalCount} วัน\n🎯 เป้าหมายสำเร็จ: ${completedGoals} เป้า\n🏆 Achievements: ${user.achievements.length}/${achievements.length}`
                }]);
                continue;
            }

            // help / ช่วยเหลือ (UPDATED with all commands)
            if (text === 'help' || text === 'ช่วย' || text === 'ช่วยเหลือ' || text === 'คำสั่ง') {
                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `📖 คำสั่งทั้งหมด\n\n📊 สรุป:\n• สรุป / สรุปวัน\n• ดูหมวด / ล่าสุด\n• เหลือเท่าไหร่ / ใช้ไปเท่าไหร่\n\n✏️ บันทึก:\n• [หมวด] [เงิน] [หมายเหตุ]\n• เช่น: ชานม 45 เย็น\n\n🎯 เป้าหมาย:\n• เป้าหมาย - ดูทั้งหมด\n• ตั้งเป้า [ชื่อ] [เงิน]\n• ออม [ชื่อเป้า] [เงิน]\n\n📖 Journal:\n• journal - ดูบันทึก\n• อารมณ์ [1-5]\n• จด [ข้อความ]\n\n🏆 อื่นๆ:\n• ความสำเร็จ / สถิติ\n• หมวดทั้งหมด`
                }]);
                continue;
            }

            // ========== SMART INPUT (บันทึกรายการ) ==========
            const regex = /^(.+?)\s+(\d+(?:\.\d+)?)(?:\s+(.*))?$/;
            const match = originalText.match(regex);

            if (!match) {
                continue; // ไม่ตรงรูปแบบ ข้ามไป
            }

            const [, categoryName, amountStr, note] = match;
            const amount = parseFloat(amountStr);

            const category = await Category.findOne({
                groupId,
                name: { $regex: new RegExp(categoryName, 'i') }
            });

            if (!category) {
                const cats = await Category.find({ groupId, type: 'expense' }).limit(8);
                const catList = cats.map(c => c.name).join(', ');
                await replyToLine(replyToken, [{
                    type: 'text',
                    text: `❌ ไม่พบหมวดหมู่ "${categoryName}"\n\n💡 ลองใช้:\n${catList}`
                }]);
                continue;
            }

            const now = new Date();
            const txMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const todayStr = getTodayStr();

            const transaction = new Transaction({
                groupId,
                userId: lineUserId,
                type: category.type,
                amount,
                categoryId: category._id,
                date: now,
                note: note || '',
                monthStr: txMonthStr
            });

            await transaction.save();

            // Update streak
            if (user.lastRecordDate !== todayStr) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

                if (user.lastRecordDate === yesterdayStr) {
                    user.streak += 1;
                } else {
                    user.streak = 1;
                }
                user.lastRecordDate = todayStr;

                // Check achievements
                if (user.streak === 7 && !user.achievements.includes('week_streak')) {
                    user.achievements.push('week_streak');
                }
                if (user.streak === 30 && !user.achievements.includes('month_streak')) {
                    user.achievements.push('month_streak');
                }
                if (!user.achievements.includes('first_record')) {
                    user.achievements.push('first_record');
                }

                await user.save();
            }

            console.log(`✅ Smart Input: ${categoryName} ${amount} บาท (${note || 'ไม่มีหมายเหตุ'})`);

            const isIncome = category.type === 'income';
            const typeText = isIncome ? 'รายรับ' : 'รายจ่าย';
            const amountSign = isIncome ? '+' : '-';
            const heroColor = isIncome ? '#00FF88' : '#FF3366';
            const streakEmoji = user.streak >= 7 ? '🔥' : '✨';

            // Flex Message สวยๆ
            await replyToLine(replyToken, [{
                type: 'flex',
                altText: `✅ จดแล้วค่ะ ${category.name} ${amountSign}${formatMoney(amount)}`,
                contents: {
                    type: 'bubble',
                    size: 'kilo',
                    hero: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: `${category.icon} จดแล้วค่ะ ${category.name}`,
                                weight: 'bold',
                                size: 'lg',
                                color: '#FFFFFF',
                                align: 'center'
                            }
                        ],
                        backgroundColor: heroColor,
                        paddingAll: '20px'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: category.name,
                                weight: 'bold',
                                size: 'md',
                                color: '#666666',
                                align: 'center'
                            },
                            {
                                type: 'text',
                                text: `${amountSign} ${formatMoney(amount)}`,
                                weight: 'bold',
                                size: 'xxl',
                                color: heroColor,
                                align: 'center',
                                margin: 'md'
                            },
                            {
                                type: 'text',
                                text: note ? `หมวดหมู่: ${note}` : `หมวดหมู่: ${typeText}`,
                                size: 'xs',
                                color: '#888888',
                                align: 'center',
                                margin: 'sm'
                            },
                            {
                                type: 'separator',
                                margin: 'lg'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: `${streakEmoji} Streak: ${user.streak} วัน`,
                                        size: 'xs',
                                        color: '#FF6B35',
                                        flex: 1
                                    },
                                    {
                                        type: 'text',
                                        text: '🏆 ' + user.achievements.length + ' Badge',
                                        size: 'xs',
                                        color: '#9B5DE5',
                                        align: 'end',
                                        flex: 1
                                    }
                                ],
                                margin: 'md'
                            }
                        ],
                        backgroundColor: '#FFFFFF',
                        paddingAll: '20px'
                    },
                    footer: {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'button',
                                action: {
                                    type: 'message',
                                    label: '📊 สรุป',
                                    text: 'สรุป'
                                },
                                style: 'secondary',
                                height: 'sm'
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'message',
                                    label: '📋 ล่าสุด',
                                    text: 'ล่าสุด'
                                },
                                style: 'secondary',
                                height: 'sm'
                            }
                        ],
                        spacing: 'sm',
                        paddingAll: '10px'
                    }
                }
            }]);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false });
    }
});

// ===========================================
// Journal Routes
// ===========================================

// GET /api/journal/today - ดึง Journal วันนี้
app.get('/api/journal/today', requireAuth, async (req, res) => {
    try {
        const todayStr = getTodayStr();

        let journal = await DailyJournal.findOne({
            userId: req.lineUserId,
            date: todayStr
        });

        // ถ้าไม่มี สร้างใหม่
        if (!journal) {
            // คำนวณยอดวันนี้
            const todayStart = new Date(todayStr);
            const todayEnd = new Date(todayStr);
            todayEnd.setDate(todayEnd.getDate() + 1);

            const transactions = await Transaction.find({
                groupId: req.user.currentGroupId?._id,
                date: { $gte: todayStart, $lt: todayEnd }
            });

            const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
            const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

            journal = new DailyJournal({
                userId: req.lineUserId,
                date: todayStr,
                totalIncome,
                totalExpense
            });
            await journal.save();
        }

        res.json({
            success: true,
            data: { journal }
        });
    } catch (error) {
        console.error('Get journal error:', error);
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
    }
});

// PUT /api/journal/today - อัพเดท Journal วันนี้
app.put('/api/journal/today', requireAuth, async (req, res) => {
    try {
        const todayStr = getTodayStr();
        const { mood, note, todayGoal, reflection } = req.body;

        let journal = await DailyJournal.findOneAndUpdate(
            { userId: req.lineUserId, date: todayStr },
            {
                $set: {
                    ...(mood && { mood }),
                    ...(note !== undefined && { note }),
                    ...(todayGoal !== undefined && { todayGoal }),
                    ...(reflection !== undefined && { reflection })
                }
            },
            { new: true, upsert: true }
        );

        // Check achievement
        const journalCount = await DailyJournal.countDocuments({ userId: req.lineUserId });
        if (journalCount >= 10) {
            const user = await User.findOne({ lineUserId: req.lineUserId });
            if (!user.achievements.includes('journal_lover')) {
                user.achievements.push('journal_lover');
                await user.save();
            }
        }

        res.json({
            success: true,
            message: 'บันทึกสำเร็จ',
            data: { journal }
        });
    } catch (error) {
        console.error('Update journal error:', error);
        res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกได้' });
    }
});

// GET /api/journal/history - ประวัติ Journal
app.get('/api/journal/history', requireAuth, async (req, res) => {
    try {
        const { limit = 30 } = req.query;

        const journals = await DailyJournal.find({ userId: req.lineUserId })
            .sort({ date: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: { journals }
        });
    } catch (error) {
        console.error('Get journal history error:', error);
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
    }
});

// ===========================================
// Achievement Routes
// ===========================================

// GET /api/achievements - ดึง Achievements
app.get('/api/achievements', requireAuth, async (req, res) => {
    try {
        const user = await User.findOne({ lineUserId: req.lineUserId });

        const achievementsWithStatus = achievements.map(a => ({
            ...a,
            unlocked: user.achievements.includes(a.id),
            unlockedAt: user.achievements.includes(a.id) ? 'ปลดล็อคแล้ว' : 'ยังไม่ได้'
        }));

        res.json({
            success: true,
            data: {
                achievements: achievementsWithStatus,
                unlockedCount: user.achievements.length,
                totalCount: achievements.length,
                streak: user.streak,
                totalSaved: user.totalSaved
            }
        });
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
    }
});

// GET /api/user/stats - สถิติผู้ใช้
app.get('/api/user/stats', requireAuth, async (req, res) => {
    try {
        const user = await User.findOne({ lineUserId: req.lineUserId });
        const groupId = req.user.currentGroupId?._id;

        // นับจำนวน transactions ทั้งหมด
        const txCount = await Transaction.countDocuments({ userId: req.lineUserId });

        // จำนวน journals
        const journalCount = await DailyJournal.countDocuments({ userId: req.lineUserId });

        // Goals ที่สำเร็จ
        const completedGoals = await SavingsGoal.countDocuments({ userId: req.lineUserId, isCompleted: true });

        res.json({
            success: true,
            data: {
                streak: user.streak,
                totalTransactions: txCount,
                totalJournals: journalCount,
                completedGoals,
                achievementsUnlocked: user.achievements.length
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
    }
});

// ===========================================
// Health Check
// ===========================================
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// ===========================================
// Start Server
// ===========================================
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📡 API URL: http://localhost:${PORT}/api`);
        console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
        console.log(`🌐 Frontend URL: http://localhost:${PORT}`);
    });
});

// SPA catch-all route (must be last)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (!req.path.startsWith('/api') && !req.path.startsWith('/webhook') && !req.path.startsWith('/public')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
});
