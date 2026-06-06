import asyncio
import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()
client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
MODEL = "claude-sonnet-4-6"


def strip_code_fences(text: str) -> str:
    """Remove markdown code fences from a string before JSON parsing."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def parse_agent_response(text: str, agent_name: str) -> dict:
    """Parse JSON from agent response, with fallback error handling."""
    try:
        cleaned = strip_code_fences(text)
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to extract JSON substring
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
        except Exception:
            pass
        return {"error": f"{agent_name} response parse failed", "raw_text": text}


async def run_macro_analyst(context_package: dict) -> dict:
    """Agent 1: Macro Analyst - Analyzes macro environment."""
    macro = context_package.get("macro", {})
    price_data = context_package.get("price_data", {})
    fundamentals = context_package.get("fundamentals", {})
    symbol = context_package.get("symbol", "")
    market = context_package.get("market", "US")

    dxy = macro.get("dxy", "N/A")
    us10y = macro.get("us10y", "N/A")
    vix = macro.get("vix", "N/A")
    fed_rate = macro.get("fed_rate", "5.25-5.50%")
    spy_price = macro.get("spy_price", "N/A")
    beta = fundamentals.get("beta", "N/A")
    sector = fundamentals.get("sector", "N/A")
    correlation = price_data.get("correlation_spy_30d", "N/A")
    return_ytd = price_data.get("return_ytd", "N/A")

    user_prompt = f"""Analyze the macro environment for this investment opportunity:

ASSET: {symbol} | Market: {market} | Sector: {sector}
PERFORMANCE: YTD Return: {return_ytd}%

MACRO INDICATORS:
- USD Index (DXY): {dxy}
- US 10-Year Yield: {us10y}%
- VIX (Fear Index): {vix}
- Fed Funds Rate: {fed_rate}
- SPY Price: ${spy_price}

ASSET CHARACTERISTICS:
- Beta: {beta}
- Correlation to SPY (30d): {correlation}
- Market: {market}

Provide your macro analysis in the following JSON format exactly:
{{
  "macro_environment": "string describing current macro environment",
  "key_factors": ["factor1", "factor2", "factor3"],
  "risk_sentiment": "Risk-On/Risk-Off/Neutral",
  "dollar_impact": "string describing DXY impact on this asset",
  "rate_environment": "string describing rate environment impact",
  "sector_context": "string describing sector macro context",
  "macro_score": 7,
  "macro_outlook": "string summary of macro outlook for this asset"
}}"""

    system_prompt = """You are a Macro Analyst at an elite investment committee.
You have deep expertise in global macroeconomics, monetary policy, currency markets, and how macro factors
impact asset prices across US equities, Chinese stocks, and cryptocurrencies.
Analyze the macro environment rigorously and provide your assessment in the requested JSON format.
Be specific about whether current macro conditions favor or oppose the trade.
Score from 1-10 where 10 is extremely favorable macro environment."""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return parse_agent_response(response.content[0].text, "MacroAnalyst")
    except Exception as e:
        return {"error": str(e), "macro_score": 5, "macro_outlook": "Analysis unavailable"}


async def run_technical_analyst(context_package: dict) -> dict:
    """Agent 2: Technical Analyst - Analyzes price action and technicals."""
    pd = context_package.get("price_data", {})
    symbol = context_package.get("symbol", "")
    market = context_package.get("market", "US")

    price = pd.get("current_price", 0)
    change_pct = pd.get("change_pct", 0)
    sma20 = pd.get("SMA20", 0)
    sma50 = pd.get("SMA50", 0)
    sma100 = pd.get("SMA100", 0)
    sma200 = pd.get("SMA200", 0)
    ema9 = pd.get("EMA9", 0)
    ema21 = pd.get("EMA21", 0)
    rsi = pd.get("RSI_14", 50)
    macd_hist = pd.get("MACD_histogram", 0)
    macd_crossover = pd.get("MACD_crossover", "N/A")
    stoch_k = pd.get("stoch_k", 50)
    stoch_d = pd.get("stoch_d", 50)
    bb_pos = pd.get("BB_position", 0.5)
    bb_upper = pd.get("BB_upper", 0)
    bb_lower = pd.get("BB_lower", 0)
    bb_width = pd.get("BB_width", 0)
    atr = pd.get("ATR_14", 0)
    atr_pct = pd.get("ATR_pct", 0)
    trend_daily = pd.get("trend_daily", "N/A")
    trend_weekly = pd.get("trend_weekly", "N/A")
    support_levels = pd.get("support_levels", [])
    resistance_levels = pd.get("resistance_levels", [])
    golden_cross = pd.get("golden_cross", False)
    death_cross = pd.get("death_cross", False)
    vol_ratio = pd.get("volume_ratio", 1.0)
    unusual_vol = pd.get("unusual_volume_flag", False)
    high_52w = pd.get("52w_high", 0)
    low_52w = pd.get("52w_low", 0)
    pct_from_high = pd.get("pct_from_52w_high", 0)
    return_1m = pd.get("return_1m", 0)
    return_3m = pd.get("return_3m", 0)

    user_prompt = f"""Perform complete technical analysis for this asset:

