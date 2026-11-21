// Shared fallback retains every Unicode range. Only Chinese routes and admin
// need the additional static weights on the initial request.
export function NotoSansScStyles({ weights }: { weights: readonly (400 | 500 | 600)[] }) {
  return weights.map((weight) => <link key={weight} rel="stylesheet" href={`/fonts/noto-sans-sc-v1-5.3.0/${weight}.css`} precedence="noto-sans-sc" />);
}
