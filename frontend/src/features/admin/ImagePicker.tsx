"use client";

/**
 * Picking a picture, without knowing what a URL is.
 *
 * The shop's owner has photos on a laptop or a phone, so the admin's job is to
 * accept a *file* — dragged in, or chosen from the file dialog — and turn it
 * into something the storefront can render. Everything technical happens here:
 * the photo is downsized in the browser (a 6 MB camera JPEG becomes ~200 KB of
 * WEBP, so the shop stays fast), uploaded, and stored as a path.
 *
 * A link box is still there, folded away, for the rare case someone does have
 * a URL — but nobody has to find one to add a product.
 */

import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui";

/** Longest edge of a stored photo. Bigger than any slot the storefront has. */
const MAX_EDGE = 2000;
/** Anything past this is re-encoded; a small file is left exactly as it is. */
const REENCODE_ABOVE_BYTES = 300 * 1024;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.readAsDataURL(file);
  });

/**
 * Shrinks a photo in the browser. Animated GIFs are passed through untouched —
 * a canvas would flatten them to a single frame.
 */
async function prepareImage(file: File): Promise<string> {
  const passThrough = file.type === "image/gif" || (file.size <= REENCODE_ABOVE_BYTES && file.type !== "image/avif");
  if (passThrough) return readAsDataUrl(file);

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    // WEBP keeps transparency, so a PNG logo survives the conversion.
    const dataUrl = canvas.toDataURL("image/webp", 0.86);
    if (!dataUrl.startsWith("data:image/webp")) throw new Error("webp unsupported");
    return dataUrl;
  } catch {
    // Any browser that cannot do this still gets to upload the original.
    return readAsDataUrl(file);
  }
}

/** Uploads files and hands back the stored paths, in the order they were given. */
function useUploader() {
  const upload = trpc.media.upload.useMutation();
  const utils = trpc.useUtils();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (files: File[]): Promise<string[]> => {
      const images = files.filter(file => file.type.startsWith("image/"));
      if (images.length === 0) {
        if (files.length > 0) toast.error("That file is not an image", { description: "Use a JPG, PNG, WEBP or GIF." });
        return [];
      }

      setBusy(true);
      const saved: string[] = [];
      try {
        for (const file of images) {
          try {
            const dataUrl = await prepareImage(file);
            const result = await upload.mutateAsync({ fileName: file.name, dataUrl });
            saved.push(result.url);
          } catch (error) {
            toast.error(`${file.name} was not uploaded`, {
              description: error instanceof Error ? error.message : "Please try again.",
            });
          }
        }
        if (saved.length > 0) {
          toast.success(saved.length === 1 ? "Image uploaded" : `${saved.length} images uploaded`);
          void utils.media.library.invalidate();
        }
      } finally {
        setBusy(false);
      }
      return saved;
    },
    [upload, utils],
  );

  return { run, busy };
}

/* ------------------------------------------------------------- drop zone -- */

