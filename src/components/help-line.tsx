import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

gsap.registerPlugin(useGSAP);

export interface HelpLineItem {
  key: string;
  title: string;
  tag?: string;
}

const DROP = "M15 0C15 0 1 16 1 25.5a14 14 0 0 0 28 0C29 16 15 0 15 0Z";

/**
 * "Como posso te ajudar" como varal (mesmo desenho do "Queridinhos" do cardápio online):
 * tickets azuis presos num fio curvado com pregador em gota de chocolate. O fio desliza até
 * o card escolhido e cada card balança com a velocidade do movimento.
 */
export function HelpLine({
  title,
  items,
  renderMedia,
  onOpen,
}: {
  title: string;
  items: HelpLineItem[];
  renderMedia: (index: number, active: boolean) => ReactNode;
  onOpen: (index: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const swingTo = useRef<((value: number) => void)[]>([]);
  const n = items.length;
  const [current, setCurrent] = useState(n > 1 ? 1 : 0);
  const line = useRef({ p: current, last: current, width: 1200 });
  const drag = useRef<{ x: number; p: number; dx: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const Y0 = 26;

  const select = (index: number) => setCurrent(Math.max(0, Math.min(n - 1, index)));
  const move = (direction: -1 | 1) => setCurrent((c) => (c + direction + n) % n);

  // Posiciona cada card na posição (fracionária) do fio e faz balançar conforme a velocidade.
  const layout = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const L = line.current;
    const w = stage.clientWidth || L.width;
    L.width = w;
    const cw = cardRefs.current.find(Boolean)?.offsetWidth || 236;
    const spacing = cw * 1.06;
    const SAG = parseFloat(getComputedStyle(stage).getPropertyValue("--sag")) || 30;
    const lite = window.matchMedia("(max-width: 759px)").matches;
    const velocity = L.p - L.last;
    L.last = L.p;
    pathRef.current?.setAttribute("d", `M-20 ${Y0} Q${w / 2} ${Y0 + 2 * SAG} ${w + 20} ${Y0}`);
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = i - L.p;
      const x = w / 2 + d * spacing;
      const t = Math.min(1, Math.max(0, (x + 20) / (w + 40)));
      const y = Y0 + 4 * SAG * t * (1 - t) - 6;
      const near = Math.min(Math.abs(d), 1);
      gsap.set(el, {
        x: x - cw / 2,
        y,
        scale: 1 - near * 0.1,
        ...(lite ? {} : { filter: `saturate(${1 - near * 0.3}) brightness(${1 - near * 0.04})` }),
        zIndex: 10 - Math.round(Math.abs(d)),
        autoAlpha: Math.abs(d) > 2.2 ? 0 : 1,
      });
      swingTo.current[i]?.(Math.max(-14, Math.min(14, -d * 3 + velocity * 160)));
    });
  };

  useGSAP(
    () => {
      swingTo.current = cardRefs.current.map((el) =>
        el ? gsap.quickTo(el, "rotation", { duration: 1.1, ease: "elastic.out(1, 0.35)" }) : () => undefined,
      );
      layout();
      const ro = new ResizeObserver(() => layout());
      if (stageRef.current) ro.observe(stageRef.current);
      return () => ro.disconnect();
    },
    { dependencies: [n], scope: stageRef },
  );

  // Desliza o fio até o card escolhido.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(line.current, { p: current, duration: reduce ? 0 : 0.8, ease: "power3.out", overwrite: true, onUpdate: layout, onComplete: layout });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Soltou o fio: encaixa no card mais próximo (um puxão firme anda pelo menos um).
  const endDrag = (stage: HTMLElement) => {
    const d = drag.current;
    drag.current = null;
    stage.classList.remove("is-dragging");
    if (!d || !d.moved) return;
    dragged.current = true;
    const target = Math.max(0, Math.min(n - 1, Math.round(line.current.p - (d.dx > 40 ? 0.3 : d.dx < -40 ? -0.3 : 0))));
    if (target !== current) select(target);
    else gsap.to(line.current, { p: current, duration: 0.7, ease: "power3.out", overwrite: true, onUpdate: layout });
  };

  if (!n) return null;
  return (
    <div className="help-line">
      <div className="help-line-heading">
        <h2 className="help-line-tag">
          <span>{title}</span>
          <i aria-hidden="true" />
        </h2>
        {n > 1 && (
          <div className="help-line-controls">
            <span className="sr-only" aria-live="polite">
              Opção {current + 1} de {n}
            </span>
            <button type="button" onClick={() => move(-1)} aria-label="Opção anterior">
              <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
            </button>
            <button type="button" onClick={() => move(1)} aria-label="Próxima opção">
              <ChevronRight className="size-[18px]" strokeWidth={2.4} />
            </button>
          </div>
        )}
      </div>
      <div
        ref={stageRef}
        className="help-line-stage"
        role="region"
        aria-roledescription="carousel"
        aria-label={title}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          gsap.killTweensOf(line.current);
          drag.current = { x: event.clientX, p: line.current.p, dx: 0, moved: false };
        }}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d || n < 2) return;
          d.dx = event.clientX - d.x;
          if (!d.moved && Math.abs(d.dx) > 6) {
            d.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.classList.add("is-dragging");
          }
          if (!d.moved) return;
          const spacing = (cardRefs.current.find(Boolean)?.offsetWidth || 236) * 1.06;
          line.current.p = Math.max(-0.4, Math.min(n - 0.6, d.p - d.dx / spacing));
          layout();
        }}
        onPointerUp={(event) => endDrag(event.currentTarget)}
        onPointerCancel={(event) => endDrag(event.currentTarget)}
        onClickCapture={(event) => {
          if (dragged.current) {
            event.stopPropagation();
            event.preventDefault();
            dragged.current = false;
          }
        }}
      >
        <svg className="help-line-string" aria-hidden="true">
          <path ref={pathRef} fill="none" stroke="#8a7f72" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {items.map((item, i) => (
          <button
            key={item.key}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            type="button"
            className={i === current ? "help-line-card is-current" : "help-line-card"}
            aria-label={i === current ? `Abrir ${item.title}` : `Ver ${item.title}`}
            onClick={() => (i === current ? onOpen(i) : select(i))}
          >
            <span className="help-line-print">
              <span className="help-line-ticket">
                <span className="help-line-shot">
                  {renderMedia(i, i === current)}
                  {item.tag && <span className="help-line-chip">{item.tag}</span>}
                </span>
                <span className="help-line-note">
                  <em>{item.title}</em>
                  <b>
                    Abrir <ArrowRight className="size-3.5" strokeWidth={2.6} />
                  </b>
                </span>
              </span>
            </span>
            <svg className="help-line-peg" viewBox="0 0 30 40" aria-hidden="true">
              <path d={DROP} fill="#4a2a1c" />
              <path d="M8 24c0-4 2.5-8 5-11" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".28" />
            </svg>
          </button>
        ))}
      </div>
      {n > 1 && (
        <div className="help-line-drops" aria-hidden="true">
          {items.map((item, i) => (
            <svg key={item.key} viewBox="0 0 30 40" className={i === current ? "is-current" : undefined}>
              <path d={DROP} />
            </svg>
          ))}
        </div>
      )}
    </div>
  );
}
