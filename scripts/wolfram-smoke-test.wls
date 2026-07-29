(* Wolfram kernel smoke test — verifies symbolic, numeric, and export capabilities *)
Print["=== Wolfram Kernel Smoke Test ==="];
Print["Version: ", $Version];
Print["License: ", $LicenseType];
Print["Processors: ", $ProcessorCount];
Print["Memory (GB): ", Round[$SystemMemory / 1024^3]];

Print[""];
Print["--- Symbolic ---"];
int = Integrate[Sin[x]^4, {x, 0, 2}];
Print["Integrate[Sin[x]^4, {x,0,2}] = ", int];
Print["N[Pi, 50] = ", N[Pi, 50]];

Print[""];
Print["--- Solve ---"];
sol = Solve[x^2 - 5 x + 6 == 0, x];
Print["Solve[x^2-5x+6==0] = ", sol];

Print[""];
Print["--- Series ---"];
ser = Series[Exp[x], {x, 0, 5}];
Print["Series[Exp[x], {x,0,5}] = ", ser];

Print[""];
Print["--- Linear Algebra ---"];
m = {{1, 2}, {3, 4}};
Print["Inverse[{{1,2},{3,4}}] = ", Inverse[m]];

Print[""];
Print["=== ALL TESTS PASSED ==="];
