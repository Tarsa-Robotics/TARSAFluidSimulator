/* @ds-bundle: {"format":4,"namespace":"TARSADesignSystem_558026","components":[],"sourceHashes":{"ui_kits/website/primitives.jsx":"7b1a83d27c5f","ui_kits/website/sections.jsx":"e3cda70e68ac"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TARSADesignSystem_558026 = window.TARSADesignSystem_558026 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/website/primitives.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// TARSA website — shared primitives. Exports to window for cross-file use.
const {
  useState
} = React;
function Mark({
  size = 28,
  variant = "ink"
}) {
  const src = variant === "light" ? "../../assets/logo/tarsa-mark-light.svg" : variant === "signal" ? "../../assets/logo/tarsa-mark-signal.svg" : "../../assets/logo/tarsa-mark.svg";
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    width: size,
    height: size,
    alt: "TARSA",
    style: {
      display: "block"
    }
  });
}
function Wordmark({
  size = 22,
  color = "var(--ink)"
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "0.02em",
      color,
      lineHeight: 1
    }
  }, "TARSA");
}
function Eyebrow({
  children,
  tick = false,
  color = "var(--fg-2)"
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: tick ? "eyebrow-tick" : "",
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 500,
      fontSize: 12,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color,
      display: "inline-flex",
      alignItems: "center"
    }
  }, children);
}
function Button({
  kind = "primary",
  lg = false,
  children,
  icon,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    className: `btn btn--${kind}${lg ? " btn--lg" : ""}`
  }, rest), children, icon && /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-sharp",
    style: {
      fontSize: lg ? 20 : 18
    }
  }, icon));
}
function Tag({
  kind,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: `tag${kind ? " tag--" + kind : ""}`
  }, children);
}
function Datum({
  signal = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `datum${signal ? " datum--signal" : ""}`,
    style: style
  });
}

/* ---------- motif: coordinate field (repeatable texture layer) ---------- */
function CoordinateField({
  dark = false,
  gap = 120,
  style
}) {
  const stroke = dark ? "#23262C" : "var(--n-100)";
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "100%",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: `cf${gap}${dark ? "d" : "l"}`,
    width: gap,
    height: gap,
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("path", {
    d: `M ${gap} 0 L 0 0 0 ${gap}`,
    fill: "none",
    stroke: stroke,
    strokeWidth: "1"
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "100%",
    height: "100%",
    fill: `url(#cf${gap}${dark ? "d" : "l"})`
  })));
}

/* ---------- motif: convergence (focal layer — four corners → one node) ---------- */
function Convergence({
  xPct = 70,
  yPct = 50,
  dark = true,
  label,
  style
}) {
  const line = dark ? "#3C4047" : "var(--n-300)";
  const x = xPct,
    y = yPct;
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    width: "100%",
    height: "100%",
    preserveAspectRatio: "none",
    style: {
      display: "block",
      position: "absolute",
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("g", {
    stroke: line,
    strokeWidth: "0.18",
    vectorEffect: "non-scaling-stroke"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "0",
    x2: x,
    y2: y
  }), /*#__PURE__*/React.createElement("line", {
    x1: "100",
    y1: "0",
    x2: x,
    y2: y
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "100",
    x2: x,
    y2: y
  }), /*#__PURE__*/React.createElement("line", {
    x1: "100",
    y1: "100",
    x2: x,
    y2: y
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%,-50%)",
      width: 10,
      height: 10,
      background: "var(--signal)"
    }
  }), label && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: `calc(${x}% + 14px)`,
      top: `${y}%`,
      transform: "translateY(-50%)",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      letterSpacing: "0.12em",
      color: dark ? "#9AA0A7" : "var(--fg-3)",
      whiteSpace: "nowrap"
    }
  }, label));
}

