/**
 * 模式选股模块
 */

function initPatterns() {
    initPatternTabs();
    initTrendPattern();
    initReboundPattern();
    initDragonPattern();
    initMomentumPattern();
    initBloggerPattern();
}

// 初始化模式标签
function initPatternTabs() {
    const tabs = document.querySelectorAll('.pattern-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const pattern = tab.dataset.pattern;
            switchPattern(pattern);
        });
    });
}

// ========== 趋势为王 ==========
function initTrendPattern() {
    const runBtn = document.getElementById('runTrend');
    if (runBtn) {
        runBtn.addEventListener('click', runTrendScan);
    }
}

function runTrendScan() {
    // 模拟选股逻辑
    const results = MOCK_STOCKS.filter(stock => {
        // 均线多头排列（模拟）
        const isBullish = stock.maStatus === '多头排列';
        // 5日换手 < 100%
        const lowTurnover = stock.turnover < 100;
        // 非银行股
        const notBank = !stock.name.includes('银行');
        return isBullish && lowTurnover && notBank;
    }).map(stock => ({
        ...stock,
        score: calculateTrendScore(stock)
    })).sort((a, b) => b.score - a.score);
    
    renderTrendResults(results);
}

function calculateTrendScore(stock) {
    let score = 0;
    if (stock.change5 > 5) score += 30;
    else if (stock.change5 > 0) score += 15;
    
    if (stock.turnover < 30) score += 20;
    else if (stock.turnover < 60) score += 10;
    
    if (stock.change > 0) score += 10;
    
    return Math.min(score, 100);
}

function renderTrendResults(results) {
    const tbody = document.getElementById('trendResults');
    if (!tbody) return;
    
    tbody.innerHTML = results.map(stock => `
        <tr>
            <td>${stock.code}</td>
            <td>${stock.name}</td>
            <td>${formatNumber(stock.price)}</td>
            <td class="${stock.change >= 0 ? 'up' : 'down'}">${formatPercent(stock.change)}</td>
            <td class="${stock.change5 >= 0 ? 'up' : 'down'}">${formatPercent(stock.change5)}</td>
            <td>${stock.turnover}%</td>
            <td><span class="status-badge status-ready">${stock.maStatus}</span></td>
            <td>
                <button class="btn btn-small btn-outline" onclick="addToWatchlist('${stock.code}')">+自选</button>
            </td>
        </tr>
    `).join('');
}

// ========== 断板反包 ==========
function initReboundPattern() {
    const runBtn = document.getElementById('runRebound');
    const addBtn = document.getElementById('addToPool');
    
    if (runBtn) runBtn.addEventListener('click', runReboundScan);
    if (addBtn) addBtn.addEventListener('click', addToManualPool);
    
    renderManualPool();
}

// 模拟首板股票数据
const MOCK_REBOUND_STOCKS = [
    { 
        code: '002230', 
        name: '科大讯飞', 
        firstBoardDate: '2024-01-15',
        firstBoardStrength: '秒板',
        day2High: true,
        day2Shadow: true,
        day3Shadow: false,
        day5InRange: true,
        score: 85
    },
    { 
        code: '300059', 
        name: '东方财富', 
        firstBoardDate: '2024-01-14',
        firstBoardStrength: '普通涨停',
        day2High: true,
        day2Shadow: true,
        day3Shadow: true,
        day5InRange: true,
        score: 92
    },
    { 
        code: '002594', 
        name: '比亚迪', 
        firstBoardDate: '2024-01-10',
        firstBoardStrength: '一字板',
        day2High: false,
        day2Shadow: false,
        day3Shadow: false,
        day5InRange: false,
        score: 0
    },
    { 
        code: '000858', 
        name: '五粮液', 
        firstBoardDate: '2024-01-12',
        firstBoardStrength: '秒板',
        day2High: true,
        day2Shadow: false,
        day3Shadow: true,
        day5InRange: true,
        score: 78
    }
];

function runReboundScan() {
    // 筛选符合条件的股票：第5天必须在区间内
    const results = MOCK_REBOUND_STOCKS.filter(stock => stock.day5InRange)
        .map(stock => ({
            ...stock,
            bonuses: calculateReboundBonuses(stock)
        }))
        .sort((a, b) => b.score - a.score);
    
    renderReboundResults(results);
}

