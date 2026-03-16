import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type MotivoBloqueo = "menor_edad" | "fuera_target";

type PayloadBloqueo = {
  nombre: string;
  edad: number;
  sexo: string;
  pais_residencia: string;
  nacionalidad: string;
  respondent_id: string;
  motivo_bloqueo: MotivoBloqueo;
};

const MOTIVOS_PERMITIDOS: MotivoBloqueo[] = ["menor_edad", "fuera_target"];

function esTextoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

function esRespondentIdValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length >= 12;
}

function esMotivoValido(valor: unknown): valor is MotivoBloqueo {
  return typeof valor === "string" && MOTIVOS_PERMITIDOS.includes(valor as MotivoBloqueo);
}

function esPayloadValido(payload: Partial<PayloadBloqueo>): payload is PayloadBloqueo {
  return (
    esTextoValido(payload.nombre) &&
    typeof payload.edad === "number" &&
    Number.isInteger(payload.edad) &&
    payload.edad > 0 &&
    esTextoValido(payload.sexo) &&
    esTextoValido(payload.pais_residencia) &&
    esTextoValido(payload.nacionalidad) &&
    esRespondentIdValido(payload.respondent_id) &&
    esMotivoValido(payload.motivo_bloqueo)
  );
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
    const body = (await request.json()) as Partial<PayloadBloqueo>;

    if (!esPayloadValido(body)) {
      return NextResponse.json({ error: "Datos invalidos para registrar bloqueo." }, { status: 400 });
    }

    const { data: existingResponse, error: existingResponseError } = await supabase
      .from("respuestas")
      .select("respondent_id")
      .eq("respondent_id", body.respondent_id)
      .limit(1)
      .maybeSingle();

    if (existingResponseError) {
      return NextResponse.json({ error: existingResponseError.message }, { status: 500 });
    }

    if (existingResponse) {
      return NextResponse.json({ ok: true, alreadyRecorded: true }, { status: 200 });
    }

    const { data: existingBlocked, error: existingBlockedError } = await supabase
      .from("respuestas_bloqueadas")
      .select("respondent_id")
      .eq("respondent_id", body.respondent_id)
      .limit(1)
      .maybeSingle();

    if (existingBlockedError) {
      if (esTablaBloqueosInexistente(existingBlockedError.message)) {
        return NextResponse.json(
          {
            error:
              "Falta la tabla respuestas_bloqueadas. Ejecuta sql/create_respuestas_bloqueadas.sql para habilitar el bloqueo persistente.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: existingBlockedError.message }, { status: 500 });
    }

    if (existingBlocked) {
      return NextResponse.json({ ok: true, alreadyRecorded: true }, { status: 200 });
    }

    const payloadToInsert = {
      nombre: body.nombre,
      edad: body.edad,
      sexo: body.sexo,
      pais_residencia: body.pais_residencia,
      nacionalidad: body.nacionalidad,
      respondent_id: body.respondent_id,
      motivo_bloqueo: body.motivo_bloqueo,
      ip_address: extraerIp(request),
      ip_country: extraerIpCountryCode(request),
    };

    const { error } = await supabase.from("respuestas_bloqueadas").insert([payloadToInsert]);

    if (error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === "23505" || error.message.toLowerCase().includes("duplicate key value")) {
        return NextResponse.json({ ok: true, alreadyRecorded: true }, { status: 200 });
      }

      if (esTablaBloqueosInexistente(error.message)) {
        return NextResponse.json(
          {
            error:
              "Falta la tabla respuestas_bloqueadas. Ejecuta sql/create_respuestas_bloqueadas.sql para habilitar el bloqueo persistente.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Faltan variables de entorno de Supabase")) {
      return NextResponse.json({ error: "Configuracion de Supabase incompleta en el servidor." }, { status: 500 });
    }

    return NextResponse.json({ error: "No se pudo registrar el bloqueo." }, { status: 400 });
  }
}
