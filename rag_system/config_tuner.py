import json
from typing import Dict, Any

def auto_tune_config(insights: Dict[str, Any], config_path: str = "config.json") -> None:
    with open(config_path, "r") as f:
        cfg = json.load(f)

    if insights["latency_spike"]:
        cfg["concurrency_limit"] = max(1, cfg["concurrency_limit"] - 2)
    if insights["avg_chunk_count"] > 1000:
        cfg["chunk_size"] = min(cfg.get("chunk_size", 1024) * 2, 8192)
    if insights["avg_overlap"] < 0.1:
        cfg["token_overlap"] = cfg.get("token_overlap", 32) + 16

    with open(config_path, "w") as f:
        json.dump(cfg, f, indent=2)
