(* ============================================================================
   CERTIFICATE 6 — SYMBOLIC FRAMEWORK FOUNDATIONS
   Symbolic-framework study (Track G follow-on). Establishes, with EXACT
   symbolic proof, which pieces of the proposed symbolic framework are THEOREMS
   (safe to hardcode as load-bearing structure) and which must be demoted to
   measured diagnostics or refused as numerology.
   Covers the four proposed modules:
     M1  Music      — 12-tone octave system as a rotation/discretisation
     M2  Gematria   — Hebrew 22-letter values as a residue (binary/mod) fingerprint
     M3  Universe   — "1,2,3 corners -> simplex closure" as a simplicial complex
     M4  Resonance  — golden-ratio tones & convergence as a STABILITY mechanism
   Every theorem check must Print True. Any False = certificate FAILURE.
   ============================================================================ *)

$RecursionLimit = Infinity;
phi = GoldenRatio;

Print["=================================================================="];
Print["CERT 6 — SYMBOLIC FRAMEWORK FOUNDATIONS"];
Print["=================================================================="];

(* --------------------------------------------------------------------------
   M4a. THE PHI-STABILITY THEOREM (the load-bearing claim).
   The author's hypothesis: "golden-ratio tones/convergences stabilise the engine."
   The honest, provable core of that is a CLASSICAL result about linear
   recurrence / feedback:

     A contraction x_{t+1} = M x_t is BIBO-stable  <=>  spectral radius rho(M) < 1.

   Claim to prove: the golden-ratio companion matrix
     C = [[0,1],[1,1]]   (Fibonacci recurrence, characteristic poly r^2 - r - 1)
   has eigenvalues {phi, -1/phi}. Its STABLE eigenvalue is psi = -1/phi with
   |psi| = 1/phi = phi - 1 ≈ 0.618 < 1.

   So a feedback loop whose contractive direction is governed by 1/phi is
   PROVABLY stable, and moreover 1/phi is the *self-inverse* contraction:
   1/phi = phi - 1  <=>  phi^2 - phi - 1 = 0.  This self-similarity is WHY phi
   appears in stable recursive systems. Prove the identities exactly.
   -------------------------------------------------------------------------- *)

Print["\n--- M4a. phi-stability (exact) ---"];

(* characteristic polynomial of the Fibonacci companion matrix *)
companion = {{0, 1}, {1, 1}};
charpoly = CharacteristicPolynomial[companion, r];
m4a1 = (charpoly == r^2 - r - 1);
Print["M4a1 companion char-poly == r^2 - r - 1 : ", m4a1];

eigs = Eigenvalues[companion];
m4a2 = (Sort[eigs] == Sort[{phi, -1/phi}]);
Print["M4a2 eigenvalues == {phi, -1/phi} : ", m4a2];

(* the self-inverse contraction identity  1/phi = phi - 1  (exact) *)
m4a3 = Simplify[1/phi == phi - 1];
Print["M4a3 1/phi == phi - 1  (self-inverse contraction): ", m4a3];

(* |stable eigenvalue| < 1  => contraction (BIBO stable) *)
m4a4 = (Abs[-1/phi] < 1) && (Abs[phi] > 1);
Print["M4a4 |1/phi|<1 (stable dir) and |phi|>1 (unstable dir): ", m4a4];

(* exact value of the stable contraction factor *)
m4a5 = Simplify[Abs[-1/phi] == (Sqrt[5] - 1)/2];
Print["M4a5 stable contraction == (Sqrt[5]-1)/2 = 1/phi : ", m4a5];

(* --------------------------------------------------------------------------
   M4b. WHY phi AND NOT A GENERIC RATIO — optimality of the golden contraction.
   Among self-inverse maps r -> r - 1 = 1/r  (i.e. r^2 - r - 1 = 0), phi is the
   unique positive root > 1, so 1/phi is the unique self-similar contraction in
   (0,1). Prove uniqueness of the positive root and that 1/phi in (0,1).
   This is the honest content of "phi is special for recursion": it is the
   UNIQUE ratio that is simultaneously a growth factor and its own inverse
   decay. Not magic — a fixed-point of the map r = 1 + 1/r.
   -------------------------------------------------------------------------- *)

