export type OpcionPregunta = string | { value: string; label: string };

export type CampoRespuesta = "respuesta_1" | "respuesta_2" | "respuesta_3";

export type PreguntaEncuesta = {
  campo: CampoRespuesta;
  texto: string;
  opciones: OpcionPregunta[];
};

export const OTHER_OPTION = "Otro";

export const PREGUNTAS: PreguntaEncuesta[] = [
  {
    campo: "respuesta_1",
    texto: "¿Qué selección quieres que sea campeón del mundo?",
    opciones: ["Argentina", "Brasil", "España", "Francia", "Portugal", "Inglaterra", "Alemania", "Otro"],
  },
  {
    campo: "respuesta_2",
    texto: "¿Qué jugador quieres que sea campeón del mundo?",
    opciones: [
      { value: "Messi", label: "Lionel Messi" },
      { value: "CR7", label: "Cristiano Ronaldo" },
      { value: "Mbappé", label: "Kylian Mbappé" },
      { value: "Neymar", label: "Neymar Jr." },
      { value: "Lamine Yamal", label: "Lamine Yamal" },
      { value: "Valverde", label: "Federico Valverde" },
      { value: "Erling Haaland", label: "Erling Haaland" },
      "Otro",
    ],
  },
  {
    campo: "respuesta_3",
    texto: "¿Qué selección crees que no cumplirá las expectativas?",
    opciones: ["Argentina", "Brasil", "España", "Francia", "Portugal", "Uruguay", "Inglaterra", "Otro"],
  },
];
