"use client";

import React from "react";
// @ts-ignore
import { CalcPanel } from "./CasioFx580Panel";

export interface CalculatorWidgetProps {
  open: boolean;
  onClose: () => void;
  onInsertLatex?: (latex: string) => void;
}

export const CalculatorWidget: React.FC<CalculatorWidgetProps> = ({
  open,
  onClose,
  onInsertLatex,
}) => {
  if (!open) return null;

  return (
    <div
      data-testid="calculator-widget"
      data-calculator-open="true"
      style={{ display: "contents" }}
    >
      <CalcPanel
        onClose={onClose}
        onInsertLatex={onInsertLatex}
      />
    </div>
  );
};
