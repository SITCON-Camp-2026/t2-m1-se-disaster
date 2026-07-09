import { useMemo, useState } from "react";
import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/date";
import { Phase0JudgementCard } from "../phase-0/Phase0JudgementCard";
import { createPhase0Judgement } from "../phase-0/phase0-heuristics";
import type {
  Phase0JudgementDraft,
  Phase0MessyRecord,
} from "../phase-0/phase0-types";

const roleOptions = [
  "待人工確認",
  "當事人",
  "現場志工",
  "目擊者",
  "二手轉述者",
  "遠端家屬或來電者",
];

const needTypeOptions = [
  "待人工確認",
  "人力協助",
  "物資狀態",
  "地點狀態",
  "道路或公告",
  "隱私或安全疑慮",
];

const supplyOptions = [
  "清潔工具",
  "雨鞋",
  "飲用水",
  "水電工具",
  "搬運人力",
  "藥品確認",
  "集合點協調",
  "隱私確認",
];

type FlowSignal = {
  label: string;
  className: "needs-review" | "blocked" | "candidate" | "approved";
  detail: string;
};

type OperationLog = {
  id: string;
  recordId: string;
  action: string;
  reason: string;
};

const kindLabels: Record<Phase0JudgementDraft["possibleKind"], string> = {
  help_request_candidate: "求助候選",
  site_status_candidate: "地點狀態候選",
  task_candidate: "任務候選",
  assignment_candidate: "人員指派候選",
  announcement_candidate: "公告候選",
  unknown: "待判斷",
};

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

function inferSupplies(record: Phase0MessyRecord) {
  const text = record.rawText;
  const supplies = new Set<string>();

  if (text.includes("清泥") || text.includes("鏟子")) {
    supplies.add("清潔工具");
    supplies.add("搬運人力");
  }
  if (text.includes("雨鞋")) supplies.add("雨鞋");
  if (text.includes("飲用水") || text.includes("水")) supplies.add("飲用水");
  if (text.includes("水電")) supplies.add("水電工具");
  if (text.includes("搬") || text.includes("家具")) supplies.add("搬運人力");
  if (text.includes("藥")) supplies.add("藥品確認");
  if (text.includes("集合點")) supplies.add("集合點協調");
  if (
    text.includes("同意") ||
    text.includes("家屬") ||
    text.includes("長者") ||
    text.includes("地址")
  ) {
    supplies.add("隱私確認");
  }

  return Array.from(supplies);
}

function getFlowSignals(
  draft: Phase0JudgementDraft,
  isApproved = false,
): FlowSignal[] {
  if (isApproved) {
    return [
      {
        label: "已人工確認",
        className: "approved",
        detail: "資訊整理者已在課堂練習中完成審核。",
      },
      {
        label: "可變成任務",
        className: "approved",
        detail: "這筆資料可進入任務指派示範，但不代表真實救災資訊已查證。",
      },
    ];
  }

  const signals: FlowSignal[] = [];

  if (
    draft.suggestedNextStep === "send_to_human_review" ||
    draft.qualityScore <= 4
  ) {
    signals.push({
      label: "需要人工確認",
      className: "needs-review",
      detail: "資料不足、分數極端或風險較高，需要人類檢查。",
    });
  }

  if (
    draft.unsafeToActDirectly ||
    draft.suggestedNextStep === "do_not_use_yet"
  ) {
    signals.push({
      label: "不能直接變成任務",
      className: "blocked",
      detail: "看起來有線索，但仍不能被當成可派工任務。",
    });
  }

  signals.push({
    label: "候選整理結果",
    className: "candidate",
    detail: "可以提供下一位協作者檢查，但仍不是已確認事實。",
  });

  return signals;
}

function countByState(
  drafts: Map<string, Phase0JudgementDraft>,
  approvedRecordIds: Set<string>,
) {
  const counts = {
    needsReview: 0,
    blocked: 0,
    candidate: 0,
    approved: 0,
  };

  drafts.forEach((draft, recordId) => {
    const signals = getFlowSignals(draft, approvedRecordIds.has(recordId));
    if (signals.some((signal) => signal.className === "approved")) {
      counts.approved += 1;
    }
    if (signals.some((signal) => signal.className === "needs-review")) {
      counts.needsReview += 1;
    }
    if (signals.some((signal) => signal.className === "blocked")) {
      counts.blocked += 1;
    }
    if (signals.some((signal) => signal.className === "candidate")) {
      counts.candidate += 1;
    }
  });

  return counts;
}

