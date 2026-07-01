import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";

import { api, type Pagina } from "../api/cliente";
import { STRINGS } from "../i18n/pt-BR";

export function Lixeira() {
  const qc = useQueryClient();
  const { data } = useQuery<Pagina[]>({
    queryKey: ["lixeira"],
    queryFn: () => api.get<Pagina[]>("/documents/pages/?parent=lixeira"),
    placeholderData: [],
  });

  const restaurar = useMutation({
    mutationFn: (id: number) => api.post(`/documents/pages/${id}/restaurar/`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lixeira"] }),
  });

  const paginas = data ?? [];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">{STRINGS.sidebar.lixeira}</h1>
      {paginas.length === 0 ? (
        <p className="text-txt-muted">A lixeira está vazia.</p>
      ) : (
        <ul className="space-y-1">
          {paginas.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-3 py-2 rounded hover:bg-surface-3 dark:hover:bg-surface-dark3"
            >
              <span>{p.titulo || "Sem título"}</span>
              <button
                onClick={() => restaurar.mutate(p.id)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-surface-4 dark:border-surface-dark4 text-txt-muted hover:text-txt"
              >
                <RotateCcw size={12} /> Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}