function calculateReboundBonuses(stock) {
    const bonuses = [];
    if (stock.day2High) bonuses.push('第二天早盘冲高');
    if (stock.day2Shadow) bonuses.push('第二天下影线');
    if (stock.day3Shadow) bonuses.push('第三天下影线');
    if (stock.firstBoardStrength === '首板') bonuses.push('首板');
    if (stock.firstBoardStrength === '一字板') bonuses.push('一字板强度');
    else if (stock.firstBoardStrength === '秒板') bonuses.push('秒板强度');
    return bonuses;
}

function renderReboundResults(results) {
    const tbody = document.getElementById('reboundResults');
    if (!tbody) return;
    
    tbody.innerHTML = results.map(stock => `
        <tr>
            <td>${stock.code}</td>
            <td>${stock.name}</td>
            <td>${stock.firstBoardDate}</td>
            <td>${stock.firstBoardStrength}</td>
            <td>区间内</td>
            <td>
                <div class="bonus-tags">
                    ${stock.bonuses.map(b => `<span class="bonus-tag">${b}</span>`).join('')}
                </div>
            </td>
            <td><span class="score-badge score-high">${stock.score}</span></td>
            <td>
                <button class="btn btn-small btn-outline" onclick="addToWatchlist('${stock.code}')">+自选</button>
                <button class="btn btn-small btn-outline" onclick="addToManualPoolFromResult('${stock.code}')">+拓展池</button>
            </td>
        </tr>
    `).join('');
}

function addToManualPool() {
    const codeInput = document.getElementById('manualStockCode');
    const code = codeInput.value.trim();
    
    if (!code) {
        alert('请输入股票代码');
        return;
    }
    
    const stock = MOCK_STOCKS.find(s => s.code === code) || {
        code: code,
        name: '未知股票',
        firstBoardDate: '-'
    };
    
    const poolItem = {
        code: stock.code,
        name: stock.name,
        addDate: new Date().toISOString().split('T')[0],
        firstBoardDate: stock.firstBoardDate || '-',
        status: '观察中',
        note: ''
    };
    
    AppState.manualPool.push(poolItem);
    saveData();
    renderManualPool();
    codeInput.value = '';
}

function addToManualPoolFromResult(code) {
    const stock = MOCK_REBOUND_STOCKS.find(s => s.code === code);
    if (!stock) return;
    
    const poolItem = {
        code: stock.code,
        name: stock.name,
        addDate: new Date().toISOString().split('T')[0],
        firstBoardDate: stock.firstBoardDate,
        status: '观察中',
        note: '第4/5天在范围内但不符合最终条件'
    };
    
    AppState.manualPool.push(poolItem);
    saveData();
    renderManualPool();
}

function renderManualPool() {
    const tbody = document.getElementById('manualPool');
    if (!tbody) return;
    
    tbody.innerHTML = AppState.manualPool.map((item, index) => `
        <tr>
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td>${item.addDate}</td>
            <td>${item.firstBoardDate}</td>
            <td><span class="status-badge status-watching">${item.status}</span></td>
            <td>${item.note}</td>
            <td>
                <button class="btn btn-small btn-outline" onclick="removeFromPool(${index})">删除</button>
            </td>
        </tr>
    `).join('');
}

function removeFromPool(index) {
    AppState.manualPool.splice(index, 1);
    saveData();
    renderManualPool();
}

// ========== 龙回头 ==========
function initDragonPattern() {
    const addBtn = document.getElementById('addDragon');
    if (addBtn) addBtn.addEventListener('click', addDragon);
    
    renderDragonPool();
}

