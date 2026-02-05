import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area,
    BarChart, Bar
} from 'recharts';

// Note: liff is imported dynamically in main.jsx only when LIFF_ID is set
// This allows the app to run in development mode without LIFF

// ===========================================
// Configuration
// ===========================================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000
});

// Chart Colors
const CHART_COLORS = ['#C9A962', '#34C759', '#FF3B30', '#007AFF', '#FF9500', '#AF52DE', '#5856D6', '#00C7BE'];

// ===========================================
// Animation Variants (Framer Motion)
// ===========================================
const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
};

const scaleOnTap = {
    whileTap: { scale: 0.95 },
    whileHover: { scale: 1.02 },
    transition: { type: 'spring', stiffness: 400, damping: 17 }
};

const slideUp = {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } }
};

const staggerContainer = {
    animate: { transition: { staggerChildren: 0.05 } }
};

const listItem = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
};

// ===========================================
// Animated Counter Hook (Zero-Dependency)
// ===========================================
const useAnimatedCounter = (endValue, duration = 1000, startOnMount = true) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const frameRef = useRef(null);
    const startTimeRef = useRef(null);
    const prevEndValueRef = useRef(endValue);

    // Easing function - easeOutQuart for smooth deceleration
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = useCallback((timestamp) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;

        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuart(progress);

        const currentCount = Math.round(easedProgress * endValue);

        if (currentCount !== countRef.current) {
            countRef.current = currentCount;
            setCount(currentCount);
        }

        if (progress < 1) {
            frameRef.current = requestAnimationFrame(animate);
        }
    }, [endValue, duration]);

    useEffect(() => {
        // Reset and restart animation when endValue changes
        if (prevEndValueRef.current !== endValue) {
            prevEndValueRef.current = endValue;
            startTimeRef.current = null;
            countRef.current = 0;
            setCount(0);
        }

        if (startOnMount && endValue > 0) {
            frameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [endValue, animate, startOnMount]);

    return count;
};

// AnimatedNumber Component for easy use
const AnimatedNumber = ({ value, duration = 800, prefix = '', suffix = '', className = '' }) => {
    const animatedValue = useAnimatedCounter(value || 0, duration);
    return <span className={className}>{prefix}{animatedValue.toLocaleString()}{suffix}</span>;
};

// ===========================================
// Multi-language Translations
// ===========================================
const TRANSLATIONS = {
    th: {
        // App
        appName: '𝐌𝐎𝐍𝐄𝐘 𝐒𝐄𝐂𝐑𝐄𝐓𝐒',
        loading: 'กำลังโหลด...',

        // Navigation
        navHome: 'หน้าแรก',
        navDaily: 'รายวัน',
        navReport: 'รายงาน',
        navCategory: 'หมวดหมู่',
        navProfile: 'โปรไฟล์',

        // Home
        totalBalance: 'ยอดคงเหลือ',
        totalExpense: 'รายจ่ายรวม',
        income: 'รายรับ',
        expense: 'รายจ่าย',
        balance: 'คงเหลือ',
        recentTransactions: 'รายการล่าสุด',
        noTransactions: 'ยังไม่มีรายการ',
        startAdding: 'เริ่มบันทึกรายการแรกของคุณ',

        // Daily
        todayTotal: 'ยอดรวมวันนี้',
        noTransactionsToday: 'ไม่มีรายการในวันนี้',
        addTransaction: 'เพิ่มรายการ',
        todayTransactions: 'รายการวันนี้',

        // Report
        daily: 'รายวัน',
        monthly: 'รายเดือน',
        yearly: 'รายปี',
        expenseByCategory: 'รายจ่ายตามหมวดหมู่',
        categoryBreakdown: 'รายละเอียดหมวดหมู่',
        noExpenseData: 'ไม่มีข้อมูลรายจ่าย',
        incomeExpenseChart: 'กราฟรายรับ-รายจ่าย',
        expenseBreakdown: 'สัดส่วนรายจ่าย',
        noData: 'ไม่มีข้อมูล',

        // Category
        addCategory: 'เพิ่มหมวดหมู่',
        noCategories: 'ยังไม่มีหมวดหมู่',
        categoryName: 'ชื่อหมวดหมู่',
        save: 'บันทึก',
        cancel: 'ยกเลิก',

        // Profile
        settings: 'ตั้งค่า',
        theme: 'ธีม',
        language: 'ภาษา',
        currency: 'สกุลเงิน',
        dateFormat: 'รูปแบบวันที่',
        numberFormat: 'รูปแบบตัวเลข',
        lineRichMenu: 'เมนู LINE Rich Menu',
        show: 'แสดง',
        hide: 'ซ่อน',
        logout: 'ออกจากระบบ',
        signOutDevice: 'ออกจากระบบอุปกรณ์',
        light: 'สว่าง',
        dark: 'มืด',
        memberSince: 'สมาชิกตั้งแต่',
        currentPlan: 'แผนปัจจุบัน',
        recurringItems: 'รายการประจำ',
        items: 'รายการ',
        perMonth: '/เดือน',
        addRecurring: 'เพิ่มรายการประจำ',

        // Add Transaction
        addNewTransaction: 'เพิ่มรายการใหม่',
        amount: 'จำนวนเงิน',
        category: 'หมวดหมู่',
        note: 'บันทึก',
        optional: 'ไม่บังคับ',
        saving: 'กำลังบันทึก...',

        // Table Headers
        date: 'วันที่',
        description: 'รายละเอียด',
        type: 'ประเภท',

        // Weekdays
        sun: 'อา',
        mon: 'จ',
        tue: 'อ',
        wed: 'พ',
        thu: 'พฤ',
        fri: 'ศ',
        sat: 'ส',

        // Months
        january: 'มกราคม',
        february: 'กุมภาพันธ์',
        march: 'มีนาคม',
        april: 'เมษายน',
        may: 'พฤษภาคม',
        june: 'มิถุนายน',
        july: 'กรกฎาคม',
        august: 'สิงหาคม',
        september: 'กันยายน',
        october: 'ตุลาคม',
        november: 'พฤศจิกายน',
        december: 'ธันวาคม',

        // Alerts
        pleaseEnterAmount: 'กรุณากรอกจำนวนเงินและเลือกหมวดหมู่',
        pleaseEnterCategoryName: 'กรุณาใส่ชื่อหมวดหมู่',
        deleteConfirm: 'ต้องการลบรายการนี้?',
        error: 'เกิดข้อผิดพลาด'
    },
    en: {
        // App
        appName: '𝐌𝐎𝐍𝐄𝐘 𝐒𝐄𝐂𝐑𝐄𝐓𝐒',
        loading: 'Loading...',

        // Navigation
        navHome: 'Home',
        navDaily: 'Daily',
        navReport: 'Report',
        navCategory: 'Category',
        navProfile: 'Profile',

        // Home
        totalBalance: 'Total Balance',
        totalExpense: 'Total Expense',
        income: 'Income',
        expense: 'Expense',
        balance: 'Balance',
        recentTransactions: 'Recent Transactions',
        noTransactions: 'No transactions yet',
        startAdding: 'Start by adding your first transaction',

        // Daily
        todayTotal: "Today's Total",
        noTransactionsToday: 'No transactions for this day',
        addTransaction: 'Add Transaction',
        todayTransactions: "Today's Transactions",

        // Report
        daily: 'Daily',
        monthly: 'Monthly',
        yearly: 'Yearly',
        expenseByCategory: 'Expense by Category',
        categoryBreakdown: 'Category Breakdown',
        noExpenseData: 'No expense data',
        incomeExpenseChart: 'Income-Expense Chart',
        expenseBreakdown: 'Expense Breakdown',
        noData: 'No data',

        // Category
        addCategory: 'Add Category',
        noCategories: 'No categories yet',
        categoryName: 'Category Name',
        save: 'Save',
        cancel: 'Cancel',

        // Profile
        settings: 'Settings',
        theme: 'Theme',
        language: 'Language',
        currency: 'Currency',
        dateFormat: 'Date Format',
        numberFormat: 'Number Format',
        lineRichMenu: 'LINE Rich Menu',
        show: 'Show',
        hide: 'Hide',
        logout: 'Logout',
        signOutDevice: 'Sign out of device',
        light: 'Light',
        dark: 'Dark',
        memberSince: 'Member since',
        currentPlan: 'Current Plan',
        recurringItems: 'Recurring Items',
        items: 'items',
        perMonth: '/month',
        addRecurring: 'Add Recurring',

        // Add Transaction
        addNewTransaction: 'Add New Transaction',
        amount: 'Amount',
        category: 'Category',
        note: 'Note',
        optional: 'optional',
        saving: 'Saving...',

        // Table Headers
        date: 'Date',
        description: 'Description',
        type: 'Type',

        // Weekdays
        sun: 'Sun',
        mon: 'Mon',
        tue: 'Tue',
        wed: 'Wed',
        thu: 'Thu',
        fri: 'Fri',
        sat: 'Sat',

        // Months
        january: 'January',
        february: 'February',
        march: 'March',
        april: 'April',
        may: 'May',
        june: 'June',
        july: 'July',
        august: 'August',
        september: 'September',
        october: 'October',
        november: 'November',
        december: 'December',

        // Alerts
        pleaseEnterAmount: 'Please enter amount and select category',
        pleaseEnterCategoryName: 'Please enter category name',
        deleteConfirm: 'Delete this item?',
        error: 'An error occurred'
    },
    zh: {
        // App
        appName: '𝐌𝐎𝐍𝐄𝐘 𝐒𝐄𝐂𝐑𝐄𝐓𝐒',
        loading: '加载中...',

        // Navigation
        navHome: '首页',
        navDaily: '日常',
        navReport: '报告',
        navCategory: '类别',
        navProfile: '个人',

        // Home
        totalBalance: '总余额',
        totalExpense: '总支出',
        income: '收入',
        expense: '支出',
        balance: '余额',
        recentTransactions: '最近交易',
        noTransactions: '暂无交易',
        startAdding: '添加您的第一笔交易',

        // Daily
        todayTotal: '今日合计',
        noTransactionsToday: '今日无交易',
        addTransaction: '添加交易',
        todayTransactions: '今日交易',

        // Report
        daily: '日报',
        monthly: '月报',
        yearly: '年报',
        expenseByCategory: '按类别支出',
        categoryBreakdown: '类别明细',
        noExpenseData: '无支出数据',
        incomeExpenseChart: '收支图表',
        expenseBreakdown: '支出比例',
        noData: '暂无数据',

        // Category
        addCategory: '添加类别',
        noCategories: '暂无类别',
        categoryName: '类别名称',
        save: '保存',
        cancel: '取消',

        // Profile
        settings: '设置',
        theme: '主题',
        language: '语言',
        currency: '货币',
        dateFormat: '日期格式',
        numberFormat: '数字格式',
        lineRichMenu: 'LINE菜单',
        show: '显示',
        hide: '隐藏',
        logout: '退出登录',
        signOutDevice: '从设备登出',
        light: '浅色',
        dark: '深色',
        memberSince: '注册自',
        currentPlan: '当前方案',
        recurringItems: '定期项目',
        items: '项目',
        perMonth: '/月',
        addRecurring: '添加定期项目',

        // Add Transaction
        addNewTransaction: '新增交易',
        amount: '金额',
        category: '类别',
        note: '备注',
        optional: '可选',
        saving: '保存中...',

        // Table Headers
        date: '日期',
        description: '详情',
        type: '类型',

        // Weekdays
        sun: '日',
        mon: '一',
        tue: '二',
        wed: '三',
        thu: '四',
        fri: '五',
        sat: '六',

        // Months
        january: '一月',
        february: '二月',
        march: '三月',
        april: '四月',
        may: '五月',
        june: '六月',
        july: '七月',
        august: '八月',
        september: '九月',
        october: '十月',
        november: '十一月',
        december: '十二月',

        // Alerts
        pleaseEnterAmount: '请输入金额并选择类别',
        pleaseEnterCategoryName: '请输入类别名称',
        deleteConfirm: '删除此项？',
        error: '发生错误'
    }
};

// Get translation function
const useTranslation = (lang = 'th') => {
    return (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['th'][key] || key;
};

// Helper to get month name from translation
const getMonthName = (monthIndex, t) => {
    const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'];
    return t(monthKeys[monthIndex]) || monthKeys[monthIndex];
};

// Format month and year with translation
const formatMonthYear = (date, t) => {
    return `${getMonthName(date.getMonth(), t)} ${date.getFullYear() + 543}`;
};

// ===========================================
// Utility Functions
// ===========================================
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short'
    });
};

const formatDateFull = (date) => {
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
    });
};

const getMonthString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

// ===========================================
// SKELETON COMPONENTS - Premium Loading States
// ===========================================

// Skeleton for balance/summary card
const SkeletonBalanceCard = () => (
    <div className="skeleton-card skeleton-balance-card">
        <div className="skeleton skeleton-text sm" style={{ width: '40%' }}></div>
        <div className="skeleton skeleton-text xl" style={{ width: '60%', marginTop: '8px' }}></div>
    </div>
);

// Skeleton for stat cards (income/expense)
const SkeletonStatsRow = () => (
    <div className="skeleton-stats-row">
        <div className="skeleton-stat-card">
            <div className="skeleton skeleton-text" style={{ width: '30%', margin: '0 auto 8px auto' }}></div>
            <div className="skeleton skeleton-text lg" style={{ width: '70%', margin: '0 auto' }}></div>
        </div>
        <div className="skeleton-stat-card">
            <div className="skeleton skeleton-text" style={{ width: '30%', margin: '0 auto 8px auto' }}></div>
            <div className="skeleton skeleton-text lg" style={{ width: '70%', margin: '0 auto' }}></div>
        </div>
    </div>
);

// Skeleton for transaction item
const SkeletonTransactionItem = () => (
    <div className="skeleton-tx-item">
        <div className="skeleton skeleton-tx-icon skeleton-circle"></div>
        <div className="skeleton-tx-details">
            <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
            <div className="skeleton skeleton-text sm" style={{ width: '40%' }}></div>
        </div>
        <div className="skeleton skeleton-tx-amount"></div>
    </div>
);

