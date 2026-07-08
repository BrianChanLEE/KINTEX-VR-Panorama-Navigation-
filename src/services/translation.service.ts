// Note 1: 한국어 문장을 영문 텍스트로 치환하기 위한 정적 치환 맵 사전입니다.
const TEXT_TRANSLATION_MAP: Record<string, string> = {
  "전경을 상공에서 조망합니다.": "view from the sky.",
  "대한민국 최대 규모의 전시컨벤션 센터로": "As Korea's largest exhibition center,",
  "위치합니다.": "is located.",
};

// Note 2: 표 테이블의 행 제목(Label) 번역용 딕셔너리 정보입니다.
const LABEL_TRANSLATION_DICT: Record<string, string> = {
  명칭: "Name",
  위치: "Location",
  주소: "Address",
  총전시면적: "Total Exhibition Area",
  개관: "Opening Year",
  구역: "Zone",
  인근시설: "Nearby Facilities",
  대중교통: "Public Transit",
  전시홀: "Exhibition Hall",
  회의실: "Meeting Room",
  주차: "Parking",
  야외전시장: "Outdoor Exhibition",
  옥외주차: "Outdoor Parking",
  운영시간: "Hours",
  안내데스크: "Info Desk",
  광장면적: "Plaza Area",
  집결지: "Assembly Point",
  용도: "Purpose",
  미디어월: "Media Wall",
  편의시설: "Amenities",
  층고: "Ceiling Height",
  수직동선: "Vertical Transit",
  수용인원: "Capacity",
  바닥하중: "Floor Load",
  전시면적: "Exhibition Area",
  천장고: "Ceiling Height",
  "부스 (3×3)": "Booths (3x3)",
  전력: "Power Supply",
  화물게이트: "Cargo Gate",
  비상구: "Fire Exit",
  "소화전 · 소화기": "Extinguishers",
  "AED 심장충격기": "AED",
  제연설비: "Smoke Vent",
  안전요원: "Security Guards",
  공간구분: "Space Type",
  전시홀연결: "Hall Connection",
};

// Note 3: 행 데이터 값(Value) 번역용 사전 정보입니다.
const VALUE_TRANSLATION_DICT: Record<string, string> = {
  "8개소 (양방향)": "8 Locations (Bi-directional)",
  "구역별 배치": "Distributed by Zone",
  "로비 1층 비치": "Available on 1F Lobby",
  "자동 급·배기": "Auto Ventilation",
  "상시 순찰": "Regular Patrol",
  제한없음: "No Limit",
  "1층": "1st Floor",
  "2층": "2nd Floor",
  "3층": "3rd Floor",
  "4층": "4th Floor",
  지상주차장: "Ground Parking",
  상시개방: "Always Open",
  "도보 이동 가능": "Walking distance",
  전시전용홀: "Dedicated Exhibition Hall",
  공용이동동선: "Public Walkway",
  "화물 및 참관객 출입": "Cargo & Visitor Entrance",
  야외주차장: "Outdoor Parking Lot",
};

export const translationService = {
  // Note 4: 상세 설명 글 번역 유틸리티 함수입니다.
  translateText(text: string): string {
    if (!text) return "";
    let translated = text;
    for (const [koKey, enVal] of Object.entries(TEXT_TRANSLATION_MAP)) {
      translated = translated.replace(koKey, enVal);
    }
    return translated;
  },

  // Note 5: 라벨 다국어 매핑 수행 함수입니다.
  translateLabel(label: string): string {
    const normalizedKey = label.replace(/\s+/g, "");
    return LABEL_TRANSLATION_DICT[normalizedKey] ?? label;
  },

  // Note 6: 값(value) 다국어 매핑 수행 함수입니다.
  translateValue(value: string): string {
    const normalizedKey = value.replace(/\s+/g, "");
    return VALUE_TRANSLATION_DICT[normalizedKey] ?? value;
  }
};
