/** Etiquetas canónicas de caracterización de secuencias (toda la presentación). */
export const CHAR_LABELS = {
  sectionStruct: "Estructura e interfaz",
  sectionPeptide: "Péptido · ProtParam",
  rg: "Radio de giro",
  ifContacts: "Contactos IF",
  dsasa: "ΔSASA",
  gravy: "GRAVY",
  charge: "Carga pH 7",
  pi: "pI",
  instability: "II",
  aromaticity: "Aromaticidad",
  mw: "MW",
} as const;

export type DesignMetrics = {
  rg?: number | null;
  if_contacts?: number | null;
  /** Alias Rosetta / shortlist → contactos IF. */
  n_interface_res?: number | null;
  bsa?: number | null;
  /** Alias Rosetta dSASA → ΔSASA. */
  dsasa?: number | null;
  charge?: number | null;
  pi?: number | null;
  pI?: number | null;
  gravy?: number | null;
  mw_kda?: number | null;
  aromaticity?: number | null;
  instability?: number | null;
};

export type PeptideMetricsProps = {
  gravy?: number | null;
  charge?: number | null;
  pi?: number | null;
  pI?: number | null;
  aromaticity?: number | null;
  instability?: number | null;
  mw_kda?: number | null;
};

type TraitTone = "ok" | "warn" | "neutral";

export function fmtChar(v: number | null | undefined, digits: number): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

export function fmtSignedChar(
  v: number | null | undefined,
  digits = 1
): string {
  if (v == null || Number.isNaN(v)) return "—";
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

/** Kyte & Doolittle (1982): GRAVY > 0 hidrofóbico; ≈0 neutro. */
export function gravyTrait(
  gravy: number | null | undefined
): { label: string; tone: TraitTone } {
  if (gravy == null || Number.isNaN(gravy))
    return { label: "—", tone: "neutral" };
  if (Math.abs(gravy) < 0.05) return { label: "neutro", tone: "neutral" };
  if (gravy > 0) return { label: "hidrofóbico", tone: "warn" };
  return { label: "hidrofílico", tone: "ok" };
}

/** Guruprasad et al. (1990): II < 40 se clasifica como estable in vitro. */
export function stabilityTrait(
  ii: number | null | undefined
): { label: string; tone: TraitTone } {
  if (ii == null || Number.isNaN(ii)) return { label: "—", tone: "neutral" };
  if (ii < 40) return { label: "estable", tone: "ok" };
  return { label: "inestable", tone: "warn" };
}

function hasNum(v: number | null | undefined): boolean {
  return v != null && !Number.isNaN(v);
}

export function TraitLabel({
  tone,
  label,
}: {
  tone: TraitTone;
  label: string;
}) {
  if (!label || label === "—") return null;
  return <span className={`hapd1-trait hapd1-trait-${tone}`}>{label}</span>;
}

/** Número + etiqueta ProtParam (hidrofóbico / estable / …). */
export function ValueWithTrait({
  value,
  trait,
}: {
  value: string;
  trait: { label: string; tone: TraitTone };
}) {
  return (
    <span className="hapd1-val-trait">
      <span className="hapd1-val-num">{value}</span>
      <TraitLabel tone={trait.tone} label={trait.label} />
    </span>
  );
}

/** Solo bloque ProtParam con etiquetas de color (shortlist / HA-PD1 / variantes). */
export function PeptideMetrics({ p }: { p: PeptideMetricsProps }) {
  const gravy = gravyTrait(p.gravy);
  const stability = stabilityTrait(p.instability);
  const pi = p.pI ?? p.pi;
  const L = CHAR_LABELS;

  return (
    <div className="hapd1-peptide">
      <div className="hapd1-metrics hapd1-peptide-metrics">
        <div className="hapd1-metric">
          <span>{L.gravy}</span>
          <strong>{fmtChar(p.gravy, 3)}</strong>
          <TraitLabel tone={gravy.tone} label={gravy.label} />
        </div>
        <div className="hapd1-metric">
          <span>{L.charge}</span>
          <strong>{fmtSignedChar(p.charge, 1)}</strong>
        </div>
        <div className="hapd1-metric">
          <span>{L.pi}</span>
          <strong>{fmtChar(pi, 2)}</strong>
        </div>
        <div className="hapd1-metric">
          <span>{L.instability}</span>
          <strong>{fmtChar(p.instability, 1)}</strong>
          <TraitLabel tone={stability.tone} label={stability.label} />
        </div>
        <div className="hapd1-metric">
          <span>{L.aromaticity}</span>
          <strong>{fmtChar(p.aromaticity, 3)}</strong>
        </div>
        <div className="hapd1-metric">
          <span>{L.mw}</span>
          <strong>{fmtChar(p.mw_kda, 2)} kDa</strong>
        </div>
      </div>
    </div>
  );
}

/** Estructura/interfaz + ProtParam (frentes VEGF-A / shortlist / HA-PD1). */
export function DesignCharacterization({ m }: { m: DesignMetrics }) {
  const ifContacts = hasNum(m.if_contacts) ? m.if_contacts : m.n_interface_res;
  const bsa = hasNum(m.bsa) ? m.bsa : m.dsasa;
  const showStruct = hasNum(m.rg) || hasNum(ifContacts) || hasNum(bsa);
  const L = CHAR_LABELS;

  return (
    <div className="design-char">
      {showStruct ? (
        <div className="design-char-panel validacion-card hapd1-peptide-panel">
          <p className="design-char-label">{L.sectionStruct}</p>
          <div className="hapd1-metrics hapd1-peptide-metrics">
            {hasNum(m.rg) ? (
              <div className="hapd1-metric">
                <span>{L.rg}</span>
                <strong>{fmtChar(m.rg, 1)} Å</strong>
              </div>
            ) : null}
            {hasNum(ifContacts) ? (
              <div className="hapd1-metric">
                <span>{L.ifContacts}</span>
                <strong>{fmtChar(ifContacts, 0)}</strong>
              </div>
            ) : null}
            {hasNum(bsa) ? (
              <div className="hapd1-metric">
                <span>{L.dsasa}</span>
                <strong>{fmtChar(bsa, 1)} Å²</strong>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="design-char-panel validacion-card hapd1-peptide-panel">
        <p className="design-char-label">{L.sectionPeptide}</p>
        <PeptideMetrics p={m} />
      </div>
    </div>
  );
}
