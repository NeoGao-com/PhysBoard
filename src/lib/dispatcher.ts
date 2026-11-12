import * as Y from "yjs";
import {
  CanvasElement,
  WhiteboardAction,
  CanvasElementSchema,
  WhiteboardPageState,
} from "@/types/whiteboard";
import {
  findDependentIds,
  scaleGeometryElements,
} from "@/lib/geometry";

export const LAYOUT_ORIGIN = "layout";

export interface DispatcherOptions {
  doc?: Y.Doc;
  actor: { id: string; name: string; role?: string };
  now?: () => number;
}

function yValToPlain(val: unknown): unknown {
  if (val instanceof Y.Map) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of val.entries()) {
      out[k] = yValToPlain(v);
    }
    return out;
  }
  if (val instanceof Y.Array) {
    return val.toArray().map((item) => yValToPlain(item));
  }
  return val;
}

/**
 * Reads a Y.Map into a plain CanvasElement object.
 */
export function readElement(yMap: Y.Map<unknown>): CanvasElement {
  const toObj = (key: string): Record<string, unknown> => {
    const m = yMap.get(key);
    if (m instanceof Y.Map) {
      return yValToPlain(m) as Record<string, unknown>;
    }
    if (m && typeof m === "object") {
      return m as Record<string, unknown>;
    }
    return {};
  };

  const metaObj = toObj("meta");
  const transformObj = toObj("transform");
  const rawPage = metaObj.page;
  const page =
    typeof rawPage === "number" && Number.isFinite(rawPage) && rawPage >= 1
      ? Math.floor(rawPage)
      : 1;

  return {
    id: (yMap.get("id") as string) ?? "",
    type: (yMap.get("type") as string) ?? "Ink",
    transform: {
      x: typeof transformObj.x === "number" ? transformObj.x : 0,
      y: typeof transformObj.y === "number" ? transformObj.y : 0,
      scale: typeof transformObj.scale === "number" ? transformObj.scale : 1,
      rotation:
        typeof transformObj.rotation === "number" ? transformObj.rotation : 0,
      z: typeof transformObj.z === "number" ? transformObj.z : 0,
    },
    style: toObj("style"),
    meta: {
      createdBy:
        typeof metaObj.createdBy === "string" ? metaObj.createdBy : "",
      createdAtSeq:
        typeof metaObj.createdAtSeq === "number" ? metaObj.createdAtSeq : 0,
      ...(typeof metaObj.stepId === "string"
        ? { stepId: metaObj.stepId }
        : {}),
      page,
    },
    props: toObj("props"),
  };
}

export class WhiteboardCommandDispatcher {
  public doc: Y.Doc;
  public actor: { id: string; name: string; role?: string };
  public undoManager: Y.UndoManager;
  public seq: number = 0;
  public page: number = 1;
  private now: () => number;
  private log: Array<{
    seq: number;
    type: string;
    params: unknown;
    actor: unknown;
    ts: number;
  }> = [];

  constructor(options: DispatcherOptions) {
    this.doc = options.doc ?? new Y.Doc();
    this.actor = options.actor;
    this.now = options.now ?? (() => Date.now());

    // Initialize Y.UndoManager tracking "objects" array with captureTimeout = 0
    // and ignoring remote WebSocket / layout origins
    const objectsArray = this.doc.getArray<Y.Map<unknown>>("objects");
    this.undoManager = new Y.UndoManager(objectsArray, {
      captureTimeout: 0,
      trackedOrigins: new Set([null, undefined]),
    });
  }

  public setPage(newPage: number): void {
    this.page = Math.max(1, Math.floor(newPage));
  }

  /**
   * Reads `{ cur, count }` from `Y.Map("pages")`.
   */
  public getPageState(): WhiteboardPageState {
    const pagesMap = this.doc.getMap<number>("pages");
    const rawCount = pagesMap.get("count");
    const rawCur = pagesMap.get("cur");
    const count =
      typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount >= 1
        ? Math.floor(rawCount)
        : 1;
    const cur =
      typeof rawCur === "number" && Number.isFinite(rawCur) && rawCur >= 1
        ? Math.min(count, Math.floor(rawCur))
        : 1;
    return { cur, count };
  }

