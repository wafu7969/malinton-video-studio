import { staticFile } from "remotion";
import { useMemo, useEffect, useState } from "react";

/** 字级别时间戳数据 */
export interface WordTiming {
  word: string;
  start_time: number;
  end_time: number;
}

export interface SubtitleData {
  text: string;
  words: WordTiming[];
}

/** 字幕分段（含起止时间，单位秒） */
export interface SubtitleSegment {
  text: string;
  start: number;
  end: number;
}

/**
 * 加载字级别时间戳 JSON
 */
export const useSubtitleData = (jsonPath: string): SubtitleData | null => {
  const [data, setData] = useState<SubtitleData | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(staticFile(jsonPath))
      .then((res) => res.json())
      .then((json) => {
        if (mounted) setData(json as SubtitleData);
      })
      .catch(() => {
        if (mounted) setData(null);
      });
    return () => {
      mounted = false;
    };
  }, [jsonPath]);

  return data;
};

/**
 * 将给定的字幕分段文本，依据字级别时间戳计算每段的起止时间。
 * 采用逐字匹配的方式，保证字幕与语音严格同步。
 */
export const buildSegments = (
  data: SubtitleData | null,
  segments: string[]
): SubtitleSegment[] => {
  if (!data) return [];

  const words = data.words;
  const result: SubtitleSegment[] = [];
  let cursor = 0;

  for (const seg of segments) {
    // 去掉标点后逐字匹配
    const segChars = seg.replace(/[，。、！？；：""''（）]/g, "");
    let matched = 0;
    let start = -1;
    let end = -1;

    for (let i = cursor; i < words.length; i++) {
      const w = words[i].word.replace(/[，。、！？；：""''（）]/g, "");
      if (w.length === 0) continue;
      // 该 word 可能与 segChars 的若干字符匹配
      for (let c = 0; c < w.length; c++) {
        if (matched < segChars.length && w[c] === segChars[matched]) {
          if (start < 0) start = words[i].start_time;
          end = words[i].end_time;
          matched++;
        }
      }
      if (matched >= segChars.length) {
        cursor = i + 1;
        break;
      }
    }

    if (start >= 0 && end >= 0) {
      result.push({ text: seg, start, end });
    }
  }

  return result;
};

/**
 * 组合 Hook：加载并构建字幕分段
 */
export const useSubtitleSegments = (
  jsonPath: string,
  segments: string[]
): SubtitleSegment[] => {
  const data = useSubtitleData(jsonPath);
  return useMemo(() => buildSegments(data, segments), [data, segments]);
};