function DropZone({
  onFiles,
  busy,
  multiple,
  label,
  hint,
}: {
  onFiles: (files: File[]) => void;
  busy: boolean;
  multiple: boolean;
  label: string;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    onFiles(Array.from(event.dataTransfer.files ?? []));
  };

  return (
    <div
      className={`sfa-drop${over ? " sfa-drop--over" : ""}${busy ? " sfa-drop--busy" : ""}`}
      onDragOver={event => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      onClick={() => !busy && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={event => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      {busy ? (
        <Loader2 size={20} className="sfa-drop__spin" aria-hidden="true" />
      ) : (
        <ImagePlus size={20} aria-hidden="true" />
      )}
      <span className="sfa-drop__label">{busy ? "Uploading…" : label}</span>
      <span className="sfa-drop__hint">{hint}</span>
    </div>
  );
}

/* --------------------------------------------------------------- library -- */

function LibraryModal({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const library = trpc.media.library.useQuery({ limit: 60 }, { retry: false });

  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  return (
    <div className="sfa-media-modal" role="dialog" aria-modal="true" aria-label="Uploaded images" onClick={onClose}>
      <div className="sfa-media-modal__panel" onClick={event => event.stopPropagation()}>
        <div className="sfa-media-modal__head">
          <div>
            <div className="sfa-card__title">Uploaded images</div>
            <div className="sfa-card__desc">Everything you have added before. Click one to use it again.</div>
          </div>
          <Button variant="ghost" size="icon" icon={X} title="Close" onClick={onClose} />
        </div>
        <div className="sfa-media-modal__body">
          {library.isLoading ? (
            <p className="sfa-help">Loading…</p>
          ) : (library.data?.length ?? 0) === 0 ? (
            <p className="sfa-help">No images uploaded yet. Add one and it will appear here.</p>
          ) : (
            <div className="sfa-media-grid">
              {(library.data ?? []).map(item => (
                <button
                  key={item.url}
                  type="button"
                  className="sfa-media-grid__item"
                  title={item.fileName}
                  onClick={() => {
                    onPick(item.url);
                    onClose();
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.fileName} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ link entry -- */

function LinkRow({ onAdd, busy }: { onAdd: (url: string) => void; busy?: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const id = useId();

  if (!open) {
    return (
      <button type="button" className="sfa-media-linkbtn" onClick={() => setOpen(true)} disabled={busy}>
        <Link2 size={13} aria-hidden="true" /> or paste a link
      </button>
    );
  }

  const commit = () => {
    const url = value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      toast.error("That does not look like a link", { description: "A link starts with https://" });
      return;
    }
    onAdd(url);
    setValue("");
    setOpen(false);
  };

  return (
    <div className="sfa-media-link">
      <input
        id={id}
        className="sfa-input"
        placeholder="https://…"
        value={value}
        autoFocus
        onChange={event => setValue(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
      <Button size="sm" onClick={commit}>
        Use link
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------ single one -- */

export function ImageInput({
  value,
  onChange,
  label = "Drag a photo here, or click to choose",
  hint = "JPG, PNG or WEBP — straight from your computer or phone.",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  hint?: string;
}) {
  const { run, busy } = useUploader();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const replaceRef = useRef<HTMLInputElement | null>(null);

  const accept = async (files: File[]) => {
    const [first] = await run(files.slice(0, 1));
    if (first) onChange(first);
  };

  return (
    <div className="sfa-media">
      {value ? (
        <div className="sfa-media-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="sfa-media-preview__img" />
          <div className="sfa-media-preview__meta">
            <span className="sfa-media-preview__name">{value.split("/").pop()}</span>
            <div className="sfa-media-preview__actions">
              <Button size="sm" icon={busy ? Loader2 : Upload} disabled={busy} onClick={() => replaceRef.current?.click()}>
                {busy ? "Uploading…" : "Replace"}
              </Button>
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onChange("")}>
                Remove
              </Button>
            </div>
            <input
              ref={replaceRef}
              type="file"
              accept="image/*"
              hidden
              onChange={event => {
                void accept(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </div>
        </div>
      ) : (
        <DropZone onFiles={files => void accept(files)} busy={busy} multiple={false} label={label} hint={hint} />
      )}

      <div className="sfa-media-tools">
        <button type="button" className="sfa-media-linkbtn" onClick={() => setLibraryOpen(true)}>
          <ImagePlus size={13} aria-hidden="true" /> choose an image you already uploaded
        </button>
        <LinkRow onAdd={onChange} busy={busy} />
      </div>

      {libraryOpen ? <LibraryModal onPick={onChange} onClose={() => setLibraryOpen(false)} /> : null}
    </div>
  );
}

/* --------------------------------------------------------------- gallery -- */

export function GalleryInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { run, busy } = useUploader();
  const [libraryOpen, setLibraryOpen] = useState(false);

  const add = async (files: File[]) => {
    const saved = await run(files);
    if (saved.length > 0) onChange([...value, ...saved]);
  };

  const move = (index: number, delta: number) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="sfa-media">
      {value.length > 0 ? (
        <div className="sfa-media-strip">
          {value.map((url, index) => (
            <figure key={`${url}-${index}`} className="sfa-media-strip__item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              <figcaption className="sfa-media-strip__bar">
                <button type="button" title="Move earlier" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowLeft size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Move later"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                >
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Remove"
                  className="sfa-media-strip__remove"
                  onClick={() => onChange(value.filter((_, position) => position !== index))}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      <DropZone
        onFiles={files => void add(files)}
        busy={busy}
        multiple
        label={value.length > 0 ? "Add more photos" : "Drag photos here, or click to choose"}
        hint="You can select several at once. The first one shows first."
      />

      <div className="sfa-media-tools">
        <button type="button" className="sfa-media-linkbtn" onClick={() => setLibraryOpen(true)}>
          <ImagePlus size={13} aria-hidden="true" /> choose an image you already uploaded
        </button>
        <LinkRow onAdd={url => onChange([...value, url])} busy={busy} />
      </div>

      {libraryOpen ? (
        <LibraryModal onPick={url => onChange([...value, url])} onClose={() => setLibraryOpen(false)} />
      ) : null}
    </div>
  );
}