// section wrapper with consistent gutters + max width
function Section({
  id,
  dark = false,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: id,
    "data-screen-label": id,
    style: {
      background: dark ? "var(--ink-bg)" : "transparent",
      color: dark ? "var(--fg-on-ink)" : "var(--ink)",
      padding: "96px 0",
      position: "relative",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "0 32px",
      position: "relative",
      zIndex: 1
    }
  }, children));
}
Object.assign(window, {
  Mark,
  Wordmark,
  Eyebrow,
  Button,
  Tag,
  Datum,
  Section,
  CoordinateField,
  Convergence
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/primitives.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/sections.jsx
try { (() => {
// TARSA website — sections + bilingual content + App.
const {
  useState: useS,
  useEffect: useE
} = React;

/* ---------- bilingual copy ---------- */
const COPY = {
  en: {
    nav: ["How it works", "Specifications", "Why tethered", "Contact"],
    survey: "Book a survey",
    eyebrow: "Facade robotics · Montréal",
    h1a: "Precision",
    h1b: "at height.",
    sub: "TARSA strings a small robot across your facade on four cables and washes the glass with soap and deionized water, pumped from the ground. No battery, no flight, no one on a rope.",
    cta1: "Book a survey",
    cta2: "Read the specifications",
    stat: "Developed at Concordia University, supervised by faculty.",
    hiwEy: "How it works",
    hiwH: "Four corners. One payload. Zero people on rope.",
    steps: [["01", "Anchor", "Four motorized reels mount at the facade corners — two on the roof, two at ground level. Setup is temporary and leaves no facade fixings."], ["02", "Position", "The four cables move a small payload anywhere on the facade plane. Tension is balanced across all four corners, continuously."], ["03", "See", "An onboard camera reads the glass and finds what is actually dirty, pane by pane."], ["04", "Clean", "Soap and deionized water are pumped from the ground through the tether and applied under pressure. A rotating nozzle aims the spray; it wets only where the camera says it must."]],
    specEy: "Specifications",
    specH: "Engineered to a survey, not a guess.",
    specNote: "Nominal figures. Every building is surveyed before a quote.",
    specs: [["Wash pressure", "2,800 psi"], ["Traverse speed", "8.4 m/min"], ["Reels", "4 × corner"], ["Payload", "30 × 50 cm"], ["Nozzle rotation", "40°"], ["Water + supply", "Ground-fed"], ["Onboard battery", "None — tethered"], ["Max facade", "120 m"]],
    safeEy: "Why tethered",
    safeH: "Tethered, not flown.",
    safeBody: "A facade drone carries its battery and its water into the air over a public street, inside regulated airspace. TARSA hangs from four cables instead. Power and water come up the tether from the ground — nothing is flown, nothing is on a rope, and there is no flight permit to file.",
    safeStat: "flown. Nothing aloft, by design.",
    ctaEy: "Contact",
    ctaH: "Book a survey for your building.",
    ctaBody: "Tell us the address and height. We survey every facade before we quote — no obligation.",
    fAddr: "Building address",
    fHeight: "Facade height (m)",
    fMode: "Surface",
    fModeOpt: "Glass + frame",
    fSubmit: "Request a survey",
    footTag: "Facade robotics",
    rights: "All rights reserved."
  },
  fr: {
    nav: ["Fonctionnement", "Spécifications", "Pourquoi relié", "Contact"],
    survey: "Réserver une étude",
    eyebrow: "Robotique de façade · Montréal",
    h1a: "La précision",
    h1b: "en hauteur.",
    sub: "TARSA déplace un petit robot sur votre façade à l'aide de quatre câbles et lave le verre à l'eau désionisée savonneuse, pompée depuis le sol. Sans batterie, sans vol, sans personne sur une corde.",
    cta1: "Réserver une étude",
    cta2: "Lire les spécifications",
    stat: "Développé à l'Université Concordia, encadré par le corps professoral.",
    hiwEy: "Fonctionnement",
    hiwH: "Quatre coins. Une charge utile. Personne sur corde.",
    steps: [["01", "Ancrer", "Quatre treuils motorisés se montent aux coins de la façade — deux sur le toit, deux au sol. L'installation est temporaire et ne laisse aucune fixation."], ["02", "Positionner", "Les quatre câbles déplacent une petite charge utile partout sur le plan de la façade. La tension est équilibrée en continu sur les quatre coins."], ["03", "Voir", "Une caméra embarquée lit le verre et détecte ce qui est réellement sale, vitre par vitre."], ["04", "Nettoyer", "L'eau désionisée savonneuse est pompée du sol par le câble d'alimentation et appliquée sous pression. Une buse rotative oriente le jet ; il ne mouille que là où la caméra l'exige."]],
    specEy: "Spécifications",
    specH: "Conçu sur étude, pas sur estimation.",
    specNote: "Valeurs nominales. Chaque bâtiment est étudié avant devis.",
    specs: [["Pression de lavage", "2 800 psi"], ["Vitesse de déplacement", "8,4 m/min"], ["Treuils", "4 × coin"], ["Charge utile", "30 × 50 cm"], ["Rotation de buse", "40°"], ["Eau + alimentation", "Depuis le sol"], ["Batterie embarquée", "Aucune — relié"], ["Façade max", "120 m"]],
    safeEy: "Pourquoi relié",
    safeH: "Relié, pas en vol.",
    safeBody: "Un drone de façade emporte sa batterie et son eau dans les airs au-dessus de la rue, en espace aérien réglementé. TARSA pend de quatre câbles à la place. L'énergie et l'eau montent du sol par le câble — rien n'est en vol, personne n'est sur une corde, et aucun permis de vol n'est requis.",
    safeStat: "en vol. Rien dans les airs, par conception.",
    ctaEy: "Contact",
    ctaH: "Réservez une étude pour votre bâtiment.",
    ctaBody: "Donnez-nous l'adresse et la hauteur. Nous étudions chaque façade avant de chiffrer — sans engagement.",
    fAddr: "Adresse du bâtiment",
    fHeight: "Hauteur de façade (m)",
    fMode: "Surface",
    fModeOpt: "Verre + cadre",
    fSubmit: "Demander une étude",
    footTag: "Robotique de façade",
    rights: "Tous droits réservés."
  }
};

/* ---------- planar CDPR diagram — front elevation of the facade plane ----------
   Four reels at the facade corners (2 roof, 2 ground). Four cables converge to a
   small payload that traverses the plane. The payload is an (X,Y) coordinate.     */
function RigDiagram({
  activeStep = -1,
  height = 420
}) {
  const ink = "var(--ink)";
  // facade rectangle in viewBox coords
  const L = 56,
    R = 304,
    T = 40,
    B = 380;
  const corners = [[L, T], [R, T], [L, B], [R, B]]; // TL TR (roof) · BL BR (ground)
  // payload position — parks centre-ish, moves per active step
  const positions = [[120, 120], [232, 150], [150, 250], [212, 300]];
  const [px, py] = activeStep >= 0 ? positions[activeStep] : [180, 200];
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 360 470",
    width: "100%",
    style: {
      height,
      maxHeight: height,
      display: "block"
    },
    fill: "none"
  }, /*#__PURE__*/React.createElement("g", {
    stroke: "var(--n-100)",
    strokeWidth: "1"
  }, [103, 166, 229, 292, 355].map(y => y < B && /*#__PURE__*/React.createElement("line", {
    key: "h" + y,
    x1: L,
    y1: y,
    x2: R,
    y2: y
  })), [118, 180, 242].map(x => /*#__PURE__*/React.createElement("line", {
    key: "v" + x,
    x1: x,
    y1: T,
    x2: x,
    y2: B
  }))), /*#__PURE__*/React.createElement("rect", {
    x: L,
    y: T,
    width: R - L,
    height: B - T,
    stroke: "var(--n-300)",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "var(--n-400)",
    strokeWidth: "1.25"
  }, corners.map(([cx, cy], i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: cx,
    y1: cy,
    x2: px,
    y2: py
  }))), corners.map(([cx, cy], i) => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: cx - 6,
    y: cy - 6,
    width: "12",
    height: "12",
    fill: ink
  })), activeStep === 3 && /*#__PURE__*/React.createElement("g", {
    stroke: "var(--signal)",
    strokeWidth: "1"
  }, [-14, 0, 14].map(dx => /*#__PURE__*/React.createElement("line", {
    key: dx,
    x1: px,
    y1: py,
    x2: px + dx,
    y2: py + 30
  }))), /*#__PURE__*/React.createElement("rect", {
    x: px - 7,
    y: py - 7,
    width: "14",
    height: "14",
    fill: "var(--signal)"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "var(--n-300)",
    strokeWidth: "1",
    strokeDasharray: "2 3"
  }, /*#__PURE__*/React.createElement("line", {
    x1: px,
    y1: T,
    x2: px,
    y2: py
  }), /*#__PURE__*/React.createElement("line", {
    x1: L,
    y1: py,
    x2: px,
    y2: py
  })), /*#__PURE__*/React.createElement("text", {
    x: L,
    y: T - 12,
    fill: "var(--fg-3)",
    fontFamily: "var(--font-mono)",
    fontSize: "9",
    letterSpacing: "1"
  }, "REEL \xB7 ROOF"), /*#__PURE__*/React.createElement("text", {
    x: R,
    y: T - 12,
    fill: "var(--fg-3)",
    fontFamily: "var(--font-mono)",
    fontSize: "9",
    letterSpacing: "1",
    textAnchor: "end"
  }, "REEL \xB7 ROOF"), /*#__PURE__*/React.createElement("text", {
    x: L,
    y: B + 18,
    fill: "var(--fg-3)",
    fontFamily: "var(--font-mono)",
    fontSize: "9",
    letterSpacing: "1"
  }, "REEL \xB7 GROUND"), /*#__PURE__*/React.createElement("text", {
    x: R,
    y: B + 18,
    fill: "var(--fg-3)",
    fontFamily: "var(--font-mono)",
    fontSize: "9",
    letterSpacing: "1",
    textAnchor: "end"
  }, "REEL \xB7 GROUND"), /*#__PURE__*/React.createElement("text", {
    x: px + 14,
    y: py + 4,
    fill: "var(--signal)",
    fontFamily: "var(--font-mono)",
    fontSize: "10",
    letterSpacing: "0.5"
  }, "PAYLOAD"));
}

