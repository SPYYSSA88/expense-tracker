# 💰 บันทึกรายรับ-รายจ่าย (Expense Tracker)

แอปพลิเคชันบันทึกรายรับ-รายจ่ายส่วนตัวและครอบครัว ออกแบบมาเพื่อใช้งานใน LINE LIFF พร้อมฟีเจอร์ Smart Input ผ่าน LINE Chat

![Tech Stack](https://img.shields.io/badge/MERN-Stack-green) ![LINE LIFF](https://img.shields.io/badge/LINE-LIFF-00C300)

## 📋 สารบัญ

- [ฟีเจอร์หลัก](#-ฟีเจอร์หลัก)
- [Tech Stack](#-tech-stack)
- [โครงสร้างโปรเจค](#-โครงสร้างโปรเจค)
- [การติดตั้ง](#-การติดตั้ง)
- [การตั้งค่า Environment Variables](#-การตั้งค่า-environment-variables)
- [การรันโปรเจค](#-การรันโปรเจค)
- [API Endpoints](#-api-endpoints)
- [Smart Input (LINE Webhook)](#-smart-input-line-webhook)
- [การ Deploy](#-การ-deploy)

## ✨ ฟีเจอร์หลัก

- 📊 **Dashboard** - แสดงสรุปรายรับ รายจ่าย และยอดคงเหลือ
- ➕ **บันทึกรายการ** - เพิ่มรายรับ/รายจ่าย พร้อมเลือกหมวดหมู่
- 📈 **สถิติ** - กราฟ Donut และ Bar Chart แสดงการใช้จ่ายตามหมวดหมู่
- 💼 **หลายกระเป๋า** - รองรับกระเป๋าส่วนตัวและกระเป๋าครอบครัว
- 🤖 **Smart Input** - บันทึกรายจ่ายผ่าน LINE Chat อัตโนมัติ
- 🔐 **LINE Login** - ยืนยันตัวตนผ่าน LINE

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose |
| **Authentication** | LINE LIFF SDK |

## 📁 โครงสร้างโปรเจค

```
expense-tracker/
├── backend/
│   ├── models.js           # Mongoose schemas
│   ├── middleware.js       # Auth middleware
│   ├── server.js           # Express server & routes
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React app
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Tailwind styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
└── README.md
```

## 🚀 การติดตั้ง

### ความต้องการเบื้องต้น

- Node.js >= 18.x
- MongoDB (Local หรือ MongoDB Atlas)
- LINE Developers Account (สำหรับ LIFF และ Webhook)

### ขั้นตอน

1. **Clone โปรเจค**

```bash
git clone <repository-url>
cd expense-tracker
```

1. **ติดตั้ง Dependencies - Backend**

```bash
cd backend
npm install
```

1. **ติดตั้ง Dependencies - Frontend**

```bash
cd frontend
npm install
```

## ⚙️ การตั้งค่า Environment Variables

### Backend (.env)

สร้างไฟล์ `backend/.env`:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/expense-tracker

# Server Port
PORT=5000

# LINE Channel Configuration (สำหรับ Webhook)
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

สร้างไฟล์ `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_LIFF_ID=your_liff_id
```

### การขอ LINE Credentials

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider และ Channel (LINE Login + Messaging API)
3. สร้าง LIFF App และคัดลอก LIFF ID
4. ตั้งค่า Webhook URL เป็น `https://your-domain.com/webhook`

## 🏃 การรันโปรเจค

### Development Mode

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

เปิด browser ไปที่ `http://localhost:5173`

### Production Build

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | เข้าสู่ระบบ/ลงทะเบียน | ❌ |
| GET | `/api/transactions` | ดึงรายการธุรกรรม | ✅ |
| POST | `/api/transactions` | สร้างธุรกรรมใหม่ | ✅ |
| DELETE | `/api/transactions/:id` | ลบธุรกรรม | ✅ |
| GET | `/api/report/monthly` | รายงานประจำเดือน | ✅ |
| GET | `/api/categories` | ดึงหมวดหมู่ | ✅ |
| GET | `/api/groups` | ดึงกระเป๋าทั้งหมด | ✅ |
| POST | `/api/groups` | สร้างกระเป๋าใหม่ | ✅ |
| POST | `/api/groups/switch` | สลับกระเป๋า | ✅ |
| POST | `/api/groups/join` | เข้าร่วมกระเป๋าครอบครัว | ✅ |
| POST | `/webhook` | LINE Webhook (Smart Input) | ❌ |

### Header Auth

ทุก request ที่ต้องการ Auth ให้ส่ง header:

```
x-line-user-id: <LINE User ID>
```

## 🤖 Smart Input (LINE Webhook)

ผู้ใช้สามารถบันทึกรายจ่ายโดยพิมพ์ข้อความใน LINE Chat ตามรูปแบบ:

```
หมวดหมู่ จำนวนเงิน หมายเหตุ(ถ้ามี)
```

### ตัวอย่าง

| ข้อความ | ผลลัพธ์ |
|---------|---------|
| `อาหาร 150` | บันทึกรายจ่าย อาหาร 150 บาท |
| `เดินทาง 50 ค่าแท็กซี่` | บันทึกรายจ่าย เดินทาง 50 บาท หมายเหตุ: ค่าแท็กซี่ |
| `เงินเดือน 25000` | บันทึกรายรับ เงินเดือน 25,000 บาท |

### Regex Pattern

```javascript
/^(.+?)\s+(\d+(?:\.\d+)?)(?:\s+(.*))?$/
```

## 🌐 การ Deploy

### Backend (Heroku / Railway / Render)

1. ตั้งค่า Environment Variables บน Platform
2. ตั้ง Start Command เป็น `npm start`
3. เชื่อมต่อกับ MongoDB Atlas

### Frontend (Vercel / Netlify)

1. Build Command: `npm run build`
2. Output Directory: `dist`
3. ตั้งค่า Environment Variables

### LINE LIFF Setup

1. ใน LINE Developers Console > LIFF
2. ตั้งค่า Endpoint URL เป็น URL ของ Frontend ที่ deploy แล้ว
3. เปิดใช้งาน Features ที่ต้องการ (Profile, Chat, etc.)

## 📱 Screenshots

<table>
  <tr>
    <td align="center"><b>Dashboard</b></td>
    <td align="center"><b>เพิ่มรายการ</b></td>
    <td align="center"><b>สถิติ</b></td>
  </tr>
  <tr>
    <td>สรุปรายรับ-รายจ่าย และรายการล่าสุด</td>
    <td>เลือกหมวดหมู่และกรอกจำนวนเงิน</td>
    <td>กราฟแสดงการใช้จ่ายตามหมวดหมู่</td>
  </tr>
</table>

## 📄 License

MIT License - สามารถนำไปใช้และดัดแปลงได้อย่างอิสระ

## 🤝 Contributing

1. Fork โปรเจค
2. สร้าง Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add some AmazingFeature'`)
4. Push ไปยัง Branch (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

---

**Made with ❤️ for LINE LIFF**