  /**
   * Updates active page in `Y.Map("pages")` and dispatcher state.
   */
  public setCurrentPage(nextPage: number): WhiteboardPageState {
    const pagesMap = this.doc.getMap<number>("pages");
    const { count } = this.getPageState();
    const cur = Math.max(1, Math.min(count, Math.floor(nextPage)));
    this.doc.transact(() => {
      pagesMap.set("count", count);
      pagesMap.set("cur", cur);
    });
    this.page = cur;
    return { cur, count };
  }

  /**
   * Appends a new page inside `Y.Map("pages")` and switches to it.
   */
  public addPage(): WhiteboardPageState {
    const pagesMap = this.doc.getMap<number>("pages");
    const { count } = this.getPageState();
    const nextCount = count + 1;
    this.doc.transact(() => {
      pagesMap.set("count", nextCount);
      pagesMap.set("cur", nextCount);
    });
    this.page = nextCount;
    return { cur: nextCount, count: nextCount };
  }

  /**
   * Helper: converts plain JS object to Y.Map.
   */
  private static toYMap(obj: Record<string, unknown>): Y.Map<unknown> {
    const ymap = new Y.Map<unknown>();
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        ymap.set(k, v);
      }
    }
    return ymap;
  }

  /**
   * Helper: finds index of element with given id.
   */
  public findIndex(id: string): number {
    const arr = this.doc.getArray<Y.Map<unknown>>("objects");
    for (let i = 0; i < arr.length; i++) {
      if (arr.get(i).get("id") === id) return i;
    }
    return -1;
  }

  /**
   * Returns all elements across every page.
   */
  public getAllElements(): CanvasElement[] {
    const arr = this.doc.getArray<Y.Map<unknown>>("objects");
    const result: CanvasElement[] = [];
    for (let i = 0; i < arr.length; i++) {
      result.push(readElement(arr.get(i)));
    }
    return result;
  }

  /**
   * Returns all elements currently on the specified page (or current page; pass `0` for all pages).
   */
  public getElements(page?: number): CanvasElement[] {
    const targetPage = page === undefined ? this.page : page;
    const arr = this.doc.getArray<Y.Map<unknown>>("objects");
    const result: CanvasElement[] = [];
    for (let i = 0; i < arr.length; i++) {
      const el = readElement(arr.get(i));
      if (targetPage === 0 || el.meta.page === targetPage) {
        result.push(el);
      }
    }
    return result;
  }

  /**
   * Dispatches an atomic command.
   */
  public dispatch(
    action: WhiteboardAction
  ): { ok: boolean; created?: string[]; error?: string } {
    const seq = this.seq;
    const ts = this.now();
    const createdIds: string[] = [];

    const newId = () => {
      const id = `${this.actor.id}_${seq}_${createdIds.length}_${Math.random().toString(36).slice(2, 7)}`;
      return id;
    };

    try {
      this.doc.transact(() => {
        const arr = this.doc.getArray<Y.Map<unknown>>("objects");

        switch (action.type) {
          case "ink.stroke": {
            const id = newId();
            const el: CanvasElement = {
              id,
              type: "Ink",
              transform: {
                x: action.params.at?.x ?? 0,
                y: action.params.at?.y ?? 0,
                scale: 1,
                rotation: 0,
                z: 0,
              },
              style: action.params.style ?? {},
              meta: {
                createdBy: this.actor.id,
                createdAtSeq: seq,
                page: action.params.page ?? this.page,
              },
              props: {
                points: action.params.points,
                ...(action.params.pressures
                  ? { pressures: action.params.pressures }
                  : {}),
                ...(action.params.nib ? { nib: action.params.nib } : {}),
                ...(action.params.closed !== undefined
                  ? { closed: action.params.closed }
                  : {}),
              },
            };

            CanvasElementSchema.parse(el);

            const yEl = new Y.Map<unknown>();
            yEl.set("id", el.id);
            yEl.set("type", el.type);
            yEl.set(
              "transform",
              WhiteboardCommandDispatcher.toYMap(
                el.transform as Record<string, unknown>
              )
            );
            yEl.set(
              "style",
              WhiteboardCommandDispatcher.toYMap(
                el.style as Record<string, unknown>
              )
            );
            yEl.set(
              "meta",
              WhiteboardCommandDispatcher.toYMap(
                el.meta as Record<string, unknown>
              )
            );
            yEl.set(
              "props",
              WhiteboardCommandDispatcher.toYMap(
                el.props as Record<string, unknown>
              )
            );
            arr.push([yEl]);
            createdIds.push(id);
            break;
          }

          case "object.create": {
            const id = action.params.id ?? newId();
            const el: CanvasElement = {
              id,
              type: action.params.type,
              transform: {
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0,
                z: 0,
                ...action.params.transform,
              },
              style: action.params.style ?? {},
              meta: {
                createdBy: this.actor.id,
                createdAtSeq: seq,
                ...(action.params.stepId
                  ? { stepId: action.params.stepId }
                  : {}),
                page: action.params.page ?? this.page,
              },
              props: action.params.props,
            };

            const yEl = new Y.Map<unknown>();
            yEl.set("id", el.id);
            yEl.set("type", el.type);
            yEl.set(
              "transform",
              WhiteboardCommandDispatcher.toYMap(
                el.transform as Record<string, unknown>
              )
            );
            yEl.set(
              "style",
              WhiteboardCommandDispatcher.toYMap(
                el.style as Record<string, unknown>
              )
            );
            yEl.set(
              "meta",
              WhiteboardCommandDispatcher.toYMap(
                el.meta as Record<string, unknown>
              )
            );
            yEl.set(
              "props",
              WhiteboardCommandDispatcher.toYMap(
                el.props as Record<string, unknown>
              )
            );
            arr.push([yEl]);
            createdIds.push(id);
            break;
          }

          case "object.update": {
            const idx = this.findIndex(action.params.id);
            if (idx === -1)
              throw new Error(`object not found: ${action.params.id}`);
            const yEl = arr.get(idx);

            for (const section of ["transform", "style", "props"] as const) {
              const val = action.params[section];
              if (!val) continue;
              const rawMap = yEl.get(section);
              const subMap: Y.Map<unknown> =
                rawMap instanceof Y.Map
                  ? (rawMap as Y.Map<unknown>)
                  : new Y.Map<unknown>();
              if (rawMap !== subMap) {
                yEl.set(section, subMap);
              }
              for (const [k, v] of Object.entries(val)) {
                if (v === undefined) {
                  subMap.delete(k);
                } else {
                  subMap.set(k, v);
                }
              }
            }
            break;
          }

          case "object.delete": {
            const idx = this.findIndex(action.params.id);
            if (idx !== -1) {
              arr.delete(idx, 1);
            }
            break;
          }

          case "style.set": {
            const idx = this.findIndex(action.params.id);
            if (idx !== -1) {
              const yEl = arr.get(idx);
              const rawStyle = yEl.get("style");
              const subMap: Y.Map<unknown> =
                rawStyle instanceof Y.Map
                  ? (rawStyle as Y.Map<unknown>)
                  : new Y.Map<unknown>();
              if (rawStyle !== subMap) {
                yEl.set("style", subMap);
              }
              for (const [k, v] of Object.entries(action.params.style)) {
                subMap.set(k, v);
              }
            }
            break;
          }

          case "object.reorder": {
            const idx = this.findIndex(action.params.id);
            if (idx !== -1) {
              const yEl = arr.get(idx);
              const rawTransform = yEl.get("transform");
              const subMap: Y.Map<unknown> =
                rawTransform instanceof Y.Map
                  ? (rawTransform as Y.Map<unknown>)
                  : new Y.Map<unknown>();
              if (rawTransform !== subMap) {
                yEl.set("transform", subMap);
              }
              subMap.set("z", action.params.z);
            }
            break;
          }
        }
      });

      this.log.push({
        seq,
        type: action.type,
        params: action.params,
        actor: this.actor,
        ts,
      });
      this.seq += 1;
      return { ok: true, created: createdIds };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Duplicates elements by id and shifts them slightly.
   */
  public duplicate(ids: string[]): string[] {
    const created: string[] = [];
    this.batch(() => {
      const elements = this.getElements();
      for (const id of ids) {
        const el = elements.find((e) => e.id === id);
        if (!el) continue;
        const res = this.dispatch({
          type: "object.create",
          params: {
            type: el.type,
            transform: {
              ...el.transform,
              x: el.transform.x + 0.5,
              y: el.transform.y - 0.5,
            },
            style: { ...el.style },
            props: JSON.parse(JSON.stringify(el.props)),
          },
        });
        if (res.created && res.created[0]) {
          created.push(res.created[0]);
        }
      }
    });
    return created;
  }

  /**
   * Deletes elements AND all transitive dependent elements atomically inside a single Yjs transaction
   * so one `Ctrl+Z` restores both parents and dependents together.
   */
  public deleteObjects(ids: string[]): string[] {
    if (ids.length === 0) return [];
    const allElements = this.getAllElements();
    const cascadeIds = findDependentIds(ids, allElements);
    if (cascadeIds.length === 0) return [];

    const idSet = new Set(cascadeIds);
    this.doc.transact(() => {
      const arr = this.doc.getArray<Y.Map<unknown>>("objects");
      for (let i = arr.length - 1; i >= 0; i--) {
        const elId = arr.get(i).get("id");
        if (typeof elId === "string" && idSet.has(elId)) {
          arr.delete(i, 1);
        }
      }
    });
    return cascadeIds;
  }

  /**
   * Scales geometry elements around their centroid (`Giãn hình` / `Thu hình`) atomically.
   */
  public scaleGeometry(factor: number, targetIds?: string[]): boolean {
    const pageElements = this.getElements();
    const patches = scaleGeometryElements(pageElements, factor, targetIds);
    if (patches.length === 0) return false;

    this.doc.transact(() => {
      for (const patch of patches) {
        this.dispatch({
          type: "object.update",
          params: {
            id: patch.id,
            transform: patch.transform,
            props: patch.props,
          },
        });
      }
    });
    return true;
  }

  /**
   * Hides multiple elements by id atomically.
   */
  public hideObjects(ids: string[]): void {
    this.batch(() => {
      for (const id of ids) {
        this.dispatch({
          type: "style.set",
          params: { id, style: { hidden: true } },
        });
      }
    });
  }

  /**
   * Unhides all hidden elements on the current page.
   */
  public unhideAll(page?: number): void {
    this.batch(() => {
      const elements = this.getElements(page);
      for (const el of elements) {
        if (el.style?.hidden) {
          this.dispatch({
            type: "style.set",
            params: { id: el.id, style: { hidden: false } },
          });
        }
      }
    });
  }

  /**
   * Groups multiple changes inside a single atomic transaction.
   */
  public batch(fn: () => void): void {
    this.doc.transact(() => fn());
  }

  /**
   * Runs internal or layout adjustments with origin "layout" so Y.UndoManager ignores it.
   */
  public layout(fn: () => void): void {
    this.doc.transact(() => fn(), LAYOUT_ORIGIN);
  }

  /**
   * Gesture batching: groups pointer drag / ink drawing into a single undo step.
   */
  public gesture(active: boolean): void {
    this.undoManager.stopCapturing();
    this.undoManager.captureTimeout = active ? Number.POSITIVE_INFINITY : 0;
  }

  public undo(): boolean {
    if (this.undoManager.undoStack.length === 0) return false;
    this.undoManager.undo();
    return true;
  }

  public canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  public redo(): boolean {
    if (this.undoManager.redoStack.length === 0) return false;
    this.undoManager.redo();
    return true;
  }

  public canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  /**
   * Subscribes to changes in the "objects" array.
   */
  public subscribe(callback: () => void): () => void {
    const arr = this.doc.getArray<Y.Map<unknown>>("objects");
    const observer = () => callback();
    arr.observeDeep(observer);
    return () => arr.unobserveDeep(observer);
  }
}