/* ---------- header ---------- */
function Header({
  t,
  lang,
  setLang
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(243,244,245,0.86)",
      backdropFilter: "saturate(1.2) blur(8px)",
      WebkitBackdropFilter: "saturate(1.2) blur(8px)",
      borderBottom: "1px solid var(--n-200)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "0 32px",
      height: 64,
      display: "flex",
      alignItems: "center",
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(Mark, {
    size: 24
  }), /*#__PURE__*/React.createElement(Wordmark, {
    size: 20
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 26,
      marginLeft: 14
    }
  }, t.nav.map((n, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: `#s${i}`,
    style: {
      fontSize: 14,
      color: "var(--fg-2)",
      textDecoration: "none"
    },
    onMouseOver: e => e.currentTarget.style.color = "var(--ink)",
    onMouseOut: e => e.currentTarget.style.color = "var(--fg-2)"
  }, n))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      border: "1px solid var(--n-300)",
      borderRadius: 2,
      overflow: "hidden"
    }
  }, ["en", "fr"].map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    onClick: () => setLang(l),
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      letterSpacing: "0.08em",
      padding: "5px 9px",
      border: "none",
      cursor: "pointer",
      textTransform: "uppercase",
      background: lang === l ? "var(--ink)" : "transparent",
      color: lang === l ? "var(--fg-on-ink)" : "var(--fg-2)"
    }
  }, l))), /*#__PURE__*/React.createElement(Button, {
    kind: "primary"
  }, t.survey))));
}

