"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { CORPORATE_COLORS } from "@/lib/colors";
import { BRAND_TOKENS, getAgencyFarewellLogoUrl, getAgencyLogoUrl } from "@/lib/branding";

const PREGUNTAS = [
  {
    campo: "respuesta_1" as const,
    texto: "¿Qué selección quieres que sea campeón del mundo?",
    opciones: ["Argentina", "Brasil", "España", "Francia", "Portugal", "Inglaterra", "Alemania", "Otro"],
  },
  {
    campo: "respuesta_2" as const,
    texto: "¿Qué jugador quieres que sea campeón del mundo?",
    opciones: ["Messi", "CR7", "Mbappé", "Neymar", "Lamine Yamal", "Valverde", "Erling Haaland", "Otro"],
  },
  {
    campo: "respuesta_3" as const,
    texto: "¿Qué selección crees que no cumplirá las expectativas?",
    opciones: ["Argentina", "Brasil", "España", "Francia", "Portugal", "Uruguay", "Inglaterra", "Otro"],
  },
];

type Direccion = "forward" | "back";
type DatosPersonales = {
  nombre: string;
  edad: string;
  sexo: string;
  paisResidencia: string;
  nacionalidad: string;
};
type Respuestas = { respuesta_1: string; respuesta_2: string; respuesta_3: string };

type SurveyFormProps = {
  onBackToLanding?: () => void;
};

const TOTAL = 1 + PREGUNTAS.length;
const FORM_LOGO_URL = getAgencyLogoUrl();
const FAREWELL_LOGO_URL = getAgencyFarewellLogoUrl();
const OTHER_OPTION = "Otro";
const TARGET_COUNTRY_LABEL = "Chile";
const MIN_AGE = 18;
const RESPONDENT_ID_STORAGE_KEY = "agenciavs_encuesta_respondent_id";
const RESPONDIO_STORAGE_KEY = "agenciavs_encuesta_respondio";
const TARGET_BLOCK_MESSAGE = "lamentablemente estamos enfocados a chilenos y gente que reside en Chile.";
const AGE_BLOCK_MESSAGE = "esta encuesta es para mayores de 18 años.";
const DUPLICATE_BLOCK_MESSAGE = "ya registramos una respuesta desde este dispositivo.";

const SEXO_OPTS = [
  { label: "Masculino", valor: "masculino" },
  { label: "Femenino", valor: "femenino" },
  { label: "Prefiero N/D", valor: "prefiero_no_decir" },
];

const PAISES_OPTS = [
  "Argentina",
  "Bolivia",
  "Brasil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Ecuador",
  "El Salvador",
  "España",
  "Estados Unidos",
  "Francia",
  "Guatemala",
  "Honduras",
  "Inglaterra",
  "Italia",
  "México",
  "Nicaragua",
  "Panamá",
  "Paraguay",
  "Perú",
  "Portugal",
  "República Dominicana",
  "Uruguay",
  "Venezuela",
  "Alemania",
  "Canadá",
  "Australia",
  "Nueva Zelanda",
  "Japón",
  "Corea del Sur",
  "China",
  "India",
  "Marruecos",
  "Senegal",
  "Sudáfrica",
];

const COLOR = {
  principal: BRAND_TOKENS.primary,
  principalHover: BRAND_TOKENS.secondary,
  acentoSuave: CORPORATE_COLORS.accentLight,
  fondo: CORPORATE_COLORS.grisClaro,
  panel: "#FFFFFF",
  panelFuerte: "#FBF8FF",
  borde: "#E2D5F1",
  bordeSuave: "#EDE3F7",
  texto: CORPORATE_COLORS.negroSuave,
  textoSecundario: "#5A5A5A",
  textoSuave: "#7B7B7B",
  blanco: CORPORATE_COLORS.blanco,
};

