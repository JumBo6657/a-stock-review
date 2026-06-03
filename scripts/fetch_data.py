#!/usr/bin/env python3
"""A鑲″鐩樼綉绔?- 鏁版嵁鎶撳彇鑴氭湰
浠庝笢鏂硅储瀵孉PI鑾峰彇瀹炴椂琛屾儏鏁版嵁锛岀敓鎴怞SON鏂囦欢渚涚綉绔欒鍙?"""
import json, urllib.request, os, sys, time

API = "https://push2.eastmoney.com/api/qt"
API_HIS = "https://push2his.eastmoney.com/api/qt"
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://quote.eastmoney.com/"
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2)
            else:
                raise e

def fetch_indices():
    """鑾峰彇鍥涘ぇ鎸囨暟"""
    url = f"{API}/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=1.000001,0.399001,0.399006,1.000688"
    data = fetch(url)
    result = []
    for d in data["data"]["diff"]:
        result.append({
            "code": d["f12"],
            "name": d["f14"],
            "price": d["f2"],
            "change": d["f4"],
            "changePct": d["f3"]
        })
    return result

def fetch_sectors():
    """鑾峰彇琛屼笟鏉垮潡"""
    url = f"{API}/clist/get?pn=1&pz=80&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f2,f3,f12,f14"
    data = fetch(url)
    result = []
    for d in data["data"]["diff"]:
        result.append({
            "code": d["f12"],
            "name": d["f14"],
            "price": d["f2"],
            "changePct": d["f3"]
        })
    return result

def fetch_ranking(sort="desc", count=500):
    """鑾峰彇涓偂鎺掑悕锛堝垎椤碉級"""
    order = 0 if sort == "desc" else 1
    result = []
    per_page = 100
    pages = (count + per_page - 1) // per_page
    for pn in range(1, pages + 1):
        url = f"{API}/clist/get?pn={pn}&pz={per_page}&po={order}&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f2,f3,f4,f12,f14"
        data = fetch(url)
        for d in data["data"]["diff"]:
            result.append({
                "code": d["f12"],
                "name": d["f14"],
                "price": d["f2"],
                "changePct": d["f3"],
                "change": d["f4"]
            })
        if len(data["data"]["diff"]) < per_page:
            break
    return result

def fetch_klines(code, count=200):
    """鑾峰彇涓偂K绾?""
    first = code[0]
    market = "0" if first in ("0", "3") else "1"
    url = f"{API_HIS}/stock/kline/get?secid={market}.{code}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=0&end=20500101&lmt={count}"
    data = fetch(url)
    klines = []
    for line in data["data"]["klines"]:
        parts = line.split(",")
        klines.append({
            "date": parts[0],
            "open": float(parts[1]),
            "close": float(parts[2]),
            "high": float(parts[3]),
            "low": float(parts[4]),
            "volume": float(parts[5]),
            "amount": float(parts[6])
        })
    return {
        "code": code,
        "name": data["data"]["name"],
        "klines": klines
    }

def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    print("= 鑾峰彇鎸囨暟鏁版嵁...")
    indices = fetch_indices()
    with open(os.path.join(DATA_DIR, "indices.json"), "w", encoding="utf-8") as f:
        json.dump(indices, f, ensure_ascii=False)
    print(f"   OK {len(indices)} 涓寚鏁?)
    time.sleep(1)

    print("= 鑾峰彇鏉垮潡鏁版嵁...")
    sectors = fetch_sectors()
    with open(os.path.join(DATA_DIR, "sectors.json"), "w", encoding="utf-8") as f:
        json.dump(sectors, f, ensure_ascii=False)
    print(f"   OK {len(sectors)} 涓澘鍧?)
    time.sleep(1)

    print("= 鑾峰彇鍏ㄥ競鍦烘帓鍚?..")
    all_stocks = fetch_ranking("desc", 500)
    with open(os.path.join(DATA_DIR, "ranking.json"), "w", encoding="utf-8") as f:
        json.dump(all_stocks, f, ensure_ascii=False)

    # 娑ㄨ穼缁熻
    up_count = sum(1 for s in all_stocks if s["changePct"] > 0)
    down_count = sum(1 for s in all_stocks if s["changePct"] < 0)
    limit_up = sum(1 for s in all_stocks if s["changePct"] >= 9.9)
    limit_down = sum(1 for s in all_stocks if s["changePct"] <= -9.9)
    top_gainers = [s for s in all_stocks[:20] if s["changePct"] > 0][:8]
    top_losers = [s for s in all_stocks if s["changePct"] < 0][:8]

    market = {
        "upCount": up_count,
        "downCount": down_count,
        "flatCount": 500 - up_count - down_count,
        "limitUp": limit_up,
        "limitDown": limit_down,
        "topGainers": top_gainers,
        "topLosers": top_losers
    }
    with open(os.path.join(DATA_DIR, "market.json"), "w", encoding="utf-8") as f:
        json.dump(market, f, ensure_ascii=False)
    print(f"   OK 娑▄up_count} 璺寋down_count} 娑ㄥ仠{limit_up} 璺屽仠{limit_down}")
    time.sleep(1)

    # 棰勫姞杞藉嚑涓狵绾?    print("= 鑾峰彇K绾挎暟鎹?..")
    for code in ["000001", "399001", "600519"]:
        kd = fetch_klines(code, 200)
        fname = f"kline_{code}.json"
        with open(os.path.join(DATA_DIR, fname), "w", encoding="utf-8") as f:
            json.dump(kd, f, ensure_ascii=False)
        print(f"   OK {kd['name']} ({code})")
        time.sleep(1)

    # 鏇存柊鏃堕棿鎴?    from datetime import datetime
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(os.path.join(DATA_DIR, "updated.txt"), "w", encoding="utf-8") as f:
        f.write(ts)
    print(f"\nDone! {DATA_DIR}/")
    print(f"Updated: {ts}")

if __name__ == "__main__":
    main()
