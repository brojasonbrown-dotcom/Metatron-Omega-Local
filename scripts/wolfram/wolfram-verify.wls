(* wolfram-verify.wls — METATRON Ω φ-identity bank.
   Emits a single JSON object: symbolic identity residuals (must be 0) and
   60-digit numeric values for the certified constants in
   trnn-core/src/core/constants.ts.

   Run: wolframscript -f scripts/wolfram/wolfram-verify.wls
*)

Off[General::spell];

phi = (1 + Sqrt[5]) / 2;

(* ── Exact identities — residual must be exactly 0 ──────────────────────── *)
identities = <|
  "phiSquared_eq_phiPlus1"        -> Simplify[phi^2 - (phi + 1)],
  "phiInv_eq_phiMinus1"           -> Simplify[1/phi - (phi - 1)],
  "phiInvPlusPhiInv2_eq_1"        -> Simplify[(1/phi + 1/phi^2) - 1],
  "oneMinusPhiInv3_eq_2phiInv2"   -> Simplify[(1 - 1/phi^3) - 2/phi^2],
  "kappaPhiPi_eq_1"               -> Simplify[((1/(phi*Pi)) * phi * Pi) - 1],
  "reflectGain_eq_kappaOverPhi"   -> Simplify[(1/(phi^2*Pi)) - ((1/(phi*Pi))/phi)]
|>;

(* ── 60-digit numeric values (the certified constants) ──────────────────── *)
values = <|
  "phi"               -> N[phi, 60],
  "phiInv"            -> N[1/phi, 60],
  "phiInv7"           -> N[phi^-7, 60],
  "kappa"             -> N[1/(phi*Pi), 60],
  "reflectGain"       -> N[1/(phi^2*Pi), 60],
  "lambdaMemory"      -> N[phi^-2, 60],
  "clampMax"          -> N[phi^4, 60],
  "ignitionThreshold" -> N[phi^-2, 60],
  "cellAlpha"         -> N[phi^-2, 60],
  "cellBeta"          -> N[phi^-5, 60],
  "cellGamma"         -> N[phi^-3, 60],
  "cellDelta"         -> N[phi^-3, 60],
  "cellEpsilon"       -> N[phi^-8, 60],
  "cellZeta"          -> N[phi^-3, 60],
  "cellEta"           -> N[phi^-5, 60],
  "cellMu"            -> N[phi^-5, 60],
  "cellXi"            -> N[phi^-5, 60],
  "juryGain"          -> N[phi^-2 + phi^-5 + 2*phi^-8 + phi^-3, 60],
  "tempRef"           -> N[phi^3, 60],
  "magneticScale"     -> N[phi^-3, 60]
|>;

(* ── Emission: JSON for the TS lock test to consume ──────────────────────── *)
payload = <|"identities" -> identities, "values" -> values|>;
Print[ExportString[payload, "JSON"]];
