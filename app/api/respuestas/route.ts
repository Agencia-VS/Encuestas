import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type Payload = {
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

const TARGET_COUNTRY_LABEL = "chile";
const TARGET_COUNTRY_CODE = "CL";
const MIN_AGE = 18;

function esRespondentIdValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length >= 12;
}

function esTextoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

function esPayloadValido(payload: Partial<Payload>): payload is Payload {
  return (
    esTextoValido(payload.nombre) &&
    typeof payload.edad === "number" &&
    Number.isInteger(payload.edad) &&
    payload.edad > 0 &&
    esTextoValido(payload.sexo) &&
    esTextoValido(payload.pais_residencia) &&
    esTextoValido(payload.nacionalidad) &&
    esRespondentIdValido(payload.respondent_id) &&
    esTextoValido(payload.respuesta_1) &&
    esTextoValido(payload.respuesta_2) &&
    esTextoValido(payload.respuesta_3)
  );
}

function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esChile(valor: string): boolean {
  return normalizarTexto(valor) === TARGET_COUNTRY_LABEL;
}

function esResidenteEnChile(payload: Payload): boolean {
  return esChile(payload.pais_residencia);
}

function esTargetChile(payload: Payload): boolean {
  // Regla OR: chilenos en Chile, chilenos en el extranjero o migrantes en Chile.
  return esChile(payload.pais_residencia) || esChile(payload.nacionalidad);
}

function extraerIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) {
      return ip;
    }
  }

  const directIp =
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-client-ip") ??
    null;

  return directIp?.trim() || null;
}

function extraerIpCountryCode(request: Request): string | null {
  const countryCode =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("cloudfront-viewer-country") ??
    null;

  if (!countryCode) {
    return null;
  }

  return countryCode.trim().toUpperCase();
}

function esTablaBloqueosInexistente(errorMessage: string): boolean {
  const message = errorMessage.toLowerCase();
  return (
    message.includes("respuestas_bloqueadas") &&
    (message.includes("could not find") || message.includes("does not exist"))
  );
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = (await request.json()) as Partial<Payload>;

    if (!esPayloadValido(body)) {
      return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
    }

    if (body.edad < MIN_AGE) {
      return NextResponse.json({ error: "Esta encuesta es para mayores de 18 anos." }, { status: 403 });
    }

    if (!esTargetChile(body)) {
      return NextResponse.json(
        {
          error:
            "Encuesta disponible solo para: chilenos en Chile, chilenos en el extranjero o migrantes en Chile.",
        },
        { status: 403 }
      );
    }

    const ipCountryCode = extraerIpCountryCode(request);
    if (ipCountryCode && esResidenteEnChile(body) && ipCountryCode !== TARGET_COUNTRY_CODE) {
      return NextResponse.json(
        {
          error:
            "Por segmentacion geografica, quienes residen en Chile deben responder desde IP de Chile.",
        },
        { status: 403 }
      );
    }

    const { data: existingResponse, error: duplicateCheckError } = await supabase
      .from("respuestas")
      .select("respondent_id")
      .eq("respondent_id", body.respondent_id)
      .limit(1)
      .maybeSingle();

    if (duplicateCheckError) {
      if (duplicateCheckError.message.includes("respondent_id")) {
        return NextResponse.json(
          {
            error:
              "Falta la columna respondent_id en la tabla respuestas. Ejecuta sql/alter_respuestas_add_respondent_id_unique.sql.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: duplicateCheckError.message }, { status: 500 });
    }

    if (existingResponse) {
      return NextResponse.json(
        {
          error: "Ya registramos una respuesta desde este dispositivo.",
        },
        { status: 409 }
      );
    }

    const { data: existingBlocked, error: blockedCheckError } = await supabase
      .from("respuestas_bloqueadas")
      .select("respondent_id")
      .eq("respondent_id", body.respondent_id)
      .limit(1)
      .maybeSingle();

    if (blockedCheckError && !esTablaBloqueosInexistente(blockedCheckError.message)) {
      return NextResponse.json({ error: blockedCheckError.message }, { status: 500 });
    }

    if (existingBlocked) {
      return NextResponse.json(
        {
          error: "Ya registramos una respuesta desde este dispositivo.",
        },
        { status: 409 }
      );
    }

    const ipAddress = extraerIp(request);

    const payloadToInsert = {
      ...body,
      ip_address: ipAddress,
      ip_country: ipCountryCode,
    };

    const { error } = await supabase.from("respuestas").insert([payloadToInsert]);

    if (error) {
      const errorCode = (error as { code?: string }).code;

      if (errorCode === "23505" || error.message.toLowerCase().includes("duplicate key value")) {
        return NextResponse.json(
          {
            error: "Ya registramos una respuesta desde este dispositivo.",
          },
          { status: 409 }
        );
      }

      if (error.message.includes("pais_residencia") || error.message.includes("nacionalidad")) {
        return NextResponse.json(
          {
            error:
              "Faltan columnas en la tabla respuestas. Agrega pais_residencia y nacionalidad en Supabase para guardar estos datos.",
          },
          { status: 500 }
        );
      }

      if (error.message.includes("respondent_id")) {
        return NextResponse.json(
          {
            error:
              "Falta la columna respondent_id en la tabla respuestas. Ejecuta sql/alter_respuestas_add_respondent_id_unique.sql.",
          },
          { status: 500 }
        );
      }

      if (error.message.includes("ip_address") || error.message.includes("ip_country")) {
        const { error: fallbackError } = await supabase.from("respuestas").insert([body]);

        if (!fallbackError) {
          return NextResponse.json({ ok: true }, { status: 201 });
        }

        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Faltan variables de entorno de Supabase")) {
      return NextResponse.json({ error: "Configuracion de Supabase incompleta en el servidor." }, { status: 500 });
    }

    return NextResponse.json({ error: "No se pudo procesar la solicitud." }, { status: 400 });
  }
}
