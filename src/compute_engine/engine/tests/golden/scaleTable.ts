/**
 * Golden test vectors for the 18 Lucas-stable scales (n in {1,13,15,27} mod 28).
 * GENERATED from notebooks/verification_suite.py (mpmath, dps=60) -- never hand-typed.
 * Each magnitude is [mantissa, exp10] so Scaled arithmetic is asserted without
 * Float64 overflow. Winding W = round(phi^n/13) as exact integer string.
 */
export interface GoldenRow {
  n: number;
  L: [number, number]; T: [number, number]; tau: [number, number];
  rhoI: [number, number]; vWave: [number, number];
  complexityBits: number; winding: string;
}
export const GOLDEN: readonly GoldenRow[] = [
  { n: 1, L: [2.61515556, -35], T: [8.72321999, -44], tau: [8.81045219, -44], rhoI: [1.46380321, 104], vWave: [2.35682254, 8], complexityBits: 2.0783, winding: "0" },
  { n: 13, L: [8.4207197, -33], T: [2.80884975, -41], tau: [3.17400021, -41], rhoI: [4.54601655, 101], vWave: [1.31341219, 7], complexityBits: 27.0179, winding: "40" },
  { n: 15, L: [2.20457304, -32], T: [7.35366411, -41], tau: [8.45671372, -41], rhoI: [1.73642381, 101], vWave: [8.11733372, 6], complexityBits: 31.1745, winding: "105" },
  { n: 27, L: [7.09865672, -30], T: [2.367857, -38], tau: [3.0071784, -38], rhoI: [5.39267254, 98], vWave: [4.52363504, 5], complexityBits: 56.1141, winding: "33785" },
  { n: 29, L: [1.85845246, -29], T: [6.19913012, -38], tau: [7.99687785, -38], rhoI: [2.05981762, 98], vWave: [2.79576021, 5], complexityBits: 60.2707, winding: "88450" },
  { n: 41, L: [5.98415919, -27], T: [1.99610065, -35], tau: [2.81450191, -35], rhoI: [6.39701083, 95], vWave: [1.55802376, 4], complexityBits: 85.2103, winding: "28480650" },
  { n: 43, L: [1.56667322, -26], T: [5.22585934, -35], tau: [7.47297885, -35], rhoI: [2.44344071, 95], vWave: [9.62911642, 3], complexityBits: 89.3669, winding: "74563310" },
  { n: 55, L: [5.0446391, -24], T: [1.68271048, -32], tau: [2.60820124, -32], rhoI: [7.58839837, 92], vWave: [5.36612267, 2], complexityBits: 114.3065, winding: "24009154230" },
  { n: 57, L: [1.32070366, -23], T: [4.40539322, -32], tau: [6.91646736, -32], rhoI: [2.89851026, 92], vWave: [3.31644619, 2], complexityBits: 118.4631, winding: "62856781815" },
  { n: 69, L: [4.25262478, -21], T: [1.41852294, -29], tau: [2.39730376, -29], rhoI: [9.00167147, 89], vWave: [1.84819212, 1], complexityBits: 143.4027, winding: "20239688535175" },
  { n: 71, L: [1.11335162, -20], T: [3.71374126, -29], tau: [6.35049755, -29], rhoI: [3.43833255, 89], vWave: [1.14224555, 1], complexityBits: 147.5593, winding: "52988192506800" },
  { n: 83, L: [3.58495764, -18], T: [1.19581315, -26], tau: [2.18833807, -26], rhoI: [1.06781544, 87], vWave: [6.36551627, -1], complexityBits: 172.4989, winding: "17062033425998360" },
  { n: 85, L: [9.38554096, -18], T: [3.13067948, -26], tau: [5.79175703, -26], rhoI: [4.07869204, 86], vWave: [3.93410541, -1], complexityBits: 176.6555, winding: "44668983426450520" },
  { n: 97, L: [3.02211504, -15], T: [1.00806907, -23], tau: [1.98589607, -23], rhoI: [1.26668676, 84], vWave: [2.1924018, -2], complexityBits: 201.5951, winding: "14383273938428082240" },
  { n: 99, L: [7.91199989, -15], T: [2.63915908, -23], tau: [5.25192658, -23], rhoI: [4.8383129, 83], vWave: [1.35497883, -2], complexityBits: 205.7517, winding: "37655900040305281625" },
  { n: 111, L: [2.54763939, -12], T: [8.49801029, -21], tau: [1.79308017, -20], rhoI: [1.50259614, 81], vWave: [7.55103823, -4], complexityBits: 230.6913, winding: "12125082868061447330025" },
  { n: 113, L: [6.66980652, -12], T: [2.22480798, -20], tau: [4.73884099, -20], rhoI: [5.73940653, 80], vWave: [4.66679828, -4], complexityBits: 234.8479, winding: "31743879064993925959290" },
  { n: 125, L: [2.14765699, -9], T: [7.16381259, -18], tau: [1.61185783, -17], rhoI: [1.78244158, 78], vWave: [2.60071754, -5], complexityBits: 259.7875, winding: "10221430474501861671128770" },
] as const;
