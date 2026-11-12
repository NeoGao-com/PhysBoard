import { Page, Locator, expect } from '@playwright/test';

interface MathfieldElementLike extends HTMLElement {
  value?: string;
  setValue?: (val: string) => void;
  getValue?: () => string;
}

/**
 * Driver for MathLive inline formula editing, 6-category virtual keyboard interactions,
 * and KaTeX vector math rendering verification.
 */
export class MathDriver {
  constructor(public readonly page: Page) {}

  /**
   * Active MathLive custom element locator
   */
  get mathField(): Locator {
    return this.page.locator('math-field');
  }

  /**
   * Virtual keyboard container locator
   */
  get virtualKeyboard(): Locator {
    return this.page.locator('[data-wb-keyboard="true"], .wb-virtual-keyboard, math-virtual-keyboard');
  }

  /**
   * KaTeX rendered formula containers on the canvas
   */
  get katexElements(): Locator {
    return this.page.locator('.katex, [data-wb-katex="true"]');
  }

  /**
   * Wait for MathLive Web Component definition to be registered and ready
   */
  async waitForMathLiveReady(timeout = 5000) {
    await this.page.waitForFunction(
      () => typeof window !== 'undefined' && customElements.get('math-field') !== undefined,
      { timeout }
    ).catch(() => {
      // In case MathLive defines element lazily, proceed gracefully
    });
  }

  /**
   * Wait for active math-field element to appear in DOM
   */
  async waitForMathFieldVisible(timeout = 5000) {
    await this.mathField.first().waitFor({ state: 'visible', timeout });
  }

  /**
   * Set formula LaTeX value directly on the active MathLive field and trigger input event
   */
  async setFormulaValue(latex: string) {
    await this.waitForMathFieldVisible();
    await this.mathField.first().evaluate((el: HTMLElement, val: string) => {
      const mf = el as MathfieldElementLike;
      if (typeof mf.setValue === 'function') {
        mf.setValue(val);
      } else if (typeof mf.value === 'string') {
        mf.value = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, latex);
  }

  /**
   * Type LaTeX or formula characters sequentially into the active math-field via keyboard
   */
  async typeKeystrokes(text: string) {
    await this.waitForMathFieldVisible();
    await this.mathField.first().focus();
    await this.page.keyboard.type(text, { delay: 50 });
  }

  /**
   * Read the current LaTeX value from the active math-field
   */
  async getFormulaValue(): Promise<string> {
    await this.waitForMathFieldVisible();
    return await this.mathField.first().evaluate((el: HTMLElement) => {
      const mf = el as MathfieldElementLike;
      return (typeof mf.getValue === 'function' ? mf.getValue() : mf.value) || '';
    });
  }

  /**
   * Commit the formula (press Enter or click canvas outside math-field)
   */
  async commitFormula() {
    await this.page.keyboard.press('Enter');
    // Allow transition to KaTeX vector element
    await this.page.waitForTimeout(100);
  }

  /**
   * Switch virtual keyboard category tab
   * Categories:
   * - 'templates' ('Cơ bản' / 'Mẫu')
   * - 'relations' ('Quan hệ')
   * - 'logic' ('Logic & Tập hợp')
   * - 'analysis' ('Giải tích')
   * - 'geometry' ('Hình học')
   * - 'greek' ('Ký tự Hy Lạp')
   */
  async switchKeyboardTab(category: 'templates' | 'relations' | 'logic' | 'analysis' | 'geometry' | 'greek' | string) {
    await this.virtualKeyboard.waitFor({ state: 'visible' });
    const tabBtn = this.virtualKeyboard.locator(
      `button[data-tab="${category}"], button:has-text("${category}")`
    ).first();
    await tabBtn.click();
  }

  /**
   * Press a specific button on the virtual math keyboard
   */
  async pressKeyboardButton(symbolOrLatex: string) {
    await this.virtualKeyboard.waitFor({ state: 'visible' });
    const escaped = symbolOrLatex.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const btn = this.virtualKeyboard.locator(
      `button[data-insert="${escaped}"], button[data-key="${escaped}"], button:has-text("${escaped}")`
    ).first();
    await btn.click();
  }

  /**
   * Verify KaTeX rendered formula contains specific LaTeX annotation or string
   */
  async expectKaTeXFormula(expectedLatexSubstring: string) {
    const matchingKaTeX = this.katexElements.filter({
      hasText: expectedLatexSubstring,
    }).or(
      this.page.locator(`annotation[encoding*="tex"]:has-text("${expectedLatexSubstring}")`)
    );
    await expect(matchingKaTeX.first()).toBeVisible();
  }
}
