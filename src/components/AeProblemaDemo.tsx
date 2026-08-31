import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { aaColor } from "../data/aminoAcidColors";
import { seqPreview } from "../data/aeProblemaPool";
import { AeProblemaBindViewer } from "./AeProblemaBindViewer";
import {
  POP_SIZE,
  KEEP,
  binds,
  breedChildren,
  evoRnd,
  initialPopulation,
  MAX_GENERATIONS,
  nextGeneration,
  rankPopulation,
  selectSurvivors,
  type Individual,
} from "../lib/aeProblemaEvolution";

type EvalPhase = "pick" | "approach" | "fail" | "success" | "retreat";
type Stage = "evaluate" | "select" | "breed";

type RowState =
  | "idle"
  | "eval"
  | "survivor"
  | "cull"
  | "parent"
  | "child";

type DisplayRow = {
  key: string;
  ind: Individual;
  state: RowState;
};

/** Debe superar duración 3D (frames × ms + margen). */
const T = {
  pick: 280,
  approachOk: 620,
  approachFail: 520,
  success: 750,
  fail: 180,
  retreat: 280,
  selectHold: 1100,
  parentPause: 500,
  childStep: 550,
  genPause: 650,
} as const;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function SeqRow({
  ind,
  state,
  evalStatus,
}: {
  ind: Individual;
  state: RowState;
  evalStatus?: "fail" | "success";
}) {
  const preview = seqPreview(ind.seq);
  const chars = preview.split("");

  return (
    <motion.div
      layout="position"
      initial={false}
      className="ae-prob-pop-row"
      data-active={state === "eval" || undefined}
      data-muted={state === "eval" ? true : undefined}
      data-status={evalStatus}
      data-row-state={state}
      title={ind.seq}
    >
      <div className="ae-prob-pop-seq" aria-label={ind.seq}>
        {chars.map((aa, i) =>
          aa === "…" ? (
            <span key="ellipsis" className="ae-prob-aa ae-prob-aa--ellipsis">
              …
            </span>
          ) : (
            <span
              key={`${aa}-${i}`}
              className="ae-prob-aa"
              data-from-b={ind.fromA && !ind.fromA[i] ? true : undefined}
              data-mutated={ind.mutatedPos?.includes(i) ? true : undefined}
              style={{ background: aaColor(aa) }}
            >
              {aa}
            </span>
          )
        )}
      </div>
    </motion.div>
  );
}

