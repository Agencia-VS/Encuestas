"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { CORPORATE_COLORS } from "@/lib/colors";

const PREGUNTAS = [
  {
    campo: "respuesta_1" as const,
    texto: "Que seleccion quieres que sea campeon del Mundo?",
    opciones: ["Argentina", "Brasil", "Francia", "Espana", "Alemania", "Inglaterra", "Otra"],
  },
  {
    campo: "respuesta_2" as const,
    texto: "Que jugador quieres que sea campeon del Mundo?",
    opciones: ["Messi", "Mbappe", "Vinicius Jr.", "Haaland", "Bellingham", "Lamine Yamal", "Otro"],
  },
  {
    campo: "respuesta_3" as const,
    texto: "Que seleccion crees que no cumplira las expectativas?",
    opciones: ["Brasil", "Francia", "Espana", "Alemania", "Inglaterra", "Argentina", "Otra"],
  },
];

type Direccion = "forward" | "back";
type DatosPersonales = { nombre: string; edad: string; sexo: string };
type Respuestas = { respuesta_1: string; respuesta_2: string; respuesta_3: string };

type SurveyFormProps = {
  onBackToLanding?: () => void;
};

const TOTAL = 1 + PREGUNTAS.length;

const SEXO_OPTS = [
  { label: "Masculino", valor: "masculino" },
  { label: "Femenino", valor: "femenino" },
  { label: "Prefiero N/D", valor: "prefiero_no_decir" },
];

const COLOR = {
  principal: CORPORATE_COLORS.verdeAccion,
  principalHover: CORPORATE_COLORS.verdeHover,
  acentoSuave: CORPORATE_COLORS.accentLight,
  fondo: CORPORATE_COLORS.negroSuave,
  panel: "rgba(43,43,43,0.62)",
  panelFuerte: "rgba(17,17,17,0.82)",
  borde: "rgba(255,255,255,0.12)",
  bordeSuave: "rgba(255,255,255,0.18)",
  texto: CORPORATE_COLORS.blanco,
  textoSecundario: "rgba(255,255,255,0.74)",
  textoSuave: "rgba(255,255,255,0.58)",
  blanco: CORPORATE_COLORS.blanco,
};

