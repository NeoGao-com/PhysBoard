import { test, expect } from "@playwright/test";

function buildMultiQuestionPngBuffer(): Buffer {
  // Minimal valid 1x1? No, use browser canvas to generate crisp multi-block PNG for auto-detector
  return Buffer.from([]);
}

test.describe("Tier 1: 21 Question Cropper Spacing & A4 Page-Break Protection", () => {
  test.beforeEach(async ({ page }) => {
    const roomId = `crop-gap-${Date.now()}`;
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("physboard_feature_guide_seen_v1", "1");
      } catch {
        // ignore
      }
    });
    await page.goto(`/?room=${roomId}`);
    await page.waitForSelector('svg[data-wb-canvas="true"], svg.wb-canvas', {
      state: "attached",
      timeout: 15_000,
    });
  });

  test("TC-21-01: QuestionCropModal exposes 6 spacing presets + custom slider and persists gapWorld", async ({ page }) => {
    test.setTimeout(60_000);
    // Generate a synthetic exam image with 3 real "Câu 1 / Câu 2 / Câu 3" text blocks on white background
    const pngBase64 = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 700;
      c.height = 1000;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 24px Arial, sans-serif";
      const ys = [70, 380, 690];
      ys.forEach((y, idx) => {
        ctx.font = "bold 24px Arial, sans-serif";
        ctx.fillText(`Cau ${idx + 1}: Tinh gia tri bieu thuc A = ${idx + 2}x + 5`, 40, y);
        ctx.font = "20px Arial, sans-serif";
        ctx.fillText(`A. 10    B. 15    C. 20    D. 25`, 40, y + 48);
        ctx.fillText(`Ghi chu: Giai chi tiet tung buoc vao vo.`, 40, y + 92);
      });
      return c.toDataURL("image/png").split(",")[1];
    });
    const imgBuf = Buffer.from(pngBase64, "base64");
    expect(buildMultiQuestionPngBuffer().length).toBe(0);

    // Switch to A4 Portrait first to verify zero cross-page splitting
    await page.locator('button[data-action-open-settings="true"]').first().click();
    await page.locator('button:has-text("Khổ & Nền bảng")').first().click();
    await page.locator('[data-board-format-option="a4_portrait"]').first().click();
    await page.keyboard.press("Escape");

    // Open Question Crop modal
    await page.locator('button:has-text("Cắt đề")').first().click();
    const modal = page.getByTestId("question-crop-modal");
    await expect(modal).toBeVisible();

    // Upload synthetic exam PNG
    const fileInput = modal.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "exam-3-questions.png",
      mimeType: "image/png",
      buffer: imgBuf,
    });

    // Run auto-detection
    const detectBtn = modal.locator('button:has-text("Tự nhận diện")').first();
    await expect(detectBtn).toBeVisible();
    await detectBtn.click();

    // Wait for batch bar (spacing presets + slider + commit button)
    const slider = modal.getByTestId("crop-gap-slider");
    await expect(slider).toBeVisible({ timeout: 35_000 });

    // Verify all 6 presets exist and clicking one updates slider & localStorage
    await expect(modal.getByTestId("crop-gap-preset-1.2")).toBeVisible();
    await expect(modal.getByTestId("crop-gap-preset-2.5")).toBeVisible();
    await expect(modal.getByTestId("crop-gap-preset-4.5")).toBeVisible();
    await expect(modal.getByTestId("crop-gap-preset-7")).toBeVisible();
    await expect(modal.getByTestId("crop-gap-preset-10")).toBeVisible();
    await expect(modal.getByTestId("crop-gap-preset-13")).toBeVisible();

    await modal.getByTestId("crop-gap-preset-10").click();
    await expect(modal.getByTestId("crop-gap-value")).toHaveText("10.0");

    // Custom slider adjustment persists to localStorage
    await slider.fill("11.5");
    await expect(modal.getByTestId("crop-gap-value")).toHaveText("11.5");
    const savedGap = await page.evaluate(() => window.localStorage.getItem("physboard_crop_gap_world"));
    expect(savedGap).toBe("11.5");

    // Commit batch to A4 board and verify NO inserted question crosses an A4 page boundary
    await modal.getByTestId("commit-batch-crop-btn").click();
    await expect(modal).not.toBeVisible();

    const images = page.locator('g[data-board-content="true"] [data-element-type="Image"] image');
    await expect.poll(async () => images.count()).toBeGreaterThanOrEqual(2);

    const rects = await images.evaluateAll((els) =>
      els.map((el) => {
        const g = el.closest("[data-element-type='Image']");
        const transform = g?.getAttribute("transform") || "";
        const m = transform.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
        const tx = m ? parseFloat(m[1]) : 0;
        const ty = m ? parseFloat(m[2]) : 0;
        const x = parseFloat(el.getAttribute("x") || "0") + tx;
        const y = parseFloat(el.getAttribute("y") || "0") + ty;
        const h = parseFloat(el.getAttribute("height") || "0");
        return { x, topSvg: y, bottomSvg: y + h, h };
      })
    );

    const pageH = 24.04;
    const pageGap = 0.8;
    const pageStep = pageH + pageGap;

    for (const r of rects) {
      const startPage = Math.floor(r.topSvg / pageStep) + 1;
      const endPage = Math.floor((r.bottomSvg - 1e-4) / pageStep) + 1;
      // Every single cropped question must stay entirely within ONE A4 page
      expect(endPage).toBe(startPage);
      const pageTop = (startPage - 1) * pageStep;
      const pageBottom = pageTop + pageH;
      expect(r.topSvg).toBeGreaterThanOrEqual(pageTop);
      expect(r.bottomSvg).toBeLessThanOrEqual(pageBottom);
    }
  });
});
