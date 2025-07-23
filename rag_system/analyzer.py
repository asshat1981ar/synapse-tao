from typing import List, Dict, Any
import sqlite3
import numpy as np

def analyze_recent_metrics(n: int = 10, db_path: str = "metrics.db") -> Dict[str, Any]:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT * FROM self_opt_metrics ORDER BY timestamp DESC LIMIT ?", (n,))
    rows = c.fetchall()
    conn.close()

    latencies = [row[1] for row in rows]
    chunk_counts = [row[2] for row in rows]
    overlaps = [row[4] for row in rows]
    insert_rates = [row[5] for row in rows]

    return {
        "avg_latency": float(np.mean(latencies)) if latencies else None,
        "avg_chunk_count": float(np.mean(chunk_counts)) if chunk_counts else None,
        "avg_overlap": float(np.mean(overlaps)) if overlaps else None,
        "avg_insert_rate": float(np.mean(insert_rates)) if insert_rates else None,
        "latency_spike": max(latencies) > 2 * np.mean(latencies) if latencies else False
    }
