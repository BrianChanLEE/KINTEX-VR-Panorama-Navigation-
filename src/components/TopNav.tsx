/**
 * TopNav — REMOVED for origin parity.
 *
 * The origin K-MICE VR iframe does not have a top navigation bar.
 * The header exists only in the parent wrapper page (site_page.html).
 * Since we are matching the iframe-internal view, TopNav is a no-op.
 */
export default function TopNav(_props: {
  lang: "KOR" | "ENG";
  onLang: (l: "KOR" | "ENG") => void;
  onHome: () => void;
}) {
  // Origin iframe has no top nav bar — return nothing
  return null;
}
