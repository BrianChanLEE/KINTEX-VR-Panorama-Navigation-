import { IconCamera, IconCompass, IconGrid } from "../components/icons";
import type { MapTourDestination, ServiceTabItem } from "../models/service-menu.model";

export const SERVICE_TAB_ITEMS: ServiceTabItem[] = [
  {
    id: "map-tour",
    label: "지도 투어",
    icon: IconGrid,
  },
  {
    id: "stamp-tour",
    label: "스탬프 투어",
    icon: IconCamera,
  },
  {
    id: "evacuation-training",
    label: "대피 훈련",
    icon: IconCompass,
  },
];

export const MAP_TOUR_EXHIBITIONS = [
  {
    id: "exhibition-1",
    label: "제1전시장",
    floors: ["1층", "2층", "3층"],
  },
  {
    id: "exhibition-2",
    label: "제2전시장",
    floors: ["1층", "2층", "3층", "4층"],
  },
] as const;

export const MAP_TOUR_DESTINATIONS: MapTourDestination[] = [
  { id: "hall", label: "전시홀", category: "exhibition" },
  { id: "lobby", label: "로비", category: "circulation" },
  { id: "restroom", label: "화장실", category: "facility" },
  { id: "desk", label: "안내데스크", category: "facility" },
  { id: "elevator", label: "엘리베이터", category: "facility" },
  { id: "escalator", label: "에스컬레이터", category: "facility" },
  { id: "exit", label: "비상구", category: "safety" },
  { id: "rest", label: "휴게 공간", category: "facility" },
  { id: "food", label: "식음료 시설", category: "facility" },
  { id: "amenity", label: "주요 부대시설", category: "facility" },
];

