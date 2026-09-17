import { expect, test } from "./fixtures";

test("renders the dot-grid background without waiting for an idle callback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "requestIdleCallback", {
      configurable: true,
      value: () => 1,
    });
  });
  await page.goto("/");

  const canvas = page.locator(".appBackdrop .dot-grid__canvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate((element: HTMLCanvasElement) => {
        if (element.width <= 0 || element.height <= 0) return false;
        const context = element.getContext("2d");
        if (!context) return false;
        const pixels = context.getImageData(
          0,
          0,
          element.width,
          element.height,
        ).data;
        for (let index = 3; index < pixels.length; index += 4) {
          if (pixels[index] > 0) return true;
        }
        return false;
      }),
    )
    .toBe(true);
});
