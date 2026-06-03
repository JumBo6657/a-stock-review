/**
 * 大盘情绪模块 - 东方财富API真实数据
 */

// API基础地址
const API_BASE = 'https://push2.eastmoney.com/api/qt';
const API_HIS = 'https://push2his.eastmoney.com/api/qt';

// 缓存
const apiCache = {};
function cachedFetch(url, ttlMs = 60000) {
    const now = Date.now();
    if (apiCache[url] && (now - apiCache[url].ts) < ttlMs) {
        return Promise.resolve(apiCache[url].data);
    }
    return fetch(url).then(r => r.json()).then(data => {
        if (data && !data.error) {
            apiCache[url] = { data, ts: now };
        }
        return data;
    });
}

// ============================================
// 指数行情
// ============================================
async function fetchIndexData() {
    const url = API_BASE + '/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=1.000001,0.399001,0.399006,1.000688';
    try {
        const data = await cachedFetch(url, 10000);
        if (data && data.data && data.data.diff) {
            return data.data.diff.map(item => ({
                code: item.f12,
                name: item.f14,
                price: item.f2,
                change: item.f3,
                changePct: item.f4
            }));
        }
    } catch (e) {
        console.error('获取指数数据失败:', e);
    }
    return null;
}

// ============================================
// 板块行情
// ============================================
async function fetchSectorData() {
    const url = API_BASE + '/clist/get?pn=1&pz=60&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f2,f3,f4,f12,f14';
    try {
        const data = await cachedFetch(url, 30000);
        if (data && data.data && data.data.diff) {
            return data.data.diff.map(item => ({
                code: item.f12,
                name: item.f14,
                price: item.f2,
                changePct: item.f3
            }));
        }
    } catch (e) {
        console.error('获取板块数据失败:', e);
    }
    return null;
}

// ============================================
// 个股排名（涨幅榜、跌幅榜等）
// ============================================
async function fetchStockRank(rankType = 'up', count = 20) {
    // f3=涨跌幅, sort: 1=asc, 0=desc
    const sort = rankType === 'up' ? 0 : 1;
    // fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23 = 沪深A股(不含ST/科创板)
    const url = API_BASE + `/clist/get?pn=1&pz=${count}&po=${sort}&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f2,f3,f4,f12,f14,f15,f16,f17`;
    try {
        const data = await cachedFetch(url, 15000);
        if (data && data.data && data.data.diff) {
            return data.data.diff.map(item => ({
                code: item.f12,
                name: item.f14,
                price: item.f2,
                changePct: item.f3,
                change: item.f4,
                high: item.f15,
                low: item.f16,
                open: item.f17
            }));
        }
    } catch (e) {
        console.error('获取个股排名失败:', e);
    }
    return null;
}

// ============================================
// 涨跌停统计（从龙虎榜/涨跌停API获取）
// ============================================
async function fetchLimitStats() {
    // 涨停板列表
    const url = API_BASE + '/clist/get?pn=1&pz=200&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f3';
    try {
        const data = await cachedFetch(url, 30000);
        if (data && data.data) {
            const list = data.data.diff || [];
            const upLimit = list.filter(item => item.f3 >= 9.9).length;
            const downLimit = list.filter(item => item.f3 <= -9.9).length;
            return { upLimit, downLimit, total: data.data.total || 0 };
        }
    } catch (e) {
        console.error('获取涨跌停数据失败:', e);
    }
    return null;
}

// ============================================
// 大盘统计（涨跌家数）
// ============================================
async function fetchMarketBreadth() {
    const url = API_BASE + '/clist/get?pn=1&pz=1&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f104,f105,f106';
    try {
        const data = await cachedFetch(url, 15000);
        if (data && data.data && data.data.diff && data.data.diff.length > 0) {
            // f104=上涨家数, f105=下跌家数, f106=平盘家数
            const d = data.data.diff[0];
            // 这些字段可能不存在，需要用其他方式获取
            return null;
        }
    } catch (e) {
        console.error('获取涨跌家数失败:', e);
    }
    return null;
}

