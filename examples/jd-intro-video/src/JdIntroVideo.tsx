import { AbsoluteFill, Sequence } from "remotion";
import { Transition } from "./components/Transition";
import { FPS, SCENE_STARTS, SCENE_TIMINGS } from "./config";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneProfile } from "./scenes/SceneProfile";
import { SceneHistory } from "./scenes/SceneHistory";
import { SceneBusiness } from "./scenes/SceneBusiness";
import { SceneTechnology } from "./scenes/SceneTechnology";
import { SceneLogistics } from "./scenes/SceneLogistics";
import { SceneResponsibility } from "./scenes/SceneResponsibility";

/**
 * 主视频组件
 * 按时间轴依次排列 7 个分镜，每个分镜内部包含画面 + 音频 + 字幕。
 */
export const JdIntroVideo: React.FC = () => {
  const sceneComponents: Record<string, React.FC> = {
    intro: SceneIntro,
    profile: SceneProfile,
    history: SceneHistory,
    business: SceneBusiness,
    technology: SceneTechnology,
    logistics: SceneLogistics,
    responsibility: SceneResponsibility,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B1B3A" }}>
      {SCENE_TIMINGS.map((scene, index) => {
        const Component = sceneComponents[scene.key];
        const from = SCENE_STARTS[index];
        const durationInFrames = Math.round(scene.duration * FPS);
        return (
          <Sequence
            key={scene.key}
            from={from}
            durationInFrames={durationInFrames}
            name={scene.key}
          >
            <Transition>
              <Component />
            </Transition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
