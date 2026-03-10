"use client";

import React from "react";
import { EvidenceSummary } from "./ui";

type Props = {
  evidenceOpen: boolean;
  closeEvidence: () => void;
  evidenceTitle: string;
  showRawEvidence: boolean;
  setShowRawEvidence: React.Dispatch<React.SetStateAction<boolean>>;
  evidenceJson: any;
};

export default function EvidenceModal({
  evidenceOpen,
  closeEvidence,
  evidenceTitle,
  showRawEvidence,
  setShowRawEvidence,
  evidenceJson,
}: Props) {
  if (!evidenceOpen) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/40" onClick={closeEvidence} />
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="w-full max-w-3xl rounded-2xl bg-white border shadow-xl">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500">Proof / Explainability</div>
              <div className="text-lg font-black text-gray-900">{evidenceTitle}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded-xl border bg-white text-sm font-black hover:bg-gray-50"
                onClick={() => setShowRawEvidence((v) => !v)}
              >
                {showRawEvidence ? "Hide Raw" : "Show Raw"}
              </button>

              <button
                className="px-3 py-2 rounded-xl border bg-white text-sm font-black"
                onClick={closeEvidence}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 max-h-[75vh] overflow-auto">
            <div className="text-xs text-gray-600 mb-2">
              Evidence is explainable. Below are key reasons (if available) + optional raw JSON.
            </div>

            <EvidenceSummary payload={evidenceJson} />

            {showRawEvidence ? (
              <pre className="mt-3 text-[12px] bg-gray-50 border rounded-2xl p-3 overflow-auto">
                {JSON.stringify(evidenceJson, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}