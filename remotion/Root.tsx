import { Composition } from 'remotion';
import { TVFrame, DEFAULT_TV_PROPS } from './TVFrame';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TVFrame"
      component={TVFrame as React.FC}
      durationInFrames={1}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={DEFAULT_TV_PROPS}
    />
  );
};
