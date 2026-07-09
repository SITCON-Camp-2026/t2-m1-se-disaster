import { describe, expect, it } from "vitest";
import messyReports from "../src/fixtures/phase-0/messy-reports.json";
import { createPhase0Judgement } from "../src/features/phase-0/phase0-heuristics";

describe("phase 0 heuristics", () => {
  it("loads the current phase 0 messy data", () => {
    expect(messyReports).toHaveLength(12);
    expect(messyReports.map((record) => record.id)).toEqual(
      Array.from(
        { length: 12 },
        (_, index) => `M-${String(index + 1).padStart(3, "0")}`,
      ),
    );
  });

  it("creates conservative editable drafts for all records", () => {
    const judgements = messyReports.map(createPhase0Judgement);

    expect(judgements).toHaveLength(messyReports.length);
    expect(
      judgements.filter((judgement) => judgement.unsafeToActDirectly),
    ).toHaveLength(messyReports.length);
    expect(
      judgements.every(
        (judgement) =>
          judgement.qualityScore >= 1 && judgement.qualityScore <= 10,
      ),
    ).toBe(true);
    expect(
      judgements.every(
        (judgement) =>
          Object.keys(judgement.informationElements).join(",") ===
          "person,event,time,place,object",
      ),
    ).toBe(true);
  });

  it("does not treat review-needed records as confirmed facts", () => {
    const judgement = createPhase0Judgement(messyReports[9]);

    expect(messyReports[9].verificationStatus).toBe("needs_review");
    expect(judgement.unsafeToActDirectly).toBe(true);
    expect(judgement.evidence.join(" ")).not.toContain("verified");
  });

  it("keeps AI classification as candidate judgement instead of confirmed fact", () => {
    const judgement = createPhase0Judgement(messyReports[10]);

    expect(judgement.possibleKind).toBe("help_request_candidate");
    expect(judgement.suggestedNextStep).toBe("send_to_human_review");
    expect(judgement.unsafeToActDirectly).toBe(true);
    expect(judgement.informationElements.person).toBe("mentioned");
  });
});
