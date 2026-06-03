/**
 * 行情中心模块 - 东方财富API真实K线数据
 */

let chartInstance = null;
let currentChartType = 'kline';

// 自选股缓存
const stockInfoCache = {};

function initCharts() {
    initChartTabs();
    initStockSearch();

    // 默认加载上证指数
    loadChart('000001');
}

function initChartTabs() {
    const tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const chartType = tab.dataset.chart;
            currentChartType = chartType;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const searchInput = document.getElementById('stockSearch');
            const code = searchInput?.value || '000001';
            loadChart(code);
        });
    });
}

function initStockSearch() {
    const searchInput = document.getElementById('stockSearch');
    const loadBtn = document.getElementById('loadChart');

    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            const code = searchInput.value.trim();
            if (code) loadChart(code);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const code = searchInput.value.trim();
                if (code) loadChart(code);
            }
        });
    }
}

// 根据代码判断交易所
function getMarketCode(code) {
    code = String(code).trim();
    if (code.length < 6) code = code.padStart(6, '0');

    const firstChar = code[0];
    // 深市: 0开头或3开头(创业板)
    if (firstChar === '0' || firstChar === '3') {
        return '0.' + code;
    }
    // 沪市: 6开头或科创688
    return '1.' + code;
}

// 获取股票名称
async function fetchStockName(code) {
    const cacheKey = getMarketCode(code);
    if (stockInfoCache[cacheKey]) return stockInfoCache[cacheKey];

    const url = 'https://push2.eastmoney.com/api/qt/stock/get?secid=' + cacheKey + '&fields=f57,f58';
    try {
        const r = await fetch(url);
        const data = await r.json();
        if (data && data.data) {
            stockInfoCache[cacheKey] = data.data.f58 || code;
            return data.data.f58 || code;
        }
    } catch (e) {
        console.error('获取股票名称失败:', e);
    }
    return code;
}

// 获取K线数据
async function fetchKLineData(code, period = 'day', limit = 200) {
    const secid = getMarketCode(code);

    // klt: 101=日线, 102=周线, 103=月线, 60=60分钟, 30=30分钟, 15=15分钟, 5=5分钟, 1=1分钟
    const kltMap = { day: 101, week: 102, month: 103, m60: 60, m30: 30, m15: 15, m5: 5, m1: 1 };
    const klt = kltMap[period] || 101;

    const url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get' +
        '?secid=' + secid +
        '&fields1=f1,f2,f3,f4,f5,f6' +
        '&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61' +
        '&klt=' + klt +
        '&fqt=0' +
        '&end=20500101' +
        '&lmt=' + limit;

    try {
        const r = await fetch(url);
        const data = await r.json();
        if (data && data.data && data.data.klines) {
            return data.data.klines.map(line => {
                const parts = line.split(',');
                // f51=日期, f52=开盘, f53=收盘, f54=最高, f55=最低, f56=成交量, f57=成交额, f58=振幅, f59=涨跌幅, f60=涨跌额, f61=换手率
                return {
                    time: parts[0],
                    open: parseFloat(parts[1]),
                    close: parseFloat(parts[2]),
                    high: parseFloat(parts[3]),
                    low: parseFloat(parts[4]),
                    volume: parseFloat(parts[5]),
                    amount: parseFloat(parts[6]),
                    amplitude: parseFloat(parts[7]),
                    changePct: parseFloat(parts[8]),
                    change: parseFloat(parts[9]),
                    turnover: parseFloat(parts[10])
                };
            });
        }
    } catch (e) {
        console.error('获取K线数据失败:', e);
    }
    return null;
}

// 获取分时数据
async function fetchMinuteData(code) {
    const secid = getMarketCode(code);
    // 1分钟K线作为分时数据源
    const url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get' +
        '?secid=' + secid +
        '&fields1=f1,f2,f3,f4,f5,f6' +
        '&fields2=f51,f52,f53,f54,f55,f56' +
        '&klt=1' +
        '&fqt=0' +
        '&end=20500101' +
        '&lmt=240';

    try {
        const r = await fetch(url);
        const data = await r.json();
        if (data && data.data && data.data.klines && data.data.klines.length > 0) {
            return data.data.klines.map(line => {
                const parts = line.split(',');
                const dt = parts[0];  // 格式: 2026-06-03 09:30
                const dateTime = new Date(dt);
                return {
                    time: Math.floor(dateTime.getTime() / 1000),
                    value: parseFloat(parts[2])  // 收盘价
                };
            });
        }
    } catch (e) {
        console.error('获取分时数据失败:', e);
    }
    return null;
}

