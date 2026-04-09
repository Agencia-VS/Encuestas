"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Overview = {
  totalResponses: number;
  totalToday: number;
  totalLast7Days: number;
  averageDaily7: number;
  activeDaysForAverage: number;
};

type GroupStat = {
  label: string;
  count: number;
  percentage: number;
};

type QuestionOption = {
  option: string;
  count: number;
  percentage: number;
};

type QuestionStat = {
  id: string;
  title: string;
  totalAnswered: number;
  options: QuestionOption[];
};

type CrossGroupStat = {
  groupLabel: string;
  totalAnswered: number;
  options: QuestionOption[];
};

type CrossQuestionStat = {
  id: string;
  title: string;
  groups: CrossGroupStat[];
};

type TrendPoint = {
  date: string;
  count: number;
};

type AdminStatsResponse = {
  generatedAt: string;
  overview: Overview;
  demographics: {
    sexo: GroupStat[];
    edades: GroupStat[];
  };
  questions: QuestionStat[];
  crosses: {
    sexoVsPreguntas: CrossQuestionStat[];
    edadVsPreguntas: CrossQuestionStat[];
    sexoEdadVsPreguntas: CrossQuestionStat[];
    nacionalidadResidenciaVsPreguntas: CrossQuestionStat[];
  };
  trend14d: TrendPoint[];
};

type AdminTab = {
  id: string;
  label: string;
  helper: string;
};

type AdminTabSection = {
  id: string;
  title: string;
  tabs: AdminTab[];
};

const CHART_COLORS = ["#382960", "#A42879", "#C73D35", "#EBBC45", "#6F5A9F", "#9988BC", "#D4B8E8"];
const EXPORT_CAPTURE_DELAY_MS = 260;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForUiRender(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function sanitizeFilePart(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "vista";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function formatDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function formatActiveDaysLabel(days: number): string {
  if (days <= 0) {
    return "0 dias activos";
  }

  if (days === 1) {
    return "1 dia activo";
  }

  return `${days} dias activos`;
}

function formatTrendWindowLabel(days: number): string {
  if (days >= 14) {
    return "Ultimos 14 dias";
  }

  return `Desde inicio (${formatActiveDaysLabel(days)})`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article
      className="rounded-2xl border px-4 py-4 sm:px-5"
      style={{ borderColor: "#E2D5F1", background: "rgba(255,255,255,0.92)" }}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ color: "#7B7B7B" }}>
        {label}
      </p>
      <p className="mt-1.5 text-2xl sm:text-3xl font-bold" style={{ color: "#252626" }}>
        {value}
      </p>
    </article>
  );
}