const variantsStep = {
  enter: (dir: Direccion) => ({ opacity: 0, x: dir === "forward" ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: Direccion) => ({ opacity: 0, x: dir === "forward" ? -18 : 18 }),
};

const FONDO_FORM =
  "radial-gradient(75% 55% at 5% 0%, rgba(164,40,121,0.08), transparent 70%), radial-gradient(55% 45% at 100% 0%, rgba(56,41,96,0.12), transparent 72%), linear-gradient(180deg, #f8f5fc 0%, #f2ecfa 100%)";

export function SurveyForm({ onBackToLanding }: SurveyFormProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<Direccion>("forward");
  const [mostrarRechazoTarget, setMostrarRechazoTarget] = useState(false);
  const [datos, setDatos] = useState<DatosPersonales>({
    nombre: "",
    edad: "",
    sexo: "",
    paisResidencia: "",
    nacionalidad: "",
  });
  const [respuestas, setRespuestas] = useState<Respuestas>({
    respuesta_1: "",
    respuesta_2: "",
    respuesta_3: "",
  });
  const [otrosRespuestas, setOtrosRespuestas] = useState<Respuestas>({
    respuesta_1: "",
    respuesta_2: "",
    respuesta_3: "",
  });
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeRechazo, setMensajeRechazo] = useState("");
  const [respondentId, setRespondentId] = useState("");
  const [yaRespondioEsteDispositivo, setYaRespondioEsteDispositivo] = useState(false);

  useEffect(() => {
    // Warm the cache so the farewell screen logo appears instantly after submit.
    const img = new window.Image();
    img.src = FAREWELL_LOGO_URL;
  }, []);

  useEffect(() => {
    try {
      const storedRespondentId = window.localStorage.getItem(RESPONDENT_ID_STORAGE_KEY);

      if (storedRespondentId) {
        setRespondentId(storedRespondentId);
      } else {
        const generatedId =
          typeof window.crypto !== "undefined" && "randomUUID" in window.crypto
            ? window.crypto.randomUUID()
            : `rid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        window.localStorage.setItem(RESPONDENT_ID_STORAGE_KEY, generatedId);
        setRespondentId(generatedId);
      }

      setYaRespondioEsteDispositivo(window.localStorage.getItem(RESPONDIO_STORAGE_KEY) === "1");
    } catch {
      // localStorage can be unavailable in some privacy contexts.
    }
  }, []);

  const progreso = useMemo(() => ((step + 1) / TOTAL) * 100, [step]);

  const ir = (siguiente: number, dir: Direccion) => {
    setDirection(dir);
    setStep(siguiente);
  };

  const actualizarDato = (campo: keyof DatosPersonales, valor: string) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
  };

  const actualizarRespuesta = (campo: keyof Respuestas, valor: string) => {
    setRespuestas((actual) => ({ ...actual, [campo]: valor }));

    if (valor !== OTHER_OPTION) {
      setOtrosRespuestas((actual) => ({ ...actual, [campo]: "" }));
    }
  };

  const resolverValorConOtro = (seleccion: string, detalle: string) => {
    if (seleccion !== OTHER_OPTION) {
      return seleccion;
    }

    return `Otro: ${detalle.trim()}`;
  };

  const cumpleTargetChile =
    datos.paisResidencia === TARGET_COUNTRY_LABEL || datos.nacionalidad === TARGET_COUNTRY_LABEL;
  const edadNumero = Number.parseInt(datos.edad, 10);
  const cumpleEdadMinima = Number.isInteger(edadNumero) && edadNumero >= MIN_AGE;

  const construirMensajeRechazo = (detalle: string) => {
    const nombreEncuestado = datos.nombre.trim() || "encuestado";
    return `Hola, ${nombreEncuestado}, ${detalle} Muchas gracias por tu tiempo.`;
  };

  const mostrarPasoNegacion = (detalle: string) => {
    setMostrarRechazoTarget(true);
    setMensajeRechazo(construirMensajeRechazo(detalle));
    setError("");
    setDirection("forward");
    setStep(1);
  };

  const continuarDesdeDatos = () => {
    if (yaRespondioEsteDispositivo) {
      mostrarPasoNegacion(DUPLICATE_BLOCK_MESSAGE);
      return;
    }

    if (!cumpleEdadMinima) {
      mostrarPasoNegacion(AGE_BLOCK_MESSAGE);
      return;
    }

    if (cumpleTargetChile) {
      setMostrarRechazoTarget(false);
      setMensajeRechazo("");
      setError("");
      ir(1, "forward");
      return;
    }

    mostrarPasoNegacion(TARGET_BLOCK_MESSAGE);
  };

  const volverPasoAnterior = () => {
    const pasoPrevio = step - 1;
    if (pasoPrevio <= 0) {
      setMostrarRechazoTarget(false);
    }
    ir(pasoPrevio, "back");
  };

  const enviar = async () => {
    if (yaRespondioEsteDispositivo) {
      mostrarPasoNegacion(DUPLICATE_BLOCK_MESSAGE);
      return;
    }

    if (!cumpleEdadMinima) {
      mostrarPasoNegacion(AGE_BLOCK_MESSAGE);
      return;
    }

    if (!respondentId) {
      setError("No se pudo validar este dispositivo. Recarga la página e intenta nuevamente.");
      return;
    }

    if (!cumpleTargetChile) {
      mostrarPasoNegacion(TARGET_BLOCK_MESSAGE);
      return;
    }

    setCargando(true);
    setError("");

    try {
      const payload = {
        nombre: datos.nombre,
        edad: edadNumero,
        sexo: datos.sexo,
        pais_residencia: datos.paisResidencia,
        nacionalidad: datos.nacionalidad,
        respondent_id: respondentId,
        respuesta_1: resolverValorConOtro(respuestas.respuesta_1, otrosRespuestas.respuesta_1),
        respuesta_2: resolverValorConOtro(respuestas.respuesta_2, otrosRespuestas.respuesta_2),
        respuesta_3: resolverValorConOtro(respuestas.respuesta_3, otrosRespuestas.respuesta_3),
      };

      const response = await fetch("/api/respuestas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        const backendMessage = data?.error ?? "Hubo un error al enviar. Intenta de nuevo.";

        if (response.status === 403) {
          if (backendMessage.toLowerCase().includes("mayores de 18") || backendMessage.toLowerCase().includes("edad minima")) {
            mostrarPasoNegacion(AGE_BLOCK_MESSAGE);
            return;
          }

          mostrarPasoNegacion(TARGET_BLOCK_MESSAGE);
          return;
        }

        if (response.status === 409) {
          setYaRespondioEsteDispositivo(true);
          mostrarPasoNegacion(DUPLICATE_BLOCK_MESSAGE);
          return;
        }

        if (response.status === 400 && backendMessage.toLowerCase().includes("edad minima")) {
          mostrarPasoNegacion(AGE_BLOCK_MESSAGE);
          return;
        }

        throw new Error(backendMessage);
      }

      try {
        window.localStorage.setItem(RESPONDIO_STORAGE_KEY, "1");
      } catch {
        // Best-effort local duplicate guard.
      }

      setYaRespondioEsteDispositivo(true);
      setEnviado(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Hubo un error al enviar. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  };

  if (enviado) {
    return (
      <div
        className="min-h-screen px-4 py-6 sm:py-8 flex flex-col"
        style={{
          background: FONDO_FORM,
        }}
      >
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-sm rounded-2xl border px-6 py-8"
            style={{ borderColor: COLOR.borde, background: COLOR.panel, boxShadow: "0 16px 40px rgba(56,41,96,0.12)" }}
          >
            <div className="mb-5 flex justify-center">
              <div className="relative h-10 w-36 sm:h-11 sm:w-40">
                <Image
                  src={FAREWELL_LOGO_URL}
                  alt="Logo Agencia VS"
                  fill
                  sizes="160px"
                  className="object-contain"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>

            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "linear-gradient(120deg, rgba(164,40,121,0.12), rgba(56,41,96,0.14))" }}
            >
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke={COLOR.principal} strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: COLOR.texto }}>
              Gracias, {datos.nombre}
            </h2>
            <p className="text-sm sm:text-base" style={{ color: COLOR.textoSecundario }}>
              Tu respuesta fue registrada con exito.
            </p>

            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="mt-6 min-h-11 rounded-xl px-5 text-sm font-semibold transition-colors"
                style={{ background: COLOR.principal, color: COLOR.blanco }}
              >
                Volver al inicio
              </button>
            )}
          </motion.div>
        </div>

        <FooterMinimal />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-3 sm:px-5 py-3 sm:py-6 md:py-8"
      style={{
        background: FONDO_FORM,
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <section
          className="rounded-2xl sm:rounded-3xl overflow-hidden border"
          style={{ borderColor: COLOR.borde, background: COLOR.panel, boxShadow: "0 18px 44px rgba(56,41,96,0.11)" }}
        >
          <div
            style={{
              height: 4,
              background: `linear-gradient(90deg, ${COLOR.principalHover}, ${COLOR.principal})`,
            }}
          />

          <div className="p-4 sm:p-6 md:p-8">
            <header className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Image
                    src={FORM_LOGO_URL}
                    alt="Logo Agencia VS"
                    width={220}
                    height={72}
                    sizes="(min-width: 640px) 120px, 96px"
                    className="h-8 sm:h-10 w-auto shrink-0"
                    priority
                  />
                  <h1 className="text-base sm:text-xl font-bold leading-tight" style={{ color: COLOR.texto }}>
                    Encuesta Mundial
                  </h1>
                </div>
              </div>

              {onBackToLanding && (
                <button
                  type="button"
                  onClick={onBackToLanding}
                  className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                  style={{ borderColor: COLOR.borde, color: COLOR.textoSecundario, background: COLOR.panelFuerte }}
                >
                  Inicio
                </button>
              )}
            </header>

            <div className="mt-4">
              <div className="flex items-center justify-end mb-2.5">
                <span className="text-xs font-semibold tracking-wide" style={{ color: COLOR.textoSuave }}>
                  {step + 1} de {TOTAL}
                </span>
              </div>

              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "#E8DCF5" }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${progreso}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: COLOR.principal }}
                />
              </div>
            </div>

            <div className="mt-5 sm:mt-6">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={variantsStep}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 0 && (
                    <StepDatos
                      datos={datos}
                      onDatoChange={actualizarDato}
                      onNext={continuarDesdeDatos}
                    />
                  )}

                  {step === 1 && mostrarRechazoTarget && <StepRechazoTarget mensaje={mensajeRechazo} />}

                  {step >= 1 && step <= PREGUNTAS.length && !mostrarRechazoTarget && (
                    <StepPregunta
                      numero={step}
                      total={PREGUNTAS.length}
                      pregunta={PREGUNTAS[step - 1]}
                      valor={respuestas[PREGUNTAS[step - 1].campo]}
                      valorOtro={otrosRespuestas[PREGUNTAS[step - 1].campo]}
                      onChange={(valor) => actualizarRespuesta(PREGUNTAS[step - 1].campo, valor)}
                      onChangeOtro={(valor) => {
                        setOtrosRespuestas((actual) => ({ ...actual, [PREGUNTAS[step - 1].campo]: valor }));
                      }}
                      onNext={step < PREGUNTAS.length ? () => ir(step + 1, "forward") : enviar}
                      onBack={volverPasoAnterior}
                      cargando={cargando}
                      esUltima={step === PREGUNTAS.length}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {error && <p className="mt-4 text-sm text-center text-red-700">{error}</p>}
          </div>
        </section>

        <FooterMinimal />
      </div>
    </div>
  );
}

function FooterMinimal() {
  return (
    <footer className="pt-4 pb-1 text-center">
      <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.08em]" style={{ color: "rgba(37,38,38,0.52)" }}>
        © Agencia VS
      </p>
    </footer>
  );
}

function StepDatos({
  datos,
  onDatoChange,
  onNext,
}: {
  datos: DatosPersonales;
  onDatoChange: (campo: keyof DatosPersonales, valor: string) => void;
  onNext: () => void;
}) {
  const edadNumero = Number.parseInt(datos.edad, 10);
  const edadValida = Number.isInteger(edadNumero) && edadNumero > 0;

  const valido =
    datos.nombre.trim() !== "" &&
    datos.edad !== "" &&
    edadValida &&
    datos.sexo !== "" &&
    PAISES_OPTS.includes(datos.paisResidencia) &&
    PAISES_OPTS.includes(datos.nacionalidad);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base sm:text-lg font-bold leading-snug" style={{ color: COLOR.texto }}>
          Antes de empezar
        </h2>
        <p className="mt-1 text-sm" style={{ color: COLOR.textoSecundario }}>
          Completa nombre, edad, sexo, pais de residencia y nacionalidad.
        </p>
        <p className="mt-1 text-xs" style={{ color: COLOR.textoSuave }}>
          Esta encuesta esta dirigida a: chilenos en Chile, chilenos en el extranjero o migrantes en Chile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3">
        <Campo label="Nombre" className="md:col-span-8">
          <input
            type="text"
            placeholder="Tu nombre"
            value={datos.nombre}
            autoComplete="name"
            onChange={(e) => onDatoChange("nombre", e.target.value)}
            className="w-full min-h-12 rounded-xl px-3.5 py-2.5 text-sm border outline-none transition-colors duration-300 placeholder:text-zinc-400 focus-visible:border-[#A42879]"
            style={{ background: COLOR.blanco, borderColor: COLOR.bordeSuave, color: COLOR.texto }}
          />
        </Campo>

        <Campo label="Edad" className="md:col-span-4">
          <input
            type="number"
            placeholder="Tu edad"
            min={1}
            max={120}
            value={datos.edad}
            onChange={(e) => onDatoChange("edad", e.target.value)}
            className="w-full min-h-12 rounded-xl px-3.5 py-2.5 text-sm border outline-none transition-colors duration-300 placeholder:text-zinc-400 focus-visible:border-[#A42879]"
            style={{ background: COLOR.blanco, borderColor: COLOR.bordeSuave, color: COLOR.texto }}
          />
        </Campo>

        <Campo label="Pais de residencia" className="md:col-span-6">
          <select
            value={datos.paisResidencia}
            onChange={(e) => onDatoChange("paisResidencia", e.target.value)}
            className="w-full min-h-12 rounded-xl px-3.5 py-2.5 text-sm border outline-none transition-colors duration-300 focus-visible:border-[#A42879]"
            style={{ background: COLOR.blanco, borderColor: COLOR.bordeSuave, color: COLOR.texto }}
          >
            <option value="">Selecciona una opcion</option>
            {PAISES_OPTS.map((pais) => (
              <option key={pais} value={pais}>
                {pais}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Nacionalidad" className="md:col-span-6">
          <select
            value={datos.nacionalidad}
            onChange={(e) => onDatoChange("nacionalidad", e.target.value)}
            className="w-full min-h-12 rounded-xl px-3.5 py-2.5 text-sm border outline-none transition-colors duration-300 focus-visible:border-[#A42879]"
            style={{ background: COLOR.blanco, borderColor: COLOR.bordeSuave, color: COLOR.texto }}
          >
            <option value="">Selecciona una opcion</option>
            {PAISES_OPTS.map((pais) => (
              <option key={pais} value={pais}>
                {pais}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Sexo" className="md:col-span-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SEXO_OPTS.map((item) => {
              const seleccionado = datos.sexo === item.valor;

              return (
                <button
                  key={item.valor}
                  type="button"
                  onClick={() => onDatoChange("sexo", item.valor)}
                  className="min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold text-left sm:text-center transition-all duration-300 active:scale-[0.985]"
                  style={
                    seleccionado
                      ? { background: COLOR.principal, borderColor: COLOR.principal, color: COLOR.blanco }
                      : { background: COLOR.panelFuerte, borderColor: COLOR.bordeSuave, color: COLOR.textoSecundario }
                  }
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </Campo>

      </div>
      <BtnPrimario onClick={onNext} disabled={!valido}>
        Continuar
      </BtnPrimario>
    </div>
  );
}

function StepRechazoTarget({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div
        className="rounded-2xl border px-4 py-5 sm:px-5"
        style={{ borderColor: "#F2C6C6", background: "#FFF7F7" }}
      >
        <p className="text-base sm:text-lg font-bold leading-relaxed" style={{ color: "#A8200D" }}>
          {mensaje || "Gracias por tu tiempo."}
        </p>
      </div>
    </div>
  );
}

function StepPregunta({
  numero,
  total,
  pregunta,
  valor,
  valorOtro,
  onChange,
  onChangeOtro,
  onNext,
  onBack,
  cargando,
  esUltima,
}: {
  numero: number;
  total: number;
  pregunta: { texto: string; opciones: string[] };
  valor: string;
  valorOtro: string;
  onChange: (valor: string) => void;
  onChangeOtro: (valor: string) => void;
  onNext: () => void;
  onBack: () => void;
  cargando: boolean;
  esUltima: boolean;
}) {
  const esOtro = valor === OTHER_OPTION;
  const opcionValida = valor !== "";
  const puedeContinuar = opcionValida && (!esOtro || valorOtro.trim() !== "");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p
          className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] sm:tracking-[0.18em] mb-2"
          style={{ color: COLOR.principal }}
        >
          Pregunta {numero} de {total}
        </p>
        <h2 className="text-base sm:text-lg font-bold leading-snug" style={{ color: COLOR.texto }}>
          {pregunta.texto}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {pregunta.opciones.map((opcion) => {
          const seleccionado = valor === opcion;

          return (
            <button
              key={opcion}
              onClick={() => onChange(opcion)}
              className="h-full w-full min-h-12 text-left px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300 active:scale-[0.99]"
              style={
                seleccionado
                  ? { borderColor: COLOR.principal, background: COLOR.principal, color: COLOR.blanco }
                  : { borderColor: COLOR.bordeSuave, background: COLOR.panelFuerte, color: COLOR.texto }
              }
            >
              <span className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                  style={
                    seleccionado
                      ? { borderColor: COLOR.blanco, background: "rgba(255,255,255,0.2)" }
                      : { borderColor: "#A995C0" }
                  }
                >
                  {seleccionado && <span className="w-2 h-2 rounded-full" style={{ background: COLOR.blanco }} />}
                </span>
                {opcion}
              </span>
            </button>
          );
        })}

        {esOtro && (
          <Campo label="Especifica tu respuesta" className="sm:col-span-2">
            <input
              type="text"
              placeholder="Escribe tu respuesta"
              value={valorOtro}
              onChange={(e) => onChangeOtro(e.target.value)}
              className="w-full min-h-12 rounded-xl px-3.5 py-2.5 text-sm border outline-none transition-colors duration-300 placeholder:text-zinc-400 focus-visible:border-[#A42879]"
              style={{ background: COLOR.blanco, borderColor: COLOR.bordeSuave, color: COLOR.texto }}
            />
          </Campo>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2.5">
        <BtnSecundario onClick={onBack}>Pregunta anterior</BtnSecundario>
        <BtnPrimario onClick={onNext} disabled={!puedeContinuar || cargando}>
          {cargando ? "Enviando..." : esUltima ? "Enviar respuesta" : "Siguiente"}
        </BtnPrimario>
      </div>
    </div>
  );
}

function Campo({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLOR.textoSuave }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function BtnPrimario({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full min-h-11 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-[0.985] disabled:opacity-35 disabled:cursor-not-allowed"
      style={{ background: `linear-gradient(120deg, ${COLOR.principalHover}, ${COLOR.principal})`, color: COLOR.blanco }}
    >
      {children}
    </button>
  );
}

function BtnSecundario({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full min-h-11 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-300 active:scale-[0.985]"
      style={{
        color: COLOR.textoSecundario,
        borderColor: COLOR.borde,
        background: COLOR.blanco,
      }}
    >
      {children}
    </button>
  );
}
