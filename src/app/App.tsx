import { useState } from "react";
import messyReports from "../fixtures/phase-0/messy-reports.json";
import { EmptyState } from "../components/EmptyState";
import { Phase0RawInfoPanel } from "../features/phase-0/Phase0RawInfoPanel";
import { Phase0Workbench } from "../features/phase-0/Phase0Workbench";
import { createPhase0Judgement } from "../features/phase-0/phase0-heuristics";
import type {
  Phase0MessyRecord,
  Phase0JudgementDraft,
} from "../features/phase-0/phase0-types";

type TabKey = "raw" | "workbench";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "raw", label: "原始資訊" },
  { key: "workbench", label: "整理工作台" },
];

const phase0Records = messyReports satisfies Phase0MessyRecord[];

function createInitialDrafts(records: Phase0MessyRecord[]) {
  return new Map(
    records.map((record) => [record.id, createPhase0Judgement(record)]),
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("raw");
  const [selectedRecordId, setSelectedRecordId] = useState(
    phase0Records[0]?.id ?? "",
  );
  const [drafts, setDrafts] = useState<Map<string, Phase0JudgementDraft>>(() =>
    createInitialDrafts(phase0Records),
  );

  function selectForWorkbench(recordId: string) {
    setSelectedRecordId(recordId);
    setActiveTab("workbench");
  }

  function updateDraft(recordId: string, draft: Phase0JudgementDraft) {
    setDrafts((prev) => new Map(prev).set(recordId, draft));
  }

  function deleteDraft(recordId: string) {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.delete(recordId);
      return next;
    });
  }

  return (
    <main className="layout">
      <header className="hero">
        <p className="eyebrow">SITCON Camp 2026</p>
        <h1>災害資訊整理工作台</h1>
        <p>
          第一階段先用 coding agent
          做出可展示的前端原型，再從成果中看見資料品質、角色、狀態與來源的限制。
        </p>
      </header>

      <nav className="tabs" aria-label="第一階段工作區">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="panel">
        {phase0Records.length === 0 ? (
          <EmptyState message="目前沒有資料" />
        ) : activeTab === "raw" ? (
          <Phase0RawInfoPanel
            records={phase0Records}
            selectedRecordId={selectedRecordId}
            onSelect={selectForWorkbench}
          />
        ) : (
          <Phase0Workbench
            records={phase0Records}
            selectedRecordId={selectedRecordId}
            onSelect={setSelectedRecordId}
            drafts={drafts}
            onUpdateDraft={updateDraft}
            onDeleteDraft={deleteDraft}
          />
        )}
      </section>
    </main>
  );
}
