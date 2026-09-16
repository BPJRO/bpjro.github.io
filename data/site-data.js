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

// 文章列表：只需添加 slug，标题/日期/摘要从 md 文件的 front matter 自动读取
const posts = [
  "post20260311",
  "post20260304",
  "post20210806_recall",
  "post2",
  "md_format_test"
];

// 暴露到全局，方便页面脚本访问
window.SITE_DATA = {
  profile,
  recentHighlights,
  timelineEvents,
  posts
};

