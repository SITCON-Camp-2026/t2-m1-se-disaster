import { useState } from "react";
import { RecordCard } from "../../components/RecordCard";
import { Phase0JudgementCard } from "./Phase0JudgementCard";
import { createPhase0Judgement } from "./phase0-heuristics";
import type { Phase0MessyRecord, Phase0JudgementDraft } from "./phase0-types";

export function Phase0Workbench({
  records,
  selectedRecordId,
  onSelect,
  drafts,
  onUpdateDraft,
  onDeleteDraft,
}: {
  records: Phase0MessyRecord[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
  drafts: Map<string, Phase0JudgementDraft>;
  onUpdateDraft: (recordId: string, draft: Phase0JudgementDraft) => void;
  onDeleteDraft: (recordId: string) => void;
}) {
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const existingDraft = drafts.get(selectedRecord.id);
  const defaultJudgement = createPhase0Judgement(selectedRecord);
  const currentDraft = existingDraft
    ? {
        ...defaultJudgement,
        ...existingDraft,
        informationElements:
          existingDraft.informationElements ??
          defaultJudgement.informationElements,
        qualityScore:
          existingDraft.qualityScore ?? defaultJudgement.qualityScore,
      }
    : defaultJudgement;
  const [isEditing, setIsEditing] = useState(!!existingDraft);

  function handleCreateDraft() {
    onUpdateDraft(selectedRecord.id, currentDraft);
    setIsEditing(true);
  }

  function handleDeleteDraft() {
    onDeleteDraft(selectedRecord.id);
    setIsEditing(false);
  }

  function handleSaveDraft(updatedDraft: Phase0JudgementDraft) {
    onUpdateDraft(selectedRecord.id, updatedDraft);
  }

  return (
    <div className="workbench">
      <div className="workbench__intro">
        <p className="eyebrow">整理工作台</p>
        <h2>第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。</h2>
        <p>
          針對每筆原始資訊，記錄：資訊類型、信心度、證據、卡住的地方、下一步、人工審核意見。
        </p>
      </div>

      <div className="workbench__layout">
        <aside className="workbench__queue" aria-label="選擇原始資訊">
          <div className="queue-header">
            <h3>原始資訊列表</h3>
            <span className="queue-count">
              {drafts.size} / {records.length}
            </span>
          </div>
          {records.map((record) => (
            <button
              aria-label={record.id}
              className={`queue-item ${record.id === selectedRecord.id ? "active" : ""} ${drafts.has(record.id) ? "has-draft" : ""}`}
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
            >
              <span className="queue-item__id">{record.id}</span>
              {drafts.has(record.id) && (
                <span className="queue-item__badge" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </aside>

        <div className="workbench__main">
          <RecordCard record={selectedRecord} />

          <Phase0JudgementCard
            key={`${selectedRecord.id}:${existingDraft ? "draft" : "new"}`}
            record={selectedRecord}
            draft={currentDraft}
            isEditing={isEditing}
            isNew={!existingDraft}
            onEdit={() => setIsEditing(true)}
            onCreate={handleCreateDraft}
            onSave={handleSaveDraft}
            onDelete={handleDeleteDraft}
          />
        </div>
      </div>
    </div>
  );
}
