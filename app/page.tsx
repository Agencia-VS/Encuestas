"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { LandingPage } from "@/components/landing/LandingPage";
import { SurveyForm } from "@/components/survey/SurveyForm";

type Vista = "landing" | "form";

const variantsView = {
  enter: { opacity: 0, y: 20 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function Home() {
  const [vista, setVista] = useState<Vista>("landing");

  const abrirFormulario = useCallback(() => {
    setVista("form");
  }, []);

  const volverLanding = useCallback(() => {
    setVista("landing");
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [vista]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {vista === "landing" ? (
        <motion.div
          key="landing"
          variants={variantsView}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        >
          <LandingPage onStartSurvey={abrirFormulario} />
        </motion.div>
      ) : (
        <motion.div
          key="form"
          variants={variantsView}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        >
          <SurveyForm onBackToLanding={volverLanding} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