export function V1OrganizerWorkbench({
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
  const defaultJudgement = createPhase0Judgement(selectedRecord);
  const existingDraft = drafts.get(selectedRecord.id);
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
  const [reporterRoles, setReporterRoles] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [needTypes, setNeedTypes] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [supplySelections, setSupplySelections] = useState<
    Map<string, string[]>
  >(() => new Map());
  const [isRawExpanded, setIsRawExpanded] = useState(false);
  const [reviewStep, setReviewStep] = useState<"editing" | "confirm" | "done">(
    "editing",
  );
  const [approvedRecordIds, setApprovedRecordIds] = useState<Set<string>>(
    () => new Set(),
  );

  const isSelectedApproved = approvedRecordIds.has(selectedRecord.id);
  const stateCounts = useMemo(
    () => countByState(drafts, approvedRecordIds),
    [approvedRecordIds, drafts],
  );
  const reporterRole = reporterRoles.get(selectedRecord.id) ?? roleOptions[0];
  const needType = needTypes.get(selectedRecord.id) ?? needTypeOptions[0];
  const selectedLogs = operationLogs.filter(
    (log) => log.recordId === selectedRecord.id,
  );
  const selectedSupplies =
    supplySelections.get(selectedRecord.id) ?? inferSupplies(selectedRecord);

  function addOperationLog(action: string, reason: string) {
    setOperationLogs((prev) => [
      {
        id: `${selectedRecord.id}-${Date.now()}-${prev.length}`,
        recordId: selectedRecord.id,
        action,
        reason,
      },
      ...prev,
    ]);
  }

  function handleCreateDraft() {
    onUpdateDraft(selectedRecord.id, currentDraft);
    setIsEditing(true);
    addOperationLog(
      "建立待整理草稿",
      "保留原文並建立待整理資料，仍需人工確認。",
    );
  }

  function handleSaveDraft(updatedDraft: Phase0JudgementDraft) {
    onUpdateDraft(selectedRecord.id, updatedDraft);
    addOperationLog(
      "保存整理判斷",
      "資訊整理者更新候選判斷、卡住原因或人工審核備註。",
    );
  }

  function handleDeleteDraft() {
    onDeleteDraft(selectedRecord.id);
    setIsEditing(false);
    addOperationLog("刪除整理草稿", "暫時不採用這份整理結果，保留原始資訊。");
  }

  function updateReporterRole(value: string) {
    setReporterRoles((prev) => new Map(prev).set(selectedRecord.id, value));
  }

  function updateNeedType(value: string) {
    setNeedTypes((prev) => new Map(prev).set(selectedRecord.id, value));
  }

  function toggleSupply(supply: string) {
    setSupplySelections((prev) => {
      const next = new Map(prev);
      const current =
        next.get(selectedRecord.id) ?? inferSupplies(selectedRecord);
      next.set(
        selectedRecord.id,
        current.includes(supply)
          ? current.filter((item) => item !== supply)
          : [...current, supply],
      );
      return next;
    });
  }

  function openReviewConfirm() {
    setReviewStep("confirm");
  }

  function cancelReviewConfirm() {
    setReviewStep("editing");
  }

  function completeReview() {
    setApprovedRecordIds((prev) => new Set(prev).add(selectedRecord.id));
    setReviewStep("done");
    addOperationLog(
      "完成課堂人工審核",
      "整理者確認目前練習草稿可進入指派示範；不代表真實救災資訊已查證。",
    );
  }

  if (reviewStep === "confirm") {
    return (
      <div
        className="review-screen"
        role="dialog"
        aria-labelledby="review-title"
      >
        <div>
          <p className="eyebrow">人工審核確認</p>
          <h2 id="review-title">確定要完成這筆資料的人工審核嗎？</h2>
          <p>
            這只代表課堂練習中的人工確認完成，並不代表真實災害資訊已經被查證。
          </p>
        </div>
        <div className="review-screen__actions">
          <button
            className="btn-secondary"
            type="button"
            onClick={cancelReviewConfirm}
          >
            取消
          </button>
          <button
            className="btn-primary"
            type="button"
            onClick={completeReview}
          >
            確定審核
          </button>
        </div>
      </div>
    );
  }

  if (reviewStep === "done") {
    return (
      <div className="review-screen review-screen--done">
        <div>
          <p className="eyebrow">審核完成</p>
          <h2>工作所需</h2>
          <div className="signal-row" aria-label="審核完成狀態">
            <span className="flow-state approved">已人工確認</span>
            <span className="flow-state approved">可變成任務</span>
          </div>
          <p>
            任務可指派：這是課堂練習狀態，表示整理者已完成本頁人工審核，
            仍不可當作真實救災派工依據。
          </p>
        </div>
        <ul className="supply-summary">
          {selectedSupplies.length > 0 ? (
            selectedSupplies.map((supply) => <li key={supply}>{supply}</li>)
          ) : (
            <li>尚未勾選工作所需物品</li>
          )}
        </ul>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => setReviewStep("editing")}
        >
          回到流程工作台
        </button>
      </div>
    );
  }

  return (
    <div className="v1-workbench">
      <section className="v1-banner" aria-labelledby="v1-title">
        <div>
          <p className="eyebrow">流程工作台</p>
          <h2 id="v1-title">把雜亂回報先整理成可檢查的候選，不直接派工。</h2>
          <p>
            這個畫面仍只使用 Phase 0 原始資訊。所有候選整理結果都需要人工確認，
            不代表已確認，也不代表可以直接採取救災行動。
          </p>
          <p>
            下方統計來自系統自動初判草稿，目的是提醒整理者先檢查，不是人工結論。
          </p>
        </div>
        <dl className="v1-state-summary" aria-label="自動初判流程狀態統計">
          <div>
            <dt>初判需確認</dt>
            <dd>{stateCounts.needsReview}</dd>
          </div>
          <div>
            <dt>初判不能變任務</dt>
            <dd>{stateCounts.blocked}</dd>
          </div>
          <div>
            <dt>初判候選</dt>
            <dd>{stateCounts.candidate}</dd>
          </div>
          <div>
            <dt>已人工確認</dt>
            <dd>{stateCounts.approved}</dd>
          </div>
        </dl>
      </section>

      <div className="v1-layout">
        <aside className="v1-record-list" aria-label="待整理資料">
          <div className="queue-header">
            <h3>待整理資料</h3>
            <span className="queue-count">{records.length} 筆</span>
          </div>
          {records.map((record) => {
            const draft =
              drafts.get(record.id) ?? createPhase0Judgement(record);
            const signals = getFlowSignals(
              draft,
              approvedRecordIds.has(record.id),
            );

            return (
              <button
                aria-label={`選擇 ${record.id}`}
                className={`v1-record-list__item ${record.id === selectedRecord.id ? "active" : ""}`}
                key={record.id}
                type="button"
                onClick={() => onSelect(record.id)}
              >
                <span>{record.id}</span>
                <span className="signal-stack" aria-label="流程安全訊號">
                  {signals.map((signal) => (
                    <small
                      className={`flow-state ${signal.className}`}
                      key={signal.label}
                    >
                      {signal.label}
                    </small>
                  ))}
                </span>
              </button>
            );
          })}
        </aside>

        <div className="v1-main">
          <section
            className="intake-panel"
            aria-labelledby="data-content-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">資料內容</p>
                <h3 id="data-content-title">保留原文、整理欄位與工作所需</h3>
              </div>
              <label className="status-field">
                <span className="label-text">查核狀態</span>
                {isSelectedApproved ? (
                  <span className="status-badge status-practice-approved">
                    已人工確認
                  </span>
                ) : (
                  <StatusBadge status={selectedRecord.verificationStatus} />
                )}
              </label>
            </div>

            <button
              className="raw-toggle"
              type="button"
              aria-expanded={isRawExpanded}
              onClick={() => setIsRawExpanded((current) => !current)}
            >
              {isRawExpanded ? "收合原始資訊" : "展開原始資訊"}
            </button>

            {isRawExpanded && (
              <div className="raw-content">
                <p>{selectedRecord.rawText}</p>
                <p className="field-note">
                  這裡用 Phase 0 既有原始資訊模擬「貼上回報內容」；流程工作台
                  不新增真實資料，也不寫入新的資料檔。
                </p>
              </div>
            )}

            <div className="intake-grid">
              <label>
                <span className="label-text">取得方式</span>
                <SourceLabel sourceType={selectedRecord.sourceType} />
              </label>
              <label>
                <span className="label-text">回報者角色</span>
                <select
                  value={reporterRole}
                  onChange={(event) => updateReporterRole(event.target.value)}
                >
                  {roleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label-text">需求類型</span>
                <select
                  aria-describedby="practice-field-note"
                  value={needType}
                  onChange={(event) => updateNeedType(event.target.value)}
                >
                  {needTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label-text">原始更新時間</span>
                <span className="readonly-field">
                  {formatDateTime(selectedRecord.updatedAt)}
                </span>
              </label>
            </div>
            <p className="field-note" id="practice-field-note">
              回報者角色與需求類型是本次練習標記，會跟著目前畫面暫存，不代表已確認資料。
            </p>

            <div
              className="data-content__supplies"
              aria-labelledby="supplies-title"
            >
              <div>
                <h4 id="supplies-title">救災所需物品與協調項目</h4>
                <p className="field-note">
                  已依原始文字做 AI 初判勾選，請由資訊整理者人工檢查。
                </p>
              </div>
              {isSelectedApproved ? (
                <ul className="readonly-list">
                  {selectedSupplies.length > 0 ? (
                    selectedSupplies.map((supply) => (
                      <li key={supply}>{supply}</li>
                    ))
                  ) : (
                    <li>尚未勾選工作所需物品</li>
                  )}
                </ul>
              ) : (
                <div className="supply-options">
                  {supplyOptions.map((supply) => (
                    <label className="supply-option" key={supply}>
                      <input
                        type="checkbox"
                        checked={selectedSupplies.includes(supply)}
                        onChange={() => toggleSupply(supply)}
                      />
                      <span>{supply}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              className="btn-primary"
              type="button"
              onClick={handleCreateDraft}
            >
              建立 / 更新待整理草稿
            </button>
          </section>

          <section className="operation-log-panel" aria-labelledby="log-title">
            <div>
              <p className="eyebrow">判斷紀錄</p>
              <h3 id="log-title">誰做了什麼判斷，以及為什麼</h3>
            </div>
            {selectedLogs.length > 0 ? (
              <ol className="operation-log">
                {selectedLogs.map((log) => (
                  <li key={log.id}>
                    <strong>{log.action}</strong>
                    <span>資訊整理者（課堂練習）處理 {log.recordId}</span>
                    <p>{log.reason}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="field-note">
                尚未留下人工操作紀錄。建立、保存或刪除整理草稿後，這裡會顯示原因。
              </p>
            )}
          </section>

          {isSelectedApproved ? (
            <section
              className="readonly-review-panel"
              aria-labelledby="readonly-review-title"
            >
              <div className="judgement-card__header">
                <div>
                  <p className="eyebrow">整理草稿</p>
                  <h3 id="readonly-review-title">已人工確認資料</h3>
                </div>
                <span className="status-badge status-practice-approved">
                  已人工確認
                </span>
              </div>
              <dl className="readonly-summary">
                <div>
                  <dt>資訊類型</dt>
                  <dd>{kindLabels[currentDraft.possibleKind]}</dd>
                </div>
                <div>
                  <dt>資料完整度</dt>
                  <dd>{currentDraft.qualityScore} / 10</dd>
                </div>
                <div>
                  <dt>下一步</dt>
                  <dd>{nextStepLabels[currentDraft.suggestedNextStep]}</dd>
                </div>
                <div>
                  <dt>回報者角色</dt>
                  <dd>{reporterRole}</dd>
                </div>
                <div>
                  <dt>需求類型</dt>
                  <dd>{needType}</dd>
                </div>
                <div>
                  <dt>審核狀態</dt>
                  <dd>可變成任務</dd>
                </div>
              </dl>
              {currentDraft.humanReviewNote && (
                <div className="readonly-note">
                  <h4>人工審核備註</h4>
                  <p>{currentDraft.humanReviewNote}</p>
                </div>
              )}
            </section>
          ) : (
            <Phase0JudgementCard
              key={`${selectedRecord.id}:${existingDraft ? "draft" : "new"}`}
              record={selectedRecord}
              draft={currentDraft}
              isEditing={isEditing}
              isNew={!existingDraft}
              isHumanApproved={isSelectedApproved}
              onEdit={() => setIsEditing(true)}
              onCreate={handleCreateDraft}
              onSave={handleSaveDraft}
              onDelete={handleDeleteDraft}
            />
          )}

          {!isSelectedApproved && (
            <button
              className="btn-primary review-submit"
              type="button"
              onClick={openReviewConfirm}
            >
              審核通過
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
