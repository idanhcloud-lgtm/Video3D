import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fontFamily} from '../theme';

// Lower-third title that fades and slides in over the first 0.6 s.
export const TitleCard: React.FC<{title: string; subtitle?: string}> = ({title, subtitle}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [0, 0.6 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        bottom: 96,
        fontFamily,
        color: colors.text,
        opacity: t,
        transform: `translateY(${(1 - t) * 24}px)`,
        textShadow: '0 2px 12px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{fontSize: 64, fontWeight: 700}}>{title}</div>
      {subtitle ? <div style={{fontSize: 32, fontWeight: 400, color: colors.muted}}>{subtitle}</div> : null}
    </div>
  );
};
