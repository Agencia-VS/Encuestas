import { expect, test } from "@playwright/test";

type EncuestaPayload = {
  nombre: string;
  edad: number;
  sexo: string;
  pais_residencia: string;
  nacionalidad: string;
  respondent_id: string;
  respuesta_1: string;
  respuesta_2: string;
  respuesta_3: string;
};

type EligibilityCase = {
  name: string;
  edad: number;
  paisResidencia: string;
  nacionalidad: string;
  expectedStatus: number;
  expectedErrorContains?: string;
  headers?: Record<string, string>;
};

function ensureE2ESafeTables() {
  const respuestasTable = process.env.SUPABASE_RESPUESTAS_TABLE?.trim();
  const bloqueadasTable = process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE?.trim();

  if (!respuestasTable || !bloqueadasTable) {
    throw new Error(
      "Faltan SUPABASE_RESPUESTAS_TABLE y/o SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE para E2E. Configura tablas espejo antes de correr Playwright."
    );
  }

  if (respuestasTable === "respuestas" || bloqueadasTable === "respuestas_bloqueadas") {
    throw new Error(
      "Bloqueo de seguridad: E2E no se ejecuta contra tablas productivas. Usa tablas como respuestas_e2e y respuestas_bloqueadas_e2e."
    );
  }
}

function createPayload(overrides: Partial<EncuestaPayload> = {}): EncuestaPayload {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    nombre: "E2E Tester",
    edad: 28,
    sexo: "masculino",
    pais_residencia: "Chile",
    nacionalidad: "Chile",
    respondent_id: `rid-e2e-${unique}`,
    respuesta_1: "Argentina",
    respuesta_2: "CR7",
    respuesta_3: "Brasil",
    ...overrides,
  };
}

function createRespondentId(): string {
  return `rid-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const ELIGIBILITY_CASES: EligibilityCase[] = [
  {
    name: "mayor de edad chileno en Chile (permitido)",
    edad: 28,
    paisResidencia: "Chile",
    nacionalidad: "Chile",
    expectedStatus: 201,
  },
  {
    name: "mayor de edad migrante en Chile (permitido)",
    edad: 31,
    paisResidencia: "Chile",
    nacionalidad: "Argentina",
    expectedStatus: 201,
  },
  {
    name: "mayor de edad chileno en el extranjero (permitido)",
    edad: 35,
    paisResidencia: "Argentina",
    nacionalidad: "Chile",
    expectedStatus: 201,
  },
  {
    name: "mayor de edad extranjero en el extranjero (rechazado por target)",
    edad: 29,
    paisResidencia: "Argentina",
    nacionalidad: "Peru",
    expectedStatus: 403,
    expectedErrorContains: "Encuesta disponible solo para",
  },
  {
    name: "menor de edad chileno en Chile (rechazado por edad)",
    edad: 17,
    paisResidencia: "Chile",
    nacionalidad: "Chile",
    expectedStatus: 403,
    expectedErrorContains: "mayores de 18",
  },
  {
    name: "menor de edad extranjero en el extranjero (rechazado por edad)",
    edad: 16,
    paisResidencia: "Argentina",
    nacionalidad: "Peru",
    expectedStatus: 403,
    expectedErrorContains: "mayores de 18",
  },
  {
    name: "residente en Chile con IP fuera de Chile (rechazado por segmentacion)",
    edad: 30,
    paisResidencia: "Chile",
    nacionalidad: "Chile",
    expectedStatus: 403,
    expectedErrorContains: "segmentacion geografica",
    headers: {
      "x-vercel-ip-country": "US",
    },
  },
  {
    name: "residente en Chile con IP Chile (permitido)",
    edad: 30,
    paisResidencia: "Chile",
    nacionalidad: "Chile",
    expectedStatus: 201,
    headers: {
      "x-vercel-ip-country": "CL",
    },
  },
  {
    name: "chileno en extranjero con IP fuera de Chile (permitido)",
    edad: 30,
    paisResidencia: "Argentina",
    nacionalidad: "Chile",
    expectedStatus: 201,
    headers: {
      "x-vercel-ip-country": "US",
    },
  },
];

test.describe("API respuestas E2E", () => {
  test.beforeAll(() => {
    ensureE2ESafeTables();
  });

  for (const scenario of ELIGIBILITY_CASES) {
    test(`elegibilidad: ${scenario.name}`, async ({ request }) => {
      const payload = createPayload({
        edad: scenario.edad,
        pais_residencia: scenario.paisResidencia,
        nacionalidad: scenario.nacionalidad,
        respondent_id: createRespondentId(),
      });

      const response = await request.post("/api/respuestas", {
        data: payload,
        headers: scenario.headers,
      });

      expect(response.status()).toBe(scenario.expectedStatus);

      if (scenario.expectedErrorContains) {
        const data = (await response.json()) as { error?: string };
        expect(data.error ?? "").toContain(scenario.expectedErrorContains);
      }
    });
  }

  test("registra una respuesta y bloquea duplicado por respondent_id", async ({ request }) => {
    const payload = createPayload();

    const first = await request.post("/api/respuestas", { data: payload });
    expect(first.status()).toBe(201);

    const second = await request.post("/api/respuestas", { data: payload });
    expect(second.status()).toBe(409);
  });

  test("registra bloqueo persistente para fuera de target", async ({ request }) => {
    const payload = createPayload({
      nacionalidad: "Argentina",
      pais_residencia: "Argentina",
      respondent_id: createRespondentId(),
    });

    const bloqueo = await request.post("/api/respuestas/bloqueo", {
      data: {
        nombre: payload.nombre,
        edad: payload.edad,
        sexo: payload.sexo,
        pais_residencia: payload.pais_residencia,
        nacionalidad: payload.nacionalidad,
        respondent_id: payload.respondent_id,
        motivo_bloqueo: "fuera_target",
      },
    });

    expect([200, 201]).toContain(bloqueo.status());

    const bloqueoDuplicado = await request.post("/api/respuestas/bloqueo", {
      data: {
        nombre: payload.nombre,
        edad: payload.edad,
        sexo: payload.sexo,
        pais_residencia: payload.pais_residencia,
        nacionalidad: payload.nacionalidad,
        respondent_id: payload.respondent_id,
        motivo_bloqueo: "fuera_target",
      },
    });

    expect(bloqueoDuplicado.status()).toBe(200);
  });
});
