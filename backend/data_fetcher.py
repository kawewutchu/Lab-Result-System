import asyncio
import yfinance as yf
import pandas as pd
import numpy as np
import requests
import httpx
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "")

CRYPTO_SYMBOLS = {
    "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD",
    "ADA-USD", "AVAX-USD", "DOT-USD", "MATIC-USD", "LINK-USD"
}


def detect_market(symbol: str) -> str:
    if symbol.endswith(".HK"):
        return "China"
    if symbol in CRYPTO_SYMBOLS or "-USD" in symbol:
        return "Crypto"
    return "US"


def calculate_rsi(prices: pd.Series, period: int = 14) -> float:
    try:
        delta = prices.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.rolling(window=period, min_periods=period).mean()
        avg_loss = loss.rolling(window=period, min_periods=period).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        val = rsi.iloc[-1]
        return round(float(val), 2) if not np.isnan(val) else 50.0
    except Exception:
        return 50.0


def calculate_macd(prices: pd.Series):
    try:
        ema12 = prices.ewm(span=12, adjust=False).mean()
        ema26 = prices.ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line

        macd_val = float(macd_line.iloc[-1])
        signal_val = float(signal_line.iloc[-1])
        hist_val = float(histogram.iloc[-1])

        prev_hist = float(histogram.iloc[-2]) if len(histogram) > 1 else 0.0
        if hist_val > 0 and prev_hist <= 0:
            crossover = "Bullish crossover"
        elif hist_val < 0 and prev_hist >= 0:
            crossover = "Bearish crossover"
        elif hist_val > prev_hist:
            crossover = "Rising"
        else:
            crossover = "Falling"

        return {
            "macd_line": round(macd_val, 4),
            "signal_line": round(signal_val, 4),
            "histogram": round(hist_val, 4),
            "crossover": crossover,
        }
    except Exception:
        return {"macd_line": 0.0, "signal_line": 0.0, "histogram": 0.0, "crossover": "N/A"}


def calculate_stochastic(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14):
    try:
        lowest_low = low.rolling(window=period).min()
        highest_high = high.rolling(window=period).max()
        denom = highest_high - lowest_low
        denom = denom.replace(0, np.nan)
        k = 100 * (close - lowest_low) / denom
        d = k.rolling(window=3).mean()
        k_val = float(k.iloc[-1])
        d_val = float(d.iloc[-1])
        return {
            "stoch_k": round(k_val, 2) if not np.isnan(k_val) else 50.0,
            "stoch_d": round(d_val, 2) if not np.isnan(d_val) else 50.0,
        }
    except Exception:
        return {"stoch_k": 50.0, "stoch_d": 50.0}


def calculate_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> float:
    try:
        prev_close = close.shift(1)
        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = true_range.rolling(window=period).mean()
        val = float(atr.iloc[-1])
        return round(val, 4) if not np.isnan(val) else 0.0
    except Exception:
        return 0.0


def calculate_bollinger_bands(prices: pd.Series, period: int = 20, std_dev: float = 2.0):
    try:
        sma = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        upper = sma + (std_dev * std)
        lower = sma - (std_dev * std)

        upper_val = float(upper.iloc[-1])
        lower_val = float(lower.iloc[-1])
        middle_val = float(sma.iloc[-1])
        price_val = float(prices.iloc[-1])

        bb_range = upper_val - lower_val
        bb_position = (price_val - lower_val) / bb_range if bb_range != 0 else 0.5
        bb_width = bb_range / middle_val if middle_val != 0 else 0.0

        return {
            "bb_upper": round(upper_val, 4),
            "bb_middle": round(middle_val, 4),
            "bb_lower": round(lower_val, 4),
            "bb_position": round(bb_position, 4),
            "bb_width": round(bb_width, 4),
        }
    except Exception:
        return {
            "bb_upper": 0.0, "bb_middle": 0.0, "bb_lower": 0.0,
            "bb_position": 0.5, "bb_width": 0.0
        }


def find_swing_levels(prices: pd.Series, window: int = 5, n_levels: int = 3):
    """Find recent swing highs and lows."""
    try:
        recent = prices.tail(60)
        highs = []
        lows = []
        for i in range(window, len(recent) - window):
            val = recent.iloc[i]
            window_vals = recent.iloc[i - window: i + window + 1]
            if val == window_vals.max():
                highs.append(round(float(val), 4))
            if val == window_vals.min():
                lows.append(round(float(val), 4))
        highs = sorted(list(set(highs)), reverse=True)[:n_levels]
        lows = sorted(list(set(lows)), reverse=False)[:n_levels]
        return highs, lows
    except Exception:
        return [], []


