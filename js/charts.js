/**
 * 行情中心模块 - 读本地K线数据JSON
 */

var currentChartType = 'kline';

function initCharts() {
    initChartTabs();
    initStockSearch();
    loadChart('000001');
}

function initChartTabs() {
    var tabs = document.querySelectorAll('.chart-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
            currentChartType = this.dataset.chart;
            for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
            this.classList.add('active');
            var inp = document.getElementById('stockSearch');
            loadChart(inp ? inp.value : '000001');
        });
    }
}

function initStockSearch() {
    var inp = document.getElementById('stockSearch');
    var btn = document.getElementById('loadChart');
    if (btn) btn.addEventListener('click', function() { loadChart(inp.value.trim() || '000001'); });
    if (inp) inp.addEventListener('keypress', function(e) { if (e.key === 'Enter') loadChart(inp.value.trim() || '000001'); });
}

function loadChart(code) {
    var container = document.getElementById('chartArea');
    if (!container) return;
    var inp = document.getElementById('stockSearch');
    if (inp) inp.value = code;

    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px;">Loading...</div>';

    var url = 'data/kline_' + code + '.json?' + Date.now();
    fetch(url).then(function(r) {
        if (!r.ok) throw new Error('no preload');
        return r.json();
    }).then(function(data) {
        if (data && data.klines && data.klines.length > 0) {
            if (currentChartType === 'kline') {
                renderKLineChart(container, data.name || code, data.klines);
            } else {
                renderMinuteChart(container, data.name || code, data.klines);
            }
        } else {
            showError(container, '无数据');
        }
    }).catch(function() {
        tryJSONP(code, container);
    });
}

function tryJSONP(code, container) {
    var first = code[0];
    var market = (first === '0' || first === '3') ? '0' : '1';
    var url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get' +
        '?secid=' + market + '.' + code +
        '&fields1=f1,f2,f3,f4,f5,f6' +
        '&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61' +
        '&klt=' + (currentChartType === 'kline' ? 101 : 1) +
        '&fqt=0&end=20500101&lmt=200';

    var cb = '_kcb_' + Date.now();
    var script = document.createElement('script');
    var timer = setTimeout(function() {
        cleanup();
        showError(container, '网络超时');
    }, 10000);

    function cleanup() {
        clearTimeout(timer);
        delete window[cb];
        if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cb] = function(data) {
        cleanup();
        if (!data || !data.data || !data.data.klines) {
            showError(container, '无效数据');
            return;
        }
        var name = data.data.name || code;
        var klines = data.data.klines.map(function(line) {
            var p = line.split(',');
            return {
                time: p[0],
                open: parseFloat(p[1]), close: parseFloat(p[2]),
                high: parseFloat(p[3]), low: parseFloat(p[4]),
                volume: parseFloat(p[5]), amount: parseFloat(p[6]),
                amplitude: parseFloat(p[7]), changePct: parseFloat(p[8]),
                change: parseFloat(p[9]), turnover: parseFloat(p[10])
            };
        });
        if (currentChartType === 'kline') {
            renderKLineChart(container, name, klines);
        } else {
            renderMinuteChart(container, name, klines);
        }
    };

    script.src = url + '&cb=' + cb;
    script.onerror = function() { cleanup(); showError(container, '网络异常'); };
    document.head.appendChild(script);
}

function showError(container, msg) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">' + msg + '，请检查股票代码</div>';
}

function renderKLineChart(container, name, rawData) {
    container.innerHTML = '';

    var cd = rawData.map(function(d) {
        return { time: d.date || d.time, open: d.open, high: d.high, low: d.low, close: d.close };
    });
    var vd = rawData.map(function(d) {
        return { time: d.date || d.time, value: d.volume, color: d.close >= d.open ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)' };
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
    cs.setData(cd);

    var vs = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.78, bottom: 0 } });
    vs.setData(vd);

    var mas = [5, 10, 20, 60];
    var colors = ['#f59e0b', '#3b82f6', '#f59e0b', '#8b5cf6'];
    for (var m = 0; m < mas.length; m++) {
        var ma = calcMA(cd, mas[m]);
        if (ma.length > 0) {
            var ls = chart.addLineSeries({ color: colors[m], lineWidth: m === 2 ? 1.5 : 1, title: 'MA' + mas[m] });
            ls.setData(ma);
        }
    }

    chart.timeScale().fitContent();

    var onResize = function() { chart.applyOptions({ width: container.clientWidth, height: container.clientHeight }); };
    window.addEventListener('resize', onResize);
}

function renderMinuteChart(container, name, klines) {
    container.innerHTML = '';

    var last = klines[klines.length - 1];
    if (!last) return showError(container, '无数据');

    var base = last.open;
    var points = [
        { time: Math.floor(new Date(last.date || last.time).getTime() / 1000) - 14400, value: base },
        { time: Math.floor(new Date(last.date || last.time).getTime() / 1000) - 10800, value: last.low },
        { time: Math.floor(new Date(last.date || last.time).getTime() / 1000) - 7200, value: last.high },
        { time: Math.floor(new Date(last.date || last.time).getTime() / 1000) - 3600, value: last.close }
    ];

    var isUp = last.close >= last.open;
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
    as.setData(points);

    chart.timeScale().fitContent();
    var onResize = function() { chart.applyOptions({ width: container.clientWidth, height: container.clientHeight }); };
    window.addEventListener('resize', onResize);
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
