/* @ds-bundle: {"format":4,"namespace":"Kerupu","components":[{"name":"Header"},{"name":"Footer"},{"name":"Card"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  // Pixel icons: 16 by 16 grids. "#" is solid ink, "+" is the same ink at 30%, "." is empty.
  var PIXELS = {"about": ["................", "................", "................", ".##############.", ".#++++++++++++#.", ".#++####++###+#.", ".#++####++++++#.", ".#++++++++##++#.", ".#+######+++++#.", ".#+######+###+#.", ".#++++++++++++#.", ".#++++++++++++#.", ".##############.", "................", "................", "................"], "service": ["................", ".######..######.", ".#++++#..#++++#.", ".#++++#..#++++#.", ".#++++#..#++++#.", ".#++++#..#++++#.", ".######..######.", "................", "................", ".######...####..", ".#++++#..#++++#.", ".#++++#..#++++#.", ".#++++#..#++++#.", ".#++++#..#++++#.", ".######...####..", "................"], "note": ["................", "..########......", "..#++++++##.....", "..#++++++#+#....", "..#++++++#++#...", "..#++++++#####..", "..#++++++++++#..", "..#+########+#..", "..#++++++++++#..", "..#+######+++#..", "..#++++++++++#..", "..#+#####++++#..", "..#++++++++++#..", "..#++++++++++#..", "..############..", "................"], "login": ["................", "........#######.", "........++++++#.", "........++++++#.", "......##++++++#.", ".......##+++++#.", "........##++++#.", ".##########+++#.", ".##########+++#.", "........##++++#.", ".......##+++++#.", "......##++++++#.", "........++++++#.", "........++++++#.", "........#######.", "................"]};

  function PixelIcon(props) {
    var rows = PIXELS[props.name];
    if (!rows) return null;
    var rects = [];
    rows.forEach(function (row, y) {
      var x = 0;
      while (x < 16) {
        var ch = row.charAt(x);
        if (ch === ".") { x++; continue; }
        var x2 = x;
        while (x2 < 16 && row.charAt(x2) === ch) x2++;
        var p = { key: y + "-" + x, x: x, y: y, width: x2 - x, height: 1 };
        if (ch === "+") p.fillOpacity = 0.3;
        rects.push(h("rect", p));
        x = x2;
      }
    });
    return h("svg", {
      className: "k-pixel", viewBox: "0 0 16 16", width: 32, height: 32,
      fill: "currentColor", shapeRendering: "crispEdges", "aria-hidden": "true"
    }, rects);
  }

  var DEFAULT_ITEMS = [
    { icon: "about", label: "소개" },
    { icon: "service", label: "서비스" },
    { icon: "note", label: "개인 게시판" },
    { icon: "login", label: "로그인" }
  ];

  function Header(props) {
    var items = props.items || DEFAULT_ITEMS;
    var title = props.title || "kerupu_workspace";
    return h("header", { className: "k-header" },
      h("a", { className: "k-brand", href: props.homeHref || "#" },
        h("span", { className: "k-disc", "aria-hidden": "true" }, "k"),
        h("span", { className: "k-wordmark" }, title)
      ),
      h("nav", { className: "k-nav", "aria-label": "주 메뉴" },
        items.map(function (it, i) {
          var tag = it.href ? "a" : "button";
          var p = { key: i, className: "k-nav-item" + (it.active ? " is-active" : "") };
          if (it.href) p.href = it.href; else p.type = "button";
          if (it.active) p["aria-current"] = "page";
          if (it.onClick) p.onClick = it.onClick;
          return h(tag, p, h(PixelIcon, { name: it.icon }), it.label);
        })
      )
    );
  }

  function Footer(props) {
    return h("footer", { className: "k-footer" },
      h("div", { className: "k-footer-id" },
        h("div", { className: "k-footer-title" }, props.title || "kerupu_workspace"),
        h("div", { className: "k-footer-note" }, props.note || "\u00a9 2026 \ucf08\ud504 (kerupu526)")
      ),
      h("div", { className: "k-footer-domain" }, props.domain || "kerupu.tech")
    );
  }

  function Card(props) {
    var style = {};
    if (props.width) style.width = props.width;
    if (props.height) style.height = props.height;
    return h("div", { className: "k-card", style: style }, props.children);
  }

  window.Kerupu = { Header: Header, Footer: Footer, Card: Card };
})();
