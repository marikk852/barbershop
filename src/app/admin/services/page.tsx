"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAdminFetch } from "@/lib/admin-context";
import { haptic } from "@/lib/telegram-webapp";
import styles from "../admin.module.css";

interface Service {
  id: string;
  slug: string;
  nameRu: string;
  nameRo: string;
  durationMin: number;
  priceCents: number;
  order: number;
  active: boolean;
}

interface FormState {
  nameRu: string;
  nameRo: string;
  durationMin: string;
  price: string; // MDL, не центы — центы это деталь хранения, не то, чем оперирует барбер
  active: boolean;
}

const EMPTY_FORM: FormState = { nameRu: "", nameRo: "", durationMin: "", price: "", active: true };

function toForm(s: Service): FormState {
  return {
    nameRu: s.nameRu,
    nameRo: s.nameRo,
    durationMin: String(s.durationMin),
    price: String(s.priceCents / 100),
    active: s.active,
  };
}

export default function ServicesPage() {
  const adminFetch = useAdminFetch();
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setError(null);
    adminFetch("/api/admin/services")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Ошибка загрузки");
        return r.json() as Promise<{ services: Service[] }>;
      })
      .then((d) => setServices(d.services))
      .catch((e: Error) => setError(e.message));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(s: Service) {
    setAdding(false);
    setEditingId(s.id);
    setForm(toForm(s));
  }
  function startAdd() {
    setEditingId(null);
    setAdding(true);
    setForm(EMPTY_FORM);
  }
  function cancelForm() {
    setEditingId(null);
    setAdding(false);
  }

  function parseFormOrError(): { nameRu: string; nameRo: string; durationMin: number; priceCents: number } | null {
    const durationMin = Number(form.durationMin);
    const priceLeu = Number(form.price.replace(",", "."));
    if (!form.nameRu.trim() || !form.nameRo.trim()) {
      setError("Название на русском и румынском обязательны.");
      return null;
    }
    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      setError("Длительность должна быть положительным числом минут.");
      return null;
    }
    if (!Number.isFinite(priceLeu) || priceLeu < 0) {
      setError("Цена должна быть неотрицательным числом.");
      return null;
    }
    return { nameRu: form.nameRu.trim(), nameRo: form.nameRo.trim(), durationMin, priceCents: Math.round(priceLeu * 100) };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseFormOrError();
    if (!parsed) return;
    setSaving(true);
    try {
      if (editingId) {
        const r = await adminFetch(`/api/admin/services/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...parsed, active: form.active }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось сохранить");
      } else {
        const r = await adminFetch("/api/admin/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...parsed, active: form.active }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось создать");
      }
      haptic("success");
      setEditingId(null);
      setAdding(false);
      load();
    } catch (err) {
      haptic("error");
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Service) {
    setBusyId(s.id);
    try {
      const r = await adminFetch(`/api/admin/services/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !s.active }),
      });
      if (!r.ok) throw new Error();
      haptic("light");
      setServices((prev) => (prev ? prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)) : prev));
    } catch {
      haptic("error");
      setError("Не удалось изменить активность.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(s: Service) {
    setBusyId(s.id);
    setError(null);
    try {
      const r = await adminFetch(`/api/admin/services/${s.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось удалить");
      haptic("success");
      setServices((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
    } catch (err) {
      haptic("error");
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setBusyId(null);
    }
  }

  async function move(s: Service, dir: -1 | 1) {
    if (!services) return;
    const sorted = [...services].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((x) => x.id === s.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    setBusyId(s.id);
    try {
      await Promise.all([
        adminFetch(`/api/admin/services/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: other.order }),
        }),
        adminFetch(`/api/admin/services/${other.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: s.order }),
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

  const formVisible = adding || editingId !== null;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Прайс-лист</h1>

      {error && <p className={styles.error}>{error}</p>}

      {formVisible && (
        <form className={styles.card} onSubmit={handleSubmit} style={{ marginBottom: 14 }}>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              placeholder="Название (рус.)"
              value={form.nameRu}
              onChange={(e) => setForm((f) => ({ ...f, nameRu: e.target.value }))}
              required
            />
            <input
              className={styles.input}
              placeholder="Название (рум.)"
              value={form.nameRo}
              onChange={(e) => setForm((f) => ({ ...f, nameRo: e.target.value }))}
              required
            />
            <div className={styles.row2}>
              <input
                className={styles.input}
                type="number"
                min="1"
                placeholder="Минут"
                value={form.durationMin}
                onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
                required
              />
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                placeholder="Цена, MDL"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
              />
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Активна (видна в прайс-листе и записи)
            </label>
            <div className={styles.btnRow}>
              <button type="submit" className={styles.primaryBtn} disabled={saving}>
                {saving ? "Сохраняем…" : editingId ? "Сохранить" : "Добавить"}
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={cancelForm} disabled={saving}>
                Отмена
              </button>
            </div>
          </div>
        </form>
      )}

      {!error && !services && (
        <div className={styles.list}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.cardSkeleton} style={{ height: 76 }} />
          ))}
        </div>
      )}

      {services && (
        <div className={styles.list}>
          {[...services]
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <div key={s.id} className={styles.card} style={{ opacity: s.active ? 1 : 0.5 }}>
                <div className={styles.cardHeader}>
                  <span className={styles.clientName}>{s.nameRu}</span>
                  {!s.active && <span className={`${styles.statusBadge} ${styles.statusDONE}`}>Скрыта</span>}
                </div>
                <div className={styles.cardRow}>{s.nameRo}</div>
                <div className={styles.cardRow}>
                  {s.durationMin} мин · {(s.priceCents / 100).toLocaleString("ru-RU")} MDL
                </div>
                <div className={styles.btnRow} style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className={`${styles.secondaryBtn} ${styles.moveBtn}`}
                    disabled={busyId === s.id}
                    onClick={() => move(s, -1)}
                    aria-label="Переместить выше"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={`${styles.secondaryBtn} ${styles.moveBtn}`}
                    disabled={busyId === s.id}
                    onClick={() => move(s, 1)}
                    aria-label="Переместить ниже"
                  >
                    ↓
                  </button>
                  <button type="button" className={styles.secondaryBtn} disabled={busyId === s.id} onClick={() => toggleActive(s)}>
                    {s.active ? "Скрыть" : "Показать"}
                  </button>
                  <button type="button" className={styles.secondaryBtn} disabled={busyId === s.id} onClick={() => startEdit(s)}>
                    Изменить
                  </button>
                  <button type="button" className={styles.dangerBtn} disabled={busyId === s.id} onClick={() => handleDelete(s)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {!formVisible && (
        <button type="button" className={styles.fab} onClick={startAdd} aria-label="Добавить услугу">
          +
        </button>
      )}
    </main>
  );
}
