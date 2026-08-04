export type DesignMetrics = {
  rg?: number | null;
  if_contacts?: number | null;
  bsa?: number | null;
  charge?: number | null;
  pi?: number | null;
  gravy?: number | null;
  mw_kda?: number | null;
  aromaticity?: number | null;
  instability?: number | null;
};

type TraitTone = "ok" | "warn" | "neutral";

function fmt(v: number | null | undefined, digits: number): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function fmtSigned(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

function gravyTrait(gravy: number | null | undefined): { label: string; tone: TraitTone } {
  if (gravy == null || Number.isNaN(gravy)) return { label: "—", tone: "neutral" };
  if (gravy >= 0.5) return { label: "hidrofóbico", tone: "warn" };
  if (gravy >= 0) return { label: "levemente hidrofóbico", tone: "neutral" };
  return { label: "hidrofílico", tone: "ok" };
}

function stabilityTrait(ii: number | null | undefined): { label: string; tone: TraitTone } {
  if (ii == null || Number.isNaN(ii)) return { label: "—", tone: "neutral" };
  if (ii < 40) return { label: "estable", tone: "ok" };
  if (ii < 65) return { label: "moderado", tone: "neutral" };
  return { label: "inestable", tone: "warn" };
}

function chargeTrait(charge: number | null | undefined): { label: string; tone: TraitTone } {
  if (charge == null || Number.isNaN(charge)) return { label: "—", tone: "neutral" };
  if (Math.abs(charge) < 1) return { label: "casi neutro", tone: "neutral" };
  if (charge > 0) return { label: "carga +", tone: "ok" };
  return { label: "carga −", tone: "neutral" };
}

function hasNum(v: number | null | undefined): boolean {
  return v != null && !Number.isNaN(v);
}

/** Caracterización estructural + ProtParam (estilo HAPD1) del binder activo. */
export function DesignCharacterization({ m }: { m: DesignMetrics }) {
  const gravy = gravyTrait(m.gravy);
  const charge = chargeTrait(m.charge);
  const stability = stabilityTrait(m.instability);
  const showStruct =
    hasNum(m.rg) || hasNum(m.if_contacts) || hasNum(m.bsa);

  return (
    <div className="design-char">
      {showStruct ? (
        <div className="design-char-panel validacion-card hapd1-peptide-panel">
          <p className="design-char-label">Estructura e interfaz</p>
          <div className="hapd1-metrics hapd1-peptide-metrics">
            {hasNum(m.rg) ? (
              <div className="hapd1-metric">
                <span>Radio de giro</span>
                <strong>{fmt(m.rg, 1)} Å</strong>
              </div>
            ) : null}
            {hasNum(m.if_contacts) ? (
              <div className="hapd1-metric">
                <span>Contactos IF</span>
                <strong>{fmt(m.if_contacts, 0)}</strong>
              </div>
            ) : null}
            {hasNum(m.bsa) ? (
              <div className="hapd1-metric">
                <span>ΔSASA</span>
                <strong>{fmt(m.bsa, 1)} Å²</strong>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="design-char-panel validacion-card hapd1-peptide-panel">
        <p className="design-char-label">Péptido · ProtParam</p>
        <div className="hapd1-metrics hapd1-peptide-metrics">
          <div className="hapd1-metric">
            <span>GRAVY</span>
            <strong>{fmt(m.gravy, 3)}</strong>
            <em className={`hapd1-trait hapd1-trait-${gravy.tone}`}>{gravy.label}</em>
          </div>
          <div className="hapd1-metric">
            <span>Carga pH 7</span>
            <strong>{fmtSigned(m.charge, 1)}</strong>
            <em className={`hapd1-trait hapd1-trait-${charge.tone}`}>{charge.label}</em>
          </div>
          <div className="hapd1-metric">
            <span>pI</span>
            <strong>{fmt(m.pi, 2)}</strong>
          </div>
          <div className="hapd1-metric">
            <span>II</span>
            <strong>{fmt(m.instability, 1)}</strong>
            <em className={`hapd1-trait hapd1-trait-${stability.tone}`}>{stability.label}</em>
          </div>
          <div className="hapd1-metric">
            <span>Aromaticidad</span>
            <strong>{fmt(m.aromaticity, 3)}</strong>
          </div>
          <div className="hapd1-metric">
            <span>MW</span>
            <strong>{fmt(m.mw_kda, 2)} kDa</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
