/**
 * A股复盘系统 - 主应用逻辑
 */

// 全局状态
const AppState = {
    currentPage: 'dashboard',
    currentPattern: 'trend',
    stocks: [],
    trades: [],
    notes: [],
    dragons: [],
    bloggers: [],
    manualPool: [],
    settings: {
        trendDays: 5,
        reboundDays: 5,
        theme: 'dark'
    }
};

// 模拟股票数据
const MOCK_STOCKS = [
    { code: '000001', name: '平安银行', price: 12.35, change: 2.15, change5: 8.32, turnover: 45, maStatus: '多头排列' },
    { code: '000002', name: '万科A', price: 18.76, change: -1.23, change5: -3.21, turnover: 32, maStatus: '空头排列' },
    { code: '600519', name: '贵州茅台', price: 1688.00, change: 0.85, change5: 5.67, turnover: 12, maStatus: '多头排列' },
    { code: '000858', name: '五粮液', price: 156.32, change: 1.56, change5: 7.89, turnover: 28, maStatus: '多头排列' },
    { code: '002594', name: '比亚迪', price: 245.67, change: 3.21, change5: 12.45, turnover: 78, maStatus: '多头排列' },
    { code: '300750', name: '宁德时代', price: 198.50, change: -0.95, change5: 4.32, turnover: 56, maStatus: '震荡' },
    { code: '600036', name: '招商银行', price: 35.28, change: 0.45, change5: 2.18, turnover: 15, maStatus: '多头排列' },
    { code: '000568', name: '泸州老窖', price: 198.65, change: 2.78, change5: 9.87, turnover: 42, maStatus: '多头排列' },
    { code: '002415', name: '海康威视', price: 32.15, change: -0.65, change5: -1.23, turnover: 25, maStatus: '空头排列' },
    { code: '600900', name: '长江电力', price: 22.38, change: 0.32, change5: 1.85, turnover: 8, maStatus: '多头排列' },
    { code: '300059', name: '东方财富', price: 15.68, change: 4.56, change5: 15.32, turnover: 95, maStatus: '多头排列' },
    { code: '002230', name: '科大讯飞', price: 52.35, change: 5.67, change5: 18.90, turnover: 88, maStatus: '多头排列' },
    { code: '600276', name: '恒瑞医药', price: 45.82, change: -2.15, change5: -5.43, turnover: 35, maStatus: '空头排列' },
    { code: '000063', name: '中兴通讯', price: 28.95, change: 1.23, change5: 6.78, turnover: 48, maStatus: '多头排列' },
    { code: '002475', name: '立讯精密', price: 32.68, change: 0.89, change5: 3.45, turnover: 38, maStatus: '多头排列' }
];

// 模拟板块数据
const MOCK_SECTORS = [
    { name: '人工智能', change: 5.67 },
    { name: '半导体', change: 4.32 },
    { name: '新能源', change: 3.89 },
    { name: '白酒', change: 2.45 },
    { name: '医药', change: -1.23 },
    { name: '银行', change: 0.56 },
    { name: '地产', change: -2.15 },
    { name: '券商', change: 3.21 },
    { name: '军工', change: 1.89 },
    { name: '消费电子', change: 2.78 },
    { name: '光伏', change: -0.95 },
    { name: '锂电池', change: 1.45 }
];

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDateDisplay();
    loadMockData();
    initDashboard();
    initPatterns();
    initCharts();
    initTrades();
    initNotes();
});

// 导航初始化
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pageTitle = document.querySelector('.page-title');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.dataset.page;
            if (!page) return;
            
            // 更新导航状态
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // 切换页面
            switchPage(page);
            
            // 更新标题
            const titles = {
                dashboard: '大盘情绪',
                patterns: '模式选股',
                charts: '行情中心',
                trades: '交易记录',
                notes: '复盘笔记'
            };
            pageTitle.textContent = titles[page] || page;
        });
    });
    
    // 子菜单点击
    const subMenus = document.querySelectorAll('.sub-menu li');
    subMenus.forEach(menu => {
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const pattern = menu.dataset.pattern;
            if (pattern) {
                switchPage('patterns');
                switchPattern(pattern);
                
                // 更新导航
                navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector('[data-page="patterns"]').classList.add('active');
                pageTitle.textContent = '模式选股';
            }
        });
    });
}

// 切换页面
function switchPage(page) {
    AppState.currentPage = page;
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(page);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

// 切换模式
function switchPattern(pattern) {
    AppState.currentPattern = pattern;
    
    // 更新标签
    document.querySelectorAll('.pattern-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.pattern === pattern);
    });
    
    // 更新内容
    document.querySelectorAll('.pattern-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetContent = document.getElementById(pattern);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// 初始化日期显示
function initDateDisplay() {
    const dateDisplay = document.querySelector('.date-display');
    const now = new Date();
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
    dateDisplay.textContent = now.toLocaleDateString('zh-CN', options);
}

// 加载模拟数据
function loadMockData() {
    AppState.stocks = MOCK_STOCKS;
    
    // 从localStorage加载数据
    const savedData = localStorage.getItem('aStockReviewData');
    if (savedData) {
        const data = JSON.parse(savedData);
        AppState.trades = data.trades || [];
        AppState.notes = data.notes || [];
        AppState.dragons = data.dragons || [];
        AppState.bloggers = data.bloggers || [];
        AppState.manualPool = data.manualPool || [];
    }
}

// 保存数据到localStorage
function saveData() {
    const data = {
        trades: AppState.trades,
        notes: AppState.notes,
        dragons: AppState.dragons,
        bloggers: AppState.bloggers,
        manualPool: AppState.manualPool
    };
    localStorage.setItem('aStockReviewData', JSON.stringify(data));
}

// 工具函数：格式化数字
function formatNumber(num, decimals = 2) {
    return num.toFixed(decimals);
}

// 工具函数：格式化百分比
function formatPercent(num) {
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
}

// 导出全局函数
window.AppState = AppState;
window.switchPage = switchPage;
window.switchPattern = switchPattern;
window.saveData = saveData;
window.formatNumber = formatNumber;
window.formatPercent = formatPercent;
