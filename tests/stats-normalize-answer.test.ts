import { describe, expect, it } from "vitest";
import { answerGroupKey, calculateActiveDaysInWindow, normalizeAnswer } from "@/app/api/admin/stats/route";

describe("normalizeAnswer", () => {
  it("normaliza la opcion Otro sin detalle", () => {
    expect(normalizeAnswer("Otro")).toBe("Otro");
    expect(normalizeAnswer("otra")).toBe("Otro");
    expect(normalizeAnswer("OTRO:")).toBe("Otro");
    expect(normalizeAnswer("Otros")).toBe("Otro");
    expect(normalizeAnswer("OTRAS:")).toBe("Otro");
  });

  it("normaliza variantes de Otro con detalle para agruparlas", () => {
    expect(normalizeAnswer("Otro peru")).toBe("Otro: Peru");
    expect(normalizeAnswer("Otro: PERU")).toBe("Otro: Peru");
    expect(normalizeAnswer("otra:   puerto   rico  ")).toBe("Otro: Puerto Rico");
    expect(normalizeAnswer("Otros:CHILE")).toBe("Otro: Chile");
    expect(normalizeAnswer("otras chile")).toBe("Otro: Chile");
  });

  it("mantiene respuestas normales sin alterar su valor semantico", () => {
    expect(normalizeAnswer(" Messi ")).toBe("Messi");
    expect(normalizeAnswer("cr7")).toBe("CR7");
    expect(normalizeAnswer("CR7")).toBe("CR7");
    expect(normalizeAnswer("Mbappé")).toBe("Mbappé");
    expect(normalizeAnswer(null)).toBe("No especifica");
  });

  it("agrupa respuestas sin distinguir tildes, mayusculas ni espaciado", () => {
    const alexisSinTilde = normalizeAnswer("  ALexis   Sanchez ");
    const alexisConTilde = normalizeAnswer("alexis sánchéz");

    expect(answerGroupKey(alexisSinTilde)).toBe(answerGroupKey(alexisConTilde));
    expect(answerGroupKey(normalizeAnswer("Otros: CHILE"))).toBe(answerGroupKey(normalizeAnswer("otras: chile")));
  });
});

describe("calculateActiveDaysInWindow", () => {
  const todayStart = new Date("2026-03-19T00:00:00.000Z");
  const weekStart = new Date("2026-03-13T00:00:00.000Z");

  it("usa 7 dias cuando la encuesta comenzo antes de la ventana", () => {
    const surveyStart = new Date("2026-03-01T00:00:00.000Z");
    expect(calculateActiveDaysInWindow(todayStart, weekStart, surveyStart)).toBe(7);
  });

  it("usa solo dias activos cuando la encuesta comenzo dentro de la ventana", () => {
    const surveyStart = new Date("2026-03-18T00:00:00.000Z");
    expect(calculateActiveDaysInWindow(todayStart, weekStart, surveyStart)).toBe(2);
  });

  it("retorna 0 cuando la fecha de inicio es futura", () => {
    const surveyStart = new Date("2026-03-20T00:00:00.000Z");
    expect(calculateActiveDaysInWindow(todayStart, weekStart, surveyStart)).toBe(0);
  });
});
