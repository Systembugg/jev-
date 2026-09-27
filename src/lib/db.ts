/** Local history + data bank (IndexedDB). Everything the Context Pack reads lives here. */
import type { QuestionDef } from "./jev/questions";

export type SavedCard = {
  id: string;
  intent: string;
  text: string;
  ts: number;
  data?: unknown;
};

export type SavedSchema = {
  id: string;
  name: string;
  description?: string;
  source: string;
  questions: Record<string, QuestionDef>;
  ts: number;
};

const DB_NAME = "jev-play";
const DB_VERSION = 2; // v2 adds the "schemas" store (Schema Studio)
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(new Error("indexedDB unavailable"));
  dbp ??= new Promise((resolve, reject) => {
    const rq = indexedDB.open(DB_NAME, DB_VERSION);
    rq.onupgradeneeded = () => {
      const d = rq.result;
      if (!d.objectStoreNames.contains("cards"))
        d.createObjectStore("cards", { keyPath: "id" });
      if (!d.objectStoreNames.contains("songs"))
        d.createObjectStore("songs", { keyPath: "id" });
      if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
      if (!d.objectStoreNames.contains("schemas"))
        d.createObjectStore("schemas", { keyPath: "id" });
    };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
  return dbp;
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | undefined,
): Promise<T | undefined> {
  const d = await open();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const saveCard = (c: SavedCard) =>
  tx("cards", "readwrite", (s) => s.put(c));
export const deleteCard = (id: string) =>
  tx("cards", "readwrite", (s) => s.delete(id));
export const listCards = () =>
  tx<SavedCard[]>("cards", "readonly", (s) => s.getAll());

export const putSong = (c: SavedCard) =>
  tx("songs", "readwrite", (s) => s.put(c));
export const deleteSong = (id: string) =>
  tx("songs", "readwrite", (s) => s.delete(id));
export const listSongs = () =>
  tx<SavedCard[]>("songs", "readonly", (s) => s.getAll());

export const saveSchema = (s: SavedSchema) =>
  tx("schemas", "readwrite", (st) => st.put(s));
export const deleteSchema = (id: string) =>
  tx("schemas", "readwrite", (st) => st.delete(id));
export const listSchemas = () =>
  tx<SavedSchema[]>("schemas", "readonly", (st) => st.getAll());
