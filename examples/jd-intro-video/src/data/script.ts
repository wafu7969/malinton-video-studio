/**
 * 京东集团介绍视频 · 分镜脚本与字幕文案
 * 说明：本文件为视频的文案数据源，配音与字幕均以此为准，保证严格一致。
 */

export interface SceneScript {
  /** 场景序号 */
  id: number;
  /** 场景标识（用于组件映射） */
  key: string;
  /** 场景标题 */
  title: string;
  /** 场景副标题 */
  subtitle: string;
  /** 完整讲解文案（用于 TTS 生成，一段连续文本） */
  narration: string;
  /** 字幕分段（按语义切分，保证不拆词，末尾无标点） */
  subtitles: string[];
}

export const SCENE_SCRIPTS: SceneScript[] = [
  {
    id: 1,
    key: "intro",
    title: "京东集团",
    subtitle: "科技引领 · 服务至上",
    narration: "京东集团，中国领先的技术驱动型供应链服务企业。",
    subtitles: ["京东集团", "中国领先的技术驱动型供应链服务企业"],
  },
  {
    id: 2,
    key: "profile",
    title: "公司简介",
    subtitle: "从柜台到世界舞台",
    narration:
      "京东成立于一九九八年，从一个中关村柜台起步，如今已成长为覆盖零售、物流、科技、健康等多元业务的大型企业集团，服务全球数亿用户。",
    subtitles: [
      "京东成立于一九九八年",
      "从一个中关村柜台起步",
      "如今已成长为多元业务的大型企业集团",
      "服务全球数亿用户",
    ],
  },
  {
    id: 3,
    key: "history",
    title: "发展历程",
    subtitle: "二十余载 · 砥砺前行",
    narration:
      "一九九八年，京东在中关村创立。二零零四年转型线上零售，二零一四年登陆纳斯达克，二零二零年回归香港上市，一步步走向世界舞台。",
    subtitles: [
      "一九九八年，京东在中关村创立",
      "二零零四年转型线上零售",
      "二零一四年登陆纳斯达克",
      "二零二零年回归香港上市",
      "一步步走向世界舞台",
    ],
  },
  {
    id: 4,
    key: "business",
    title: "核心业务",
    subtitle: "多元协同 · 全面发展",
    narration:
      "京东零售连接亿万消费者与品牌商家，京东物流打造高效供应链网络，京东科技赋能产业数字化，京东健康守护全民健康。",
    subtitles: [
      "京东零售连接亿万消费者与品牌商家",
      "京东物流打造高效供应链网络",
      "京东科技赋能产业数字化",
      "京东健康守护全民健康",
    ],
  },
  {
    id: 5,
    key: "technology",
    title: "技术实力",
    subtitle: "创新驱动 · 智能引领",
    narration:
      "京东持续投入人工智能、大数据与云计算，以技术创新驱动供应链效率提升，让智能科技融入每一个环节。",
    subtitles: [
      "京东持续投入人工智能、大数据与云计算",
      "以技术创新驱动供应链效率提升",
      "让智能科技融入每一个环节",
    ],
  },
  {
    id: 6,
    key: "logistics",
    title: "物流体系",
    subtitle: "极速履约 · 覆盖全国",
    narration:
      "京东物流构建覆盖全国的智能仓配网络，九成以上订单实现当日达或次日达，用速度重新定义服务体验。",
    subtitles: [
      "京东物流构建覆盖全国的智能仓配网络",
      "九成以上订单实现当日达或次日达",
      "用速度重新定义服务体验",
    ],
  },
  {
    id: 7,
    key: "responsibility",
    title: "社会责任",
    subtitle: "技术为本 · 向善而行",
    narration:
      "京东积极履行社会责任，推动绿色低碳与乡村振兴。技术为本，致力于更高效和可持续的世界。",
    subtitles: [
      "京东积极履行社会责任",
      "推动绿色低碳与乡村振兴",
      "技术为本，致力于更高效和可持续的世界",
    ],
  },
];

/** 品牌主题色 */
export const COLORS = {
  jdRed: "#E1251B",
  deepBlue: "#0B1B3A",
  blue: "#1E3A8A",
  brightBlue: "#3B82F6",
  gold: "#F5C518",
  white: "#FFFFFF",
  lightGray: "#F1F5F9",
  green: "#22C55E",
};

/** 字体配置（均为免费无版权字体） */
export const FONTS = {
  title: "'Alibaba PuHuiTi 3.0 - 115 Black', 'Noto Sans SC', 'Source Han Sans SC', sans-serif",
  body: "'Noto Sans SC', 'Source Han Sans SC', sans-serif",
  subtitle: "'Source Han Sans SC', 'Noto Sans SC', sans-serif",
};