Symbol: {symbol} | Current Price: ${price} | Change: {change_pct}%
Market: {market}

MOVING AVERAGES:
- SMA20={sma20:.2f} | SMA50={sma50:.2f} | SMA100={sma100:.2f} | SMA200={sma200:.2f}
- EMA9={ema9:.2f} | EMA21={ema21:.2f}
- Golden Cross: {golden_cross} | Death Cross: {death_cross}
- Price vs SMA20: {"Above" if price > sma20 else "Below"} | vs SMA50: {"Above" if price > sma50 else "Below"} | vs SMA200: {"Above" if price > sma200 else "Below"}

MOMENTUM INDICATORS:
- RSI(14): {rsi:.1f} {"(Overbought)" if rsi > 70 else "(Oversold)" if rsi < 30 else "(Neutral)"}
- MACD Histogram: {macd_hist:.4f} | Status: {macd_crossover}
- Stochastic K: {stoch_k:.1f} | D: {stoch_d:.1f}

VOLATILITY:
- ATR(14): {atr:.4f} | ATR%: {atr_pct:.2f}%
- Bollinger Upper: {bb_upper:.2f} | Lower: {bb_lower:.2f}
- BB Position: {bb_pos:.1%} (0=at lower band, 1=at upper band)
- BB Width: {bb_width:.4f}

TREND:
- Daily Trend: {trend_daily} | Weekly Trend: {trend_weekly}
- 1M Return: {return_1m:.1f}% | 3M Return: {return_3m:.1f}%

KEY LEVELS:
- 52W High: ${high_52w:.2f} | 52W Low: ${low_52w:.2f} | From High: {pct_from_high:.1f}%
- Support Levels: {support_levels}
- Resistance Levels: {resistance_levels}

VOLUME:
- Volume Ratio vs 10d avg: {vol_ratio:.2f}x | Unusual Volume: {unusual_vol}

Provide your technical analysis in this exact JSON format:
{{
  "trend_analysis": "string describing overall trend structure",
  "key_levels": {{"support": {support_levels}, "resistance": {resistance_levels}}},
  "setup_type": "Breakout/Pullback/Reversal/Range",
  "entry_zone": {{"low": 0.0, "high": 0.0}},
  "price_targets": {{"T1": 0.0, "T2": 0.0, "T3": 0.0}},
  "invalidation": 0.0,
  "momentum": "string describing momentum conditions",
  "indicators_summary": "string summarizing all indicators",
  "technical_score": 7,
  "technical_outlook": "string summary"
}}"""

    system_prompt = """You are a Senior Technical Analyst at an elite investment committee specializing in
price action, chart patterns, and technical indicators across equities and crypto markets.
You analyze trends, momentum, support/resistance, and volume to identify high-probability trade setups.
Provide precise price levels based on the data. Score from 1-10 where 10 is perfect technical setup.
Always set entry_zone, price_targets, and invalidation as actual price numbers based on the data provided."""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return parse_agent_response(response.content[0].text, "TechnicalAnalyst")
    except Exception as e:
        return {"error": str(e), "technical_score": 5, "technical_outlook": "Analysis unavailable"}


async def run_fundamental_analyst(context_package: dict) -> dict:
    """Agent 3: Fundamental Analyst - Analyzes business fundamentals."""
    fund = context_package.get("fundamentals", {})
    symbol = context_package.get("symbol", "")
    market = context_package.get("market", "US")
    price_data = context_package.get("price_data", {})

    company_name = fund.get("company_name", symbol)
    sector = fund.get("sector", "N/A")
    industry = fund.get("industry", "N/A")
    pe = fund.get("pe_ratio", "N/A")
    fwd_pe = fund.get("forward_pe", "N/A")
    pb = fund.get("pb_ratio", "N/A")
    ps = fund.get("ps_ratio", "N/A")
    eps = fund.get("eps", "N/A")
    rev_growth = fund.get("revenue_growth_yoy", "N/A")
    profit_margin = fund.get("profit_margin", "N/A")
    roe = fund.get("roe", "N/A")
    debt_eq = fund.get("debt_to_equity", "N/A")
    mkt_cap = fund.get("market_cap", "N/A")
    ev = fund.get("enterprise_value", "N/A")
    div_yield = fund.get("dividend_yield", "N/A")
    analyst_cons = fund.get("analyst_consensus", "N/A")
    analyst_target = fund.get("analyst_price_target", "N/A")
    num_analysts = fund.get("num_analysts", "N/A")
    current_price = price_data.get("current_price", 0)

    user_prompt = f"""Perform comprehensive fundamental analysis for:

