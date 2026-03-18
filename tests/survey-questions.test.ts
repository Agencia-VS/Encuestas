import { describe, expect, it } from "vitest";
import { OTHER_OPTION, PREGUNTAS } from "@/lib/survey/questions";

function getOptionValue(option: string | { value: string; label: string }): string {
  return typeof option === "string" ? option : option.value;
}

function getOptionLabel(option: string | { value: string; label: string }): string {
  return typeof option === "string" ? option : option.label;
}

describe("PREGUNTAS configuracion", () => {
  it("mantiene valores canonicos para la pregunta de jugadores", () => {
    const preguntaJugadores = PREGUNTAS.find((pregunta) => pregunta.campo === "respuesta_2");

    expect(preguntaJugadores).toBeDefined();
    expect(preguntaJugadores?.opciones.map(getOptionValue)).toEqual([
      "Messi",
      "CR7",
      "Mbappé",
      "Neymar",
      "Lamine Yamal",
      "Valverde",
      "Erling Haaland",
      "Otro",
    ]);
  });

  it("muestra etiquetas formales para la pregunta de jugadores", () => {
    const preguntaJugadores = PREGUNTAS.find((pregunta) => pregunta.campo === "respuesta_2");

    expect(preguntaJugadores).toBeDefined();
    expect(preguntaJugadores?.opciones.map(getOptionLabel)).toEqual([
      "Lionel Messi",
      "Cristiano Ronaldo",
      "Kylian Mbappé",
      "Neymar Jr.",
      "Lamine Yamal",
      "Federico Valverde",
      "Erling Haaland",
      OTHER_OPTION,
    ]);
  });
});
