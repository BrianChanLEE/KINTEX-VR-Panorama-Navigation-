interface VRHardwarePromptViewProps {
  onDismiss: () => void;
}

// Note 1: 이 뷰는 XR 하드웨어가 없을 때 사용자에게 VR 장비 사용을 요청하는 안내 패널만 렌더합니다.
export default function VRHardwarePromptView({ onDismiss }: VRHardwarePromptViewProps) {
  const iconUrl = `${import.meta.env.BASE_URL}icons8-vision-pro-100.png`;

  return (
    <div className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center">
      <div className="pointer-events-auto flex max-w-[360px] flex-col items-center gap-4 rounded-3xl border border-white/10 bg-black/80 px-8 py-7 text-center shadow-2xl backdrop-blur-md">
        <img
          src={iconUrl}
          alt="VR 장비 안내"
          className="h-24 w-24 select-none object-contain"
          draggable={false}
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-white">VR 장비가 필요합니다</p>
          <p className="text-xs leading-relaxed text-white/70">
            현재 PC에는 XR 하드웨어가 없어 VR 모드를 시작할 수 없습니다.
            Vision Pro 또는 지원 장비로 다시 실행하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/15"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
