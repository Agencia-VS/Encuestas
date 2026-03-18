import { describe, expect, it } from "vitest";
import { answerGroupKey, normalizeAnswer } from "@/app/api/admin/stats/route";

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
