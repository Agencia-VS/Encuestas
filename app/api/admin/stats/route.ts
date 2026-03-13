import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type RespuestaRow = {
  created_at: string | null;
  edad: number | null;
  sexo: string | null;
  respuesta_1: string | null;
  respuesta_2: string | null;
  respuesta_3: string | null;
};

type QuestionKey = "respuesta_1" | "respuesta_2" | "respuesta_3";

type QuestionConfig = {
  id: QuestionKey;
  title: string;
};

const QUESTION_CONFIG: QuestionConfig[] = [
  { id: "respuesta_1", title: "Que seleccion quieres que sea campeon del Mundo?" },
  { id: "respuesta_2", title: "Que jugador quieres que sea campeon del Mundo?" },
  { id: "respuesta_3", title: "Que seleccion crees que no cumplira las expectativas?" },
];

const AGE_BUCKETS = [
  { label: "<18", min: 0, max: 17 },
  { label: "18-24", min: 18, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45-54", min: 45, max: 54 },
  { label: "55+", min: 55, max: Number.POSITIVE_INFINITY },
] as const;

function parseAllowedEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function toTitleCase(raw: string): string {
  if (!raw) {
    return "No especifica";
  }

  return raw
    .toLowerCase()
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeAnswer(raw: string | null | undefined): string {
  if (!raw || raw.trim().length === 0) {
    return "No especifica";
  }

  const clean = raw.trim();
  const normalized = clean.replace(/:+$/, "").toLowerCase();

  if (normalized === "otro" || normalized === "otra") {
    return "Otro";
  }

  return clean;
}

function percentage(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Number(((count / total) * 100).toFixed(1));
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildTrendTemplate(days: number): Map<string, number> {
  const template = new Map<string, number>();
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const current = new Date(cursor);
    current.setDate(cursor.getDate() - i);
    template.set(dayKey(current), 0);
  }

  return template;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const allowedEmails = parseAllowedEmails(process.env.ADMIN_ALLOWED_EMAILS);

    const supabase = getSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sesion invalida o expirada." }, { status: 401 });
    }

    const email = authData.user.email?.toLowerCase() ?? "";
    // Optional allowlist: if ADMIN_ALLOWED_EMAILS is configured, enforce it.
    if (allowedEmails.size > 0 && !allowedEmails.has(email)) {
      return NextResponse.json({ error: "No tienes permisos para acceder al panel." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("respuestas")
      .select("created_at, edad, sexo, respuesta_1, respuesta_2, respuesta_3");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = ((data ?? []) as RespuestaRow[]).filter(Boolean);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);

    const trend = buildTrendTemplate(14);

    let totalToday = 0;
    let totalLast7Days = 0;

    const sexoMap = new Map<string, number>();
    const ageMap = new Map<string, number>();
    const questionMaps: Record<QuestionKey, Map<string, number>> = {
      respuesta_1: new Map<string, number>(),
      respuesta_2: new Map<string, number>(),
      respuesta_3: new Map<string, number>(),
    };

    const answeredCount: Record<QuestionKey, number> = {
      respuesta_1: 0,
      respuesta_2: 0,
      respuesta_3: 0,
    };

    for (const row of rows) {
      if (row.created_at) {
        const createdAt = new Date(row.created_at);
        if (!Number.isNaN(createdAt.getTime())) {
          if (createdAt >= todayStart) {
            totalToday += 1;
          }
          if (createdAt >= weekStart) {
            totalLast7Days += 1;
          }

          const key = dayKey(createdAt);
          if (trend.has(key)) {
            trend.set(key, (trend.get(key) ?? 0) + 1);
          }
        }
      }

      const sexo = toTitleCase((row.sexo ?? "").trim());
      sexoMap.set(sexo, (sexoMap.get(sexo) ?? 0) + 1);

      const ageValue = typeof row.edad === "number" ? row.edad : Number.NaN;
      if (Number.isInteger(ageValue) && ageValue >= 0) {
        const bucket = AGE_BUCKETS.find((item) => ageValue >= item.min && ageValue <= item.max);
        const label = bucket?.label ?? "No especifica";
        ageMap.set(label, (ageMap.get(label) ?? 0) + 1);
      } else {
        ageMap.set("No especifica", (ageMap.get("No especifica") ?? 0) + 1);
      }

      for (const question of QUESTION_CONFIG) {
        const answer = normalizeAnswer(row[question.id]);
        answeredCount[question.id] += 1;
        questionMaps[question.id].set(answer, (questionMaps[question.id].get(answer) ?? 0) + 1);
      }
    }

    const totalResponses = rows.length;

    const questions = QUESTION_CONFIG.map((question) => {
      const answers = Array.from(questionMaps[question.id].entries())
        .map(([option, count]) => ({
          option,
          count,
          percentage: percentage(count, answeredCount[question.id]),
        }))
        .sort((a, b) => b.count - a.count);

      return {
        id: question.id,
        title: question.title,
        totalAnswered: answeredCount[question.id],
        options: answers,
      };
    });

    const sexo = Array.from(sexoMap.entries())
      .map(([label, count]) => ({ label, count, percentage: percentage(count, totalResponses) }))
      .sort((a, b) => b.count - a.count);

    const edades = Array.from(ageMap.entries())
      .map(([label, count]) => ({ label, count, percentage: percentage(count, totalResponses) }))
      .sort((a, b) => b.count - a.count);

    const trend14d = Array.from(trend.entries()).map(([date, count]) => ({ date, count }));

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        overview: {
          totalResponses,
          totalToday,
          totalLast7Days,
          averageDaily7: Number((totalLast7Days / 7).toFixed(1)),
        },
        demographics: {
          sexo,
          edades,
        },
        questions,
        trend14d,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Faltan variables de entorno de Supabase")) {
      return NextResponse.json({ error: "Configuracion de Supabase incompleta en el servidor." }, { status: 500 });
    }

    return NextResponse.json({ error: "No se pudieron obtener las estadisticas." }, { status: 500 });
  }
}
