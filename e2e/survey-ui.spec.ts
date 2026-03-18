import { expect, test } from "@playwright/test";

type RespuestasPayload = {
  nombre: string;
  edad: number;
  sexo: string;
  pais_residencia: string;
  nacionalidad: string;
  respondent_id: string;
  respuesta_1: string;
  respuesta_2: string;
  respuesta_3: string;
};

function ensureE2ESafeTables() {
  const respuestasTable = process.env.SUPABASE_RESPUESTAS_TABLE?.trim();
  const bloqueadasTable = process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE?.trim();

  if (!respuestasTable || !bloqueadasTable) {
    throw new Error(
      "Faltan SUPABASE_RESPUESTAS_TABLE y/o SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE para E2E. Configura tablas espejo antes de correr Playwright."
    );
  }

  if (respuestasTable === "respuestas" || bloqueadasTable === "respuestas_bloqueadas") {
    throw new Error(
      "Bloqueo de seguridad: E2E no se ejecuta contra tablas productivas. Usa tablas como respuestas_e2e y respuestas_bloqueadas_e2e."
    );
  }
}

test.describe("Encuesta UI E2E", () => {
  test.beforeAll(() => {
    ensureE2ESafeTables();
  });

  test("flujo completo exitoso con mapeo de etiqueta formal a valor canonico", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Encuesta Mundial" })).toBeVisible();

    await page.getByPlaceholder("Tu nombre").fill(`UI E2E ${Date.now()}`);
    await page.getByPlaceholder("Tu edad").fill("28");

    await page.locator("select").nth(0).selectOption("Chile");
    await page.locator("select").nth(1).selectOption("Chile");
    await page.getByRole("button", { name: "Masculino" }).click();

    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "¿Qué selección quieres que sea campeón del mundo?" })).toBeVisible();
    await page.getByRole("button", { name: "Argentina" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();

    await expect(page.getByRole("heading", { name: "¿Qué jugador quieres que sea campeón del mundo?" })).toBeVisible();
    await page.getByRole("button", { name: "Cristiano Ronaldo" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();

    await expect(
      page.getByRole("heading", { name: "¿Qué selección crees que no cumplirá las expectativas?" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Brasil" }).click();

    const requestPromise = page.waitForRequest(
      (request) => request.url().includes("/api/respuestas") && request.method() === "POST"
    );

    await page.getByRole("button", { name: "Enviar respuesta" }).click();

    const request = await requestPromise;
    const payload = request.postDataJSON() as RespuestasPayload;

    expect(payload.respuesta_1).toBe("Argentina");
    expect(payload.respuesta_2).toBe("CR7");
    expect(payload.respuesta_3).toBe("Brasil");

    await expect(page.getByText("Tu respuesta fue registrada con exito.")).toBeVisible();
  });

  test("flujo completo exitoso con opcion Otro y detalle libre", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("Tu nombre").fill(`UI E2E Otro ${Date.now()}`);
    await page.getByPlaceholder("Tu edad").fill("34");

    await page.locator("select").nth(0).selectOption("Chile");
    await page.locator("select").nth(1).selectOption("Chile");
    await page.getByRole("button", { name: "Femenino" }).click();

    await page.getByRole("button", { name: "Continuar" }).click();

    await page.getByRole("button", { name: "Otro" }).click();
    await page.getByPlaceholder("Escribe tu respuesta").fill("  peru  ");
    await page.getByRole("button", { name: "Siguiente" }).click();

    await page.getByRole("button", { name: "Lionel Messi" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();

    await page.getByRole("button", { name: "Portugal" }).click();

    const requestPromise = page.waitForRequest(
      (request) => request.url().includes("/api/respuestas") && request.method() === "POST"
    );

    await page.getByRole("button", { name: "Enviar respuesta" }).click();

    const request = await requestPromise;
    const payload = request.postDataJSON() as RespuestasPayload;

    expect(payload.respuesta_1).toBe("Otro: peru");
    expect(payload.respuesta_2).toBe("Messi");
    expect(payload.respuesta_3).toBe("Portugal");

    await expect(page.getByText("Tu respuesta fue registrada con exito.")).toBeVisible();
  });
});
