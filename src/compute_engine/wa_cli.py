"""CLI for Wolfram|Alpha queries — thin wrapper around wolfram_alpha.py.

Usage:
    python -m compute_engine.wa_cli "population of France"
    python -m compute_engine.wa_cli --full "integrate sin(x)^4"
    python -m compute_engine.wa_cli --batch "2+2" "speed of light" "boiling point of water"
    python -m compute_engine.wa_cli --wolfram "integrate sin(x)^4 from 0 to 2"
"""

from __future__ import annotations

import argparse
import json
import sys

from compute_engine.wolfram_alpha import WolframAlphaClient


def main() -> None:
    parser = argparse.ArgumentParser(description="Wolfram|Alpha CLI")
    parser.add_argument("query", nargs="?", help="Natural-language or math query")
    parser.add_argument("--full", action="store_true", help="Show full pod structure")
    parser.add_argument("--batch", nargs="+", help="Run multiple simple queries")
    parser.add_argument("--wolfram", action="store_true",
                        help="Return Wolfram Language input string")
    parser.add_argument("--json", action="store_true", help="Raw JSON output")
    parser.add_argument("--app-id", help="Override App ID")
    args = parser.parse_args()

    if not args.query and not args.batch:
        parser.print_help()
        sys.exit(1)

    wa = WolframAlphaClient(app_id=args.app_id)

    if args.batch:
        results = wa.batch_simple(args.batch)
        for q, a in results.items():
            print(f"Q: {q}")
            print(f"A: {a}\n")
        return

    if args.wolfram:
        wl_input = wa.to_wolfram(args.query)
        print(wl_input if wl_input else "No Wolfram Language input found.")
        return

    if args.json:
        data = wa.query(args.query)
        print(json.dumps(data, indent=2))
        return

    if args.full:
        result = wa.full(args.query)
        for pod in result.get("pods", []):
            print(f"\n=== {pod.get('title', 'Untitled')} ===")
            for sub in pod.get("subpods", []):
                if sub.get("plaintext"):
                    print(f"  {sub['plaintext']}")
                if sub.get("img"):
                    print(f"  [Image: {sub['img']['src']}]")
        return

    # Default: simple answer
    answer = wa.simple(args.query)
    print(answer)


if __name__ == "__main__":
    main()
