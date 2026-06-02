/**
 * 交易记录模块
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
                alert('请选择文件');
                return;
            }
            
            // 模拟导入
            importTrades(file);
        });
    }
}

function importTrades(file) {
    // 模拟从CSV导入交易记录
    const mockTrades = generateMockTrades();
    
    AppState.trades = mockTrades;
    saveData();
    
    renderTradeStats();
    renderTradeRecords();
    
    alert(`成功导入 ${mockTrades.length} 条交易记录`);
}

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
            pnlRatio: direction === '卖出' ? parseFloat((pnl / (price * quantity) * 100).toFixed(2)) : 0
        });
    }
    
    return trades.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTradeStats() {
    const totalPnlEl = document.getElementById('totalPnl');
    const winRateEl = document.getElementById('winRate');
    const tradeCountEl = document.getElementById('tradeCount');
    
    if (!totalPnlEl || !winRateEl || !tradeCountEl) return;
    
    const sellTrades = AppState.trades.filter(t => t.direction === '卖出');
    const totalPnl = sellTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winCount = sellTrades.filter(t => t.pnl > 0).length;
    const winRate = sellTrades.length > 0 ? (winCount / sellTrades.length * 100).toFixed(1) : 0;
    
    totalPnlEl.textContent = totalPnl >= 0 ? `+${totalPnl.toFixed(2)}` : totalPnl.toFixed(2);
    totalPnlEl.className = `stat-value ${totalPnl >= 0 ? 'up' : 'down'}`;
    
    winRateEl.textContent = `${winRate}%`;
    winRateEl.className = `stat-value ${winRate >= 50 ? 'up' : 'down'}`;
    
    tradeCountEl.textContent = AppState.trades.length;
}

function renderTradeRecords() {
    const tbody = document.getElementById('tradeRecords');
    if (!tbody) return;
    
    tbody.innerHTML = AppState.trades.map(trade => `
        <tr>
            <td>${trade.date}</td>
            <td>${trade.code}</td>
            <td>${trade.name}</td>
            <td>
                <span class="status-badge ${trade.direction === '买入' ? 'status-watching' : 'status-ready'}">
                    ${trade.direction}
                </span>
            </td>
            <td>${trade.price}</td>
            <td>${trade.quantity}</td>
            <td class="${trade.pnl >= 0 ? 'up' : 'down'}">${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}</td>
            <td class="${trade.pnlRatio >= 0 ? 'up' : 'down'}">${trade.pnl >= 0 ? '+' : ''}${trade.pnlRatio.toFixed(2)}%</td>
        </tr>
    `).join('');
}