COMPANY: {company_name} ({symbol})
Sector: {sector} | Industry: {industry} | Market: {market}
Current Price: ${current_price}

VALUATION METRICS:
- P/E Ratio (Trailing): {pe}
- P/E Ratio (Forward): {fwd_pe}
- Price-to-Book: {pb}
- Price-to-Sales: {ps}
- EPS (Trailing): {eps}

GROWTH & PROFITABILITY:
- Revenue Growth (YoY): {rev_growth}
- Profit Margin: {profit_margin}
- Return on Equity: {roe}
- Debt-to-Equity: {debt_eq}

MARKET DATA:
- Market Cap: {mkt_cap}
- Enterprise Value: {ev}
- Dividend Yield: {div_yield}

ANALYST COVERAGE:
- Consensus: {analyst_cons}
- Price Target: ${analyst_target}
- Number of Analysts: {num_analysts}

Provide your fundamental analysis in this exact JSON format:
{{
  "company_overview": "string describing business model and competitive position",
  "valuation_assessment": "string assessing whether stock is cheap/fair/expensive",
  "key_metrics": {{"pe": "string context", "growth": "string context", "margins": "string context"}},
  "competitive_moat": "string describing competitive advantages or lack thereof",
  "catalysts": ["catalyst1", "catalyst2"],
  "risks": ["risk1", "risk2"],
  "analyst_consensus_analysis": "string interpreting analyst views",
  "investment_thesis": "string with core fundamental investment thesis",
  "fundamental_score": 7,
  "fundamental_outlook": "string summary"
}}"""

    system_prompt = """You are a Senior Fundamental Analyst at an elite investment committee with deep expertise
in financial statement analysis, business model evaluation, and intrinsic value assessment.
You cover US equities, Chinese/Hong Kong stocks, and crypto assets (focusing on tokenomics/utility for crypto).
For crypto assets, focus on tokenomics, adoption metrics, and utility rather than traditional financial ratios.
Score from 1-10 where 10 is extremely compelling fundamentals."""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return parse_agent_response(response.content[0].text, "FundamentalAnalyst")
    except Exception as e:
        return {"error": str(e), "fundamental_score": 5, "fundamental_outlook": "Analysis unavailable"}


async def run_sentiment_analyst(context_package: dict) -> dict:
    """Agent 4: Sentiment Analyst - Analyzes news and market sentiment."""
    news = context_package.get("news", {})
    symbol = context_package.get("symbol", "")
    market = context_package.get("market", "US")
    price_data = context_package.get("price_data", {})

    headlines = news.get("headlines", [])
    agg_sentiment = news.get("aggregate_sentiment", 5.0)
    fear_greed = news.get("fear_greed_index", None)
    vol_ratio = price_data.get("volume_ratio", 1.0)
    unusual_vol = price_data.get("unusual_volume_flag", False)
    return_1m = price_data.get("return_1m", 0)

    headlines_text = "\n".join([
        f"- [{h.get('sentiment', 'Neutral')}] {h.get('title', '')} ({h.get('source', 'Unknown')})"
        for h in headlines[:10]
    ])

    fear_greed_text = ""
    if fear_greed is not None:
        if fear_greed <= 25:
            fg_label = "Extreme Fear"
        elif fear_greed <= 45:
            fg_label = "Fear"
        elif fear_greed <= 55:
            fg_label = "Neutral"
        elif fear_greed <= 75:
            fg_label = "Greed"
        else:
            fg_label = "Extreme Greed"
        fear_greed_text = f"\nCRYPTO FEAR & GREED INDEX: {fear_greed}/100 ({fg_label})"

    user_prompt = f"""Analyze market sentiment for {symbol} ({market} market):

NEWS HEADLINES:
{headlines_text}

SENTIMENT METRICS:
- Aggregate News Sentiment Score: {agg_sentiment}/10
- Volume Ratio (vs 10d avg): {vol_ratio:.2f}x
- Unusual Volume Activity: {unusual_vol}
- 1-Month Price Return: {return_1m:.1f}%{fear_greed_text}

