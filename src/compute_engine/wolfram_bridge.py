"""Wolfram Language bridge for the compute-engine project.

Provides a persistent Wolfram kernel session for symbolic computation
from Python, with automatic serialization of results.

Usage:
    from compute_engine.wolfram_bridge import WolframSession

    with WolframSession() as ws:
        result = ws.evaluate("Integrate[Sin[x]^4, {x, 0, 2}]")
        print(result)  # (24 - 8*Sin[4] + Sin[8])/32
"""

from __future__ import annotations

import logging
from typing import Any

from wolframclient.evaluation import WolframLanguageSession
from wolframclient.language import wl, wlexpr
from wolframclient.serializers import export

logger = logging.getLogger(__name__)


class WolframSession:
    """Persistent Wolfram kernel session with convenience methods."""

    def __init__(self, kernel_path: str | None = None):
        self._kernel_path = kernel_path
        self._session: WolframLanguageSession | None = None

    def start(self) -> None:
        """Launch the Wolfram kernel session."""
        kwargs = {}
        if self._kernel_path:
            kwargs["kernel"] = self._kernel_path
        self._session = WolframLanguageSession(**kwargs)
        self._session.start()
        logger.info("Wolfram kernel started: %s", self._session.evaluate("$Version"))

    def stop(self) -> None:
        """Terminate the kernel session."""
        if self._session:
            self._session.terminate()
            self._session = None

    def evaluate(self, expr: str) -> Any:
        """Evaluate a Wolfram Language expression string.

        Args:
            expr: Wolfram Language code, e.g. "Integrate[Sin[x], x]"

        Returns:
            The result, deserialized to Python types where possible.
        """
        if not self._session:
            raise RuntimeError("Session not started. Use start() or context manager.")
        return self._session.evaluate(wlexpr(expr))

    def evaluate_wl(self, expr: Any) -> Any:
        """Evaluate a wl.* expression object.

        Example:
            ws.evaluate_wl(wl.Integrate(wl.Sin(wl.x), wl.x))
        """
        if not self._session:
            raise RuntimeError("Session not started.")
        return self._session.evaluate(expr)

    def verify_identity(self, lhs: str, rhs: str, variables: list[str] | None = None) -> dict:
        """Check if two symbolic expressions are identical.

        Returns dict with 'identity' (bool), 'residual' (simplified difference).
        """
        vars_str = ", ".join(variables) if variables else "x"
        result = self.evaluate(
            f'Module[{{diff = ({lhs}) - ({rhs}), simplified}},'
            f' simplified = FullSimplify[diff, Assumptions -> Element[{{{vars_str}}}, Reals]];'
            f' <|"identity" -> (simplified === 0), "residual" -> ToString[simplified]|>]'
        )
        return result

    def export_latex(self, expr: str, path: str) -> None:
        """Export a Wolfram expression as LaTeX."""
        self.evaluate(f'Export["{path}", ToString[TeXForm[{expr}]], "Text"]')

    def __enter__(self) -> "WolframSession":
        self.start()
        return self

    def __exit__(self, *exc: object) -> None:
        self.stop()
