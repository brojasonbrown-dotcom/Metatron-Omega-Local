(* Wolfram Language utilities for the compute-engine project.
   Load with: Get["path/to/wolfram-utils.wls"] or Needs via $Path. *)

BeginPackage["ComputeEngine`"];

(* Public API *)
SymbolicToPython::usage = "SymbolicToPython[expr] converts a Wolfram symbolic expression to a string suitable for Python/sympy eval.";
ExportNumericTable::usage = "ExportNumericTable[f, {x, xmin, xmax, dx}, path] evaluates f on a grid and exports to CSV.";
SafeParallelMap::usage = "SafeParallelMap[f, list] maps f over list using all available kernels, with error checking.";
VerifySymbolicIdentity::usage = "VerifySymbolicIdentity[lhs, rhs, vars] checks if lhs == rhs symbolically, returns True/False with simplification trace.";
LaTeXExport::usage = "LaTeXExport[expr, path] exports an expression as a .tex file.";

Begin["`Private`"];

SymbolicToPython[expr_] := Module[{s},
  s = ToString[expr, InputForm];
  s = StringReplace[s, {
    "Sin[" -> "sin(", "Cos[" -> "cos(", "Tan[" -> "tan(",
    "Exp[" -> "exp(", "Log[" -> "log(", "Sqrt[" -> "sqrt(",
    "Pi" -> "pi", "E" -> "e",
    "]" -> ")", "^" -> "**"
  }];
  s
];

ExportNumericTable[f_, {x_, xmin_, xmax_, dx_}, path_String] := Module[{data},
  data = Table[{x, f}, {x, xmin, xmax, dx}];
  Export[path, data, "CSV", "TableHeadings" -> {ToString[x], "f"}]
];

SafeParallelMap[f_, list_] := Module[{results},
  If[Length[ParallelKernels[]] == 0, LaunchKernels[]];
  results = ParallelMap[f, list];
  If[MemberQ[results, $Failed],
    Print["Warning: some parallel evaluations failed"];
  ];
  results
];

VerifySymbolicIdentity[lhs_, rhs_, vars_List] := Module[{diff, simplified},
  diff = lhs - rhs;
  simplified = FullSimplify[diff, Assumptions -> Element[vars, Reals]];
  <|"identity" -> (simplified === 0),
    "residual" -> simplified,
    "lhs" -> lhs,
    "rhs" -> rhs|>
];

LaTeXExport[expr_, path_String] := Export[path, ToString[TeXForm[expr]], "Text"];

End[];
EndPackage[];