Provide your sentiment analysis in this exact JSON format:
{{
  "news_analysis": "string analyzing the news headlines and their implications",
  "social_mood": "Bullish/Bearish/Neutral/Mixed",
  "institutional_signals": "string describing potential institutional activity based on volume",
  "retail_sentiment": "string describing retail investor sentiment",
  "contrarian_signals": "string noting any contrarian indicators",
  "key_narratives": ["narrative1", "narrative2"],
  "sentiment_score": 6,
  "mood_label": "Greed/Fear/Neutral/Extreme Greed/Extreme Fear",
  "sentiment_outlook": "string summary of sentiment outlook"
}}"""

    system_prompt = """You are a Sentiment Analyst at an elite investment committee specializing in
news flow analysis, social media sentiment, institutional positioning, and market psychology.
You understand how sentiment drives short-term price action and can identify sentiment extremes
that create contrarian opportunities. Score from 1-10 where 10 is overwhelmingly positive sentiment."""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return parse_agent_response(response.content[0].text, "SentimentAnalyst")
    except Exception as e:
        return {"error": str(e), "sentiment_score": 5, "sentiment_outlook": "Analysis unavailable"}


async def run_bull_researcher(context_package: dict, tier1_reports: dict) -> dict:
    """Agent 5: Bull Researcher - Presents the strongest bullish case."""
    symbol = context_package.get("symbol", "")
    market = context_package.get("market", "US")
    price_data = context_package.get("price_data", {})
    current_price = price_data.get("current_price", 0)

    macro_report = tier1_reports.get("macro", {})
    tech_report = tier1_reports.get("technical", {})
    fund_report = tier1_reports.get("fundamental", {})
    sent_report = tier1_reports.get("sentiment", {})

    macro_score = macro_report.get("macro_score", 5)
    tech_score = tech_report.get("technical_score", 5)
    fund_score = fund_report.get("fundamental_score", 5)
    sent_score = sent_report.get("sentiment_score", 5)

    user_prompt = f"""Build the strongest possible BULLISH case for {symbol} at ${current_price} ({market} market).

ANALYST REPORTS SUMMARY:
MACRO ({macro_score}/10): {macro_report.get("macro_outlook", "N/A")}
Key factors: {macro_report.get("key_factors", [])}
Risk sentiment: {macro_report.get("risk_sentiment", "N/A")}

TECHNICAL ({tech_score}/10): {tech_report.get("technical_outlook", "N/A")}
Setup: {tech_report.get("setup_type", "N/A")}
Trend: {tech_report.get("trend_analysis", "N/A")}
Price targets: {tech_report.get("price_targets", {})}

FUNDAMENTAL ({fund_score}/10): {fund_report.get("fundamental_outlook", "N/A")}
Investment thesis: {fund_report.get("investment_thesis", "N/A")}
Catalysts: {fund_report.get("catalysts", [])}

SENTIMENT ({sent_score}/10): {sent_report.get("sentiment_outlook", "N/A")}
Key narratives: {sent_report.get("key_narratives", [])}

As the Bull Researcher, synthesize ALL positive signals and make the most compelling bullish argument.
Identify asymmetric upside opportunities. Be specific with price targets.

Return this exact JSON:
{{
  "core_thesis": "string with the single most compelling reason to be long",
  "top_3_arguments": ["argument1", "argument2", "argument3"],
  "asymmetric_opportunity": "string describing why risk/reward is asymmetric to upside",
  "bull_price_target": 0.0,
  "bull_price_target_timeframe": "3-6 months",
  "key_conviction_driver": "string with the highest conviction factor",
  "bull_scenario": "string describing the scenario where everything goes right"
}}"""

    system_prompt = """You are the Bull Researcher on an elite investment committee. Your role is to present
the strongest possible bullish case for any asset you analyze. You must draw on macro, technical, fundamental,
and sentiment data to build a compelling case for long entry. You are not naive — you acknowledge risks —
but you focus on why the upside outweighs the downside. Be specific, cite data, and provide realistic price targets."""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return parse_agent_response(response.content[0].text, "BullResearcher")
    except Exception as e:
        return {"error": str(e), "core_thesis": "Analysis unavailable"}


async def run_bear_researcher(context_package: dict, tier1_reports: dict) -> dict:
    """Agent 6: Bear Researcher - Presents the strongest bearish/cautionary case."""
    symbol = context_package.get("symbol", "")
    market = context_package.get("market", "US")
    price_data = context_package.get("price_data", {})
    current_price = price_data.get("current_price", 0)

    macro_report = tier1_reports.get("macro", {})
    tech_report = tier1_reports.get("technical", {})
    fund_report = tier1_reports.get("fundamental", {})
    sent_report = tier1_reports.get("sentiment", {})

    macro_score = macro_report.get("macro_score", 5)
    tech_score = tech_report.get("technical_score", 5)
    fund_score = fund_report.get("fundamental_score", 5)
    sent_score = sent_report.get("sentiment_score", 5)

    pct_from_high = price_data.get("pct_from_52w_high", 0)
    vix = context_package.get("macro", {}).get("vix", "N/A")
    rsi = price_data.get("RSI_14", 50)

    user_prompt = f"""Build the strongest possible BEARISH/CAUTIONARY case for {symbol} at ${current_price} ({market} market).

