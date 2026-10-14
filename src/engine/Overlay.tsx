import {AbsoluteFill} from 'remotion';
import {fontFamily} from '../theme';
import {FRAME, SAFE, toScreen} from './camera';
import type {EngineState} from './state';
import {at, endOf, G, PHRASES, pistonPinY, ramp, window} from './timeline';

const SUB_BOTTOM = FRAME.height - SAFE.bottom; // subtitles end above the caption / description area

// ---------------- subtitles: one phrase at a time, the spoken word highlighted ----------------
const Subtitle: React.FC<{t: number}> = ({t}) => {
  const p = PHRASES.find((x, i) => t >= x.start && t < (PHRASES[i + 1]?.start ?? x.end + 1));
  if (!p) return null;
  const words = p.text.split(' ');
  const pop = ramp(t, p.start, 0.15);
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        right: 70,
        bottom: FRAME.height - SUB_BOTTOM,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '4px 16px',
        fontFamily,
        fontWeight: 800,
        fontSize: 58,
        lineHeight: 1.18,
        textAlign: 'center',
        transform: `scale(${0.92 + 0.08 * pop})`,
        opacity: pop,
      }}
    >
      {words.map((w, i) => {
        const on = t >= p.words[i] && (i + 1 >= words.length || t < p.words[i + 1] + 0.05);
        const said = t >= p.words[i];
        return (
          <span
            key={i}
            style={{
              color: on ? '#ffd23f' : said ? '#ffffff' : 'rgba(255,255,255,0.75)',
              WebkitTextStroke: '8px #111418',
              paintOrder: 'stroke fill',
              textShadow: '0 4px 14px rgba(0,0,0,0.45)',
              transform: on ? 'scale(1.08)' : undefined,
              display: 'inline-block',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ---------------- part labels pinned to 3D points ----------------
type Label = {
  text: string;
  from: number;
  to: number;
  point: (t: number, s: EngineState) => [number, number, number];
  dx: number; // px offset of the tag from the point
  dy: number;
  tone?: 'warn' | 'gas';
};

const LABELS: Label[] = [
  {text: 'Thanh truyền', from: at('rod') + 0.6, to: endOf('updown'), point: (_, s) => [0.25 * Math.sin(s.theta), (pistonPinY(s.theta) + G.crankY) / 2, 0], dx: -300, dy: -40},
  {text: 'Trục khuỷu', from: at('crank') + 0.5, to: endOf('updown'), point: () => [0, G.crankY, 0.8], dx: 170, dy: 90},
  {text: 'Pít-tông', from: at('piston') + 0.4, to: endOf('piston') + 0.6, point: (_, s) => [0.6, pistonPinY(s.theta) + 0.2, 0.9], dx: 200, dy: -110},
  {text: 'Bánh đà', from: at('flywheel') + 0.8, to: endOf('back'), point: () => [-0.9, G.crankY + 0.8, G.flywheelZ], dx: -200, dy: -120},
  {text: 'Vòi phun', from: at('injector') + 0.8, to: endOf('fuel'), point: () => [-0.22, G.capTop + 0.7, 0], dx: -250, dy: -110},
  {text: 'Bu-gi', from: at('plug') + 0.7, to: endOf('ignite'), point: () => [0.22, G.capTop + 0.6, 0], dx: 220, dy: -120},
  {text: 'Thiếu ô-xy', from: at('nooxy') + 0.2, to: endOf('nofire'), point: () => [0, G.capY - 0.3, 0], dx: 230, dy: 140, tone: 'warn'},
  {text: 'Van nạp', from: at('intake') + 0.8, to: endOf('mix'), point: () => [-1.1, G.capTop + 0.55, 0], dx: -120, dy: -150},
  {text: 'Khí thải', from: at('trapped') + 0.3, to: endOf('stall'), point: (_, s) => [0.3, (G.capY + pistonPinY(s.theta) + G.pinToTop) / 2, 0], dx: 260, dy: 120, tone: 'gas'},
  {text: 'Van xả', from: at('exhaust') + 0.8, to: endOf('out'), point: () => [1.1, G.capTop + 0.55, 0], dx: 120, dy: -150},
  {text: 'Trục cam', from: at('mount') + 0.4, to: endOf('lobe'), point: () => [-G.valveX, G.stemTop + G.camBase, 0.8], dx: -200, dy: -110},
  {text: 'Vấu cam', from: at('lobe') + 0.2, to: endOf('stuck'), point: () => [G.valveX, G.stemTop + 0.05, 0.1], dx: 230, dy: -150},
  {text: 'Lò xo', from: at('springs') + 0.8, to: endOf('seal'), point: () => [G.valveX + 0.12, G.capTop + 0.75, 0], dx: 230, dy: 60},
  {text: 'Xi-lanh', from: at('cyl') - 0.1, to: endOf('cyl') + 0.6, point: () => [-G.bore - 0.1, G.cylBottom + 0.6, 0], dx: -170, dy: 80},
];

const TONES = {
  base: {bg: '#ffffff', fg: '#14171c', dot: '#ffd23f'},
  warn: {bg: '#e23b3b', fg: '#ffffff', dot: '#e23b3b'},
  gas: {bg: '#7a5230', fg: '#ffffff', dot: '#c48a4a'},
};

const PartLabel: React.FC<{l: Label; t: number; s: EngineState}> = ({l, t, s}) => {
  const k = window(t, l.from, l.to, 0.3);
  if (k <= 0) return null;
  const p = toScreen(t, l.point(t, s));
  if (p.behind) return null;
  const tone = TONES[l.tone ?? 'base'];
  const x = Math.min(Math.max(p.x + l.dx, 180), FRAME.width - 200);
  const y = Math.min(Math.max(p.y + l.dy, SAFE.top + 60), SUB_BOTTOM - 260);
  return (
    <>
      <svg width={FRAME.width} height={FRAME.height} style={{position: 'absolute', inset: 0, opacity: k}}>
        <line x1={p.x} y1={p.y} x2={x} y2={y} stroke="#ffffff" strokeWidth={4} />
        <circle cx={p.x} cy={p.y} r={11} fill={tone.dot} stroke="#ffffff" strokeWidth={4} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * k})`,
          opacity: k,
          background: tone.bg,
          color: tone.fg,
          fontFamily,
          fontWeight: 700,
          fontSize: 44,
          padding: '10px 26px',
          borderRadius: 999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
        }}
      >
        {l.text}
      </div>
    </>
  );
};

// ---------------- four strokes ----------------
const STROKES = [
  {name: 'NẠP', color: '#21c7a8'},
  {name: 'NÉN', color: '#3a8dde'},
  {name: 'NỔ', color: '#f08a24'},
  {name: 'XẢ', color: '#8a6440'},
];

const StrokeBar: React.FC<{t: number; s: EngineState}> = ({t, s}) => {
  const k = window(t, at('s1') - 0.3, endOf('cycle') + 0.6, 0.4);
  if (k <= 0) return null;
  const cycle = PHRASES.find((p) => p.id === 'cycle')!;
  const lit = (i: number) => {
    if (s.strokeLabel >= 0) return s.strokeLabel === i;
    if (t >= cycle.start) return t >= cycle.words[i];
    return false;
  };
  return (
    <div
      style={{
        position: 'absolute',
        top: SAFE.top + 20,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 18,
        opacity: k,
        fontFamily,
      }}
    >
      {STROKES.map((st, i) => {
        const on = lit(i);
        return (
          <div
            key={st.name}
            style={{
              minWidth: 190,
              padding: '16px 0',
              borderRadius: 22,
              textAlign: 'center',
              background: on ? st.color : 'rgba(255,255,255,0.82)',
              color: on ? '#ffffff' : '#2b3038',
              fontWeight: 800,
              fontSize: on ? 50 : 40,
              boxShadow: on ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.12)',
              transform: on ? 'scale(1.06)' : undefined,
            }}
          >
            <div style={{fontSize: 26, fontWeight: 600, opacity: 0.8}}>Thì {i + 1}</div>
            {st.name}
          </div>
        );
      })}
    </div>
  );
};

// ---------------- titles ----------------
const Headline: React.FC<{t: number}> = ({t}) => {
  const intro = window(t, 0.1, endOf('waste') + 0.4, 0.4);
  const outro = ramp(t, at('built') + 0.2, 0.6);
  const k = Math.max(intro, outro);
  if (k <= 0) return null;
  const big = outro > 0;
  return (
    <div
      style={{
        position: 'absolute',
        top: SAFE.top + 20,
        left: 60,
        right: 60,
        textAlign: 'center',
        fontFamily,
        opacity: k,
        transform: `translateY(${(1 - k) * -30}px)`,
      }}
    >
      <div
        style={{
          display: 'inline-block',
          background: big ? '#d4343a' : 'rgba(20,23,28,0.82)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: big ? 56 : 52,
          whiteSpace: big ? 'nowrap' : undefined,
          lineHeight: 1.15,
          padding: big ? '22px 40px' : '18px 34px',
          borderRadius: 28,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        }}
      >
        {big ? 'ĐỘNG CƠ ĐỐT TRONG 4 THÌ' : 'Tự chế động cơ đốt trong từ một thùng sắt'}
      </div>
    </div>
  );
};

const QuestionMark: React.FC<{t: number; s: EngineState}> = ({t, s}) => {
  const k = window(t, at('return') + 0.2, endOf('return') + 0.3, 0.25);
  if (k <= 0) return null;
  const p = toScreen(t, [0, pistonPinY(s.theta) + 0.2, 1]);
  return (
    <div
      style={{
        position: 'absolute',
        left: p.x + 220,
        top: p.y - 120,
        transform: `translate(-50%,-50%) scale(${0.5 + 0.5 * k}) rotate(${(1 - k) * -20}deg)`,
        opacity: k,
        fontFamily,
        fontWeight: 800,
        fontSize: 200,
        color: '#ffd23f',
        WebkitTextStroke: '12px #14171c',
        paintOrder: 'stroke fill',
      }}
    >
      ?
    </div>
  );
};

// TikTok UI zones, for checking the layout in previews only
export const SafeGuides: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: SAFE.top, background: 'rgba(255,0,80,0.25)'}} />
    <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: SAFE.bottom, background: 'rgba(255,0,80,0.25)'}} />
    <div style={{position: 'absolute', top: 760, bottom: SAFE.bottom, right: 0, width: 130, background: 'rgba(0,180,255,0.25)'}} />
  </AbsoluteFill>
);

export const Overlay: React.FC<{t: number; s: EngineState}> = ({t, s}) => (
  <AbsoluteFill>
    {LABELS.map((l) => (
      <PartLabel key={l.text} l={l} t={t} s={s} />
    ))}
    <QuestionMark t={t} s={s} />
    <StrokeBar t={t} s={s} />
    <Headline t={t} />
    <Subtitle t={t} />
  </AbsoluteFill>
);
