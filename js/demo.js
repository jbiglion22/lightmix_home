// 홈페이지 체험 퍼즐: 거울을 눌러 방향을 바꾸고 수신기에 목표 색(노랑)을 만든다.
// 앱과 같은 규칙(방향별 반사, 빛 흡수, RGB 합산)만 단순하게 옮긴 소형 버전이다.
(function () {
  'use strict';

  var board = document.getElementById('demo-board');
  if (!board) return;

  var ko = document.documentElement.lang === 'ko';
  var TXT = ko ? {
    idle: function (t) { return '수신기가 꺼져 있어요. 목표는 ' + t + '입니다. 거울을 눌러 보세요!'; },
    partial: function (c, t, m) { return '현재 ' + c + ' · 목표 ' + t + ' — ' + m + ' 빛이 부족해요.'; },
    solved: '성공! 빨강 + 초록 = 노랑. 앱에는 이런 퍼즐이 100개 있어요.',
    hint: '깜박이는 거울을 눌러 보세요.',
    mirror: function (n, s) { return '거울 ' + n + ', 현재 방향 ' + s + '. 누르면 방향이 바뀝니다.'; },
    names: { 1: '빨강', 2: '초록', 3: '노랑', 4: '파랑', 5: '마젠타', 6: '시안', 7: '흰색' },
    join: ' + '
  } : {
    idle: function (t) { return 'The receiver is off. The target is ' + t + '. Tap a mirror!'; },
    partial: function (c, t, m) { return 'Now ' + c + ' · target ' + t + ' — missing ' + m + ' light.'; },
    solved: 'Solved! Red + Green = Yellow. The app has 100 puzzles like this.',
    hint: 'Tap the blinking mirror.',
    mirror: function (n, s) { return 'Mirror ' + n + ', currently ' + s + '. Tap to flip it.'; },
    names: { 1: 'red', 2: 'green', 3: 'yellow', 4: 'blue', 5: 'magenta', 6: 'cyan', 7: 'white' },
    join: ' + '
  };

  var NS = 'http://www.w3.org/2000/svg';
  var N = 5, S = 64, H = S / 2;
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];          // 위, 오른쪽, 아래, 왼쪽
  var SLASH = [1, 0, 3, 2];                            // '/' 반사
  var BACK = [3, 2, 1, 0];                             // '\' 반사
  var COL = { 1: '#ff657b', 2: '#5ce3a1', 4: '#6296ff' };
  var MIX = { 0: '#0c192b', 1: '#ff657b', 2: '#5ce3a1', 3: '#ffd66b', 4: '#6296ff', 5: '#e58cff', 6: '#62dcf2', 7: '#ffffff' };
  var TARGET = 3;

  var sources = [
    { x: 0, y: 1, d: 1, c: 1 },
    { x: 4, y: 0, d: 2, c: 2 },
    { x: 0, y: 4, d: 1, c: 4 }
  ];
  var walls = [{ x: 0, y: 3 }];
  var recv = { x: 2, y: 2 };
  var mirrors = [
    { x: 2, y: 1, s: '/',  start: '/',  ans: '\\' },
    { x: 4, y: 3, s: '\\', start: '\\', ans: '/' },
    { x: 2, y: 3, s: '/',  start: '/',  ans: '\\' }
  ];

  var cells = {};
  sources.forEach(function (o) { cells[o.x + ',' + o.y] = { t: 'src' }; });
  walls.forEach(function (o) { cells[o.x + ',' + o.y] = { t: 'wall' }; });
  cells[recv.x + ',' + recv.y] = { t: 'recv' };
  mirrors.forEach(function (m) { cells[m.x + ',' + m.y] = { t: 'mirror', m: m }; });

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ---------- 정적 요소 ----------
  board.setAttribute('viewBox', '0 0 ' + N * S + ' ' + N * S);
  board.setAttribute('role', 'group');
  board.setAttribute('aria-label', ko ? '체험 퍼즐 보드' : 'Demo puzzle board');

  var defs = el('defs', {}, board);
  var f = el('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  el('feGaussianBlur', { stdDeviation: '4', result: 'b' }, f);
  var fm = el('feMerge', {}, f);
  el('feMergeNode', { 'in': 'b' }, fm);
  el('feMergeNode', { 'in': 'SourceGraphic' }, fm);

  var gridLayer = el('g', {}, board);
  for (var i = 0; i <= N; i++) {
    el('line', { x1: i * S, y1: 0, x2: i * S, y2: N * S, stroke: '#1b3049', 'stroke-width': 1 }, gridLayer);
    el('line', { x1: 0, y1: i * S, x2: N * S, y2: i * S, stroke: '#1b3049', 'stroke-width': 1 }, gridLayer);
  }

  walls.forEach(function (w) {
    el('rect', { x: w.x * S + 8, y: w.y * S + 8, width: S - 16, height: S - 16, rx: 6, fill: '#22364f', stroke: '#3a5675' }, gridLayer);
  });

  var beamLayer = el('g', { filter: 'url(#glow)', 'stroke-linecap': 'round' }, board);

  sources.forEach(function (s) {
    var cx = s.x * S + H, cy = s.y * S + H;
    el('circle', { cx: cx, cy: cy, r: 17, fill: '#0c192b', stroke: COL[s.c], 'stroke-width': 3 }, board);
    el('circle', { cx: cx, cy: cy, r: 8, fill: COL[s.c] }, board);
    var ax = cx + DX[s.d] * 22, ay = cy + DY[s.d] * 22;
    el('circle', { cx: ax, cy: ay, r: 3.5, fill: COL[s.c] }, board);
  });

  var rcx = recv.x * S + H, rcy = recv.y * S + H;
  el('circle', { cx: rcx, cy: rcy, r: 22, fill: '#0c192b', stroke: MIX[TARGET], 'stroke-width': 4 }, board);
  var core = el('circle', { 'class': 'recv-core', cx: rcx, cy: rcy, r: 13, fill: MIX[0] }, board);

  var mirrorEls = mirrors.map(function (m, idx) {
    var g = el('g', { 'class': 'mirror', tabindex: 0, role: 'button' }, board);
    el('rect', { 'class': 'halo', x: m.x * S + 5, y: m.y * S + 5, width: S - 10, height: S - 10, rx: 10 }, g);
    var ln = el('line', { stroke: '#f3f7fc', 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
    var o = { g: g, line: ln, m: m, idx: idx };
    g.addEventListener('click', function () { flip(o); });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(o); }
    });
    return o;
  });

  // ---------- 계산 ----------
  function trace() {
    var segs = [], mask = 0;
    sources.forEach(function (s) {
      var x = s.x, y = s.y, d = s.d, cx = x * S + H, cy = y * S + H;
      for (var i = 0; i < 30; i++) {
        var nx = x + DX[d], ny = y + DY[d];
        var out = nx < 0 || ny < 0 || nx >= N || ny >= N;
        var cell = out ? { t: 'out' } : (cells[nx + ',' + ny] || { t: 'empty' });
        if (cell.t === 'out' || cell.t === 'wall' || cell.t === 'src') {
          segs.push([cx, cy, cx + DX[d] * H, cy + DY[d] * H, s.c]);
          break;
        }
        var tx = nx * S + H, ty = ny * S + H;
        segs.push([cx, cy, tx, ty, s.c]);
        x = nx; y = ny; cx = tx; cy = ty;
        if (cell.t === 'recv') { mask |= s.c; break; }
        if (cell.t === 'mirror') d = (cell.m.s === '/' ? SLASH : BACK)[d];
      }
    });
    return { segs: segs, mask: mask };
  }

  // ---------- 그리기 ----------
  var demo = document.getElementById('demo');
  var statusEl = document.getElementById('demo-status');
  var hintIdx = -1;

  function names(mask) {
    var out = [];
    [1, 2, 4].forEach(function (b) { if (mask & b) out.push(TXT.names[b]); });
    return out.join(TXT.join);
  }

  function render() {
    var r = trace();
    while (beamLayer.firstChild) beamLayer.removeChild(beamLayer.firstChild);
    r.segs.forEach(function (s) {
      var l = el('line', { x1: s[0], y1: s[1], x2: s[2], y2: s[3], stroke: COL[s[4]], 'stroke-width': 5 }, beamLayer);
      l.style.mixBlendMode = 'screen';
    });
    core.setAttribute('fill', MIX[r.mask]);

    mirrorEls.forEach(function (o) {
      var m = o.m, x0 = m.x * S, y0 = m.y * S, p = 15;
      if (m.s === '/') {
        o.line.setAttribute('x1', x0 + p); o.line.setAttribute('y1', y0 + S - p);
        o.line.setAttribute('x2', x0 + S - p); o.line.setAttribute('y2', y0 + p);
      } else {
        o.line.setAttribute('x1', x0 + p); o.line.setAttribute('y1', y0 + p);
        o.line.setAttribute('x2', x0 + S - p); o.line.setAttribute('y2', y0 + S - p);
      }
      o.g.setAttribute('aria-label', TXT.mirror(o.idx + 1, m.s));
      o.g.classList.toggle('hint', o.idx === hintIdx);
    });

    var solved = r.mask === TARGET;
    demo.classList.toggle('solved', solved);
    if (solved) {
      statusEl.textContent = TXT.solved;
    } else if (hintIdx >= 0) {
      statusEl.textContent = TXT.hint;
    } else if (r.mask === 0) {
      statusEl.textContent = TXT.idle(TXT.names[TARGET]);
    } else {
      statusEl.textContent = TXT.partial(TXT.names[r.mask], TXT.names[TARGET], names(TARGET & ~r.mask) || names(r.mask & ~TARGET));
    }
  }

  function flip(o) {
    o.m.s = o.m.s === '/' ? '\\' : '/';
    hintIdx = -1;
    render();
  }

  document.getElementById('demo-hint').addEventListener('click', function () {
    hintIdx = -1;
    for (var i = 0; i < mirrors.length; i++) {
      if (mirrors[i].s !== mirrors[i].ans) { hintIdx = i; break; }
    }
    render();
  });

  document.getElementById('demo-reset').addEventListener('click', function () {
    mirrors.forEach(function (m) { m.s = m.start; });
    hintIdx = -1;
    render();
  });

  render();
})();
