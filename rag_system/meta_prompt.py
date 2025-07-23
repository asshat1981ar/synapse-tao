from typing import Dict, Any

def generate_meta_prompt(insights: Dict[str, Any], cfg: Dict[str, Any]) -> str:
    prompt = (
        f"Recent Stats: Latency={insights['avg_latency']}, ChunkCount={insights['avg_chunk_count']}, "
        f"Overlap={insights['avg_overlap']}, DBRate={insights['avg_insert_rate']}\n"
        f"Config: {cfg}\nProposal: "
    )
    if insights["latency_spike"]:
        prompt += "Decrease concurrency limit.\n"
    if insights["avg_chunk_count"] > 1000:
        prompt += "Increase chunk size.\n"
    if insights["avg_overlap"] < 0.1:
        prompt += "Increase token overlap.\n"
    prompt += "Request validation tests for these changes."
    return prompt
