import { cloudEstimate, economicScenario, roiEstimate } from "../lib/final-round.mjs";
import { roadmap } from "../lib/decision-scenarios";
import { EvidencePanel } from "./DecisionSupport";
import InterventionScenario from "./InterventionScenario";
import { CloudCalculator, OperationalOverview } from "./OperationalPanels";
import Icon from "./Icon";
import { Link, useRoute, workspacePath } from "./router";
import { number } from "./format";
import type { Account } from "./auth";
import {
  decisionOutcomes,
  loopSteps,
  modules,
  plateWaste,
  problemInsight,
  problemStats,
  projectMeta,
  readiness,
  scaleConditions,
  sections,
} from "./projectContent";

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pj-section" id={id} aria-labelledby={id + "-title"}>
      <header className="pj-section-head">
        <span className="pj-eyebrow">{eyebrow}</span>
        <h2 id={id + "-title"}>{title}</h2>
        {lead && <p>{lead}</p>}
      </header>
      {children}
    </section>
  );
}

export default function ProjectInfo({
  account,
  onLogout,
}: {
  account: Account | null;
  onLogout: () => void;
}) {
  const { path } = useRoute();
  const cost = cloudEstimate(1017, 20);
  const roi = roiEstimate(1017, true, false);
  const savingsLow = economicScenario("conservative").ingredientsMax + economicScenario("conservative").paperMax;
  const savingsHigh = economicScenario("optimistic").ingredientsMax;
  const economics = [
    { value: number(roi.capex) + "đ", label: "Đầu tư phần cứng / trạm Vision", note: "ESP32-CAM, cảm biến, nguồn và khung", tag: "DỰ TOÁN" },
    { value: number(cost.total) + "đ", label: "Chi phí đám mây / tháng", note: "1.017 học sinh × 20 ngày học", tag: "DỰ TOÁN" },
    { value: "≈" + number(roi.annualOpex) + "đ", label: "Chi phí đám mây / năm học", note: "Nhân 9 tháng học", tag: "DỰ TOÁN" },
    { value: number(savingsLow / 1e6) + " - " + number(Math.round(savingsHigh / 1e6)) + " triệu đồng", label: "Nguyên liệu tiết kiệm / năm", note: "Phụ thuộc lượng nguyên liệu bếp mua giảm; cận trên, đơn giá giả định", tag: "KỊCH BẢN" },
  ];
  return (
    <div className="project-page">
      <a className="skip-link" href={path + "#content"}>
        Đến nội dung chính
      </a>
      <header className="pj-topbar">
        <Link to="/overview" className="pj-brand" aria-label="EcoTray, về Tổng quan">
          <span className="brandmark">
            <Icon name="leaf" size={22} />
          </span>
          EcoTray
        </Link>
        <nav className="pj-toc" aria-label="Mục trong trang">
          {sections.map(([id, label]) => (
            <a key={id} href={`${path}#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        {account && (
          <div className="pj-actions">
            <Link to={workspacePath()} className="pj-back">
              <span aria-hidden="true">←</span> Không gian làm việc
            </Link>
            <button className="pj-logout" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        )}
      </header>

      <main id="content" tabIndex={-1}>
        <section className="pj-hero" aria-labelledby="pj-title">
          <span className="pj-eyebrow">THÔNG TIN DỰ ÁN</span>
          <h1 id="pj-title">{projectMeta.name}</h1>
          <p className="pj-tagline">{projectMeta.tagline}</p>
          <p className="pj-lead">{projectMeta.lead}</p>
        </section>

        <Section
          id="van-de"
          eyebrow="01 · THỰC ĐỊA"
          title="Thất thoát nằm ở khay trả, không chỉ ở số suất nấu"
        >
          <ul className="pj-stats">
            {problemStats.map((s) => (
              <li key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
                <small>{s.note}</small>
              </li>
            ))}
          </ul>
          <div className="pj-split">
            <article className="panel">
              <div className="section-heading">
                <div>
                  <h3>Phần còn lại theo thành phần</h3>
                  <p>Trung bình ≈44 g thừa/khay · ≈8 tấn/năm</p>
                </div>
                <span className="badge demo">THỰC ĐỊA PTNK</span>
              </div>
              <ul className="pj-bars">
                {plateWaste.map((w) => (
                  <li key={w.label}>
                    <span>{w.label}</span>
                    <div className="pj-bar" role="img" aria-label={`${w.label}: ${number(w.value)}% còn lại`}>
                      <i style={{ width: `${(w.value / 30) * 100}%` }} />
                    </div>
                    <b>{number(w.value)}%</b>
                    {w.note && <small>{w.note}</small>}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel pj-insight">
              <h3>Đứt gãy dữ liệu</h3>
              <p>{problemInsight}</p>
              <div className="pj-chain" aria-label="Chuỗi dữ liệu Đăng ký, Thực nhận, Tiêu thụ">
                <span>Đăng ký</span>
                <span>Thực nhận</span>
                <span className="gap">?</span>
                <span>Tiêu thụ / Bỏ thừa</span>
              </div>
            </article>
          </div>
        </Section>

        <Section
          id="vong-lap"
          eyebrow="02 · GIẢI PHÁP"
          title="Vòng lặp quyết định khép kín"
          lead="Mỗi bữa ăn tạo dữ liệu cho bữa sau: Đăng ký → Thực nhận → Tiêu thụ/Bỏ thừa → Quyết định."
        >
          <ol className="pj-loop">
            {loopSteps.map((step, i) => (
              <li key={step.key}>
                <span className="pj-step-no">{i + 1}</span>
                <small>{step.key}</small>
                <h3>{step.title}</h3>
                <p className="pj-caption">{step.caption}</p>
                <ul>
                  {step.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <h3 className="pj-subhead">Bốn kết quả quyết định</h3>
          <div className="pj-outcomes">
            {decisionOutcomes.map((o) => (
              <article key={o.title}>
                <h4>{o.title}</h4>
                <p className="pj-rule">{o.rule}</p>
                <p>{o.action}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section
          id="mo-dun"
          eyebrow="03 · NHÂN RỘNG"
          title="Kiến trúc ba modules"
          lead="Mỗi trường chọn đầu vào phù hợp và dùng chung vòng phản hồi cho bếp."
        >
          <div className="pj-modules">
            {modules.map((m) => (
              <article key={m.name} className="panel">
                <span className="badge">{m.badge}</span>
                <h3>{m.name}</h3>
                <p>{m.audience}</p>
                <small>{m.inputs}</small>
              </article>
            ))}
          </div>
        </Section>

        <Section id="kiem-chung" eyebrow="04 · BẰNG CHỨNG" title="Kiểm chứng và đồng hành">
          <div className="settings-stack">
            <EvidencePanel />
          </div>
        </Section>

        <Section
          id="hieu-qua"
          eyebrow="05 · KINH TẾ & BỀN VỮNG"
          title="Hiệu quả và chi phí"
        >
          <ul className="pj-stats pj-econ">
            {economics.map((e) => (
              <li key={e.label}>
                <span className="badge demo">{e.tag}</span>
                <strong>{e.value}</strong>
                <span>{e.label}</span>
                <small>{e.note}</small>
              </li>
            ))}
          </ul>
          <div className="settings-stack">
            <InterventionScenario />
            <OperationalOverview />
            <CloudCalculator />
          </div>
        </Section>

        <Section
          id="lo-trinh"
          eyebrow="06 · KẾ HOẠCH"
          title="Lộ trình hành động 3 năm"
          lead="Mục tiêu để lập kế hoạch, chưa phải kết quả đạt được. Không quy đổi CO₂e thành tác động đã kiểm chứng khi chưa chốt hệ số và phương pháp đo."
        >
          <div className="pj-roadmap">
            {roadmap.map((r) => (
              <article key={r.year} className="panel">
                <header>
                  <div>
                    <h3>{r.year}</h3>
                    <small>{r.period}</small>
                  </div>
                  <span className="badge demo">MỤC TIÊU</span>
                </header>
                <p className="pj-goal">{r.goal}</p>
                <p className="pj-scope">{r.scope}</p>
                <dl>
                  <div><dt>Hoạt động chính</dt><dd>{r.work}</dd></div>
                  <div><dt>Người phụ trách</dt><dd>{r.owners}</dd></div>
                  <div><dt>Nguồn lực</dt><dd>{r.resources}<br /><b>{r.budget}</b></dd></div>
                  <div><dt>Chỉ số (KPI)</dt><dd><ul>{r.kpis.map((k) => <li key={k}>{k}</li>)}</ul></dd></div>
                  <div><dt>Kết quả kỳ vọng</dt><dd><ul>{r.outcomes.map((k) => <li key={k}>{k}</li>)}</ul></dd></div>
                  <div><dt>Điều kiện chuyển năm</dt><dd>{r.gate}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </Section>

        <Section id="nhan-rong" eyebrow="07 · SẴN SÀNG" title="Nguồn lực và điều kiện nhân rộng">
          <div className="pj-ready">
            <article className="panel have">
              <h3>Đã có sẵn</h3>
              <ul>{readiness.have.map((t) => <li key={t}>{t}</li>)}</ul>
            </article>
            <article className="panel missing">
              <h3>Chưa có</h3>
              <ul>{readiness.missing.map((t) => <li key={t}>{t}</li>)}</ul>
            </article>
            <article className="panel fallback">
              <h3>Phương án dự phòng</h3>
              <p>{readiness.fallback}</p>
            </article>
          </div>
          <h3 className="pj-subhead">Điều kiện để nhân rộng sang trường khác</h3>
          <dl className="pj-conditions">
            {scaleConditions.map((c) => (
              <div key={c.title}>
                <dt>{c.title}</dt>
                <dd>{c.body}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </main>

      <footer className="pj-footer">
        <span>
          EcoTray <b>·</b> {projectMeta.tagline}
        </span>
        {account && <Link to={workspacePath()}>← Quay lại không gian làm việc</Link>}
      </footer>
    </div>
  );
}
