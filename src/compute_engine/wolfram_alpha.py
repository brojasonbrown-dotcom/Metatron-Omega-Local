"""Wolfram|Alpha client for the compute-engine project.

Three access tiers:
  - Simple API    (v1/result)   — plain-text answer, minimal tokens
  - Short Answers (v1/result)   — same endpoint, concise output
  - Full Results  (v2/query)    — pod/subpod structure with math markup

Usage:
    from compute_engine.wolfram_alpha import WolframAlphaClient

    # Option A: explicit App ID (use your own key here or set env var)
    wa = WolframAlphaClient(app_id="WX4LH6W5AU")

    # Option B: auto-detect from env var WOLFRAM_ALPHA_APP_ID
    wa = WolframAlphaClient()

    # Simple text answer
    print(wa.simple("population of France"))

    # Short answer
    print(wa.short("distance from Earth to Mars in km"))

    # Full pod query
    result = wa.full("integrate sin(x)^4 from 0 to 2")
    for pod in result.pods:
        print(pod.title)
        for sub in pod.subpods:
            print("  ", sub.plaintext)

    # Raw dict access for advanced use
    data = wa.query("population of France")
    print(data["queryresult"]["numpods"])
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

DEFAULT_APP_ID = "WX4LH6W5AU"


class WolframAlphaClient:
    """Unified Wolfram|Alpha client covering Simple, Short, and Full APIs."""

    BASE_URL = "https://api.wolframalpha.com"

    def __init__(self, app_id: str | None = None):
        """Initialize with an App ID.

        Args:
            app_id: Wolfram|Alpha App ID.  If None, tries env var
                    WOLFRAM_ALPHA_APP_ID, then falls back to DEFAULT_APP_ID.
        """
        self.app_id = app_id or os.environ.get("WOLFRAM_ALPHA_APP_ID") or DEFAULT_APP_ID
        self._http = httpx.Client(timeout=30.0)

    # ── Tier 1: Simple / Short Answers (v1/result) ──────────────────────────

    def simple(self, query: str, units: str = "metric") -> str:
        """Return a plain-text answer.  Minimal tokens, no markup.

        Args:
            query: Natural-language or math query.
            units: "metric" or "imperial".

        Returns:
            Plain-text answer string, e.g. "66.4 million people".

        Note:
            The v1/result endpoint is limited to simple queries.  Complex
            math (integrals, special characters) may return 501.  Use
            full() or query() for those cases.
        """
        resp = self._http.get(
            f"{self.BASE_URL}/v1/result",
            params={"i": query, "appid": self.app_id, "units": units},
        )
        if resp.status_code == 501:
            # Fallback: use v2/query and extract the Result pod's plaintext
            data = self.query(query)
            pods = data.get("queryresult", {}).get("pods", [])
            # Prefer "Result" pod, then primary pod, then Input pod
            for pod_id in ["Result", "Input"]:
                for pod in pods:
                    if pod.get("id") == pod_id:
                        subpods = pod.get("subpods", [])
                        if subpods:
                            text = subpods[0].get("plaintext", "").strip()
                            # If it's an equation, extract the RHS
                            if "=" in text and not text.startswith("integral"):
                                return text.split("=", 1)[1].strip()
                            return text
            # Fallback: any primary pod
            for pod in pods:
                if pod.get("primary"):
                    subpods = pod.get("subpods", [])
                    if subpods:
                        return subpods[0].get("plaintext", "").strip()
            return "No result"
        resp.raise_for_status()
        return resp.text.strip()

    def short(self, query: str, timeout: int = 10) -> str:
        """Short Answer API — concise one-liner.  Same endpoint as simple(),
        but signals intent for brevity via the 'short' pod state.

        In practice the v1/result endpoint already returns short text;
        this is a semantic convenience wrapper.
        """
        return self.simple(query)

    # ── Tier 2: Full Results (v2/query) ─────────────────────────────────────

    def full(self, query: str, **kwargs: Any) -> dict[str, Any]:
        """Run a full Wolfram|Alpha query and return parsed pod structure.

        Args:
            query: Natural-language or math query.
            **kwargs: Extra params merged into the API call.

        Returns:
            Dict with 'pods' list, each pod having 'title' and 'subpods'.
        """
        data = self.query(query, **kwargs)
        return data.get("queryresult", {})

    def full_pods(self, query: str) -> list[dict[str, Any]]:
        """Return just the pods list from a full query."""
        result = self.full(query)
        return result.get("pods", [])

    def query(self, query: str, **kwargs: Any) -> dict[str, Any]:
        """Run a full query and return the raw JSON dict.

        Useful when you need pod IDs, states, assumptions, or math markup
        beyond the simple plaintext view.

        Returns:
            Parsed JSON response as a Python dict.
        """
        resp = self._http.get(
            f"{self.BASE_URL}/v2/query",
            params={
                "input": query,
                "appid": self.app_id,
                "output": "json",
                "format": "plaintext",
                **kwargs,
            },
        )
        resp.raise_for_status()
        return resp.json()

    # ── Convenience: extract math as Wolfram Language ────────────────────────

    def to_wolfram(self, query: str) -> str | None:
        """Return the Wolfram Language input string for a query.

        Wolfram|Alpha's JSON API doesn't expose the parsed Wolfram Language
        input (that's a Pro feature).  Instead, this returns the best-effort
        plaintext from the Input pod, which often contains the equation in
        a parseable form.  For true natural-language → Wolfram Language
        conversion, use the local kernel's SemanticInterpretation via
        WolframPipeline.
        """
        data = self.query(query)
        pods = data.get("queryresult", {}).get("pods", [])
        for pod in pods:
            if pod.get("id") == "Input":
                subpods = pod.get("subpods", [])
                if subpods:
                    return subpods[0].get("plaintext", "")
        return None

    # ── Convenience: batch query ─────────────────────────────────────────────

    def batch_simple(self, queries: list[str], delay: float = 0.5) -> dict[str, str]:
        """Run multiple simple queries and return {query: answer}.

        Args:
            queries: List of query strings.
            delay: Seconds between requests (rate-limit courtesy).

        Returns:
            Dict mapping each query to its plain-text answer.
        """
        import time

        results = {}
        for i, q in enumerate(queries):
            if i > 0:
                time.sleep(delay)
            try:
                results[q] = self.simple(q)
            except Exception as e:
                results[q] = f"ERROR: {e}"
        return results

    # ── Context manager ───────────────────────────────────────────────────────

    def __enter__(self) -> "WolframAlphaClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self._http.close()

    def __del__(self) -> None:
        try:
            self._http.close()
        except Exception:
            pass
