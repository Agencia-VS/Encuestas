const DEFAULT_RESPUESTAS_TABLE = "respuestas";
const DEFAULT_RESPUESTAS_BLOQUEADAS_TABLE = "respuestas_bloqueadas";

function sanitizeTableName(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  // Limit table names to safe identifiers to avoid malformed queries.
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

export function getSupabaseTables() {
  const respuestas = sanitizeTableName(process.env.SUPABASE_RESPUESTAS_TABLE, DEFAULT_RESPUESTAS_TABLE);
  const respuestasBloqueadas = sanitizeTableName(
    process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE,
    DEFAULT_RESPUESTAS_BLOQUEADAS_TABLE
  );

  return {
    respuestas,
    respuestasBloqueadas,
  };
}

export function usingDefaultSupabaseTables(): boolean {
  const tables = getSupabaseTables();
  return (
    tables.respuestas === DEFAULT_RESPUESTAS_TABLE &&
    tables.respuestasBloqueadas === DEFAULT_RESPUESTAS_BLOQUEADAS_TABLE
  );
}

export function getDefaultSupabaseTables() {
  return {
    respuestas: DEFAULT_RESPUESTAS_TABLE,
    respuestasBloqueadas: DEFAULT_RESPUESTAS_BLOQUEADAS_TABLE,
  };
}
