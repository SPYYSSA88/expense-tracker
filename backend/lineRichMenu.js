// ===========================================
// LINE Rich Menu Configuration
// สำหรับสร้าง Rich Menu ใน LINE Bot
// ===========================================

/**
 * วิธีใช้งาน:
 * 1. ไปที่ LINE Developers Console
 * 2. เลือก Channel > Messaging API
 * 3. สร้าง Rich Menu หรือใช้ API ด้านล่าง
 */

export const richMenuConfig = {
    // Main Menu (6 ปุ่ม)
    main: {
        size: {
            width: 2500,
            height: 843
        },
        selected: true,
        name: "Main Menu",
        chatBarText: "เมนูหลัก / Menu ▼",
        areas: [
            {
                bounds: { x: 0, y: 0, width: 417, height: 843 },
                action: { type: "message", text: "รายรับ" }
            },
            {
                bounds: { x: 417, y: 0, width: 417, height: 843 },
                action: { type: "message", text: "รายจ่าย" }
            },
            {
                bounds: { x: 834, y: 0, width: 416, height: 843 },
                action: { type: "message", text: "ประจำ" }
            },
            {
                bounds: { x: 1250, y: 0, width: 417, height: 843 },
                action: { type: "message", text: "งบ" }
            },
            {
                bounds: { x: 1667, y: 0, width: 416, height: 843 },
                action: { type: "message", text: "หมวด" }
            },
            {
                bounds: { x: 2083, y: 0, width: 417, height: 843 },
                action: { type: "message", text: "สรุป" }
            }
        ]
    },

    // Expanded Menu (8 ปุ่ม - 2 แถว)
    expanded: {
        size: {
            width: 2500,
            height: 1686
        },
        selected: true,
        name: "Expense Tracker Menu",
        chatBarText: "เมนู 📋",
        areas: [
            // Row 1
            {
                bounds: { x: 0, y: 0, width: 625, height: 843 },
                action: { type: "message", text: "สรุป" }
            },
            {
                bounds: { x: 625, y: 0, width: 625, height: 843 },
                action: { type: "message", text: "สรุปวัน" }
            },
            {
                bounds: { x: 1250, y: 0, width: 625, height: 843 },
                action: { type: "message", text: "ดูหมวด" }
            },
            {
                bounds: { x: 1875, y: 0, width: 625, height: 843 },
                action: { type: "message", text: "เป้าหมาย" }
            },
            // Row 2
            {
                bounds: { x: 0, y: 843, width: 625, height: 843 },
                action: { type: "message", text: "journal" }
            },
            {
                bounds: { x: 625, y: 843, width: 625, height: 843 },
                action: { type: "message", text: "ความสำเร็จ" }
            },
            {
                bounds: { x: 1250, y: 843, width: 625, height: 843 },
                action: { type: "message", text: "สถิติ" }
            },
            {
                bounds: { x: 1875, y: 843, width: 625, height: 843 },
                action: { type: "message", text: "ช่วยเหลือ" }
            }
        ]
    }
};

// Quick Reply Buttons สำหรับใส่ท้ายข้อความ
export const quickReplyButtons = {
    afterTransaction: {
        items: [
            { type: "action", action: { type: "message", label: "📊 สรุป", text: "สรุป" } },
            { type: "action", action: { type: "message", label: "📋 ล่าสุด", text: "ล่าสุด" } },
            { type: "action", action: { type: "message", label: "📖 Journal", text: "journal" } }
        ]
    },
    afterSummary: {
        items: [
            { type: "action", action: { type: "message", label: "📅 วันนี้", text: "สรุปวัน" } },
            { type: "action", action: { type: "message", label: "📂 หมวด", text: "ดูหมวด" } },
            { type: "action", action: { type: "message", label: "🎯 เป้าหมาย", text: "เป้าหมาย" } }
        ]
    },
    moodSelector: {
        items: [
            { type: "action", action: { type: "message", label: "😢 1", text: "อารมณ์ 1" } },
            { type: "action", action: { type: "message", label: "😔 2", text: "อารมณ์ 2" } },
            { type: "action", action: { type: "message", label: "😐 3", text: "อารมณ์ 3" } },
            { type: "action", action: { type: "message", label: "😊 4", text: "อารมณ์ 4" } },
            { type: "action", action: { type: "message", label: "🤩 5", text: "อารมณ์ 5" } }
        ]
    },
    mainMenu: {
        items: [
            { type: "action", action: { type: "message", label: "📊 สรุป", text: "สรุป" } },
            { type: "action", action: { type: "message", label: "🎯 เป้าหมาย", text: "เป้าหมาย" } },
            { type: "action", action: { type: "message", label: "📖 Journal", text: "journal" } },
            { type: "action", action: { type: "message", label: "🏆 Badge", text: "ความสำเร็จ" } },
            { type: "action", action: { type: "message", label: "❓ ช่วย", text: "ช่วยเหลือ" } }
        ]
    }
};

// Flex Message Templates
export const flexMessages = {
    // สรุปเดือน แบบ Bubble
    monthlySummary: (income, expense, balance) => ({
        type: "bubble",
        hero: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: "📊 สรุปเดือนนี้",
                    weight: "bold",
                    size: "xl",
                    color: "#000000"
                }
            ],
            backgroundColor: "#FFEB00",
            paddingAll: "20px"
        },
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        { type: "text", text: "💰 รายรับ", flex: 1 },
                        { type: "text", text: `฿${income.toLocaleString()}`, align: "end", color: "#00FF88", weight: "bold" }
                    ]
                },
                {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        { type: "text", text: "💸 รายจ่าย", flex: 1 },
                        { type: "text", text: `฿${expense.toLocaleString()}`, align: "end", color: "#FF3366", weight: "bold" }
                    ],
                    margin: "md"
                },
                { type: "separator", margin: "lg" },
                {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        { type: "text", text: "คงเหลือ", flex: 1, weight: "bold" },
                        {
                            type: "text",
                            text: `฿${balance.toLocaleString()}`,
                            align: "end",
                            weight: "bold",
                            color: balance >= 0 ? "#00FF88" : "#FF3366"
                        }
                    ],
                    margin: "lg"
                }
            ]
        },
        footer: {
            type: "box",
            layout: "horizontal",
            contents: [
                {
                    type: "button",
                    action: { type: "message", label: "ดูหมวด", text: "ดูหมวด" },
                    style: "primary",
                    color: "#000000"
                },
                {
                    type: "button",
                    action: { type: "message", label: "วันนี้", text: "สรุปวัน" },
                    style: "secondary"
                }
            ],
            spacing: "sm"
        },
        styles: {
            hero: { backgroundColor: "#FFEB00" }
        }
    }),

    // Goal Progress
    goalProgress: (goal) => ({
        type: "bubble",
        size: "kilo",
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: `${goal.icon} ${goal.name}`,
                    weight: "bold",
                    size: "lg"
                },
                {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "box",
                            layout: "vertical",
                            contents: [],
                            width: `${Math.round((goal.currentAmount / goal.targetAmount) * 100)}%`,
                            backgroundColor: "#00FF88",
                            height: "10px"
                        }
                    ],
                    backgroundColor: "#DDDDDD",
                    height: "10px",
                    margin: "md"
                },
                {
                    type: "text",
                    text: `฿${goal.currentAmount.toLocaleString()} / ฿${goal.targetAmount.toLocaleString()}`,
                    size: "sm",
                    color: "#888888",
                    margin: "sm"
                }
            ]
        }
    })
};

export default { richMenuConfig, quickReplyButtons, flexMessages };
