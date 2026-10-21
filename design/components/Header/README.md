Thin top band: a round "k" disc and the wordmark on the left, nav pills with a pixel icon and a visible label on the right.

Use it once per page, at the very top, inside the page's single landmark order (header, then `main`, then `Footer`). The consumer supplies the nav items (`icon`, `label`, optional `href` or `onClick`, and `active` for the current page). The current item becomes a filled pill with `aria-current="page"`.

- Keep the wordmark in `main-logo` on `main-header`; do not place other text in the band.
- Leave the bottom corners at `radius-card` and the shadow at `main-shadow`.
- Every item shows its label next to the icon. Do not shrink it to an icon alone: the icons are decoration (`aria-hidden`) and the label is the accessible name.
- Icons are 16 by 16 pixel grids named `about`, `service`, `note` and `login`.
- The band is built for a 1920px desktop frame. Nothing is defined for narrower widths yet.
- This replaces the first Figma header (64px wordmark, four 100px outline icons, `space-96` gaps). Those tokens stay in the system for reference.
