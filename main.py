import json
from rag_system.metrics import record_metrics
from rag_system.analyzer import analyze_recent_metrics
from rag_system.config_tuner import auto_tune_config
from rag_system.meta_prompt import generate_meta_prompt
from rag_system.ci_trigger import trigger_ci

def run_pipeline():
    metrics = {
        "fetch_latency": 0.8,
        "chunk_count": 900,
        "chunk_size_dist": [1024, 1024, 512],
        "token_overlap_ratio": 0.07,
        "db_insert_throughput": 120.5
    }
    record_metrics(metrics)

    insights = analyze_recent_metrics(n=10)
    auto_tune_config(insights)
    with open("config.json") as f:
        cfg = json.load(f)
    prompt = generate_meta_prompt(insights, cfg)
    print(prompt)

    trigger_ci()

if __name__ == "__main__":
    run_pipeline()
