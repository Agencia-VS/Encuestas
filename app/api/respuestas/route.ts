import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type Payload = {
  nombre: string;
  edad: number;
  sexo: string;
  pais_residencia: string;
  nacionalidad: string;
  respuesta_1: string;
  respuesta_2: string;
  respuesta_3: string;
};

const TARGET_COUNTRY_LABEL = "chile";
const TARGET_COUNTRY_CODE = "CL";

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

function esTargetChile(payload: Payload): boolean {
  return (
    normalizarTexto(payload.pais_residencia) === TARGET_COUNTRY_LABEL &&
    normalizarTexto(payload.nacionalidad) === TARGET_COUNTRY_LABEL
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

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = (await request.json()) as Partial<Payload>;

    if (!esPayloadValido(body)) {
      return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
    }

    if (!esTargetChile(body)) {
      return NextResponse.json(
        {
          error:
            "Encuesta disponible solo para personas chilenas residentes en Chile.",
        },
        { status: 403 }
      );
    }

    const ipCountryCode = extraerIpCountryCode(request);
    if (ipCountryCode && ipCountryCode !== TARGET_COUNTRY_CODE) {
      return NextResponse.json(
        {
          error:
            "Por segmentacion geografica, esta encuesta solo esta habilitada para IPs de Chile.",
        },
        { status: 403 }
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
      if (error.message.includes("pais_residencia") || error.message.includes("nacionalidad")) {
        return NextResponse.json(
          {
            error:
              "Faltan columnas en la tabla respuestas. Agrega pais_residencia y nacionalidad en Supabase para guardar estos datos.",
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
