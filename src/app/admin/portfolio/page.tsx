"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { useAdminFetch, useInitData } from "@/lib/admin-context";
import { haptic } from "@/lib/telegram-webapp";
import styles from "../admin.module.css";

interface PortfolioItem {
  id: string;
  imageUrl: string;
  captionRu: string | null;
  captionRo: string | null;
  order: number;
}

export default function PortfolioPage() {
  const adminFetch = useAdminFetch();
  const initData = useInitData(); // upload() из @vercel/blob/client шлёт заголовки сам, ему нужна сырая initData, а не fetch-обёртка
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState({ ru: "", ro: "" });

  function load() {
    setError(null);
    adminFetch("/api/admin/portfolio")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Ошибка загрузки");
        return r.json() as Promise<{ items: PortfolioItem[] }>;
      })
      .then((d) => setItems(d.items))
      .catch((e: Error) => setError(e.message));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // сброс, чтобы повторный выбор того же файла тоже сработал
    if (!file) return;

    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/admin/portfolio/upload",
        headers: { Authorization: `tma ${initData}` },
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });
      const r = await adminFetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: blob.url }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось сохранить фото");
      haptic("success");
      load();
    } catch (err) {
      haptic("error");
      setError(err instanceof Error ? err.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function startEditCaption(item: PortfolioItem) {
    setEditingId(item.id);
    setCaptionDraft({ ru: item.captionRu ?? "", ro: item.captionRo ?? "" });
  }

  async function saveCaption(id: string) {
    setBusyId(id);
    try {
      const r = await adminFetch(`/api/admin/portfolio/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captionRu: captionDraft.ru, captionRo: captionDraft.ro }),
      });
      if (!r.ok) throw new Error();
      haptic("success");
      setEditingId(null);
      load();
    } catch {
      haptic("error");
      setError("Не удалось сохранить подпись.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: PortfolioItem) {
    setBusyId(item.id);
    setError(null);
    try {
      const r = await adminFetch(`/api/admin/portfolio/${item.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось удалить");
      haptic("success");
      setItems((prev) => (prev ? prev.filter((x) => x.id !== item.id) : prev));
    } catch (err) {
      haptic("error");
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setBusyId(null);
    }
  }

  async function move(item: PortfolioItem, dir: -1 | 1) {
    if (!items) return;
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((x) => x.id === item.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    setBusyId(item.id);
    try {
      await Promise.all([
        adminFetch(`/api/admin/portfolio/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: other.order }),
        }),
        adminFetch(`/api/admin/portfolio/${other.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: item.order }),
        }),
      ]);
      haptic("light");
      load();
    } catch {
      haptic("error");
      setError("Не удалось изменить порядок.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Портфолио</h1>

      {error && <p className={styles.error}>{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        style={{ display: "none" }}
        onChange={handleFileChosen}
      />

      {!error && !items && (
        <div className={styles.photoGrid}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.cardSkeleton} style={{ aspectRatio: "1 / 1", height: "auto" }} />
          ))}
        </div>
      )}

      {items && (
        <div className={styles.photoGrid}>
          <button type="button" className={styles.uploadTile} onClick={pickFile} disabled={uploading}>
            <span>{uploading ? "…" : "+"}</span>
            <span>{uploading ? `Загрузка ${progress}%` : "Добавить фото"}</span>
          </button>

          {[...items]
            .sort((a, b) => a.order - b.order)
            .map((item, idx, arr) => (
              <div key={item.id} className={styles.photoCard}>
                {/* eslint-disable-next-line @next/next/no-img-element -- внешние блоб-урлы, next/image тут не даёт выгоды на 2 колонках админки */}
                <img src={item.imageUrl} alt={item.captionRu || item.captionRo || ""} className={styles.photoImg} />
                <div className={styles.photoOverlay}>
                  <div className={styles.photoOverlayTop}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      disabled={busyId === item.id || idx === 0}
                      onClick={() => move(item, -1)}
                      aria-label="Переместить выше"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      disabled={busyId === item.id || idx === arr.length - 1}
                      onClick={() => move(item, 1)}
                      aria-label="Переместить ниже"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      disabled={busyId === item.id}
                      onClick={() => startEditCaption(item)}
                      aria-label="Изменить подпись"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      disabled={busyId === item.id}
                      onClick={() => handleDelete(item)}
                      aria-label="Удалить"
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.photoOverlayBottom}>
                    <span className={styles.photoCaption}>{item.captionRu || "Без подписи"}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {editingId && (
        <div className={styles.card} style={{ marginTop: 14 }}>
          <div className={styles.formRow}>
            <span className={styles.label}>Подпись (рус.)</span>
            <input
              className={styles.input}
              value={captionDraft.ru}
              onChange={(e) => setCaptionDraft((c) => ({ ...c, ru: e.target.value }))}
              placeholder="Например: Классическая стрижка"
            />
            <span className={styles.label}>Подпись (рум.)</span>
            <input
              className={styles.input}
              value={captionDraft.ro}
              onChange={(e) => setCaptionDraft((c) => ({ ...c, ro: e.target.value }))}
              placeholder="Bunăoară: Tuns clasic"
            />
            <div className={styles.btnRow}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busyId === editingId}
                onClick={() => saveCaption(editingId)}
              >
                Сохранить
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={() => setEditingId(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
