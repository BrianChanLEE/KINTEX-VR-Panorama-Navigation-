import type { SVGProps } from "react";

export type ServiceTabId = "map-tour" | "stamp-tour" | "evacuation-training";

export type NavigationMode = "idle" | "preview" | "guiding";

export type NavigationStepAction =
  | "straight"
  | "turn-left"
  | "turn-right"
  | "go-up"
  | "go-down"
  | "arrive";

export interface ServiceTabItem {
  id: ServiceTabId;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
}

export interface MapTourDestination {
  id: string;
  label: string;
  category: string;
}

export interface MapTourSelection {
  currentLocation: string;
  selectedExhibition: string;
  selectedFloor: string;
  selectedDestination: string | null;
  navigationRoute: NavigationStep[];
  navigationMode: NavigationMode;
}

export interface NavigationStep {
  id: string;
  order: number;
  instruction: string;
  action: NavigationStepAction;
  floor: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  distance?: number;
}

