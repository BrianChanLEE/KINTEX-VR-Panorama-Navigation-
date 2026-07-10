import { resolveAssetPath } from "../utils/assetPath";

export default function KintexLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`panorama-logo ${className}`} aria-label="Seoul 2027 logo">
      <img
        className="panorama-logo__image"
        src={resolveAssetPath("/logo1.png")}
        alt="Seoul 2027"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