def get_simple_sentiment(title: str) -> str:
    title_lower = title.lower()
    positive_words = [
        "surge", "rally", "gain", "rise", "up", "bullish", "growth", "profit",
        "beat", "record", "high", "strong", "positive", "buy", "upgrade", "outperform"
    ]
    negative_words = [
        "crash", "fall", "drop", "decline", "down", "bearish", "loss", "miss",
        "low", "weak", "negative", "sell", "downgrade", "underperform", "risk", "warn"
    ]
    pos_count = sum(1 for w in positive_words if w in title_lower)
    neg_count = sum(1 for w in negative_words if w in title_lower)
    if pos_count > neg_count:
        return "Positive"
    elif neg_count > pos_count:
        return "Negative"
    return "Neutral"


def fetch_news(symbol: str) -> dict:
    """Fetch news headlines using NewsAPI."""
    default_headlines = [
        {"title": "No news available", "source": "N/A", "published_at": "N/A", "sentiment": "Neutral"}
        for _ in range(5)
    ]
    if not NEWS_API_KEY:
        return {"headlines": default_headlines, "aggregate_sentiment": 5.0}

    try:
        query = symbol.replace("-USD", "").replace(".HK", "")
        url = (
            f"https://newsapi.org/v2/everything?q={query}"
            f"&sortBy=publishedAt&pageSize=10&apiKey={NEWS_API_KEY}"
        )
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return {"headlines": default_headlines, "aggregate_sentiment": 5.0}

        data = response.json()
        articles = data.get("articles", [])
        headlines = []
        sentiment_scores = []

        for article in articles[:10]:
            title = article.get("title", "")
            source = article.get("source", {}).get("name", "Unknown")
            published_at = article.get("publishedAt", "")
            sentiment = get_simple_sentiment(title)
            sentiment_score = 7 if sentiment == "Positive" else 3 if sentiment == "Negative" else 5
            sentiment_scores.append(sentiment_score)
            headlines.append({
                "title": title,
                "source": source,
                "published_at": published_at,
                "sentiment": sentiment,
            })

        aggregate = float(np.mean(sentiment_scores)) if sentiment_scores else 5.0
        return {
            "headlines": headlines if headlines else default_headlines,
            "aggregate_sentiment": round(aggregate, 2)
        }
    except Exception:
        return {"headlines": default_headlines, "aggregate_sentiment": 5.0}


