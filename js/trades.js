/**
 * 交易记录模块 - 支持真实CSV导入
 */

function initTrades() {
    initFileUpload();
    renderTradeStats();
    renderTradeRecords();
}

function initFileUpload() {
    const fileInput = document.getElementById('tradeFile');
    const fileName = document.getElementById('fileName');
    const importBtn = document.getElementById('importTrade');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileName.textContent = file.name;
            }
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const file = fileInput?.files[0];
            if (!file) {
                showTradeToast('请先选择CSV文件', 'warning');
                return;
            }
            parseCSVFile(file);
        });
    }
}

// 解析CSV文件
function parseCSVFile(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const trades = parseCSV(text, file.name);
            if (trades.length === 0) {
                showTradeToast('文件中没有有效的交易记录', 'warning');
                return;
            }
            AppState.trades = trades;
            saveData();
            renderTradeStats();
            renderTradeRecords();
            showTradeToast('成功导入 ' + trades.length + ' 条交易记录');
        } catch (err) {
            console.error('CSV解析错误:', err);
            showTradeToast('文件解析失败，请检查格式', 'error');
        }
    };

    reader.onerror = function() {
        showTradeToast('文件读取失败', 'error');
    };

    // 尝试多种编码读取
    reader.readAsText(file, 'UTF-8');
}

// CSV解析核心函数
function parseCSV(text, filename) {
    // 移除BOM
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
        return [];
    }

    // 解析CSV行（支持引号包裹的字段）
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        result.push(current.trim());
        return result;
    }

    // 读取表头
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^\s+|\s+$/g, ''));

    // 自动映射列名（不区分大小写，支持中英文）
    const colMap = {};
    for (let i = 0; i < headers.length; i++) {
        const h = headers[i].toLowerCase();
        if (/日期|date/.test(h)) colMap.date = i;
        else if (/代码|code|股票代码/.test(h)) colMap.code = i;
        else if (/名称|name|股票名称/.test(h)) colMap.name = i;
        else if (/方向|买卖|操作|direction|type/.test(h)) colMap.direction = i;
        else if (/价格|price|成交价/.test(h)) colMap.price = i;
        else if (/数量|quantity|股数|成交量/.test(h)) colMap.quantity = i;
        else if (/盈亏|pnl|盈亏金额/.test(h)) colMap.pnl = i;
        else if (/盈亏比|收益率|盈亏比例|pnl_ratio/.test(h)) colMap.pnlRatio = i;
        else if (/手续费|佣金|fee/.test(h)) colMap.fee = i;
        else if (/备注|note/.test(h)) colMap.note = i;
    }

    // 如果映射不足，尝试按位置匹配（常见顺序：日期,代码,名称,方向,价格,数量,盈亏,盈亏比）
    if (colMap.date === undefined && headers.length >= 1) colMap.date = 0;
    if (colMap.code === undefined && headers.length >= 2) colMap.code = 1;
    if (colMap.name === undefined && headers.length >= 3) colMap.name = 2;
    if (colMap.direction === undefined && headers.length >= 4) colMap.direction = 3;
    if (colMap.price === undefined && headers.length >= 5) colMap.price = 4;
    if (colMap.quantity === undefined && headers.length >= 6) colMap.quantity = 5;

    const trades = [];

    for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        if (fields.length === 0) continue;

        // 跳过空行和明显不正确的行
        if (fields.every(f => !f)) continue;

        const getField = (colIdx) => {
            if (colIdx === undefined || colIdx >= fields.length) return '';
            return fields[colIdx];
        };

        let direction = getField(colMap.direction);
        // 标准化买卖方向
        const dirLower = direction.toLowerCase();
        if (dirLower.includes('买') || dirLower === 'buy' || dirLower === 'b') direction = '买入';
        else if (dirLower.includes('卖') || dirLower === 'sell' || dirLower === 's') direction = '卖出';
        else if (dirLower.includes('申购') || dirLower.includes('中签')) direction = '申购';

        const priceStr = getField(colMap.price);
        const qtyStr = getField(colMap.quantity);
        const pnlStr = getField(colMap.pnl);
        const pnlRatioStr = getField(colMap.pnlRatio);

        const price = parseFloat(priceStr.replace(/[^\d.-]/g, '')) || 0;
        const quantity = parseInt(qtyStr.replace(/[^\d-]/g, '')) || 0;
        const pnl = parseFloat(pnlStr.replace(/[^\d.-]/g, '')) || 0;
        const pnlRatio = parseFloat(pnlRatioStr.replace(/[^\d.%]/g, '')) || 0;

        // 如果交易有价格和数量就认为有效
        if (price > 0 && quantity > 0) {
            trades.push({
                date: getField(colMap.date) || '未知',
                code: getField(colMap.code) || '--',
                name: getField(colMap.name) || '--',
                direction: direction || '买入',
                price: parseFloat(price.toFixed(2)),
                quantity: quantity,
                pnl: parseFloat(pnl.toFixed(2)),
                pnlRatio: parseFloat(pnlRatio.toFixed(2)),
                fee: parseFloat((getField(colMap.fee) || '0').replace(/[^\d.-]/g, '')) || 0,
                note: getField(colMap.note) || ''
            });
        }
    }

    // 按日期排序
    trades.sort((a, b) => new Date(b.date) - new Date(a.date));

    return trades;
}

