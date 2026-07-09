import type { Phase0JudgementDraft, Phase0MessyRecord } from "./phase0-types";

// Detect potential data quality risks from raw text
export function detectRisks(record: Phase0MessyRecord): string[] {
  const risks: string[] = [];
  const text = record.rawText.toLowerCase();

  // Location clarity
  if (
    text.includes("不知道") ||
    text.includes("不確定位置") ||
    text.includes("模糊") ||
    text.includes("大約") ||
    text.includes("似乎")
  ) {
    risks.push("❌ 位置或具體資訊不清楚");
  }

  // Operator vs stakeholder
  if (
    text.includes("有人") ||
    text.includes("社群") ||
    text.includes("聽說") ||
    text.includes("據說") ||
    text.includes("代轉述") ||
    text.includes("家屬")
  ) {
    risks.push("❌ 操作者不是當事人，是二手資訊");
  }

  // Time version conflicts
  if (text.includes("早上") || text.includes("下午") || text.includes("昨天")) {
    risks.push("⚠️ 時間點不清或版本可能已過期");
  }

  // Conflicting information
  if (text.includes("但") || text.includes("另一")) {
    risks.push("⚠️ 存在互相矛盾的報告");
  }

  // Official confirmation missing
  if (text.includes("沒看到官方") || text.includes("未確認")) {
    risks.push("⚠️ 缺官方確認");
  }

  // Privacy / consent
  if (text.includes("不同意") || text.includes("隱私")) {
    risks.push("⚠️ 隱私或同意問題");
  }

  // Unverified status
  if (
    record.verificationStatus === "unverified" ||
    record.verificationStatus === "needs_review"
  ) {
    risks.push("⚠️ 未確認資訊，不能當事實用");
  }

  return [...new Set(risks)]; // Remove duplicates
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectInformationElements(
  record: Phase0MessyRecord,
): Phase0JudgementDraft["informationElements"] {
  const text = record.rawText.toLowerCase();

  return {
    person: hasAny(text, [
      "有人",
      "志工",
      "家屬",
      "長者",
      "居民",
      "回報",
      "當事人",
    ])
      ? "mentioned"
      : "missing",
    event: hasAny(text, [
      "需要",
      "協助",
      "求助",
      "清泥",
      "搬",
      "缺",
      "淹水",
      "封閉",
      "公告",
      "更新",
    ])
      ? "mentioned"
      : "unclear",
    time:
      hasAny(text, ["早上", "下午", "昨天", "現在", "剛剛", "目前"]) ||
      Boolean(record.updatedAt)
        ? "mentioned"
        : "missing",
    place: hasAny(text, [
      "車站",
      "後方",
      "店",
      "地點",
      "集合點",
      "路",
      "橋",
      "村",
    ])
      ? text.includes("不知道") || text.includes("大約")
        ? "unclear"
        : "mentioned"
      : "missing",
    object: hasAny(text, [
      "物資",
      "水",
      "食物",
      "工具",
      "人",
      "地址",
      "集合點",
      "清泥",
    ])
      ? "mentioned"
      : "unclear",
  };
}

function calculateQualityScore(
  record: Phase0MessyRecord,
  risks: string[],
  elements: Phase0JudgementDraft["informationElements"],
) {
  const missingPenalty = Object.values(elements).filter(
    (status) => status === "missing",
  ).length;
  const unclearPenalty = Object.values(elements).filter(
    (status) => status === "unclear",
  ).length;
  const verificationPenalty = record.verificationStatus === "verified" ? 0 : 2;
  const score =
    10 -
    risks.length -
    missingPenalty * 2 -
    unclearPenalty -
    verificationPenalty;

  return Math.min(10, Math.max(1, score));
}

// Heuristic classification based on raw text patterns
export function createPhase0Judgement(
  record: Phase0MessyRecord,
): Phase0JudgementDraft {
  const text = record.rawText.toLowerCase();
  let possibleKind: Phase0JudgementDraft["possibleKind"] = "unknown";

  if (text.includes("需要") || text.includes("協助") || text.includes("求助")) {
    possibleKind = "help_request_candidate";
  } else if (
    text.includes("還有") ||
    text.includes("已經") ||
    text.includes("現在") ||
    text.includes("更新")
  ) {
    possibleKind = "site_status_candidate";
  } else if (
    text.includes("派人") ||
    text.includes("志工") ||
    text.includes("清泥") ||
    text.includes("搬")
  ) {
    possibleKind = "task_candidate";
  } else if (
    text.includes("公告") ||
    text.includes("封閉") ||
    text.includes("規則")
  ) {
    possibleKind = "announcement_candidate";
  }

  const risks = detectRisks(record);
  const isVerified = record.verificationStatus === "verified";
  const informationElements = detectInformationElements(record);

  return {
    messyRecordId: record.id,
    possibleKind,
    confidence:
      risks.length === 0 ? "high" : risks.length <= 2 ? "medium" : "low",
    informationElements,
    qualityScore: calculateQualityScore(record, risks, informationElements),
    evidence: ["此為 starter 初步分類，請檢查並補充判斷依據。"],
    blockers:
      risks.length > 0
        ? risks
        : isVerified
          ? ["仍需確認這筆資訊適合進入哪個後續流程。"]
          : ["目前不是已確認資訊，不能直接行動或當成事實發布。"],
    suggestedNextStep: risks.length > 2 ? "send_to_human_review" : "keep_raw",
    unsafeToActDirectly: risks.length > 0 || !isVerified,
  };
}
