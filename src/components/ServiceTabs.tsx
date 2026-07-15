import { SERVICE_TAB_ITEMS } from "../data/service-menu";
import type { ServiceTabId } from "../models/service-menu.model";

interface ServiceTabsProps {
  activeTab: ServiceTabId;
  onSelect: (tab: ServiceTabId) => void;
}

// Note 1: 서비스 메뉴 탭 바는 지도 투어/스탬프 투어/대피 훈련 진입점만 담당합니다.
export default function ServiceTabs({ activeTab, onSelect }: ServiceTabsProps) {
  return (
    <div className="flex gap-1 border-b border-[#e5e5e5] px-3 py-2 bg-[#f1f1f1]/40">
      {SERVICE_TAB_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] transition-colors ${
              isActive
                ? "bg-[#c40012] font-600 text-white shadow-sm"
                : "text-[#8a8a8a] hover:bg-[#f1f1f1] hover:text-[#1f1f1f]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

