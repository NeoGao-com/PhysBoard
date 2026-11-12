import { Page, Download, expect } from '@playwright/test';
import * as fs from 'node:fs/promises';

export interface ExportValidationResult {
  filename: string;
  sizeBytes: number;
  isValidFormat: boolean;
  formatDetails: string;
}

/**
 * Driver for intercepting and validating client-side downloads and exports
 * (PNG, PDF, TikZ LaTeX, DOCX).
 */
export class ExportDriver {
  constructor(public readonly page: Page) {}

  /**
   * Trigger an action that produces a download event and intercept the resulting Download object
   */
  async interceptDownload(triggerAction: () => Promise<void>, timeout = 15_000): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout }),
      triggerAction(),
    ]);
    return download;
  }

  /**
   * Validate that an intercepted download is a valid PNG image file
   * (Checks 8-byte magic header: 89 50 4E 47 0D 0A 1A 0A)
   */
  async validatePNGDownload(download: Download): Promise<ExportValidationResult> {
    const filename = download.suggestedFilename();
    const filePath = await download.path();
    if (!filePath) {
      throw new Error(`ExportDriver: Download failed for ${filename}`);
    }

    const buffer = await fs.readFile(filePath);
    const sizeBytes = buffer.length;

    // PNG signature: 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
    const isPngHeader =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;

    expect(isPngHeader).toBe(true);
    expect(sizeBytes).toBeGreaterThan(100);

    return {
      filename,
      sizeBytes,
      isValidFormat: isPngHeader,
      formatDetails: `Valid PNG image (${sizeBytes} bytes)`,
    };
  }

  /**
   * Validate that an intercepted download is a valid PDF document
   * (Checks magic header: %PDF-)
   */
  async validatePDFDownload(download: Download): Promise<ExportValidationResult> {
    const filename = download.suggestedFilename();
    const filePath = await download.path();
    if (!filePath) {
      throw new Error(`ExportDriver: Download failed for ${filename}`);
    }

    const buffer = await fs.readFile(filePath);
    const sizeBytes = buffer.length;
    const header = buffer.subarray(0, 5).toString('utf-8');
    const isPdf = header.startsWith('%PDF-');

    expect(isPdf).toBe(true);
    expect(sizeBytes).toBeGreaterThan(200);

    return {
      filename,
      sizeBytes,
      isValidFormat: isPdf,
      formatDetails: `Valid PDF document (${header}, ${sizeBytes} bytes)`,
    };
  }

  /**
   * Validate that an intercepted download is a valid Word DOCX package
   * (Checks ZIP magic header: 50 4B 03 04)
   */
  async validateDOCXDownload(download: Download): Promise<ExportValidationResult> {
    const filename = download.suggestedFilename();
    const filePath = await download.path();
    if (!filePath) {
      throw new Error(`ExportDriver: Download failed for ${filename}`);
    }

    const buffer = await fs.readFile(filePath);
    const sizeBytes = buffer.length;

    // ZIP header: 'PK\x03\x04'
    const isZip =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;

    expect(isZip).toBe(true);
    expect(filename.endsWith('.docx')).toBe(true);

    return {
      filename,
      sizeBytes,
      isValidFormat: isZip,
      formatDetails: `Valid DOCX package (${sizeBytes} bytes)`,
    };
  }

  /**
   * Inspect the content of TikZ LaTeX code generated in an export modal or clipboard
   */
  async getTikZExportCode(): Promise<string> {
    const codeArea = this.page.locator(
      '[data-wb-export="tikz"] textarea, [data-wb-export="tikz"] pre, .wb-tikz-code'
    ).first();
    await codeArea.waitFor({ state: 'visible' });

    const code = (await codeArea.inputValue().catch(() => codeArea.textContent())) || '';
    expect(code).toContain('\\begin{tikzpicture}');
    expect(code).toContain('\\end{tikzpicture}');
    return code;
  }

  /**
   * Intercept or read exported JSON serialized whiteboard state
   */
  async validateStateJSON(jsonString: string): Promise<boolean> {
    const parsed = JSON.parse(jsonString);
    expect(parsed).toHaveProperty('version');
    expect(parsed).toHaveProperty('objects');
    return Array.isArray(parsed.objects);
  }
}
