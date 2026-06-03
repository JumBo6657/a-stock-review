/**
 * 大盘情绪模块 - 东方财富API真实数据（JSONP方式）
 */

// JSONP调用（绕过CORS限制）
function jsonp(url, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const cbName = '_jpcb_' + Math.random().toString(36).slice(2) + '_' + Date.now();
        const script = document.createElement('script');
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP timeout'));
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timer);
            delete window[cbName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[cbName] = function(data) {
            cleanup();
            resolve(data);
        };

        script.src = url + (url.includes('?') ? '&' : '?') + 'cb=' + cbName;
        script.onerror = () => { cleanup(); reject(new Error('JSONP failed')); };
        document.head.appendChild(script);
    });
}

// 缓存JSONP结果
const jpCache = {};
function cachedJSONP(url, ttlMs = 60000) {
    const now = Date.now();
    if (jpCache[url] && (now - jpCache[url].ts) < ttlMs) {
        return Promise.resolve(jpCache[url].data);
    }
    return jsonp(url).then(data => {
        jpCache[url] = { data, ts: now };
        return data;
    });
}

// API基础地址
const API_BASE = 'https://push2.eastmoney.com/api/qt';
const API_HIS = 'https://push2his.eastmoney.com/api/qt';

// ============================================
// 指数行情
// ============================================
async function fetchIndexData() {
    const url = API_BASE + '/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=1.000001,0.399001,0.399006,1.000688';
    try {
        const data = await cachedJSONP(url, 10000);
        if (data && data.data && data.data.diff) {
            return data.data.diff.map(item => ({
                code: item.f12,
                name: item.f14,
                price: item.f2,
                change: item.f4,
                changePct: item.f3
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
    const url = API_BASE + '/clist/get?pn=1&pz=60&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f2,f3,f12,f14';
    try {
        const data = await cachedJSONP(url, 30000);
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
// 个股排名
// ============================================
async function fetchStockRank(rankType, count) {
    count = count || 20;
    const sort = rankType === 'up' ? 0 : 1;
    const url = API_BASE + '/clist/get?pn=1&pz=' + count + '&po=' + sort + '&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f2,f3,f4,f12,f14,f15,f16,f17';
    try {
        const data = await cachedJSONP(url, 15000);
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
// 涨跌停统计
// ============================================
async function fetchLimitStats() {
    const url = API_BASE + '/clist/get?pn=1&pz=200&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f3';
    try {
        const data = await cachedJSONP(url, 30000);
        if (data && data.data) {
            const list = data.data.diff || [];
            const upLimit = list.filter(function(item) { return item.f3 >= 9.9; }).length;
            const downLimit = list.filter(function(item) { return item.f3 <= -9.9; }).length;
            return { upLimit: upLimit, downLimit: downLimit};
        }
    } catch (e) {
        console.error('获取涨跌停数据失败:', e);
    }
    return null;
}

// ============================================
// 渲染函数
// ============================================

function renderIndexCards(indexData) {
    if (!indexData) return;
    var cards = document.querySelectorAll('.index-card');
    cards.forEach(function(card, i) {
        if (i >= indexData.length) return;
        var d = indexData[i];
        var nameEl = card.querySelector('.index-name');
        var valueEl = card.querySelector('.index-value');
        var changeEl = card.querySelector('.index-change');
        if (nameEl) nameEl.textContent = d.name;
        if (valueEl) valueEl.textContent = d.price.toLocaleString();
        if (changeEl) {
            var sign = d.changePct >= 0 ? '+' : '';
            changeEl.textContent = sign + d.changePct.toFixed(2) + '%';
            changeEl.className = 'index-change ' + (d.changePct >= 0 ? 'up' : 'down');
        }
    });
}

function renderSectorHeatmap(sectorData) {
    var container = document.getElementById('sectorGrid');
    if (!container || !sectorData) return;
    var filtered = sectorData.filter(function(s) { return Math.abs(s.changePct) > 0.01; });
    if (filtered.length === 0) return;
    var maxChange = Math.max.apply(null, filtered.map(function(s) { return Math.abs(s.changePct); }));
    container.innerHTML = filtered.map(function(sector) {
        var opacity = Math.max(Math.abs(sector.changePct) / maxChange, 0.15);
        var color = sector.changePct >= 0
            ? 'rgba(16, 185, 129, ' + opacity.toFixed(2) + ')'
            : 'rgba(239, 68, 68, ' + opacity.toFixed(2) + ')';
        return '<div class="sector-item" style="background: ' + color + '">' +
            '<span class="sector-name">' + sector.name + '</span>' +
            '<span class="sector-change ' + (sector.changePct >= 0 ? 'up' : 'down') + '">' +
            (sector.changePct >= 0 ? '+' : '') + sector.changePct.toFixed(2) + '%</span></div>';
    }).join('');
}

function renderLimitStats(limitData) {
    if (!limitData) return;
    var items = document.querySelectorAll('.limit-item .limit-value');
    var ratioEl = document.querySelector('.ratio-value');
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

function updateMarketBreadth(items) {
    if (!items || items.length === 0) return;
    var up = items.filter(function(item) { return item.changePct > 0; }).length;
    var down = items.filter(function(item) { return item.changePct < 0; }).length;
    var flat = items.length - up - down;
    var bars = document.querySelectorAll('.ad-bar');
    var total = items.length;
    [up, down, flat].forEach(function(val, i) {
        var fill = bars[i] ? bars[i].querySelector('.ad-fill') : null;
        var value = bars[i] ? bars[i].querySelector('.ad-value') : null;
        if (fill) fill.style.width = (val / total * 100).toFixed(1) + '%';
        if (value) value.textContent = val;
    });
}

function updateSentiment(upCount, downCount) {
    var total = upCount + downCount || 1;
    var score = Math.round(upCount / total * 100);
    var gaugeFill = document.querySelector('.gauge-fill');
    var scoreEl = document.querySelector('.gauge-score');
    var labelEl = document.querySelector('.gauge-label');
    if (gaugeFill) gaugeFill.style.setProperty('--value', score);
    if (scoreEl) scoreEl.textContent = score;
    var label = score >= 80 ? '极度乐观' : score >= 65 ? '偏乐观' : score >= 45 ? '中性' : score >= 25 ? '偏悲观' : '极度悲观';
    if (labelEl) labelEl.textContent = label;
}

function renderTopList(containerId, items) {
    var container = document.getElementById(containerId);
    if (!container || !items || items.length === 0) return;
    container.innerHTML = items.slice(0, 8).map(function(item) {
        var pct = item.changePct || 0;
        var cls = pct >= 0 ? 'up' : 'down';
        var sign = pct >= 0 ? '+' : '';
        return '<div class="top-list-item" onclick="window.loadChart(\'' + item.code + '\');window.switchPage(\'charts\');">' +
            '<span class="top-list-code">' + item.code + '</span>' +
            '<span class="top-list-name">' + item.name + '</span>' +
            '<span class="top-list-pct ' + cls + '">' + sign + pct.toFixed(2) + '%</span></div>';
    }).join('');
}

// ============================================
// 主刷新
// ============================================
async function refreshDashboard() {
    var refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳ 刷新中...';
    }
    try {
        var results = await Promise.all([
            fetchIndexData(),
            fetchSectorData(),
            fetchLimitStats(),
            fetchStockRank('up', 300),
            fetchStockRank('up', 8),
            fetchStockRank('down', 8)
        ]);
        var indexData = results[0];
        var sectorData = results[1];
        var limitData = results[2];
        var stockRank = results[3];
        var topGainers = results[4];
        var topLosers = results[5];

        renderIndexCards(indexData);
        renderSectorHeatmap(sectorData);
        renderLimitStats(limitData);
        renderTopList('topGainers', topGainers);
        renderTopList('topLosers', topLosers);

        if (stockRank) {
            updateMarketBreadth(stockRank);
            var upCount = stockRank.filter(function(s) { return s.changePct > 0; }).length;
            updateSentiment(upCount, stockRank.length - upCount);
        }

        // 市场状态
        var now = new Date();
        var hour = now.getHours();
        var minute = now.getMinutes();
        var inTrade = (hour > 9 || (hour === 9 && minute >= 15)) && (hour < 11 || (hour === 11 && minute <= 30)) ||
                      (hour >= 13 && hour < 15);
        var statusDot = document.querySelector('.status-dot');
        var statusText = document.querySelector('.status-text');
        if (statusDot) statusDot.style.background = inTrade ? '#10b981' : '#6b7280';
        if (statusText) statusText.textContent = inTrade ? '交易中' : '收盘';

    } catch (e) {
        console.error('刷新大盘失败:', e);
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = '🔄 刷新';
        }
    }
}

function initDashboard() {
    refreshDashboard();
    var now = new Date();
    var hour = now.getHours();
    var inTradeTime = (hour >= 9 && hour < 15 && !(hour === 11 && now.getMinutes() > 30 && hour < 13));
    if (inTradeTime) setInterval(refreshDashboard, 30000);
}

document.addEventListener('DOMContentLoaded', function() {
    var refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshDashboard);
});
