import type { TreeStage } from '@/shared/lib/forest/tree-stage';
import { cn } from '@/shared/lib/utils';

const CROWN = ['#3E7C3A', '#2F6B4F', '#6A9140', '#3D6E58', '#7A9344'];
const CROWN_LIGHT = ['#8FBF55', '#7AAA6A', '#A8C46A', '#86B48A', '#C4D56A'];

interface TreeIllustrationProps {
  stage: TreeStage;
  variant?: number;
  className?: string;
}

export function TreeIllustration({ stage, variant = 0, className }: TreeIllustrationProps) {
  const crown = CROWN[variant % CROWN.length];
  const light = CROWN_LIGHT[variant % CROWN_LIGHT.length];

  return (
    <svg viewBox="0 0 160 120" className={cn('h-full w-full', className)} aria-hidden>
      <ellipse cx="80" cy="108" rx="46" ry="8" fill={crown} opacity="0.18" />
      {stage === 'seed' ? <Seed light={light} crown={crown} /> : null}
      {stage === 'sprout' ? <Sprout light={light} crown={crown} /> : null}
      {stage === 'sapling' ? <Sapling light={light} crown={crown} /> : null}
      {stage === 'young' ? <Canopy light={light} crown={crown} scale={0.72} y={18} /> : null}
      {stage === 'adult' ? <Canopy light={light} crown={crown} scale={0.88} y={8} /> : null}
      {stage === 'mature' ? <Canopy light={light} crown={crown} scale={1} y={0} /> : null}
      {stage === 'fruit' ? <Canopy light={light} crown={crown} scale={1} y={0} fruit /> : null}
    </svg>
  );
}

function Seed({ light, crown }: { light: string; crown: string }) {
  return (
    <>
      <ellipse cx="80" cy="96" rx="22" ry="7" fill="#C4B48A" />
      <ellipse cx="80" cy="90" rx="7" ry="5" fill={light} />
      <path d="M80 88c2-6 6-8 8-12" stroke={crown} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  );
}

function Sprout({ light, crown }: { light: string; crown: string }) {
  return (
    <>
      <path d="M80 100c0-16 1-24 2-34" stroke="#6B5344" strokeWidth="2" strokeLinecap="round" />
      <path d="M81 72c-10-2-16-10-14-16 8 1 14 8 14 16Z" fill={light} />
      <path d="M82 78c10-1 16-8 14-15-8 2-14 8-14 15Z" fill={crown} />
    </>
  );
}

function Sapling({ light, crown }: { light: string; crown: string }) {
  return (
    <>
      <path d="M80 104c1-22 2-36 3-48" stroke="#6B5344" strokeWidth="3" strokeLinecap="round" />
      <circle cx="70" cy="58" r="14" fill={light} />
      <circle cx="90" cy="54" r="16" fill={crown} />
      <circle cx="80" cy="46" r="12" fill={light} />
    </>
  );
}

function Canopy({
  light,
  crown,
  scale,
  y,
  fruit = false,
}: {
  light: string;
  crown: string;
  scale: number;
  y: number;
  fruit?: boolean;
}) {
  return (
    <g transform={`translate(80 ${62 + y}) scale(${scale}) translate(-80 -62)`}>
      <path d="M80 108c2-28 3-44 4-62" stroke="#6A4B38" strokeWidth="5" strokeLinecap="round" />
      <circle cx="52" cy="58" r="22" fill={light} />
      <circle cx="108" cy="56" r="24" fill={crown} />
      <circle cx="80" cy="40" r="26" fill={light} />
      <circle cx="78" cy="62" r="20" fill={crown} opacity="0.9" />
      {fruit ? (
        <>
          <circle cx="64" cy="50" r="3.2" fill="#E7B34A" />
          <circle cx="96" cy="46" r="3.2" fill="#E7B34A" />
          <circle cx="84" cy="66" r="3" fill="#F0C56A" />
          <circle cx="70" cy="70" r="2.6" fill="#F3D27A" />
        </>
      ) : null}
    </g>
  );
}
