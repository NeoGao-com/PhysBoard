import { Page, Locator } from '@playwright/test';

/**
 * Driver for interacting with the Mathvera Floating Pill Toolbar (top bar),
 * tool sub-dropdowns, style popovers, and menu dialogs.
 */
export class ToolbarDriver {
  constructor(public readonly page: Page) {}

  /**
   * Root floating pill toolbar locator
   */
  get toolbar(): Locator {
    return this.page.locator('[data-wb-toolbar="true"], .wb-toolbar').first();
  }

  /**
   * Multi-page navigator bar
   */
  get pageBar(): Locator {
    return this.page.locator('[data-wb-pagebar="true"], .wb-pagebar').first();
  }

  /**
   * Floating selection action bar (duplicate, cut, copy, delete)
   */
  get selectionBar(): Locator {
    return this.page.locator('[data-wb-selection-bar="true"], .wb-selection-bar').first();
  }

  /**
   * More menu dropdown popover
   */
  get moreMenu(): Locator {
    return this.page.locator('[data-wb-more-menu="true"], .wb-more-menu').first();
  }

  /**
   * Real-world object searchable drawer
   */
  get realWorldDrawer(): Locator {
    return this.page.locator('[data-wb-drawer="realworld"], .wb-realworld-drawer').first();
  }

  /**
   * CV 7991 Exam Matrix Drawer
   */
  get matrixDrawer(): Locator {
    return this.page.locator('[data-wb-drawer="matrix"], .wb-matrix-drawer').first();
  }

  /**
   * Find a tool button on the toolbar by data-tool, title, or visible text
   */
  getToolButton(toolIdentifier: string): Locator {
    return this.toolbar.locator(
      `button[data-tool="${toolIdentifier}"], button[data-testid="${toolIdentifier}"], button[title*="${toolIdentifier}"], button:has-text("${toolIdentifier}")`
    ).first();
  }

  /**
   * Select a main toolbar tool
   * Standard identifiers:
   * - select / 'Chọn'
   * - ink / 'Bút'
   * - ink:fountain / 'Bút máy'
   * - erase / 'Tẩy'
   * - formula / 'Công thức'
   * - point / 'Điểm'
   * - segment / 'Đoạn'
   * - circle / 'Tròn'
   * - polygon / 'Đa giác'
   * - floodFill / 'Tô màu'
   */
  async selectTool(toolIdentifier: string) {
    const btn = this.getToolButton(toolIdentifier);
    await btn.waitFor({ state: 'visible' });
    await btn.click();
  }

  /**
   * Open a dropdown menu from toolbar and select an item
   * Categories:
   * - 'insert' ('Chèn'): table, image, pdf
   * - 'planeGeometry' ('Hình phẳng'): triangles, quadrilaterals, constructions
   * - 'spaceGeometry' ('Không gian'): 3D solids, Oxyz, measurements
   * - 'functions' ('Hàm số'): Oxy, plot, var table, trig circle
   * - 'statistics' ('Thống kê'): charts, combinatorics, tree, Venn, number line
   * - 'realworld' ('Thực tế'): quick objects, drawer
   */
  async selectDropdownItem(dropdownTriggerTextOrId: string, itemTextOrId: string) {
    const trigger = this.toolbar.locator(
      `button[data-dropdown="${dropdownTriggerTextOrId}"], button[data-tool="${dropdownTriggerTextOrId}"], button:has-text("${dropdownTriggerTextOrId}")`
    ).first();
    await trigger.click();

    // Menu dropdown overlay
    const menuItem = this.page.locator(
      `[role="menuitem"]:has-text("${itemTextOrId}"), [data-menu-item="${itemTextOrId}"], button:has-text("${itemTextOrId}")`
    ).first();
    await menuItem.waitFor({ state: 'visible' });
    await menuItem.click();
  }

  /**
   * Open Stroke & Fill Style Popover
   */
  async openStylePicker() {
    const styleBtn = this.toolbar.locator(
      'button[data-popover="style"], button[title*="Màu"], button:has-text("Màu và nét")'
    ).first();
    await styleBtn.click();
    await this.page.locator('[data-wb-style-picker="true"], .wb-style-picker').waitFor({ state: 'visible' });
  }

  /**
   * Set Stroke Color
   * @param colorHex e.g. '#1565C0', '#DC2626', '#16A34A', or 'auto'
   */
  async setStrokeColor(colorHex: string) {
    await this.openStylePicker();
    const colorSwatch = this.page.locator(
      `[data-color="${colorHex}"], button[style*="${colorHex}"], [data-testid="color-${colorHex}"]`
    ).first();
    await colorSwatch.click();
  }

