import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("renders starter title", () => {
    render(<App />);
    expect(screen.getByText("災害資訊整理工作台")).toBeInTheDocument();
  });

  it("keeps the home page focused on phase 0 tabs", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: "流程工作台" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "整理工作台" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "原始資訊" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "通報" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "地點" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "志工任務" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "人員指派" }),
    ).not.toBeInTheDocument();
  });

  it("shows review states in the flow workbench", () => {
    render(<App />);

    expect(screen.getAllByText("流程工作台").length).toBeGreaterThan(0);
    expect(screen.getAllByText("待人工確認").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "選擇 M-002" }));

    expect(screen.getAllByText("未查核").length).toBeGreaterThan(0);
  });

  it("prepares editable default drafts in the flow workbench", () => {
    render(<App />);

    expect(screen.getAllByText("流程工作台").length).toBeGreaterThan(0);
    expect(screen.getByText("整理草稿")).toBeInTheDocument();
    expect(screen.getByText("人事時地物")).toBeInTheDocument();
    expect(screen.getByText(/資料完整度分級/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "展開原始資訊" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("證據與依據")).not.toBeInTheDocument();
    expect(screen.queryByText("卡住的地方")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "建立草稿" }),
    ).not.toBeInTheDocument();

    const noteToggle = screen.getByRole("button", {
      name: "填寫人工審核備註",
    });
    expect(noteToggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(noteToggle);

    expect(
      screen.getByRole("button", { name: "收合人工審核備註" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByPlaceholderText("記錄人類質疑、修正或補充的意見"),
    ).toBeInTheDocument();
  });

  it("opens the v1 organizer flow from /v1/ without confirming raw data", () => {
    window.history.replaceState(null, "", "/v1/");

    render(<App />);

    expect(screen.getAllByText("流程工作台").length).toBeGreaterThan(0);
    expect(screen.getByText("資料內容")).toBeInTheDocument();
    expect(screen.queryByText("原始資訊輸入區")).not.toBeInTheDocument();
    expect(screen.getByText("救災所需物品與協調項目")).toBeInTheDocument();
    expect(screen.queryByText("流程判斷")).not.toBeInTheDocument();
    expect(screen.getByText("判斷紀錄")).toBeInTheDocument();
    expect(
      screen.getByText(/所有候選整理結果都需要人工確認/),
    ).toBeInTheDocument();
    expect(screen.queryByText("可直接派工")).not.toBeInTheDocument();
  });

  it("records an operation when v1 creates or updates an intake draft", () => {
    window.history.replaceState(null, "", "/v1/");

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "建立 / 更新待整理草稿" }),
    );

    expect(screen.getByText("建立待整理草稿")).toBeInTheDocument();
    expect(
      screen.getByText("保留原文並建立待整理資料，仍需人工確認。"),
    ).toBeInTheDocument();
  });

  it("confirms a practice review before showing assignable work needs", () => {
    window.history.replaceState(null, "", "/v1/");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "審核通過" }));

    expect(
      screen.getByText("確定要完成這筆資料的人工審核嗎？"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "確定審核" }));

    expect(screen.getByText("工作所需")).toBeInTheDocument();
    expect(screen.getByText("已人工確認")).toBeInTheDocument();
    expect(screen.getByText("可變成任務")).toBeInTheDocument();
    expect(screen.getByText(/任務可指派/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "回到流程工作台" }));

    expect(screen.getAllByText("已人工確認").length).toBeGreaterThan(1);
    expect(screen.getByText("已人工確認資料")).toBeInTheDocument();
    expect(screen.getAllByText("可變成任務").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "審核通過" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "保存" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "刪除" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "資料完整度 1" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "清潔工具" }),
    ).not.toBeInTheDocument();
  });
});
