import os
import aiosqlite
from contextlib import asynccontextmanager

os.makedirs("backend", exist_ok=True)

DB_PATH = "backend/investment.db"


async def init_db():
    """Initialize the database and create tables if they don't exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                market TEXT NOT NULL,
                entry_price REAL NOT NULL,
                current_price REAL,
                quantity REAL NOT NULL,
                entry_date TEXT NOT NULL,
                status TEXT DEFAULT 'open',
                exit_price REAL,
                exit_date TEXT,
                realized_pnl REAL DEFAULT 0,
                unrealized_pnl REAL DEFAULT 0,
                notes TEXT,
                verdict_at_entry TEXT
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS journal (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                market TEXT,
                entry_price REAL,
                exit_price REAL,
                quantity REAL,
                entry_date TEXT,
                exit_date TEXT,
                verdict TEXT,
                confidence REAL,
                overall_score REAL,
                agent_reports TEXT,
                actual_outcome TEXT,
                realized_pnl REAL DEFAULT 0,
                setup_type TEXT,
                market_condition TEXT,
                notes TEXT
            )
        """)

        await db.commit()


@asynccontextmanager
async def get_db():
    """Async context manager for database connections."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db