// ============================================
// 主加载函数
// ============================================
async function loadChart(code) {
    const container = document.getElementById('chartArea');
    if (!container) return;

    const searchInput = document.getElementById('stockSearch');
    if (searchInput) searchInput.value = code;

    // 显示加载状态
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px;">⏳ 加载行情数据...</div>';

    try {
        const name = await fetchStockName(code);
        const stock = { code, name, price: 0 };

        if (currentChartType === 'kline') {
            const klineData = await fetchKLineData(code, 'day', 200);
            if (klineData && klineData.length > 0) {
                stock.price = klineData[klineData.length - 1].close;
                renderKLineChart(container, stock, klineData);
            } else {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px;">❌ 无法获取K线数据，请检查股票代码</div>';
            }
        } else {
            const minuteData = await fetchMinuteData(code);
            if (minuteData && minuteData.length > 0) {
                stock.price = minuteData[minuteData.length - 1].value;
                renderTimeSeriesChart(container, stock, minuteData);
            } else {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px;">❌ 未获取到分时数据（可能已收盘）</div>';
            }
        }
    } catch (e) {
        console.error('加载图表失败:', e);
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-down);font-size:14px;">❌ 加载失败: 网络异常或股票代码无效</div>';
    }
}

// ============================================
// K线图渲染（使用真实数据）
// ============================================
function renderKLineChart(container, stock, rawData) {
    container.innerHTML = '';

    // 转换数据格式
    const candlestickData = rawData.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
    }));

    const volumeData = rawData.map(d => {
        const color = d.close >= d.open
            ? 'rgba(16,185,129,0.5)'
            : 'rgba(239,68,68,0.5)';
        return { time: d.time, value: d.volume, color };
    });

    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            background: { color: '#1a1f2e' },
            textColor: '#9ca3af',
        },
        grid: {
            vertLines: { color: '#2d3748' },
            horzLines: { color: '#2d3748' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#2d3748',
            scaleMargins: { top: 0.05, bottom: 0.25 },
        },
        timeScale: {
            borderColor: '#2d3748',
            timeVisible: true,
            secondsVisible: false,
        },
    });

    // K线
    const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
    });
    candlestickSeries.setData(candlestickData);

    // 成交量
    const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        scaleMargins: { top: 0.78, bottom: 0 },
    });
    volumeSeries.setData(volumeData);

    // MA5
    const ma5Data = calculateMA(candlestickData, 5);
    if (ma5Data.length > 0) {
        const ma5 = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'MA5' });
        ma5.setData(ma5Data);
    }

    // MA10
    const ma10Data = calculateMA(candlestickData, 10);
    if (ma10Data.length > 0) {
        const ma10 = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, title: 'MA10' });
        ma10.setData(ma10Data);
    }

    // MA20
    const ma20Data = calculateMA(candlestickData, 20);
    if (ma20Data.length > 0) {
        const ma20 = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, title: 'MA20' });
        ma20.setData(ma20Data);
    }

    // MA60
    if (candlestickData.length >= 60) {
        const ma60Data = calculateMA(candlestickData, 60);
        const ma60 = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 1, title: 'MA60' });
        ma60.setData(ma60Data);
    }

    chart.timeScale().fitContent();

    // 响应式
    const handleResize = () => {
        chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
        });
    };
    window.addEventListener('resize', handleResize);

    chartInstance = chart;
}

// ============================================
// 分时图渲染
// ============================================
function renderTimeSeriesChart(container, stock, data) {
    container.innerHTML = '';

    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            background: { color: '#1a1f2e' },
            textColor: '#9ca3af',
        },
        grid: {
            vertLines: { color: '#2d3748' },
            horzLines: { color: '#2d3748' },
        },
        rightPriceScale: {
            borderColor: '#2d3748',
        },
        timeScale: {
            borderColor: '#2d3748',
            timeVisible: true,
            secondsVisible: false,
        },
    });

    // 判断涨跌颜色
    const firstPrice = data[0]?.value || 0;
    const lastPrice = data[data.length - 1]?.value || 0;
    const isUp = lastPrice >= firstPrice;
    const lineColor = isUp ? '#ef4444' : '#10b981';
    const topColor = (isUp ? 'rgba(239,68,68,' : 'rgba(16,185,129,') + '0.35)';
    const bottomColor = (isUp ? 'rgba(239,68,68,' : 'rgba(16,185,129,') + '0.05)';

    const areaSeries = chart.addAreaSeries({
        topColor, bottomColor, lineColor, lineWidth: 2,
    });
    areaSeries.setData(data);

    // 均价线
    if (data.length > 1) {
        const sum = data.reduce((s, d) => s + d.value, 0);
        const avg = sum / data.length;
        const avgData = [
            { time: data[0].time, value: avg },
            { time: data[data.length - 1].time, value: avg }
        ];
        const avgSeries = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, lineStyle: 2, title: '均价' });
        avgSeries.setData(avgData);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
        chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
        });
    };
    window.addEventListener('resize', handleResize);

    chartInstance = chart;
}

// ============================================
// 工具函数
// ============================================
function calculateMA(data, period) {
    if (data.length < period) return [];
    const maData = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        maData.push({
            time: data[i].time,
            value: parseFloat((sum / period).toFixed(2)),
        });
    }
    return maData;
}