function DistributionList({ items }: { items: GroupStat[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#3F3F3F" }}>{item.label}</span>
            <span className="font-semibold" style={{ color: "#382960" }}>
              {item.count} ({item.percentage}%)
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full" style={{ background: "#EFE6FA" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                background: "linear-gradient(120deg, #A42879, #382960)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PieStatChart({ items }: { items: GroupStat[] }) {
  const chartData = items.map((item) => ({
    name: item.label,
    value: item.count,
    percentage: item.percentage,
  }));

  if (chartData.length === 0) {
    return <p className="text-sm" style={{ color: "#7B7B7B" }}>Sin datos disponibles.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={82}
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const parsedValue = typeof value === "number" ? value : Number(value ?? 0);
              const payload = item?.payload as { percentage?: number } | undefined;
              const percentageValue = payload?.percentage ?? 0;
              return [`${parsedValue} (${percentageValue}%)`, "Respuestas"];
            }}
            contentStyle={{ borderRadius: 10, borderColor: "#E2D5F1" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const chartData = points.map((point) => ({
    date: formatDateLabel(point.date),
    total: point.count,
  }));

  if (chartData.length === 0) {
    return <p className="text-sm" style={{ color: "#7B7B7B" }}>Sin datos disponibles.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE3F7" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#7B7B7B" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#7B7B7B" }} />
          <Tooltip
            cursor={{ fill: "rgba(164, 40, 121, 0.08)" }}
            contentStyle={{ borderRadius: 10, borderColor: "#E2D5F1" }}
          />
          <Bar dataKey="total" name="Respuestas" fill="#382960" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CrossQuestionView({
  questions,
  heading,
  description,
}: {
  questions?: CrossQuestionStat[];
  heading: string;
  description: string;
}) {
  const safeQuestions = questions ?? [];

  if (safeQuestions.length === 0) {
    return (
      <article
        className="rounded-2xl border px-4 py-4 sm:px-5"
        style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}
      >
        <h2 className="text-sm sm:text-base font-bold" style={{ color: "#252626" }}>
          {heading}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#7B7B7B" }}>
          Sin datos disponibles.
        </p>
      </article>
    );
  }

  return (
    <section
      className="rounded-2xl border px-4 py-4 sm:px-5"
      style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}
    >
      <h2 className="text-sm sm:text-base font-bold" style={{ color: "#252626" }}>
        {heading}
      </h2>
      <p className="mt-1 text-xs" style={{ color: "#7B7B7B" }}>
        {description}
      </p>

      <div className="mt-3 space-y-3">
        {safeQuestions.map((question) => (
          <article
            key={question.id}
            data-export-cross-question="true"
            data-export-question-id={question.id}
            data-export-question-title={question.title}
            className="rounded-xl border px-3 py-3 sm:px-4"
            style={{ borderColor: "#EDE3F7", background: "#FBF8FF" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "#252626" }}>
              {question.title}
            </h3>

            <div className="mt-2 grid grid-cols-1 xl:grid-cols-2 gap-2.5">
              {question.groups.map((group) => {
                const topOptions = group.options.slice(0, 5);

                return (
                  <div
                    key={`${question.id}-${group.groupLabel}`}
                    className="rounded-lg border px-3 py-2.5"
                    style={{ borderColor: "#E8DCF6", background: "#FFFFFF" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold" style={{ color: "#382960" }}>
                        {group.groupLabel}
                      </p>
                      <p className="text-[11px]" style={{ color: "#7B7B7B" }}>
                        Total: {group.totalAnswered}
                      </p>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {topOptions.map((option) => (
                        <div key={`${question.id}-${group.groupLabel}-${option.option}`}>
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <span className="truncate" style={{ color: "#3F3F3F" }}>
                              {option.option}
                            </span>
                            <span className="font-semibold shrink-0" style={{ color: "#382960" }}>
                              {option.count} ({option.percentage}%)
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full" style={{ background: "#EFE6FA" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, option.percentage))}%`,
                                background: "linear-gradient(120deg, #A42879, #382960)",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminSidebarNav({
  sections,
  activeTab,
  onSelectTab,
  className,
}: {
  sections: AdminTabSection[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  className?: string;
}) {
  return (
    <nav className={className ?? "mt-3 space-y-3"}>
      {sections.map((section) => (
        <div key={section.id}>
          <p
            className="px-2 text-[10px] uppercase tracking-[0.11em] font-semibold"
            style={{ color: "#9A8BAA" }}
          >
            {section.title}
          </p>

          <div className="mt-1.5 space-y-1.5">
            {section.tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className="w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200"
                  style={
                    isActive
                      ? {
                          borderColor: "#A42879",
                          background: "linear-gradient(120deg, rgba(164,40,121,0.12), rgba(56,41,96,0.12))",
                          color: "#252626",
                          boxShadow: "0 6px 16px rgba(164,40,121,0.15)",
                        }
                      : {
                          borderColor: "#EDE3F7",
                          background: "#FFFFFF",
                          color: "#4A4A4A",
                        }
                  }
                >
                  <p className="text-sm font-semibold">{tab.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: isActive ? "#6D3A7D" : "#7B7B7B" }}>
                    {tab.helper}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminPage() {
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [exportingDashboard, setExportingDashboard] = useState(false);
  const [exportConfigOpen, setExportConfigOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "png">("pdf");
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [selectedExportTabIds, setSelectedExportTabIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const exportCaptureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthError("Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setCheckingSession(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setSession(data.session);
      setCheckingSession(false);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setStats(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session?.access_token) {
      setStats(null);
      setStatsError("");
      return;
    }

    let cancelled = false;

    const loadStats = async () => {
      setLoadingStats(true);
      setStatsError("");

      try {
        const response = await fetch("/api/admin/stats", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as
          | AdminStatsResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          const message = data && "error" in data && typeof data.error === "string"
            ? data.error
            : "No fue posible cargar las estadisticas.";
          throw new Error(message);
        }

        if (!cancelled) {
          setStats(data as AdminStatsResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setStatsError(error instanceof Error ? error.message : "No fue posible cargar las estadisticas.");
        }
      } finally {
        if (!cancelled) {
          setLoadingStats(false);
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");

    if (!supabase) {
      setAuthError("Falta configuracion de Supabase en cliente.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  };

  const tabSections = useMemo<AdminTabSection[]>(() => {
    if (!stats) {
      return [];
    }

    const questionTabs = stats.questions.map((question, index) => ({
      id: `question:${question.id}`,
      label: `Pregunta ${index + 1}`,
      helper: question.title,
    }));

    return [
      {
        id: "general",
        title: "General",
        tabs: [
          { id: "overview", label: "Resumen", helper: "KPIs generales" },
          { id: "trend", label: "Tendencia", helper: formatTrendWindowLabel(stats.trend14d.length) },
        ],
      },
      {
        id: "crosses",
        title: "Cruces",
        tabs: [
          { id: "cross-sexo", label: "Sexo vs P1/P2/P3", helper: "Vista general" },
          { id: "cross-edad", label: "Edad vs P1/P2/P3", helper: "Por rango etario" },
          { id: "cross-sexo-edad", label: "Sexo+Edad vs P1/P2/P3", helper: "Cruce 3 variables" },
          {
            id: "cross-nac-res",
            label: "Nacionalidad+Residencia vs P1/P2/P3",
            helper: "Segmentacion geografica",
          },
        ],
      },
      {
        id: "demographics",
        title: "Demografia",
        tabs: [
          { id: "sexo", label: "Sexo", helper: "Distribucion" },
          { id: "edad", label: "Edad", helper: "Rangos etarios" },
        ],
      },
      {
        id: "questions",
        title: "Preguntas",
        tabs: questionTabs,
      },
    ];
  }, [stats]);

  const tabs = useMemo<AdminTab[]>(() => {
    return tabSections.flatMap((section) => section.tabs);
  }, [tabSections]);

  const activeQuestion = useMemo(() => {
    if (!stats || !activeTab.startsWith("question:")) {
      return null;
    }

    const questionId = activeTab.slice("question:".length);
    return stats.questions.find((question) => question.id === questionId) ?? null;
  }, [activeTab, stats]);

  const activeTabData = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab) ?? null;
  }, [activeTab, tabs]);

  const selectedExportTabs = useMemo(() => {
    return tabs.filter((tab) => selectedExportTabIds.includes(tab.id));
  }, [tabs, selectedExportTabIds]);

  useEffect(() => {
    if (tabs.length === 0) {
      setSelectedExportTabIds([]);
      return;
    }

    setSelectedExportTabIds((previous) => {
      const valid = previous.filter((id) => tabs.some((tab) => tab.id === id));
      if (valid.length > 0) {
        return valid;
      }

      return tabs.map((tab) => tab.id);
    });
  }, [tabs]);

  const handleExportDashboardVisual = async () => {
    if (!stats || exportingDashboard || selectedExportTabs.length === 0) {
      if (!statsError && selectedExportTabs.length === 0) {
        setStatsError("Selecciona al menos una vista para exportar.");
      }
      return;
    }

    const originalTab = activeTab;
    setMobileMenuOpen(false);
    setExportingDashboard(true);
    setStatsError("");

    try {
      const capturedTabs: Array<{
        tab: AdminTab;
        label: string;
        fileLabel: string;
        imageDataUrl: string;
        width: number;
        height: number;
      }> = [];

      for (const tab of selectedExportTabs) {
        setActiveTab(tab.id);
        await waitForUiRender();
        await sleep(EXPORT_CAPTURE_DELAY_MS);

        const captureNode = exportCaptureRef.current;
        if (!captureNode) {
          continue;
        }

        const questionNodes = tab.id.startsWith("cross-")
          ? Array.from(captureNode.querySelectorAll<HTMLElement>("[data-export-cross-question='true']"))
          : [];

        const captureTargets = questionNodes.length > 0
          ? questionNodes.map((node, index) => ({
              node,
              label:
                node.dataset.exportQuestionTitle?.trim() ||
                `${tab.label} - Pregunta ${index + 1}`,
              fileLabel:
                node.dataset.exportQuestionId?.trim() ||
                `pregunta_${index + 1}`,
              backgroundColor: "#FFFFFF",
            }))
          : [
              {
                node: captureNode,
                label: tab.label,
                fileLabel: sanitizeFilePart(tab.label),
                backgroundColor: "#F6F3FB",
              },
            ];

        for (const target of captureTargets) {
          const imageDataUrl = await toPng(target.node, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: target.backgroundColor,
          });

          const image = new Image();
          image.src = imageDataUrl;
          await image.decode();

          capturedTabs.push({
            tab,
            label: target.label,
            fileLabel: target.fileLabel,
            imageDataUrl,
            width: image.width,
            height: image.height,
          });
        }
      }

      if (capturedTabs.length === 0) {
        throw new Error("No fue posible capturar vistas para exportar.");
      }

      const datePart = new Date().toISOString().slice(0, 10);

      if (exportFormat === "png") {
        const zip = new JSZip();

        capturedTabs.forEach((capture, index) => {
          const base64 = capture.imageDataUrl.split(",")[1] ?? "";
          const tabPart = sanitizeFilePart(capture.tab.label);
          const capturePart = sanitizeFilePart(capture.fileLabel);
          const filename = `${String(index + 1).padStart(2, "0")}_${tabPart}_${capturePart}.png`;
          zip.file(filename, base64, { base64: true });
        });

        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        });

        downloadBlob(zipBlob, `dashboard_estadisticas_${datePart}.zip`);
      } else {
        const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
        const margin = 10;
        const titleHeight = 8;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const renderWidthMax = pageWidth - margin * 2;
        const renderHeightMax = pageHeight - margin * 2 - titleHeight;
        let hasPage = false;

        if (includeCoverPage) {
          hasPage = true;
          pdf.setFillColor(246, 243, 251);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");
          pdf.setTextColor(56, 41, 96);
          pdf.setFontSize(20);
          pdf.text("Reporte visual dashboard", margin, 24);
          pdf.setFontSize(11);
          pdf.setTextColor(82, 82, 82);
          pdf.text(`Generado: ${new Date().toLocaleString("es-ES")}`, margin, 34);
          pdf.text(`Actualizado panel: ${new Date(stats.generatedAt).toLocaleString("es-ES")}`, margin, 41);

          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(226, 213, 241);
          pdf.roundedRect(margin, 48, pageWidth - margin * 2, 32, 2, 2, "FD");
          pdf.setTextColor(37, 38, 38);
          pdf.text(`Total respuestas: ${stats.overview.totalResponses}`, margin + 4, 58);
          pdf.text(`Respuestas hoy: ${stats.overview.totalToday}`, margin + 4, 65);
          pdf.text(`Ultimos 7 dias: ${stats.overview.totalLast7Days}`, margin + 4, 72);

          pdf.setTextColor(56, 41, 96);
          pdf.setFontSize(12);
          pdf.text("Vistas exportadas", margin, 92);
          pdf.setFontSize(10);
          pdf.setTextColor(90, 90, 90);

          let y = 100;
          for (const capture of capturedTabs) {
            pdf.text(`- ${capture.label}`, margin + 2, y);
            y += 6;
            if (y > pageHeight - 12) {
              pdf.addPage();
              y = 16;
            }
          }
        }

        for (const capture of capturedTabs) {
          if (hasPage) {
            pdf.addPage();
          }

          hasPage = true;
          const ratio = Math.min(renderWidthMax / capture.width, renderHeightMax / capture.height);

          const renderWidth = capture.width * ratio;
          const renderHeight = capture.height * ratio;

          pdf.setFontSize(11);
          pdf.setTextColor(56, 41, 96);
          pdf.text(`Vista: ${capture.label}`, margin, margin + 4);
          pdf.addImage(
            capture.imageDataUrl,
            "PNG",
            margin,
            margin + titleHeight,
            renderWidth,
            renderHeight,
            undefined,
            "FAST"
          );
        }

        pdf.save(`dashboard_estadisticas_${datePart}.pdf`);
      }
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : "No fue posible exportar el dashboard.");
    } finally {
      setActiveTab(originalTab);
      setExportingDashboard(false);
    }
  };

  useEffect(() => {
    if (!stats) {
      return;
    }

    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [activeTab, stats, tabs]);

  useEffect(() => {
    if (!stats) {
      setMobileMenuOpen(false);
    }
  }, [stats]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F6F3FB" }}>
        <p style={{ color: "#5A5A5A" }}>Verificando sesion...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{
          background:
            "radial-gradient(74% 54% at 4% 0%, rgba(164,40,121,0.08), transparent 70%), radial-gradient(58% 46% at 100% 0%, rgba(56,41,96,0.12), transparent 72%), #F6F3FB",
        }}
      >
        <form
          onSubmit={handleSignIn}
          className="w-full max-w-sm rounded-2xl border px-5 py-6 sm:px-6"
          style={{ borderColor: "#E2D5F1", background: "#FFFFFF", boxShadow: "0 16px 40px rgba(56,41,96,0.1)" }}
        >
          <h1 className="text-xl font-bold" style={{ color: "#252626" }}>
            Admin Encuestas
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#5A5A5A" }}>
            Ingresa con tu usuario de Supabase Auth.
          </p>

          <div className="mt-4 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@agenciavs.com"
              className="w-full min-h-11 rounded-xl border px-3.5 text-sm outline-none"
              style={{ borderColor: "#EDE3F7" }}
            />

            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contrasena"
              className="w-full min-h-11 rounded-xl border px-3.5 text-sm outline-none"
              style={{ borderColor: "#EDE3F7" }}
            />
          </div>

          {authError && (
            <p className="mt-3 text-sm" style={{ color: "#A8200D" }}>
              {authError}
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full min-h-11 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(120deg, #A42879, #382960)" }}
          >
            Entrar al panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-3 sm:px-5 py-4 sm:py-6"
      style={{
        background:
          "radial-gradient(74% 54% at 4% 0%, rgba(164,40,121,0.08), transparent 70%), radial-gradient(58% 46% at 100% 0%, rgba(56,41,96,0.12), transparent 72%), #F6F3FB",
      }}
    >
      <main className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-5">
        <section
          className="rounded-2xl border px-4 py-4 sm:px-5"
          style={{ borderColor: "#E2D5F1", background: "#FFFFFF", boxShadow: "0 12px 32px rgba(56,41,96,0.09)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "#252626" }}>
                Panel Admin
              </h1>
              <p className="text-xs sm:text-sm" style={{ color: "#5A5A5A" }}>
                Sesion: {session.user.email}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleExportDashboardVisual();
                }}
                disabled={exportingDashboard}
                className="min-h-10 rounded-lg border px-3 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderColor: "#E2D5F1", color: "#5A5A5A" }}
              >
                {exportingDashboard
                  ? `Exportando ${exportFormat.toUpperCase()}...`
                  : `Exportar visual ${exportFormat.toUpperCase()}`}
              </button>

              <button
                type="button"
                onClick={() => setExportConfigOpen((previous) => !previous)}
                className="min-h-10 rounded-lg border px-3 text-xs font-semibold"
                style={{ borderColor: "#E2D5F1", color: "#5A5A5A" }}
              >
                {exportConfigOpen ? "Ocultar opciones" : "Opciones export"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (session?.access_token) {
                    void fetch("/api/admin/stats", {
                      method: "GET",
                      headers: { Authorization: `Bearer ${session.access_token}` },
                      cache: "no-store",
                    })
                      .then(async (res) => {
                        const payload = (await res.json().catch(() => null)) as
                          | AdminStatsResponse
                          | { error?: string }
                          | null;
                        if (!res.ok) {
                          const message = payload && "error" in payload && typeof payload.error === "string"
                            ? payload.error
                            : "No fue posible actualizar.";
                          throw new Error(message);
                        }
                        setStats(payload as AdminStatsResponse);
                        setStatsError("");
                      })
                      .catch((error) => {
                        setStatsError(error instanceof Error ? error.message : "No fue posible actualizar.");
                      });
                  }
                }}
                className="min-h-10 rounded-lg border px-3 text-xs font-semibold"
                style={{ borderColor: "#E2D5F1", color: "#5A5A5A" }}
              >
                Actualizar
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-10 rounded-lg px-3 text-xs font-semibold text-white"
                style={{ background: "#382960" }}
              >
                Cerrar sesion
              </button>
            </div>
          </div>

          {exportConfigOpen && (
            <div
              className="mt-3 rounded-xl border px-3 py-3 sm:px-4"
              style={{ borderColor: "#EDE3F7", background: "#FBF8FF" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.11em] font-semibold" style={{ color: "#7B7B7B" }}>
                    Formato
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm" style={{ color: "#3F3F3F" }}>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="export-format"
                        checked={exportFormat === "pdf"}
                        onChange={() => setExportFormat("pdf")}
                      />
                      PDF
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="export-format"
                        checked={exportFormat === "png"}
                        onChange={() => setExportFormat("png")}
                      />
                      PNG (ZIP)
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.11em] font-semibold" style={{ color: "#7B7B7B" }}>
                    Opciones
                  </p>
                  <div className="mt-2 text-sm" style={{ color: "#3F3F3F" }}>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeCoverPage}
                        disabled={exportFormat !== "pdf"}
                        onChange={(event) => setIncludeCoverPage(event.target.checked)}
                      />
                      Incluir portada ejecutiva (solo PDF)
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.11em] font-semibold" style={{ color: "#7B7B7B" }}>
                    Vistas a exportar ({selectedExportTabs.length}/{tabs.length})
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedExportTabIds(tabs.map((tab) => tab.id))}
                      className="rounded-md border px-2 py-1 text-[11px] font-semibold"
                      style={{ borderColor: "#E2D5F1", color: "#5A5A5A" }}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedExportTabIds([])}
                      className="rounded-md border px-2 py-1 text-[11px] font-semibold"
                      style={{ borderColor: "#E2D5F1", color: "#5A5A5A" }}
                    >
                      Ninguna
                    </button>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tabs.map((tab) => {
                    const checked = selectedExportTabIds.includes(tab.id);

                    return (
                      <label
                        key={`export-tab-${tab.id}`}
                        className="inline-flex items-start gap-2 rounded-lg border px-2.5 py-2"
                        style={{ borderColor: "#E8DCF6", background: "#FFFFFF", color: "#3F3F3F" }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const isChecked = event.target.checked;
                            setSelectedExportTabIds((previous) => {
                              if (isChecked) {
                                if (previous.includes(tab.id)) {
                                  return previous;
                                }

                                return [...previous, tab.id];
                              }

                              return previous.filter((id) => id !== tab.id);
                            });
                          }}
                        />
                        <span className="text-[12px] leading-snug">{tab.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {loadingStats && !stats && (
          <section className="rounded-2xl border px-4 py-6" style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}>
            <p style={{ color: "#5A5A5A" }}>Cargando estadisticas...</p>
          </section>
        )}

        {statsError && (
          <section className="rounded-2xl border px-4 py-4" style={{ borderColor: "#F2C6C6", background: "#FFFFFF" }}>
            <p className="text-sm" style={{ color: "#A8200D" }}>
              {statsError}
            </p>
          </section>
        )}

        {stats && (
          <>
            <section
              className="lg:hidden rounded-2xl border px-3.5 py-3"
              style={{ borderColor: "#E2D5F1", background: "#FFFFFF", boxShadow: "0 8px 22px rgba(56,41,96,0.08)" }}
            >
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
                style={{ borderColor: "#EDE3F7", background: "#FBF8FF" }}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: "rgba(56,41,96,0.1)", color: "#382960" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold truncate" style={{ color: "#252626" }}>
                    Menu de resultados
                  </span>
                </span>
                <span className="text-[11px] font-semibold shrink-0" style={{ color: "#7B7B7B" }}>
                  {activeTabData?.label ?? "Seleccionar"}
                </span>
              </button>
            </section>

            {mobileMenuOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <button
                  type="button"
                  aria-label="Cerrar menu"
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setMobileMenuOpen(false)}
                />

                <aside
                  className="absolute left-0 top-0 h-full w-[84%] max-w-xs border-r p-4 overflow-y-auto"
                  style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ color: "#7B7B7B" }}>
                        Navegacion
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "#8A8A8A" }}>
                        Selecciona una vista.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border"
                      style={{ borderColor: "#EDE3F7", color: "#5A5A5A" }}
                      aria-label="Cerrar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  <AdminSidebarNav
                    sections={tabSections}
                    activeTab={activeTab}
                    onSelectTab={(tabId) => {
                      setActiveTab(tabId);
                      setMobileMenuOpen(false);
                    }}
                    className="mt-3 space-y-3 pb-4"
                  />
                </aside>
              </div>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3 sm:gap-4 items-start">
              <aside
                className="hidden lg:block h-fit rounded-2xl border p-3 sm:p-4 lg:sticky lg:top-5"
                style={{ borderColor: "#E2D5F1", background: "#FFFFFF", boxShadow: "0 10px 26px rgba(56,41,96,0.08)" }}
              >
                <div className="px-1">
                  <p className="text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ color: "#7B7B7B" }}>
                    Navegacion
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "#8A8A8A" }}>
                    Explora resultados por seccion.
                  </p>
                </div>

                <AdminSidebarNav
                  sections={tabSections}
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  className="mt-3 space-y-3"
                />
              </aside>

              <div ref={exportCaptureRef} className="min-w-0 space-y-3">
              {activeTab === "overview" && (
                <>
                  <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                    <StatCard label="Total respuestas" value={stats.overview.totalResponses} />
                    <StatCard label="Respuestas hoy" value={stats.overview.totalToday} />
                    <StatCard
                      label={
                        stats.overview.activeDaysForAverage >= 7
                          ? "Ultimos 7 dias"
                          : `Desde inicio (${formatActiveDaysLabel(stats.overview.activeDaysForAverage)})`
                      }
                      value={stats.overview.totalLast7Days}
                    />
                    <StatCard
                      label={`Promedio diario (${formatActiveDaysLabel(stats.overview.activeDaysForAverage)})`}
                      value={stats.overview.averageDaily7}
                    />
                    <StatCard label="Dias activos considerados" value={stats.overview.activeDaysForAverage} />
                  </section>

                  <article
                    className="rounded-2xl border px-4 py-4 sm:px-5"
                    style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}
                  >
                    <p className="text-sm" style={{ color: "#5A5A5A" }}>
                      Usa las tabs del panel lateral para revisar cruces generales, demografia, respuestas por pregunta y tendencia.
                    </p>
                    <p className="mt-2 text-[11px]" style={{ color: "#8A8A8A" }}>
                      Actualizado: {new Date(stats.generatedAt).toLocaleString("es-ES")}
                    </p>
                  </article>
                </>
              )}

              {activeTab === "cross-sexo" && (
                <CrossQuestionView
                  questions={stats.crosses?.sexoVsPreguntas ?? []}
                  heading="Cruce general: sexo vs P1/P2/P3"
                  description="Primero una lectura global por sexo. Cada bloque muestra top 5 respuestas por pregunta para facilitar conclusiones rapidas."
                />
              )}

              {activeTab === "cross-edad" && (
                <CrossQuestionView
                  questions={stats.crosses?.edadVsPreguntas ?? []}
                  heading="Cruce por rango etario: P1/P2/P3"
                  description="Aqui ves el mismo cruce, pero segmentado por rangos de edad para identificar diferencias de preferencia entre cohorts."
                />
              )}

              {activeTab === "cross-sexo-edad" && (
                <CrossQuestionView
                  questions={stats.crosses?.sexoEdadVsPreguntas ?? []}
                  heading="Cruce combinado: sexo + rango etario vs P1/P2/P3"
                  description="Este cruce combina 3 variables para cada pregunta: sexo, rango etario y respuesta. Ideal para detectar segmentos puntuales con mayor afinidad."
                />
              )}

              {activeTab === "cross-nac-res" && (
                <CrossQuestionView
                  questions={stats.crosses?.nacionalidadResidenciaVsPreguntas ?? []}
                  heading="Cruce combinado: nacionalidad + pais de residencia vs P1/P2/P3"
                  description="Esta vista cruza nacionalidad y residencia con cada respuesta para leer diferencias entre chilenos en Chile, chilenos en el extranjero y migrantes en Chile."
                />
              )}

              {activeTab === "sexo" && (
                <article
                  className="rounded-2xl border px-4 py-4 sm:px-5"
                  style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}
                >
                  <h2 className="text-sm sm:text-base font-bold" style={{ color: "#252626" }}>
                    Distribucion por sexo
                  </h2>
                  <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                    <PieStatChart items={stats.demographics.sexo} />
                    <DistributionList items={stats.demographics.sexo} />
                  </div>
                </article>
              )}

              {activeTab === "edad" && (
                <article
                  className="rounded-2xl border px-4 py-4 sm:px-5"
                  style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}
                >
                  <h2 className="text-sm sm:text-base font-bold" style={{ color: "#252626" }}>
                    Distribucion por edad
                  </h2>
                  <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                    <PieStatChart items={stats.demographics.edades} />
                    <DistributionList items={stats.demographics.edades} />
                  </div>
                </article>
              )}

              {activeTab.startsWith("question:") && activeQuestion && (
                <article
                  className="rounded-2xl border px-4 py-4 sm:px-5"
                  style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}
                >
                  <h2 className="text-sm sm:text-base font-bold" style={{ color: "#252626" }}>
                    {activeQuestion.title}
                  </h2>
                  <p className="text-xs mt-1" style={{ color: "#7B7B7B" }}>
                    Total respuestas: {activeQuestion.totalAnswered}
                  </p>

                  <div className="mt-3 space-y-2.5">
                    {activeQuestion.options.map((option) => (
                      <div key={`${activeQuestion.id}-${option.option}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: "#3F3F3F" }}>{option.option}</span>
                          <span className="font-semibold" style={{ color: "#382960" }}>
                            {option.count} ({option.percentage}%)
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full" style={{ background: "#EFE6FA" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, option.percentage))}%`,
                              background: "linear-gradient(120deg, #A42879, #382960)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )}

              {activeTab.startsWith("question:") && !activeQuestion && (
                <article
                  className="rounded-2xl border px-4 py-4 sm:px-5"
                  style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}
                >
                  <p className="text-sm" style={{ color: "#5A5A5A" }}>
                    No se encontro la pregunta seleccionada.
                  </p>
                </article>
              )}

              {activeTab === "trend" && (
                <section
                  className="rounded-2xl border px-4 py-4 sm:px-5"
                  style={{ borderColor: "#E2D5F1", background: "#FFFFFF" }}
                >
                  <h2 className="text-sm sm:text-base font-bold" style={{ color: "#252626" }}>
                    Tendencia ({formatTrendWindowLabel(stats.trend14d.length).toLowerCase()})
                  </h2>

                  <div className="mt-3">
                    <TrendChart points={stats.trend14d} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {stats.trend14d.map((point) => (
                      <div
                        key={point.date}
                        className="rounded-lg border px-2.5 py-2"
                        style={{ borderColor: "#EEE3F8", background: "#FBF8FF" }}
                      >
                        <p className="text-[10px]" style={{ color: "#7B7B7B" }}>
                          {formatDateLabel(point.date)}
                        </p>
                        <p className="text-sm font-semibold mt-1" style={{ color: "#382960" }}>
                          {point.count}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-[11px]" style={{ color: "#8A8A8A" }}>
                    Actualizado: {new Date(stats.generatedAt).toLocaleString("es-ES")}
                  </p>
                </section>
              )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
