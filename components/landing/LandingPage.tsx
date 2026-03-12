"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { CORPORATE_COLORS } from "@/lib/colors";

type LandingPageProps = {
  onStartSurvey: () => void;
};

const COLOR = {
  action: CORPORATE_COLORS.verdeAccion,
  hover: CORPORATE_COLORS.verdeHover,
  softBlack: CORPORATE_COLORS.negroSuave,
  white: CORPORATE_COLORS.blanco,
};

const CURIOSIDADES = [
  {
    titulo: "Gol mas rapido",
    texto: "Hakan Sukur marco para Turquia en solo 11 segundos durante el Mundial 2002.",
    icono: (
      <path
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
  {
    titulo: "Mas titulos",
    texto: "Brasil lidera el historial con 5 Copas del Mundo en su vitrina.",
    icono: (
      <path
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
  {
    titulo: "Audiencia global",
    texto: "El Mundial 2018 supero los 3.500 millones de espectadores en todo el mundo.",
    icono: (
      <path
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
];

export function LandingPage({ onStartSurvey }: LandingPageProps) {
  const [respuestaTrivia, setRespuestaTrivia] = useState<"marruecos" | "klose" | null>(null);

  return (
    <div className="min-h-screen" style={{ background: COLOR.softBlack, color: COLOR.white }}>
      <main>
        <section className="px-4 sm:px-6 py-6 sm:py-10">
          <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-5 sm:gap-7 items-stretch">
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border p-6 sm:p-8 md:p-10 flex flex-col justify-center"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "linear-gradient(180deg, rgba(43,43,43,0.5), rgba(17,17,17,0.9))" }}
            >
              <div className="inline-flex items-center gap-2 mb-5">
                <BallIcon className="h-6 w-6" color={COLOR.action} />
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">VSLab</span>
              </div>

              <span
                className="inline-block w-fit rounded-lg px-3 py-1 text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.2em] mb-4"
                style={{ background: COLOR.action, color: COLOR.softBlack }}
              >
                Encuesta Mundial 2026
              </span>

              <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.04]">
                El pulso de la
                <br />
                hinchada mundialista.
              </h1>

              <p className="mt-5 text-sm sm:text-base text-white/78 leading-relaxed max-w-xl">
                Comparte tu mirada en menos de un minuto y ayudanos a mapear que piensa la aficion sobre el proximo Mundial.
              </p>

              <div className="mt-7 flex flex-col items-start gap-3">
                <button
                  type="button"
                  onClick={onStartSurvey}
                  className="min-h-12 rounded-xl px-7 text-base font-bold transition-all"
                  style={{ background: COLOR.action, color: COLOR.softBlack, boxShadow: "0 10px 28px rgba(0,168,196,0.24)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLOR.hover;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = COLOR.action;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Comenzar encuesta
                </button>
                <p className="text-xs text-white/58">Duracion estimada: menos de 1 minuto.</p>
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.56, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border p-5 sm:p-7 md:p-8 relative overflow-hidden min-h-[290px] sm:min-h-[360px]"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                background:
                  "radial-gradient(90% 70% at 10% 10%, rgba(0,168,196,0.35), transparent 60%), radial-gradient(70% 60% at 85% 15%, rgba(224,246,250,0.2), transparent 70%), linear-gradient(160deg, rgba(43,43,43,0.66), rgba(17,17,17,0.96))",
              }}
            >
              <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(130deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 18px)" }} />
              <div className="relative h-full">
                <div className="flex items-center justify-between mb-5">
                  <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.12)" }}>
                    Sabias que...
                  </span>
                  <span className="text-xs text-white/70">3 datos mundialistas</span>
                </div>

                <div className="space-y-3">
                  {CURIOSIDADES.map((item, index) => (
                    <article
                      key={item.titulo}
                      className="rounded-xl border p-3 sm:p-4"
                      style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(17,17,17,0.5)" }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex rounded-full p-2 mt-0.5" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <svg className="h-4 w-4" fill="none" stroke={COLOR.action} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            {item.icono}
                          </svg>
                        </span>
                        <div>
                          {index === 1 ? (
                            <>
                              <h3 className="text-sm sm:text-base font-bold">Quien tiene mas goles en los Mundiales?</h3>
                              <p className="mt-1 text-xs sm:text-sm text-white/75 leading-relaxed">Elige una opcion:</p>

                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRespuestaTrivia("marruecos")}
                                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-left transition-colors"
                                  style={{
                                    borderColor: respuestaTrivia === "marruecos" ? COLOR.action : "rgba(255,255,255,0.2)",
                                    background: respuestaTrivia === "marruecos" ? "rgba(0,168,196,0.2)" : "rgba(255,255,255,0.04)",
                                    color: COLOR.white,
                                  }}
                                >
                                  Marruecos
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setRespuestaTrivia("klose")}
                                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-left transition-colors"
                                  style={{
                                    borderColor: respuestaTrivia === "klose" ? COLOR.action : "rgba(255,255,255,0.2)",
                                    background: respuestaTrivia === "klose" ? "rgba(0,168,196,0.2)" : "rgba(255,255,255,0.04)",
                                    color: COLOR.white,
                                  }}
                                >
                                  Miroslav Klose
                                </button>
                              </div>

                              {respuestaTrivia && (
                                <p className="mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: "rgba(224,246,250,0.94)" }}>
                                  Dato real: Marruecos tiene 20 goles en Mundiales y Miroslav Klose tiene 16 goles
                                  (record individual).
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <h3 className="text-sm sm:text-base font-bold">{item.titulo}</h3>
                              <p className="mt-1 text-xs sm:text-sm text-white/75 leading-relaxed">{item.texto}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </motion.article>
          </div>
        </section>
      </main>

      <footer className="px-4 sm:px-6 pb-5 sm:pb-6 pt-1">
        <div className="mx-auto max-w-7xl border-t border-white/10 pt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] text-white/55">VSLab</span>
          <span className="text-[11px] text-white/40">© 2026 VSLab. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  );
}

function BallIcon({ className, color }: { className: string; color: string }) {
  return (
    <svg className={className} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
      <path d="M12 21.8c2.3-1.6 4-4.2 4-7.8s-1.7-6.2-4-7.8" />
      <path d="M12 2.2c-2.3 1.6-4 4.2-4 7.8s1.7 6.2 4 7.8" />
    </svg>
  );
}
