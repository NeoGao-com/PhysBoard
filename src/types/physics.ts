/**
 * Domain types for Grade 10–12 (GDPT 2018) Physics formula bank and constants.
 */

export type PhysicsGrade = 10 | 11 | 12 | "optics";

export interface PhysicsFormulaItem {
  id: string;
  grade: PhysicsGrade;
  topic: string;
  name: string;
  latex: string;
  note: string;
  keywords: string[];
}

export interface PhysicsConstantItem {
  id: string;
  name: string;
  symbol: string;
  valueText: string;
  latex: string;
  keywords: string[];
}