export function AeProblemaDemo() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(hostRef, { amount: 0.35 });
  const prefersReduced = useReducedMotion();

  const [generation, setGeneration] = useState(1);
  const [population, setPopulation] = useState<Individual[]>(initialPopulation);
  const [rows, setRows] = useState<DisplayRow[]>(() =>
    initialPopulation().map((ind) => ({
      key: `id-${ind.id}`,
      ind,
      state: "idle" as RowState,
    }))
  );
  const [stage, setStage] = useState<Stage>("evaluate");
  const [evalIdx, setEvalIdx] = useState(0);
  const [evalPhase, setEvalPhase] = useState<EvalPhase>("pick");

  useEffect(() => {
    if (!inView || prefersReduced) {
      const pop = initialPopulation();
      const best = rankPopulation(pop)[0];
      setPopulation(pop);
      setRows([{ key: `id-${best.id}`, ind: best, state: "survivor" }]);
      setStage("evaluate");
      setEvalPhase("success");
      return;
    }

    let cancelled = false;
    let pop = initialPopulation();
    let gen = 1;

    const setAllRows = (next: DisplayRow[]) => {
      setPopulation(next.map((r) => r.ind));
      setRows(next);
    };

    const idleRows = (list: Individual[]) =>
      list.map((ind) => ({
        key: `id-${ind.id}`,
        ind,
        state: "idle" as RowState,
      }));

    const runEval = async (idx: number) => {
      setEvalIdx(idx);
      setRows((prev) =>
        prev.map((r, i) => ({
          ...r,
          state: i === idx ? "eval" : r.state === "eval" ? "idle" : r.state,
        }))
      );

      const ok = binds(pop[idx].seq);

      setEvalPhase("pick");
      await sleep(T.pick);
      if (cancelled) return;

      setEvalPhase("approach");
      await sleep(ok ? T.approachOk : T.approachFail);
      if (cancelled) return;

      if (ok) {
        setEvalPhase("success");
        await sleep(T.success);
      } else {
        setEvalPhase("fail");
        await sleep(T.fail);
        setEvalPhase("retreat");
        await sleep(T.retreat);
      }

      setEvalPhase("pick");
      setRows((prev) =>
        prev.map((r, i) => ({
          ...r,
          state: i === idx ? "idle" : r.state,
        }))
      );
      await sleep(120);
    };

    const run = async () => {
      setAllRows(idleRows(pop));

      while (!cancelled) {
        setGeneration(gen);
        setStage("evaluate");

        for (let i = 0; i < POP_SIZE; i += 1) {
          await runEval(i);
          if (cancelled) return;
        }

        setStage("select");
        setEvalPhase("pick");
        const ranked = rankPopulation(pop);
        const { survivors, culled } = selectSurvivors(ranked);
        const cullIds = new Set(culled.map((c) => c.id));
        const survIds = new Set(survivors.map((s) => s.id));

        for (let i = 0; i < pop.length; i += 1) {
          const ind = pop[i];
          const nextState: RowState = survIds.has(ind.id)
            ? "survivor"
            : cullIds.has(ind.id)
              ? "cull"
              : "idle";
          setRows((prev) =>
            prev.map((r, j) =>
              j === i ? { ...r, state: nextState } : r
            )
          );
          await sleep(140);
          if (cancelled) return;
        }
        await sleep(T.selectHold);
        if (cancelled) return;

        setStage("breed");
        setRows((prev) =>
          prev.map((r) =>
            r.state === "survivor" ? { ...r, state: "parent" as RowState } : r
          )
        );
        await sleep(T.parentPause);
        if (cancelled) return;

        const children = breedChildren(
          survivors,
          POP_SIZE - KEEP,
          gen + 1,
          evoRnd
        );
        const culledList = pop.filter((p) => cullIds.has(p.id));

        for (let k = 0; k < children.length; k += 1) {
          const child = children[k];
          const childKey = `id-${child.id}-g${gen + 1}`;
          setRows((prev) => {
            const next = [...prev];
            const slot = next.findIndex((r) => r.ind.id === culledList[k]?.id);
            if (slot >= 0) {
              next[slot] = { key: childKey, ind: child, state: "child" };
            }
            return next;
          });
          await sleep(T.childStep);
          if (cancelled) return;
        }

        pop = nextGeneration(survivors, children);
        gen += 1;
        await sleep(T.genPause);
        if (cancelled) return;

        setAllRows(idleRows(pop));
        if (gen > MAX_GENERATIONS) {
          setStage("evaluate");
          setEvalPhase("pick");
          break;
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [inView, prefersReduced]);

  const current = population[evalIdx];
  const evalStatus =
    evalPhase === "success"
      ? "success"
      : evalPhase === "fail" || evalPhase === "retreat"
        ? "fail"
        : undefined;

  return (
    <div ref={hostRef} className="ae-prob-demo">
      <section className="ae-prob-demo-pane ae-prob-demo-pane--pop">
        <div className="ae-prob-pop-stack">
          <div className="ae-prob-pop-head">
            <span className="ae-prob-gen">Gen {generation}</span>
          </div>
          <div className="ae-prob-pop-list">
            {rows.map((row, i) => (
              <SeqRow
                key={row.key}
                ind={row.ind}
                state={row.state}
                evalStatus={
                  stage === "evaluate" && i === evalIdx ? evalStatus : undefined
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="ae-prob-demo-pane ae-prob-demo-pane--bind">
        <div
          className="ae-prob-bind-stage"
          data-stage={stage}
        >
          <AeProblemaBindViewer
            entry={
              stage === "evaluate" && current
                ? {
                    pdb: current.pdb,
                    color: current.color,
                    tiltX: current.tiltX,
                    tiltY: current.tiltY,
                    latX: current.latX,
                    latY: current.latY,
                    binds: binds(current.seq),
                  }
                : null
            }
            phase={evalPhase}
            visible={inView}
            idle={stage !== "evaluate"}
          />
        </div>
      </section>
    </div>
  );
}