// ============================================
// 渲染函数
// ============================================

// 渲染指数卡片
function renderIndexCards(indexData) {
    if (!indexData) return;
    const cards = document.querySelectorAll('.index-card');
    const names = ['上证指数', '深证成指', '创业板指', '科创50'];

    cards.forEach((card, i) => {
        if (i >= indexData.length) return;
        const d = indexData[i];
        const nameEl = card.querySelector('.index-name');
        const valueEl = card.querySelector('.index-value');
        const changeEl = card.querySelector('.index-change');

        if (nameEl) nameEl.textContent = d.name;
        if (valueEl) valueEl.textContent = d.price.toLocaleString();
        if (changeEl) {
            const sign = d.changePct >= 0 ? '+' : '';
            changeEl.textContent = sign + d.changePct.toFixed(2) + '%';
            changeEl.className = 'index-change ' + (d.changePct >= 0 ? 'up' : 'down');
        }
    });
}

// 渲染涨跌家数
function renderAdvanceDecline(breadthData) {
    if (!breadthData) return;
    const bars = document.querySelectorAll('.ad-bar');
    if (bars.length < 3) return;

    const up = breadthData.up || 0;
    const down = breadthData.down || 0;
    const flat = breadthData.flat || 0;
    const total = up + down + flat || 1;

    [up, down, flat].forEach((val, i) => {
        const fill = bars[i]?.querySelector('.ad-fill');
        const value = bars[i]?.querySelector('.ad-value');
        if (fill) fill.style.width = (val / total * 100).toFixed(1) + '%';
        if (value) value.textContent = val;
    });
}

// 渲染涨跌停
function renderLimitStats(limitData) {
    if (!limitData) return;
    const items = document.querySelectorAll('.limit-item .limit-value');
    const ratioEl = document.querySelector('.ratio-value');

    if (items.length >= 2) {
        items[0].textContent = limitData.upLimit;
        items[0].className = 'limit-value up';
        items[1].textContent = limitData.downLimit;
        items[1].className = 'limit-value down';
    }
    if (ratioEl && limitData.downLimit > 0) {
        ratioEl.textContent = (limitData.upLimit / limitData.downLimit).toFixed(2) + ':1';
    }
}

// 渲染板块热力图
function renderSectorHeatmap(sectorData) {
    const container = document.getElementById('sectorGrid');
    if (!container || !sectorData) return;

    const filtered = sectorData.filter(s => Math.abs(s.changePct) > 0.01);
    if (filtered.length === 0) return;

    const maxChange = Math.max(...filtered.map(s => Math.abs(s.changePct)));

    container.innerHTML = filtered.map(sector => {
        const opacity = Math.max(Math.abs(sector.changePct) / maxChange, 0.15);
        const color = sector.changePct >= 0
            ? `rgba(16, 185, 129, ${opacity.toFixed(2)})`
            : `rgba(239, 68, 68, ${opacity.toFixed(2)})`;

        return '<div class="sector-item" style="background: ' + color + '">' +
            '<span class="sector-name">' + sector.name + '</span>' +
            '<span class="sector-change ' + (sector.changePct >= 0 ? 'up' : 'down') + '">' +
            (sector.changePct >= 0 ? '+' : '') + sector.changePct.toFixed(2) + '%</span>' +
            '</div>';
    }).join('');
}

// 更新涨跌家数（基于涨幅榜数据推算）
function updateMarketBreadth(items) {
    if (!items || items.length === 0) return;
    const up = items.filter(item => item.changePct > 0).length;
    const down = items.filter(item => item.changePct < 0).length;
    const flat = items.length - up - down;

    const bars = document.querySelectorAll('.ad-bar');
    const total = items.length;
    [up, down, flat].forEach((val, i) => {
        const fill = bars[i]?.querySelector('.ad-fill');
        const value = bars[i]?.querySelector('.ad-value');
        if (fill) fill.style.width = (val / total * 100).toFixed(1) + '%';
        if (value) value.textContent = val;
    });
}