/* ---------- hero ---------- */
function Hero({
  t
}) {
  return /*#__PURE__*/React.createElement(Section, {
    id: "top",
    style: {
      paddingTop: 72,
      paddingBottom: 64
    }
  }, /*#__PURE__*/React.createElement(CoordinateField, {
    gap: 120
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      gap: 56,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tick: true
  }, t.eyebrow), /*#__PURE__*/React.createElement("h1", {
    className: "t-display",
    style: {
      margin: "22px 0 0"
    }
  }, t.h1a, /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, t.h1b)), /*#__PURE__*/React.createElement("p", {
    className: "t-lg",
    style: {
      color: "var(--fg-2)",
      maxWidth: "46ch",
      margin: "24px 0 0"
    }
  }, t.sub), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    kind: "signal",
    lg: true,
    icon: "arrow_forward"
  }, t.cta1), /*#__PURE__*/React.createElement(Button, {
    kind: "outline",
    lg: true
  }, t.cta2)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 40,
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    kind: "ink"
  }, "Concordia"), /*#__PURE__*/React.createElement("span", {
    className: "t-sm",
    style: {
      color: "var(--fg-3)",
      maxWidth: "40ch"
    }
  }, t.stat))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--n-200)",
      background: "var(--surface)",
      borderRadius: 4,
      padding: "24px 20px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Fig. 01 — North elevation"), /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--fg-3)"
  }, "1:200")), /*#__PURE__*/React.createElement(RigDiagram, {
    height: 400
  }))));
}

