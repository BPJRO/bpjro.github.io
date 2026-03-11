// 个人信息
const profile = {
  name: "BPJRO",
  title: "被差别民",
  location: "上海",
  bio: "真的有人会看自我介绍吗？"
};

// 近期情况：极简列表
const recentHighlights = [
  { text: "打万金油零工" },
  { text: "提升选课学造诣" },
  { text: "探索纯AI不加一点人工的代码" }
];

// 近期情况：时间线（按时间倒序书写更直观）
const timelineEvents = [
  { date: "2026-03-11", text: "使用OpenCode + MiMo V2 Flash Free优化此主页" },
  { date: "2026-03-04", text: "使用Cursor搭建此主页并发布在Github Pages上" },
  { date: "2025-12-01", text: "第一份零工结束" },
  { date: "2024-09-01", text: "晋升成为万金油" },
  { date: "约2018-2020", text: "Fork别人做好的Jekyll模板试图搭建自己的Homepage，最终因Github Pages被GFW & Gitee Pages和谐化而倒闭" }
];

// 文章列表（slug 将用于生成 posts/<slug>.html 链接）
const posts = [
  {
    slug: "post20260304",
    title: "主页重建纪念",
    date: "2026-03-04",
    summary: "主页重建纪念的文章。"
  },
  {
    slug: "post20210806_recall",
    title: "一些小玩意",
    date: "2021-08-06",
    summary: "为数不多旧主页能找到的文章，复刻在新主页。旧博客文章存档于2022年3月与其他存档文件一起被误删。"
  },
  {
    slug: "post2",
    title: "施工中",
    date: "2026-03-04",
    summary: "施工中的文章。打算回顾一下2017年以来有关个人主页的故事"
  },
  {
    slug: "post20260311",
    title: "3月11日杂记",
    date: "2026-03-11",
    summary: "随便写了点"
  },
  {
    slug: "md_format_test",
    title: "Markdown 格式测试",
    date: "2026-03-11",
    summary: "测试新的Markdown解析功能"
  }
];

// 暴露到全局，方便页面脚本访问
window.SITE_DATA = {
  profile,
  recentHighlights,
  timelineEvents,
  posts
};