ANALYST REPORTS SUMMARY:
MACRO ({macro_score}/10): {macro_report.get("macro_outlook", "N/A")}
Risk sentiment: {macro_report.get("risk_sentiment", "N/A")}
Dollar impact: {macro_report.get("dollar_impact", "N/A")}

TECHNICAL ({tech_score}/10): {tech_report.get("technical_outlook", "N/A")}
Invalidation level: {tech_report.get("invalidation", "N/A")}
Momentum: {tech_report.get("momentum", "N/A")}

FUNDAMENTAL ({fund_score}/10): {fund_report.get("fundamental_outlook", "N/A")}
Risks: {fund_report.get("risks", [])}
Valuation: {fund_report.get("valuation_assessment", "N/A")}

SENTIMENT ({sent_score}/10): {sent_report.get("sentiment_outlook", "N/A")}
Contrarian signals: {sent_report.get("contrarian_signals", "N/A")}

ADDITIONAL RISK DATA:
- Distance from 52W High: {pct_from_high:.1f}%
- VIX: {vix}
- RSI: {rsi}

As the Bear Researcher, identify ALL risks and present the most compelling case for caution or shorting.
Be specific with downside price targets.

Return this exact JSON:
{{
  "core_thesis": "string with the single most compelling reason to be cautious/short",
  "top_3_risks": ["risk1", "risk2", "risk3"],
  "downside_scenario": "string describing what happens if things go wrong",
  "bear_price_target": 0.0,
  "bear_price_target_timeframe": "3-6 months",
  "key_conviction_risk": "string with the highest conviction risk factor",
  "bear_scenario": "string describing the scenario where everything goes wrong"
}}"""

    system_prompt = """You are the Bear Researcher on an elite investment committee. Your role is to present
the strongest possible bearish case and identify all risks for any asset. You are a skeptic — you look for
overvaluation, technical deterioration, macro headwinds, and sentiment extremes that signal danger.
You protect the portfolio by identifying what can go wrong. Be specific, cite data, and provide realistic downside targets."""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return parse_agent_response(response.content[0].text, "BearResearcher")
    except Exception as e:
        return {"error": str(e), "core_thesis": "Analysis unavailable"}


async def run_aggressive_risk_manager(
    context_package: dict, tier1_reports: dict, tier2_reports: dict
) -> dict:
    """Agent 7: Aggressive Risk Manager - Maximizes returns while managing risk."""
    symbol = context_package.get("symbol", "")
    market = context_package.get("market", "US")
    price_data = context_package.get("price_data", {})
    current_price = price_data.get("current_price", 0)
    atr = price_data.get("ATR_14", current_price * 0.02)
    atr_pct = price_data.get("ATR_pct", 2.0)
    support_levels = price_data.get("support_levels", [])

    bull_report = tier2_reports.get("bull", {})
    bear_report = tier2_reports.get("bear", {})
    tech_report = tier1_reports.get("technical", {})
    macro_report = tier1_reports.get("macro", {})

    bull_target = bull_report.get("bull_price_target", current_price * 1.15)
    bear_target = bear_report.get("bear_price_target", current_price * 0.9)
    tech_invalidation = tech_report.get("invalidation", current_price * 0.95)
    suggested_stop = current_price - (2 * atr) if atr else current_price * 0.95
    risk_per_share = current_price - suggested_stop if suggested_stop < current_price else current_price * 0.05

    user_prompt = f"""Determine aggressive risk management parameters for {symbol} at ${current_price:.2f}:

MARKET CONTEXT:
- Market: {market}
- ATR(14): {atr:.4f} ({atr_pct:.2f}% of price)
- Suggested ATR-based Stop (2x ATR): ${suggested_stop:.2f}
- Technical Invalidation Level: {tech_invalidation}
- Support Levels: {support_levels}

RESEARCH SUMMARY:
BULL CASE: {bull_report.get("core_thesis", "N/A")}
- Bull Target: ${bull_target}
- Key Driver: {bull_report.get("key_conviction_driver", "N/A")}

BEAR CASE: {bear_report.get("core_thesis", "N/A")}
- Bear Target: ${bear_target}
- Key Risk: {bear_report.get("key_conviction_risk", "N/A")}

MACRO: {macro_report.get("risk_sentiment", "N/A")} - {macro_report.get("macro_outlook", "N/A")}