  /**
   * Set Stroke Width (thin: 1, medium: 2, bold: 3.5, extrabold: 5)
   */
  async setStrokeWidth(widthPresetOrPx: 'thin' | 'medium' | 'bold' | 'extrabold' | number) {
    await this.openStylePicker();
    const widthBtn = this.page.locator(
      `[data-stroke-width="${widthPresetOrPx}"], button:has-text("${widthPresetOrPx}")`
    ).first();
    await widthBtn.click();
  }

  /**
   * Set Stroke Style (solid 'Liền' vs dashed 'Đứt')
   */
  async setStrokeStyle(style: 'solid' | 'dashed' | 'Liền' | 'Đứt') {
    await this.openStylePicker();
    const styleBtn = this.page.locator(
      `[data-stroke-style="${style}"], button:has-text("${style}")`
    ).first();
    await styleBtn.click();
  }

  /**
   * Open Fill Color Popover
   */
  async setFillColor(colorHex: string) {
    const fillBtn = this.toolbar.locator(
      'button[data-popover="fill"], button[title*="Tô màu"], button:has-text("Tô màu")'
    ).first();
    await fillBtn.click();
    const swatch = this.page.locator(`[data-fill-color="${colorHex}"], [data-color="${colorHex}"]`).first();
    await swatch.click();
  }

  /**
   * History Undo action (click button or shortcut Ctrl+Z)
   */
  async undo(viaKeyboard = false) {
    if (viaKeyboard) {
      await this.page.keyboard.press('ControlOrMeta+z');
    } else {
      const undoBtn = this.toolbar.locator('button[data-action="undo"], button[title*="Hoàn tác"]').first();
      await undoBtn.click();
    }
  }

  /**
   * History Redo action (click button or shortcut Ctrl+Shift+Z)
   */
  async redo(viaKeyboard = false) {
    if (viaKeyboard) {
      await this.page.keyboard.press('ControlOrMeta+Shift+z');
    } else {
      const redoBtn = this.toolbar.locator('button[data-action="redo"], button[title*="Làm lại"]').first();
      await redoBtn.click();
    }
  }

  /**
   * Delete selected elements (click button or shortcut Delete)
   */
  async deleteSelection(viaKeyboard = false) {
    if (viaKeyboard) {
      await this.page.keyboard.press('Delete');
    } else {
      const deleteBtn = this.toolbar.locator('button[data-action="delete"], button[title*="Xoá"]').first();
      await deleteBtn.click();
    }
  }

  /**
   * Multi-Page Navigation: add new page
   */
  async addNewPage() {
    const addPageBtn = this.pageBar.locator('button:has-text("+ Trang"), button[data-action="add-page"]').first();
    await addPageBtn.click();
  }

  /**
   * Multi-Page Navigation: go to next page
   */
  async nextPage() {
    const nextBtn = this.pageBar.locator('button[data-action="next-page"], button:has-text(">")').first();
    await nextBtn.click();
  }

  /**
   * Multi-Page Navigation: go to previous page
   */
  async prevPage() {
    const prevBtn = this.pageBar.locator('button[data-action="prev-page"], button:has-text("<")').first();
    await prevBtn.click();
  }

  /**
   * Multi-Page Navigation: read current page indicator e.g. "1 / 10"
   */
  async getCurrentPageText(): Promise<string> {
    const label = this.pageBar.locator('[data-wb-page-indicator="true"], .wb-page-indicator').first();
    return (await label.textContent())?.trim() ?? '';
  }

  /**
   * Open the More menu ("⋯")
   */
  async openMoreMenu() {
    const moreBtn = this.toolbar.locator('button[data-action="more"], button:has-text("⋯")').first();
    await moreBtn.click();
  }

  /**
   * Trigger Export from More menu
   */
  async triggerExport(format: 'PNG' | 'PDF' | 'TikZ') {
    await this.openMoreMenu();
    const exportBtn = this.page.locator(
      `button:has-text("${format}"), [data-action="export-${format.toLowerCase()}"]`
    ).first();
    await exportBtn.click();
  }

  /**
   * Open Exam Authoring Mode ("Mở đề thi" / "Soạn đề")
   */
  async openExamMode() {
    await this.openMoreMenu();
    const examBtn = this.page.locator('button:has-text("Mở đề thi"), button:has-text("Soạn đề")').first();
    await examBtn.click();
    await this.page.locator('[data-wb-exam-editor="true"], .wb-exam-editor').waitFor({ state: 'visible' });
  }
}
