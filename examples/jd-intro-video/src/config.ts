/**
 * 视频全局配置
 * 说明：集中管理视频尺寸、帧率、各分镜时长等参数，供 Root 与各组件统一引用。
 */

/** 帧率 */
export const FPS = 30;

/** 画面尺寸（16:9 · 2K） */
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

/**
 * 各分镜时长（单位：帧，基于 30fps）
 * 计算依据：音频实际时长 + 转场/留白缓冲，向上取整到整秒
 */
export interface SceneTiming {
  key: string;
  /** 音频文件路径（相对 public） */
  audio: string;
  /** 音频实际时长（秒，来自字级别时间戳末尾） */
  audioDuration: number;
  /** 场景总时长（秒，含缓冲） */
  duration: number;
}

export const SCENE_TIMINGS: SceneTiming[] = [
  { key: "intro", audio: "audio/scene1_intro.mp3", audioDuration: 3.72, duration: 5 },
  { key: "profile", audio: "audio/scene2_profile.mp3", audioDuration: 11.04, duration: 12 },
  { key: "history", audio: "audio/scene3_history.mp3", audioDuration: 9.72, duration: 11 },
  { key: "business", audio: "audio/scene4_business.mp3", audioDuration: 8.73, duration: 10 },
  { key: "technology", audio: "audio/scene5_technology.mp3", audioDuration: 7.64, duration: 9 },
  { key: "logistics", audio: "audio/scene6_logistics.mp3", audioDuration: 7.72, duration: 9 },
  { key: "responsibility", audio: "audio/scene7_responsibility.mp3", audioDuration: 7.56, duration: 9 },
];

/** 各场景在时间轴上的起始帧（累计计算） */
export const SCENE_STARTS: number[] = (() => {
  const starts: number[] = [];
  let acc = 0;
  for (const s of SCENE_TIMINGS) {
    starts.push(acc);
    acc += Math.round(s.duration * FPS);
  }
  return starts;
})();

/** 视频总时长（帧） */
export const TOTAL_DURATION_IN_FRAMES: number = SCENE_TIMINGS.reduce(
  (acc, s) => acc + Math.round(s.duration * FPS),
  0
);

/** 视频总时长（秒） */
export const TOTAL_DURATION_IN_SECONDS = TOTAL_DURATION_IN_FRAMES / FPS;
