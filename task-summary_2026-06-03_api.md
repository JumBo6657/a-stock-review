# 接入真实API - 2026-06-03

## 方案
方案A：前端直连东方财富免费公开API，无需后端、无需密钥。

## 改动文件

### 1. js/dashboard.js（重写）
接入API：
- **指数行情** → `push2.eastmoney.com/api/qt/ulist.np/get` (上证/深证/创业板/科创50)
- **板块热度** → `push2.eastmoney.com/api/qt/clist/get?fs=m:90+t:2` (行业板块涨跌)
- **涨跌停统计** → 从个股排名API中筛选涨停(>=9.9%)和跌停(<=-9.9%)
- **涨跌家数** → 基于300只样本股涨跌分布推算
- **市场情绪分** → 根据涨跌比计算0-100分数
- **涨幅榜/跌幅榜TOP8** → 单独的涨幅/跌幅排名查询

新增功能：
- 自动缓存（避免频繁请求）：指数10秒、板块30秒、个股排名15秒
- 交易时段每30秒自动刷新
- 刷新按钮带loading状态
- 市场状态指示（交易中/收盘）

### 2. js/charts.js（重写）
- **K线图** → `push2his.eastmoney.com/api/qt/stock/kline/get?klt=101` (日线)
- **分时图** → 1分钟K线作为分时数据源
- 自动识别沪深市场（0/3开头→深市，6→沪市）
- 股票名称自动查询显示
- 加载失败友好提示
- 真实MA5/MA10/MA20/MA60均线

### 3. index.html
- 移除资金流向（mock数据），替换为涨幅榜TOP8 + 跌幅榜TOP8
- 点击榜上股票直接跳转K线图

### 4. css/style.css
- 新增涨幅榜/跌幅榜列表样式

## API 端点
所有接口来自东方财富，支持CORS，无需密钥：
| 用途 | 端点 |
|------|------|
| 指数行情 | push2.eastmoney.com/api/qt/ulist.np/get |
| 板块行情 | push2.eastmoney.com/api/qt/clist/get |
| 个股排名 | push2.eastmoney.com/api/qt/clist/get |
| K线数据 | push2his.eastmoney.com/api/qt/stock/kline/get |
| 股票信息 | push2.eastmoney.com/api/qt/stock/get |

## 部署
- Git commit: a42237d，已推送 main
- GitHub Pages: https://jumbo6657.github.io/a-stock-review/
