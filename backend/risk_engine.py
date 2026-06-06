import numpy as np
from typing import Dict, Optional, List


def calculate_position_size(
    account_size: float,
    risk_pct: float,
    entry_price: float,
    stop_loss: float,
) -> dict:
    """
    Calculate position size based on account risk percentage.

    Args:
        account_size: Total account value in dollars
        risk_pct: Percentage of account to risk on this trade (e.g. 1.0 = 1%)
        entry_price: Entry price per share/unit
        stop_loss: Stop loss price per share/unit

    Returns:
        dict with shares, position_value, position_pct, risk_amount, risk_per_unit
    """
    if account_size <= 0:
        return {"error": "Account size must be positive"}
    if entry_price <= 0:
        return {"error": "Entry price must be positive"}
    if risk_pct <= 0 or risk_pct > 100:
        return {"error": "Risk percentage must be between 0 and 100"}

    risk_per_unit = abs(entry_price - stop_loss)
    if risk_per_unit == 0:
        return {"error": "Entry price and stop loss cannot be the same"}

    risk_amount = account_size * risk_pct / 100
    shares = risk_amount / risk_per_unit
    position_value = shares * entry_price
    position_pct = position_value / account_size * 100

    return {
        "shares": round(shares, 4),
        "position_value": round(position_value, 2),
        "position_pct": round(position_pct, 2),
        "risk_amount": round(risk_amount, 2),
        "risk_per_unit": round(risk_per_unit, 4),
        "risk_pct_used": round(risk_pct, 2),
        "entry_price": round(entry_price, 4),
        "stop_loss": round(stop_loss, 4),
    }


def calculate_stop_loss(
    entry_price: float,
    atr: float,
    method: str = "atr",
    support_level: Optional[float] = None,
    atr_multiplier: float = 1.5,
) -> float:
    """
    Calculate stop loss price.

    Args:
        entry_price: Entry price
        atr: Average True Range (14-period)
        method: "atr" for ATR-based, "structure" for support-based
        support_level: Nearest support level (required for structure method)
        atr_multiplier: Multiplier for ATR (default 1.5)

    Returns:
        Stop loss price
    """
    if method == "structure" and support_level is not None and support_level > 0:
        # Place stop 1% below the nearest support level
        return round(support_level * 0.99, 4)
    else:
        # ATR-based: entry - (multiplier * ATR)
        if atr <= 0:
            # Fallback: 3% below entry
            return round(entry_price * 0.97, 4)
        return round(entry_price - (atr_multiplier * atr), 4)


def calculate_targets(entry_price: float, stop_loss: float) -> dict:
    """
    Calculate take profit targets based on risk multiple.

    Args:
        entry_price: Entry price
        stop_loss: Stop loss price

    Returns:
        dict with tp1, tp2, tp3 and R:R ratios
    """
    if entry_price <= 0:
        return {"error": "Entry price must be positive"}

    risk = abs(entry_price - stop_loss)
    if risk == 0:
        return {"error": "Entry and stop loss cannot be the same price"}

    # Long trade targets (entry > stop_loss)
    if entry_price > stop_loss:
        tp1 = entry_price + (1.5 * risk)
        tp2 = entry_price + (3.0 * risk)
        tp3 = entry_price + (5.0 * risk)
    else:
        # Short trade targets
        tp1 = entry_price - (1.5 * risk)
        tp2 = entry_price - (3.0 * risk)
        tp3 = entry_price - (5.0 * risk)

    return {
        "tp1": round(tp1, 4),
        "tp2": round(tp2, 4),
        "tp3": round(tp3, 4),
        "risk": round(risk, 4),
        "rr_tp1": 1.5,
        "rr_tp2": 3.0,
        "rr_tp3": 5.0,
        "entry_price": round(entry_price, 4),
        "stop_loss": round(stop_loss, 4),
    }


