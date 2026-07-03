import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Plus, ArrowLeft, TrendingUp, TrendingDown, Package,
  Clock, CheckCircle2, Circle, Trash2, X, Wallet, AlertTriangle,
  ChevronRight, Pencil, Image as ImageIcon, Upload,
} from "lucide-react";

// ---------- design tokens ----------
const T = {
  bg: "#F3F0E4",
  surface: "#FFFFFF",
  surfaceAlt: "#FBF8EF",
  ink: "#241E17",
  inkSoft: "#6E6255",
  inkFaint: "#A79C89",
  accent: "#5B6B47",
  accentDark: "#43512F",
  accentSoft: "#E3E8D6",
  oak: "#B4854E",
  oakSoft: "#F1E2CB",
  income: "#3D7350",
  incomeSoft: "#E1EEE0",
  expense: "#A24831",
  expenseSoft: "#F5E2DB",
  border: "#E3D9C0",
  borderStrong: "#D2C4A3",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
`;

const DEFAULT_STAGES = [
  "Order diterima & disepakati",
  "DP ke produsen dibayar",
  "Produksi berjalan",
  "Quality check / barang siap",
  "Pengiriman ke konsumen",
  "Pelunasan diterima",
  "Proyek selesai",
];

const CATEGORIES = ["Kursi", "Meja", "Lemari", "Sofa", "Kitchen Set", "Tempat Tidur", "Rak", "Lainnya"];

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function resizeImageToDataUrl(file, maxWidth = 900, quality = 0.68) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtRp = (n) => "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");
const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

function newProject({ name, customerName, producerName, category, buyPrice, sellPrice, createdAt }) {
  return {
    id: uid(),
    name, customerName, producerName, category,
    buyPrice: Number(buyPrice) || 0,
    sellPrice: Number(sellPrice) || 0,
    createdAt: createdAt || todayISO(),
    transactions: [],
    photos: [],
    timeline: DEFAULT_STAGES.map((label, i) => ({
      id: uid(), label, order: i, targetDate: "", actualDate: "", done: false, note: "",
    })),
  };
}

function projectStatus(p) {
  const done = p.timeline.filter((s) => s.done).length;
  if (done === 0) return "Baru";
  if (done === p.timeline.length) return "Selesai";
  return "Berjalan";
}

function currentStageIndex(p) {
  const idx = p.timeline.findIndex((s) => !s.done);
  return idx === -1 ? p.timeline.length - 1 : idx;
}

function isLate(p) {
  const idx = currentStageIndex(p);
  const stage = p.timeline[idx];
  if (!stage || stage.done || !stage.targetDate) return false;
  return stage.targetDate < todayISO();
}

// ---------- tag badge (signature element) ----------
function Tag({ children, tone = "accent", size = "md" }) {
  const map = {
    accent: { bg: T.accentSoft, fg: T.accentDark, hole: T.bg },
    oak: { bg: T.oakSoft, fg: "#7A5A2E", hole: T.bg },
    income: { bg: T.incomeSoft, fg: T.income, hole: T.bg },
    expense: { bg: T.expenseSoft, fg: T.expense, hole: T.bg },
    faint: { bg: "#EFEBDD", fg: T.inkSoft, hole: T.bg },
  }[tone];
  const pad = size === "sm" ? "3px 10px 3px 18px" : "5px 14px 5px 22px";
  const fontSize = size === "sm" ? 11 : 12.5;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        background: map.bg,
        color: map.fg,
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        fontSize,
        padding: pad,
        borderRadius: "3px 8px 8px 3px",
        whiteSpace: "nowrap",
        letterSpacing: 0.1,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: size === "sm" ? 6 : 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: size === "sm" ? 4 : 5,
          height: size === "sm" ? 4 : 5,
          borderRadius: "50%",
          background: map.hole,
          border: `1px solid ${map.fg}55`,
        }}
      />
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, tone = "ink" }) {
  const color = { ink: T.ink, income: T.income, expense: T.expense, oak: T.oak }[tone];
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: T.inkSoft, fontWeight: 500 }}>
          {label}
        </span>
        {Icon && <Icon size={15} color={color} strokeWidth={2} />}
      </div>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 21,
          fontWeight: 500,
          color,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
      {sub && <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkFaint }}>{sub}</span>}
    </div>
  );
}

function Button({ children, onClick, variant = "default", icon: Icon, style, type = "button" }) {
  const variants = {
    default: { bg: T.surface, fg: T.ink, border: T.borderStrong },
    primary: { bg: T.accent, fg: "#fff", border: T.accent },
    danger: { bg: "transparent", fg: T.expense, border: T.expenseSoft },
    ghost: { bg: "transparent", fg: T.inkSoft, border: "transparent" },
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: variants.bg,
        color: variants.fg,
        border: `1px solid ${variants.border}`,
        borderRadius: 9,
        padding: "8px 14px",
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        ...style,
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500, color: T.inkSoft }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: "8px 10px",
  fontFamily: "Inter, sans-serif",
  fontSize: 13.5,
  color: T.ink,
  background: T.surfaceAlt,
  outline: "none",
};

// ---------- App ----------
export default function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("dashboard"); // dashboard | list | detail | new
  const [selectedId, setSelectedId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const idx = await window.storage.list("project:", false);
      const keys = idx?.keys || [];
      const items = [];
      for (const k of keys) {
        try {
          const r = await window.storage.get(k, false);
          if (r?.value) items.push(JSON.parse(r.value));
        } catch (e) {}
      }
      items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setProjects(items);
    } catch (e) {
      setError("Gagal memuat data. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const persist = async (project) => {
    await window.storage.set(`project:${project.id}`, JSON.stringify(project), false);
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      const next = exists ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev];
      return next;
    });
  };

  const removeProject = async (id) => {
    await window.storage.delete(`project:${id}`, false);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setView("list");
  };

  const selected = projects.find((p) => p.id === selectedId) || null;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: T.bg, minHeight: 500, borderRadius: 16, padding: "22px 22px 30px" }}>
      <style>{FONTS}</style>
      <TopBar view={view} setView={setView} onNew={() => setView("new")} />

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: T.inkSoft, fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
          Memuat data tersimpan…
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: "center", color: T.expense, fontSize: 13.5 }}>{error}</div>
      ) : view === "dashboard" ? (
        <Dashboard projects={projects} onOpenProject={(id) => { setSelectedId(id); setView("detail"); }} onGoList={() => setView("list")} />
      ) : view === "list" ? (
        <ProjectList projects={projects} onOpen={(id) => { setSelectedId(id); setView("detail"); }} onNew={() => setView("new")} />
      ) : view === "new" ? (
        <ProjectForm onCancel={() => setView("list")} onSave={async (data) => {
          const p = newProject(data);
          await persist(p);
          setSelectedId(p.id);
          setView("detail");
        }} />
      ) : view === "detail" && selected ? (
        <ProjectDetail
          project={selected}
          onBack={() => setView("list")}
          onSave={persist}
          onDelete={removeProject}
        />
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: T.inkSoft }}>Proyek tidak ditemukan.</div>
      )}
    </div>
  );
}

function TopBar({ view, setView, onNew }) {
  const tabs = [
    { id: "dashboard", label: "Dasbor" },
    { id: "list", label: "Daftar proyek" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 23, fontWeight: 600, color: T.ink, margin: 0 }}>
          Isakuiki Interior
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: T.inkSoft, margin: "3px 0 0" }}>
          Catatan proyek, arus kas, dan progres kerja
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "7px 14px",
                borderRadius: 7,
                fontFamily: "Inter, sans-serif",
                fontSize: 12.5,
                fontWeight: 500,
                background: view === t.id || (t.id === "list" && view === "detail") ? T.accent : "transparent",
                color: view === t.id || (t.id === "list" && view === "detail") ? "#fff" : T.inkSoft,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="primary" icon={Plus} onClick={onNew}>Proyek baru</Button>
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ projects, onOpenProject, onGoList }) {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const ongoing = projects.filter((p) => projectStatus(p) !== "Selesai");
  const late = projects.filter(isLate);

  const profitThisMonth = projects
    .filter((p) => (p.createdAt || "").slice(0, 7) === thisMonthKey)
    .reduce((s, p) => s + (p.sellPrice - p.buyPrice), 0);

  const totalProfit = projects.reduce((s, p) => s + (p.sellPrice - p.buyPrice), 0);

  const monthlyProfit = useMemo(() => {
    const buckets = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = { key, label: MONTHS_ID[d.getMonth()], profit: 0 };
    }
    projects.forEach((p) => {
      const key = (p.createdAt || "").slice(0, 7);
      if (buckets[key]) buckets[key].profit += p.sellPrice - p.buyPrice;
    });
    return Object.values(buckets);
  }, [projects]);

  const categoryDist = useMemo(() => {
    const m = {};
    projects.forEach((p) => {
      const cat = p.category || "Lainnya";
      m[cat] = (m[cat] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const cashflow = useMemo(() => {
    const buckets = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = { key, label: MONTHS_ID[d.getMonth()], masuk: 0, keluar: 0 };
    }
    projects.forEach((p) => {
      (p.transactions || []).forEach((t) => {
        const key = (t.date || "").slice(0, 7);
        if (buckets[key]) {
          if (t.type === "in") buckets[key].masuk += Number(t.amount) || 0;
          else buckets[key].keluar += Number(t.amount) || 0;
        }
      });
    });
    return Object.values(buckets);
  }, [projects]);

  const PIE_COLORS = [T.accent, T.oak, "#8B9C6E", "#D6A85C", "#3D7350", "#A24831", "#6E6255"];

  if (projects.length === 0) {
    return (
      <div style={{ background: T.surface, border: `1px dashed ${T.borderStrong}`, borderRadius: 14, padding: "50px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: "Fraunces, serif", fontSize: 17, color: T.ink, margin: "0 0 6px" }}>Belum ada proyek</p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: T.inkSoft, margin: "0 0 16px" }}>
          Tambahkan proyek pertama untuk mulai mencatat keuntungan dan progres kerja.
        </p>
        <Button variant="primary" icon={Plus} onClick={onGoList}>Lihat daftar proyek</Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <StatCard label="Proyek berjalan" value={ongoing.length} icon={Package} tone="ink" />
        <StatCard label="Keuntungan bulan ini" value={fmtRp(profitThisMonth)} icon={TrendingUp} tone="income" />
        <StatCard label="Total keuntungan" value={fmtRp(totalProfit)} icon={Wallet} tone="oak" />
        <StatCard label="Proyek telat" value={late.length} icon={AlertTriangle} tone="expense" sub={late.length ? "perlu perhatian" : "aman terkendali"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <ChartCard title="Keuntungan per bulan">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={monthlyProfit} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={T.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.inkSoft, fontFamily: "Inter" }} axisLine={{ stroke: T.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: T.inkFaint, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={46}
                tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v)} />
              <Tooltip formatter={(v) => fmtRp(v)} contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }} />
              <Bar dataKey="profit" fill={T.accent} radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Jenis pekerjaan">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={categoryDist} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
                {categoryDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 4 }}>
            {categoryDist.map((c, i) => (
              <span key={c.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.inkSoft, fontFamily: "Inter" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {c.name} ({c.value})
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Arus kas (uang masuk vs keluar)">
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={cashflow} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={T.border} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.inkSoft, fontFamily: "Inter" }} axisLine={{ stroke: T.border }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: T.inkFaint, fontFamily: "Inter" }} axisLine={false} tickLine={false} width={46}
              tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v)} />
            <Tooltip formatter={(v) => fmtRp(v)} contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }} />
            <Line type="monotone" dataKey="masuk" stroke={T.income} strokeWidth={2} dot={{ r: 3 }} name="Uang masuk" />
            <Line type="monotone" dataKey="keluar" stroke={T.expense} strokeWidth={2} dot={{ r: 3 }} name="Uang keluar" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.inkSoft, fontFamily: "Inter" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: T.income }} /> Uang masuk
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.inkSoft, fontFamily: "Inter" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: T.expense }} /> Uang keluar
          </span>
        </div>
      </ChartCard>

      {late.length > 0 && (
        <div>
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 8px" }}>Perlu perhatian</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {late.map((p) => (
              <RowCard key={p.id} project={p} onClick={() => onOpenProject(p.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px" }}>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>{title}</p>
      {children}
    </div>
  );
}

function RowCard({ project, onClick }) {
  const status = projectStatus(project);
  const late = isLate(project);
  const statusTone = status === "Selesai" ? "income" : status === "Berjalan" ? "accent" : "faint";
  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {project.name}
        </p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft, margin: "2px 0 0" }}>
          {project.customerName} · {project.category}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {late && <Tag tone="expense" size="sm">Telat</Tag>}
        <Tag tone={statusTone} size="sm">{status}</Tag>
        <ChevronRight size={16} color={T.inkFaint} />
      </div>
    </div>
  );
}

// ---------- Project list ----------
function ProjectList({ projects, onOpen, onNew }) {
  if (projects.length === 0) {
    return (
      <div style={{ background: T.surface, border: `1px dashed ${T.borderStrong}`, borderRadius: 14, padding: "50px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: "Fraunces, serif", fontSize: 17, color: T.ink, margin: "0 0 6px" }}>Belum ada proyek</p>
        <Button variant="primary" icon={Plus} onClick={onNew} style={{ marginTop: 10 }}>Tambah proyek</Button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {projects.map((p) => (
        <RowCard key={p.id} project={p} onClick={() => onOpen(p.id)} />
      ))}
    </div>
  );
}

// ---------- New project form ----------
function ProjectForm({ onCancel, onSave }) {
  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [producerName, setProducerName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [createdAt, setCreatedAt] = useState(todayISO());

  const profit = (Number(sellPrice) || 0) - (Number(buyPrice) || 0);
  const canSave = name.trim() && customerName.trim() && producerName.trim() && buyPrice !== "" && sellPrice !== "";

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, maxWidth: 520 }}>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>Proyek baru</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Nama proyek">
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Set kursi tamu 3 dudukan" />
          </Field>
        </div>
        <Field label="Nama konsumen">
          <input style={inputStyle} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Bu Ani" />
        </Field>
        <Field label="Nama produsen / pembuat">
          <input style={inputStyle} value={producerName} onChange={(e) => setProducerName(e.target.value)} placeholder="Bengkel Jati Makmur" />
        </Field>
        <Field label="Jenis pekerjaan">
          <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Tanggal order">
          <input type="date" style={inputStyle} value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} />
        </Field>
        <Field label="Harga dari produsen (Rp)">
          <input type="number" style={inputStyle} value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="1000000" />
        </Field>
        <Field label="Harga jual ke konsumen (Rp)">
          <input type="number" style={inputStyle} value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="2000000" />
        </Field>
      </div>
      <div style={{ marginTop: 14, padding: "10px 14px", background: T.accentSoft, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: T.accentDark, fontWeight: 500 }}>Estimasi keuntungan</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 500, color: T.accentDark }}>{fmtRp(profit)}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <Button variant="primary" onClick={() => canSave && onSave({ name, customerName, producerName, category, buyPrice, sellPrice, createdAt })} style={{ opacity: canSave ? 1 : 0.5, pointerEvents: canSave ? "auto" : "none" }}>
          Simpan proyek
        </Button>
        <Button onClick={onCancel}>Batal</Button>
      </div>
    </div>
  );
}

// ---------- Project detail ----------
function ProjectDetail({ project, onBack, onSave, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [txType, setTxType] = useState("in");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(todayISO());
  const [txNote, setTxNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [lightbox, setLightbox] = useState(null);

  const handlePhotoFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setUploading(true);
    setPhotoError("");
    try {
      const newPhotos = [];
      for (const file of files) {
        const dataUrl = await resizeImageToDataUrl(file);
        newPhotos.push({ id: uid(), dataUrl, caption: "", date: todayISO() });
      }
      const combined = [...newPhotos, ...(project.photos || [])];
      const approxSize = combined.reduce((s, p) => s + p.dataUrl.length, 0);
      if (approxSize > 4.3 * 1024 * 1024) {
        setPhotoError("Foto terlalu banyak untuk proyek ini, sudah mendekati batas penyimpanan. Hapus beberapa foto lama dulu.");
      } else {
        onSave({ ...project, photos: combined });
      }
    } catch (e) {
      setPhotoError("Gagal mengunggah foto. Coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (id) => {
    onSave({ ...project, photos: (project.photos || []).filter((p) => p.id !== id) });
  };

  const totalIn = (project.transactions || []).filter((t) => t.type === "in").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = (project.transactions || []).filter((t) => t.type === "out").reduce((s, t) => s + Number(t.amount), 0);
  const receivable = Math.max(project.sellPrice - totalIn, 0);
  const payable = Math.max(project.buyPrice - totalOut, 0);
  const profit = project.sellPrice - project.buyPrice;
  const status = projectStatus(project);
  const curIdx = currentStageIndex(project);

  const addTransaction = () => {
    if (!txAmount || Number(txAmount) <= 0) return;
    const tx = { id: uid(), type: txType, amount: Number(txAmount), date: txDate, note: txNote };
    const updated = { ...project, transactions: [tx, ...(project.transactions || [])] };
    onSave(updated);
    setTxAmount(""); setTxNote("");
  };

  const removeTransaction = (id) => {
    onSave({ ...project, transactions: project.transactions.filter((t) => t.id !== id) });
  };

  const toggleStage = (id) => {
    const updated = {
      ...project,
      timeline: project.timeline.map((s) =>
        s.id === id ? { ...s, done: !s.done, actualDate: !s.done ? todayISO() : "" } : s
      ),
    };
    onSave(updated);
  };

  const updateStage = (id, patch) => {
    onSave({ ...project, timeline: project.timeline.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>Kembali ke daftar</Button>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, color: T.ink, margin: 0 }}>{project.name}</h2>
              <Tag tone={status === "Selesai" ? "income" : status === "Berjalan" ? "accent" : "faint"}>{status}</Tag>
              {isLate(project) && <Tag tone="expense">Telat</Tag>}
            </div>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: T.inkSoft, margin: 0 }}>
              Konsumen: <strong style={{ color: T.ink }}>{project.customerName}</strong> · Produsen: <strong style={{ color: T.ink }}>{project.producerName}</strong> · {project.category} · dibuat {fmtDate(project.createdAt)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!confirmDelete ? (
              <Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Hapus</Button>
            ) : (
              <>
                <Button variant="danger" onClick={() => onDelete(project.id)}>Yakin hapus?</Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Batal</Button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 16 }}>
          <StatCard label="Harga beli" value={fmtRp(project.buyPrice)} tone="ink" />
          <StatCard label="Harga jual" value={fmtRp(project.sellPrice)} tone="oak" />
          <StatCard label="Keuntungan" value={fmtRp(profit)} tone="income" />
          <StatCard label="Piutang ke konsumen" value={fmtRp(receivable)} tone={receivable > 0 ? "expense" : "income"} />
          <StatCard label="Sisa ke produsen" value={fmtRp(payable)} tone={payable > 0 ? "expense" : "income"} />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 14px" }}>Progres kerja</h3>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {project.timeline.map((stage, i) => (
            <div key={stage.id} style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <button
                  onClick={() => toggleStage(stage.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}
                  aria-label={stage.done ? "Tandai belum selesai" : "Tandai selesai"}
                >
                  {stage.done ? <CheckCircle2 size={20} color={T.income} /> : (i === curIdx ? <Circle size={20} color={T.accent} strokeWidth={2.5} /> : <Circle size={20} color={T.inkFaint} />)}
                </button>
                {i < project.timeline.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 34, background: stage.done ? T.income : T.border, margin: "2px 0" }} />
                )}
              </div>
              <div style={{ paddingBottom: 18, flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: stage.done || i === curIdx ? 600 : 500, color: stage.done ? T.income : T.ink, margin: "0 0 6px" }}>
                  {stage.label}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft }}>
                    Target
                    <input type="date" value={stage.targetDate} onChange={(e) => updateStage(stage.id, { targetDate: e.target.value })}
                      style={{ ...inputStyle, padding: "4px 8px", fontSize: 11.5 }} />
                  </label>
                  {stage.actualDate && (
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.income }}>Selesai {fmtDate(stage.actualDate)}</span>
                  )}
                  <input
                    placeholder="Catatan (opsional)"
                    value={stage.note}
                    onChange={(e) => updateStage(stage.id, { note: e.target.value })}
                    style={{ ...inputStyle, padding: "4px 8px", fontSize: 11.5, flex: 1, minWidth: 140 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, color: T.ink, margin: 0 }}>Foto proyek</h3>
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: T.surface, color: T.ink,
            border: `1px solid ${T.borderStrong}`, borderRadius: 9, padding: "8px 14px",
            fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>
            <Upload size={14} />
            {uploading ? "Mengunggah…" : "Unggah foto"}
            <input
              type="file" accept="image/*" multiple
              onChange={(e) => { handlePhotoFiles(e.target.files); e.target.value = ""; }}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {photoError && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: T.expense, margin: "0 0 10px" }}>{photoError}</p>
        )}

        {(project.photos || []).length === 0 ? (
          <div style={{ border: `1px dashed ${T.borderStrong}`, borderRadius: 10, padding: "26px 14px", textAlign: "center" }}>
            <ImageIcon size={20} color={T.inkFaint} style={{ marginBottom: 6 }} />
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: T.inkFaint, margin: 0 }}>
              Belum ada foto. Unggah foto barang dari produsen sebelum dikirim ke konsumen.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
            {project.photos.map((p) => (
              <div key={p.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
                <img
                  src={p.dataUrl}
                  alt="Foto proyek"
                  onClick={() => setLightbox(p)}
                  style={{ width: "100%", height: 96, objectFit: "cover", display: "block", cursor: "pointer" }}
                />
                <button
                  onClick={() => removePhoto(p.id)}
                  aria-label="Hapus foto"
                  style={{
                    position: "absolute", top: 4, right: 4, background: "rgba(36,30,23,0.65)", border: "none",
                    borderRadius: 6, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <X size={12} color="#fff" />
                </button>
              </div>
            ))}
          </div>
        )}

        {lightbox && (
          <div
            onClick={() => setLightbox(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(20,16,11,0.75)", zIndex: 50,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out",
            }}
          >
            <img src={lightbox.dataUrl} alt="Foto proyek diperbesar" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 10 }} />
          </div>
        )}
      </div>

      {/* Cashflow */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 14px" }}>Arus kas proyek</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14, background: T.surfaceAlt, padding: 12, borderRadius: 10 }}>
          <Field label="Jenis">
            <select style={inputStyle} value={txType} onChange={(e) => setTxType(e.target.value)}>
              <option value="in">Uang masuk (dari konsumen)</option>
              <option value="out">Uang keluar (ke produsen)</option>
            </select>
          </Field>
          <Field label="Jumlah (Rp)">
            <input type="number" style={{ ...inputStyle, width: 140 }} value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="500000" />
          </Field>
          <Field label="Tanggal">
            <input type="date" style={inputStyle} value={txDate} onChange={(e) => setTxDate(e.target.value)} />
          </Field>
          <Field label="Catatan">
            <input style={{ ...inputStyle, width: 160 }} value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="DP 50%" />
          </Field>
          <Button variant="primary" icon={Plus} onClick={addTransaction}>Tambah</Button>
        </div>

        {(project.transactions || []).length === 0 ? (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: T.inkFaint, textAlign: "center", padding: "16px 0" }}>Belum ada transaksi.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {project.transactions.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: T.surfaceAlt }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {t.type === "in" ? <TrendingUp size={15} color={T.income} /> : <TrendingDown size={15} color={T.expense} />}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: T.ink, margin: 0, fontWeight: 500 }}>{t.note || (t.type === "in" ? "Pembayaran konsumen" : "Pembayaran produsen")}</p>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: T.inkFaint, margin: 0 }}>{fmtDate(t.date)}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 500, color: t.type === "in" ? T.income : T.expense }}>
                    {t.type === "in" ? "+" : "-"}{fmtRp(t.amount)}
                  </span>
                  <button onClick={() => removeTransaction(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }} aria-label="Hapus transaksi">
                    <X size={14} color={T.inkFaint} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
