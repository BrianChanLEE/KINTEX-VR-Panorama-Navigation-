import type { InfoTab } from "../models/info.model";
import type { Scene } from "../models/scene.model";
import { sceneService } from "../services/scene.service";
import { translationService } from "../services/translation.service";
import { IconClose, IconGeneral, IconSafety, IconSpace } from "../components/icons";

interface TabMetadata {
  ko: string;
  en: string;
  icon: (p: { className?: string }) => JSX.Element;
}

const TAB_META: Record<InfoTab, TabMetadata> = {
  general: { ko: "일반정보", en: "General", icon: IconGeneral },
  safety: { ko: "안전정보", en: "Safety", icon: IconSafety },
  space: { ko: "공간정보", en: "Space", icon: IconSpace },
};

const TAB_ORDER: InfoTab[] = ["general", "safety", "space"];

const ZONE_BADGE_MAP: Record<string, string> = {
  aerial: "AIR",
  exterior: "OUT",
  floor2_h: "HALL",
};

// Note 1: InfoPanelViewProps 인터페이스로 뷰가 전달받는 속성들을 정리합니다.
interface InfoPanelViewProps {
  open: boolean;
  sceneId: string;
  tab: InfoTab;
  onTab: (tab: InfoTab) => void;
  onClose: () => void;
  lang: "KOR" | "ENG";
}

// Note 2: InfoPanelView는 사이드 정보바 UI 노출 및 사용자 탭 선택 액션 바인딩만 수행하는 뷰 컴포넌트입니다.
export default function InfoPanelView({
  open,
  sceneId,
  tab,
  onTab,
  onClose,
  lang,
}: InfoPanelViewProps) {
  const scene = sceneService.getScene(sceneId);
  const facility = getFacilityDataSafely(sceneId);
  const rows = facility[tab];
  const badgeText = ZONE_BADGE_MAP[scene.zone] ?? "LOBBY";

  return (
    <div
      className={`pointer-events-none fixed left-0 top-16 z-30 h-[calc(100%-4rem)] w-[350px] max-w-[86vw] transition-transform duration-400 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
    >
      <div className="pointer-events-auto flex h-full flex-col border-r border-[#e5e5e5] bg-white shadow-2xl rounded-r-3xl">
        {/* header */}
        <div className="relative border-b border-[#e5e5e5] px-5 pb-4 pt-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-5 items-center rounded bg-[#c40012] px-1.5 font-cond text-[10px] font-700 text-white uppercase tracking-wider">
                  {badgeText}
                </span>
                <span className="font-cond text-[11px] uppercase tracking-[0.28em] text-[#8a8a8a] font-600">
                  {lang === "KOR" ? "시설 상세정보" : "Facility Details"}
                </span>
              </div>
              <h2 className="text-xl font-700 text-[#1f1f1f]">{scene.ko}</h2>
              <p className="font-cond text-xs uppercase tracking-[0.2em] text-[#8a8a8a]">
                {scene.en}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e5e5] text-[#8a8a8a] transition-colors hover:bg-[#f1f1f1] hover:text-[#1f1f1f]"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* tab switch */}
        <div className="flex gap-1 border-b border-[#e5e5e5] px-3 py-2 bg-[#f1f1f1]/40">
          {TAB_ORDER.map((t) => {
            const Icon = TAB_META[t].icon;
            const isActive = t === tab;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onTab(t)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] transition-colors ${
                  isActive
                    ? "bg-[#c40012] font-600 text-white shadow-sm"
                    : "text-[#8a8a8a] hover:bg-[#f1f1f1] hover:text-[#1f1f1f]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {lang === "KOR" ? TAB_META[t].ko : TAB_META[t].en}
              </button>
            );
          })}
        </div>

        {/* body */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-5 text-[13px] leading-relaxed text-[#8a8a8a]">
            {/* Note 3: 번역 서비스를 호출하여 다국어 설명 글을 표시합니다. */}
            {lang === "KOR" ? facility.desc : translationService.translateText(facility.desc)}
          </p>

          <div className="space-y-px overflow-hidden rounded-xl border border-[#e5e5e5]">
            {rows
              .filter((r) => r.label !== "부스간 거리")
              .map((r, i) => (
                <div
                  key={r.label}
                  className={`flex items-center justify-between gap-4 px-3.5 py-3 border-b border-[#e5e5e5] last:border-0 ${
                    i % 2 === 0 ? "bg-[#f1f1f1]/30" : "bg-transparent"
                  }`}
                >
                  <span className="text-[12.5px] text-[#8a8a8a] font-500">
                    {/* Note 4: 번역 서비스를 호출하여 레이블 다국어 매핑을 수행합니다. */}
                    {lang === "KOR" ? r.label : translationService.translateLabel(r.label)}
                  </span>
                  <span className="text-right text-[13px] font-600 text-[#1f1f1f]">
                    {/* Note 5: 번역 서비스를 호출하여 속성값 다국어 매핑을 수행합니다. */}
                    {lang === "KOR" ? r.value : translationService.translateValue(r.value)}
                  </span>
                </div>
              ))}
          </div>

          {tab === "safety" && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#c40012]/20 bg-[#c40012]/[0.03] px-3.5 py-3">
              <IconSafety className="mt-0.5 h-4 w-4 flex-none text-[#c40012]" />
              <p className="text-[12px] leading-relaxed text-[#c40012]/80">
                {lang === "KOR"
                  ? "비상 시 가까운 비상구로 대피하고, 안내 요원의 지시에 따라 지정 집결지로 이동하세요."
                  : "In case of emergency, please evacuate to the nearest exit and follow the security guards to the designated assembly point."}
              </p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="border-t border-[#e5e5e5] px-5 py-3">
          <div className="flex items-center justify-between text-[11px] text-[#8a8a8a]">
            <span className="font-cond uppercase tracking-[0.24em] font-600">SIC27-KINTEX VR</span>
            <span>SIC27-KINTEX Virtual Tour</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Note 6: getFacility 조회 도중 누락 가능성이 있는 씬 예외 처리를 안전장치(Guard)로 방어합니다.
import { getFacility } from "../data/facility";
function getFacilityDataSafely(sceneId: string) {
  try {
    const f = getFacility(sceneId);
    if (!f) {
      return { general: [], safety: [], space: [], desc: "" };
    }
    return f;
  } catch {
    return { general: [], safety: [], space: [], desc: "" };
  }
}