// 可选的模拟数据生成（没有真实数据时可以先用这个）
function generateMockTrades() {
    const directions = ['买入', '卖出'];
    const trades = [];

    for (let i = 0; i < 20; i++) {
        const stock = MOCK_STOCKS[Math.floor(Math.random() * MOCK_STOCKS.length)];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const price = stock.price * (0.95 + Math.random() * 0.1);
        const quantity = Math.floor(Math.random() * 1000) + 100;
        const pnl = direction === '卖出' ? (Math.random() - 0.3) * price * quantity * 0.1 : 0;

        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));

        trades.push({
            date: date.toISOString().split('T')[0],
            code: stock.code,
            name: stock.name,
            direction,
            price: parseFloat(price.toFixed(2)),
            quantity,
            pnl: direction === '卖出' ? parseFloat(pnl.toFixed(2)) : 0,
            pnlRatio: direction === '卖出' ? parseFloat((pnl / (price * quantity) * 100).toFixed(2)) : 0,
            fee: 0,
            note: ''
        });
    }

    return trades.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// 加载示例数据
function loadSampleTrades() {
    if (AppState.trades.length === 0) {
        AppState.trades = generateMockTrades();
        saveData();
        renderTradeStats();
        renderTradeRecords();
        showTradeToast('已加载示例数据，你可以导入自己的CSV覆盖');
    }
}

function renderTradeStats() {
    const totalPnlEl = document.getElementById('totalPnl');
    const winRateEl = document.getElementById('winRate');
    const tradeCountEl = document.getElementById('tradeCount');
    const avgPnlEl = document.getElementById('avgPnl');

    if (!totalPnlEl || !winRateEl || !tradeCountEl) return;

    const sellTrades = AppState.trades.filter(t => t.direction === '卖出');
    const buyTrades = AppState.trades.filter(t => t.direction === '买入');
    const totalPnl = sellTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winCount = sellTrades.filter(t => t.pnl > 0).length;
    const winRate = sellTrades.length > 0 ? (winCount / sellTrades.length * 100).toFixed(1) : 0;
    const avgPnl = sellTrades.length > 0 ? (totalPnl / sellTrades.length).toFixed(2) : 0;

    totalPnlEl.textContent = totalPnl >= 0 ? '+' + totalPnl.toFixed(2) : totalPnl.toFixed(2);
    totalPnlEl.className = 'stat-value ' + (totalPnl >= 0 ? 'up' : 'down');

    winRateEl.textContent = winRate + '%';
    winRateEl.className = 'stat-value ' + (parseFloat(winRate) >= 50 ? 'up' : 'down');

    tradeCountEl.textContent = AppState.trades.length;

    if (avgPnlEl) {
        avgPnlEl.textContent = (parseFloat(avgPnl) >= 0 ? '+' : '') + avgPnl;
        avgPnlEl.className = 'stat-value ' + (parseFloat(avgPnl) >= 0 ? 'up' : 'down');
    }
}

