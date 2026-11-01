import { useState } from "react";
import PTNKVision, { VisionStreamPanel } from "./PTNKVision";

export default function VisionLab() {
  const [view, setView] = useState("stream");
  return <>
    <div className="subtabs" role="group" aria-label="Chế độ Vision">
      {[["stream", "Trạm căn tin"], ["photos", "Kiểm tra ảnh"]].map(([id, label]) => (
        <button key={id} aria-pressed={view === id} className={view === id ? "selected" : ""} onClick={() => setView(id)}>{label}</button>
      ))}
    </div>
    {view === "stream" && <VisionStreamPanel />}
    {view === "photos" && <PTNKVision />}
  </>;
}
