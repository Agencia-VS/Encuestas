import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getSupabaseTables } from "@/lib/supabaseTables";

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
  { id: "respuesta_1", title: "¿Qué selección quieres que sea campeón del mundo?" },
  { id: "respuesta_2", title: "¿Qué jugador quieres que sea campeón del mundo?" },
  { id: "respuesta_3", title: "¿Qué selección crees que no cumplirá las expectativas?" },
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

function stripDiacritics(raw: string): string {
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toCanonicalLabel(raw: string): string {
  if (!raw) {
    return "No especifica";
  }

  return raw
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => {
      if (/^[a-z]{1,6}\d+$/i.test(part) || /^\d+[a-z]+$/i.test(part)) {
        return part.toUpperCase();
      }

      if (/^[A-Z0-9]{2,3}$/.test(part)) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export function answerGroupKey(raw: string): string {
  return stripDiacritics(raw)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*/g, ":")
    .replace(/:+$/, "")
    .toLowerCase();
}

export function normalizeAnswer(raw: string | null | undefined): string {
  if (!raw || raw.trim().length === 0) {
    return "No especifica";
  }

  const clean = raw.trim().replace(/\s+/g, " ");
  const cleanNoTrailingColons = clean.replace(/:+$/, "");
  const normalized = answerGroupKey(cleanNoTrailingColons);

  if (normalized === "otro" || normalized === "otra" || normalized === "otros" || normalized === "otras") {
    return "Otro";
  }

  const otherWithDetailMatch = cleanNoTrailingColons.match(/^otr[ao]s?\b\s*:?\s*(.+)$/i);
  if (otherWithDetailMatch) {
    const detail = otherWithDetailMatch[1].trim();

    if (detail.length === 0) {
      return "Otro";
    }

    return `Otro: ${toCanonicalLabel(detail)}`;
  }

  return toCanonicalLabel(cleanNoTrailingColons);
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function parseSurveyStartDate(raw: string | undefined): Date | null {
  if (!raw) {
    return null;
  }

  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const parsed = new Date(year, month - 1, day);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return startOfDay(parsed);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

export function calculateActiveDaysInWindow(todayStart: Date, windowStart: Date, surveyStart: Date | null): number {
  const effectiveStart = surveyStart && surveyStart > windowStart ? surveyStart : windowStart;

  if (effectiveStart > todayStart) {
    return 0;
  }

  return Math.floor((todayStart.getTime() - effectiveStart.getTime()) / MS_PER_DAY) + 1;
}

function buildTrendTemplate(startDate: Date, endDate: Date): Map<string, number> {
  const template = new Map<string, number>();
  const cursor = startOfDay(startDate);
  const lastDay = startOfDay(endDate);

  if (cursor > lastDay) {
    return template;
  }

  while (cursor <= lastDay) {
    template.set(dayKey(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
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
    const tables = getSupabaseTables();

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
      .from(tables.respuestas)
      .select("created_at, edad, sexo, respuesta_1, respuesta_2, respuesta_3");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = ((data ?? []) as RespuestaRow[]).filter(Boolean);

    const todayStart = startOfDay(new Date());

    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);

    const trendWindowStart = new Date(todayStart);
    trendWindowStart.setDate(todayStart.getDate() - 13);

    const configuredSurveyStart = parseSurveyStartDate(process.env.SURVEY_START_DATE);

    let totalToday = 0;
    let totalLast7Days = 0;
    let firstResponseDay: Date | null = null;
    const trendCountByDay = new Map<string, number>();

    const sexoMap = new Map<string, number>();
    const ageMap = new Map<string, number>();
    const questionMaps: Record<QuestionKey, Map<string, { option: string; count: number }>> = {
      respuesta_1: new Map<string, { option: string; count: number }>(),
      respuesta_2: new Map<string, { option: string; count: number }>(),
      respuesta_3: new Map<string, { option: string; count: number }>(),
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
          const createdAtDay = startOfDay(createdAt);

          if (!firstResponseDay || createdAtDay < firstResponseDay) {
            firstResponseDay = createdAtDay;
          }

          if (createdAt >= todayStart) {
            totalToday += 1;
          }
          if (createdAt >= weekStart) {
            totalLast7Days += 1;
          }

          const key = dayKey(createdAt);
          trendCountByDay.set(key, (trendCountByDay.get(key) ?? 0) + 1);
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
        const key = answerGroupKey(answer);
        answeredCount[question.id] += 1;

        const existing = questionMaps[question.id].get(key);
        if (existing) {
          existing.count += 1;
        } else {
          questionMaps[question.id].set(key, { option: answer, count: 1 });
        }
      }
    }

    const surveyStart = configuredSurveyStart ?? firstResponseDay;
    const activeDaysForAverage = surveyStart
      ? calculateActiveDaysInWindow(todayStart, weekStart, surveyStart)
      : 7;

    const averageDaily7 = activeDaysForAverage > 0
      ? Number((totalLast7Days / activeDaysForAverage).toFixed(1))
      : 0;

    const trendStart = surveyStart && surveyStart > trendWindowStart ? surveyStart : trendWindowStart;
    const trend = buildTrendTemplate(trendStart, todayStart);

    for (const [key, count] of trendCountByDay.entries()) {
      if (trend.has(key)) {
        trend.set(key, count);
      }
    }

    const totalResponses = rows.length;

    const questions = QUESTION_CONFIG.map((question) => {
      const answers = Array.from(questionMaps[question.id].values())
        .map((value) => ({
          option: value.option,
          count: value.count,
          percentage: percentage(value.count, answeredCount[question.id]),
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
          activeDaysForAverage,
          averageDaily7,
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
