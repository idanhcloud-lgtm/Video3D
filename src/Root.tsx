import {Composition} from 'remotion';
import {BlenderShot, blenderShotMetadata} from './scenes/BlenderShot';
import {ENGINE_DURATION, EngineTikTok} from './scenes/EngineTikTok';
import {FRAME} from './engine/camera';
import {WAREHOUSE_DURATION, Warehouse3D} from './scenes/Warehouse3D';
import {VIDEO} from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EngineTikTok"
        component={EngineTikTok}
        defaultProps={{guides: false}}
        durationInFrames={ENGINE_DURATION}
        fps={FRAME.fps}
        width={FRAME.width}
        height={FRAME.height}
      />
      <Composition
        id="Warehouse3D"
        component={Warehouse3D}
        durationInFrames={WAREHOUSE_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition
        id="BlenderShot"
        component={BlenderShot}
        defaultProps={{shot: 'warehouse', title: 'Kho C – Reach Truck'}}
        calculateMetadata={blenderShotMetadata}
        durationInFrames={VIDEO.fps}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
