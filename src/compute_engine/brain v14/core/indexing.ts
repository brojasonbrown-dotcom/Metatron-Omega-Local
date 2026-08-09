/**
 * RHUFT v14 — Bounds-Sound Indexed Access
 *
 * Epistemic Status: [SPEC] — Type-soundness tooling; no math, no numerics change.
 *
 * WHY THIS EXISTS (Option B / unified strict gate):
 * `noUncheckedIndexedAccess` (part of the shared strict soundness core in
 * compute_engine/tsconfig.base.json) types EVERY indexed read — `arr[i]` on an
 * Array<T> OR a Float64Array — as `T | undefined`, even when the index is
 * provably in-bounds. v14's DSP/numerics kernels index constantly, so this
 * surfaces ~780 latent "possibly undefined" errors across the tree.
 *
 * THE HONEST RESOLUTION — never a shortcut:
 *   - `?? 0` would CHANGE THE NUMERICS, silently masking a genuine
 *     out-of-bounds read as 0. In a verified numerics engine that is a lie.
 *     It is forbidden here.
 *   - `!` (non-null assertion) would silence the compiler without proving
 *     anything — the exact shortcut Option B exists to reject.
 *   - `at()` performs a REAL bounds check and THROWS on a true out-of-bounds.
 *     A corrupted index becomes a loud, debuggable error instead of silent
 *     undefined-propagation. The type returned is `T` (defined), which is what
 *     the strict core requires. Numerics are untouched: every in-bounds read
 *     returns exactly the value it always did.
 *
 * Hot loops that provably satisfy `0 <= i < arr.length` may use `get()`, which
 * is the identical read with the invariant stated at the call site. Prefer
 * `at()` unless profiling shows the branch matters.
 */

/** Any index-readable container: a plain Array or a TypedArray. */
export type Indexable<T> =
  | ArrayLike<T>
  | { readonly length: number; [n: number]: T };

/**
 * Bounds-checked indexed read. Returns the element (defined) or throws.
 * The throw is the contract: it converts a latent undefined into a failure at
 * the exact frame that produced the bad index, rather than letting NaN/undefined
 * smear through a DFT or a Hopfield relaxation three calls later.
 */
export function at<T>(arr: Indexable<T>, i: number): T {
  // `i >>> 0` coerces to a uint32; a negative or fractional index fails the
  // upper/lower bounds honestly. Float64Array out-of-range reads return
  // undefined at runtime — we refuse to hand that back as a `T`.
  if (i < 0 || i >= arr.length) {
    throw new RangeError(
      `indexed access out of bounds: index ${i}, length ${arr.length}`
    );
  }
  const v = arr[i];
  // A truly in-bounds read on a dense container is never undefined; this guard
  // only trips on a sparse Array hole, which is itself a latent bug worth naming.
  if (v === undefined) {
    throw new RangeError(`indexed access hit a hole at index ${i}`);
  }
  return v;
}

/**
 * In-bounds-by-contract indexed read. Documents that the caller has already
 * established the loop bound (e.g. `for (i < arr.length)`). It performs the SAME
 * bounds check as `at()` — Option B admits no unchecked path — so prefer whichever
 * name reads most honestly at the call site; both are sound.
 */
export function get<T>(arr: Indexable<T>, i: number): T {
  return at(arr, i);
}
