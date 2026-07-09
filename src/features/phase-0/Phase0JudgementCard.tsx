import { useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import type { Phase0JudgementDraft, Phase0MessyRecord } from "./phase0-types";
import { detectRisks } from "./phase0-heuristics";

const kindLabels: Record<Phase0JudgementDraft["possibleKind"], string> = {
  help_request_candidate: "求助候選",
  site_status_candidate: "地點狀態候選",
  task_candidate: "任務候選",
  assignment_candidate: "人員指派候選",
  announcement_candidate: "公告候選",
  unknown: "待判斷",
};

const confidenceLabels: Record<Phase0JudgementDraft["confidence"], string> = {
  low: "低",
  medium: "中",
  high: "高",
};

const elementLabels: Record<
  keyof Phase0JudgementDraft["informationElements"],
  string
> = {
  person: "人",
  event: "事",
  time: "時",
  place: "地",
  object: "物",
};

const elementStatusLabels: Record<
  Phase0JudgementDraft["informationElements"][keyof Phase0JudgementDraft["informationElements"]],
  string
> = {
  mentioned: "有提到",
  unclear: "不清楚",
  missing: "未提到",
};

const elementStatusOptions = ["mentioned", "unclear", "missing"] as const;

const nextStepLabels: Record<
  Phase0JudgementDraft["suggestedNextStep"],
  string
> = {
  keep_raw: "先保留原始資訊",
  ask_for_more_info: "補問來源或現場資訊",
  send_to_human_review: "交給人工確認",
  create_candidate_report: "建立候選通報",
  create_site_update_suggestion: "建立地點更新建議",
  do_not_use_yet: "暫時不要使用",
};

// Helper function to ensure draft has all required fields
function ensureDraftComplete(
  draft: Partial<Phase0JudgementDraft>,
): Phase0JudgementDraft {
  return {
    messyRecordId: draft.messyRecordId || "",
    possibleKind: draft.possibleKind || "unknown",
    confidence: draft.confidence || "low",
    informationElements: draft.informationElements || {
      person: "missing",
      event: "missing",
      time: "missing",
      place: "missing",
      object: "missing",
    },
    qualityScore: draft.qualityScore ?? 5,
    evidence: draft.evidence || [],
    blockers: draft.blockers || [],
    suggestedNextStep: draft.suggestedNextStep || "keep_raw",
    unsafeToActDirectly: draft.unsafeToActDirectly ?? false,
    humanReviewNote: draft.humanReviewNote,
  };
}

export function Phase0JudgementCard({
  record,
  draft,
  isEditing,
  isNew,
  onEdit,
  onCreate,
  onSave,
  onDelete,
}: {
  record: Phase0MessyRecord;
  draft: Phase0JudgementDraft;
  isEditing: boolean;
  isNew: boolean;
  onEdit: () => void;
  onCreate: () => void;
  onSave: (draft: Phase0JudgementDraft) => void;
  onDelete: () => void;
}) {
  const [editedDraft, setEditedDraft] = useState<Phase0JudgementDraft>(
    ensureDraftComplete(draft),
  );
  const risks = detectRisks(record);

  function handleSave() {
    onSave(editedDraft);
  }

  function addEvidence() {
    setEditedDraft((prev) => ({
      ...prev,
      evidence: [...prev.evidence, ""],
    }));
  }

  function removeEvidence(index: number) {
    setEditedDraft((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index),
    }));
  }

  function updateEvidence(index: number, value: string) {
    setEditedDraft((prev) => ({
      ...prev,
      evidence: prev.evidence.map((e, i) => (i === index ? value : e)),
    }));
  }

  function addBlocker() {
    setEditedDraft((prev) => ({
      ...prev,
      blockers: [...prev.blockers, ""],
    }));
  }

  function removeBlocker(index: number) {
    setEditedDraft((prev) => ({
      ...prev,
      blockers: prev.blockers.filter((_, i) => i !== index),
    }));
  }

  function updateBlocker(index: number, value: string) {
    setEditedDraft((prev) => ({
      ...prev,
      blockers: prev.blockers.map((b, i) => (i === index ? value : b)),
    }));
  }

  function updateInformationElement(
    element: keyof Phase0JudgementDraft["informationElements"],
    status: Phase0JudgementDraft["informationElements"][keyof Phase0JudgementDraft["informationElements"]],
  ) {
    setEditedDraft((prev) => ({
      ...prev,
      informationElements: {
        ...prev.informationElements,
        [element]: status,
      },
    }));
  }

  function updateQualityScore(score: number) {
    setEditedDraft((prev) => ({
      ...prev,
      qualityScore: Math.min(10, Math.max(1, score)),
    }));
  }

  return (
    <article className={`judgement-card ${isEditing ? "editing" : ""}`}>
      <div className="judgement-card__header">
        <div>
          <p className="eyebrow">整理分類</p>
          <h3>{!isNew ? "整理草稿" : "新建整理"}</h3>
        </div>
        <StatusBadge status={record.verificationStatus} />
      </div>

      {!isEditing && isNew ? (
        <div className="judgement-card__actions">
          <button type="button" onClick={onCreate} className="btn-primary">
            建立草稿
          </button>
        </div>
      ) : isEditing ? (
        <div className="judgement-card__editing">
          <section>
            <label>
              <span className="label-text">資訊類型</span>
              <select
                value={editedDraft.possibleKind}
                onChange={(e) =>
                  setEditedDraft((prev) => ({
                    ...prev,
                    possibleKind: e.target
                      .value as Phase0JudgementDraft["possibleKind"],
                  }))
                }
              >
                {Object.entries(kindLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section>
            <label>
              <span className="label-text">信心程度</span>
              <div className="confidence-buttons">
                {(["low", "medium", "high"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`confidence-btn ${editedDraft.confidence === level ? "active" : ""}`}
                    onClick={() =>
                      setEditedDraft((prev) => ({ ...prev, confidence: level }))
                    }
                  >
                    {confidenceLabels[level]}
                  </button>
                ))}
              </div>
            </label>
          </section>

          <section>
            <div className="section-heading">
              <h4>人事時地物</h4>
              <span>只表示原文是否看得出線索</span>
            </div>
            <div className="element-editor">
              {Object.entries(elementLabels).map(([key, label]) => {
                const element =
                  key as keyof Phase0JudgementDraft["informationElements"];

                return (
                  <label key={key}>
                    <span className="label-text">{label}</span>
                    <select
                      value={editedDraft.informationElements[element]}
                      onChange={(e) =>
                        updateInformationElement(
                          element,
                          e.target
                            .value as Phase0JudgementDraft["informationElements"][keyof Phase0JudgementDraft["informationElements"]],
                        )
                      }
                    >
                      {elementStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {elementStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </section>

          <section>
            <label>
              <span className="label-text">
                資料完整度分級：{editedDraft.qualityScore} / 10
              </span>
              <input
                type="range"
                min="1"
                max="10"
                value={editedDraft.qualityScore}
                onChange={(e) => updateQualityScore(Number(e.target.value))}
              />
            </label>
          </section>

          <section>
            <h4>證據與依據</h4>
            <div className="list-editor">
              {editedDraft.evidence.map((item, idx) => (
                <div key={idx} className="list-item">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateEvidence(idx, e.target.value)}
                    placeholder="寫出原文中看得出來的判斷依據"
                  />
                  <button
                    type="button"
                    onClick={() => removeEvidence(idx)}
                    className="btn-remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addEvidence}
                className="btn-add-item"
              >
                + 加一筆
              </button>
            </div>
          </section>

          <section>
            <h4>卡住的地方</h4>
            <div className="list-editor">
              {editedDraft.blockers.map((item, idx) => (
                <div key={idx} className="list-item">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateBlocker(idx, e.target.value)}
                    placeholder="寫出無法判斷或無法行動的原因"
                  />
                  <button
                    type="button"
                    onClick={() => removeBlocker(idx)}
                    className="btn-remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addBlocker}
                className="btn-add-item"
              >
                + 加一筆
              </button>
            </div>
          </section>

          <section>
            <label>
              <span className="label-text">下一步</span>
              <select
                value={editedDraft.suggestedNextStep}
                onChange={(e) =>
                  setEditedDraft((prev) => ({
                    ...prev,
                    suggestedNextStep: e.target
                      .value as Phase0JudgementDraft["suggestedNextStep"],
                  }))
                }
              >
                {Object.entries(nextStepLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editedDraft.unsafeToActDirectly}
                onChange={(e) =>
                  setEditedDraft((prev) => ({
                    ...prev,
                    unsafeToActDirectly: e.target.checked,
                  }))
                }
              />
              <span>不可直接行動</span>
            </label>
          </section>

          <section>
            <label>
              <span className="label-text">人工審核備註</span>
              <textarea
                value={editedDraft.humanReviewNote ?? ""}
                onChange={(e) =>
                  setEditedDraft((prev) => ({
                    ...prev,
                    humanReviewNote: e.target.value,
                  }))
                }
                placeholder="記錄人類質疑、修正或補充的意見"
              />
            </label>
          </section>

          <div className="judgement-card__actions">
            <button type="button" onClick={handleSave} className="btn-primary">
              保存
            </button>
            <button type="button" onClick={onDelete} className="btn-delete">
              刪除
            </button>
          </div>
        </div>
      ) : null}

      {!isEditing && !isNew ? (
        <div className="judgement-card__view">
          <dl className="judgement-summary">
            <div>
              <dt>資訊類型</dt>
              <dd>{kindLabels[editedDraft.possibleKind]}</dd>
            </div>
            <div>
              <dt>資料完整度分級</dt>
              <dd>{editedDraft.qualityScore} / 10</dd>
            </div>
            <div>
              <dt>下一步</dt>
              <dd>{nextStepLabels[editedDraft.suggestedNextStep]}</dd>
            </div>
          </dl>

          <section>
            <h4>人事時地物</h4>
            <dl className="element-grid">
              {Object.entries(elementLabels).map(([key, label]) => {
                const element =
                  key as keyof Phase0JudgementDraft["informationElements"];
                const status = editedDraft.informationElements[element];

                return (
                  <div key={key} className={`element-status ${status}`}>
                    <dt>{label}</dt>
                    <dd>{elementStatusLabels[status]}</dd>
                  </div>
                );
              })}
            </dl>
          </section>

          {risks.length > 0 && (
            <section>
              <h4>⚠️ 自動檢測風險</h4>
              <ul className="risk-list">
                {risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4>證據與依據</h4>
            <ul>
              {editedDraft.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>卡住的地方</h4>
            <ul>
              {editedDraft.blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {editedDraft.humanReviewNote && (
            <section>
              <h4>人工審核意見</h4>
              <p>{editedDraft.humanReviewNote}</p>
            </section>
          )}

          <div className="judgement-card__actions">
            <button type="button" onClick={onEdit} className="btn-secondary">
              編輯
            </button>
            <button type="button" onClick={onDelete} className="btn-delete">
              刪除
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