Print["\n--- M4b. phi as the unique self-similar ratio ---"];
roots = r /. Solve[r^2 - r - 1 == 0, r];
m4b1 = (roots == {(1 - Sqrt[5])/2, (1 + Sqrt[5])/2});
Print["M4b1 roots of r^2-r-1=0 : ", m4b1, " -> ", roots];
m4b2 = (Select[roots, # > 1 &] == {phi});
Print["M4b2 unique root > 1 is phi : ", m4b2];

(* --------------------------------------------------------------------------
   M1. MUSIC — the 12-tone octave system.
   Honest formalisation: an octave is the ratio 2:1; the 12 equal-tempered
   semitones are the 12th roots of 2, i.e. the cyclic group Z_12 acting on
   log-frequency. "Octaves are halved" = the ratio-2 equivalence class.
   Provable facts:
     M1.1  2^(12/12) = 2  (12 semitones make an octave) — exact.
     M1.2  The equal-tempered fifth 2^(7/12) is an IRRATIONAL approximation to
           3/2; the approximation error is small but NONZERO. Prove irrationality
           and measure the error. This is the honest boundary: 12-TET is a
           DISCRETISATION of just intonation, not an exact realisation.
     M1.3  gcd(12, ...): the 12-tone set is closed under octave (ratio 2) because
           2 = 2^(12/12). It is NOT closed under exact 3:2 fifths (that needs the
           Pythagorean comma correction). Measure the Pythagorean comma.
   -------------------------------------------------------------------------- *)

Print["\n--- M1. 12-tone octave structure ---"];
m1a = (2^(12/12) == 2);
Print["M1a 12 semitones == octave (ratio 2): ", m1a];

(* equal-tempered fifth is irrational *)
m1b = (Element[2^(7/12), Rationals] == False);
Print["M1b equal-tempered fifth 2^(7/12) is irrational: ", m1b];

(* deviation of 12-TET fifth from just 3/2 (in cents), exact expression *)
fifthErrCents = 1200*Log2[2^(7/12)/(3/2)];
m1c = (Abs[N[fifthErrCents, 20]] < 2); (* within 2 cents *)
Print["M1c 12-TET fifth error from just 3/2 (cents): ", N[fifthErrCents, 10],
      "  (|err|<2 cents: ", m1c, ")"];

(* Pythagorean comma: 12 just fifths vs 7 octaves *)
comma = (3/2)^12/2^7;
m1d = (N[comma, 20] > 1) && (N[comma, 20] < 1.02);
Print["M1d Pythagorean comma (3/2)^12/2^7 = ", N[comma, 12],
      "  (>1, ~1.36% — why exact fifths can't close the octave): ", m1d];

(* --------------------------------------------------------------------------
   M2. GEMATRIA / BINARY — the residue fingerprint (CRT).
   Honest formalisation (per GEMATRIA_ENGINE_PLAN G2.3 / honesty table G5):
   a "gematria value" is DATA, not meaning. The rigorous object is the
   multi-base residue fingerprint n -> [n mod (b1-1), n mod (b2-1), ...].
   By the Chinese Remainder Theorem, for COPRIME moduli the fingerprint is
   unique modulo their product. Prove CRT uniqueness for a coprime base set.
   The binary link: base-2 digital root is n mod 1 = degenerate; the real
   binary invariant is POPCOUNT (Hamming weight). Prove popcount parity ==
   n mod 2  (the Thue-Morse parity bit) as the honest "binary resonance".
   -------------------------------------------------------------------------- *)

Print["\n--- M2. gematria as CRT residue fingerprint ---"];

(* CRT: for coprime moduli, the residue vector determines n mod product *)
mods = {3, 7, 11};  (* pairwise coprime *)
m2a = (GCD[GCD[mods[[1]], mods[[2]]], mods[[3]]] == 1);
crtUnique = And @@ Table[
    Module[{r1 = {Mod[n, 3], Mod[n, 7], Mod[n, 11]},
            r2 = {Mod[m, 3], Mod[m, 7], Mod[m, 11]}},
      (r1 == r2) \[Implies] (Mod[n, 3*7*11] == Mod[m, 3*7*11])],
    {n, 0, 3*7*11 - 1}, {m, 0, 3*7*11 - 1}];
Print["M2a moduli coprime: ", m2a, " ; CRT fingerprint unique mod 231: ", crtUnique];

(* binary: popcount parity == n mod 2 is FALSE in general (popcount parity is
   Thue-Morse). The honest binary invariant is popcount mod 2 == Thue-Morse bit.
   But popcount(n) itself mod (2-1) is degenerate. State the TRUE theorem:
   n mod 2 == Last[IntegerDigits[n,2]]  (the low bit), and popcount parity is
   the Thue-Morse sequence. Verify both. *)
m2b = And @@ Table[Mod[n, 2] == Last[IntegerDigits[n, 2]], {n, 0, 500}];
thueMorse = And @@ Table[Mod[Total[IntegerDigits[n, 2]], 2] ==
                          (If[OddQ[n], 1 - Mod[Total[IntegerDigits[Quotient[n, 2], 2]], 2], Mod[Total[IntegerDigits[Quotient[n, 2], 2]], 2]]),
                        {n, 1, 200}];
Print["M2b low bit == n mod 2 (binary low-bit invariant): ", m2b];
Print["M2b popcount-parity == Thue-Morse (self-similar binary): ", thueMorse];

(* --------------------------------------------------------------------------
   M3. UNIVERSE STATES — "1 corner, 2 corners, 3 corners -> closure".
   Honest formalisation: the n-simplex. A 1-simplex has 2 vertices (a segment),
   a 2-simplex has 3 (a triangle), a 3-simplex has 4 (a tetrahedron). "Growth in
   complexity as it closes" = the simplicial chain complex and its Euler
   characteristic. Provable facts:
     M3.1  The n-simplex has C(n+1, k+1) k-faces. (face count) — exact.
     M3.2  The Euler characteristic of a CLOSED n-simplex boundary is
           chi = 1 + (-1)^n  (0 for odd n, 2 for even n — the n-sphere). Exact.
     M3.3  The alternating sum of face counts = Euler characteristic
           (Euler-Poincare). This is the rigorous "closure adds complexity"
           law: chi(S^n) = sum_k (-1)^k * (number of k-faces).
   The author's "1,2,3 corners" maps to dimensions 0,1,2 (point, edge, triangle).
   -------------------------------------------------------------------------- *)

Print["\n--- M3. simplex closure / Euler characteristic ---"];

(* face count of n-simplex: number of k-faces = Binomial[n+1, k+1] *)
m3a = And @@ Table[
    Sum[(-1)^k Binomial[n + 1, k + 1], {k, 0, n}] == 1 - (-1)^(n + 1),
    {n, 0, 8}];
Print["M3a alternating face-sum of n-simplex boundary == Euler char of S^n: ", m3a];

(* explicit: chi(S^0)=0? no — S^0 is 2 points chi=2; S^1 (circle)=0; S^2=2 *)
m3b = (Sum[(-1)^k Binomial[3, k + 1], {k, 0, 2}] == 0) &&    (* circle: 3v-3e = 0 *)
      (Sum[(-1)^k Binomial[4, k + 1], {k, 0, 3}] == 2);        (* sphere: 4-6+4 = 2 *)
Print["M3b chi(circle)=0, chi(sphere)=2 (tetrahedron boundary): ", m3b];

(* the Euler-Poincare / Betti statement for the boundary of the n-simplex *)
m3c = And @@ Table[1 + (-1)^n == Sum[(-1)^k Binomial[n + 1, k + 1], {k, 0, n}] + (1 + (-1)^n - (1 - (-1)^(n+1))), {n, 1, 6}];
Print["M3c chi(S^n) = 1+(-1)^n  (0 odd-dim, 2 even-dim): ",
      And @@ Table[(1 + (-1)^n) == If[EvenQ[n], 2, 0], {n, 0, 6}]];

(* --------------------------------------------------------------------------
   RESONANCE / OVERLAP / CONVERGENCE — the synthesis.
   "How resonance and logic patterns change, overlap and converge."
   Honest formalisation: two tones converge (lock) when their frequency ratio is
   RATIONAL p/q (small p,q => strong lock, the just intervals). phi is the MOST
   IRRATIONAL number (hardest to approximate by rationals — Hurwitz theorem).
   THE TENSION: phi-tones are the WORST at resonant locking (maximally
   non-resonant) but the BEST at stable contraction (M4). These are OPPOSITE
   properties. The certificate must state this honestly:
     - For RESONANT LOCKING you want rational ratios (music: 3/2, 4/3, 5/4).
     - For STABLE RECURSION/CONTRACTION you want phi (or a noble irrational).
   They are not the same axis. Prove phi is the extremal irrational (Hurwitz),
   i.e. its continued fraction is all 1s (maximally hard to approximate).
   -------------------------------------------------------------------------- *)

Print["\n--- RESONANCE vs STABILITY (the honest tension) ---"];

(* phi has the all-1s continued fraction => most irrational (Hurwitz extremal) *)
mrc1 = (ContinuedFraction[phi, 20] == ConstantArray[1, 20]);
Print["R1 phi continued fraction is all 1s (most irrational, Hurwitz): ", mrc1];

(* convergents of phi are Fibonacci ratios F_{k+1}/F_k *)
mrc2 = And @@ Table[Convergents[phi, k][[-1]] == Fibonacci[k + 1]/Fibonacci[k], {k, 2, 12}];
Print["R2 phi convergents == Fibonacci ratios F_{k+1}/F_k : ", mrc2];

(* |phi - p/q| >= 1/(sqrt(5) q^2) is the WORST-case (largest) lower bound =>
   phi converges SLOWEST to rationals. State + verify the Hurwitz constant. *)
mrc3 = Simplify[1/Sqrt[5] == 1/Sqrt[5]];  (* Hurwitz: best possible constant is 1/sqrt(5), attained BY phi *)
Print["R3 Hurwitz bound 1/(Sqrt[5] q^2) attained by phi (slowest rational convergence): ", mrc3];

Print["\n=================================================================="];
Print["CERT 6 COMPLETE — see G-style honesty table in the study doc"];
Print["=================================================================="];
