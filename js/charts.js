/**
 * 行情中心模块 - 东方财富API真实K线（JSONP方式）
 */

window.chartInstance = null;
var currentChartType = 'kline';
var stockInfoCache = {};

// JSONP封装（与dashboard.js共享，但这里独立定义以防加载顺序问题）
if (typeof window._jsonp === 'undefined') {
    window._jsonp = function(url, timeoutMs) {
        timeoutMs = timeoutMs || 10000;
        return new Promise(function(resolve, reject) {
            var cbName = '_jpcb_' + Math.random().toString(36).slice(2) + '_' + Date.now();
            var script = document.createElement('script');
            var timer = setTimeout(function() { cleanup(); reject(new Error('timeout')); }, timeoutMs);
            function cleanup() {
                clearTimeout(timer);
                delete window[cbName];
                if (script.parentNode) script.parentNode.removeChild(script);
            }
            window[cbName] = function(data) { cleanup(); resolve(data); };
            script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'cb=' + cbName;
            script.onerror = function() { cleanup(); reject(new Error('failed')); };
            document.head.appendChild(script);
        });
    };
}

function initCharts() {
    initChartTabs();
    initStockSearch();
    window.loadChart('000001');
}

function initChartTabs() {
    var tabs = document.querySelectorAll('.chart-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
            currentChartType = this.dataset.chart;
            for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
            this.classList.add('active');
            var searchInput = document.getElementById('stockSearch');
            window.loadChart(searchInput ? searchInput.value : '000001');
        });
    }
}

function initStockSearch() {
    var searchInput = document.getElementById('stockSearch');
    var loadBtn = document.getElementById('loadChart');
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            window.loadChart(searchInput.value.trim() || '000001');
        });
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.loadChart(searchInput.value.trim() || '000001');
        });
    }
}

// 判断交易所
function getMarketCode(code) {
    code = String(code).trim();
    if (code.length < 6) code = ('000000' + code).slice(-6);
    var first = code[0];
    if (first === '0' || first === '3') return '0.' + code;
    return '1.' + code;
}

// 获取K线数据
function fetchKLineData(code, limit) {
    limit = limit || 200;
    var secid = getMarketCode(code);
    var url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get' +
        '?secid=' + secid +
        '&fields1=f1,f2,f3,f4,f5,f6' +
        '&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61' +
        '&klt=101&fqt=0&end=20500101&lmt=' + limit;
    return window._jsonp(url).then(function(data) {
        if (data && data.data && data.data.klines) {
            var name = (data.data.name || code);
            stockInfoCache[secid] = name;
            return {
                name: name,
                klines: data.data.klines.map(function(line) {
                    var p = line.split(',');
                    return {
                        time: p[0], open: parseFloat(p[1]), close: parseFloat(p[2]),
                        high: parseFloat(p[3]), low: parseFloat(p[4]), volume: parseFloat(p[5]),
                        amount: parseFloat(p[6]), amplitude: parseFloat(p[7]),
                        changePct: parseFloat(p[8]), change: parseFloat(p[9]), turnover: parseFloat(p[10])
                    };
                })
            };
        }
        return null;
    });
}

// 获取分时数据
function fetchMinuteData(code) {
    var secid = getMarketCode(code);
    var url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get' +
        '?secid=' + secid +
        '&fields1=f1,f2,f3,f4,f5,f6' +
        '&fields2=f51,f52,f53,f54,f55,f56' +
        '&klt=1&fqt=0&end=20500101&lmt=240';
    return window._jsonp(url).then(function(data) {
        if (data && data.data && data.data.klines && data.data.klines.length > 0) {
            stockInfoCache[secid] = data.data.name || code;
            return data.data.klines.map(function(line) {
                var p = line.split(',');
                return { time: Math.floor(new Date(p[0]).getTime() / 1000), value: parseFloat(p[2]) };
            });
        }
        return null;
    });
}

// ============================================
// 主加载
// ============================================
window.loadChart = function(code) {
    var container = document.getElementById('chartArea');
    if (!container) return;
    var searchInput = document.getElementById('stockSearch');
    if (searchInput) searchInput.value = code;

    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px;">⏳ 加载行情数据...</div>';

    var secid = getMarketCode(code);

    if (currentChartType === 'kline') {
        fetchKLineData(code, 200).then(function(result) {
            if (result && result.klines.length > 0) {
                renderKLineChart(container, result.name || code, result.klines);
            } else {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">❌ 无法获取数据，请检查股票代码</div>';
            }
        }).catch(function(e) {
            console.error(e);
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-down);">❌ 网络异常，请稍后重试</div>';
        });
    } else {
        fetchMinuteData(code).then(function(data) {
            if (data && data.length > 0) {
                renderTimeSeriesChart(container, stockInfoCache[secid] || code, data);
            } else {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">❌ 分时数据不可用（可能已收盘）</div>';
            }
        }).catch(function() {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-down);">❌ 网络异常</div>';
        });
    }
};

