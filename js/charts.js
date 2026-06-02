/**
 * 行情中心模块
 */

let chartInstance = null;
let currentChartType = 'kline';

function initCharts() {
    initChartTabs();
    initStockSearch();
    
    // 默认加载一只股票
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
            
            // 重新加载当前股票的图表
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
            if (code) {
                loadChart(code);
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const code = searchInput.value.trim();
                if (code) {
                    loadChart(code);
                }
            }
        });
    }
}

function loadChart(code) {
    const container = document.getElementById('chartArea');
    if (!container) return;
    
    // 查找股票信息
    const stock = MOCK_STOCKS.find(s => s.code === code) || {
        code: code,
        name: '未知股票',
        price: 100
    };
    
    // 清空容器
    container.innerHTML = '';
    
    if (currentChartType === 'kline') {
        renderKLineChart(container, stock);
    } else {
        renderTimeSeriesChart(container, stock);
    }
}

function renderKLineChart(container, stock) {
    // 生成模拟K线数据
    const data = generateKLineData(stock.price);
    
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
        },
        timeScale: {
            borderColor: '#2d3748',
        },
    });
    
    const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
    });
    
    candlestickSeries.setData(data);
    
    // 添加成交量
    const volumeData = data.map(d => ({
        time: d.time,
        value: Math.floor(Math.random() * 1000000) + 500000,
        color: d.close >= d.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
    }));
    
    const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
            top: 0.8,
            bottom: 0,
        },
    });
    
    volumeSeries.setData(volumeData);
    
    // 添加移动平均线
    const ma20Data = calculateMA(data, 20);
    const ma20Series = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1,
        title: 'MA20',
    });
    ma20Series.setData(ma20Data);
    
    const ma60Data = calculateMA(data, 60);
    const ma60Series = chart.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 1,
        title: 'MA60',
    });
    ma60Series.setData(ma60Data);
    
    chart.timeScale().fitContent();
    
    // 响应式
    window.addEventListener('resize', () => {
        chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
        });
    });
    
    chartInstance = chart;
}

function renderTimeSeriesChart(container, stock) {
    // 生成模拟分时数据
    const data = generateTimeSeriesData(stock.price);
    
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
    
    const areaSeries = chart.addAreaSeries({
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.05)',
        lineColor: '#3b82f6',
        lineWidth: 2,
    });
    
    areaSeries.setData(data);
    
    // 添加均价线
    const avgData = data.map((d, i) => ({
        time: d.time,
        value: d.value * (1 + (Math.random() - 0.5) * 0.002)
    }));
    
    const avgSeries = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1,
        title: '均价',
    });
    avgSeries.setData(avgData);
    
    chart.timeScale().fitContent();
    
    window.addEventListener('resize', () => {
        chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
        });
    });
    
    chartInstance = chart;
}

// 生成K线数据
function generateKLineData(basePrice) {
    const data = [];
    let price = basePrice * 0.8;
    const now = new Date();
    
    for (let i = 100; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const change = (Math.random() - 0.48) * 0.05;
        const open = price;
        const close = price * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);
        
        data.push({
            time: date.toISOString().split('T')[0],
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
        });
        
        price = close;
    }
    
    return data;
}

// 生成分时数据
function generateTimeSeriesData(basePrice) {
    const data = [];
    let price = basePrice;
    const now = new Date();
    now.setHours(9, 30, 0, 0);
    
    for (let i = 0; i < 240; i++) { // 4小时交易时间
        const time = new Date(now);
        time.setMinutes(time.getMinutes() + i);
        
        const change = (Math.random() - 0.48) * 0.002;
        price = price * (1 + change);
        
        data.push({
            time: time.getTime() / 1000,
            value: parseFloat(price.toFixed(2)),
        });
    }
    
    return data;
}

// 计算移动平均线
function calculateMA(data, period) {
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
