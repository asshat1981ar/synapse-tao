#!/usr/bin/env python3
"""
discover_and_add_mcp_servers.py
--------------------------------
Discover local MCP servers (executables) and generate or merge a Copilot
MCP configuration JSON.

Discovery heuristics:
  - Scans every entry in $PATH for binaries whose names contain any of:
    "mcp-server", "-mcp", or "_mcp".
  - Reads optional YAML descriptor files under ./mcp_servers/*.yaml; each
    must contain keys: name, type, url (for remote) or command (for local).
  - Accepts extra servers via the --add flag:  name=command:tool1,tool2

Usage:

  # just discover and print JSON
  ./discover_and_add_mcp_servers.py

  # merge discoveries into an existing file
  ./discover_and_add_mcp_servers.py --merge .github/copilot/mcp.json

  # discover + explicit extra server
  ./discover_and_add_mcp_servers.py --add sentry='npx @sentry/mcp-server@latest:*'

"""
import argparse, os, json, shutil, yaml, re, subprocess
from pathlib import Path

NAME_PATTERNS = re.compile(r'(mcp-server|-mcp|_mcp)$')

def find_binaries():
    servers = {}
    for p in os.environ.get("PATH", "").split(os.pathsep):
        try:
            for entry in Path(p).iterdir():
                if entry.is_file() and os.access(entry, os.X_OK):
                    if NAME_PATTERNS.search(entry.name):
                        name = entry.stem.replace('-', '_')
                        servers[name] = {
                            "type": "local",
                            "command": str(entry),
                            "args": [],
                            "tools": ["*"]
                        }
        except FileNotFoundError:
            continue
    return servers

def load_yaml_descriptors():
    servers = {}
    base = Path("mcp_servers")
    if not base.exists():
        return servers
    for yml in base.glob("*.yaml"):
        with open(yml, 'r') as f:
            data = yaml.safe_load(f)
        name = data["name"]
        servers[name] = {k: v for k, v in data.items() if k != "name"}
    return servers

def parse_add_flags(add_list):
    servers = {}
    for item in add_list:
        # format name=command[:tools]
        if '=' not in item:
            continue
        name, rest = item.split('=', 1)
        if ':' in rest:
            command, tools = rest.split(':', 1)
            tools_list = tools.split(',') if tools != '*' else ["*"]
        else:
            command, tools_list = rest, ["*"]
        servers[name] = {
            "type": "local",
            "command": command.split()[0],
            "args": command.split()[1:],
            "tools": tools_list
        }
    return servers

def merge_configs(existing, new):
    merged = existing.copy()
    merged.setdefault("mcpServers", {})
    for name, cfg in new.items():
        merged["mcpServers"][name] = cfg
    return merged

def main():
    ap = argparse.ArgumentParser(description="Discover MCP servers and update config.")
    ap.add_argument("--merge", metavar="FILE", help="Path to existing MCP JSON to merge into")
    ap.add_argument("--add", action="append", default=[], help="Manually add server (name=command[:tools])")
    args = ap.parse_args()

    servers = {}
    servers.update(find_binaries())
    servers.update(load_yaml_descriptors())
    servers.update(parse_add_flags(args.add))

    config = {"mcpServers": servers}

    if args.merge:
        path = Path(args.merge)
        if path.exists():
            with open(path) as f:
                existing = json.load(f)
        else:
            existing = {}
        merged = merge_configs(existing, servers)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            json.dump(merged, f, indent=2)
        print(f"Wrote merged config to {path}")
    else:
        print(json.dumps(config, indent=2))

if __name__ == "__main__":
    main()