TECHNICAL SETUP: {tech_report.get("setup_type", "N/A")} - {tech_report.get("technical_outlook", "N/A")}

As the Aggressive Risk Manager, maximize the risk-adjusted return opportunity.
Use ATR-based stops. Allow higher position sizes for high-conviction trades.
Risk reward should be at minimum 2:1 for aggressive entry.

Return this exact JSON:
{{
  "position_size_pct": 5.0,
  "allocation_pct": 5.0,
  "entry_strategy": "string describing optimal entry approach",
  "stop_loss": {round(suggested_stop, 2)},
  "stop_loss_type": "ATR-based",
  "take_profit_1": 0.0,
  "take_profit_2": 0.0,
  "take_profit_3": 0.0,
  "risk_reward_ratio": 2.5,
  "max_loss_pct": 2.0,
  "verdict": "ENTER/WAIT/AVOID",
  "risk_notes": "string with key risk management notes"
}}"""

    system_prompt = """You are the Aggressive Risk Manager at an elite investment committee.
Your mandate is to maximize risk-adjusted returns. You are willing to take calculated risks for asymmetric gains.
You use ATR-based stops, size positions based on conviction level (up to 10% for high-conviction trades),
and target minimum 2:1 risk-reward. You enter on strong setups and avoid trades with unfavorable risk-reward.
Provide specific price levels for all parameters. Position size represents % of total portfolio to allocate."""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return parse_agent_response(response.content[0].text, "AggressiveRiskManager")
    except Exception as e:
        return {
            "error": str(e),
            "position_size_pct": 3.0,
            "verdict": "WAIT",
            "stop_loss": suggested_stop,
        }


async def run_conservative_risk_manager(
    context_package: dict, tier1_reports: dict, tier2_reports: dict
) -> dict:
    """Agent 8: Conservative Risk Manager - Capital preservation is paramount."""
    symbol = context_package.get("symbol", "")
    market = context_package.get("market", "US")
    price_data = context_package.get("price_data", {})
    current_price = price_data.get("current_price", 0)
    atr = price_data.get("ATR_14", current_price * 0.02)
    support_levels = price_data.get("support_levels", [])

    bull_report = tier2_reports.get("bull", {})
    bear_report = tier2_reports.get("bear", {})
    tech_report = tier1_reports.get("technical", {})
    macro_report = tier1_reports.get("macro", {})
    fund_report = tier1_reports.get("fundamental", {})

    nearest_support = support_levels[0] if support_levels else current_price * 0.95
    structure_stop = nearest_support * 0.99
    bull_target = bull_report.get("bull_price_target", current_price * 1.1)
    macro_risk_sentiment = macro_report.get("risk_sentiment", "Neutral")
    fund_score = fund_report.get("fundamental_score", 5)
    top_risks = bear_report.get("top_3_risks", [])

    user_prompt = f"""Determine conservative risk management parameters for {symbol} at ${current_price:.2f}:

MARKET CONTEXT:
- Market: {market}
- ATR(14): {atr:.4f}
- Nearest Support: ${nearest_support:.2f}
- Structure-based Stop (1% below support): ${structure_stop:.2f}
- All Support Levels: {support_levels}

RISK FACTORS:
- Macro Risk Sentiment: {macro_risk_sentiment}
- Fundamental Score: {fund_score}/10
- Top Identified Risks: {top_risks}
- Bear Case Target: {bear_report.get("bear_price_target", "N/A")}

OPPORTUNITIES:
- Bull Case: {bull_report.get("core_thesis", "N/A")}
- Bull Target: ${bull_target}
- Technical Setup: {tech_report.get("setup_type", "N/A")}

As the Conservative Risk Manager, CAPITAL PRESERVATION is paramount.
Only enter if risk-reward is exceptional (3:1 minimum) and all signals align.
Use structure-based stops. Keep position sizes small (1-3% max).
Require multiple confirmation signals before entry.

Return this exact JSON:
{{
  "position_size_pct": 2.0,
  "allocation_pct": 2.0,
  "entry_strategy": "string describing cautious entry approach with specific confirmations needed",
  "stop_loss": {round(structure_stop, 2)},
  "stop_loss_type": "Structure-based",
  "take_profit_1": 0.0,
  "take_profit_2": 0.0,
  "take_profit_3": 0.0,
  "risk_reward_ratio": 3.0,
  "max_loss_pct": 1.0,
  "entry_requirements": ["requirement1", "requirement2"],
  "verdict": "ENTER/WAIT/AVOID",
  "risk_notes": "string with conservative risk management notes"
}}"""

    system_prompt = """You are the Conservative Risk Manager at an elite investment committee.
