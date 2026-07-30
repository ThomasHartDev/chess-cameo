import { Composition } from 'remotion';
import { TVFrame, DEFAULT_TV_PROPS } from './TVFrame';
import { SystemLoop, DEFAULT_LOOP_PROPS } from './SystemLoop';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TVFrame"
        component={TVFrame as React.FC}
        durationInFrames={1}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={DEFAULT_TV_PROPS}
      />
      {/* Short loop under VO / OBS Browser Source — ~3s @ 30fps, 960×540. */}
      <Composition
        id="SystemLoop"
        component={SystemLoop as React.FC}
        durationInFrames={90}
        fps={30}
        width={960}
        height={540}
        defaultProps={DEFAULT_LOOP_PROPS}
      />
    </>
  );
};
