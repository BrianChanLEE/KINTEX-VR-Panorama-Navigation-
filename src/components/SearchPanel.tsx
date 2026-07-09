import { useState, useEffect, useRef } from "react";
import { SCENES, type Scene } from "../models/scene.model";
import type { Hotspot } from "../models/hotspot.model";
import addedHotspotsData from "../data/added-hotspots.json";

interface SearchPanelProps {
  lang: "KOR" | "ENG";
  onSelectResult: (sceneId: string, hotspot?: Hotspot) => void;
}

export default function SearchPanel({ lang, onSelectResult }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Gather all searchable items (scenes & hotspots)
  const getSearchableItems = () => {
    const items: Array<{
      id: string;
      sceneId: string;
      type: "scene" | "hotspot";
      label: string;
      labelEn: string;
      hotspotType?: string;
      hotspot?: Hotspot;
    }> = [];

    // Add all scenes
    for (const s of SCENES) {
      items.push({
        id: s.id,
        sceneId: s.id,
        type: "scene",
        label: s.ko,
        labelEn: s.en,
      });

      // Get added hotspots for this scene
      const currentAdded = (addedHotspotsData as Record<string, Hotspot[]>)[s.id] || [];
      const allHotspots = [...s.hotspots, ...currentAdded];

      // Add all hotspots in this scene
      for (const h of allHotspots as Hotspot[]) {
        items.push({
          id: h.id,
          sceneId: s.id,
          type: "hotspot",
          label: h.label,
          labelEn: h.labelEn || h.label,
          hotspotType: h.type || (h.url?.includes("toilet") ? "toilet" : undefined),
          hotspot: h,
        });
      }
    }

    return items;
  };

  const allItems = getSearchableItems();
  const results = query.trim()
    ? allItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.labelEn.toLowerCase().includes(q)
        );
      })
    : [];

  const getEmoji = (item: typeof allItems[0]) => {
    if (item.type === "scene") return "🖼️";
    if (item.hotspotType === "toilet") return "🚻";
    if (item.hotspotType === "convenience") return "🏪";
    if (item.hotspotType === "cafe") return "☕";
    if (item.hotspotType === "elevator") return "🛗";
    if (item.hotspot?.kind === "nav") return "👣";
    return "📍";
  };

  return (
    <div 
      ref={containerRef} 
      className="absolute top-[82px] left-[360px] z-30 select-none font-sans"
    >
      <div 
        className="flex items-center bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-zinc-200/80 px-3.5 py-1.5 transition-all duration-300 w-64 focus-within:w-80"
        style={{ pointerEvents: "auto" }}
      >
        <span className="text-zinc-400 text-sm mr-2">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={lang === "KOR" ? "시설물/장소 검색..." : "Search facilities..."}
          className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder-zinc-400 w-full"
        />
        {query && (
          <button 
            onClick={() => {
              setQuery("");
              setOpen(false);
            }} 
            className="text-zinc-400 hover:text-zinc-600 font-bold ml-1 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-11 left-0 w-80 bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl p-2.5 max-h-80 overflow-y-auto no-scrollbar animate-rise-in backdrop-blur-lg">
          <div className="text-[10px] text-white/40 font-semibold px-2 pb-1.5 border-b border-white/10 uppercase tracking-wider">
            검색 결과 ({results.length})
          </div>
          <div className="flex flex-col gap-1 mt-1.5">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectResult(item.sceneId, item.hotspot);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/10 transition"
              >
                <span className="text-sm">{getEmoji(item)}</span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-semibold text-white truncate">
                    {lang === "KOR" ? item.label : item.labelEn}
                  </span>
                  <span className="text-[9px] text-white/40 truncate">
                    {item.type === "scene" 
                      ? (lang === "KOR" ? "이동하기" : "Navigate here")
                      : `${SCENES.find(s => s.id === item.sceneId)?.ko} 내 위치`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute top-11 left-0 w-80 bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl p-4 text-center text-xs text-white/40 backdrop-blur-lg">
          🔍 검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