// Skeleton for transaction list
const SkeletonTransactionList = ({ count = 5 }) => (
    <div className="skeleton-tx-list">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonTransactionItem key={i} />
        ))}
    </div>
);

// Skeleton for chart container
const SkeletonChartContainer = () => (
    <div className="skeleton-chart-container">
        <div className="skeleton skeleton-text" style={{ width: '50%', margin: '0 auto 16px auto' }}></div>
        <div className="skeleton skeleton-chart"></div>
    </div>
);

// Skeleton for KPI cards row
const SkeletonKPIRow = () => (
    <div className="skeleton-kpi-row">
        {[1, 2, 3].map(i => (
            <div className="skeleton-kpi-card" key={i}>
                <div className="skeleton skeleton-text sm" style={{ width: '50%', margin: '0 auto 8px auto' }}></div>
                <div className="skeleton skeleton-text lg" style={{ width: '80%', margin: '0 auto' }}></div>
            </div>
        ))}
    </div>
);

// Skeleton for week day strip (Daily view)
const SkeletonWeekStrip = () => (
    <div className="skeleton-week-strip">
        {Array.from({ length: 7 }).map((_, i) => (
            <div className="skeleton skeleton-day-item" key={i}></div>
        ))}
    </div>
);

// ===========================================
// SWIPEABLE TRANSACTION ITEM - Swipe to Delete/Edit
// ===========================================
const SwipeableTransactionItem = ({ children, onDelete, onEdit, tx }) => {
    const [dragX, setDragX] = useState(0);
    const constraintsRef = React.useRef(null);
    const SWIPE_THRESHOLD = 80;

    const handleDragEnd = (event, info) => {
        if (info.offset.x < -SWIPE_THRESHOLD) {
            // Swiped left -> Delete
            if (onDelete) {
                // Vibrate for feedback
                if (navigator.vibrate) navigator.vibrate(50);
                onDelete(tx._id);
            }
        } else if (info.offset.x > SWIPE_THRESHOLD) {
            // Swiped right -> Edit (show info for now)
            if (onEdit) {
                if (navigator.vibrate) navigator.vibrate(30);
                onEdit(tx);
            }
        }
        setDragX(0);
    };

    return (
        <div className="swipeable-container" ref={constraintsRef}>
            {/* Left action (edit) */}
            <div className="swipe-actions swipe-actions-left" style={{
                opacity: Math.min(dragX / SWIPE_THRESHOLD, 1),
                width: Math.max(dragX, 0)
            }}>
                <div className="swipe-action-btn">
                    <img src="/icons/swipe_edit.png" alt="Edit" className="swipe-action-icon-img" />
                    <span>แก้ไข</span>
                </div>
            </div>

            {/* Right action (delete) */}
            <div className="swipe-actions swipe-actions-right" style={{
                opacity: Math.min(-dragX / SWIPE_THRESHOLD, 1),
                width: Math.max(-dragX, 0)
            }}>
                <div className="swipe-action-btn">
                    <img src="/icons/swipe_delete.png" alt="Delete" className="swipe-action-icon-img" />
                    <span>ลบ</span>
                </div>
            </div>

            {/* Main content */}
            <motion.div
                className="swipeable-content"
                drag="x"
                dragConstraints={{ left: -120, right: 120 }}
                dragElastic={0.1}
                onDrag={(e, info) => setDragX(info.offset.x)}
                onDragEnd={handleDragEnd}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
                {children}
            </motion.div>
        </div>
    );
};

// ===========================================
// ONBOARDING SCREEN - Welcome Tutorial
// ===========================================
const ONBOARDING_SLIDES = [
    {
        icon: '💰',
        title: 'ยินดีต้อนรับ',
        description: 'บันทึกรายรับรายจ่ายง่ายๆ แค่ปลายนิ้ว\nจัดการเงินได้ทุกที่ทุกเวลา'
    },
    {
        icon: '📊',
        title: 'บันทึกทุกรายการ',
        description: 'แยกหมวดหมู่ชัดเจน\nรู้ว่าเงินหายไปไหนทุกบาท'
    },
    {
        icon: '📈',
        title: 'ดูสถิติ Insights',
        description: 'กราฟสวยๆ ช่วยวางแผนการเงิน\nเปรียบเทียบรายเดือนได้ง่าย'
    },
    {
        icon: '🚀',
        title: 'เริ่มต้นเลย!',
        description: 'พร้อมควบคุมการเงินของคุณแล้ว\nมาเริ่มบันทึกรายการแรกกัน'
    }
];

const OnboardingScreen = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = () => {
        if (currentSlide < ONBOARDING_SLIDES.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onComplete();
        }
    };

    const slide = ONBOARDING_SLIDES[currentSlide];
    const isLastSlide = currentSlide === ONBOARDING_SLIDES.length - 1;

    return (
        <motion.div
            className="onboarding-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentSlide}
                    className="onboarding-slide"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className="onboarding-icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        {slide.icon}
                    </motion.div>
                    <h2 className="onboarding-title">{slide.title}</h2>
                    <p className="onboarding-description">{slide.description}</p>
                </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="onboarding-dots">
                {ONBOARDING_SLIDES.map((_, i) => (
                    <div
                        key={i}
                        className={`onboarding-dot ${i === currentSlide ? 'active' : ''}`}
                        onClick={() => setCurrentSlide(i)}
                    />
                ))}
            </div>

            {/* Buttons */}
            <div className="onboarding-buttons">
                {!isLastSlide && (
                    <button className="onboarding-btn onboarding-btn-skip" onClick={onComplete}>
                        ข้าม
                    </button>
                )}
                <button
                    className="onboarding-btn onboarding-btn-next"
                    onClick={nextSlide}
                    style={isLastSlide ? { flex: 2 } : {}}
                >
                    {isLastSlide ? '🎉 เริ่มต้นใช้งาน' : 'ถัดไป →'}
                </button>
            </div>
        </motion.div>
    );
};

