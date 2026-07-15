import { resolveAssetPath } from "../utils/assetPath";

export default function SIC27Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`panorama-logo ${className}`} aria-label="Seoul 2027 logo">
      <img
        className="panorama-logo__image"
        src={resolveAssetPath("/2027sic_minilogo.svg")}
        alt="Seoul 2027"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
