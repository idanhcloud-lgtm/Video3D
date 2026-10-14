import {AbsoluteFill, CalculateMetadataFunction, Img, staticFile, useCurrentFrame} from 'remotion';
import {TitleCard} from '../components/TitleCard';
import {fontsLoaded, VIDEO} from '../theme';

// Plays a Cycles frame sequence written by `npm run blender -- <shot>` (public/blender/<shot>/0001.png ...)
// and composites Remotion overlays on top.
type Props = {shot: string; title: string};
type Manifest = {frames: number; fps: number; width: number; height: number};

const manifestUrl = (shot: string) => staticFile(`blender/${shot}/manifest.json`);

export const blenderShotMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  await fontsLoaded;
  const m: Manifest = await fetch(manifestUrl(props.shot)).then((r) => {
    if (!r.ok) throw new Error(`No Blender render for "${props.shot}". Run: npm run blender -- ${props.shot}`);
    return r.json();
  });
  if (m.fps !== VIDEO.fps) throw new Error(`Shot rendered at ${m.fps} fps, composition is ${VIDEO.fps} fps`);
  return {durationInFrames: m.frames, width: m.width, height: m.height};
};

export const BlenderShot: React.FC<Props> = ({shot, title}) => {
  const frame = useCurrentFrame();
  const file = `blender/${shot}/${String(frame + 1).padStart(4, '0')}.png`;
  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}>
      <Img src={staticFile(file)} style={{width: '100%', height: '100%'}} />
      <TitleCard title={title} subtitle="Blender Cycles" />
    </AbsoluteFill>
  );
};
