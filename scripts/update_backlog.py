#!/usr/bin/env python3
"""
Merge QA feedback into backlog.json (placeholder for advanced logic).
"""
import json, sys, pathlib
qa = json.load(sys.stdin)
backlog = json.loads(pathlib.Path("backlog.json").read_text())

# Example: elevate bugs to top priority
for bug in qa.get("bugs", []):
    backlog["stories"].insert(0, {"title": bug["title"], "points": 1})

pathlib.Path("backlog.json").write_text(json.dumps(backlog, indent=2))
