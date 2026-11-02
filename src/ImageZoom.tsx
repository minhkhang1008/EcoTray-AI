import { useEffect, useRef, useState, type ComponentProps } from "react";
import Icon from "./Icon";

function ImageLightbox({
  src,
  label,
  onClose,
}: {
  src: string;
  label: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="dish-image-preview"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === dialog.current) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClose={(e) => e.stopPropagation()}
    >
      <div className="dish-image-preview-header">
        <strong>{label}</strong>
        <button autoFocus onClick={onClose} aria-label="Đóng ảnh phóng to">
          Đóng ×
        </button>
      </div>
      <img src={src} alt={label} />
    </dialog>
  );
}

/** Ảnh bấm được để phóng to. Không đặt bên trong một nút khác. */
export function ZoomableImage({
  label,
  src,
  ...image
}: Omit<ComponentProps<"img">, "src"> & { src: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="image-zoom"
        aria-label={`Phóng to ảnh ${label}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <img src={src} {...image} />
      </button>
      {open && <ImageLightbox src={src} label={label} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Nút phóng to đặt ở góc ảnh, cho ảnh đã nằm trong một nút có chức năng khác. */
export function ZoomCornerButton({ src, label }: { src: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="image-zoom-corner"
        aria-label={`Phóng to ảnh ${label}`}
        title="Phóng to ảnh"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Icon name="search" size={14} />
      </button>
      {open && <ImageLightbox src={src} label={label} onClose={() => setOpen(false)} />}
    </>
  );
}