function addDragon() {
    const codeInput = document.getElementById('dragonCode');
    const nameInput = document.getElementById('dragonName');
    const themeInput = document.getElementById('dragonTheme');
    
    const code = codeInput.value.trim();
    const name = nameInput.value.trim();
    const theme = themeInput.value.trim();
    
    if (!code || !name) {
        alert('请输入股票代码和名称');
        return;
    }
    
    const dragon = {
        code,
        name,
        theme: theme || '未分类',
        addDate: new Date().toISOString().split('T')[0],
        firstWaveGain: (Math.random() * 50 + 20).toFixed(2),
        fallbackRate: (Math.random() * 20 + 5).toFixed(2),
        status: '观察回落'
    };
    
    AppState.dragons.push(dragon);
    saveData();
    renderDragonPool();
    
    codeInput.value = '';
    nameInput.value = '';
    themeInput.value = '';
}

function renderDragonPool() {
    const tbody = document.getElementById('dragonPool');
    if (!tbody) return;
    
    tbody.innerHTML = AppState.dragons.map((dragon, index) => `
        <tr>
            <td>${dragon.code}</td>
            <td>${dragon.name}</td>
            <td>${dragon.theme}</td>
            <td>${dragon.addDate}</td>
            <td class="up">+${dragon.firstWaveGain}%</td>
            <td class="down">-${dragon.fallbackRate}%</td>
            <td><span class="status-badge status-falling">${dragon.status}</span></td>
            <td>
                <button class="btn btn-small btn-outline" onclick="updateDragonStatus(${index}, 'ready')">可介入</button>
                <button class="btn btn-small btn-outline" onclick="removeDragon(${index})">删除</button>
            </td>
        </tr>
    `).join('');
}

function updateDragonStatus(index, status) {
    const statusMap = {
        ready: '可介入',
        done: '已完成',
        watching: '观察中'
    };
    AppState.dragons[index].status = statusMap[status] || status;
    saveData();
    renderDragonPool();
}

function removeDragon(index) {
    AppState.dragons.splice(index, 1);
    saveData();
    renderDragonPool();
}

// ========== 主升踏浪 ==========
function initMomentumPattern() {
    const refreshBtn = document.getElementById('refreshRank');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshMomentumRank);
    
    refreshMomentumRank();
}

function refreshMomentumRank() {
    const period = document.getElementById('rankPeriod')?.value || '5';
    
    // 模拟强度计算
    const results = MOCK_STOCKS.map(stock => ({
        ...stock,
        strength: calculateStrength(stock, period),
        change10: stock.change5 * (1 + Math.random()),
        change20: stock.change5 * (1 + Math.random() * 2)
    })).sort((a, b) => b.strength - a.strength).slice(0, 20);
    
    renderMomentumResults(results);
}

function calculateStrength(stock, period) {
    const baseStrength = stock.change5 * 5;
    const turnoverBonus = stock.turnover < 50 ? 10 : 0;
    const trendBonus = stock.maStatus === '多头排列' ? 15 : 0;
    return Math.min(baseStrength + turnoverBonus + trendBonus, 100);
}

function renderMomentumResults(results) {
    const tbody = document.getElementById('momentumResults');
    if (!tbody) return;
    
    tbody.innerHTML = results.map((stock, index) => `
        <tr>
            <td><span class="score-badge ${index < 3 ? 'score-high' : 'score-medium'}">${index + 1}</span></td>
            <td>${stock.code}</td>
            <td>${stock.name}</td>
            <td><span class="score-badge score-high">${stock.strength.toFixed(1)}</span></td>
            <td class="${stock.change5 >= 0 ? 'up' : 'down'}">${formatPercent(stock.change5)}</td>
            <td class="${stock.change10 >= 0 ? 'up' : 'down'}">${formatPercent(stock.change10)}</td>
            <td class="${stock.change20 >= 0 ? 'up' : 'down'}">${formatPercent(stock.change20)}</td>
            <td>
                <button class="btn btn-small btn-outline" onclick="addToWatchlist('${stock.code}')">+自选</button>
            </td>
        </tr>
    `).join('');
}

// ========== 博主跟踪 ==========
function initBloggerPattern() {
    const addBloggerBtn = document.getElementById('addBlogger');
    const addStockBtn = document.getElementById('addBloggerStock');
    
    if (addBloggerBtn) addBloggerBtn.addEventListener('click', addBlogger);
    if (addStockBtn) addStockBtn.addEventListener('click', addBloggerStock);
    
    renderBloggers();
    renderBloggerStocks();
}

