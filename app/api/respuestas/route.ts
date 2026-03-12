import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type Payload = {
  nombre: string;
  edad: number;
  sexo: string;
  respuesta_1: string;
  respuesta_2: string;
  respuesta_3: string;
};

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
    esTextoValido(payload.respuesta_1) &&
    esTextoValido(payload.respuesta_2) &&
    esTextoValido(payload.respuesta_3)
  );
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = (await request.json()) as Partial<Payload>;

    if (!esPayloadValido(body)) {
      return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
    }

    const { error } = await supabase.from("respuestas").insert([body]);

    if (error) {
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
