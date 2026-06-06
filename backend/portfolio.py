import aiosqlite
import json
from datetime import datetime
from typing import Optional, List, Dict
import yfinance as yf

DB_PATH = "backend/investment.db"


async def add_position(
    symbol: str,
    market: str,
    entry_price: float,
    quantity: float,
    notes: Optional[str] = None,
    verdict_at_entry: Optional[str] = None,
) -> dict:
    """Add a new position to the portfolio."""
    entry_date = datetime.now().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            INSERT INTO positions (symbol, market, entry_price, quantity, entry_date, notes, verdict_at_entry, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
            """,
            (symbol.upper(), market, entry_price, quantity, entry_date, notes, verdict_at_entry),
        )
        await db.commit()
        position_id = cursor.lastrowid

        row = await db.execute("SELECT * FROM positions WHERE id = ?", (position_id,))
        row = await row.fetchone()
        return dict(row) if row else {}


async def _fetch_current_price(symbol: str) -> Optional[float]:
    """Fetch current price for a symbol using yfinance."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="2d")
        if not hist.empty:
            return float(hist["Close"].iloc[-1])
    except Exception:
        pass
    return None


async def get_all_positions() -> List[dict]:
    """Fetch all positions with current prices and unrealized PnL."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM positions ORDER BY entry_date DESC")
        rows = await cursor.fetchall()
        positions = [dict(row) for row in rows]

    # Update current prices for open positions
    for pos in positions:
        if pos.get("status") == "open":
            current_price = await _fetch_current_price(pos["symbol"])
            if current_price is not None:
                pos["current_price"] = round(current_price, 4)
                entry_price = pos.get("entry_price", 0)
                quantity = pos.get("quantity", 0)
                if entry_price and quantity:
                    unrealized_pnl = (current_price - entry_price) * quantity
                    unrealized_pnl_pct = ((current_price - entry_price) / entry_price * 100) if entry_price != 0 else 0
                    pos["unrealized_pnl"] = round(unrealized_pnl, 2)
                    pos["unrealized_pnl_pct"] = round(unrealized_pnl_pct, 2)
            else:
                # Use stored values
                entry_price = pos.get("entry_price", 0)
                current_price_stored = pos.get("current_price") or entry_price
                quantity = pos.get("quantity", 0)
                if entry_price and quantity and current_price_stored:
                    unrealized_pnl = (current_price_stored - entry_price) * quantity
                    unrealized_pnl_pct = ((current_price_stored - entry_price) / entry_price * 100) if entry_price != 0 else 0
                    pos["unrealized_pnl"] = round(unrealized_pnl, 2)
                    pos["unrealized_pnl_pct"] = round(unrealized_pnl_pct, 2)
        else:
            # Closed position - calculate realized pnl pct
            entry_price = pos.get("entry_price", 0)
            exit_price = pos.get("exit_price") or entry_price
            if entry_price:
                realized_pnl_pct = ((exit_price - entry_price) / entry_price * 100)
                pos["realized_pnl_pct"] = round(realized_pnl_pct, 2)

    return positions


async def close_position(
    position_id: int,
    exit_price: float,
    notes: Optional[str] = None,
) -> dict:
    """Close a position and calculate realized PnL."""
    exit_date = datetime.now().isoformat()

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Fetch current position
        cursor = await db.execute("SELECT * FROM positions WHERE id = ?", (position_id,))
        row = await cursor.fetchone()
        if not row:
            return {"error": f"Position {position_id} not found"}

        pos = dict(row)
        entry_price = pos.get("entry_price", 0)
        quantity = pos.get("quantity", 0)
        realized_pnl = (exit_price - entry_price) * quantity

        update_notes = notes if notes else pos.get("notes", "")

        await db.execute(
            """
            UPDATE positions
            SET status = 'closed', exit_price = ?, exit_date = ?,
                realized_pnl = ?, unrealized_pnl = 0, notes = ?
            WHERE id = ?
            """,
            (exit_price, exit_date, round(realized_pnl, 2), update_notes, position_id),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM positions WHERE id = ?", (position_id,))
        row = await cursor.fetchone()
        result = dict(row) if row else {}

        # Also add realized_pnl_pct
        if entry_price:
            result["realized_pnl_pct"] = round(((exit_price - entry_price) / entry_price * 100), 2)

        return result


async def update_position(position_id: int, **kwargs) -> dict:
    """Update arbitrary fields on a position."""
    if not kwargs:
        return {"error": "No fields to update"}

    allowed_fields = {
        "symbol", "market", "entry_price", "current_price", "quantity",
        "entry_date", "status", "exit_price", "exit_date", "realized_pnl",
        "unrealized_pnl", "notes", "verdict_at_entry"
    }

    updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
    if not updates:
        return {"error": "No valid fields to update"}

    set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
    values = list(updates.values()) + [position_id]

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            f"UPDATE positions SET {set_clause} WHERE id = ?",
            values,
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM positions WHERE id = ?", (position_id,))
        row = await cursor.fetchone()
        return dict(row) if row else {"error": "Position not found after update"}


async def get_portfolio_summary() -> dict:
    """Calculate comprehensive portfolio summary statistics."""
    positions = await get_all_positions()

    open_positions = [p for p in positions if p.get("status") == "open"]
    closed_positions = [p for p in positions if p.get("status") == "closed"]

    # Calculate totals for open positions
    total_invested = 0.0
    total_current_value = 0.0
    market_allocation = {"US": 0.0, "China": 0.0, "Crypto": 0.0}

    best_position = None
    worst_position = None
    best_pnl_pct = float("-inf")
    worst_pnl_pct = float("inf")

    position_values = []

    for pos in open_positions:
        entry_price = pos.get("entry_price", 0) or 0
        quantity = pos.get("quantity", 0) or 0
        current_price = pos.get("current_price") or entry_price

        invested = entry_price * quantity
        current_val = current_price * quantity
        total_invested += invested
        total_current_value += current_val

        market = pos.get("market", "US")
        if market in market_allocation:
            market_allocation[market] += current_val
        else:
            market_allocation["US"] += current_val

        pnl_pct = pos.get("unrealized_pnl_pct", 0) or 0

        if pnl_pct > best_pnl_pct:
            best_pnl_pct = pnl_pct
            best_position = {
                "symbol": pos.get("symbol"),
                "unrealized_pnl_pct": pnl_pct,
                "unrealized_pnl": pos.get("unrealized_pnl", 0),
            }

        if pnl_pct < worst_pnl_pct:
            worst_pnl_pct = pnl_pct
            worst_position = {
                "symbol": pos.get("symbol"),
                "unrealized_pnl_pct": pnl_pct,
                "unrealized_pnl": pos.get("unrealized_pnl", 0),
            }

        position_values.append({
            "symbol": pos.get("symbol"),
            "current_value": current_val,
        })

    total_unrealized_pnl = total_current_value - total_invested
    total_return_pct = (total_unrealized_pnl / total_invested * 100) if total_invested > 0 else 0.0

    # Allocation percentages
    total_portfolio_value = total_current_value if total_current_value > 0 else 1.0
    allocation_by_market = {}
    for market_key, val in market_allocation.items():
        allocation_by_market[market_key] = round(val / total_portfolio_value * 100, 2)

    # Allocation by position
    allocation_by_position = []
    for pv in position_values:
        pct = (pv["current_value"] / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
        allocation_by_position.append({
            "symbol": pv["symbol"],
            "pct_of_portfolio": round(pct, 2),
        })
    allocation_by_position.sort(key=lambda x: x["pct_of_portfolio"], reverse=True)

    # Realized PnL from closed positions
    realized_pnl = sum(p.get("realized_pnl", 0) or 0 for p in closed_positions)

    return {
        "num_open": len(open_positions),
        "num_closed": len(closed_positions),
        "total_invested": round(total_invested, 2),
        "total_current_value": round(total_current_value, 2),
        "total_unrealized_pnl": round(total_unrealized_pnl, 2),
        "total_return_pct": round(total_return_pct, 2),
        "realized_pnl": round(realized_pnl, 2),
        "total_pnl": round(total_unrealized_pnl + realized_pnl, 2),
        "allocation_by_market": allocation_by_market,
        "allocation_by_position": allocation_by_position,
        "best_position": best_position,
        "worst_position": worst_position,
        "open_positions": open_positions,
    }


async def check_correlation_warning(symbol: str) -> dict:
    """Check if adding a symbol would create concentration issues."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM positions WHERE symbol = ? AND status = 'open'",
            (symbol.upper(),),
        )
        existing = await cursor.fetchall()

    if existing:
        existing_list = [dict(row) for row in existing]
        total_quantity = sum(p.get("quantity", 0) for p in existing_list)
        return {
            "warning": True,
            "message": f"You already have {len(existing_list)} open position(s) in {symbol} "
                       f"with total quantity {total_quantity}. Adding more increases concentration risk.",
            "existing_positions": len(existing_list),
        }

    return {
        "warning": False,
        "message": f"No existing open positions in {symbol}.",
        "existing_positions": 0,
    }