def fetch_fear_greed() -> int:
    """Fetch Crypto Fear & Greed Index."""
    try:
        response = requests.get("https://api.alternative.me/fng/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            value = int(data["data"][0]["value"])
            return value
    except Exception:
        pass
    return 50


def fetch_macro_data() -> dict:
    """Fetch macro economic indicators."""
    result = {
        "dxy": None,
        "us10y": None,
        "vix": None,
        "fed_rate": "5.25-5.50%",
        "spy_price": None,
    }
    macro_tickers = {
        "dxy": "DX-Y.NYB",
        "us10y": "^TNX",
        "vix": "^VIX",
        "spy": "SPY",
    }
    for key, ticker_sym in macro_tickers.items():
        try:
            t = yf.Ticker(ticker_sym)
            hist = t.history(period="5d")
            if not hist.empty:
                val = float(hist["Close"].iloc[-1])
                if key == "spy":
                    result["spy_price"] = round(val, 2)
                else:
                    result[key] = round(val, 4)
        except Exception:
            pass
    return result


async def fetch_context_package(symbol: str) -> dict:
    """Main function to fetch all data for a symbol and return a context package."""
    symbol = symbol.upper().strip()
    market_type = detect_market(symbol)

    price_data = {}
    fundamentals = {}
    news_data = {}
    macro_data = {}

    # ---- Price data via yfinance ----
    try:
        ticker = yf.Ticker(symbol)
        hist_1y = ticker.history(period="1y")
        hist_5d_1h = ticker.history(period="5d", interval="1h")

        if hist_1y.empty:
            price_data["error"] = "No price data available"
        else:
            close = hist_1y["Close"]
            high = hist_1y["High"]
            low = hist_1y["Low"]
            volume = hist_1y["Volume"]

            current_price = float(close.iloc[-1])
            prev_close = float(close.iloc[-2]) if len(close) > 1 else current_price
            open_price = float(hist_1y["Open"].iloc[-1])
            high_today = float(high.iloc[-1])
            low_today = float(low.iloc[-1])
            change = current_price - prev_close
            change_pct = (change / prev_close * 100) if prev_close != 0 else 0.0

            volume_today = float(volume.iloc[-1])
            avg_volume_10d = float(volume.tail(10).mean()) if len(volume) >= 10 else float(volume.mean())
            avg_volume_30d = float(volume.tail(30).mean()) if len(volume) >= 30 else float(volume.mean())
            volume_ratio = (volume_today / avg_volume_10d) if avg_volume_10d != 0 else 1.0
            unusual_volume_flag = volume_ratio > 2.0

            high_52w = float(high.max())
            low_52w = float(low.min())
            pct_from_52w_high = ((current_price - high_52w) / high_52w * 100) if high_52w != 0 else 0.0

            # Returns
            year_start = datetime(datetime.now().year, 1, 1)
            ytd_data = hist_1y[hist_1y.index >= str(year_start.date())]
            if not ytd_data.empty:
                ytd_start_price = float(ytd_data["Close"].iloc[0])
                return_ytd = ((current_price - ytd_start_price) / ytd_start_price * 100) if ytd_start_price != 0 else 0.0
            else:
                return_ytd = 0.0

            if len(close) >= 21:
                return_1m = float(((close.iloc[-1] - close.iloc[-21]) / close.iloc[-21]) * 100)
            else:
                return_1m = 0.0
            if len(close) >= 63:
                return_3m = float(((close.iloc[-1] - close.iloc[-63]) / close.iloc[-63]) * 100)
            else:
                return_3m = 0.0

            # Moving averages
            sma20 = float(close.rolling(20).mean().iloc[-1]) if len(close) >= 20 else current_price
            sma50 = float(close.rolling(50).mean().iloc[-1]) if len(close) >= 50 else current_price
            sma100 = float(close.rolling(100).mean().iloc[-1]) if len(close) >= 100 else current_price
            sma200 = float(close.rolling(200).mean().iloc[-1]) if len(close) >= 200 else current_price
            ema9 = float(close.ewm(span=9, adjust=False).mean().iloc[-1])
            ema21 = float(close.ewm(span=21, adjust=False).mean().iloc[-1])

            # Golden/death cross detection
            sma50_series = close.rolling(50).mean()
            sma200_series = close.rolling(200).mean()
            golden_cross = False
            death_cross = False
            if len(sma50_series.dropna()) >= 2 and len(sma200_series.dropna()) >= 2:
                curr_diff = sma50_series.iloc[-1] - sma200_series.iloc[-1]
                prev_diff = sma50_series.iloc[-2] - sma200_series.iloc[-2]
                if curr_diff > 0 and prev_diff <= 0:
                    golden_cross = True
                elif curr_diff < 0 and prev_diff >= 0:
                    death_cross = True

            rsi_14 = calculate_rsi(close)
            macd = calculate_macd(close)
            stoch = calculate_stochastic(high, low, close)
            atr_14 = calculate_atr(high, low, close)
            atr_pct = (atr_14 / current_price * 100) if current_price != 0 else 0.0
            bb = calculate_bollinger_bands(close)

            # Trend
            if current_price > sma200 and sma50 > sma200:
                trend_daily = "Uptrend"
            elif current_price < sma200 and sma50 < sma200:
                trend_daily = "Downtrend"
            else:
                trend_daily = "Sideways"

            # Weekly trend
            try:
                hist_weekly = ticker.history(period="2y", interval="1wk")
                if not hist_weekly.empty and len(hist_weekly) >= 10:
                    wclose = hist_weekly["Close"]
                    wsma20 = float(wclose.rolling(20).mean().iloc[-1]) if len(wclose) >= 20 else float(wclose.mean())
                    if current_price > wsma20:
                        trend_weekly = "Uptrend"
                    else:
                        trend_weekly = "Downtrend"
                else:
                    trend_weekly = trend_daily
            except Exception:
                trend_weekly = trend_daily

            # Support/resistance
            swing_highs, swing_lows = find_swing_levels(close)

            # Correlation with SPY
            correlation_spy_30d = None
            try:
                spy = yf.Ticker("SPY")
                spy_hist = spy.history(period="3mo")
                if not spy_hist.empty:
                    spy_close = spy_hist["Close"].tail(30)
                    sym_close = close.tail(30)
                    if len(spy_close) == len(sym_close) and len(sym_close) > 5:
                        spy_ret = spy_close.pct_change().dropna()
                        sym_ret = sym_close.pct_change().dropna()
                        min_len = min(len(spy_ret), len(sym_ret))
                        if min_len > 5:
                            corr = float(np.corrcoef(spy_ret.tail(min_len), sym_ret.tail(min_len))[0, 1])
                            correlation_spy_30d = round(corr, 4)
            except Exception:
                correlation_spy_30d = None

            price_data = {
                "current_price": round(current_price, 4),
                "open": round(open_price, 4),
                "high": round(high_today, 4),
                "low": round(low_today, 4),
                "prev_close": round(prev_close, 4),
                "change": round(change, 4),
                "change_pct": round(change_pct, 2),
                "volume_today": int(volume_today),
                "avg_volume_10d": int(avg_volume_10d),
                "avg_volume_30d": int(avg_volume_30d),
                "volume_ratio": round(volume_ratio, 2),
                "unusual_volume_flag": unusual_volume_flag,
                "52w_high": round(high_52w, 4),
                "52w_low": round(low_52w, 4),
                "pct_from_52w_high": round(pct_from_52w_high, 2),
                "return_1m": round(return_1m, 2),
                "return_3m": round(return_3m, 2),
                "return_ytd": round(return_ytd, 2),
                "SMA20": round(sma20, 4),
                "SMA50": round(sma50, 4),
                "SMA100": round(sma100, 4),
                "SMA200": round(sma200, 4),
                "EMA9": round(ema9, 4),
                "EMA21": round(ema21, 4),
                "golden_cross": golden_cross,
                "death_cross": death_cross,
                "RSI_14": rsi_14,
                "MACD_line": macd["macd_line"],
                "MACD_signal": macd["signal_line"],
                "MACD_histogram": macd["histogram"],
                "MACD_crossover": macd["crossover"],
                "stoch_k": stoch["stoch_k"],
                "stoch_d": stoch["stoch_d"],
                "ATR_14": round(atr_14, 4),
                "ATR_pct": round(atr_pct, 2),
                "BB_upper": bb["bb_upper"],
                "BB_middle": bb["bb_middle"],
                "BB_lower": bb["bb_lower"],
                "BB_position": bb["bb_position"],
                "BB_width": bb["bb_width"],
                "trend_daily": trend_daily,
                "trend_weekly": trend_weekly,
                "support_levels": swing_lows,
                "resistance_levels": swing_highs,
                "correlation_spy_30d": correlation_spy_30d,
            }

    except Exception as e:
        price_data = {"error": str(e), "current_price": 0.0}

    # ---- Fundamentals via yfinance ----
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        def safe_get(key, default="N/A"):
            val = info.get(key)
            if val is None or (isinstance(val, float) and np.isnan(val)):
                return default
            return val

        fundamentals = {
            "pe_ratio": safe_get("trailingPE"),
            "forward_pe": safe_get("forwardPE"),
            "pb_ratio": safe_get("priceToBook"),
            "ps_ratio": safe_get("priceToSalesTrailing12Months"),
            "eps": safe_get("trailingEps"),
            "revenue_growth_yoy": safe_get("revenueGrowth"),
            "profit_margin": safe_get("profitMargins"),
            "roe": safe_get("returnOnEquity"),
            "debt_to_equity": safe_get("debtToEquity"),
            "market_cap": safe_get("marketCap"),
            "enterprise_value": safe_get("enterpriseValue"),
            "dividend_yield": safe_get("dividendYield"),
            "analyst_consensus": safe_get("recommendationKey"),
            "analyst_price_target": safe_get("targetMeanPrice"),
            "num_analysts": safe_get("numberOfAnalystOpinions"),
            "beta": safe_get("beta"),
            "sector": safe_get("sector"),
            "industry": safe_get("industry"),
            "company_name": safe_get("longName", symbol),
        }
    except Exception as e:
        fundamentals = {"error": str(e)}

    # ---- News & Sentiment ----
    try:
        news_result = fetch_news(symbol)
        fear_greed = None
        if market_type == "Crypto":
            fear_greed = fetch_fear_greed()
        news_data = {
            "headlines": news_result["headlines"],
            "aggregate_sentiment": news_result["aggregate_sentiment"],
            "fear_greed_index": fear_greed,
        }
    except Exception as e:
        news_data = {
            "headlines": [],
            "aggregate_sentiment": 5.0,
            "fear_greed_index": None,
        }

    # ---- Macro data ----
    try:
        macro_raw = fetch_macro_data()
        macro_data = {
            "dxy": macro_raw.get("dxy"),
            "us10y": macro_raw.get("us10y"),
            "vix": macro_raw.get("vix"),
            "fed_rate": macro_raw.get("fed_rate", "5.25-5.50%"),
            "spy_price": macro_raw.get("spy_price"),
        }
    except Exception as e:
        macro_data = {
            "dxy": None,
            "us10y": None,
            "vix": None,
            "fed_rate": "5.25-5.50%",
            "spy_price": None,
        }

    return {
        "symbol": symbol,
        "market": market_type,
        "fetched_at": datetime.now().isoformat(),
        "price_data": price_data,
        "fundamentals": fundamentals,
        "news": news_data,
        "macro": macro_data,
    }
