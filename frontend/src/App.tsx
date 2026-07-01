import { useEffect } from "react";
import { Routes, Route, useParams } from "react-router-dom";

import { Layout } from "./components/Layout";
import { PaginaView } from "./paginas/PaginaView";
import { Inicio } from "./paginas/Inicio";
import { Lixeira } from "./paginas/Lixeira";
import { Pastas } from "./paginas/Pastas";
import { aplicarTema, useUI } from "./stores/ui";

export default function App() {
  const tema = useUI((s) => s.tema);
  useEffect(() => aplicarTema(tema), [tema]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="pagina/:id" element={<PaginaWrapper />} />
        <Route path="pastas" element={<Pastas />} />
        <Route path="lixeira" element={<Lixeira />} />
      </Route>
    </Routes>
  );
}

function PaginaWrapper() {
  const { id } = useParams();
  if (!id) return <Inicio />;
  return <PaginaView id={Number(id)} />;
}