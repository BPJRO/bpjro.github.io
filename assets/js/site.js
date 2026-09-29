/* 共享站点逻辑：文章元数据加载 + 排序 + 卡片渲染 */
(function () {
  'use strict';

  function normalizePosts(raw) {
    return (raw || []).map(function (p) {
      if (typeof p === 'string') return { slug: p, title: p, date: '', summary: '' };
      return { slug: p.slug, title: p.title || p.slug, date: p.date || '', summary: p.summary || '' };
    });
  }

  function getSlugs() {
    return normalizePosts(window.SITE_DATA && window.SITE_DATA.posts).map(function (p) { return p.slug; });
  }

  function getSortedPostsSync() {
    var raw = (window.SITE_DATA && window.SITE_DATA.posts) || [];
    // 对象数组且都有标题/日期：直接同步排序，首页/列表页零请求
    var hasMeta = raw.length && raw.every(function (p) { return typeof p === 'object' && p.slug && p.title && p.date; });
    if (hasMeta) return window.SiteMd.sortPosts(normalizePosts(raw));
    return null;
  }

  // 加载全部 slug 的 front-matter，返回按日期倒序的 [{slug,title,date,summary}]
  // 若 site-data.js 已内置元数据则直接返回（零请求）；否则回退到逐个 fetch（兼容旧数据）。
  function loadPostsMeta(basePath) {
    var sync = getSortedPostsSync();
    if (sync) return Promise.resolve(sync);
    var slugs = getSlugs();
    var base = basePath || '';
    return Promise.all(
      slugs.map(function (slug) {
        return fetch(base + slug + '.md')
          .then(function (res) { return res.ok ? res.text() : ''; })
          .then(function (text) {
            if (!text) return null;
            var m = window.SiteMd.parseFrontMatter(text);
            return { slug: slug, title: m.meta.title || slug, date: m.meta.date || '', summary: m.meta.summary || '' };
          })
          .catch(function () { return null; });
      })
    ).then(function (results) {
      return window.SiteMd.sortPosts(results.filter(Boolean));
    });
  }

  function postCard(post, linkPrefix, heading) {
    var article = document.createElement('article');
    article.className = 'card post-card';
    var dateDiv = document.createElement('div');
    dateDiv.className = 'post-date muted';
    dateDiv.textContent = post.date || '';
    var title = document.createElement(heading === 'h2' ? 'h2' : 'h3');
    title.className = 'post-title';
    title.textContent = post.title;
    var summary = document.createElement('p');
    summary.className = 'post-summary';
    summary.textContent = post.summary || '这篇文章暂时没有摘要描述。';
    var link = document.createElement('a');
    link.className = 'post-link';
    link.textContent = '阅读更多';
    link.href = linkPrefix + encodeURIComponent(post.slug);
    article.appendChild(dateDiv);
    article.appendChild(title);
    article.appendChild(summary);
    article.appendChild(link);
    return article;
  }

  window.SitePosts = { getSlugs: getSlugs, getSortedPostsSync: getSortedPostsSync, loadPostsMeta: loadPostsMeta, postCard: postCard };
})();
