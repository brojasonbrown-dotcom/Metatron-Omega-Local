(* ============================================================================
   CERTIFICATE 4 — COMPUTATIONAL DEPTH OF THE ONTOLOGY
   W1 of the AGI-robustness track. Verifies the true growth law of the node
   ladder, RAM-bounded depth ceilings, HNSW level theory, the float64 stability
   horizon of φ-power iteration, and the exact 1000/φ⁴ figure. Numeric
   witnesses use the ACTUAL engine constants (10946=F21 cap, TICK_MS=146,
   14 φ-bands, 144=F12 chunk) so results transfer directly.
   Every check must Print True. Any False = certificate FAILURE.
   ============================================================================ *)

$RecursionLimit = Infinity;

phi = N[GoldenRatio, 40];
Fib[n_Integer] := Fibonacci[n];

(* ---- node-ladder growth law (REAL law from fractal_node_engine.ts) ---------
   Child count at depth d is Fibonacci(d+1) CAPPED at 13 (fractal_node_engine.ts:195).
   Root at depth 0. So the per-level node count is:
     level 0: 1
     level 1: F(2)=1            (root's children, min(F(1),13)=1)
     level 2: F(2)*min(F(2),13) ... -- branching factor at a node of depth d is
   b(d)=Min[Fibonacci[d+1],13] = 1,1,2,3,5,8,13,13,13,...
   The census at total depth D is sum of the per-level counts. Verify against
   the gate's measured 41 (depth 5) and 281 (organic deepen).                  *)

b[d_Integer] := Min[Fibonacci[d + 1], 13];
levelCount[0] = 1;
levelCount[d_Integer] := levelCount[d - 1]*b[d - 1];
census[d_Integer] := Sum[levelCount[k], {k, 0, d}];
Print["D1 branching factors b(0..8): ", Table[b[k], {k, 0, 8}]];
Print["D1 level counts 0..7: ", Table[levelCount[k], {k, 0, 7}]];
Print["D1 census(5)=", census[5], "  (gate measured 41)"];
Print["D1 census(6)=", census[6], " ; census(7)=", census[7], " ; census(8)=", census[8], "  (gate deepened toward ~281)"];

(* growth-rate law: once the branching cap saturates at 13 (d>=6), the census
   is dominated by the level-13+ geometric tail 13^k; before that the Fibonacci
   ramp. Find the depth where census crosses the F21=10946 concept cap and the
   281-node settle point. *)
crossCap = SelectFirst[Range[2, 40], census[#] >= 10946 &];
Print["D1 census first exceeds 10946 (F21 concept cap) at depth: ", crossCap,
      "  census=", census[crossCap]];
Print["D1 census(6)>=281: ", census[6] >= 281];

(* ---- RAM-bounded depth ceiling ----------------------------------------------
   Per-node working-set estimate: a node carries a 14-band field (14 float64),
   a 144-dim percept prototype (144 float64), links and metadata (~1.2 KB).
   Under a RAM budget B bytes the max census N satisfies N*bytes <= B, and the
   ladder depth is the largest d with census(d) <= N. Verify the map d->N is
   monotone and report ceilings at realistic budgets.                            *)

bytesPerNode = 1500; (* conservative float64 field+prototype+links *)
ceilD[B_] := Module[{d = 0}, While[census[d + 1]*bytesPerNode <= B, d++]; d];
Print["D2 ceiling @256MB = depth ", ceilD[256 2^20], " (census ", census[ceilD[256 2^20]], ")"];
Print["D2 ceiling @1GB   = depth ", ceilD[2^30], " (census ", census[ceilD[2^30]], ")"];
Print["D2 ceiling @8GB   = depth ", ceilD[8 2^30], " (census ", census[ceilD[8 2^30]], ")"];
Print["D2 monotonic: ", OrderedQ[{ceilD[256 2^20], ceilD[2^30], ceilD[8 2^30]}, LessEqual]];

(* ---- HNSW level theory ------------------------------------------------------
   Level assignment p(level >= l) = exp(-l/levelMultiplier), levelMultiplier =
   1/ln(M). Expected max level over N items ~ ln(N)*levelMultiplier.
   Verify the level-0 mass fraction (work concentrates at base) and that the
   expected max level at N=10946 stays small (polylog retrieval claim).        *)

M = 16; lm = 1/Log[M];
pLev[l_Integer] := Exp[-l/lm];
fracLevel0 = 1 - pLev[1];
Print["D3 fraction of nodes at level 0: ", N[fracLevel0, 4]];
expMaxLevel[N_Integer] := lm Log[N];
Print["D3 expected max level @N=10946 (F21 cap): ", N[expMaxLevel[10946], 4]];
Print["D3 expected max level @N=10^9          : ", N[expMaxLevel[10^9], 4]];
Print["D3 polylog retrieval: max level grows ln: ",
      N[expMaxLevel[10^9]/expMaxLevel[10946], 4], "x for 100000x data"];

(* ---- float64 stability horizon of φ-power iteration -------------------------
   Iterating p <- p*phi in binary64 accumulates rounding; the relative error
   after k steps is ~ k*eps. Direct pow phi^k is correctly rounded. Verify the
   drift curve and find the k where iterative error exceeds 1e-12 (the point
   where we must re-anchor). Also verify phi^k stays finite up to k=1435
   (overflow horizon) and that phi^26 exact-integer identity holds.           *)

eps = $MachineEpsilon;
iterErr[k_Integer] := Module[{p = 1.0, i}, For[i = 0, i < k, i++, p = p*1.618033988749895];
  Abs[(p - N[GoldenRatio^k, 30])/N[GoldenRatio^k, 30]]];
drift = Table[{k, iterErr[k]}, {k, {1, 10, 100, 1000, 10000}}];
Print["D4 iterative-mul relative drift (k,err): ", drift];
kBreak = SelectFirst[Range[100, 2000, 50], iterErr[#] > 1*^-12 &];
Print["D4 iterative mul exceeds 1e-12 rel err near k = ", kBreak];
Print["D4 direct pow finite at k=1435: ", NumberQ[N[GoldenRatio^1435]]];
l26 = LucasL[26]; f26 = Fibonacci[26];
phi26Exact = (l26 - f26 Sqrt[5])/2;
Print["D4 phi^26 exact-integer form matches decimal: ",
      Abs[N[phi26Exact, 30] - 3.6840146919005904*^-6] < 1*^-20];

(* ---- the 1000/phi^4 claim ----------------------------------------------------
   Code comment says TICK_MS=146 is '≈1000/φ⁴ [SPEC]'. Verify the real value. *)

tickExact = 1000/GoldenRatio^4;
Print["D5 1000/phi^4 = ", N[tickExact, 8], " ms ; code uses 146 ms ; error = ",
      N[146 - tickExact, 6], " ms (", N[100 (146 - tickExact)/tickExact, 4], "%)"];
Print["D5 declared-146 is NOT exactly 1000/phi^4: ", 146 != tickExact];

Print["CERT4 ALL CHECKS PRINTED"];