Capital preservation is your primary mandate. You only recommend entry when risk-reward is exceptional
(3:1 minimum), all macro/technical/fundamental signals align, and downside is clearly defined.
You prefer structure-based stops placed below key support levels. Position sizes are kept small (1-3%).
You would rather miss a good trade than take a bad one. Be specific with price levels."""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return parse_agent_response(response.content[0].text, "ConservativeRiskManager")
    except Exception as e:
        return {
            "error": str(e),
            "position_size_pct": 1.0,
            "verdict": "WAIT",
            "stop_loss": structure_stop,
        }


async def run_cio(
    context_package: dict,
    tier1_reports: dict,
    tier2_reports: dict,
    tier3_reports: dict,
) -> dict:
    """Agent 9: CIO - Final investment decision."""
    symbol = context_package.get("symbol", "")
    market = context_package.get("market", "US")
    price_data = context_package.get("price_data", {})
    current_price = price_data.get("current_price", 0)
    fundamentals = context_package.get("fundamentals", {})

    macro_report = tier1_reports.get("macro", {})
    tech_report = tier1_reports.get("technical", {})
    fund_report = tier1_reports.get("fundamental", {})
    sent_report = tier1_reports.get("sentiment", {})
    bull_report = tier2_reports.get("bull", {})
    bear_report = tier2_reports.get("bear", {})
    agg_report = tier3_reports.get("aggressive", {})
    cons_report = tier3_reports.get("conservative", {})

    macro_score = macro_report.get("macro_score", 5)
    tech_score = tech_report.get("technical_score", 5)
    fund_score = fund_report.get("fundamental_score", 5)
    sent_score = sent_report.get("sentiment_score", 5)
    overall_score = round((macro_score + tech_score + fund_score + sent_score) / 4, 1)

    agg_verdict = agg_report.get("verdict", "WAIT")
    cons_verdict = cons_report.get("verdict", "WAIT")
    agg_stop = agg_report.get("stop_loss", current_price * 0.95)
    cons_stop = cons_report.get("stop_loss", current_price * 0.97)
    agg_tp1 = agg_report.get("take_profit_1", current_price * 1.1)
    cons_tp1 = cons_report.get("take_profit_1", current_price * 1.08)
    agg_size = agg_report.get("position_size_pct", 5.0)
    cons_size = cons_report.get("position_size_pct", 2.0)
    balanced_size = round((agg_size + cons_size) / 2, 1)
    balanced_stop = round((float(agg_stop) + float(cons_stop)) / 2, 2) if agg_stop and cons_stop else current_price * 0.96

    company_name = fundamentals.get("company_name", symbol)

    user_prompt = f"""You are making the FINAL investment decision for the committee on {company_name} ({symbol}).
Current Price: ${current_price:.2f} | Market: {market} | Overall Score: {overall_score}/10

=== TIER 1 ANALYST REPORTS ===

MACRO ANALYST ({macro_score}/10):
{macro_report.get("macro_outlook", "N/A")}
Risk Sentiment: {macro_report.get("risk_sentiment", "N/A")}
Key Factors: {macro_report.get("key_factors", [])}

TECHNICAL ANALYST ({tech_score}/10):
{tech_report.get("technical_outlook", "N/A")}
Setup: {tech_report.get("setup_type", "N/A")}
Entry Zone: {tech_report.get("entry_zone", {})}
Targets: {tech_report.get("price_targets", {})}
Invalidation: {tech_report.get("invalidation", "N/A")}

FUNDAMENTAL ANALYST ({fund_score}/10):
{fund_report.get("fundamental_outlook", "N/A")}
Investment Thesis: {fund_report.get("investment_thesis", "N/A")}
Risks: {fund_report.get("risks", [])}

SENTIMENT ANALYST ({sent_score}/10):
{sent_report.get("sentiment_outlook", "N/A")}
Social Mood: {sent_report.get("social_mood", "N/A")}
Key Narratives: {sent_report.get("key_narratives", [])}

=== TIER 2 RESEARCH REPORTS ===

BULL RESEARCHER:
Core Thesis: {bull_report.get("core_thesis", "N/A")}
Top Arguments: {bull_report.get("top_3_arguments", [])}
Bull Target: ${bull_report.get("bull_price_target", "N/A")} ({bull_report.get("bull_price_target_timeframe", "N/A")})
Asymmetric Opportunity: {bull_report.get("asymmetric_opportunity", "N/A")}

BEAR RESEARCHER:
Core Thesis: {bear_report.get("core_thesis", "N/A")}
Top Risks: {bear_report.get("top_3_risks", [])}
Bear Target: ${bear_report.get("bear_price_target", "N/A")} ({bear_report.get("bear_price_target_timeframe", "N/A")})
Key Risk: {bear_report.get("key_conviction_risk", "N/A")}