function addBlogger() {
    const nameInput = document.getElementById('bloggerName');
    const platformInput = document.getElementById('bloggerPlatform');
    
    const name = nameInput.value.trim();
    const platform = platformInput.value.trim();
    
    if (!name) {
        alert('请输入博主名称');
        return;
    }
    
    const blogger = {
        name,
        platform: platform || '未知平台',
        addDate: new Date().toISOString().split('T')[0]
    };
    
    AppState.bloggers.push(blogger);
    saveData();
    renderBloggers();
    updateBloggerSelect();
    
    nameInput.value = '';
    platformInput.value = '';
}

function renderBloggers() {
    const container = document.getElementById('bloggerList');
    if (!container) return;
    
    container.innerHTML = AppState.bloggers.map((blogger, index) => `
        <div class="blogger-card">
            <div class="blogger-info">
                <span class="blogger-name">${blogger.name}</span>
                <span class="blogger-platform">${blogger.platform}</span>
            </div>
            <div class="blogger-actions">
                <button class="btn btn-small btn-outline" onclick="removeBlogger(${index})">删除</button>
            </div>
        </div>
    `).join('');
}

function updateBloggerSelect() {
    const select = document.getElementById('selectBlogger');
    if (!select) return;
    
    select.innerHTML = '<option value="">选择博主</option>' +
        AppState.bloggers.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
}

function removeBlogger(index) {
    AppState.bloggers.splice(index, 1);
    saveData();
    renderBloggers();
    updateBloggerSelect();
}

function addBloggerStock() {
    const bloggerSelect = document.getElementById('selectBlogger');
    const codeInput = document.getElementById('bloggerStockCode');
    const reasonInput = document.getElementById('recommendReason');
    
    const blogger = bloggerSelect.value;
    const code = codeInput.value.trim();
    const reason = reasonInput.value.trim();
    
    if (!blogger || !code) {
        alert('请选择博主并输入股票代码');
        return;
    }
    
    const stock = MOCK_STOCKS.find(s => s.code === code) || { code, name: '未知' };
    
    const bloggerStock = {
        blogger,
        code: stock.code,
        name: stock.name,
        recommendDate: new Date().toISOString().split('T')[0],
        reason: reason || '无',
        currentChange: (Math.random() * 20 - 5).toFixed(2),
        launched: Math.random() > 0.7
    };
    
    // 存储到AppState
    if (!AppState.bloggerStocks) AppState.bloggerStocks = [];
    AppState.bloggerStocks.push(bloggerStock);
    saveData();
    renderBloggerStocks();
    
    codeInput.value = '';
    reasonInput.value = '';
}

function renderBloggerStocks() {
    const tbody = document.getElementById('bloggerStocks');
    if (!tbody) return;
    
    const stocks = AppState.bloggerStocks || [];
    
    tbody.innerHTML = stocks.map((stock, index) => `
        <tr>
            <td>${stock.blogger}</td>
            <td>${stock.code}</td>
            <td>${stock.name}</td>
            <td>${stock.recommendDate}</td>
            <td>${stock.reason}</td>
            <td class="${parseFloat(stock.currentChange) >= 0 ? 'up' : 'down'}">${stock.currentChange}%</td>
            <td>
                <span class="launch-status ${stock.launched ? 'launched' : 'not-started'}">
                    ${stock.launched ? '已启动' : '未启动'}
                </span>
            </td>
            <td>
                <button class="btn btn-small btn-outline" onclick="removeBloggerStock(${index})">删除</button>
            </td>
        </tr>
    `).join('');
}

function removeBloggerStock(index) {
    AppState.bloggerStocks.splice(index, 1);
    saveData();
    renderBloggerStocks();
}

// 全局函数
window.addToWatchlist = function(code) {
    alert(`已将 ${code} 添加到自选`);
};

window.addToManualPoolFromResult = addToManualPoolFromResult;
window.removeFromPool = removeFromPool;
window.updateDragonStatus = updateDragonStatus;
window.removeDragon = removeDragon;
window.removeBlogger = removeBlogger;
window.removeBloggerStock = removeBloggerStock;
