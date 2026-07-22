"use client";

import type { ParcelResult } from "@/lib/types";

type Props = {
  loading: boolean;
  error: string | null;
  result: ParcelResult | null;
  onRecheck: () => void;
  onClose: () => void;
};

function kindClass(kind: ParcelResult["verdict"]["kind"]) {
  if (kind === "private") return "is-private";
  if (kind === "public") return "is-public";
  return "is-unknown";
}

export default function ResultPanel({
  loading,
  error,
  result,
  onRecheck,
  onClose,
}: Props) {
  if (!loading && !error && !result) return null;

  return (
    <aside className={`result-panel ${result ? kindClass(result.verdict.kind) : ""}`} aria-live="polite">
      <div className="result-panel__handle" aria-hidden />
      <div className="result-panel__top">
        <p className="result-panel__eyebrow">필지 확인 결과</p>
        <button type="button" className="ghost-btn" onClick={onClose} aria-label="닫기">
          닫기
        </button>
      </div>

      {loading && (
        <div className="result-panel__body">
          <div className="pulse-line" />
          <p className="result-panel__title">지적 정보를 불러오는 중…</p>
          <p className="result-panel__text">연속지적도와 토지임야 속성을 조회합니다.</p>
        </div>
      )}

      {!loading && error && (
        <div className="result-panel__body">
          <p className="result-panel__title">조회에 실패했습니다</p>
          <p className="result-panel__text">{error}</p>
          <button type="button" className="primary-btn" onClick={onRecheck}>
            다시 시도
          </button>
        </div>
      )}

      {!loading && result && (
        <div className="result-panel__body">
          <p className={`verdict-badge ${kindClass(result.verdict.kind)}`}>
            {result.verdict.label}
          </p>
          <p className="result-panel__title">{result.verdict.summary}</p>
          <p className="result-panel__caution">{result.verdict.caution}</p>

          <dl className="meta-grid">
            <div>
              <dt>위치</dt>
              <dd>{result.address ?? "주소 정보 없음"}</dd>
            </div>
            <div>
              <dt>지목</dt>
              <dd>{result.jimok ?? "-"}</dd>
            </div>
            <div>
              <dt>소유구분</dt>
              <dd>{result.ownershipLabel ?? "-"}</dd>
            </div>
            <div>
              <dt>면적</dt>
              <dd>{result.area != null ? `${result.area.toLocaleString()} ㎡` : "-"}</dd>
            </div>
            <div>
              <dt>PNU</dt>
              <dd className="mono">{result.pnu ?? "-"}</dd>
            </div>
            <div>
              <dt>데이터</dt>
              <dd>{result.source === "live" ? "실연동" : "데모"}</dd>
            </div>
          </dl>
        </div>
      )}
    </aside>
  );
}