function renderTradeRecords() {
    const tbody = document.getElementById('tradeRecords');
    if (!tbody) return;

    if (AppState.trades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">暂无交易记录，请导入CSV文件或加载示例数据</td></tr>';
        return;
    }

    tbody.innerHTML = AppState.trades.map(trade => {
        const pnlClass = trade.pnl >= 0 ? 'up' : 'down';
        const pnlSign = trade.pnl >= 0 ? '+' : '';
        const ratioClass = trade.pnlRatio >= 0 ? 'up' : 'down';
        const ratioSign = trade.pnlRatio >= 0 ? '+' : '';

        let dirClass = 'status-watching';
        if (trade.direction === '卖出') dirClass = 'status-ready';
        if (trade.direction === '申购') dirClass = 'status-info';

        return '<tr>' +
            '<td>' + trade.date + '</td>' +
            '<td>' + trade.code + '</td>' +
            '<td>' + trade.name + '</td>' +
            '<td><span class="status-badge ' + dirClass + '">' + trade.direction + '</span></td>' +
            '<td>' + trade.price.toFixed(2) + '</td>' +
            '<td>' + trade.quantity + '</td>' +
            '<td class="' + pnlClass + '">' + pnlSign + trade.pnl.toFixed(2) + '</td>' +
            '<td class="' + ratioClass + '">' + (trade.direction === '卖出' ? ratioSign + trade.pnlRatio.toFixed(2) + '%' : '-') + '</td>' +
            '</tr>';
    }).join('');
}

// 手动添加单条记录
function addTradeRecord() {
    const fields = {
        date: document.getElementById('addTradeDate'),
        code: document.getElementById('addTradeCode'),
        name: document.getElementById('addTradeName'),
        direction: document.getElementById('addTradeDirection'),
        price: document.getElementById('addTradePrice'),
        quantity: document.getElementById('addTradeQuantity'),
        pnl: document.getElementById('addTradePnl'),
        pnlRatio: document.getElementById('addTradePnlRatio')
    };

    const date = fields.date?.value;
    const code = fields.code?.value.trim();
    const name = fields.name?.value.trim();
    const direction = fields.direction?.value || '买入';
    const price = parseFloat(fields.price?.value) || 0;
    const quantity = parseInt(fields.quantity?.value) || 0;

    if (!code || !date || price <= 0 || quantity <= 0) {
        showTradeToast('请填写完整的交易信息', 'warning');
        return;
    }

    const pnl = parseFloat(fields.pnl?.value) || 0;
    const pnlRatio = parseFloat(fields.pnlRatio?.value) || 0;

    AppState.trades.unshift({
        date, code, name: name || '--', direction,
        price: parseFloat(price.toFixed(2)), quantity,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlRatio: parseFloat(pnlRatio.toFixed(2)),
        fee: 0, note: ''
    });

    saveData();
    renderTradeStats();
    renderTradeRecords();
    showTradeToast('记录已添加');

    // 清空表单
    Object.values(fields).forEach(el => { if (el) el.value = ''; });
}

// 删除交易记录
function deleteTradeRecord(index) {
    if (!confirm('确定删除这条交易记录吗？')) return;
    AppState.trades.splice(index, 1);
    saveData();
    renderTradeStats();
    renderTradeRecords();
}

function showTradeToast(message, type) {
    type = type || 'success';
    const colors = {
        success: 'var(--accent-primary)',
        warning: '#f59e0b',
        error: '#ef4444'
    };

    const existing = document.querySelector('.trade-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'trade-toast';
    toast.style.cssText = [
        'position: fixed; top: 20px; right: 20px;',
        'background: ' + (colors[type] || colors.success) + ';',
        'color: white; padding: 12px 24px; border-radius: 8px;',
        'font-size: 14px; z-index: 1000;',
        'animation: slideInRight 0.3s ease;',
        'box-shadow: 0 4px 12px rgba(0,0,0,0.3);'
    ].join('');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(function() { toast.remove(); }, 300);
    }, 2500);
}

// Toast动画（确保全局可用）
if (!document.getElementById('tradeToastStyles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'tradeToastStyles';
    styleEl.textContent = [
        '@keyframes slideInRight {',
        '  from { transform: translateX(100%); opacity: 0; }',
        '  to { transform: translateX(0); opacity: 1; }',
        '}',
        '@keyframes slideOutRight {',
        '  from { transform: translateX(0); opacity: 1; }',
        '  to { transform: translateX(100%); opacity: 0; }',
        '}'
    ].join('\n');
    document.head.appendChild(styleEl);
}

// 导出全局函数
window.loadSampleTrades = loadSampleTrades;
window.addTradeRecord = addTradeRecord;
window.deleteTradeRecord = deleteTradeRecord;
