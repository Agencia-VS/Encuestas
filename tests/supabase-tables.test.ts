import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseTables, usingDefaultSupabaseTables } from "@/lib/supabaseTables";

const originalRespuestas = process.env.SUPABASE_RESPUESTAS_TABLE;
const originalBloqueadas = process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE;

afterEach(() => {
  process.env.SUPABASE_RESPUESTAS_TABLE = originalRespuestas;
  process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE = originalBloqueadas;
});

describe("getSupabaseTables", () => {
  it("usa tablas por defecto cuando no hay variables", () => {
    delete process.env.SUPABASE_RESPUESTAS_TABLE;
    delete process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE;

    expect(getSupabaseTables()).toEqual({
      respuestas: "respuestas",
      respuestasBloqueadas: "respuestas_bloqueadas",
    });
    expect(usingDefaultSupabaseTables()).toBe(true);
  });

  it("permite override para tablas E2E", () => {
    process.env.SUPABASE_RESPUESTAS_TABLE = "respuestas_e2e";
    process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE = "respuestas_bloqueadas_e2e";

    expect(getSupabaseTables()).toEqual({
      respuestas: "respuestas_e2e",
      respuestasBloqueadas: "respuestas_bloqueadas_e2e",
    });
    expect(usingDefaultSupabaseTables()).toBe(false);
  });

  it("ignora nombres invalidos y vuelve a defaults", () => {
    process.env.SUPABASE_RESPUESTAS_TABLE = "respuestas;drop table";
    process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE = "public.respuestas_bloqueadas_e2e";

    expect(getSupabaseTables()).toEqual({
      respuestas: "respuestas",
      respuestasBloqueadas: "respuestas_bloqueadas",
    });
  });
});
