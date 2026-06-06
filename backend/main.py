from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import json
from datetime import datetime

from database import init_db, DB_PATH
from data_fetcher import fetch_context_package
from agents import run_full_analysis
from portfolio import (
    add_position,
    get_all_positions,
    close_position,
    update_position,
    get_portfolio_summary,
    check_correlation_warning,
)
from risk_engine import calculate_position_size, calculate_portfolio_risk, validate_trade
import aiosqlite


# ── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Investment Committee API",
    description="Multi-agent AI-powered investment analysis and portfolio management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


# ── Pydantic Models ──────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    symbol: str


class PositionCreate(BaseModel):
    symbol: str
    market: str
    entry_price: float
    quantity: float
    notes: Optional[str] = None
    verdict_at_entry: Optional[str] = None


class PositionUpdate(BaseModel):
    exit_price: Optional[float] = None
    notes: Optional[str] = None
    action: Optional[str] = None  # "close"


class RiskCalcRequest(BaseModel):
    account_size: float
    risk_pct: float
    entry_price: float
    stop_loss: float
    target_price: Optional[float] = None


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ── Analysis Endpoints ────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    """
    Run full AI Investment Committee analysis for a symbol.
    Fetches market data, runs 9 AI agents, stores in journal.
    """
    symbol = request.symbol.upper().strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    try:
        # Step 1: Fetch market data
        context_package = await fetch_context_package(symbol)

        # Step 2: Run all 9 AI agents
        analysis = await run_full_analysis(context_package)

        # Step 3: Store in journal
        cio = analysis.get("cio", {})
        tier1 = analysis.get("tier1", {})
        price_data = context_package.get("price_data", {})
        fundamentals = context_package.get("fundamentals", {})

        verdict = cio.get("verdict", "HOLD")
        confidence = cio.get("confidence", 50)
        score_summary = cio.get("score_summary", {})
        overall_score = score_summary.get("overall", 5)
        setup_type = tier1.get("technical", {}).get("setup_type", "N/A")
        market_condition = tier1.get("macro", {}).get("risk_sentiment", "N/A")

        agent_reports_json = json.dumps({
            "tier1": analysis.get("tier1", {}),
            "tier2": analysis.get("tier2", {}),
            "tier3": analysis.get("tier3", {}),
            "cio": cio,
        })

        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                """
                INSERT INTO journal (
                    symbol, market, entry_price, verdict, confidence,
                    overall_score, agent_reports, actual_outcome,
                    entry_date, setup_type, market_condition, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    symbol,
                    context_package.get("market", "US"),
                    price_data.get("current_price", 0),
                    verdict,
                    confidence,
                    overall_score,
                    agent_reports_json,
                    "open",
                    datetime.now().isoformat(),
                    setup_type,
                    market_condition,
                    cio.get("bottom_line", ""),
                ),
            )
            await db.commit()

        return {
            "success": True,
            "symbol": symbol,
            "analysis": analysis,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/analyze/{symbol}")
async def get_last_analysis(symbol: str):
    """
    Quick cache check - returns the last journal entry for a symbol.
    """
    symbol = symbol.upper().strip()
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT * FROM journal WHERE symbol = ?
                ORDER BY entry_date DESC LIMIT 1
                """,
                (symbol,),
            )
            row = await cursor.fetchone()
            if not row:
                return {"found": False, "symbol": symbol, "message": "No previous analysis found"}

            entry = dict(row)
            # Parse agent_reports JSON if present
            if entry.get("agent_reports"):
                try:
                    entry["agent_reports"] = json.loads(entry["agent_reports"])
                except (json.JSONDecodeError, TypeError):
                    pass

            return {"found": True, "symbol": symbol, "entry": entry}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Portfolio Endpoints ───────────────────────────────────────────────────────

