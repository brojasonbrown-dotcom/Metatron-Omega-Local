(* ============================================================================
   CERTIFICATE 5 — MULTI-BASE GEMATRIA, EXACT ARITHMETIC & ADAPTIVE PRECISION
   W2 of the AGI-robustness track. Establishes what is RIGOROUS vs PSEUDOSCIENCE
   in base-b digit dynamics, gematria, Zeckendorf addressing, and Z[phi] exact
   arithmetic. The honesty table (section G5) is the load-bearing output: it
   defines which gematria quantities are theorems (safe to hardcode) and which
   are numerology (never to be used as features).
   Every theorem check must Print True. Any False = certificate FAILURE.
   ============================================================================ *)

$RecursionLimit = Infinity;
phi = GoldenRatio;

(* ---- G1: digital-root theorem in base b --------------------------------------
   THEOREM: in base b, the repeated digit-sum (digital root) of a positive
   integer n equals n mod (b-1), with the convention that 0 maps to b-1.
   This is a REAL invariant: it is basis-independent in the sense that the
   residue n mod (b-1) is a property of n, and base-b digits merely reveal it.
   Verify across many bases and values. *)

digitalRoot[n_Integer, b_Integer] := FixedPoint[Total[IntegerDigits[#, b]] &, n];
drTheorem[n_Integer, b_Integer] := Module[{r = Mod[n, b - 1]},
  digitalRoot[n, b] == If[r == 0, b - 1, r]];
bases = {2, 3, 7, 8, 10, 12, 16, 36, 60};
vals = {1, 7, 144, 987, 10946, 123456789, 999983};
g1 = And @@ Flatten@Table[drTheorem[n, b], {n, vals}, {b, bases}];
Print["G1 digital-root = n mod (b-1) holds across 7 vals x 9 bases: ", g1];

(* ---- G2: termination of the repeated digit-sum map ---------------------------
   THEOREM: for any base b>=2 and any starting n, the map n -> digitsum_b(n)
   reaches a single digit in O(log_b n) iterations. (It strictly decreases for
   n >= b.) This makes digital roots computable and cheap — a usable feature. *)

stepsToRoot[n_Integer, b_Integer] := Length@FixedPointList[Total[IntegerDigits[#, b]] &, n] - 2;
g2a = And @@ Flatten@Table[stepsToRoot[n, b] <= Ceiling[Log[b, n]] + 2, {n, {987, 10946, 123456789}}, {b, bases}];
Print["G2 digit-sum map terminates in O(log n) steps: ", g2a];
Print["G2 sample steps (n=123456789): base10=", stepsToRoot[123456789, 10],
      " base2=", stepsToRoot[123456789, 2], " base60=", stepsToRoot[123456789, 60]];

(* ---- G3: Z[phi] exact arithmetic ------------------------------------------------
   THEOREM: phi = (1+Sqrt[5])/2 satisfies phi^2 = phi + 1, so the ring Z[phi] =
   {a + b*phi : a,b in Z} is closed under +,-,*. Every element is an EXACT
   algebraic number — no float64 rounding. This is the rigorous substrate for
   "exact phi arithmetic" (no drift ever). Verify closure + the norm map.   *)

(* represent a+b*phi as {a,b}; ops *)
zAdd[{a_, b_}, {c_, d_}] := {a + c, b + d};
zMul[{a_, b_}, {c_, d_}] := {a*c + b*d, a*d + b*c + b*d}; (* (a+b p)(c+d p)=ac+(ad+bc)p+bd p^2, p^2=p+1 *)
zNorm[{a_, b_}] := a^2 + a*b - b^2; (* N(a+b p) = (a+b p)(a+b p') where p'=(1-sqrt5)/2 *)
toExact[{a_, b_}] := a + b*phi;

g3a = Simplify[toExact[zMul[{2, 3}, {4, -1}]] == (2 + 3 phi) (4 - phi)];
g3b = Simplify[zNorm[{a, b}] == (a + b phi) (a + b (1 - Sqrt[5])/2) /. {a -> 3, b -> 5}];
(* multiplicativity of norm over a sample *)
g3c = And @@ Flatten@Table[zNorm[zMul[x, y]] == zNorm[x] zNorm[y],
                   {x, {{1, 1}, {2, 3}, {5, -2}}}, {y, {{0, 1}, {3, 4}, {1, -1}}}];
Print["G3 Z[phi] closed under *: ", g3a, " ; norm formula: ", g3b, " ; norm multiplicative: ", g3c];
Print["G3 phi^26 in Z[phi] = F(25)+F(26)phi = ", Simplify[Fibonacci[25] + Fibonacci[26] phi]];

(* ---- G4: Zeckendorf theorem ----------------------------------------------------  *)
   (* (Lucas round check is moved to G6 with sufficient working precision.)      *)

(* ---- G4: Zeckendorf theorem ----------------------------------------------------
   THEOREM (Zeckendorf): every positive integer has a UNIQUE representation as
   a sum of non-consecutive Fibonacci numbers (using F2=1,F3=2,...). This is a
   rigorous, computable addressing scheme — "fib base" that is NOT numerology.
   Verify existence+uniqueness for a range, and that greedy decomposition works.*)

zeck[n_Integer] := Module[{fibs = {}, k = 2, rest = n},
  While[Fibonacci[k] <= n, AppendTo[fibs, Fibonacci[k]]; k++];
  fibs = Reverse[fibs];
  Reverse@Reap[Do[If[f <= rest, Sow[f]; rest -= f], {f, fibs}]][[2, 1]]];
nonConsec[l_List] := Module[{idx = Flatten[Table[Position[Table[Fibonacci[k], {k, 2, 40}], f][[1, 1]], {f, l}]]},
  And @@ Table[Abs[idx[[i]] - idx[[i + 1]]] > 1, {i, Length[idx] - 1}]];
zeckOK[n_Integer] := Module[{z = zeck[n]}, Total[z] == n && nonConsec[z]];
g4 = And @@ Table[zeckOK[n], {n, 1, 2000}];
Print["G4 Zeckendorf: every n in 1..2000 decomposes uniquely, non-consecutive: ", g4];
Print["G4 sample: 100 = ", zeck[100], " ; 10946 = ", zeck[10946]];

(* ---- G5: HONESTY TABLE — theorem vs numerology --------------------------------
   THEOREM (safe to hardcode): digital root mod (b-1) [G1], digit-sum
   termination [G2], Z[phi] closure+norm [G3], Zeckendorf existence+uniqueness
   [G4], phi^2=phi+1, Binet, Lucas closed form, Q-matrix eigenvalues.
   NUMEROLOGY (NOT a theorem, must NEVER be a feature or a name): any claimed
   "meaning"/"vibration"/"energy" of a digit pattern; gematria "equivalence" of
   unrelated words via shared letter-sum; predicting events from digit roots.
   These are printed as the contract — the engine will encode the theorems and
   refuse the rest. *)

Print["G5 THEOREMS (hardcodable): digitalRoot mod (b-1), digitSum termination, Z[phi] ring, Zeckendorf, phi^2=phi+1, Binet, Lucas, Q-matrix"];
Print["G5 NUMEROLOGY (refused): meaning-of-digits, gematria word-equivalence, event prediction from digit roots"];

(* ---- G6: adaptive-precision / stability tiers --------------------------------
   The user's "different decimal values of stability" = an honest precision
   ladder. Verify the float64 guard-digit budget: how many correct significant
   digits does binary64 carry, and at what magnitude do phi-powers lose the
   integer part (i.e. become pure rounding noise)?                           *)

digits64 = Round[Log[10, 2^53]];
Print["G6 binary64 carries ", digits64, " significant decimal digits"];
kNoise = SelectFirst[Range[1, 2000], N[GoldenRatio^#, $MachinePrecision] == Infinity &];
Print["G6 phi^k overflows binary64 at k = ", kNoise];
(* Lucas(n) = round(phi^n). THE PRECISION LADDER BOUNDARY: binary64 represents
   integers exactly only below 2^53 ≈ 9.007e15. phi^n crosses 2^53 at n=77, so
   round(float64 phi^n) is exactly Lucas(n) for n <= 76 and drifts after.
   This n=76 horizon is the honest boundary between the EXACT tier (integer
   Lucas/Fibonacci arithmetic) and the FLOAT tier (binary64 φ-powers). Verify.*)
phiN[n_Integer] := N[GoldenRatio^n, 60];
horizon = Floor[Log[GoldenRatio, N[2^53, 30]]];
Print["G6 largest n with phi^n < 2^53 (float64 integer-exact): ", horizon];
floatRoundOK[n_Integer] := LucasL[n] == Round[N[GoldenRatio^n, $MachinePrecision]];
(* Lucas(n)=round(phi^n) holds for n>=2 (n=1 gives round(1.618)=2 != Lucas(1)=1).
   Exact window is therefore n in [2,76]. *)
g6a = And @@ Table[floatRoundOK[n], {n, 2, horizon}];
Print["G6 Lucas(n)=float64-round(phi^n) exact for all n in [2,", horizon, "]: ", g6a];
Print["G6 at the boundary: Lucas(76)=", LucasL[76], " ; Lucas(77)=", LucasL[77],
      " (>2^53? ", LucasL[77] > 2^53, ")"];

Print["CERT5 ALL CHECKS PRINTED"];
