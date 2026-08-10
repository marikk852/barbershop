"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAdminFetch } from "@/lib/admin-context";
import { haptic } from "@/lib/telegram-webapp";
import styles from "../admin.module.css";

type AdminUserStatus = "PENDING" | "ACTIVE";

interface AdminUserRow {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  status: AdminUserStatus;
  updatedAt: string;
}

function displayName(u: AdminUserRow): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  if (name && u.username) return `${name} (@${u.username})`;
  if (name) return name;
  if (u.username) return `@${u.username}`;
  return `id ${u.telegramId}`;
}

// Доступна только владельцу (сервер сверяет через requireOwner на каждой
// из /api/admin/users* ручек — эта страница просто отображает результат
// и НЕ является единственным местом защиты; вкладка в AdminShell тоже
// скрыта для не-владельца, но прямой заход по URL всё равно упрётся в
// 401 здесь).
export default function UsersPage() {
  const adminFetch = useAdminFetch();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setError(null);
    adminFetch("/api/admin/users")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(r.status === 401 ? "Доступ запрещён — этот раздел только для владельца." : body.error || "Ошибка загрузки");
        }
        return r.json() as Promise<{ users: AdminUserRow[] }>;
      })
      .then((d) => setUsers(d.users))
      .catch((e: Error) => setError(e.message));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(u: AdminUserRow, status: AdminUserStatus) {
    setBusyId(u.id);
    try {
      const r = await adminFetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      haptic("success");
      setUsers((prev) => (prev ? prev.map((x) => (x.id === u.id ? { ...x, status } : x)) : prev));
    } catch {
      haptic("error");
      setError("Не удалось изменить доступ.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(u: AdminUserRow) {
    setBusyId(u.id);
    try {
      const r = await adminFetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      haptic("success");
      setUsers((prev) => (prev ? prev.filter((x) => x.id !== u.id) : prev));
    } catch {
      haptic("error");
      setError("Не удалось удалить запись.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d+$/.test(newId.trim())) {
      setError("Telegram ID — это число (например, 837507830), не username.");
      return;
    }
    setSaving(true);
    try {
      const r = await adminFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: newId.trim(), firstName: newName.trim() || undefined }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось добавить");
      haptic("success");
      setAdding(false);
      setNewId("");
      setNewName("");
      load();
    } catch (err) {
      haptic("error");
      setError(err instanceof Error ? err.message : "Не удалось добавить");
    } finally {
      setSaving(false);
    }
  }

  const pending = users?.filter((u) => u.status === "PENDING") ?? [];
  const active = users?.filter((u) => u.status === "ACTIVE") ?? [];

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Доступ к админке</h1>
      <p className={styles.hint} style={{ marginTop: -10, marginBottom: 18 }}>
        Владелец (вы) видит эту страницу всегда. Остальным нужно один раз
        открыть бота — заявка появится ниже, останется выдать доступ.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      {!error && !users && (
        <div className={styles.list}>
          {[0, 1].map((i) => (
            <div key={i} className={styles.cardSkeleton} style={{ height: 76 }} />
          ))}
        </div>
      )}

      {users && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Ожидают доступа</h2>
            {pending.length === 0 && <p className={styles.hint}>Заявок нет.</p>}
            {pending.length > 0 && (
              <div className={styles.list}>
                {pending.map((u) => (
                  <div key={u.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.clientName}>{displayName(u)}</span>
                      <span className={`${styles.statusBadge} ${styles.statusPENDING}`}>Ожидает</span>
                    </div>
                    <div className={styles.cardRow}>id {u.telegramId}</div>
                    <div className={styles.btnRow} style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={busyId === u.id}
                        onClick={() => setStatus(u, "ACTIVE")}
                      >
                        Выдать доступ
                      </button>
                      <button type="button" className={styles.dangerBtn} disabled={busyId === u.id} onClick={() => remove(u)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Администраторы</h2>
            {active.length === 0 && <p className={styles.hint}>Кроме вас, доступа ни у кого нет.</p>}
            {active.length > 0 && (
              <div className={styles.list}>
                {active.map((u) => (
                  <div key={u.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.clientName}>{displayName(u)}</span>
                      <span className={`${styles.statusBadge} ${styles.statusCONFIRMED}`}>Активен</span>
                    </div>
                    <div className={styles.cardRow}>id {u.telegramId}</div>
                    <div className={styles.btnRow} style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={busyId === u.id}
                        onClick={() => setStatus(u, "PENDING")}
                      >
                        Отозвать доступ
                      </button>
                      <button type="button" className={styles.dangerBtn} disabled={busyId === u.id} onClick={() => remove(u)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {adding && (
        <form className={styles.card} onSubmit={handleAdd} style={{ marginTop: 14 }}>
          <div className={styles.formRow}>
            <span className={styles.label}>Telegram ID (число)</span>
            <input
              className={styles.input}
              inputMode="numeric"
              placeholder="Например, 837507830"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              required
            />
            <span className={styles.label}>Имя (необязательно, для удобства)</span>
            <input className={styles.input} placeholder="Как назвать в списке" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <div className={styles.btnRow}>
              <button type="submit" className={styles.primaryBtn} disabled={saving}>
                {saving ? "Добавляем…" : "Добавить"}
              </button>
              <button type="button" className={styles.secondaryBtn} disabled={saving} onClick={() => setAdding(false)}>
                Отмена
              </button>
            </div>
          </div>
        </form>
      )}

      {!adding && (
        <button type="button" className={styles.fab} onClick={() => setAdding(true)} aria-label="Добавить по Telegram ID">
          +
        </button>
      )}
    </main>
  );
}
