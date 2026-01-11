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
// Default Categories - หมวดหมู่เริ่มต้น Gen Z ไทย 2569
// ===========================================
export const defaultCategories = {
  expense: [
    // อาหาร & เครื่องดื่ม
    { name: 'อาหาร', icon: '🍜', color: '#FF6B35' },
    { name: 'ชานม/กาแฟ', icon: '🧋', color: '#8B4513' },
    { name: 'เดลิเวอรี่', icon: '🛵', color: '#00D4AA' },

    // ไลฟ์สไตล์
    { name: 'ช้อปปิ้ง', icon: '🛍️', color: '#FF3366' },
    { name: 'ของออนไลน์', icon: '📦', color: '#FF9500' },
    { name: 'Skincare', icon: '💄', color: '#FFB6C1' },

    // บันเทิง
    { name: 'บันเทิง', icon: '🎬', color: '#9B5DE5' },
    { name: 'เกม', icon: '🎮', color: '#00FF88' },
    { name: 'สตรีมมิ่ง', icon: '📺', color: '#E50914' },
    { name: 'คอนเสิร์ต', icon: '🎤', color: '#FF1493' },

    // การเดินทาง
    { name: 'เดินทาง', icon: '🚗', color: '#00BFFF' },
    { name: 'Grab/Bolt', icon: '🚕', color: '#00D46A' },

    // ค่าใช้จ่ายประจำ
    { name: 'ค่าเน็ต/โทร', icon: '📱', color: '#007AFF' },
    { name: 'ค่าบ้าน', icon: '🏠', color: '#FFEB00' },
    { name: 'ค่าน้ำ-ไฟ', icon: '💡', color: '#FFB800' },

    // อื่นๆ
    { name: 'สุขภาพ', icon: '💊', color: '#00CED1' },
    { name: 'การศึกษา', icon: '📚', color: '#4169E1' },
    { name: 'สัตว์เลี้ยง', icon: '🐱', color: '#DEB887' },
    { name: 'Merch/Idol', icon: '👕', color: '#FF69B4' },
    { name: 'อื่นๆ', icon: '✨', color: '#888888' }
  ],
  income: [
    { name: 'เงินเดือน', icon: '💰', color: '#00FF88' },
    { name: 'โบนัส', icon: '🎁', color: '#FFEB00' },
    { name: 'Freelance', icon: '💻', color: '#00BFFF' },
    { name: 'ขายของ', icon: '🏪', color: '#FF3366' },
    { name: 'ลงทุน/Crypto', icon: '₿', color: '#F7931A' },
    { name: 'รายได้เสริม', icon: '💵', color: '#9B5DE5' },
    { name: 'เงินพ่อแม่', icon: '👨‍👩‍👧', color: '#FF6B6B' },
    { name: 'อื่นๆ', icon: '✨', color: '#888888' }
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