// 更新市场情绪分数
function updateSentiment(upCount, downCount) {
    const total = upCount + downCount || 1;
    const ratio = upCount / total;
    const score = Math.round(ratio * 100);

    const gaugeFill = document.querySelector('.gauge-fill');
    const scoreEl = document.querySelector('.gauge-score');
    const labelEl = document.querySelector('.gauge-label');

    if (gaugeFill) gaugeFill.style.setProperty('--value', score);
    if (scoreEl) scoreEl.textContent = score;

    let label;
    if (score >= 80) label = '极度乐观';
    else if (score >= 65) label = '偏乐观';
    else if (score >= 45) label = '中性';
    else if (score >= 25) label = '偏悲观';
    else label = '极度悲观';

    if (labelEl) labelEl.textContent = label;
}

// 渲染涨幅榜TOP列表
function renderTopList(containerId, items, isUp) {
    const container = document.getElementById(containerId);
    if (!container || !items || items.length === 0) return;

    container.innerHTML = items.slice(0, 8).map((item, i) => {
        const pct = item.changePct || 0;
        const cls = pct >= 0 ? 'up' : 'down';
        const sign = pct >= 0 ? '+' : '';
        return '<div class="top-list-item" onclick="loadChart(\'' + item.code + '\');switchPage(\'charts\');">' +
            '<span class="top-list-code">' + item.code + '</span>' +
            '<span class="top-list-name">' + item.name + '</span>' +
            '<span class="top-list-pct ' + cls + '">' + sign + pct.toFixed(2) + '%</span>' +
            '</div>';
    }).join('');
}

// ============================================
// 主刷新函数
// ============================================
async function refreshDashboard() {
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳ 刷新中...';
    }

    try {
        // 并行获取所有数据
        const [indexData, sectorData, limitData, stockRank, topGainers, topLosers] = await Promise.all([
            fetchIndexData(),
            fetchSectorData(),
            fetchLimitStats(),
            fetchStockRank('up', 300),
            fetchStockRank('up', 8),
            fetchStockRank('down', 8)
        ]);

        // 更新UI
        renderIndexCards(indexData);
        renderSectorHeatmap(sectorData);
        renderLimitStats(limitData);
        renderTopList('topGainers', topGainers, true);
        renderTopList('topLosers', topLosers, false);

        if (stockRank) {
            updateMarketBreadth(stockRank);
            const upCount = stockRank.filter(s => s.changePct > 0).length;
            updateSentiment(upCount, stockRank.length - upCount);
        }

        // 更新时间戳
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');

        const hour = now.getHours();
        const minute = now.getMinutes();
        const isTradeTime = (hour === 9 && minute >= 15) || (hour >= 9 && hour < 11) || (hour === 10 && minute <= 30) || (hour >= 11 || hour < 15) || (hour === 11 && minute <= 30) || (hour >= 13);

        // 简化判断：9:15-11:30, 13:00-15:00 为交易时间
        const inTrade = (hour > 9 || (hour === 9 && minute >= 15)) && (hour < 11 || (hour === 11 && minute <= 30)) ||
                        (hour >= 13 && hour < 15);

        if (statusDot) {
            statusDot.style.background = inTrade ? '#10b981' : '#6b7280';
        }
        if (statusText) {
            statusText.textContent = inTrade ? '交易中' : '收盘';
        }

    } catch (e) {
        console.error('刷新大盘数据失败:', e);
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = '🔄 刷新';
        }
    }
}

// ============================================
// 初始化
// ============================================
function initDashboard() {
    // 初次加载
    refreshDashboard();

    // 交易时间段每30秒自动刷新
    const now = new Date();
    const hour = now.getHours();
    const inTradeTime = (hour >= 9 && hour < 15 && !(hour === 11 && now.getMinutes() > 30 && hour < 13));

    if (inTradeTime) {
        setInterval(refreshDashboard, 30000);
    }
}

// 绑定刷新按钮
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDashboard);
    }
});
