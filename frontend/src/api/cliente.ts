const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export interface Pagina {
  id: number;
  titulo: string;
  icone: string;
  capa: string;
  kind: "document" | "database";
  ordem: number;
  parent: number | null;
  conteudo: object;
  excluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  children?: Pagina[];
}

export interface Preferencias {
  id: number;
  tema: "light" | "dark" | "system";
  idioma: string;
}