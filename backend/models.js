import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ===========================================
// User Schema - ผู้ใช้งาน
// ===========================================
const userSchema = new Schema({
  lineUserId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  displayName: {
    type: String,
    required: true
  },
  pictureUrl: {
    type: String,
    default: ''
  },
  currentGroupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  // Gamification
  streak: {
    type: Number,
    default: 0
  },
  lastRecordDate: {
    type: String, // YYYY-MM-DD
    default: null
  },
  achievements: [{
    type: String // achievement IDs
  }],
  totalSaved: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// ===========================================
// Group Schema - กลุ่ม (ส่วนตัว/ครอบครัว)
// ===========================================
const groupSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['personal', 'family'],
    required: true
  },
  members: [{
    type: String // LINE User IDs
  }],
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  createdBy: {
    type: String, // LINE User ID
    required: true
  }
}, {
  timestamps: true
});

// Generate invite code before saving
groupSchema.pre('save', function (next) {
  if (this.type === 'family' && !this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// ===========================================
// Category Schema - หมวดหมู่
// ===========================================
const categorySchema = new Schema({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '📦'
  },
  type: {
    type: String,
    enum: ['expense', 'income'],
    required: true
  },
  budgetLimit: {
    type: Number,
    default: 0
  },
  budgetAlertPercent: {
    type: Number,
    default: 80 // แจ้งเตือนเมื่อใช้ถึง 80%
  },
  color: {
    type: String,
    default: '#FFEB00'
  }
}, {
  timestamps: true
});

// ===========================================
// Transaction Schema - รายการธุรกรรม
// ===========================================
const transactionSchema = new Schema({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  userId: {
    type: String, // LINE User ID
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['expense', 'income'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  note: {
    type: String,
    default: ''
  },
  tags: [{
    type: String // แท็ก เช่น #งาน #เที่ยว #กิน
  }],
  monthStr: {
    type: String, // Format: YYYY-MM for easy querying
    required: true,
    index: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringId: {
    type: Schema.Types.ObjectId,
    ref: 'RecurringTransaction',
    default: null
  }
}, {
  timestamps: true
});

// Auto-generate monthStr before saving
transactionSchema.pre('save', function (next) {
  if (this.date) {
    const d = new Date(this.date);
    this.monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  next();
});

// Create compound index for efficient monthly queries
transactionSchema.index({ groupId: 1, monthStr: 1 });
transactionSchema.index({ userId: 1, monthStr: 1 });
transactionSchema.index({ tags: 1 });

// ===========================================
// Savings Goal Schema - เป้าหมายออมเงิน
// ===========================================
const savingsGoalSchema = new Schema({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🎯'
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  deadline: {
    type: Date,
    default: null
  },
  color: {
    type: String,
    default: '#00FF88'
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual: คำนวณ progress percentage
savingsGoalSchema.virtual('progress').get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

savingsGoalSchema.set('toJSON', { virtuals: true });
savingsGoalSchema.set('toObject', { virtuals: true });

// ===========================================
// Recurring Transaction Schema - รายการประจำ
// ===========================================
const recurringTransactionSchema = new Schema({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['expense', 'income'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  dayOfWeek: {
    type: Number, // 0-6 (Sunday-Saturday) สำหรับ weekly
    default: null
  },
  dayOfMonth: {
    type: Number, // 1-31 สำหรับ monthly
    default: 1
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  lastProcessed: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ===========================================
// Daily Journal Schema - บันทึกประจำวัน
// ===========================================
const dailyJournalSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  mood: {
    type: Number, // 1-5
    min: 1,
    max: 5,
    default: 3
  },
  note: {
    type: String,
    default: ''
  },
  todayGoal: {
    type: String,
    default: ''
  },
  reflection: {
    type: String,
    default: ''
  },
  // Auto-calculated from transactions
  totalIncome: {
    type: Number,
    default: 0
  },
  totalExpense: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Unique index: one journal per user per day
dailyJournalSchema.index({ userId: 1, date: 1 }, { unique: true });

// ===========================================
// Export Models
// ===========================================
export const User = model('User', userSchema);
export const Group = model('Group', groupSchema);
export const Category = model('Category', categorySchema);
export const Transaction = model('Transaction', transactionSchema);
export const SavingsGoal = model('SavingsGoal', savingsGoalSchema);
export const RecurringTransaction = model('RecurringTransaction', recurringTransactionSchema);
export const DailyJournal = model('DailyJournal', dailyJournalSchema);

// ===========================================
// Default Categories - หมวดหมู่ละเอียดสำหรับคนไทยยุคปัจจุบัน
// ===========================================
export const defaultCategories = {
  expense: [
    // 1. รายจ่ายคงที่ / จำเป็นพื้นฐาน (Fixed Expenses)
    { name: 'ค่าเช่าหอ/คอนโด', icon: '🏠', color: '#4A90D9' },
    { name: 'ค่าผ่อนบ้าน', icon: '🏡', color: '#5B8C5A' },
    { name: 'ค่าน้ำ', icon: '💧', color: '#00BFFF' },
    { name: 'ค่าไฟ', icon: '💡', color: '#FFB800' },
    { name: 'ค่ามือถือ', icon: '📱', color: '#007AFF' },
    { name: 'ค่าเน็ตบ้าน', icon: '📶', color: '#00C7BE' },
    { name: 'ค่ารถไฟฟ้า', icon: '🚇', color: '#7B68EE' },
    { name: 'ค่าน้ำมัน', icon: '⛽', color: '#FF6347' },
    { name: 'ค่าทางด่วน', icon: '🛣️', color: '#696969' },
    { name: 'ค่าผ่อนรถ', icon: '🚗', color: '#2E8B57' },
    { name: 'ค่าประกันรถ', icon: '🚙', color: '#4682B4' },

    // 2. รายจ่ายค่าอาหารและเครื่องดื่ม (Food & Beverage)
    { name: 'อาหาร', icon: '🍜', color: '#FF6B35' },
    { name: 'กาแฟ/ชานม', icon: '☕', color: '#8B4513' },
    { name: 'บุฟเฟต์/ชาบู', icon: '🍲', color: '#FF4500' },
    { name: 'หมูกระทะ', icon: '🥓', color: '#CD853F' },
    { name: 'ขนม/ของกินเล่น', icon: '🍿', color: '#FFD700' },
    { name: 'เครื่องดื่ม/แอลกอฮอล์', icon: '🍺', color: '#DAA520' },
    { name: 'เดลิเวอรี่', icon: '🛵', color: '#00D4AA' },

    // 3. รายจ่ายเพื่อภาพลักษณ์และสุขภาพ (Self-Care)
    { name: 'สกินแคร์/เครื่องสำอาง', icon: '💄', color: '#FFB6C1' },
    { name: 'ทำเล็บ/ต่อขนตา', icon: '💅', color: '#FF69B4' },
    { name: 'คลินิกความงาม', icon: '✨', color: '#DDA0DD' },
    { name: 'เสื้อผ้า/รองเท้า', icon: '👗', color: '#FF3366' },
    { name: 'กระเป๋า/แอคเซสซอรี่', icon: '👜', color: '#C71585' },
    { name: 'ค่าฟิตเนส/ยิม', icon: '🏋️', color: '#32CD32' },
    { name: 'อาหารเสริม/วิตามิน', icon: '💊', color: '#00CED1' },
    { name: 'ทำผม', icon: '💇', color: '#9370DB' },
    { name: 'ดูดวง/ไพ่ยิปซี', icon: '🔮', color: '#8A2BE2' },

    // 4. รายจ่ายด้านความบันเทิงและไลฟ์สไตล์ (Entertainment)
    { name: 'Subscription', icon: '📺', color: '#E50914' },
    { name: 'เติมเกม/กาชา', icon: '🎮', color: '#00FF88' },
    { name: 'บัตรคอนเสิร์ต', icon: '🎤', color: '#FF1493' },
    { name: 'ดูหนัง', icon: '🎬', color: '#9B5DE5' },
    { name: 'Gadget/อุปกรณ์', icon: '🖥️', color: '#4169E1' },
    { name: 'ผ่อน iPhone', icon: '📱', color: '#A9A9A9' },

    // 5. ภาระหนี้สินและการออม (Debt & Saving)
    { name: 'กยศ.', icon: '🎓', color: '#1E90FF' },
    { name: 'บัตรเครดิต', icon: '💳', color: '#FF8C00' },
    { name: 'ShopeePay Later', icon: '🛒', color: '#EE4D2D' },
    { name: 'เงินออม', icon: '🏦', color: '#228B22' },
    { name: 'ประกันชีวิต', icon: '🛡️', color: '#4682B4' },
    { name: 'ประกันสุขภาพ', icon: '❤️', color: '#DC143C' },

    // 6. ภาษีสังคมและอื่นๆ (Social & Giving)
    { name: 'ให้เงินพ่อแม่', icon: '👨‍👩‍👧', color: '#FF6B6B' },
    { name: 'งานแต่ง/งานบวช', icon: '💒', color: '#FFD700' },
    { name: 'ของขวัญ', icon: '🎁', color: '#FF69B4' },
    { name: 'ทำบุญ/บริจาค', icon: '🙏', color: '#FFA500' },
    { name: 'ค่าแมว/หมา', icon: '🐱', color: '#DEB887' },
    { name: 'Grab/Bolt', icon: '🚕', color: '#00D46A' },
    { name: 'ช้อปออนไลน์', icon: '📦', color: '#FF9500' },
    { name: 'อื่นๆ', icon: '✨', color: '#888888' }
  ],
  income: [
    // 1. รายได้จากงานประจำ (Active Income)
    { name: 'เงินเดือน', icon: '💰', color: '#00FF88' },
    { name: 'ค่าล่วงเวลา (OT)', icon: '⏰', color: '#FFD700' },
    { name: 'โบนัส', icon: '🎁', color: '#FFEB00' },
    { name: 'เบี้ยขยัน', icon: '🏆', color: '#FFA500' },
    { name: 'ค่าคอมมิชชั่น', icon: '📈', color: '#32CD32' },
    { name: 'ค่าเดินทาง (บริษัท)', icon: '🚌', color: '#4169E1' },

    // 2. รายได้จากอาชีพเสริม (Side Hustle)
    { name: 'ฟรีแลนซ์', icon: '💻', color: '#00BFFF' },
    { name: 'ขายของออนไลน์', icon: '🛍️', color: '#FF3366' },
    { name: 'Affiliate', icon: '🔗', color: '#9B5DE5' },
    { name: 'Rider (Grab/Lineman)', icon: '🛵', color: '#00D46A' },
    { name: 'YouTube/TikTok', icon: '📹', color: '#FF0000' },
    { name: 'ขายของมือสอง', icon: '♻️', color: '#228B22' },
    { name: 'รับหิ้ว/พรีออเดอร์', icon: '✈️', color: '#87CEEB' },

    // 3. รายได้จากการลงทุน (Passive Income)
    { name: 'เงินปันผล', icon: '📊', color: '#4682B4' },
    { name: 'กำไรเทรด/Crypto', icon: '₿', color: '#F7931A' },
    { name: 'ดอกเบี้ยเงินฝาก', icon: '🏦', color: '#2E8B57' },
    { name: 'เงินจากครอบครัว', icon: '👨‍👩‍👧', color: '#FF6B6B' },
    { name: 'ลอตเตอรี่/รางวัล', icon: '🎰', color: '#FFD700' },
    { name: 'Cashback', icon: '💵', color: '#00CED1' },
    { name: 'รายได้อื่นๆ', icon: '✨', color: '#888888' }
  ]
};

// ===========================================
// Default Tags - แท็กวัยรุ่น 2569
// ===========================================
export const defaultTags = [
  '#งาน',
  '#เที่ยว',
  '#กิน',
  '#ชิลๆ',
  '#เดท',
  '#สุขภาพ',
  '#การศึกษา',
  '#บันเทิง',
  '#ลงทุน',
  '#ฟุ่มเฟือย',
  '#จำเป็น',
  '#ออนไลน์'
];

// ===========================================
// Achievements - ความสำเร็จ
// ===========================================
export const achievements = [
  { id: 'first_record', name: 'FIRST STEP', icon: '🎯', description: 'บันทึกรายการแรก', condition: 'transactions >= 1' },
  { id: 'week_streak', name: 'WEEK WARRIOR', icon: '🔥', description: 'บันทึกติดต่อกัน 7 วัน', condition: 'streak >= 7' },
  { id: 'month_streak', name: 'MONTHLY BOSS', icon: '👑', description: 'บันทึกติดต่อกัน 30 วัน', condition: 'streak >= 30' },
  { id: 'saver_100', name: 'BABY SAVER', icon: '🐣', description: 'ออมเงินครบ ฿100', condition: 'saved >= 100' },
  { id: 'saver_1000', name: 'MONEY MAKER', icon: '💪', description: 'ออมเงินครบ ฿1,000', condition: 'saved >= 1000' },
  { id: 'saver_10000', name: 'RICH KID', icon: '🤑', description: 'ออมเงินครบ ฿10,000', condition: 'saved >= 10000' },
  { id: 'goal_complete', name: 'GOAL CRUSHER', icon: '🏆', description: 'บรรลุเป้าหมายออมแรก', condition: 'goals_completed >= 1' },
  { id: 'budget_master', name: 'BUDGET MASTER', icon: '📊', description: 'ไม่เกินงบ 1 เดือนเต็ม', condition: 'under_budget_month' },
  { id: 'no_boba', name: 'NO BOBA HERO', icon: '🧋🚫', description: 'ไม่ซื้อชานม 7 วัน', condition: 'no_boba_week' },
  { id: 'journal_lover', name: 'JOURNAL LOVER', icon: '📖', description: 'เขียน Journal 10 วัน', condition: 'journals >= 10' }
];

// ===========================================
// Mood Options
// ===========================================
export const moodOptions = [
  { value: 1, emoji: '😢', label: 'แย่มาก' },
  { value: 2, emoji: '😔', label: 'ไม่ค่อยดี' },
  { value: 3, emoji: '😐', label: 'เฉยๆ' },
  { value: 4, emoji: '😊', label: 'ดี' },
  { value: 5, emoji: '🤩', label: 'ดีมาก!' }
];

