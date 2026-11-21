// The EffectComposer from @react-three/postprocessing registers its render callback in an effect, after
// Remotion's ThreeCanvas has already advanced the first frame. Without this, a still or the first frame of
// every render worker comes out empty (only the page background). Place it inside the canvas, after the
// composer: it holds the frame until the composer has drawn once.
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { useThree } from "@react-three/fiber";

export const PostKick: React.FC = () => {
  const advance = useThree((s) => s.advance);
  const [handle] = useState(() => delayRender("post-processing first draw"));
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      advance(performance.now());
      continueRender(handle);
    });
    return () => cancelAnimationFrame(id);
  }, [advance, handle]);
  return null;
};
