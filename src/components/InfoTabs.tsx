// Note 1: facility 데이터 모듈에서 정보 탭 식별용 InfoTab 유니온 타입을 임포트합니다.
import type { InfoTab } from "../data/facility";

// Note 2: 각 탭 항목을 나타내는 데이터 객체의 인터페이스 정의입니다.
interface TabItem {
  id: InfoTab;
  ko: string;
  iconClass: string;
}

// Note 3: 화면 하단에 표시할 정보 탭 목록을 구성하는 정적 배열입니다.
// 코드와 탭 목록 데이터를 완벽하게 격리하여 깔끔하고 유연하게 처리합니다.
const TAB_ITEMS: TabItem[] = [
  { id: "general", ko: "일반정보", iconClass: "information-normal" },
  { id: "safety", ko: "안전정보", iconClass: "information-safety" },
  { id: "space", ko: "공간정보", iconClass: "information-space" },
];

// Note 4: InfoTabsProps 인터페이스 선언을 통해 전달인자의 엄밀한 명세 타입을 지정합니다.
interface InfoTabsProps {
  activeTab: InfoTab | null;
  onSelect: (tab: InfoTab) => void;
  visible?: boolean;
}

// Note 5: KINTEX 시설 정보(일반/안전/공간) 선택용 하단 탭 바 컴포넌트입니다.
export default function InfoTabs({
  activeTab,
  onSelect,
  visible = true,
}: InfoTabsProps) {
  // Note 6: visible이 false일 경우 조기 차단(Early Exit/Guard Clause)하여 무의미한 JSX 연산과 레이아웃 점유를 예방합니다.
  if (!visible) return null;

  return (
    // Note 7: index.css에 정의된 .panorama-information 스타일 시트를 상속하여 렌더링합니다.
    <div className="panorama-information">
      {/* Note 8: TAB_ITEMS 배열을 루프 순회하여 탭 버튼 요소를 생성합니다. */}
      {TAB_ITEMS.map((tab) => {
        // Note 9: 현재 탭의 활성화 여부를 상태 비교하여 정의합니다.
        const isActive = tab.id === activeTab;
        // Note 10: 로컬 public 아이콘 파일명 패턴 규칙에 맞게 아이콘 주소를 동적 계산합니다.
        const iconName = tab.iconClass.replace("information-", "information_");
        const iconUrl = `/convention_kor/images/vr/new/${
          isActive ? `${iconName}_on` : iconName
        }.png`;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            // Note 11: 활성화 여부에 따라 "enabled" 클래스를 조건부 바인딩하여 폰트 색상 및 hover 효과를 제어합니다.
            className={`panorama-btn ${isActive ? "enabled" : ""}`}
          >
            <span
              className="btn-icon"
              style={{
                backgroundImage: `url(${iconUrl})`,
              }}
            />
            <span className="btn-text">{tab.ko}</span>
          </button>
        );
      })}
    </div>
  );
}
