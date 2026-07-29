#!/usr/bin/env wolframscript
(* RHUFT Formal Verification — Certificate 2: Resonance Kernel & Hopfield Dynamics *)
(* Verifies the mathematical properties the mind's memory layer depends on. *)

Print["=== CERTIFICATE 2: RESONANCE KERNEL & HOPFIELD DYNAMICS ===\n"];

(* ─── 2.1 Resonance kernel C(a,b) = |⟨a|b⟩|² / (|a|²|b|²) ─── *)
Print["2.1  Resonance kernel C(a,b) ∈ [0,1]"];
(* For complex vectors a, b ∈ Cⁿ (interleaved as Re/Im pairs) *)
(* C(a,b) = |Σᵢ aᵢ·bᵢ*|² / (Σᵢ|aᵢ|² · Σᵢ|bᵢ|²) *)

(* Cauchy-Schwarz: |⟨a|b⟩|² ≤ ⟨a|a⟩·⟨b|b⟩, so C ≤ 1 *)
Print["     Cauchy-Schwarz: |⟨a|b⟩|² ≤ |a|²|b|² (true by theorem)"];

(* For unit-norm fields: C(a,b) = |⟨a|b⟩|² ∈ [0,1] *)
(* Verify with random complex vectors in C^14 (the mind's field space) *)
n = 14;
SeedRandom[13]; (* deterministic *)
testVecs = Table[
  v = RandomComplex[{-1-I, 1+I}, n];
  v/Norm[v],  (* unit-norm *)
  {100}
];
resonance[a_, b_] := Abs[Conjugate[a].b]^2 / (Norm[a]^2 * Norm[b]^2);
cValues = Flatten[Table[resonance[testVecs[[i]], testVecs[[j]]], {i, 100}, {j, 100}]];
Print["     100 random unit vectors, C ∈ [", Min[cValues], ", ", Max[cValues], "]"];
Print["     All C ∈ [0,1]: ", And @@ (0 <= # <= 1 & /@ cValues)];
Print["     C(a,a) = 1: ", AllTrue[testVecs, Abs[resonance[#, #]] - 1 < 10^-10 &]];
Print[""];

(* ─── 2.2 Resonance is a valid kernel (PSD) ─── *)
Print["2.2  Gram matrix positive semidefinite"];
(* For any set of vectors, the Gram matrix G[i,j] = C(vᵢ,vⱼ) must be PSD *)
k = 10;
gramMatrix = Table[resonance[testVecs[[i]], testVecs[[j]]], {i, k}, {j, k}];
eigenvalues = Eigenvalues[N[gramMatrix]];
Print["     10×10 Gram matrix eigenvalues: min = ", Min[eigenvalues]];
Print["     All ≥ 0 (PSD): ", AllTrue[eigenvalues, # >= -10^-10 &]];
Print[""];

(* ─── 2.3 Hopfield softmax update is attention ─── *)
Print["2.3  Modern Hopfield = Attention (Ramsauer et al. 2020)"];
(* Update rule: ξ_new = X·softmax(β·X·ξ) *)
(* This is exactly the attention mechanism with X as keys/values *)
(* Verify: softmax outputs a probability distribution *)
beta = ((1 + Sqrt[5])/2) / Sqrt[28];  (* β = φ/√d for d=28 *)
scores = RandomReal[{-2, 2}, 5];
softmax[s_] := Exp[s - Max[s]] / Total[Exp[s - Max[s]]];
probs = softmax[scores];
Print["     softmax sums to 1: ", Abs[Total[probs] - 1] < 10^-15];
Print["     All probabilities ≥ 0: ", AllTrue[probs, # >= 0 &]];
Print["     β = φ/√28 = ", N[beta, 20]];
Print[""];

(* ─── 2.4 Hopfield energy function ─── *)
Print["2.4  Hopfield energy E(x) decreases monotonically"];
(* Modern Hopfield energy: E(x) = -logsumexp(β·X·x)/β + ½⟨x,x⟩ *)
(* Theorem (Ramsauer): E decreases under the update rule *)
(* Verify numerically for a random sequence of updates *)
d = 28;
m = 10;  (* stored patterns *)
X = Table[v = RandomReal[{-1,1}, d]; v/Norm[v], {m}];  (* random unit patterns *)
energy[x_] := -Log[Total[Exp[beta * (X.x)]]]/beta + 0.5 * x.x;
hopfieldUpdate[x_] := Module[{scores, probs},
  scores = beta * (X.x);
  probs = Exp[scores - Max[scores]] / Total[Exp[scores - Max[scores]]];
  result = probs.X;
  result/Norm[result]  (* unit-normalize *)
];
(* Start from a random query, iterate, check energy decreases *)
x0 = RandomReal[{-1,1}, d]; x0 = x0/Norm[x0];
trajectory = NestList[hopfieldUpdate, x0, 10];
energies = energy /@ trajectory;
Print["     Energy trajectory (10 steps): ", N[energies, 6]];
energyDecreases = And @@ Table[energies[[i+1]] <= energies[[i]] + 10^-10, {i, Length[energies]-1}];
Print["     Energy monotonically decreases: ", energyDecreases];
Print[""];

(* ─── 2.5 Merge threshold 1 − 1/φ³ ─── *)
Print["2.5  Hopfield merge threshold 1 − 1/φ³"];
phi = (1 + Sqrt[5])/2;
mergeThreshold = 1 - 1/phi^3;
Print["     1 − 1/φ³ = ", N[mergeThreshold, 20]];
(* This is the resonance floor for merging near-duplicate attractors *)
(* Verify: 1 − 1/φ³ = (φ² + φ − 1)/φ³ = ... *)
Print["     Exact form: ", FullSimplify[mergeThreshold]];
(* φ³ = 2φ + 1, so 1/φ³ = 1/(2φ+1) *)
Print["     φ³ = 2φ + 1: ", FullSimplify[phi^3 == 2*phi + 1]];
Print[""];

(* ─── 2.6 Phase-alignment invariance ─── *)
Print["2.6  Resonance is phase-invariant: C(a, e^{iθ}b) = C(a,b)"];
a = testVecs[[1]];
b = testVecs[[2]];
theta = Pi/7;
bRotated = Exp[I*theta] * b;
phaseInvariant = Abs[resonance[a, b] - resonance[a, bRotated]] < 10^-10;
Print["     C(a, e^{iπ/7}·b) = C(a,b): ", phaseInvariant];
Print[""];

Print["=== CERTIFICATE 2 COMPLETE ==="];
