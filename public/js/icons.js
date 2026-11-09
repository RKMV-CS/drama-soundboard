// SVG sprite icons (img/icons.svg). Built with createElementNS, never from markup strings.
const SVG_NS = "http://www.w3.org/2000/svg";
const SPRITE = "img/icons.svg";

export function icon(name, className = "") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", className ? `icon ${className}` : "icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `${SPRITE}#${name}`);
  svg.appendChild(use);
  return svg;
}
