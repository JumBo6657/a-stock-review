/**
 * 大盘情绪模块 - 读取本地数据JSON（无CORS限制）
 */

function initDashboard() {
    refreshDashboard();
    setInterval(refreshDashboard, 300000);
}

async function refreshDashboard() {
    var btn = document.getElementById('refreshData');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    try {
        var results = await Promise.all([
            fetch('data/indices.json?' + Date.now()).then(r => r.json()),
            fetch('data/sectors.json?' + Date.now()).then(r => r.json()),
            fetch('data/market.json?' + Date.now()).then(r => r.json()),
            fetch('data/updated.txt?' + Date.now()).then(r => r.text())
        ]);

        var indices = results[0];
        var sectors = results[1];
        var market = results[2];
        var updated = results[3].trim();

        renderIndexCards(indices);
        renderSectorHeatmap(sectors);
        renderMarketBreadth(market);
        renderLimitStats(market);
        renderTopList('topGainers', market.topGainers);
        renderTopList('topLosers', market.topLosers);
        updateSentiment(market.upCount, market.downCount);

        var statusText = document.querySelector('.status-text');
        if (statusText) statusText.textContent = updated;

    } catch (e) {
        console.error('加载数据失败:', e);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '刷新'; }
    }
}

function renderIndexCards(data) {
    if (!data || !data.length) return;
    var cards = document.querySelectorAll('.index-card');
    cards.forEach(function(card, i) {
        if (i >= data.length) return;
        var d = data[i];
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

function renderSectorHeatmap(data) {
    var container = document.getElementById('sectorGrid');
    if (!container || !data) return;
    var filtered = data.filter(function(s) { return Math.abs(s.changePct) > 0.01; });
    if (filtered.length === 0) return;
    var maxChange = Math.max.apply(null, filtered.map(function(s) { return Math.abs(s.changePct); }));

    container.innerHTML = filtered.map(function(sector) {
        var opacity = Math.max(Math.abs(sector.changePct) / maxChange, 0.15);
        var color = sector.changePct >= 0
            ? 'rgba(16,185,129,' + opacity.toFixed(2) + ')'
            : 'rgba(239,68,68,' + opacity.toFixed(2) + ')';
        return '<div class="sector-item" style="background:' + color + '">' +
            '<span class="sector-name">' + sector.name + '</span>' +
            '<span class="sector-change ' + (sector.changePct >= 0 ? 'up' : 'down') + '">' +
            (sector.changePct >= 0 ? '+' : '') + sector.changePct.toFixed(2) + '%</span></div>';
    }).join('');
}

function renderMarketBreadth(market) {
    if (!market) return;
    var bars = document.querySelectorAll('.ad-bar');
    var total = market.upCount + market.downCount + market.flatCount;
    if (total === 0) total = 1;
    var vals = [market.upCount, market.downCount, market.flatCount];
    vals.forEach(function(val, i) {
        var fill = bars[i] ? bars[i].querySelector('.ad-fill') : null;
        var v = bars[i] ? bars[i].querySelector('.ad-value') : null;
        if (fill) fill.style.width = (val / total * 100).toFixed(1) + '%';
        if (v) v.textContent = val;
    });
}

function renderLimitStats(market) {
    if (!market) return;
    var items = document.querySelectorAll('.limit-item .limit-value');
    var ratioEl = document.querySelector('.ratio-value');
    if (items.length < 2) return;
    items[0].textContent = market.limitUp;
    items[0].className = 'limit-value up';
    items[1].textContent = market.limitDown;
    items[1].className = 'limit-value down';
    if (ratioEl && market.limitDown > 0) {
        ratioEl.textContent = (market.limitUp / market.limitDown).toFixed(2) + ':1';
    }
}

function updateSentiment(upCount, downCount) {
    var total = upCount + downCount || 1;
    var score = Math.round(upCount / total * 100);
    var scoreEl = document.querySelector('.gauge-score');
    var labelEl = document.querySelector('.gauge-label');
    if (scoreEl) scoreEl.textContent = score;
    var label = score >= 80 ? '极度乐观' : score >= 65 ? '偏乐观' : score >= 45 ? '中性' : score >= 25 ? '偏悲观' : '极度悲观';
    if (labelEl) labelEl.textContent = label;
}

function renderTopList(containerId, items) {
    var container = document.getElementById(containerId);
    if (!container || !items || !items.length) return;
    container.innerHTML = items.slice(0, 8).map(function(item) {
        var pct = item.changePct || 0;
        var cls = pct >= 0 ? 'up' : 'down';
        var sign = pct >= 0 ? '+' : '';
        return '<div class="top-list-item" onclick="loadChart(' + "'" + item.code + "'" + ');switchPage(' + "'charts'" + ');">' +
            '<span class="top-list-code">' + item.code + '</span>' +
            '<span class="top-list-name">' + item.name + '</span>' +
            '<span class="top-list-pct ' + cls + '">' + sign + pct.toFixed(2) + '%</span></div>';
    }).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('refreshData');
    if (btn) btn.addEventListener('click', refreshDashboard);
});