=== TIER 3 RISK MANAGER REPORTS ===

AGGRESSIVE RISK MANAGER:
Verdict: {agg_verdict}
Position Size: {agg_size}% | Stop: ${agg_stop} | TP1: ${agg_tp1}
R:R: {agg_report.get("risk_reward_ratio", "N/A")}
Notes: {agg_report.get("risk_notes", "N/A")}

CONSERVATIVE RISK MANAGER:
Verdict: {cons_verdict}
Position Size: {cons_size}% | Stop: ${cons_stop} | TP1: ${cons_tp1}
R:R: {cons_report.get("risk_reward_ratio", "N/A")}
Entry Requirements: {cons_report.get("entry_requirements", [])}
Notes: {cons_report.get("risk_notes", "N/A")}

=== YOUR TASK ===
As CIO, synthesize all 8 analyst reports and make the final verdict.
Balanced position size suggestion: ~{balanced_size}%
Balanced stop suggestion: ~${balanced_stop}

Verdicts must be one of: STRONG BUY, BUY, WEAK BUY, HOLD, WEAK SELL, SELL, STRONG SELL, AVOID

Return this exact JSON:
{{
  "verdict": "STRONG BUY",
  "confidence": 75,
  "time_horizon": "Short/Medium/Long",
  "key_reasoning": "3-4 sentence reasoning that addresses bull/bear disagreement and explains the final decision",
  "critical_risks": ["risk1", "risk2"],
  "trade_parameters": {{
    "entry": {current_price},
    "stop_loss": {balanced_stop},
    "target_1": 0.0,
    "target_2": 0.0,
    "position_size_pct": {balanced_size},
    "risk_reward": 0.0
  }},
  "score_summary": {{
    "macro": {macro_score},
    "technical": {tech_score},
    "fundamental": {fund_score},
    "sentiment": {sent_score},
    "overall": {overall_score}
  }},
  "bottom_line": "one powerful, memorable sentence summarizing the investment case"
}}"""

    system_prompt = """You are the Chief Investment Officer (CIO) of an elite investment committee.
You have the final and absolute word on all investment decisions. You synthesize reports from 8 specialized
analysts and make the definitive verdict. You are measured, experienced, and base decisions on the weight
of evidence. You acknowledge disagreements between analysts and explain how you resolve them.
Your verdicts are: STRONG BUY, BUY, WEAK BUY, HOLD, WEAK SELL, SELL, STRONG SELL, or AVOID.
Confidence is 0-100%. Time horizon: Short (days-weeks), Medium (1-6 months), Long (6+ months).
Your bottom_line should be memorable and capture the essence of the investment case in one sentence."""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return parse_agent_response(response.content[0].text, "CIO")
    except Exception as e:
        return {
            "error": str(e),
            "verdict": "HOLD",
            "confidence": 50,
            "bottom_line": "Analysis unavailable",
            "score_summary": {
                "macro": macro_score,
                "technical": tech_score,
                "fundamental": fund_score,
                "sentiment": sent_score,
                "overall": overall_score,
            },
        }


async def run_full_analysis(context_package: dict) -> dict:
    """Orchestrate all 9 agents in tiered parallel execution."""

    # Tier 1: Run all 4 analysts in parallel
    tier1_results = await asyncio.gather(
        run_macro_analyst(context_package),
        run_technical_analyst(context_package),
        run_fundamental_analyst(context_package),
        run_sentiment_analyst(context_package),
    )
    tier1_reports = {
        "macro": tier1_results[0],
        "technical": tier1_results[1],
        "fundamental": tier1_results[2],
        "sentiment": tier1_results[3],
    }

    # Tier 2: Bull and Bear researchers in parallel (need tier1)
    tier2_results = await asyncio.gather(
        run_bull_researcher(context_package, tier1_reports),
        run_bear_researcher(context_package, tier1_reports),
    )
    tier2_reports = {
        "bull": tier2_results[0],
        "bear": tier2_results[1],
    }

    # Tier 3: Risk managers in parallel (need tier1 + tier2)
    tier3_results = await asyncio.gather(
        run_aggressive_risk_manager(context_package, tier1_reports, tier2_reports),
        run_conservative_risk_manager(context_package, tier1_reports, tier2_reports),
    )
    tier3_reports = {
        "aggressive": tier3_results[0],
        "conservative": tier3_results[1],
    }

    # Tier 4: CIO makes final decision (needs all tiers)
    cio_report = await run_cio(context_package, tier1_reports, tier2_reports, tier3_reports)

    return {
        "context_package": context_package,
        "tier1": tier1_reports,
        "tier2": tier2_reports,
        "tier3": tier3_reports,
        "cio": cio_report,
    }
