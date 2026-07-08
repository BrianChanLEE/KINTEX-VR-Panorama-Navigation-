import { useState } from "react";
import { IconCheck, IconClose } from "./icons";

/* dashed arrow connector pointing from the card toward a UI target */
function Connector({
  className = "",
  angle,
  length = 96,
}: {
  className?: string;
  angle: number;
  length?: number;
}) {
  return (
    <svg
      className={`pointer-events-none absolute ${className}`}
      width={length}
      height={20}
      viewBox={`0 0 ${length} 20`}
      style={{ transform: `rotate(${angle}deg)`, transformOrigin: "left center" }}
      aria-hidden
    >
      <line
        x1={2}
        y1={10}
        x2={length - 14}
        y2={10}
        stroke="#2b9bff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="5 6"
        style={{ animation: "dash 1s linear infinite" }}
      />
      <path
        d={`M${length - 16} 4 L${length - 2} 10 L${length - 16} 16`}
        fill="none"
        stroke="#2b9bff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Callout({
  n,
  title,
  desc,
  className = "",
  align = "left",
  children,
}: {
  n: string;
  title: string;
  desc: string;
  className?: string;
  align?: "left" | "right";
  children?: React.ReactNode;
}) {
  return (
    <div className={`absolute w-[248px] ${className}`}>
      <div className={`flex flex-col ${align === "right" ? "items-end text-right" : "items-start"}`}>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-kx-bright/60 font-cond text-[12px] font-600 text-kx-bright">
            {n}
          </span>
          <span className="text-[15px] font-700 text-kx-bright">{title}</span>
        </div>
        <p className="text-[12.5px] leading-relaxed text-white/75">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export default function TutorialOverlay({
  onClose,
  onDismissForever,
}: {
  onClose: () => void;
  onDismissForever: (v: boolean) => void;
}) {
  const [dontShow, setDontShow] = useState(false);

  const handleClose = () => {
    onDismissForever(dontShow);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in overflow-hidden">
      {/* scrim */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" />

      {/* close */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-6 top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="close tutorial"
      >
        <IconClose className="h-6 w-6" />
      </button>

      {/* center title */}
      <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 -translate-y-1/2 px-6 text-center">
        <div className="mb-3 flex items-center justify-center gap-3">
          <span className="h-px w-10 bg-white/25" />
          <span className="font-cond text-xs uppercase tracking-[0.5em] text-kx-bright">
            SIC27-KINTEX Virtual Tour
          </span>
          <span className="h-px w-10 bg-white/25" />
        </div>
        <h1 className="font-cond text-6xl font-300 tracking-[0.12em] text-white sm:text-7xl md:text-8xl">
          SIC27 <span className="font-500 text-kx-bright">VR</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base font-300 text-white/80 sm:text-lg">
          더욱 편리하고 자세하게 이용하실 수 있습니다.
        </p>

        <div className="mt-7 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleClose}
            className="group relative overflow-hidden rounded-full bg-kx-blue px-8 py-3 text-sm font-600 text-white shadow-[0_10px_30px_rgba(12,117,201,0.5)] transition-transform hover:scale-105"
          >
            <span className="relative z-10">둘러보기 시작</span>
            <span className="absolute inset-0 -translate-x-full bg-white/20 [animation:shimmer_2.4s_ease-in-out_infinite]" />
          </button>
          <button
            type="button"
            onClick={() => setDontShow((v) => !v)}
            className="flex items-center gap-2 text-[13px] text-white/60 transition-colors hover:text-white/90"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                dontShow ? "border-kx-bright bg-kx-bright text-white" : "border-white/40"
              }`}
            >
              {dontShow && <IconCheck className="h-3 w-3" />}
            </span>
            더 이상 보지 않기
          </button>
        </div>
      </div>

      {/* annotation callouts — desktop only */}
      <div className="hidden lg:block">
        <Callout
          n="1"
          title="메뉴"
          desc="360 VR 사진, 360 VR 동영상을 감상하고 홈페이지로 이동할 수 있는 메뉴입니다."
          className="right-[8%] top-[16%]"
          align="right"
        >
          <Connector className="right-4 top-[-8px]" angle={-125} length={80} />
        </Callout>

        <Callout
          n="2"
          title="지도 및 위치이동"
          desc="현재 보고 계시는 시설의 위치를 파악하고 지도를 통해 쉽게 이동할 수 있습니다."
          className="left-[19%] top-[24%]"
        >
          <Connector className="left-2 top-[-6px]" angle={-150} length={120} />
        </Callout>

        <Callout
          n="3"
          title="시설 상세정보"
          desc="시설에 대한 상세한 정보와 안전시설 및 공간정보를 확인 할 수 있습니다."
          className="bottom-[26%] left-[7%]"
        >
          <Connector className="bottom-[-10px] left-6" angle={120} length={130} />
        </Callout>

        <Callout
          n="4"
          title="마커"
          desc="시설의 편의 도구 위치를 파악하고 정보를 확인 할 수 있습니다."
          className="bottom-[30%] left-[31%]"
        >
          <Connector className="bottom-[-6px] left-10" angle={70} length={90} />
        </Callout>

        <Callout
          n="5"
          title="VR 컨트롤러"
          desc="컨벤션을 다양하고 편리하게 보실 수 있는 기능을 제공합니다."
          className="bottom-[24%] right-[16%]"
          align="right"
        >
          <Connector className="bottom-[-12px] right-6" angle={110} length={90} />
        </Callout>
      </div>
    </div>
  );
}
