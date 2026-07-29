"""Integration layer: Wolfram|Alpha natural language → Wolfram kernel evaluation.

This module bridges the three Wolfram technologies:
  1. Wolfram|Alpha — interprets natural language, returns structured math
  2. Wolfram Language (wolframclient) — local symbolic kernel
  3. This module — orchestrates the pipeline

Usage:
    from compute_engine.wolfram_pipeline import WolframPipeline

    wp = WolframPipeline()

    # Natural language → W|A interpretation → local symbolic evaluation
    result = wp.symbolic("integrate sin(x)^4 from 0 to 2")
    print(result["wolfram_input"])   # Integrate[Sin[x]^4, {x, 0, 2}]
    print(result["local_result"])    # (24 - 8*Sin[4] + Sin[8])/32

    # Quick answer without local kernel
    print(wp.answer("population of France"))

    # Verify an identity using W|A's interpretation + local FullSimplify
    print(wp.verify("sin(x)^2 + cos(x)^2 == 1"))
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from compute_engine.wolfram_alpha import WolframAlphaClient
from compute_engine.wolfram_bridge import WolframSession

logger = logging.getLogger(__name__)


class WolframPipeline:
    """Orchestrates Wolfram|Alpha + local Wolfram kernel for maximum power."""

    def __init__(self, app_id: str | None = None, kernel_path: str | None = None):
        """Initialize both clients.

        Args:
            app_id: Wolfram|Alpha App ID (falls back to env/default).
            kernel_path: Path to Wolfram kernel executable (auto-detected if None).
        """
        self.wa = WolframAlphaClient(app_id=app_id)
        self._kernel_path = kernel_path
        self._session: WolframSession | None = None

    def _ensure_kernel(self) -> WolframSession:
        """Lazy-start the local Wolfram kernel session."""
        if self._session is None:
            self._session = WolframSession(kernel_path=self._kernel_path)
            self._session.start()
        return self._session

    def answer(self, query: str) -> str:
        """Quick plain-text answer from Wolfram|Alpha.  No local kernel needed."""
        return self.wa.simple(query)

    def symbolic(self, query: str) -> dict[str, Any]:
        """Natural language → Wolfram Language → local symbolic evaluation.

        Uses the local kernel's SemanticInterpretation to convert natural
        language to Wolfram Language, then evaluates it locally.

        Returns dict with:
          - query: original natural language
          - wolfram_input: SemanticInterpretation result (held form)
          - local_result: result from local kernel evaluation
          - wa_answer: W|A's own plain-text answer (for comparison)
        """
        wa_answer = self.wa.simple(query)

        result: dict[str, Any] = {
            "query": query,
            "wolfram_input": None,
            "wa_answer": wa_answer,
            "local_result": None,
        }

        session = self._ensure_kernel()
        try:
            # Hold the interpretation to get the expression, not the result
            interpreted = session.evaluate(
                f'ToString[HoldForm[SemanticInterpretation["{query}"]], InputForm]'
            )
            result["wolfram_input"] = interpreted

            # Evaluate the interpreted expression
            local = session.evaluate(f'SemanticInterpretation["{query}"]')
            result["local_result"] = str(local)
        except Exception as e:
            result["local_result"] = f"ERROR: {e}"

        return result

    def verify(self, identity: str) -> dict[str, Any]:
        """Verify a mathematical identity using local FullSimplify.

        Args:
            identity: e.g. "sin(x)^2 + cos(x)^2 == 1"

        Returns:
            Dict with 'identity' (bool), 'wolfram_input', 'local_simplified'.
        """
        # Normalize common math notation to Wolfram Language
        # Protect == before replacing single =
        wl_input = identity.replace("==", "\x00EQUALS\x00")
        wl_input = (
            wl_input
            .replace("sin", "Sin")
            .replace("cos", "Cos")
            .replace("tan", "Tan")
            .replace("log", "Log")
            .replace("exp", "Exp")
            .replace("=", "==")
            .replace("\x00EQUALS\x00", "==")
        )
        # Convert function calls: Sin(x) → Sin[x], etc.
        import re
        wl_input = re.sub(r'(Sin|Cos|Tan|Log|Exp|Sec|Csc|Cot|ArcSin|ArcCos|ArcTan)\(([^)]+)\)', r'\1[\2]', wl_input)

        # Split on ==
        if "==" in wl_input:
            lhs, rhs = wl_input.split("==", 1)
        else:
            lhs, rhs = wl_input, "0"

        session = self._ensure_kernel()
        simplified = session.evaluate(
            f"FullSimplify[({lhs.strip()}) - ({rhs.strip()}), Assumptions -> Element[x, Reals]]"
        )
        is_identity = str(simplified).strip() == "0"

        return {
            "identity": is_identity,
            "wolfram_input": wl_input,
            "local_simplified": str(simplified),
        }

    def batch_symbolic(self, queries: list[str]) -> list[dict[str, Any]]:
        """Run multiple symbolic queries through the pipeline."""
        return [self.symbolic(q) for q in queries]

    def close(self) -> None:
        """Shut down the local kernel session."""
        if self._session:
            self._session.stop()
            self._session = None

    def __enter__(self) -> "WolframPipeline":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()