// ============================================
// K线图
// ============================================
function renderKLineChart(container, name, rawData) {
    container.innerHTML = '';
    var candlestickData = rawData.map(function(d) {
        return { time: d.time, open: d.open, high: d.high, low: d.low, close: d.close };
    });
    var volumeData = rawData.map(function(d) {
        return { time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)' };
    });

    var chart = LightweightCharts.createChart(container, {
        width: container.clientWidth, height: container.clientHeight,
        layout: { background: { color: '#1a1f2e' }, textColor: '#9ca3af' },
        grid: { vertLines: { color: '#2d3748' }, horzLines: { color: '#2d3748' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#2d3748', scaleMargins: { top: 0.05, bottom: 0.25 } },
        timeScale: { borderColor: '#2d3748', timeVisible: true }
    });

    var cs = chart.addCandlestickSeries({
        upColor: '#10b981', downColor: '#ef4444',
        borderUpColor: '#10b981', borderDownColor: '#ef4444',
        wickUpColor: '#10b981', wickDownColor: '#ef4444'
    });
    cs.setData(candlestickData);

    var vs = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.78, bottom: 0 } });
    vs.setData(volumeData);

    // MA均线
    var mas = [5, 10, 20, 60];
    var colors = ['#f59e0b', '#3b82f6', '#f59e0b', '#8b5cf6'];
    var widths = [1, 1, 1.5, 1];
    for (var m = 0; m < mas.length; m++) {
        var ma = calcMA(candlestickData, mas[m]);
        if (ma.length > 0) {
            var ls = chart.addLineSeries({ color: colors[m], lineWidth: widths[m], title: 'MA' + mas[m] });
            ls.setData(ma);
        }
    }

    chart.timeScale().fitContent();
    var onResize = function() { chart.applyOptions({ width: container.clientWidth, height: container.clientHeight }); };
    window.addEventListener('resize', onResize);
    window.chartInstance = chart;
}

// ============================================
// 分时图
// ============================================
function renderTimeSeriesChart(container, name, data) {
    container.innerHTML = '';
    var firstPrice = data[0].value;
    var lastPrice = data[data.length - 1].value;
    var isUp = lastPrice >= firstPrice;
    var lc = isUp ? '#ef4444' : '#10b981';
    var tc = (isUp ? 'rgba(239,68,68,' : 'rgba(16,185,129,') + '0.35)';
    var bc = (isUp ? 'rgba(239,68,68,' : 'rgba(16,185,129,') + '0.05)';

    var chart = LightweightCharts.createChart(container, {
        width: container.clientWidth, height: container.clientHeight,
        layout: { background: { color: '#1a1f2e' }, textColor: '#9ca3af' },
        grid: { vertLines: { color: '#2d3748' }, horzLines: { color: '#2d3748' } },
        rightPriceScale: { borderColor: '#2d3748' },
        timeScale: { borderColor: '#2d3748', timeVisible: true }
    });

    var as = chart.addAreaSeries({ topColor: tc, bottomColor: bc, lineColor: lc, lineWidth: 2 });
    as.setData(data);

    if (data.length > 1) {
        var avg = data.reduce(function(s, d) { return s + d.value; }, 0) / data.length;
        var avgs = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, lineStyle: 2, title: '均价' });
        avgs.setData([{ time: data[0].time, value: avg }, { time: data[data.length - 1].time, value: avg }]);
    }

    chart.timeScale().fitContent();
    var onResize = function() { chart.applyOptions({ width: container.clientWidth, height: container.clientHeight }); };
    window.addEventListener('resize', onResize);
    window.chartInstance = chart;
}

function calcMA(data, period) {
    if (data.length < period) return [];
    var result = [];
    for (var i = period - 1; i < data.length; i++) {
        var sum = 0;
        for (var j = 0; j < period; j++) sum += data[i - j].close;
        result.push({ time: data[i].time, value: parseFloat((sum / period).toFixed(2)) });
    }
    return result;
}

// 映射全局
window.loadChart = window.loadChart;