/* ---------- how it works ---------- */
function HowItWorks({
  t
}) {
  const [active, setActive] = useS(2);
  return /*#__PURE__*/React.createElement(Section, {
    id: "s0"
  }, /*#__PURE__*/React.createElement(Datum, {
    style: {
      marginBottom: 40
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "0.9fr 1.1fr",
      gap: 56
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tick: true
  }, t.hiwEy), /*#__PURE__*/React.createElement("h2", {
    className: "t-h2",
    style: {
      margin: "18px 0 28px",
      maxWidth: "14ch"
    }
  }, t.hiwH), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--n-200)",
      background: "var(--surface)",
      borderRadius: 4,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement(RigDiagram, {
    height: 300,
    activeStep: active
  }))), /*#__PURE__*/React.createElement("div", null, t.steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onMouseEnter: () => setActive(i),
    style: {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: 20,
      padding: "22px 0",
      borderTop: "1px solid var(--n-200)",
      cursor: "default",
      opacity: active === i ? 1 : 0.55,
      transition: "opacity 200ms var(--ease)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-data",
    style: {
      fontSize: 28,
      color: active === i ? "var(--signal)" : "var(--fg-3)",
      lineHeight: 1
    }
  }, s[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "t-h4",
    style: {
      marginBottom: 4
    }
  }, s[1]), /*#__PURE__*/React.createElement("p", {
    className: "t-sm",
    style: {
      margin: 0,
      maxWidth: "44ch"
    }
  }, s[2])))))));
}

/* ---------- specifications ---------- */
function Specs({
  t
}) {
  return /*#__PURE__*/React.createElement(Section, {
    id: "s1"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "0.8fr 1.2fr",
      gap: 56,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tick: true
  }, t.specEy), /*#__PURE__*/React.createElement("h2", {
    className: "t-h2",
    style: {
      margin: "18px 0 16px",
      maxWidth: "12ch"
    }
  }, t.specH), /*#__PURE__*/React.createElement("p", {
    className: "t-sm",
    style: {
      maxWidth: "34ch"
    }
  }, t.specNote)), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--n-200)",
      background: "var(--surface)",
      borderRadius: 4
    }
  }, t.specs.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      padding: "16px 22px",
      borderBottom: i < t.specs.length - 1 ? "1px solid var(--n-100)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--fg-2)"
    }
  }, s[0]), /*#__PURE__*/React.createElement("span", {
    className: "t-data",
    style: {
      fontSize: 18
    }
  }, s[1]))))));
}