def calculate_portfolio_risk(positions: List[dict], account_size: float) -> dict:
    """
    Calculate overall portfolio risk metrics.

    Args:
        positions: List of position dicts (from portfolio.get_all_positions())
        account_size: Total account size in dollars

    Returns:
        dict with comprehensive risk metrics
    """
    if account_size <= 0:
        account_size = 100000  # Default fallback

    open_positions = [p for p in positions if p.get("status") == "open"]
    closed_positions = [p for p in positions if p.get("status") == "closed"]

    # Total invested and current values
    total_invested = sum(
        (p.get("entry_price", 0) or 0) * (p.get("quantity", 0) or 0)
        for p in open_positions
    )
    total_current_value = sum(
        ((p.get("current_price") or p.get("entry_price", 0)) * (p.get("quantity", 0) or 0))
        for p in open_positions
    )
    realized_pnl = sum(p.get("realized_pnl", 0) or 0 for p in closed_positions)
    unrealized_pnl = total_current_value - total_invested
    total_pnl = realized_pnl + unrealized_pnl

    # Current effective account value
    effective_account = account_size + total_pnl

    # Open risk calculation
    open_risk_dollar = 0.0
    position_metrics = []
    market_values = {"US": 0.0, "China": 0.0, "Crypto": 0.0}
    beta_weights = []

    for pos in open_positions:
        entry = pos.get("entry_price", 0) or 0
        quantity = pos.get("quantity", 0) or 0
        current = pos.get("current_price") or entry
        market = pos.get("market", "US")

        position_value = current * quantity
        position_pct = (position_value / account_size * 100) if account_size > 0 else 0

        # Estimate stop loss as 5% below entry if not stored
        stop_loss = entry * 0.95
        risk_dollar = (entry - stop_loss) * quantity
        open_risk_dollar += risk_dollar

        # Market allocation
        if market in market_values:
            market_values[market] += position_value
        else:
            market_values["US"] += position_value

        # Beta weighting (use 1.0 if not available)
        beta = 1.0
        if position_value > 0:
            beta_weights.append((beta, position_value))

        position_metrics.append({
            "symbol": pos.get("symbol"),
            "position_value": round(position_value, 2),
            "position_pct": round(position_pct, 2),
            "risk_dollar": round(risk_dollar, 2),
        })

    # Max position percentage
    max_position_pct = max((m["position_pct"] for m in position_metrics), default=0)

    # Market concentration
    total_open_value = sum(market_values.values())
    concentration_warnings = []

    if total_open_value > 0:
        for market_key, val in market_values.items():
            pct = val / total_open_value * 100
            if pct > 35:
                concentration_warnings.append(
                    f"High {market_key} concentration: {pct:.1f}%"
                )

    if max_position_pct > 15:
        concentration_warnings.append(
            f"Single position too large: {max_position_pct:.1f}%"
        )

    # Portfolio beta (weighted average)
    if beta_weights:
        total_value_for_beta = sum(w[1] for w in beta_weights)
        if total_value_for_beta > 0:
            portfolio_beta = sum(w[0] * w[1] for w in beta_weights) / total_value_for_beta
        else:
            portfolio_beta = 1.0
    else:
        portfolio_beta = 1.0

    # VaR estimate (rough 95% 1-day VaR)
    var_95_1day = total_current_value * 0.02 if total_current_value > 0 else 0.0

    # Drawdown
    if account_size > 0:
        drawdown_pct = ((account_size - effective_account) / account_size * 100)
    else:
        drawdown_pct = 0.0

    # Risk level assessment
    has_concentration = len(concentration_warnings) > 0
    if drawdown_pct > 25:
        risk_level = "Critical"
    elif drawdown_pct > 15 or (has_concentration and drawdown_pct > 5):
        risk_level = "High"
    elif drawdown_pct > 5 or has_concentration:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # Market allocation percentages
    market_allocation_pct = {}
    for market_key, val in market_values.items():
        pct = (val / account_size * 100) if account_size > 0 else 0
        market_allocation_pct[market_key] = round(pct, 2)

    return {
        "total_open_positions": len(open_positions),
        "total_invested": round(total_invested, 2),
        "total_current_value": round(total_current_value, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
        "realized_pnl": round(realized_pnl, 2),
        "total_pnl": round(total_pnl, 2),
        "open_risk_dollar": round(open_risk_dollar, 2),
        "open_risk_pct": round(open_risk_dollar / account_size * 100, 2) if account_size > 0 else 0,
        "max_position_pct": round(max_position_pct, 2),
        "portfolio_beta": round(portfolio_beta, 2),
        "var_95_1day": round(var_95_1day, 2),
        "var_95_pct": round(var_95_1day / account_size * 100, 2) if account_size > 0 else 0,
        "drawdown_pct": round(drawdown_pct, 2),
        "effective_account": round(effective_account, 2),
        "risk_level": risk_level,
        "concentration_warnings": concentration_warnings,
        "market_allocation_pct": market_allocation_pct,
        "position_details": position_metrics,
    }


def validate_trade(
    entry_price: float,
    stop_loss: float,
    target_price: float,
    min_rr: float = 1.5,
) -> dict:
    """
    Validate a trade setup based on risk-reward ratio.

    Args:
        entry_price: Planned entry price
        stop_loss: Stop loss price
        target_price: Price target
        min_rr: Minimum acceptable risk-reward ratio (default 1.5)

    Returns:
        dict with valid flag, rr_ratio, and reason
    """
    if entry_price <= 0 or stop_loss <= 0 or target_price <= 0:
        return {
            "valid": False,
            "rr_ratio": 0.0,
            "reason": "All prices must be positive values",
        }

    risk = abs(entry_price - stop_loss)
    reward = abs(target_price - entry_price)

    if risk == 0:
        return {
            "valid": False,
            "rr_ratio": 0.0,
            "reason": "Entry price and stop loss cannot be the same",
        }

    rr_ratio = reward / risk

    if rr_ratio < min_rr:
        return {
            "valid": False,
            "rr_ratio": round(rr_ratio, 2),
            "reason": f"Risk-reward ratio {rr_ratio:.2f}:1 is below minimum {min_rr}:1",
        }

    # Check trade direction consistency
    is_long = entry_price > stop_loss
    if is_long and target_price <= entry_price:
        return {
            "valid": False,
            "rr_ratio": round(rr_ratio, 2),
            "reason": "For a long trade, target must be above entry price",
        }
    if not is_long and target_price >= entry_price:
        return {
            "valid": False,
            "rr_ratio": round(rr_ratio, 2),
            "reason": "For a short trade, target must be below entry price",
        }

    trade_type = "Long" if is_long else "Short"
    return {
        "valid": True,
        "rr_ratio": round(rr_ratio, 2),
        "reason": f"Valid {trade_type} trade setup with {rr_ratio:.2f}:1 risk-reward",
        "risk_amount_per_unit": round(risk, 4),
        "reward_amount_per_unit": round(reward, 4),
        "trade_type": trade_type,
    }
