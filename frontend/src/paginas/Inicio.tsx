import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function Inicio() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/pastas", { replace: true });
  }, [navigate]);

  return null;
}