/* ---------- safety / why tethered (dark) — full motif: field + convergence on the 0 ---------- */
function Safety({
  t
}) {
  return /*#__PURE__*/React.createElement(Section, {
    id: "s2",
    dark: true
  }, /*#__PURE__*/React.createElement(CoordinateField, {
    dark: true,
    gap: 120
  }), /*#__PURE__*/React.createElement(Convergence, {
    xPct: 82,
    yPct: 64,
    dark: true
  }), /*#__PURE__*/React.createElement(Eyebrow, {
    tick: true,
    color: "var(--fg-on-ink-2)"
  }, t.safeEy), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.2fr 0.8fr",
      gap: 56,
      alignItems: "end",
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "t-display",
    style: {
      margin: 0,
      color: "var(--fg-on-ink)"
    }
  }, t.safeH), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-data",
    style: {
      fontSize: 88,
      color: "var(--signal)",
      lineHeight: 0.9
    }
  }, "0")), /*#__PURE__*/React.createElement("p", {
    className: "t-sm",
    style: {
      color: "var(--fg-on-ink-2)",
      marginTop: 8
    }
  }, t.safeStat))), /*#__PURE__*/React.createElement("p", {
    className: "t-lg",
    style: {
      color: "var(--fg-on-ink-2)",
      maxWidth: "52ch",
      marginTop: 36
    }
  }, t.safeBody));
}

/* ---------- contact / CTA ---------- */
function Contact({
  t
}) {
  const [sent, setSent] = useS(false);
  return /*#__PURE__*/React.createElement(Section, {
    id: "s3"
  }, /*#__PURE__*/React.createElement(Datum, {
    signal: true,
    style: {
      marginBottom: 40
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "0.9fr 1.1fr",
      gap: 56,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tick: true
  }, t.ctaEy), /*#__PURE__*/React.createElement("h2", {
    className: "t-h2",
    style: {
      margin: "18px 0 16px",
      maxWidth: "14ch"
    }
  }, t.ctaH), /*#__PURE__*/React.createElement("p", {
    className: "t-sm",
    style: {
      maxWidth: "40ch"
    }
  }, t.ctaBody)), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--n-200)",
      background: "var(--surface)",
      borderRadius: 4,
      padding: 28
    }
  }, sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "20px 0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-sharp",
    style: {
      color: "var(--clean)"
    }
  }, "check"), /*#__PURE__*/React.createElement("span", {
    className: "t-body"
  }, t.fSubmit, " — ✓")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "1 / -1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, t.fAddr), /*#__PURE__*/React.createElement("input", {
    className: "field",
    placeholder: "1455 Boul. de Maisonneuve O."
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, t.fHeight), /*#__PURE__*/React.createElement("input", {
    className: "field",
    placeholder: "84"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, t.fMode), /*#__PURE__*/React.createElement("select", {
    className: "field",
    style: {
      appearance: "none"
    }
  }, /*#__PURE__*/React.createElement("option", null, t.fModeOpt))), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "1 / -1",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Button, {
    kind: "signal",
    lg: true,
    icon: "arrow_forward",
    onClick: () => setSent(true)
  }, t.fSubmit))))));
}

/* ---------- footer ---------- */
function Footer({
  t
}) {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--ink-bg)",
      color: "var(--fg-on-ink-2)",
      padding: "56px 0 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "0 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Mark, {
    size: 28,
    variant: "light"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Wordmark, {
    size: 22,
    color: "var(--fg-on-ink)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      marginTop: 4
    }
  }, t.footTag))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 48
    }
  }, t.nav.map((n, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: `#s${i}`,
    style: {
      fontSize: 14,
      color: "var(--fg-on-ink-2)",
      textDecoration: "none"
    }
  }, n)))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "rgba(255,255,255,0.08)",
      margin: "32px 0 18px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      letterSpacing: "0.04em"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 TARSA \xB7 MONTR\xC9AL QC"), /*#__PURE__*/React.createElement("span", null, "CONCORDIA UNIVERSITY \xB7 ", t.rights.toUpperCase()))));
}

/* ---------- App ---------- */
function App() {
  const [lang, setLang] = useS("en");
  const t = COPY[lang];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Header, {
    t: t,
    lang: lang,
    setLang: setLang
  }), /*#__PURE__*/React.createElement(Hero, {
    t: t
  }), /*#__PURE__*/React.createElement(HowItWorks, {
    t: t
  }), /*#__PURE__*/React.createElement(Specs, {
    t: t
  }), /*#__PURE__*/React.createElement(Safety, {
    t: t
  }), /*#__PURE__*/React.createElement(Contact, {
    t: t
  }), /*#__PURE__*/React.createElement(Footer, {
    t: t
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/sections.jsx", error: String((e && e.message) || e) }); }

})();