const variantsStep = {
  enter: (dir: Direccion) => ({ opacity: 0, x: dir === "forward" ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: Direccion) => ({ opacity: 0, x: dir === "forward" ? -18 : 18 }),
};

const FONDO_FORM =
  "radial-gradient(85% 65% at 12% 8%, rgba(0,168,196,0.14), transparent 65%), linear-gradient(180deg, rgba(17,17,17,0.98) 0%, rgba(28,28,28,0.98) 52%, rgba(17,17,17,0.98) 100%)";

export function SurveyForm({ onBackToLanding }: SurveyFormProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<Direccion>("forward");
  const [datos, setDatos] = useState<DatosPersonales>({ nombre: "", edad: "", sexo: "" });
  const [respuestas, setRespuestas] = useState<Respuestas>({
    respuesta_1: "",
    respuesta_2: "",
    respuesta_3: "",
  });
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const progreso = useMemo(() => ((step + 1) / TOTAL) * 100, [step]);

  const ir = (siguiente: number, dir: Direccion) => {
    setDirection(dir);
    setStep(siguiente);
  };

  const enviar = async () => {
    setCargando(true);
    setError("");

    try {
      const payload = {
        nombre: datos.nombre,
        edad: Number.parseInt(datos.edad, 10),
        sexo: datos.sexo,
        respuesta_1: respuestas.respuesta_1,
        respuesta_2: respuestas.respuesta_2,
        respuesta_3: respuestas.respuesta_3,
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
        throw new Error(data?.error ?? "Hubo un error al enviar. Intenta de nuevo.");
      }

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
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{
          background: FONDO_FORM,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-sm rounded-2xl border px-6 py-8"
          style={{ borderColor: COLOR.borde, background: COLOR.panel }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(224,246,250,0.16)" }}
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
              style={{ background: COLOR.principal, color: COLOR.fondo }}
            >
              Volver al inicio
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-3 sm:px-4 py-3 sm:py-5 md:py-7"
      style={{
        background: FONDO_FORM,
      }}
    >
      <div className="mx-auto max-w-2xl">
        <section
          className="rounded-2xl sm:rounded-3xl overflow-hidden border shadow-[0_18px_44px_rgba(0,0,0,0.35)]"
          style={{ borderColor: COLOR.borde, background: COLOR.panel }}
        >
          <div
            style={{
              height: 4,
              background: `linear-gradient(90deg, ${COLOR.principal}, ${COLOR.principalHover})`,
            }}
          />

          <div className="p-3 sm:p-5 md:p-6">
            <header className="flex items-start justify-between gap-2">
              <div>
                <p
                  className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] sm:tracking-[0.18em]"
                  style={{ color: COLOR.principal }}
                >
                  {step === 0 ? "Datos del entrevistado" : `Pregunta ${step} de ${PREGUNTAS.length}`}
                </p>
                <h1 className="mt-1.5 text-lg sm:text-xl font-bold" style={{ color: COLOR.texto }}>
                  Encuesta Mundial
                </h1>
                <p className="mt-1 text-xs sm:text-sm" style={{ color: COLOR.textoSecundario }}>
                  Responde en menos de un minuto.
                </p>
              </div>

              {onBackToLanding && (
                <button
                  type="button"
                  onClick={onBackToLanding}
                  className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                  style={{ borderColor: COLOR.borde, color: COLOR.textoSecundario, background: "rgba(17,17,17,0.45)" }}
                >
                  Inicio
                </button>
              )}
            </header>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: TOTAL }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-500"
                      style={{
                        width: i === step ? 20 : 8,
                        height: 8,
                        background: i <= step ? COLOR.principal : "rgba(255,255,255,0.22)",
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold tracking-wide" style={{ color: COLOR.textoSuave }}>
                  {step + 1} de {TOTAL}
                </span>
              </div>

              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
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
                    <StepDatos datos={datos} onChange={setDatos} onNext={() => ir(1, "forward")} />
                  )}

                  {step >= 1 && step <= PREGUNTAS.length && (
                    <StepPregunta
                      numero={step}
                      total={PREGUNTAS.length}
                      pregunta={PREGUNTAS[step - 1]}
                      valor={respuestas[PREGUNTAS[step - 1].campo]}
                      onChange={(valor) => {
                        setRespuestas((actual) => ({ ...actual, [PREGUNTAS[step - 1].campo]: valor }));
                      }}
                      onNext={step < PREGUNTAS.length ? () => ir(step + 1, "forward") : enviar}
                      onBack={() => ir(step - 1, "back")}
                      cargando={cargando}
                      esUltima={step === PREGUNTAS.length}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {error && <p className="mt-4 text-sm text-center text-red-300">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function StepDatos({
  datos,
  onChange,
  onNext,
}: {
  datos: DatosPersonales;
  onChange: (datos: DatosPersonales) => void;
  onNext: () => void;
}) {
  const valido = datos.nombre.trim() !== "" && datos.edad !== "" && datos.sexo !== "";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: COLOR.texto }}>
          Antes de empezar
        </h2>
        <p className="mt-1 text-xs sm:text-sm" style={{ color: COLOR.textoSecundario }}>
          Completa tus datos para continuar.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Campo label="Nombre">
          <input
            type="text"
            placeholder="Tu nombre completo"
            value={datos.nombre}
            autoComplete="name"
            onChange={(e) => onChange({ ...datos, nombre: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none transition-colors duration-300 bg-black/25 border-white/20 text-white placeholder:text-white/40 focus-visible:border-[var(--brand)]"
          />
        </Campo>

        <Campo label="Edad">
          <input
            type="number"
            placeholder="Tu edad"
            min={1}
            max={120}
            value={datos.edad}
            onChange={(e) => onChange({ ...datos, edad: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none transition-colors duration-300 bg-black/25 border-white/20 text-white placeholder:text-white/40 focus-visible:border-[var(--brand)]"
          />
        </Campo>

        <Campo label="Sexo">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SEXO_OPTS.map((item) => {
              const seleccionado = datos.sexo === item.valor;

              return (
                <button
                  key={item.valor}
                  type="button"
                  onClick={() => onChange({ ...datos, sexo: item.valor })}
                  className="py-2.5 rounded-xl border text-xs font-semibold transition-all duration-300 active:scale-[0.985]"
                  style={
                    seleccionado
                      ? { background: COLOR.principal, borderColor: COLOR.principal, color: COLOR.fondo }
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

function StepPregunta({
  numero,
  total,
  pregunta,
  valor,
  onChange,
  onNext,
  onBack,
  cargando,
  esUltima,
}: {
  numero: number;
  total: number;
  pregunta: { texto: string; opciones: string[] };
  valor: string;
  onChange: (valor: string) => void;
  onNext: () => void;
  onBack: () => void;
  cargando: boolean;
  esUltima: boolean;
}) {
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

      <div className="grid grid-cols-2 gap-2">
        {pregunta.opciones.map((opcion) => {
          const seleccionado = valor === opcion;

          return (
            <button
              key={opcion}
              onClick={() => onChange(opcion)}
              className="h-full w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300 active:scale-[0.99]"
              style={
                seleccionado
                  ? { borderColor: COLOR.principal, background: COLOR.principal, color: COLOR.fondo }
                  : { borderColor: COLOR.bordeSuave, background: COLOR.panelFuerte, color: "rgba(255,255,255,0.86)" }
              }
            >
              <span className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                  style={
                    seleccionado
                      ? { borderColor: COLOR.fondo, background: "rgba(17,17,17,0.16)" }
                      : { borderColor: "rgba(255,255,255,0.46)" }
                  }
                >
                  {seleccionado && <span className="w-2 h-2 rounded-full" style={{ background: COLOR.fondo }} />}
                </span>
                {opcion}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2.5">
        <BtnSecundario onClick={onBack}>Atras</BtnSecundario>
        <BtnPrimario onClick={onNext} disabled={!valor || cargando}>
          {cargando ? "Enviando..." : esUltima ? "Enviar respuesta" : "Siguiente"}
        </BtnPrimario>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
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
      style={{ background: COLOR.principal, color: COLOR.fondo }}
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
        background: COLOR.panelFuerte,
      }}
    >
      {children}
    </button>
  );
}
