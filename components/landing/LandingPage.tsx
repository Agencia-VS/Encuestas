"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { BRAND_TOKENS, getAgencyLogoUrl } from "@/lib/branding";

type LandingPageProps = {
  onStartSurvey: () => void;
};

const LOGO_URL = getAgencyLogoUrl();

const CURIOSIDADES = [
  {
    titulo: "Gol mas rapido",
    texto: "Hakan Sukur anoto para Turquia en 11 segundos en el Mundial 2002.",
  },
  {
    titulo: "Mas campeonatos",
    texto: "Brasil sigue liderando el historial con 5 Copas del Mundo.",
  },
  {
    titulo: "Audiencia global",
    texto: "El Mundial 2018 supero los 3.500 millones de espectadores.",
  },
];

export function LandingPage({ onStartSurvey }: LandingPageProps) {
  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-10">
      <main className="mx-auto max-w-5xl">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border p-5 sm:p-8 md:p-10"
          style={{
            borderColor: "#DDCFEF",
            background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,241,252,0.92))",
            boxShadow: "0 18px 44px rgba(56,41,96,0.09)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative h-11 w-40 sm:h-14 sm:w-52">
              <Image src={LOGO_URL} alt="Logo Agencia VS" fill sizes="208px" className="object-contain object-left" priority />
            </div>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: "#F3ECFB", color: BRAND_TOKENS.primary }}
            >
              Encuesta oficial
            </span>
          </div>

          <h1 className="mt-6 text-3xl sm:text-5xl font-extrabold leading-[1.04]" style={{ color: BRAND_TOKENS.neutralDark }}>
            Encuesta Mundial 2026
          </h1>

          <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed" style={{ color: "#4B4B4B" }}>
            Queremos una encuesta simple y rapida. Responde en menos de un minuto y ayudanos a entender la mirada de
            la aficion sobre el proximo Mundial.
          </p>

          <div className="mt-7 flex flex-col items-start gap-2.5">
            <button
              type="button"
              onClick={onStartSurvey}
              className="min-h-12 rounded-xl px-7 text-sm sm:text-base font-semibold text-white transition-opacity hover:opacity-95"
              style={{
                background: "linear-gradient(120deg, #A42879 0%, #382960 100%)",
                boxShadow: "0 12px 28px rgba(56,41,96,0.2)",
              }}
            >
              Comenzar encuesta
            </button>
            <p className="text-xs" style={{ color: "#6F6F6F" }}>
              Duracion estimada: menos de 1 minuto.
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.46, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          {CURIOSIDADES.map((item) => (
            <article
              key={item.titulo}
              className="rounded-2xl border px-4 py-4 sm:px-5"
              style={{ borderColor: "#E8DCF4", background: "rgba(255,255,255,0.94)" }}
            >
              <h2 className="text-sm font-bold" style={{ color: BRAND_TOKENS.primary }}>
                {item.titulo}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed" style={{ color: "#4B4B4B" }}>
                {item.texto}
              </p>
            </article>
          ))}
        </motion.section>
      </main>

      <footer className="mt-6 px-1 pb-2">
        <div className="mx-auto max-w-5xl border-t pt-3 flex items-center justify-between gap-3" style={{ borderColor: "#E6DBF2" }}>
          <span className="text-[11px] font-semibold" style={{ color: BRAND_TOKENS.primary }}>
            Agencia VS
          </span>
          <span className="text-[11px]" style={{ color: "#7A7A7A" }}>
            © 2026 Agencia VS. Todos los derechos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}
