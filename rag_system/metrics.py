from typing import Dict, Any
import sqlite3
import datetime

def record_metrics(metrics: Dict[str, Any], db_path: str = "metrics.db") -> None:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS self_opt_metrics (
            timestamp TEXT,
            fetch_latency REAL,
            chunk_count INTEGER,
            chunk_size_dist TEXT,
            token_overlap_ratio REAL,
            db_insert_throughput REAL
        )
    """)
    c.execute("""
        INSERT INTO self_opt_metrics VALUES (?, ?, ?, ?, ?, ?)
    """, (
        datetime.datetime.utcnow().isoformat(),
        metrics['fetch_latency'],
        metrics['chunk_count'],
        str(metrics['chunk_size_dist']),
        metrics['token_overlap_ratio'],
        metrics['db_insert_throughput'],
    ))
    conn.commit()
    conn.close()