@app.get("/portfolio")
async def get_portfolio():
    """Return all positions with current prices and PnL."""
    try:
        positions = await get_all_positions()
        return {"success": True, "positions": positions, "count": len(positions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/portfolio")
async def create_position(request: PositionCreate):
    """Add a new position to the portfolio."""
    try:
        # Check for existing position warning
        warning = await check_correlation_warning(request.symbol)

        position = await add_position(
            symbol=request.symbol,
            market=request.market,
            entry_price=request.entry_price,
            quantity=request.quantity,
            notes=request.notes,
            verdict_at_entry=request.verdict_at_entry,
        )

        if not position:
            raise HTTPException(status_code=500, detail="Failed to create position")

        return {
            "success": True,
            "position": position,
            "warning": warning if warning.get("warning") else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/portfolio/{position_id}")
async def update_position_endpoint(position_id: int, request: PositionUpdate):
    """
    Update or close a position.
    If action == 'close', closes the position with the given exit_price.
    Otherwise updates the specified fields.
    """
    try:
        if request.action == "close":
            if request.exit_price is None:
                raise HTTPException(status_code=400, detail="exit_price is required to close a position")

            result = await close_position(
                position_id=position_id,
                exit_price=request.exit_price,
                notes=request.notes,
            )

            if "error" in result:
                raise HTTPException(status_code=404, detail=result["error"])

            # Update journal entry if exists
            try:
                async with aiosqlite.connect(DB_PATH) as db:
                    # Find the most recent journal entry for this symbol
                    db.row_factory = aiosqlite.Row
                    pos_cursor = await db.execute(
                        "SELECT symbol, entry_price FROM positions WHERE id = ?",
                        (position_id,),
                    )
                    pos_row = await pos_cursor.fetchone()
                    if pos_row:
                        symbol = pos_row["symbol"]
                        entry_price = pos_row["entry_price"]
                        realized_pnl = result.get("realized_pnl", 0)
                        outcome = "won" if realized_pnl >= 0 else "lost"

                        await db.execute(
                            """
                            UPDATE journal SET actual_outcome = ?, exit_price = ?,
                            exit_date = ?, realized_pnl = ?
                            WHERE symbol = ? AND actual_outcome = 'open'
                            ORDER BY entry_date DESC LIMIT 1
                            """,
                            (
                                outcome,
                                request.exit_price,
                                datetime.now().isoformat(),
                                realized_pnl,
                                symbol,
                            ),
                        )
                        await db.commit()
            except Exception:
                pass  # Journal update failure shouldn't break position closure

            return {"success": True, "position": result}

        else:
            # Generic update
            update_fields = {}
            if request.exit_price is not None:
                update_fields["exit_price"] = request.exit_price
            if request.notes is not None:
                update_fields["notes"] = request.notes

            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            result = await update_position(position_id, **update_fields)

            if "error" in result:
                raise HTTPException(status_code=404, detail=result["error"])

            return {"success": True, "position": result}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/portfolio/summary")
async def portfolio_summary(account_size: float = Query(default=100000.0)):
    """
    Return portfolio summary with risk metrics.
    Query param: account_size (default 100000)
    """
    try:
        summary = await get_portfolio_summary()
        positions = await get_all_positions()
        risk_metrics = calculate_portfolio_risk(positions, account_size)

        return {
            "success": True,
            "account_size": account_size,
            "summary": summary,
            "risk_metrics": risk_metrics,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Journal Endpoints ─────────────────────────────────────────────────────────

@app.get("/journal")
async def get_journal():
    """
    Return all journal entries with aggregate performance statistics.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM journal ORDER BY entry_date DESC"
            )
            rows = await cursor.fetchall()
            entries = []
            for row in rows:
                entry = dict(row)
                if entry.get("agent_reports"):
                    try:
                        entry["agent_reports"] = json.loads(entry["agent_reports"])
                    except (json.JSONDecodeError, TypeError):
                        pass
                entries.append(entry)

        # Calculate performance stats from closed trades
        closed = [e for e in entries if e.get("actual_outcome") in ("won", "lost")]
        wins = [e for e in closed if e.get("actual_outcome") == "won"]
        losses = [e for e in closed if e.get("actual_outcome") == "lost"]

        win_rate = (len(wins) / len(closed) * 100) if closed else 0.0

        # Profit factor
        gross_profit = sum(e.get("realized_pnl", 0) or 0 for e in wins)
        gross_loss = abs(sum(e.get("realized_pnl", 0) or 0 for e in losses))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (float("inf") if gross_profit > 0 else 0.0)

        best_trade = None
        worst_trade = None
        if closed:
            sorted_by_pnl = sorted(closed, key=lambda x: x.get("realized_pnl", 0) or 0, reverse=True)
            best_trade = {
                "symbol": sorted_by_pnl[0].get("symbol"),
                "realized_pnl": sorted_by_pnl[0].get("realized_pnl", 0),
                "verdict": sorted_by_pnl[0].get("verdict"),
            }
            worst_trade = {
                "symbol": sorted_by_pnl[-1].get("symbol"),
                "realized_pnl": sorted_by_pnl[-1].get("realized_pnl", 0),
                "verdict": sorted_by_pnl[-1].get("verdict"),
            }

        # Equity curve: cumulative PnL over time
        sorted_closed = sorted(closed, key=lambda x: x.get("exit_date") or x.get("entry_date", ""))
        equity_curve = []
        cumulative = 0.0
        for trade in sorted_closed:
            cumulative += trade.get("realized_pnl", 0) or 0
            date_str = trade.get("exit_date") or trade.get("entry_date", "")
            if date_str:
                try:
                    date_only = date_str[:10]  # YYYY-MM-DD
                except Exception:
                    date_only = date_str
                equity_curve.append({"date": date_only, "value": round(cumulative, 2)})

        # Average R:R achieved (simplified: reward / risk based on entry/exit/stop)
        avg_rr = None
        rr_values = []
        for trade in closed:
            entry_p = trade.get("entry_price", 0) or 0
            exit_p = trade.get("exit_price", 0) or 0
            # Estimate implied R:R (no stop stored in journal)
            if entry_p > 0 and exit_p > 0:
                move_pct = abs((exit_p - entry_p) / entry_p)
                rr_values.append(move_pct)

        if rr_values:
            avg_rr = round(float(sum(rr_values) / len(rr_values) * 100), 2)

        stats = {
            "total_trades": len(entries),
            "closed_trades": len(closed),
            "open_trades": len([e for e in entries if e.get("actual_outcome") == "open"]),
            "wins": len(wins),
            "losses": len(losses),
            "win_rate": round(win_rate, 2),
            "gross_profit": round(gross_profit, 2),
            "gross_loss": round(gross_loss, 2),
            "net_pnl": round(gross_profit - gross_loss, 2),
            "profit_factor": round(profit_factor, 2) if profit_factor != float("inf") else None,
            "avg_move_pct": avg_rr,
            "best_trade": best_trade,
            "worst_trade": worst_trade,
            "equity_curve": equity_curve,
        }

        return {
            "success": True,
            "entries": entries,
            "stats": stats,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Risk Calculation Endpoints ────────────────────────────────────────────────

@app.post("/risk/calculate")
async def calculate_risk(request: RiskCalcRequest):
    """
    Calculate position sizing and trade validation.
    """
    try:
        sizing = calculate_position_size(
            account_size=request.account_size,
            risk_pct=request.risk_pct,
            entry_price=request.entry_price,
            stop_loss=request.stop_loss,
        )

        if "error" in sizing:
            raise HTTPException(status_code=400, detail=sizing["error"])

        result = {"success": True, "position_sizing": sizing}

        # If target price provided, validate trade
        if request.target_price is not None:
            validation = validate_trade(
                entry_price=request.entry_price,
                stop_loss=request.stop_loss,
                target_price=request.target_price,
            )
            result["trade_validation"] = validation

        # Calculate targets based on stop loss
        from risk_engine import calculate_targets
        targets = calculate_targets(request.entry_price, request.stop_loss)
        result["suggested_targets"] = targets

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
