const labels: Record<string, string> = {
  field_report: "現場回報",
  phone_call: "電話",
  social_post: "社群轉錄",
  official_notice: "公告截圖或公告轉錄",
  volunteer_update: "志工更新",
  mock: "模擬資料",
};

export function SourceLabel({ sourceType }: { sourceType: string }) {
  return (
    <span className="source-label">
      資訊取得方式：{labels[sourceType] ?? sourceType}
    </span>
  );
}
