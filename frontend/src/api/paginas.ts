import { useQuery } from "@tanstack/react-query";

import { api, type Pagina } from "./cliente";

export function useArvorePagina() {
  return useQuery<Pagina[]>({
    queryKey: ["arvore"],
    queryFn: () => api.get<Pagina[]>("/documents/pages/?arvore=1"),
  });
}

export function usePagina(id?: number) {
  return useQuery<Pagina>({
    queryKey: ["pagina", id],
    queryFn: () => api.get<Pagina>(`/documents/pages/${id}/`),
    enabled: Boolean(id),
  });
}

export function useBuscaPaginas(q: string) {
  return useQuery<Pagina[]>({
    queryKey: ["busca", q],
    queryFn: () => api.get<Pagina[]>(`/documents/pages/buscar/?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
  });
}