// ===========================================
// MULTI-CURRENCY SUPPORT
// ===========================================
const CURRENCIES = [
    { code: 'THB', symbol: '฿', flag: '🇹🇭', name: 'Thai Baht', rate: 1 },
    { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar', rate: 0.028 },
    { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro', rate: 0.026 },
    { code: 'JPY', symbol: '¥', flag: '🇯🇵', name: 'Japanese Yen', rate: 4.2 },
    { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound', rate: 0.022 },
    { code: 'KRW', symbol: '₩', flag: '🇰🇷', name: 'Korean Won', rate: 38.5 },
    { code: 'SGD', symbol: 'S$', flag: '🇸🇬', name: 'Singapore Dollar', rate: 0.038 },
    { code: 'AUD', symbol: 'A$', flag: '🇦🇺', name: 'Australian Dollar', rate: 0.044 },
    { code: 'CNY', symbol: '¥', flag: '🇨🇳', name: 'Chinese Yuan', rate: 0.20 }
];

// Format currency based on selected currency
const formatCurrencyWithCode = (amount, currencyCode = 'THB') => {
    const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
    const convertedAmount = amount * currency.rate;

    return new Intl.NumberFormat(currencyCode === 'THB' ? 'th-TH' : 'en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2
    }).format(convertedAmount);
};

// Helper function to get currency symbol from localStorage (for components without prop access)
const getCurrencySymbol = () => {
    const code = localStorage.getItem('selected_currency') || 'THB';
    return CURRENCIES.find(c => c.code === code)?.symbol || '฿';
};

// ===========================================
// LINE CHAT SIMULATOR
// ===========================================
const ChatSimulator = ({ user }) => {
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', content: '👋 สวัสดี! พิมพ์คำสั่งได้เลยครับ เช่น "สรุป" หรือ "กาแฟ 45"' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { id: Date.now(), type: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/simulate-line`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-line-user-id': user?.lineUserId || 'demo_user'
                },
                body: JSON.stringify({ message: input })
            });

            const data = await res.json();

            if (data.success && data.response) {
                const botMsg = {
                    id: Date.now() + 1,
                    type: 'bot',
                    content: renderResponse(data.response)
                };
                setMessages(prev => [...prev, botMsg]);
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    type: 'bot',
                    content: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่'
                }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                content: '🔌 ไม่สามารถเชื่อมต่อ server ได้'
            }]);
        }

        setIsLoading(false);
    };

    const renderResponse = (response) => {
        if (response.type === 'text') return response.data?.text || response.text;
        if (response.type === 'flex' || response.type === 'transaction') {
            const d = response.data;
            return (
                <div className="chat-flex-card">
                    <div className="chat-flex-title">{d.title}</div>
                    {d.income && <div>💰 รายรับ: {getCurrencySymbol()}{d.income}</div>}
                    {d.expense && <div>💸 รายจ่าย: {getCurrencySymbol()}{d.expense}</div>}
                    {d.balance && <div>📊 คงเหลือ: {getCurrencySymbol()}{d.balance}</div>}
                    {d.icon && <div>{d.icon} {d.name}: {getCurrencySymbol()}{d.amount}</div>}
                </div>
            );
        }
        if (response.type === 'help') {
            const d = response.data;
            return (
                <div className="chat-flex-card">
                    <div className="chat-flex-title">{d.title}</div>
                    {d.commands?.map((cat, i) => (
                        <div key={i} style={{ marginTop: '8px' }}>
                            <b>{cat.category}</b>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{cat.items.join(', ')}</div>
                        </div>
                    ))}
                </div>
            );
        }
        if (response.type === 'error' || response.type === 'unknown') {
            const d = response.data;
            return `${d.title}\n${d.message}\n${d.hint || ''}`;
        }
        return JSON.stringify(response.data || response);
    };

    const quickCommands = ['สรุป', 'สรุปวัน', 'ดูหมวด', 'help'];

    return (
        <div className="chat-simulator">
            <div className="chat-header">
                <span>💬 LINE Chat Simulator</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>ทดสอบคำสั่ง LINE</span>
            </div>

            <div className="chat-messages">
                {messages.map(msg => (
                    <motion.div
                        key={msg.id}
                        className={`chat-message ${msg.type}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {typeof msg.content === 'string' ? (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                        ) : msg.content}
                    </motion.div>
                ))}
                {isLoading && (
                    <div className="chat-message bot">
                        <span className="typing-indicator">กำลังพิมพ์...</span>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="chat-quick-commands">
                {quickCommands.map(cmd => (
                    <button key={cmd} onClick={() => setInput(cmd)} className="quick-cmd-btn">
                        {cmd}
                    </button>
                ))}
            </div>

            <div className="chat-input-area">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="พิมพ์คำสั่ง เช่น กาแฟ 45..."
                    className="chat-input"
                />
                <motion.button
                    onClick={sendMessage}
                    className="chat-send-btn"
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoading}
                >
                    ส่ง
                </motion.button>
            </div>
        </div>
    );
};

// ===========================================
// BOTTOM SHEET QUICK ADD
// ===========================================
const BottomSheetQuickAdd = ({ isOpen, onClose, categories, onSubmit }) => {
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [note, setNote] = useState('');
    const [receiptPhoto, setReceiptPhoto] = useState(null);
    const fileInputRef = useRef(null);

    const quickCategories = categories?.filter(c => c.type === 'expense').slice(0, 8) || [];

    // Handle photo capture/selection
    const handlePhotoCapture = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptPhoto(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = () => {
        setReceiptPhoto(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = () => {
        if (!amount || !selectedCategory) return;

        onSubmit({
            type: 'expense',
            amount: parseFloat(amount),
            categoryId: selectedCategory._id,
            note: note,
            date: new Date().toISOString(),
            receiptPhoto: receiptPhoto // Include photo
        });

        // Reset and close
        setAmount('');
        setSelectedCategory(null);
        setNote('');
        setReceiptPhoto(null);
        onClose();
    };

    const handleQuickAmount = (value) => {
        setAmount(prev => prev + value);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="bottom-sheet-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        className="bottom-sheet"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        {/* Handle bar */}
                        <div className="bottom-sheet-handle">
                            <div className="handle-bar" />
                        </div>

                        {/* Header */}
                        <div className="bottom-sheet-header">
                            <h3>⚡ บันทึกด่วน</h3>
                            <button onClick={onClose} className="close-btn">✕</button>
                        </div>

                        {/* Amount Display */}
                        <div className="amount-display">
                            <span className="currency">{getCurrencySymbol()}</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="amount-input-large"
                            />
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="quick-amounts">
                            {[20, 50, 100, 200, 500].map(val => (
                                <button
                                    key={val}
                                    onClick={() => handleQuickAmount(val.toString())}
                                    className="quick-amount-btn"
                                >
                                    +{val}
                                </button>
                            ))}
                        </div>

                        {/* Category Grid */}
                        <div className="category-grid-quick">
                            {quickCategories.map(cat => (
                                <button
                                    key={cat._id}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`category-btn-quick ${selectedCategory?._id === cat._id ? 'selected' : ''}`}
                                >
                                    <span className="cat-icon">{cat.icon}</span>
                                    <span className="cat-name">{cat.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Note Input */}
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="หมายเหตุ (ถ้ามี)..."
                            className="note-input-quick"
                        />

                        {/* Photo Receipt Section */}
                        <div style={{ marginTop: '12px' }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoCapture}
                                style={{ display: 'none' }}
                                id="receipt-photo-input"
                            />

                            {!receiptPhoto ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'linear-gradient(145deg, #f8f9fa, #e9ecef)',
                                        border: '2px dashed #C9A962',
                                        borderRadius: '12px',
                                        color: '#6B7280',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    📸 ถ่ายรูปใบเสร็จ
                                </button>
                            ) : (
                                <div style={{
                                    position: 'relative',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '2px solid #C9A962'
                                }}>
                                    <img
                                        src={receiptPhoto}
                                        alt="Receipt"
                                        style={{
                                            width: '100%',
                                            height: '120px',
                                            objectFit: 'cover'
                                        }}
                                    />
                                    <button
                                        onClick={removePhoto}
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: 'rgba(239, 68, 68, 0.9)',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        ✕
                                    </button>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '0',
                                        left: '0',
                                        right: '0',
                                        padding: '6px',
                                        background: 'rgba(0,0,0,0.6)',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        textAlign: 'center'
                                    }}>
                                        📸 ใบเสร็จแนบแล้ว
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            onClick={handleSubmit}
                            className="submit-btn-quick"
                            disabled={!amount || !selectedCategory}
                            whileTap={{ scale: 0.98 }}
                        >
                            💾 บันทึกรายจ่าย
                        </motion.button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// ===========================================
// Main App Component
// ===========================================
export default function App({ liffProfile, liff, liffError }) {
    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [lineUserId, setLineUserId] = useState(null);
    const [authError, setAuthError] = useState(liffError || null);

    // Navigation - Persist tab in localStorage
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('money-secrets-active-tab');
        return saved || 'home';
    });

    // Save activeTab to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('money-secrets-active-tab', activeTab);
    }, [activeTab]);

    // Data State
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [report, setReport] = useState(null);
    const [isDataLoading, setIsDataLoading] = useState(true);

    // UI State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [isRadialOpen, setIsRadialOpen] = useState(false);

    // Settings State
    const [language, setLanguage] = useState('th'); // th, en, zh
    const t = useTranslation(language);

    // Toast Notification State
    const [toasts, setToasts] = useState([]);

    // Onboarding State (show only on first visit)
    const [showOnboarding, setShowOnboarding] = useState(() => {
        return !localStorage.getItem('onboarding_completed');
    });

    // Multi-Currency State
    const [selectedCurrency, setSelectedCurrency] = useState(() => {
        return localStorage.getItem('selected_currency') || 'THB';
    });

    // Pull-to-Refresh State
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Complete onboarding and save to localStorage
    const completeOnboarding = () => {
        localStorage.setItem('onboarding_completed', 'true');
        setShowOnboarding(false);
    };

    // Update currency and save to localStorage
    const updateCurrency = (currencyCode) => {
        localStorage.setItem('selected_currency', currencyCode);
        setSelectedCurrency(currencyCode);
    };

    // Format currency with selected currency
    const formatAmount = useCallback((amount) => {
        return formatCurrencyWithCode(amount, selectedCurrency);
    }, [selectedCurrency]);

    // Toast Functions
    const showToast = useCallback((type, title, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const showSuccess = useCallback((title, msg) => showToast('success', title, msg), [showToast]);
    const showWarning = useCallback((title, msg) => showToast('warning', title, msg), [showToast]);
    const showError = useCallback((title, msg) => showToast('error', title, msg), [showToast]);

    // ===========================================
    // Initialize Auth from LIFF Profile (passed from main.jsx)
    // ===========================================
    useEffect(() => {
        const initAuth = async () => {
            try {
                // If liffProfile is passed from main.jsx, use it
                if (liffProfile && liffProfile.userId) {
                    console.log('Using LIFF profile from main.jsx:', liffProfile.displayName);
                    setUser(liffProfile);
                    setLineUserId(liffProfile.userId);
                    api.defaults.headers.common['x-line-user-id'] = liffProfile.userId;
                    setIsLoggedIn(true);

                    // Call login API to ensure user exists in database
                    try {
                        await api.post('/auth/login', {
                            lineUserId: liffProfile.userId,
                            displayName: liffProfile.displayName,
                            pictureUrl: liffProfile.pictureUrl
                        });
                        console.log('User synced with backend');
                    } catch (err) {
                        console.error('Failed to sync user with backend:', err);
                    }
                } else if (!LIFF_ID) {
                    // Dev mode - no LIFF ID configured
                    console.log('Dev mode: No LIFF_ID configured');
                    const devUserId = 'dev_user_001';
                    setLineUserId(devUserId);
                    api.defaults.headers.common['x-line-user-id'] = devUserId;
                    setUser({ displayName: 'Dev User', pictureUrl: null, userId: devUserId });
                    setIsLoggedIn(true);
                } else {
                    // LIFF_ID is set but no profile - waiting for main.jsx to pass it
                    console.log('Waiting for LIFF profile from main.jsx...');
                }
            } catch (error) {
                console.error('Auth init error:', error);
                setAuthError(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        initAuth();
    }, [liffProfile]);

    // ===========================================
    // Data Fetching
    // ===========================================
    const fetchData = useCallback(async () => {
        if (!lineUserId) return;
        setIsDataLoading(true);
        try {
            const monthStr = getMonthString(selectedMonth);
            console.log('🔍 Fetching data for month:', monthStr, 'userId:', lineUserId);

            // Use Promise.allSettled to handle each API independently
            // This way if report times out, transactions can still show
            const [txResult, catResult, reportResult] = await Promise.allSettled([
                api.get('/transactions', { params: { month: monthStr } }),
                api.get('/categories'),
                api.get('/report', { params: { month: monthStr } })
            ]);

            console.log('📊 API Results:', {
                transactions: txResult.status,
                categories: catResult.status,
                report: reportResult.status
            });

            // Extract data from successful requests only
            let txData = [];
            let catData = [];
            let reportData = null;

            if (txResult.status === 'fulfilled') {
                const txRes = txResult.value;
                txData = txRes.data?.data?.transactions || txRes.data?.transactions || [];
                console.log('✅ Transactions loaded:', txData.length, 'items');
            } else {
                console.error('❌ Transactions failed:', txResult.reason?.message);
            }

            if (catResult.status === 'fulfilled') {
                const catRes = catResult.value;
                catData = catRes.data?.data?.categories || catRes.data?.categories || catRes.data?.data || [];
                console.log('✅ Categories loaded:', catData.length, 'items');
            } else {
                console.error('❌ Categories failed:', catResult.reason?.message);
            }

            if (reportResult.status === 'fulfilled') {
                const reportRes = reportResult.value;
                reportData = reportRes.data?.data || reportRes.data || null;
                console.log('✅ Report loaded:', reportData?.summary);
            } else {
                console.error('⚠️ Report failed (timeout?):', reportResult.reason?.message);
                // Calculate local summary from transactions if report fails
                if (txData.length > 0) {
                    const income = txData.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
                    const expense = txData.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
                    reportData = { summary: { income, expense, balance: income - expense } };
                    console.log('📊 Calculated local summary:', reportData.summary);
                }
            }

            setTransactions(txData);
            setCategories(catData);
            setReport(reportData);
        } catch (error) {
            console.error('❌ Fetch error:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
        } finally {
            setIsDataLoading(false);
        }
    }, [lineUserId, selectedMonth]);

    useEffect(() => {
        if (isLoggedIn) {
            fetchData();
        }
    }, [isLoggedIn, fetchData]);

    // ===========================================
    // Handlers
    // ===========================================
    const handleAddTransaction = async (data) => {
        try {
            await api.post('/transactions', data);
            setShowAddModal(false);
            fetchData();
            return true;
        } catch (error) {
            console.error('Add transaction error:', error);
            alert('เกิดข้อผิดพลาด');
            return false;
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!confirm('ลบรายการนี้?')) return;
        try {
            await api.delete(`/transactions/${id}`);
            fetchData();
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleAddCategory = async (data) => {
        try {
            await api.post('/categories', data);
            fetchData();
            return true;
        } catch (error) {
            console.error('Add category error:', error);
            return false;
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!confirm('ลบหมวดหมู่นี้?')) return;
        try {
            await api.delete(`/categories/${id}`);
            fetchData();
        } catch (error) {
            console.error('Delete category error:', error);
        }
    };

    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const changeMonth = (months) => {
        const newMonth = new Date(selectedMonth);
        newMonth.setMonth(newMonth.getMonth() + months);
        setSelectedMonth(newMonth);
    };

    const handleLogout = () => {
        if (liff.isLoggedIn()) {
            liff.logout();
        }
        window.location.reload();
    };

    // ===========================================
    // Computed Values
    // ===========================================
    const summary = useMemo(() => {
        return report?.summary || { income: 0, expense: 0, balance: 0 };
    }, [report]);

    const dailyTransactions = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const txArray = Array.isArray(transactions) ? transactions : [];
        return txArray.filter(tx => tx.date?.startsWith(dateStr));
    }, [transactions, selectedDate]);

    // Touch handlers for Pull-to-Refresh (must be before loading check for hook order)
    const touchStartY = useRef(0);

    const handleTouchStart = useCallback((e) => {
        // Only start pull-to-refresh if we're at the very top
        if (window.scrollY === 0) {
            touchStartY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        // Only track pull if we started at top AND still at top
        if (!isPulling || window.scrollY > 0) {
            setIsPulling(false);
            setPullDistance(0);
            return;
        }

        const currentY = e.touches[0].clientY;
        const distance = currentY - touchStartY.current;

        // Only show pull indicator when dragging DOWN (positive distance)
        if (distance > 0) {
            setPullDistance(Math.min(distance, 100));
        } else {
            setPullDistance(0);
        }
    }, [isPulling]);

    const handleTouchEnd = useCallback(async () => {
        if (isPulling && pullDistance > 60) {
            setIsRefreshing(true);
            if (navigator.vibrate) navigator.vibrate(50);
            await fetchData();
            setIsRefreshing(false);
        }
        setIsPulling(false);
        setPullDistance(0);
    }, [isPulling, pullDistance, fetchData]);

    // ===========================================
    // Loading Screen
    // ===========================================
    if (isLoading) {
        return (
            <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '16px', color: '#6E6E73' }}>กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    // ===========================================
    // Main Render
    // ===========================================

    return (
        <>
            {/* Onboarding Screen */}
            <AnimatePresence>
                {showOnboarding && (
                    <OnboardingScreen onComplete={completeOnboarding} />
                )}
            </AnimatePresence>

            {/* Pull-to-Refresh Indicator */}
            <AnimatePresence>
                {(pullDistance > 20 || isRefreshing) && (
                    <motion.div
                        className="pull-indicator"
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                    >
                        {isRefreshing ? (
                            <>
                                <div className="pull-spinner"></div>
                                <span>กำลังโหลด...</span>
                            </>
                        ) : (
                            <>
                                <span className={`pull-arrow ${pullDistance > 60 ? 'ready' : ''}`}>↓</span>
                                <span>{pullDistance > 60 ? 'ปล่อยเพื่อรีเฟรช' : 'ดึงลงเพื่อรีเฟรช'}</span>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                className="app"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header */}
                <header className="header">
                    <div>
                        <h1 className="header-title" style={{ display: 'flex', alignItems: 'center' }}>
                            <img
                                src={user?.pictureUrl || "/icons/bear_coin.jpg"}
                                alt="Logo"
                                className="header-logo"
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    marginRight: '12px',
                                    objectFit: 'cover',
                                    borderRadius: user?.pictureUrl ? '50%' : '50%',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}
                            />
                            𝐌𝐎𝐍𝐄𝐘 𝐒𝐄𝐂𝐑𝐄𝐓𝐒
                        </h1>
                        <p className="header-subtitle">{user?.displayName || 'Guest'}</p>
                    </div>
                </header>

                {/* Main Content */}
                <main className="main">
                    <AnimatePresence mode="wait">
                        {activeTab === 'home' && (
                            <motion.div
                                key="home"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <HomeView
                                    summary={summary}
                                    transactions={transactions}
                                    selectedMonth={selectedMonth}
                                    onMonthChange={changeMonth}
                                    setSelectedMonth={setSelectedMonth}
                                    t={t}
                                    language={language}
                                    isLoading={isDataLoading}
                                    selectedCurrency={selectedCurrency}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'daily' && (
                            <motion.div
                                key="daily"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <DailyView
                                    transactions={dailyTransactions}
                                    selectedDate={selectedDate}
                                    onDateChange={changeDate}
                                    onDelete={handleDeleteTransaction}
                                    onAdd={() => setShowAddModal(true)}
                                    t={t}
                                    language={language}
                                    isLoading={isDataLoading}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'report' && (
                            <motion.div
                                key="report"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ReportView
                                    report={report}
                                    selectedMonth={selectedMonth}
                                    onMonthChange={changeMonth}
                                    t={t}
                                    language={language}
                                    transactions={transactions}
                                    isLoading={isDataLoading}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'category' && (
                            <motion.div
                                key="category"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CategoryView
                                    categories={categories}
                                    onAdd={handleAddCategory}
                                    onDelete={handleDeleteCategory}
                                    t={t}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ProfileView
                                    user={user}
                                    onLogout={handleLogout}
                                    t={t}
                                    language={language}
                                    setLanguage={setLanguage}
                                    selectedCurrency={selectedCurrency}
                                    onCurrencyChange={updateCurrency}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>



                {/* Bottom Navigation */}
                <nav className="bottom-nav">
                    <div className="nav-items">
                        <motion.button
                            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
                            onClick={() => setActiveTab('home')}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <img src="/icons/nav_home.png" alt="Home" className="nav-icon-img" />
                            <span>{t('navHome')}</span>
                        </motion.button>
                        <motion.button
                            className={`nav-item ${activeTab === 'daily' ? 'active' : ''}`}
                            onClick={() => setActiveTab('daily')}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <img src="/icons/nav_daily.png" alt="Daily" className="nav-icon-img" />
                            <span>{t('navDaily')}</span>
                        </motion.button>
                        <motion.button
                            className={`nav-item ${activeTab === 'report' ? 'active' : ''}`}
                            onClick={() => setActiveTab('report')}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <img src="/icons/nav_report.png" alt="Report" className="nav-icon-img" />
                            <span>{t('navReport')}</span>
                        </motion.button>
                        <motion.button
                            className={`nav-item ${activeTab === 'category' ? 'active' : ''}`}
                            onClick={() => setActiveTab('category')}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <img src="/icons/nav_category.png" alt="Category" className="nav-icon-img" />
                            <span>{t('navCategory')}</span>
                        </motion.button>
                        <motion.button
                            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveTab('profile')}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <img src="/icons/nav_profile.png" alt="Profile" className="nav-icon-img" />
                            <span>{t('navProfile')}</span>
                        </motion.button>
                    </div>
                </nav>

                {/* Add Transaction Modal */}
                <AnimatePresence>
                    {showAddModal && (
                        <AddTransactionModal
                            categories={categories}
                            onSubmit={handleAddTransaction}
                            onClose={() => setShowAddModal(false)}
                            t={t}
                        />
                    )}
                </AnimatePresence>

                {/* Toast Notifications */}
                <AnimatePresence>
                    {toasts.length > 0 && (
                        <div className="toast-container">
                            {toasts.map((toast, index) => (
                                <motion.div
                                    key={toast.id}
                                    className={`toast toast-${toast.type}`}
                                    initial={{ opacity: 0, x: 100, scale: 0.8 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 100, scale: 0.8 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25, delay: index * 0.05 }}
                                >
                                    <span className="toast-icon">
                                        {toast.type === 'success' && '✅'}
                                        {toast.type === 'warning' && '⚠️'}
                                        {toast.type === 'error' && '❌'}
                                        {toast.type === 'info' && '💡'}
                                    </span>
                                    <div className="toast-content">
                                        <div className="toast-title">{toast.title}</div>
                                        {toast.message && <div className="toast-message">{toast.message}</div>}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

// ===========================================
// HOME VIEW - Statement Style
// ===========================================
function HomeView({ summary, transactions, selectedMonth, onMonthChange, setSelectedMonth, t, language, isLoading, selectedCurrency }) {
    const [viewType, setViewType] = useState('all'); // all, income, expense
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [pickerYear, setPickerYear] = useState(selectedMonth.getFullYear());

    // Get currency symbol from CURRENCIES array
    const currencySymbol = CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || '฿';

    const getLocale = () => {
        if (language === 'zh') return 'zh-CN';
        if (language === 'en') return 'en-US';
        return 'th-TH';
    };

    const formatMonthYearLocale = (date) => {
        return date.toLocaleDateString(getLocale(), {
            month: 'long',
            year: 'numeric'
        });
    };

    const formatDayDate = (dateString) => {
        const date = new Date(dateString);
        return {
            day: date.getDate().toString().padStart(2, '0'),
            weekday: date.toLocaleDateString(getLocale(), { weekday: 'short' })
        };
    };

    // Filter transactions based on viewType
    const filteredTransactions = useMemo(() => {
        const txArray = Array.isArray(transactions) ? transactions : [];
        if (viewType === 'income') return txArray.filter(tx => tx.type === 'income');
        if (viewType === 'expense') return txArray.filter(tx => tx.type === 'expense');
        return txArray;
    }, [transactions, viewType]);

    // Calculate running balance
    let runningBalance = 0;

    // Show skeleton while loading
    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 160px)' }}>
                <SkeletonBalanceCard />
                <SkeletonStatsRow />
                <div className="section-header" style={{ marginBottom: '12px' }}>
                    <div className="skeleton skeleton-text" style={{ width: '40%', height: '16px' }}></div>
                </div>
                <SkeletonTransactionList count={6} />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 160px)' }}>

            {/* ===== Premium Gold Balance Card ===== */}
            <div className="card card-gold balance-card" style={{ marginBottom: '16px' }}>
                <p className="balance-label">{t('totalBalance')}</p>
                <p className="balance-amount">
                    <span className="balance-currency">{currencySymbol}</span>
                    <AnimatedNumber value={summary.balance} duration={1200} />
                </p>
            </div>

            {/* ===== Income / Expense Stats ===== */}
            <div className="stats-row" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <p className="stat-label">{t('income')}</p>
                    <p className="stat-amount stat-income">+{currencySymbol}<AnimatedNumber value={summary.income} duration={1000} /></p>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💸</div>
                    <p className="stat-label">{t('expense')}</p>
                    <p className="stat-amount stat-expense">-{currencySymbol}<AnimatedNumber value={summary.expense} duration={1000} /></p>
                </div>
            </div>

            {/* ===== Filter Toggle - Income/Expense ===== */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                    onClick={() => setViewType('income')}
                    className={`toggle-tab ${viewType === 'income' ? 'active' : ''}`}
                    style={{
                        flex: 1,
                        background: viewType === 'income' ? '#34C759' : '#E8F5E9',
                        color: viewType === 'income' ? 'white' : '#34C759',
                        border: 'none'
                    }}
                >
                    ↓ {t('income')}
                </button>
                <button
                    onClick={() => setViewType('expense')}
                    className={`toggle-tab ${viewType === 'expense' ? 'active' : ''}`}
                    style={{
                        flex: 1,
                        background: viewType === 'expense' ? '#FF3B30' : '#FFEBEE',
                        color: viewType === 'expense' ? 'white' : '#FF3B30',
                        border: 'none'
                    }}
                >
                    ↑ {t('expense')}
                </button>
            </div>

            {/* Month Selector - Clickable Month Picker */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 12px',
                background: 'linear-gradient(145deg, #f0f0f3, #e6e6e9)',
                borderRadius: '20px',
                marginBottom: '8px',
                boxShadow: '6px 6px 12px rgba(174, 174, 192, 0.3), -6px -6px 12px rgba(255, 255, 255, 0.8)'
            }}>
                <button
                    onClick={() => {
                        setPickerYear(selectedMonth.getFullYear());
                        setShowMonthPicker(true);
                    }}
                    style={{
                        padding: '10px 24px',
                        background: 'linear-gradient(135deg, #C9A962, #B08D55)',
                        borderRadius: '25px',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(201, 169, 98, 0.4)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'transform 0.1s ease'
                    }}
                >
                    📅 {formatMonthYearLocale(selectedMonth)} ▼
                </button>
            </div>

            {/* Month Picker Modal */}
            <AnimatePresence>
                {showMonthPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '20px'
                        }}
                        onClick={() => setShowMonthPicker(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(145deg, #ffffff, #f5f5f5)',
                                borderRadius: '24px',
                                padding: '20px',
                                width: '100%',
                                maxWidth: '340px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                            }}
                        >
                            {/* Year Navigation */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '16px'
                            }}>
                                <button
                                    onClick={() => setPickerYear(y => y - 1)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        background: 'linear-gradient(145deg, #ffffff, #e6e6e9)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        boxShadow: '4px 4px 8px rgba(174, 174, 192, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.9)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >◀</button>
                                <span style={{
                                    fontSize: '1.3rem',
                                    fontWeight: 700,
                                    color: '#333'
                                }}>
                                    {language === 'th' ? pickerYear + 543 : pickerYear}
                                </span>
                                <button
                                    onClick={() => setPickerYear(y => y + 1)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        background: 'linear-gradient(145deg, #ffffff, #e6e6e9)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        boxShadow: '4px 4px 8px rgba(174, 174, 192, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.9)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >▶</button>
                            </div>

                            {/* Month Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '10px'
                            }}>
                                {[
                                    { th: 'ม.ค.', en: 'Jan', zh: '1月' },
                                    { th: 'ก.พ.', en: 'Feb', zh: '2月' },
                                    { th: 'มี.ค.', en: 'Mar', zh: '3月' },
                                    { th: 'เม.ย.', en: 'Apr', zh: '4月' },
                                    { th: 'พ.ค.', en: 'May', zh: '5月' },
                                    { th: 'มิ.ย.', en: 'Jun', zh: '6月' },
                                    { th: 'ก.ค.', en: 'Jul', zh: '7月' },
                                    { th: 'ส.ค.', en: 'Aug', zh: '8月' },
                                    { th: 'ก.ย.', en: 'Sep', zh: '9月' },
                                    { th: 'ต.ค.', en: 'Oct', zh: '10月' },
                                    { th: 'พ.ย.', en: 'Nov', zh: '11月' },
                                    { th: 'ธ.ค.', en: 'Dec', zh: '12月' }
                                ].map((month, index) => {
                                    const isSelected =
                                        selectedMonth.getMonth() === index &&
                                        selectedMonth.getFullYear() === pickerYear;
                                    const isCurrentMonth =
                                        new Date().getMonth() === index &&
                                        new Date().getFullYear() === pickerYear;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                const newDate = new Date(pickerYear, index, 1);
                                                setSelectedMonth(newDate);
                                                setShowMonthPicker(false);
                                            }}
                                            style={{
                                                padding: '14px 8px',
                                                background: isSelected
                                                    ? 'linear-gradient(135deg, #C9A962, #B08D55)'
                                                    : isCurrentMonth
                                                        ? 'linear-gradient(145deg, #fff8e7, #f5f0e0)'
                                                        : 'linear-gradient(145deg, #ffffff, #e6e6e9)',
                                                border: isCurrentMonth && !isSelected
                                                    ? '2px solid #C9A962'
                                                    : 'none',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                                fontWeight: isSelected ? 700 : 500,
                                                color: isSelected ? 'white' : '#333',
                                                boxShadow: isSelected
                                                    ? '0 4px 12px rgba(201, 169, 98, 0.4)'
                                                    : '3px 3px 6px rgba(174, 174, 192, 0.3), -3px -3px 6px rgba(255, 255, 255, 0.8)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {month[language] || month.th}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Quick Actions */}
                            <div style={{
                                display: 'flex',
                                gap: '10px',
                                marginTop: '16px'
                            }}>
                                <button
                                    onClick={() => {
                                        const today = new Date();
                                        setSelectedMonth(today);
                                        setShowMonthPicker(false);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'linear-gradient(145deg, #34C759, #2DB84D)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)'
                                    }}
                                >
                                    📍 {language === 'th' ? 'เดือนนี้' : language === 'zh' ? '本月' : 'This Month'}
                                </button>
                                <button
                                    onClick={() => setShowMonthPicker(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'linear-gradient(145deg, #e6e6e9, #d4d4d7)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#666',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        boxShadow: '3px 3px 6px rgba(174, 174, 192, 0.3), -3px -3px 6px rgba(255, 255, 255, 0.8)'
                                    }}
                                >
                                    ✕ {t('cancel')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== Statement Table ===== */}
            <div className="statement-table">
                {/* Table Header */}
                <div className="statement-header">
                    <span>วันที่</span>
                    <span>รายละเอียด</span>
                    <span>{t('income')}</span>
                    <span>{t('expense')}</span>
                    <span>คงเหลือ</span>
                </div>

                {/* Transaction Rows */}
                {
                    filteredTransactions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📭</div>
                            <p className="empty-title">{t('noTransactions')}</p>
                            <p>{t('startAdding')}</p>
                        </div>
                    ) : (
                        filteredTransactions.map((tx) => {
                            const { day, weekday } = formatDayDate(tx.date);
                            const incomeAmount = tx.type === 'income' ? tx.amount : 0;
                            const expenseAmount = tx.type === 'expense' ? tx.amount : 0;
                            runningBalance += (tx.type === 'income' ? tx.amount : -tx.amount);

                            return (
                                <div key={tx._id} className="statement-row">
                                    <div className="statement-date">
                                        <div className="statement-date-day">{day}</div>
                                        <div className="statement-date-weekday">{weekday}</div>
                                    </div>
                                    <div className="statement-details">
                                        <div className="statement-category">{tx.categoryId?.name || 'Unknown'}</div>
                                        <div className="statement-note">
                                            <span>{tx.categoryId?.icon || '📦'}</span>
                                            {tx.note && <span>{tx.note}</span>}
                                        </div>
                                    </div>
                                    <div className="statement-income">
                                        {incomeAmount > 0 ? formatCurrency(incomeAmount) : ''}
                                    </div>
                                    <div className="statement-expense">
                                        {expenseAmount > 0 ? formatCurrency(expenseAmount) : ''}
                                    </div>
                                    <div className={`statement-balance ${runningBalance >= 0 ? 'positive' : 'negative'}`}>
                                        {runningBalance >= 0 ? '' : '-'}{formatCurrency(Math.abs(runningBalance))}
                                    </div>
                                </div>
                            );
                        })
                    )
                }
            </div >

            {/* ===== Summary Footer ===== */}
            < div className="statement-footer" >
                <div className="statement-footer-item">
                    <div className="statement-footer-label">{t('income')}</div>
                    <div className="statement-footer-value income"><AnimatedNumber value={summary.income} duration={900} /></div>
                </div>
                <div className="statement-footer-item">
                    <div className="statement-footer-label">{t('expense')}</div>
                    <div className="statement-footer-value expense"><AnimatedNumber value={summary.expense} duration={900} /></div>
                </div>
                <div className="statement-footer-item">
                    <div className="statement-footer-label">คงเหลือ</div>
                    <div className={`statement-footer-value ${summary.balance >= 0 ? '' : 'expense'}`}>
                        {summary.balance >= 0 ? '' : '-'}<AnimatedNumber value={Math.abs(summary.balance)} duration={1100} />
                    </div>
                </div>
            </div >
        </div >
    );
}

// ===========================================
// DAILY VIEW - Clean Mobile-First Design
// ===========================================
function DailyView({ transactions, selectedDate, onDateChange, onDelete, onAdd, t, isLoading }) {
    const [showCalendar, setShowCalendar] = useState(false);

    // Calculate daily summary & category breakdown
    const { dailySummary, dailyCategories } = useMemo(() => {
        let income = 0;
        let expense = 0;
        const catMap = {};

        transactions.forEach(tx => {
            if (tx.type === 'income') {
                income += tx.amount;
            } else {
                expense += tx.amount;
                // Group by category
                const catId = tx.categoryId?._id || 'unknown';
                if (!catMap[catId]) {
                    catMap[catId] = {
                        name: tx.categoryId?.name || 'อื่นๆ',
                        icon: tx.categoryId?.icon || '📦',
                        amount: 0,
                        color: tx.categoryId?.color || '#888'
                    };
                }
                catMap[catId].amount += tx.amount;
            }
        });

        const categories = Object.values(catMap).sort((a, b) => b.amount - a.amount);
        return {
            dailySummary: { income, expense, balance: income - expense },
            dailyCategories: categories
        };
    }, [transactions]);

    // Chart Colors for progress bars
    const CHART_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];



    // Week days for horizontal strip
    const getWeekDays = () => {
        const days = [];
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const weekDays = getWeekDays();
    const dayNames = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];
    const today = new Date();

    // Show skeleton while loading
    if (isLoading) {
        return (
            <div style={{ padding: '0 12px', paddingBottom: '100px' }}>
                <div className="skeleton-card" style={{ padding: '16px' }}>
                    <SkeletonWeekStrip />
                </div>
                <div className="skeleton-stats-row" style={{ marginTop: '12px' }}>
                    <div className="skeleton-stat-card">
                        <div className="skeleton skeleton-text" style={{ width: '50%', margin: '0 auto 8px auto' }}></div>
                        <div className="skeleton skeleton-text lg" style={{ width: '70%', margin: '0 auto' }}></div>
                    </div>
                    <div className="skeleton-stat-card">
                        <div className="skeleton skeleton-text" style={{ width: '50%', margin: '0 auto 8px auto' }}></div>
                        <div className="skeleton skeleton-text lg" style={{ width: '70%', margin: '0 auto' }}></div>
                    </div>
                </div>
                <div className="section-header" style={{ marginTop: '16px', marginBottom: '12px' }}>
                    <div className="skeleton skeleton-text" style={{ width: '35%', height: '16px' }}></div>
                </div>
                <SkeletonTransactionList count={5} />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 12px', paddingBottom: '100px' }}>
            {/* Compact Week Strip */}
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '12px 8px',
                marginBottom: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
                {/* Month Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 8px' }}>
                    <button
                        onClick={() => onDateChange(-7)}
                        style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
                    >◀</button>
                    <span
                        onClick={() => setShowCalendar(!showCalendar)}
                        style={{
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            padding: '6px 16px',
                            background: showCalendar ? 'linear-gradient(135deg, #C9A962, #B08D55)' : 'rgba(201,169,98,0.1)',
                            color: showCalendar ? 'white' : '#333',
                            borderRadius: '20px',
                            transition: 'all 0.2s'
                        }}
                    >
                        📅 {formatMonthYear(selectedDate, t)}
                    </span>
                    <button
                        onClick={() => onDateChange(7)}
                        style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
                    >▶</button>
                </div>

                {/* Full Month Calendar Popup */}
                {showCalendar && (
                    <div style={{
                        background: '#FFFBF0',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '12px',
                        border: '1px solid #FFE4A0'
                    }}>
                        {/* Month Year Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <button
                                onClick={() => {
                                    const newDate = new Date(selectedDate);
                                    newDate.setMonth(newDate.getMonth() - 1);
                                    const diff = Math.round((newDate - selectedDate) / (1000 * 60 * 60 * 24));
                                    onDateChange(diff);
                                }}
                                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
                            >◀</button>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                                {selectedDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                                onClick={() => {
                                    const newDate = new Date(selectedDate);
                                    newDate.setMonth(newDate.getMonth() + 1);
                                    const diff = Math.round((newDate - selectedDate) / (1000 * 60 * 60 * 24));
                                    onDateChange(diff);
                                }}
                                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
                            >▶</button>
                        </div>

                        {/* Day Headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (
                                <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>{d}</div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                            {(() => {
                                const year = selectedDate.getFullYear();
                                const month = selectedDate.getMonth();
                                const firstDay = new Date(year, month, 1).getDay();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                const cells = [];

                                for (let i = 0; i < firstDay; i++) {
                                    cells.push(<div key={`e-${i}`} />);
                                }

                                for (let d = 1; d <= daysInMonth; d++) {
                                    const isSelected = selectedDate.getDate() === d;
                                    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
                                    cells.push(
                                        <div
                                            key={d}
                                            onClick={() => {
                                                const diff = d - selectedDate.getDate();
                                                onDateChange(diff);
                                                setShowCalendar(false);
                                            }}
                                            style={{
                                                aspectRatio: '1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                background: isSelected ? 'linear-gradient(135deg, #C9A962, #B08D55)' : isToday ? 'rgba(201,169,98,0.2)' : 'white',
                                                color: isSelected ? 'white' : '#333',
                                                fontWeight: isSelected ? 700 : 400,
                                                fontSize: '0.85rem',
                                                border: isToday && !isSelected ? '2px solid #C9A962' : 'none'
                                            }}
                                        >{d}</div>
                                    );
                                }
                                return cells;
                            })()}
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowCalendar(false)}
                            style={{
                                width: '100%',
                                marginTop: '12px',
                                padding: '10px',
                                background: 'white',
                                border: '1px solid #C9A962',
                                borderRadius: '8px',
                                fontWeight: 600,
                                color: '#C9A962',
                                cursor: 'pointer'
                            }}
                        >ปิด</button>
                    </div>
                )}

                {/* Week Days Strip */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {weekDays.map((day, i) => {
                        const isSelected = day.toDateString() === selectedDate.toDateString();
                        const isToday = day.toDateString() === today.toDateString();
                        return (
                            <div
                                key={i}
                                onClick={() => {
                                    const diff = Math.round((day - selectedDate) / (1000 * 60 * 60 * 24));
                                    onDateChange(diff);
                                }}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: '8px 4px',
                                    borderRadius: '12px',
                                    background: isSelected ? 'linear-gradient(135deg, #C9A962, #B08D55)' : isToday ? 'rgba(201,169,98,0.15)' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ fontSize: '0.65rem', color: isSelected ? 'white' : '#888', marginBottom: '4px' }}>
                                    {dayNames[i]}
                                </div>
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: isSelected ? 700 : 500,
                                    color: isSelected ? 'white' : '#333'
                                }}>
                                    {day.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary Card - Compact */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '12px'
            }}>
                <div style={{ background: '#E8F5E9', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#388E3C' }}>{t('income')}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#2E7D32' }}>+{formatCurrency(dailySummary.income)}</div>
                </div>
                <div style={{ background: '#FFEBEE', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#D32F2F' }}>{t('expense')}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#C62828' }}>-{formatCurrency(dailySummary.expense)}</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #FFF8E1, #FFECB3)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#F57C00' }}>{t('balance')}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#E65100' }}>{formatCurrency(dailySummary.balance)}</div>
                </div>
            </div>

            {/* Daily Category Breakdown */}
            {dailyCategories.length > 0 && dailySummary.expense > 0 && (
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', color: '#555' }}>📊 {t('categoryBreakdown')}</h3>
                    <div className="category-progress">
                        {dailyCategories.map((cat, index) => {
                            const percent = Math.round((cat.amount / dailySummary.expense) * 100);
                            return (
                                <div key={index} className="progress-item" style={{ marginBottom: '8px' }}>
                                    <span className="progress-icon" style={{ fontSize: '1.2rem', width: '30px' }}>{cat.icon}</span>
                                    <div className="progress-details" style={{ flex: 1 }}>
                                        <div className="progress-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                                            <span style={{ fontWeight: 500 }}>{cat.name}</span>
                                            <span style={{ fontWeight: 600 }}>{getCurrencySymbol()}{formatCurrency(cat.amount)}</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div
                                                className="progress-fill"
                                                style={{
                                                    width: `${percent}%`,
                                                    background: CHART_COLORS[index % CHART_COLORS.length],
                                                    height: '100%',
                                                    borderRadius: '3px'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <span className="progress-percent" style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#888', minWidth: '30px', textAlign: 'right' }}>{percent}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}



            {/* Transaction List */}
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: '0.9rem' }}>
                    📋 {t('todayTransactions')} ({transactions.length})
                </div>

                {transactions.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px', opacity: 0.5 }}>📭</div>
                        <div style={{ color: '#888', fontSize: '0.9rem' }}>{t('noTransactions')}</div>
                        <button
                            onClick={onAdd}
                            style={{
                                marginTop: '12px',
                                padding: '10px 24px',
                                background: 'linear-gradient(135deg, #C9A962, #B08D55)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '20px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >+ {t('addTransaction')}</button>
                    </div>
                ) : (
                    <div>
                        {transactions.map((tx) => (
                            <div key={tx._id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 16px',
                                borderBottom: '1px solid #f5f5f5',
                                gap: '12px'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: tx.type === 'income' ? '#E8F5E9' : '#FFEBEE',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem'
                                }}>
                                    {tx.categoryId?.icon || '📦'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{tx.categoryId?.name || 'Unknown'}</div>
                                    {tx.note && <div style={{ fontSize: '0.75rem', color: '#888' }}>{tx.note}</div>}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontWeight: 600,
                                        color: tx.type === 'income' ? '#2E7D32' : '#C62828',
                                        fontSize: '0.95rem'
                                    }}>
                                        {tx.type === 'income' ? '+' : '-'}{getCurrencySymbol()}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDelete(tx._id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ccc',
                                        fontSize: '1.2rem',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                >×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ===========================================
// REPORT VIEW - FINANCIAL DASHBOARD
// ===========================================
function ReportView({ report, selectedMonth, onMonthChange, t, transactions = [], isLoading }) {
    const [period, setPeriod] = useState('monthly');
    const [showRecurring, setShowRecurring] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    const expensesByCategory = report?.expensesByCategory || [];
    const summary = report?.summary || { income: 0, expense: 0, balance: 0 };

    // Recurring Items State
    const [recurringItems, setRecurringItems] = useState([
        { id: 1, name: 'ค่าเน็ต AIS', amount: 599, icon: '📶', dueDate: '15' },
        { id: 2, name: 'Netflix', amount: 419, icon: '🎬', dueDate: '20' },
        { id: 3, name: 'Spotify', amount: 129, icon: '🎵', dueDate: '25' }
    ]);
    const [isAddingRecurring, setIsAddingRecurring] = useState(false);
    const [recurringForm, setRecurringForm] = useState({ name: '', amount: '', dueDate: '', icon: '🔔' });
    const [editingId, setEditingId] = useState(null);

    const totalRecurring = recurringItems.reduce((sum, item) => sum + item.amount, 0);

    // Generate chart data from transactions
    const chartData = useMemo(() => {
        const days = [];
        const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayTx = transactions.filter(tx => tx.date?.startsWith(dateStr));
            const income = dayTx.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
            const expense = dayTx.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
            days.push({ day: i, income, expense });
        }
        return days;
    }, [transactions, selectedMonth]);

    // Trend comparison: Current month vs Previous month
    const trendComparisonData = useMemo(() => {
        const currentMonth = selectedMonth.getMonth();
        const currentYear = selectedMonth.getFullYear();

        // Get previous month
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Filter transactions for current and previous month
        const currentMonthTx = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear && tx.type === 'expense';
        });

        const prevMonthTx = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear && tx.type === 'expense';
        });

        // Calculate totals
        const currentTotal = currentMonthTx.reduce((sum, tx) => sum + tx.amount, 0);
        const prevTotal = prevMonthTx.reduce((sum, tx) => sum + tx.amount, 0);

        // Calculate percentage change
        const percentChange = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal * 100).toFixed(1) : 0;

        return {
            current: currentTotal,
            previous: prevTotal,
            percentChange: parseFloat(percentChange),
            isIncrease: currentTotal > prevTotal
        };
    }, [transactions, selectedMonth]);

    // Sorted transactions for table
    const sortedTransactions = useMemo(() => {
        const txList = [...transactions];
        txList.sort((a, b) => {
            let aVal, bVal;
            if (sortConfig.key === 'date') {
                aVal = new Date(a.date);
                bVal = new Date(b.date);
            } else if (sortConfig.key === 'amount') {
                aVal = a.amount;
                bVal = b.amount;
            } else if (sortConfig.key === 'type') {
                aVal = a.type;
                bVal = b.type;
            } else {
                aVal = a[sortConfig.key];
                bVal = b[sortConfig.key];
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return txList.slice(0, 10); // Show top 10
    }, [transactions, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleSaveRecurring = () => {
        if (!recurringForm.name || !recurringForm.amount) return;
        const newItem = {
            id: editingId || Date.now(),
            name: recurringForm.name,
            amount: parseFloat(recurringForm.amount),
            icon: recurringForm.icon,
            dueDate: recurringForm.dueDate || '1'
        };
        if (editingId) {
            setRecurringItems(items => items.map(item => item.id === editingId ? newItem : item));
        } else {
            setRecurringItems(items => [...items, newItem]);
        }
        setRecurringForm({ name: '', amount: '', dueDate: '', icon: '🔔' });
        setIsAddingRecurring(false);
        setEditingId(null);
    };

    const handleEditRecurring = (item) => {
        setRecurringForm(item);
        setEditingId(item.id);
        setIsAddingRecurring(true);
    };

    const handleDeleteRecurring = (id) => {
        if (confirm('ต้องการลบรายการนี้ใช่ไหม?')) {
            setRecurringItems(items => items.filter(item => item.id !== id));
        }
    };

    // KPI Card Component
    const KPICard = ({ icon, label, value, color, bgColor }) => (
        <div style={{
            background: bgColor,
            borderRadius: '12px',
            padding: '10px 8px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid ${color}22`
        }}>
            <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: '2px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
        </div>
    );

    // Share to LINE function
    const shareToLine = async () => {
        if (!window.liff || !window.liff.isLoggedIn()) {
            alert('กรุณาเข้าใช้งานผ่าน LINE');
            return;
        }

        try {
            const monthName = selectedMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            const balanceColor = summary.balance >= 0 ? '#00C851' : '#FF4444';

            const flexMessage = {
                type: 'flex',
                altText: `📊 สรุปการเงิน ${monthName}`,
                contents: {
                    type: 'bubble',
                    size: 'kilo',
                    hero: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '💰 MONEY SECRETS',
                                weight: 'bold',
                                size: 'lg',
                                color: '#FFFFFF',
                                align: 'center'
                            },
                            {
                                type: 'text',
                                text: monthName,
                                size: 'sm',
                                color: '#FFFFFFBB',
                                align: 'center',
                                margin: 'sm'
                            }
                        ],
                        paddingAll: '20px',
                        backgroundColor: '#1E3A5F'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '💰 รายรับ', flex: 1 },
                                    { type: 'text', text: `${getCurrencySymbol()}${formatCurrency(summary.income)}`, align: 'end', color: '#00C851', weight: 'bold' }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '💸 รายจ่าย', flex: 1 },
                                    { type: 'text', text: `${getCurrencySymbol()}${formatCurrency(summary.expense)}`, align: 'end', color: '#FF4444', weight: 'bold' }
                                ],
                                margin: 'md'
                            },
                            { type: 'separator', margin: 'lg' },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: summary.balance >= 0 ? '✅ คงเหลือ' : '❌ ขาดทุน', flex: 1, weight: 'bold' },
                                    { type: 'text', text: `${getCurrencySymbol()}${formatCurrency(Math.abs(summary.balance))}`, align: 'end', color: balanceColor, weight: 'bold', size: 'lg' }
                                ],
                                margin: 'lg'
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
                                text: '📱 จาก Money Secrets App',
                                size: 'xs',
                                color: '#888888',
                                align: 'center'
                            }
                        ],
                        paddingAll: '10px'
                    }
                }
            };

            if (window.liff.isApiAvailable('shareTargetPicker')) {
                await window.liff.shareTargetPicker([flexMessage]);
            } else {
                alert('Share to LINE ไม่พร้อมใช้งานในโหมดนี้');
            }
        } catch (err) {
            console.error('Share error:', err);
            alert('เกิดข้อผิดพลาดในการแชร์');
        }
    };

    // Show skeleton while loading
    if (isLoading) {
        return (
            <div style={{ paddingBottom: '20px' }}>
                {/* Period Tabs Skeleton */}
                <div className="toggle-tabs" style={{ marginBottom: '16px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton skeleton-text" style={{ flex: 1, height: '32px', margin: '4px' }}></div>
                    ))}
                </div>
                {/* KPI Cards Skeleton */}
                <SkeletonKPIRow />
                {/* Chart Skeleton */}
                <SkeletonChartContainer />
                {/* Category Breakdown Skeleton */}
                <div className="skeleton-card">
                    <div className="skeleton skeleton-text" style={{ width: '50%', margin: '0 auto 16px auto' }}></div>
                    <div className="skeleton skeleton-chart" style={{ height: '150px' }}></div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '20px' }}>
            {/* Period Tabs */}
            <div className="toggle-tabs" style={{ marginBottom: '16px' }}>
                {['daily', 'monthly', 'yearly'].map(p => (
                    <button
                        key={p}
                        className={`toggle-tab ${period === p ? 'active' : ''}`}
                        onClick={() => setPeriod(p)}
                    >
                        {t(p) || p}
                    </button>
                ))}
            </div>

            {/* Month Selector */}
            <div className="daily-header" style={{ borderRadius: '12px', marginBottom: '20px' }}>
                <div className="daily-header-left">
                    <button onClick={() => onMonthChange(-1)} className="daily-nav-btn">◀</button>
                </div>
                <div className="daily-header-center">
                    <span className="daily-title">📊 {formatMonthYear(selectedMonth, t)}</span>
                </div>
                <div className="daily-header-right">
                    <button onClick={() => onMonthChange(1)} className="daily-nav-btn">▶</button>
                </div>
            </div>

            {/* Share to LINE Button */}
            <motion.button
                onClick={shareToLine}
                className="share-line-btn"
                style={{
                    width: '100%',
                    padding: '14px 20px',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #00C300 0%, #00B900 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 15px rgba(0, 195, 0, 0.3)'
                }}
                whileTap={{ scale: 0.98 }}
                whileHover={{ boxShadow: '0 6px 20px rgba(0, 195, 0, 0.4)' }}
            >
                <span style={{ fontSize: '1.3rem' }}>📤</span>
                แชร์สรุปเดือนนี้ไป LINE
            </motion.button>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <KPICard icon="💰" label={t('income')} value={`${getCurrencySymbol()}${formatCurrency(summary.income)}`} color="#22C55E" bgColor="#F0FDF4" />
                <KPICard icon="💸" label={t('expense')} value={`${getCurrencySymbol()}${formatCurrency(summary.expense)}`} color="#EF4444" bgColor="#FEF2F2" />
                <KPICard icon="📊" label={t('balance')} value={`${getCurrencySymbol()}${formatCurrency(summary.balance)}`} color={summary.balance >= 0 ? '#3B82F6' : '#EF4444'} bgColor="#EFF6FF" />
                <KPICard icon="🔔" label={t('recurringItems')} value={`${getCurrencySymbol()}${formatCurrency(totalRecurring)}`} color="#F59E0B" bgColor="#FFFBEB" />
            </div>

            {/* Interactive Line Chart */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 className="section-title mb-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📈 {t('incomeExpenseChart')}
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }}
                            formatter={(value) => [`${getCurrencySymbol()}${formatCurrency(value)}`, '']}
                        />
                        <Area type="monotone" dataKey="income" stroke="#22C55E" fill="url(#colorIncome)" strokeWidth={2} name={t('income')} />
                        <Area type="monotone" dataKey="expense" stroke="#EF4444" fill="url(#colorExpense)" strokeWidth={2} name={t('expense')} />
                    </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '0.8rem' }}>
                    <span><span style={{ color: '#22C55E' }}>●</span> {t('income')}</span>
                    <span><span style={{ color: '#EF4444' }}>●</span> {t('expense')}</span>
                </div>
            </div>

            {/* Sortable Transaction Table */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 className="section-title mb-md">📋 {t('recentTransactions')}</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                                <th
                                    onClick={() => handleSort('date')}
                                    style={{ padding: '10px 8px', textAlign: 'left', cursor: 'pointer', userSelect: 'none', color: '#6B7280' }}
                                >
                                    {t('date')} {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#6B7280' }}>{t('description')}</th>
                                <th
                                    onClick={() => handleSort('amount')}
                                    style={{ padding: '10px 8px', textAlign: 'right', cursor: 'pointer', userSelect: 'none', color: '#6B7280' }}
                                >
                                    {t('amount')} {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                    onClick={() => handleSort('type')}
                                    style={{ padding: '10px 8px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: '#6B7280' }}
                                >
                                    {t('type')} {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTransactions.length > 0 ? sortedTransactions.map((tx, idx) => (
                                <tr key={tx._id || idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={{ padding: '12px 8px', color: '#374151' }}>{tx.date?.split('T')[0]}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{tx.categoryId?.icon || '📦'}</span>
                                            <span style={{ fontWeight: 500 }}>{tx.categoryId?.name || tx.note || 'รายการ'}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: tx.type === 'income' ? '#22C55E' : '#EF4444' }}>
                                        {tx.type === 'income' ? '+' : '-'}{getCurrencySymbol()}{formatCurrency(tx.amount)}
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background: tx.type === 'income' ? '#DCFCE7' : '#FEE2E2',
                                            color: tx.type === 'income' ? '#166534' : '#991B1B'
                                        }}>
                                            {tx.type === 'income' ? t('income') : t('expense')}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF' }}>
                                        {t('noTransactions')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pie Chart - Category Breakdown */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 className="section-title mb-md" style={{ textAlign: 'center' }}>🍩 {t('expenseBreakdown')}</h3>
                {expensesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={expensesByCategory.map((item, index) => ({
                                    name: item.name,
                                    value: item.total,
                                    color: CHART_COLORS[index % CHART_COLORS.length]
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {expensesByCategory.map((_, index) => (
                                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF' }}>{t('noData')}</div>
                )}
            </div>

            {/* Trend Comparison: Current vs Previous Month */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 className="section-title mb-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 เปรียบเทียบรายจ่ายกับเดือนก่อน
                </h3>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    {/* Previous Month */}
                    <div style={{ flex: 1, padding: '12px', background: '#F3F4F6', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '4px' }}>เดือนก่อน</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#374151' }}>
                            {getCurrencySymbol()}{formatCurrency(trendComparisonData.previous)}
                        </div>
                    </div>
                    {/* Current Month */}
                    <div style={{ flex: 1, padding: '12px', background: trendComparisonData.isIncrease ? '#FEF2F2' : '#F0FDF4', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '4px' }}>เดือนนี้</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: trendComparisonData.isIncrease ? '#EF4444' : '#22C55E' }}>
                            {getCurrencySymbol()}{formatCurrency(trendComparisonData.current)}
                        </div>
                    </div>
                </div>

                {/* Bar Chart Comparison */}
                <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={[
                        { name: 'เดือนก่อน', amount: trendComparisonData.previous },
                        { name: 'เดือนนี้', amount: trendComparisonData.current }
                    ]} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                        <Tooltip formatter={(value) => [`${getCurrencySymbol()}${formatCurrency(value)}`, 'รายจ่าย']} />
                        <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                            <Cell fill="#9CA3AF" />
                            <Cell fill={trendComparisonData.isIncrease ? '#EF4444' : '#22C55E'} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Percentage Change Badge */}
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        background: trendComparisonData.isIncrease ? '#FEE2E2' : '#DCFCE7',
                        color: trendComparisonData.isIncrease ? '#DC2626' : '#16A34A'
                    }}>
                        {trendComparisonData.isIncrease ? '📈' : '📉'}
                        {trendComparisonData.isIncrease ? '+' : ''}{trendComparisonData.percentChange}%
                        {trendComparisonData.isIncrease ? ' เพิ่มขึ้น' : ' ลดลง'}
                    </span>
                </div>
            </div>

            {/* Collapsible Recurring Bills */}
            <div className="card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div
                    onClick={() => setShowRecurring(!showRecurring)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🔔</span>
                        <h3 className="section-title" style={{ color: '#B45309', marginBottom: 0 }}>{t('recurringItems')} ({recurringItems.length})</h3>
                    </div>
                    <span style={{ fontSize: '1.2rem', color: '#B45309' }}>{showRecurring ? '▲' : '▼'}</span>
                </div>

                {showRecurring && (
                    <div style={{ marginTop: '16px' }}>
                        <button
                            onClick={() => setIsAddingRecurring(true)}
                            style={{ width: '100%', padding: '10px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '12px', fontWeight: 600 }}
                        >
                            + {t('addRecurring')}
                        </button>

                        {isAddingRecurring && (
                            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #FDE68A' }}>
                                <input
                                    type="text" placeholder={t('categoryName')}
                                    value={recurringForm.name}
                                    onChange={e => setRecurringForm({ ...recurringForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '16px' }}
                                />
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="number" placeholder={t('amount')}
                                        value={recurringForm.amount}
                                        onChange={e => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '16px' }}
                                    />
                                    <input
                                        type="number" placeholder={t('date')}
                                        value={recurringForm.dueDate}
                                        onChange={e => setRecurringForm({ ...recurringForm, dueDate: e.target.value })}
                                        style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '16px' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleSaveRecurring} style={{ flex: 1, background: '#22C55E', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                        {editingId ? `💾 ${t('save')}` : `➕ ${t('addRecurring')}`}
                                    </button>
                                    <button onClick={() => { setIsAddingRecurring(false); setEditingId(null); setRecurringForm({ name: '', amount: '', dueDate: '', icon: '🔔' }); }} style={{ flex: 1, background: '#EF4444', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                        ❌ {t('cancel')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {recurringItems.map(item => (
                            <div key={item.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px',
                                background: 'white',
                                borderRadius: '8px',
                                marginBottom: '8px',
                                border: '1px solid #FDE68A'
                            }}>
                                <span style={{ fontSize: '1.4rem', marginRight: '12px' }}>{item.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{t('date')} {item.dueDate}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 700, color: '#B45309' }}>{getCurrencySymbol()}{formatCurrency(item.amount)}</span>
                                    <button onClick={() => handleEditRecurring(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✏️</button>
                                    <button onClick={() => handleDeleteRecurring(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ===========================================
// CATEGORY VIEW
// ===========================================
// ===========================================
// CATEGORY VIEW
// ===========================================
function CategoryView({ categories, onAdd, onDelete, t }) {
    const [type, setType] = useState('expense');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', icon: '📦' });

    const filteredCategories = categories.filter(c => c.type === type);

    const EMOJI_OPTIONS = ['🍔', '🚗', '🛒', '🎮', '💊', '📚', '✈️', '🏠', '💼', '💰', '🎁', '⚡', '📱', '👕', '💇', '🎬', '☕', '🍜', '⛽', '🐶'];

    const handleSubmit = async () => {
        if (!newCategory.name.trim()) {
            alert(t('pleaseEnterCategoryName'));
            return;
        }
        const success = await onAdd({
            name: newCategory.name,
            icon: newCategory.icon,
            type: type
        });
        if (success) {
            setNewCategory({ name: '', icon: '📦' });
            setShowAddForm(false);
        }
    };

    return (
        <div style={{ paddingBottom: '20px' }}>
            {/* Type Toggle */}
            <div className="toggle-tabs" style={{ marginBottom: '20px' }}>
                <button
                    className={`toggle-tab ${type === 'expense' ? 'active' : ''}`}
                    onClick={() => setType('expense')}
                >
                    {t('expense')}
                </button>
                <button
                    className={`toggle-tab ${type === 'income' ? 'active' : ''}`}
                    onClick={() => setType('income')}
                >
                    {t('income')}
                </button>
            </div>

            {/* Category List */}
            <div className="settings-list mb-md">
                {filteredCategories.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📂</div>
                        <p>{t('noCategories')}</p>
                    </div>
                ) : (
                    filteredCategories.map((cat) => (
                        <div key={cat._id} className="settings-item">
                            <div className="settings-label">
                                <span className="settings-icon">{cat.icon}</span>
                                <span>{cat.name}</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (confirm(t('deleteConfirm'))) {
                                        onDelete(cat._id);
                                    }
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: '8px' }}
                                className="daily-tx-delete"
                            >
                                🗑️
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Category Form */}
            {showAddForm ? (
                <div className="card" style={{ animation: 'slideUp 0.3s ease' }}>
                    <h3 className="section-title mb-md" style={{ textAlign: 'center' }}>{t('addCategory')}</h3>

                    {/* Icon Selector */}
                    <div className="category-grid mb-md">
                        {EMOJI_OPTIONS.map((emoji) => (
                            <button
                                key={emoji}
                                className={`category-item ${newCategory.icon === emoji ? 'active' : ''}`}
                                onClick={() => setNewCategory({ ...newCategory, icon: emoji })}
                            >
                                <span className="category-icon">{emoji}</span>
                            </button>
                        ))}
                    </div>

                    {/* Name Input */}
                    <input
                        type="text"
                        className="input mb-md"
                        placeholder={t('categoryName')}
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    />

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>
                            {t('cancel')}
                        </button>
                        <button className="btn btn-gold" style={{ flex: 1 }} onClick={handleSubmit}>
                            {t('save')}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    className="btn btn-gold btn-block"
                    onClick={() => setShowAddForm(true)}
                    style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(201, 169, 98, 0.3)' }}
                >
                    + {t('addCategory')}
                </button>
            )}
        </div>
    );
}


// ===========================================
// PROFILE VIEW
// ===========================================
function ProfileView({ user, onLogout, t, language, setLanguage, selectedCurrency, onCurrencyChange }) {
    // All Themes Definition
    const THEMES = [
        { id: 'gold', name: 'Luxury Gold', icon: '🏆', colors: ['#C9A962', '#D4B978', '#F7F5F3'] },
        { id: 'sakura', name: 'Soft Sakura', icon: '🌸', colors: ['#FFB7C5', '#E8D5F2', '#FFF5F8'] },
        { id: 'neon', name: 'Midnight Neon', icon: '🌙', colors: ['#9D4EDD', '#00FFFF', '#0D0D1A'] },
        { id: 'matcha', name: 'Matcha Latte', icon: '🥤', colors: ['#7DC383', '#D4A574', '#F5F0E1'] },
        { id: 'y2k', name: 'Y2K Aurora', icon: '🔮', colors: ['#A78BFA', '#4ECDC4', '#FF6B6B'] },
        { id: 'brooklyn', name: 'Brooklyn Street', icon: '🏀', colors: ['#FF3B3B', '#1A1A1A', '#FFFFFF'] },
        { id: 'sunset', name: 'LA Sunset', icon: '🌴', colors: ['#FF6B35', '#FF85A1', '#7B2D8E'] },
        { id: 'tokyo', name: 'Tokyo Night', icon: '⛩️', colors: ['#FF0033', '#FFD700', '#0A0A0A'] },
        { id: 'gamer', name: 'Akihabara Gamer', icon: '🎮', colors: ['#00FF00', '#FF00FF', '#0D0D0D'] },
        { id: 'zen', name: 'Zen Wabi-Sabi', icon: '🍵', colors: ['#8B8B7A', '#D2B48C', '#F5F5F0'] },
        { id: 'kawaii', name: 'Shibuya Kawaii', icon: '🎀', colors: ['#FF69B4', '#FFB6C1', '#FFF0F5'] }
    ];

    // Settings State
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showNumberPicker, setShowNumberPicker] = useState(false);
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [theme, setTheme] = useState('gold');
    // currency state is now passed from App via props (selectedCurrency, onCurrencyChange)
    const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
    const [numberFormat, setNumberFormat] = useState('1,000.00');
    const [lineMenuVisible, setLineMenuVisible] = useState(true);
    const [showRecurring, setShowRecurring] = useState(false);

    // Helper to close all dropdowns
    const closeAllDropdowns = () => {
        setShowLangPicker(false);
        setShowCurrencyPicker(false);
        setShowDatePicker(false);
        setShowNumberPicker(false);
        setShowThemePicker(false);
    };

    // Toggle dropdown (close others first)
    const toggleDropdown = (setter, currentValue) => {
        closeAllDropdowns();
        setter(!currentValue);
    };

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme === 'gold' ? '' : theme);
    }, [theme]);

    const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];

    // Recurring Items State
    const [recurringTransactions, setRecurringTransactions] = useState([
        { id: 1, name: 'ค่าเน็ต AIS', amount: 599, frequency: 'รายเดือน', icon: '📶', nextDate: '15 ม.ค.' },
        { id: 2, name: 'ค่าโทรศัพท์', amount: 399, frequency: 'รายเดือน', icon: '📱', nextDate: '20 ม.ค.' },
        { id: 3, name: 'Netflix', amount: 419, frequency: 'รายเดือน', icon: '🎬', nextDate: '1 ก.พ.' },
        { id: 4, name: 'Spotify', amount: 129, frequency: 'รายเดือน', icon: '🎵', nextDate: '5 ก.พ.' }
    ]);
    const [showRecurringForm, setShowRecurringForm] = useState(false);
    const [editingRecurringId, setEditingRecurringId] = useState(null);
    const [recurringForm, setRecurringForm] = useState({ name: '', amount: '', icon: '📝', nextDate: '' });

    // CRUD Handlers for Recurring Items
    const handleAddRecurring = () => {
        setRecurringForm({ name: '', amount: '', icon: '📝', nextDate: '' });
        setEditingRecurringId(null);
        setShowRecurringForm(true);
    };

    const handleEditRecurring = (item) => {
        setRecurringForm({ name: item.name, amount: item.amount.toString(), icon: item.icon, nextDate: item.nextDate });
        setEditingRecurringId(item.id);
        setShowRecurringForm(true);
    };

    const handleDeleteRecurring = (id) => {
        if (confirm('ลบรายการนี้?')) {
            setRecurringTransactions(prev => prev.filter(item => item.id !== id));
        }
    };

    const handleSaveRecurring = () => {
        if (!recurringForm.name || !recurringForm.amount) return;

        const newItem = {
            id: editingRecurringId || Date.now(),
            name: recurringForm.name,
            amount: parseFloat(recurringForm.amount),
            frequency: 'รายเดือน',
            icon: recurringForm.icon,
            nextDate: recurringForm.nextDate || '1 ก.พ.'
        };

        if (editingRecurringId) {
            setRecurringTransactions(prev => prev.map(item => item.id === editingRecurringId ? newItem : item));
        } else {
            setRecurringTransactions(prev => [...prev, newItem]);
        }

        setShowRecurringForm(false);
        setEditingRecurringId(null);
        setRecurringForm({ name: '', amount: '', icon: '📝', nextDate: '' });
    };

    const LANGUAGES = [
        { code: 'th', name: 'ไทย', flag: '🇹🇭' },
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'zh', name: '中文', flag: '🇨🇳' }
    ];

    const CURRENCIES = [
        { code: 'THB', symbol: '฿', name: 'บาท (THB)' },
        { code: 'USD', symbol: '$', name: 'ดอลลาร์ (USD)' },
        { code: 'EUR', symbol: '€', name: 'ยูโร (EUR)' },
        { code: 'JPY', symbol: '¥', name: 'เยน (JPY)' },
        { code: 'CNY', symbol: '¥', name: 'หยวน (CNY)' }
    ];

    const DATE_FORMATS = [
        { format: 'DD/MM/YYYY (ค.ศ.)', example: '09/01/2026', era: 'ce' },
        { format: 'DD/MM/YYYY (พ.ศ.)', example: '09/01/2569', era: 'be' },
        { format: 'DD MMM YYYY (ค.ศ.)', example: '09 ม.ค. 2026', era: 'ce' },
        { format: 'DD MMM YYYY (พ.ศ.)', example: '09 ม.ค. 2569', era: 'be' }
    ];

    const NUMBER_FORMATS = [
        { format: 'มีเศษสตางค์', example: '1,234.50', hasDecimals: true },
        { format: 'ไม่มีเศษสตางค์', example: '1,235', hasDecimals: false }
    ];

    const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
    const currentCurrency = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

    return (
        <div style={{ paddingBottom: '20px' }}>
            {/* Glassmorphism Credit Card Style Profile */}
            <div style={{
                margin: '0 0 16px 0',
                padding: '0',
                background: 'transparent',
                position: 'relative',
                overflow: 'hidden'
            }}>

                {/* Glassmorphism Card */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                    borderRadius: '12px',
                    border: 'none',
                    padding: '14px',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                    position: 'relative'
                }}>
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '4px' }}>MONEY SECRETS</div>
                            <div style={{
                                fontSize: '1rem',
                                fontWeight: 700,
                                background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                animation: 'goldGlow 2s ease-in-out infinite',
                                textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                            }}>💳 Premium Card</div>
                            <style>{`
                                @keyframes goldGlow {
                                    0%, 100% { 
                                        filter: brightness(1) drop-shadow(0 0 5px rgba(255, 215, 0, 0.5));
                                    }
                                    50% { 
                                        filter: brightness(1.3) drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
                                    }
                                }
                            `}</style>
                        </div>
                        <div style={{
                            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#333'
                        }}>
                            ✨ VIP Member
                        </div>
                    </div>

                    {/* Member Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            border: '3px solid rgba(255,255,255,0.5)'
                        }}>
                            {user?.pictureUrl ? (
                                <img src={user.pictureUrl} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : '👤'}
                        </div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2px' }}>
                                {user?.displayName || 'Guest User'}
                            </div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.8, fontFamily: 'monospace' }}>
                                ID: {user?.userId?.substring(0, 12) || 'U12345...'}
                            </div>
                        </div>
                    </div>

                    {/* Card Bottom Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.7, marginBottom: '4px' }}>{t('memberSince')}</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('january')} 2569</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.65rem', opacity: 0.7, marginBottom: '4px' }}>{t('currentPlan')}</div>
                            <div style={{
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: '#333'
                            }}>🏷️ Free Plan</div>
                        </div>
                    </div>

                    {/* Decorative chip */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        right: '20px',
                        transform: 'translateY(-50%)',
                        width: '45px',
                        height: '32px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                        opacity: 0.9
                    }} />
                </div>
            </div>

            {/* 3. Settings Items (Individual Cards) */}

            {/* Theme Picker */}
            <div className="setting-card-item" onClick={() => toggleDropdown(setShowThemePicker, showThemePicker)} style={{ cursor: 'pointer' }}>
                <div className="setting-icon-box bg-gold-light">
                    <img src="/icons/setting_theme.png" alt="Theme" className="setting-icon-img" />
                </div>
                <div className="setting-content">
                    <div className="setting-title">{t('theme')}</div>
                    <div className="setting-subtitle">{currentTheme.icon} {currentTheme.name}</div>
                </div>
                <div className="setting-arrow">›</div>
            </div>

            {/* Theme Picker Dropdown */}
            {showThemePicker && (
                <div style={{
                    margin: '-8px 0 12px 0',
                    background: 'var(--theme-card, white)',
                    borderRadius: '16px',
                    padding: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '10px'
                    }}>
                        {THEMES.map((themeItem) => (
                            <div
                                key={themeItem.id}
                                onClick={() => { setTheme(themeItem.id); setShowThemePicker(false); }}
                                style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: theme === themeItem.id ? '2px solid var(--theme-primary, #C9A962)' : '2px solid transparent',
                                    background: theme === themeItem.id ? 'var(--theme-bg, #F7F5F3)' : 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Color Preview */}
                                <div style={{
                                    display: 'flex',
                                    gap: '4px',
                                    marginBottom: '8px'
                                }}>
                                    {themeItem.colors.map((color, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: color,
                                                border: color === '#FFFFFF' || color === '#FFF5F8' || color === '#F7F5F3' || color === '#F5F0E1' || color === '#F5F5F0' || color === '#FFF0F5' || color === '#F5F5F5' || color === '#F0EFFF' || color === '#FFF8F5' ? '1px solid #ddd' : 'none',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                    ))}
                                </div>
                                {/* Theme Name */}
                                <div style={{
                                    fontSize: '0.85rem',
                                    fontWeight: theme === themeItem.id ? 700 : 500,
                                    color: theme === themeItem.id ? 'var(--theme-primary, #C9A962)' : 'inherit'
                                }}>
                                    {themeItem.icon} {themeItem.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Language */}
            <div className="setting-card-item" onClick={() => toggleDropdown(setShowLangPicker, showLangPicker)} style={{ cursor: 'pointer' }}>
                <div className="setting-icon-box bg-blue-light">
                    <img src="/icons/setting_language.png" alt="Language" className="setting-icon-img" />
                </div>
                <div className="setting-content">
                    <div className="setting-title">{t('language')}</div>
                    <div className="setting-subtitle">{currentLang.name}</div>
                </div>
                <div className="setting-arrow">›</div>
            </div>

            {/* Language Options Dropdown within the flow */}
            {showLangPicker && (
                <div style={{ margin: '-8px 0 12px 0', padding: '0 8px' }}>
                    {LANGUAGES.map((lang) => (
                        <div
                            key={lang.code}
                            onClick={() => { setLanguage(lang.code); setShowLangPicker(false); }}
                            style={{
                                padding: '12px',
                                background: 'white',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                color: language === lang.code ? '#C9A962' : 'inherit'
                            }}
                        >
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                            {language === lang.code && <span>✓</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Currency */}
            <div className="setting-card-item" onClick={() => toggleDropdown(setShowCurrencyPicker, showCurrencyPicker)} style={{ cursor: 'pointer' }}>
                <div className="setting-icon-box bg-orange-light">
                    <img src="/icons/setting_currency.png" alt="Currency" className="setting-icon-img" />
                </div>
                <div className="setting-content">
                    <div className="setting-title">{t('currency')}</div>
                    <div className="setting-subtitle">{currentCurrency.name}</div>
                </div>
                <div className="setting-arrow">›</div>
            </div>

            {/* Currency Picker Dropdown */}
            {showCurrencyPicker && (
                <div style={{ margin: '-8px 0 12px 0', padding: '0 8px' }}>
                    {CURRENCIES.map((curr) => (
                        <div
                            key={curr.code}
                            onClick={() => { onCurrencyChange(curr.code); setShowCurrencyPicker(false); }}
                            style={{
                                padding: '12px 16px',
                                background: 'white',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                color: selectedCurrency === curr.code ? '#C9A962' : 'inherit',
                                fontWeight: selectedCurrency === curr.code ? 600 : 400
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>{curr.symbol}</span>
                            <span>{curr.name}</span>
                            {selectedCurrency === curr.code && <span style={{ marginLeft: 'auto' }}>✓</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Date Format */}
            <div className="setting-card-item" onClick={() => toggleDropdown(setShowDatePicker, showDatePicker)} style={{ cursor: 'pointer' }}>
                <div className="setting-icon-box bg-purple-light">
                    <img src="/icons/setting_date.png" alt="Date" className="setting-icon-img" />
                </div>
                <div className="setting-content">
                    <div className="setting-title">{t('dateFormat')}</div>
                    <div className="setting-subtitle">{dateFormat}</div>
                </div>
                <div className="setting-arrow">›</div>
            </div>

            {/* Date Format Picker Dropdown */}
            {showDatePicker && (
                <div style={{ margin: '-8px 0 12px 0', padding: '0 8px' }}>
                    {DATE_FORMATS.map((df) => (
                        <div
                            key={df.format}
                            onClick={() => { setDateFormat(df.format); setShowDatePicker(false); }}
                            style={{
                                padding: '12px 16px',
                                background: 'white',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                color: dateFormat === df.format ? '#C9A962' : 'inherit',
                                fontWeight: dateFormat === df.format ? 600 : 400
                            }}
                        >
                            <span>{df.format}</span>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>{df.example}</span>
                            {dateFormat === df.format && <span>✓</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Number Format */}
            <div className="setting-card-item" onClick={() => toggleDropdown(setShowNumberPicker, showNumberPicker)} style={{ cursor: 'pointer' }}>
                <div className="setting-icon-box bg-green-light">
                    <img src="/icons/setting_number.png" alt="Number" className="setting-icon-img" />
                </div>
                <div className="setting-content">
                    <div className="setting-title">{t('numberFormat')}</div>
                    <div className="setting-subtitle">{numberFormat}</div>
                </div>
                <div className="setting-arrow">›</div>
            </div>

            {/* Number Format Picker Dropdown */}
            {showNumberPicker && (
                <div style={{ margin: '-8px 0 12px 0', padding: '0 8px' }}>
                    {NUMBER_FORMATS.map((nf) => (
                        <div
                            key={nf.format}
                            onClick={() => { setNumberFormat(nf.format); setShowNumberPicker(false); }}
                            style={{
                                padding: '12px 16px',
                                background: 'white',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                color: numberFormat === nf.format ? '#C9A962' : 'inherit',
                                fontWeight: numberFormat === nf.format ? 600 : 400
                            }}
                        >
                            <div>
                                <div>{nf.format}</div>
                                <div style={{ color: '#888', fontSize: '0.85rem' }}>Example: {nf.example}</div>
                            </div>
                            {numberFormat === nf.format && <span>✓</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* LINE Rich Menu */}
            <div className="setting-card-item" onClick={() => setLineMenuVisible(!lineMenuVisible)} style={{ cursor: 'pointer' }}>
                <div className="setting-icon-box bg-purple-light">
                    <img src="/icons/setting_chat.png" alt="Rich Menu" className="setting-icon-img" />
                </div>
                <div className="setting-content">
                    <div className="setting-title">{t('lineRichMenu')}</div>
                    <div className="setting-subtitle">{lineMenuVisible ? t('show') : t('hide')}</div>
                </div>
                <div style={{
                    width: '50px',
                    height: '26px',
                    background: lineMenuVisible ? '#C9A962' : '#E0E0E0',
                    borderRadius: '13px',
                    position: 'relative',
                    transition: 'all 0.3s ease'
                }}>
                    <div style={{
                        width: '22px',
                        height: '22px',
                        background: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: lineMenuVisible ? '26px' : '2px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                </div>
            </div>

            {/* Recurring Transactions Section */}
            <div className="setting-card-item" onClick={() => setShowRecurring(!showRecurring)} style={{ cursor: 'pointer' }}>
                <div className="setting-icon-box bg-blue-light">
                    <span style={{ fontSize: '1.2rem' }}>🔄</span>
                </div>
                <div className="setting-content">
                    <div className="setting-title">{t('recurringItems')}</div>
                    <div className="setting-subtitle">{recurringTransactions.length} {t('items')} • {getCurrencySymbol()}{recurringTransactions.reduce((a, b) => a + b.amount, 0).toLocaleString()}{t('perMonth')}</div>
                </div>
                <div className="setting-arrow" style={{ transform: showRecurring ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</div>
            </div>

            {/* Recurring List */}
            {showRecurring && (
                <div style={{ margin: '-8px 0 12px 0', background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
                    {recurringTransactions.map((item) => (
                        <div key={item.id} style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{item.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>{item.frequency} • ถัดไป: {item.nextDate}</div>
                            </div>
                            <div style={{ fontWeight: 600, color: '#FF6B00' }}>{getCurrencySymbol()}{item.amount.toLocaleString()}</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEditRecurring(item); }}
                                    style={{ background: '#E8F4FD', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
                                >✏️</button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRecurring(item.id); }}
                                    style={{ background: '#FFEBEB', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
                                >🗑️</button>
                            </div>
                        </div>
                    ))}

                    {/* Add/Edit Form */}
                    {showRecurringForm ? (
                        <div style={{ padding: '16px', background: '#f8f8f8', borderTop: '1px solid #eee' }}>
                            <div style={{ marginBottom: '12px', fontWeight: 600 }}>{editingRecurringId ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</div>

                            {/* Icon Picker */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                {['📶', '📱', '🎬', '🎵', '💡', '🏠', '🚗', '💳', '🏥', '📚'].map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => setRecurringForm({ ...recurringForm, icon: emoji })}
                                        style={{
                                            padding: '8px',
                                            border: recurringForm.icon === emoji ? '2px solid #C9A962' : '1px solid #ddd',
                                            borderRadius: '8px',
                                            background: recurringForm.icon === emoji ? '#FFF8E7' : 'white',
                                            cursor: 'pointer',
                                            fontSize: '1.2rem'
                                        }}
                                    >{emoji}</button>
                                ))}
                            </div>

                            {/* Inputs */}
                            <input
                                type="text"
                                placeholder="ชื่อรายการ"
                                value={recurringForm.name}
                                onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })}
                                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '8px', fontSize: '16px' }}
                            />
                            <input
                                type="number"
                                placeholder="จำนวนเงิน"
                                value={recurringForm.amount}
                                onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '8px', fontSize: '16px' }}
                            />
                            <input
                                type="text"
                                placeholder="วันที่ถัดไป (เช่น 15 ม.ค.)"
                                value={recurringForm.nextDate}
                                onChange={(e) => setRecurringForm({ ...recurringForm, nextDate: e.target.value })}
                                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '12px', fontSize: '16px' }}
                            />

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => { setShowRecurringForm(false); setEditingRecurringId(null); }}
                                    style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                >ยกเลิก</button>
                                <button
                                    onClick={handleSaveRecurring}
                                    style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #C9A962 0%, #B08D55 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                >บันทึก</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleAddRecurring}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'linear-gradient(135deg, #C9A962 0%, #B08D55 100%)',
                                color: 'white',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}>+ เพิ่มรายการประจำ</button>
                    )}
                </div>
            )}

            {/* Logout Button */}
            <div
                className="setting-card-item"
                onClick={onLogout}
                style={{ marginTop: '20px', background: '#FFF0F0', border: '1px solid #FFCDCD' }}
            >
                <div className="setting-icon-box bg-red-light" style={{ background: 'white', color: '#FF3B30' }}>
                    <img src="/icons/setting_logout.png" alt="Logout" className="setting-icon-img" />
                </div>
                <div className="setting-content">
                    <div className="setting-title" style={{ color: '#FF3B30' }}>{t('logout')}</div>
                    <div className="setting-subtitle" style={{ color: '#FF8888' }}>Sign out of device</div>
                </div>
                <div className="setting-arrow" style={{ color: '#FF3B30' }}>›</div>
            </div>
        </div>
    );
}


// ===========================================
// ADD TRANSACTION MODAL
// ===========================================
function AddTransactionModal({ categories, onSubmit, onClose }) {
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New features
    const [account, setAccount] = useState('cash');
    const [tags, setTags] = useState('');

    const ACCOUNTS = [
        { id: 'cash', name: 'เงินสด', icon: '💵' },
        { id: 'debit', name: 'บัตรเดบิต', icon: '💳' },
        { id: 'credit', name: 'บัตรเครดิต', icon: '💳' },
        { id: 'savings', name: 'บัญชีออมทรัพย์', icon: '🏦' }
    ];

    // Split Bill State
    const [isSplit, setIsSplit] = useState(false);
    const [participants, setParticipants] = useState('');
    const [splitCount, setSplitCount] = useState(2);

    const filteredCategories = categories.filter(c => c.type === type);

    const handleSubmit = async () => {
        if (!amount || !categoryId) {
            alert('กรุณากรอกจำนวนเงินและเลือกหมวดหมู่');
            return;
        }

        setIsSubmitting(true);
        const success = await onSubmit({
            type,
            amount: parseFloat(amount),
            categoryId,
            note,
            account,
            tags: tags.split(',').map(t => t.trim()).filter(t => t),
            date: new Date().toISOString()
        });
        setIsSubmitting(false);

        if (success) {
            onClose();
        }
    };

    return (
        <motion.div
            className="modal-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="modal-header">
                    <h2 className="modal-title">Add Transaction</h2>
                    <motion.button
                        className="modal-close"
                        onClick={onClose}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.1 }}
                    >✕</motion.button>
                </div>

                {/* Type Toggle */}
                <div className="toggle-tabs mb-md">
                    <button
                        className={`toggle-tab ${type === 'expense' ? 'active' : ''}`}
                        onClick={() => { setType('expense'); setCategoryId(''); }}
                    >
                        💸 Expense
                    </button>
                    <button
                        className={`toggle-tab ${type === 'income' ? 'active' : ''}`}
                        onClick={() => { setType('income'); setCategoryId(''); }}
                    >
                        💰 Income
                    </button>
                </div>

                {/* Amount */}
                <div className="card text-center mb-md">
                    <p className="stat-label">Amount ({getCurrencySymbol()})</p>
                    <input
                        type="number"
                        className="input-amount"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                        style={{ width: '100%' }}
                    />
                </div>

                {/* Category Grid */}
                <p className="stat-label mb-md">Category</p>
                <div className="category-grid mb-md">
                    {filteredCategories.map((cat) => (
                        <button
                            key={cat._id}
                            className={`category-item ${categoryId === cat._id ? 'active' : ''}`}
                            onClick={() => setCategoryId(cat._id)}
                        >
                            <span className="category-icon">{cat.icon}</span>
                            <span className="category-name">{cat.name}</span>
                        </button>
                    ))}
                </div>

                {/* Note */}
                <input
                    type="text"
                    className="input mb-md"
                    placeholder="Note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />

                {/* Account Selector */}
                <p className="stat-label mb-sm">💳 บัญชี</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    {ACCOUNTS.map((acc) => (
                        <button
                            key={acc.id}
                            onClick={() => setAccount(acc.id)}
                            style={{
                                padding: '8px 4px',
                                borderRadius: '8px',
                                border: account === acc.id ? '2px solid #C9A962' : '1px solid #E0E0E0',
                                background: account === acc.id ? 'rgba(201, 169, 98, 0.1)' : 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.7rem'
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>{acc.icon}</span>
                            <span style={{ fontWeight: account === acc.id ? 600 : 400 }}>{acc.name}</span>
                        </button>
                    ))}
                </div>

                {/* Tags */}
                <p className="stat-label mb-sm">🏷️ Tags</p>
                <input
                    type="text"
                    className="input mb-md"
                    placeholder="#ทริปญี่ปุ่น, #งานแต่ง"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    style={{ fontSize: '0.9rem' }}
                />

                {/* Split Bill Toggle */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: isSplit ? 'rgba(201, 169, 98, 0.1)' : '#f5f5f5',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    border: isSplit ? '2px solid #C9A962' : '1px solid #E0E0E0'
                }} onClick={() => setIsSplit(!isSplit)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.3rem' }}>🧾</span>
                        <div>
                            <div style={{ fontWeight: 500 }}>แชร์ค่าใช้จ่าย</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>หารเท่ากับเพื่อน</div>
                        </div>
                    </div>
                    <div style={{
                        width: '44px',
                        height: '24px',
                        background: isSplit ? '#C9A962' : '#ccc',
                        borderRadius: '12px',
                        position: 'relative'
                    }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isSplit ? '22px' : '2px',
                            transition: 'left 0.2s'
                        }} />
                    </div>
                </div>

                {/* Split Details */}
                {isSplit && (
                    <div style={{
                        background: '#FFFBF0',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        border: '1px solid #FFE4A0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontWeight: 500 }}>จำนวนคน</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        border: '1px solid #C9A962', background: 'white',
                                        fontSize: '1.2rem', cursor: 'pointer'
                                    }}
                                    onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                                >−</button>
                                <span style={{ fontSize: '1.2rem', fontWeight: 600, minWidth: '30px', textAlign: 'center' }}>{splitCount}</span>
                                <button
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        border: '1px solid #C9A962', background: 'white',
                                        fontSize: '1.2rem', cursor: 'pointer'
                                    }}
                                    onClick={() => setSplitCount(splitCount + 1)}
                                >+</button>
                            </div>
                        </div>
                        <input
                            type="text"
                            className="input"
                            placeholder="ชื่อผู้ร่วมจ่าย (เช่น: เอ, บี, ซี)"
                            value={participants}
                            onChange={(e) => setParticipants(e.target.value)}
                            style={{ marginBottom: '12px' }}
                        />
                        <div style={{
                            background: 'white',
                            padding: '12px',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.8rem', color: '#888' }}>ส่วนที่คุณต้องจ่าย</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#C9A962' }}>
                                {getCurrencySymbol()}{amount ? (parseFloat(amount) / splitCount).toFixed(2) : '0.00'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>จาก {getCurrencySymbol()}{amount || '0'} ÷ {splitCount} คน</div>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <motion.button
                    className="btn btn-gold btn-block"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !amount || !categoryId}
                    style={{ opacity: (isSubmitting || !amount || !categoryId) ? 0.5 : 1 }}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                    {isSubmitting ? 'Saving...' : '💾 Save'}
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
