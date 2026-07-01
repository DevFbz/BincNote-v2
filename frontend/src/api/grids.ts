import { useQuery } from "@tanstack/react-query";

import { api } from "./cliente";

export interface Field {
  id: number;
  database: number;
  nome: string;
  kind: string;
  config: any;
  ordem: number;
}

export interface OpcaoSelect {
  id: string;
  label: string;
  color: string;
}

export interface Cell {
  id: number;
  record: number;
  field: number;
  valor: any;
}

export interface Record {
  id: number;
  database: number;
  ordem: number;
  excluido_em: string | null;
  cells: Cell[];
}

export interface View {
  id: number;
  database: number;
  nome: string;
  kind: "grid" | "board" | "calendar";
  config: any;
  ordem: number;
}

export interface Database {
  id: number;
  pagina: number;
  nome: string;
  criado_em: string;
  fields?: Field[];
  views?: View[];
}

export interface TemplateKanbanMeta {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  capa: string;
  colunas: string[];
  qtd_cartoes: number;
}

export function useDatabaseDetail(dbId?: number) {
  return useQuery<Database>({
    queryKey: ["db", dbId],
    queryFn: () => api.get<Database>(`/grids/databases/${dbId}/`),
    enabled: Boolean(dbId),
  });
}

export function useRecords(dbId?: number) {
  return useQuery<Record[]>({
    queryKey: ["records", dbId],
    queryFn: () => api.get<Record[]>(`/grids/databases/${dbId}/records/`),
    enabled: Boolean(dbId),
  });
}

export function useTemplatesKanban() {
  return useQuery<TemplateKanbanMeta[]>({
    queryKey: ["templates-kanban"],
    queryFn: () => api.get<TemplateKanbanMeta[]>("/grids/templates/kanban/"),
  });
}

export async function criarTemplateKanban(templateId: string, nome?: string) {
  return api.post<{ pagina_id: number; database_id: number; view_id: number }>(
    "/grids/templates/kanban/criar/",
    { template_id: templateId, nome }
  );
}

export async function atualizarCelula(recordId: number, fieldId: number, valor: any) {
  return api.patch<any>(`/grids/cells/${recordId}/${fieldId}/`, { valor });
}

/** Descobre a page de uma Database (via pagina_id). O cliente de páginas já retorna tudo. */
export function getCell(record: Record, fieldId: number): Cell | undefined {
  return record.cells.find((c) => c.field === fieldId);
}

export function getValorTexto(record: Record, fieldId: number): string {
  return getCell(record, fieldId)?.valor?.text ?? "";
}

export function getValorSelect(record: Record, fieldId: number): OpcaoSelect | null {
  const c = getCell(record, fieldId);
  return c?.valor ?? null;
}

/** Descobre o database_id vinculado a uma página. Status 404 se não for database. */
export async function buscarDatabasePorPagina(paginaId: number): Promise<number | null> {
  try {
    const r = await api.get<{ id: number }>(`/grids/por-pagina/${paginaId}/`);
    return r.id;
  } catch {
    return null;
  }
}