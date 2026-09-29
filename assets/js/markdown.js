/* 共享 Markdown 工具：front-matter 解析 + 安全行内格式 + 块级渲染
 * 设计目标：零依赖、XSS 安全、容错（非 ISO 日期、含冒号标题）。
 * 对外暴露 window.SiteMd = { parseFrontMatter, markdownToHtml, parseDateSafe, sortPosts }
 */
(function () {
  'use strict';

  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // 仅允许 http/https/mailto/相对路径/锚点，拦截 javascript:/data:/vbscript:
  function isSafeUrl(url) {
    var u = String(url || '').trim();
    if (!u) return false;
    if (/^(#|\/|\.\/|\.\.\/)/.test(u)) return true;
    if (/^(https?:|mailto:)/i.test(u)) {
      return !/^(javascript|data|vbscript):/i.test(u);
    }
    // posts/md/xxx.md、图片相对路径等：不含冒号即视为相对路径
    if (u.indexOf(':') === -1) return true;
    return false;
  }

  // front-matter：支持 value 含冒号、首尾引号
  function parseFrontMatter(markdown) {
    var result = { meta: {}, body: markdown || '' };
    var match = String(markdown || '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) return result;
    var lines = match[1].split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim() || line.trim().charAt(0) === '#') continue;
      var idx = line.indexOf(':');
      if (idx === -1) continue;
      var key = line.slice(0, idx).trim();
      var val = line.slice(idx + 1).trim();
      // 去掉首尾配套引号
      if (val.length >= 2) {
        var f = val.charAt(0), l = val.charAt(val.length - 1);
        if ((f === '"' && l === '"') || (f === "'" && l === "'")) {
          val = val.slice(1, -1);
        }
      }
      if (key) result.meta[key] = val;
    }
    result.body = String(markdown).slice(match[0].length);
    return result;
  }

  // 行内格式：先抽出行内代码占位 -> 转义 -> 链接/图片(校验 URL) -> 粗斜体 -> 恢复代码
  function inlineFormat(raw) {
    if (!raw) return '';
    var codeSpans = [];
    var text = String(raw).replace(/`([^`\n]+)`/g, function (_, code) {
      codeSpans.push(code);
      return '\u0000CODE' + (codeSpans.length - 1) + '\u0000';
    });
    text = escapeHtml(text);
    // 图片 ![alt](src) —— alt 已转义，src 需校验
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*?&quot;)?\)/g, function (_, alt, src) {
      if (!isSafeUrl(src)) return escapeHtml(_);
      return '<img src="' + escapeHtml(src) + '" alt="' + alt + '" loading="lazy" style="max-width:100%;height:auto;">';
    });
    // 链接 [text](url) —— text 允许已生成的 <em>/<strong> 前先做链接
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
      if (!isSafeUrl(href)) return escapeHtml(label);
      return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + label + '</a>';
    });
    // ***粗斜体 -> **粗体 -> * / _ 斜体（顺序固定，避免互吃）
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*\w])\*([^*\n]+?)\*/g, '$1<em>$2</em>');
    text = text.replace(/(^|[^_\w])_([^_\n]+?)_/g, '$1<em>$2</em>');
    // 恢复行内代码
    text = text.replace(/\u0000CODE(\d+)\u0000/g, function (_, n) {
      return '<code>' + escapeHtml(codeSpans[Number(n)]) + '</code>';
    });
    return text;
  }

  function isTableDelimiter(line) {
    return /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line);
  }

  function splitTableRow(line) {
    var s = String(line).trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
    return s.split('|').map(function (c) { return c.trim(); });
  }

  // 非 ISO 日期容错："约2018-2020" 取首个 YYYY-MM-DD / YYYY-MM / YYYY，取不到返回 NaN
  function parseDateSafe(v) {
    if (!v) return NaN;
    var s = String(v).trim();
    var t = Date.parse(s);
    if (!isNaN(t)) return t;
    var m = s.match(/(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?/);
    if (!m) return NaN;
    var y = Number(m[1]), mo = Number(m[2] || 1), d = Number(m[3] || 1);
    return Date.UTC(y, mo - 1, d);
  }

  function sortPosts(posts) {
    return posts.slice().sort(function (a, b) {
      var ta = parseDateSafe(a.date), tb = parseDateSafe(b.date);
      var aNaN = isNaN(ta), bNaN = isNaN(tb);
      if (aNaN && bNaN) return String(a.slug).localeCompare(String(b.slug));
      if (aNaN) return 1;
      if (bNaN) return -1;
      if (tb !== ta) return tb - ta;
      return String(a.slug).localeCompare(String(b.slug));
    });
  }

  function markdownToHtml(markdown) {
    if (!markdown) return '';
    var lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var inCode = false, codeBuf = [], codeLang = '';
    var listStack = []; // {type:'ul'|'ol'}
    var quoteBuf = [];
    var tableBuf = null;

    function closeCode() {
      if (!inCode) return;
      var cls = codeLang ? ' class="language-' + escapeHtml(codeLang) + '"' : '';
      html.push('<pre><code' + cls + '>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
      inCode = false; codeBuf = []; codeLang = '';
    }
    function closeListsUntil(indent) {
      while (listStack.length && listStack[listStack.length - 1].indent >= indent) {
        html.push('</' + listStack.pop().type + '>');
      }
    }
    function closeLists() { closeListsUntil(0); }
    function openList(type, indent) {
      var top = listStack[listStack.length - 1];
      if (top && top.indent === indent && top.type === type) return;
      if (top && top.indent === indent && top.type !== type) {
        html.push('</' + listStack.pop().type + '>');
      }
      closeListsUntil(indent + 1);
      top = listStack[listStack.length - 1];
      if (!top || top.indent < indent) { html.push('<' + type + '>'); listStack.push({ type: type, indent: indent }); }
      else if (top.type !== type) { html.push('</' + listStack.pop().type + '>'); html.push('<' + type + '>'); listStack.push({ type: type, indent: indent }); }
    }
    function flushQuote() {
      if (!quoteBuf.length) return;
      html.push('<blockquote>' + quoteBuf.map(inlineFormat).join('<br>') + '</blockquote>');
      quoteBuf = [];
    }
    function flushTable() {
      if (!tableBuf) return;
      var rows = tableBuf.rows;
      html.push('<div class="table-wrap"><table>');
      html.push('<thead><tr>' + tableBuf.head.map(function (c) { return '<th>' + inlineFormat(c) + '</th>'; }).join('') + '</tr></thead>');
      if (rows.length) {
        html.push('<tbody>');
        rows.forEach(function (r) {
          html.push('<tr>' + r.map(function (c) { return '<td>' + inlineFormat(c) + '</td>'; }).join('') + '</tr>');
        });
        html.push('</tbody>');
      }
      html.push('</table></div>');
      tableBuf = null;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], trimmed = line.trim();

      if (/^```/.test(trimmed)) {
        flushQuote(); flushTable(); closeLists();
        if (!inCode) { inCode = true; codeLang = trimmed.slice(3).trim().split(/\s+/)[0] || ''; }
        else closeCode();
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }
      if (!trimmed) { flushQuote(); flushTable(); closeLists(); continue; }

      // 表格：头 + 分隔行 + 数据行
      if (trimmed.indexOf('|') !== -1 && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
        flushQuote(); closeLists();
        var head = splitTableRow(line);
        var bodyRows = [], j = i + 2;
        while (j < lines.length && lines[j].trim().indexOf('|') !== -1 && lines[j].trim() !== '') {
          bodyRows.push(splitTableRow(lines[j])); j++;
        }
        tableBuf = { head: head, rows: bodyRows };
        flushTable();
        i = j - 1;
        continue;
      }

      // 引用（合并连续行）
      var qm = trimmed.match(/^&gt;|^>/);
      if (/^&gt;/.test(trimmed)) { trimmed = trimmed.replace(/^&gt;\s?/, '>'); }
      if (trimmed.charAt(0) === '>') {
        flushTable(); closeLists();
        quoteBuf.push(trimmed.replace(/^>\s?/, ''));
        continue;
      } else flushQuote();

      // 分隔线
      if (/^([-*_])(\s*\1){2,}\s*$/.test(trimmed)) {
        flushTable(); closeLists();
        html.push('<hr>'); continue;
      }

      // 标题
      var h = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushTable(); closeLists();
        var lv = h[1].length;
        html.push('<h' + lv + '>' + inlineFormat(h[2]) + '</h' + lv + '>');
        continue;
      }

      // 任务列表 / 有序 / 无序（indent 每 2 空格一级，支持嵌套）
      var task = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (task) {
        flushTable(); openList('ul', Math.floor(task[1].replace(/\t/g, '  ').length / 2));
        var checked = /[xX]/.test(task[2]) ? ' checked disabled' : ' disabled';
        html.push('<li class="task"><input type="checkbox"' + checked + '> ' + inlineFormat(task[3]) + '</li>');
        continue;
      }
      var ol = line.match(/^(\s*)\d+[.)]\s+(.*)$/);
      if (ol) {
        flushTable(); openList('ol', Math.floor(ol[1].replace(/\t/g, '  ').length / 2));
        html.push('<li>' + inlineFormat(ol[2]) + '</li>');
        continue;
      }
      var ul = line.match(/^(\s*)[-*]\s+(.*)$/);
      if (ul) {
        flushTable(); openList('ul', Math.floor(ul[1].replace(/\t/g, '  ').length / 2));
        html.push('<li>' + inlineFormat(ul[2]) + '</li>');
        continue;
      }

      flushTable(); closeLists();
      html.push('<p>' + inlineFormat(trimmed) + '</p>');
    }
    flushQuote(); flushTable(); closeLists(); closeCode();
    return html.join('\n');
  }

  window.SiteMd = {
    escapeHtml: escapeHtml,
    isSafeUrl: isSafeUrl,
    parseFrontMatter: parseFrontMatter,
    inlineFormat: inlineFormat,
    markdownToHtml: markdownToHtml,
    parseDateSafe: parseDateSafe,
    sortPosts: sortPosts
  };
})();
