/**
 * 大盘情绪模块
 */

function initDashboard() {
    renderSectorHeatmap();
    renderCapitalFlow();
}

// 渲染板块热力图
function renderSectorHeatmap() {
    const container = document.getElementById('sectorGrid');
    if (!container) return;
    
    container.innerHTML = MOCK_SECTORS.map(sector => {
        const intensity = Math.abs(sector.change) / 6; // 最大6%为满色
        const opacity = Math.min(intensity, 1);
        const color = sector.change >= 0 
            ? `rgba(16, 185, 129, ${Math.max(opacity, 0.2)})`
            : `rgba(239, 68, 68, ${Math.max(opacity, 0.2)})`;
        
        return `
            <div class="sector-item" style="background: ${color}">
                <span class="sector-name">${sector.name}</span>
                <span class="sector-change ${sector.change >= 0 ? 'up' : 'down'}">
                    ${formatPercent(sector.change)}
                </span>
            </div>
        `;
    }).join('');
}

// 渲染资金流向（使用Canvas绘制简单柱状图）
function renderCapitalFlow() {
    const container = document.getElementById('capitalFlowChart');
    if (!container) return;
    
    // 模拟资金流向数据
    const flowData = [
        { name: '主力流入', value: 285.6 },
        { name: '主力流出', value: -198.3 },
        { name: '散户流入', value: 156.8 },
        { name: '散户流出', value: -243.9 }
    ];
    
    const maxValue = Math.max(...flowData.map(d => Math.abs(d.value)));
    
    container.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; gap: 12px; padding: 10px;">
            ${flowData.map(item => {
                const width = (Math.abs(item.value) / maxValue * 100).toFixed(1);
                const color = item.value >= 0 ? 'var(--color-up)' : 'var(--color-down)';
                const label = item.value >= 0 ? '流入' : '流出';
                return `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="width: 80px; font-size: 12px; color: var(--text-secondary);">${item.name}</span>
                        <div style="flex: 1; height: 24px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${width}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 1s ease;"></div>
                        </div>
                        <span style="width: 80px; text-align: right; font-family: var(--font-mono); font-size: 13px; color: ${color};">
                            ${Math.abs(item.value).toFixed(1)}亿
                        </span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// 刷新大盘数据
function refreshDashboard() {
    // 模拟数据更新
    const indices = document.querySelectorAll('.index-value');
    indices.forEach(index => {
        const currentValue = parseFloat(index.textContent.replace(',', ''));
        const change = (Math.random() - 0.5) * 10;
        index.textContent = (currentValue + change).toFixed(2);
    });
    
    // 更新涨跌家数
    const adValues = document.querySelectorAll('.ad-value');
    if (adValues.length >= 3) {
        const up = Math.floor(2500 + Math.random() * 1500);
        const down = Math.floor(1000 + Math.random() * 1000);
        const neutral = 5000 - up - down;
        adValues[0].textContent = up;
        adValues[1].textContent = down;
        adValues[2].textContent = neutral;
        
        // 更新进度条
        const fills = document.querySelectorAll('.ad-fill');
        fills[0].style.width = `${up / 50}%`;
        fills[1].style.width = `${down / 50}%`;
        fills[2].style.width = `${neutral / 50}%`;
    }
    
    renderSectorHeatmap();
    renderCapitalFlow();
}

// 绑定刷新按钮
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDashboard);
    }
});
