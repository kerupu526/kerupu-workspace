The system describes the landing page and the shared page frame: a thin header band, a thin footer band and rounded cards. Use only the tokens below. Buttons and form controls are drawn in the wireframes but are not components yet.

## Color

- Set the page on `surface-page`, the header and footer bands on `main-header`.
- Write the wordmark and all text in `main-logo`. It reads at 4.5:1 or better on `main-header`, `card-surface` and `surface-page`, which leaves no room: never fade text with `opacity`, because 70% already drops it to about 2.8:1 on white.
- Fill cards with `card-surface` and outline them with `card-border` at `border-width`. That outline is decoration only, so never use it as the sole separator and never as the edge of an input.
- Outline inputs, search fields and unfilled buttons with `ui-border`.
- `state-error` and `state-success` are proposals for messages. Pair them with words or an icon so color is never the only signal.
- Draw the old outline nav icons in `icon-ink`. The thin header's pixel icons use the text color instead.

## Type

- Everything is set in Mona12 (family `display`), Regular 400 and Bold 700, loaded from `fonts/Mona12.woff2` and `fonts/Mona12-Bold.woff2`. Both files hold the whole font, Hangul and emoji included, so Korean text and emoji in the board render in the same pixel style. The fallback is a system monospace face.
- Set the wordmark in `logo-text-compact` (40px) in the thin header, or `logo-text` (64px) where the Figma header is reproduced.
- The `Text` group (`title`, `heading`, `body`, `label`, `caption`) records the sizes the wireframes already use. It is not a finished scale: line heights are not set.
- License: Mona is released under the SIL Open Font License 1.1 (Reserved Font Name "Mona"). The files here are format conversions only (TTF to WOFF2, nothing subsetted or edited). Keep the license texts under `assets/Licenses/` with the fonts, and do not sell the font files on their own.

## Layout and surfaces

- Header: `header-height` tall, `space-48` side padding, bottom corners at `radius-card`, `main-shadow`. Nav pills are `nav-item-height` tall with `space-12` between them.
- Footer: `footer-height` tall, the same padding, top corners at `radius-card`, `footer-shadow`. It has no menu.
- Cards use `radius-card` on all four corners and `card-shadow`. The default size is `card-width` by `card-height`.
- Pills, chips and single-line inputs use `radius-pill`; text areas and image frames use `radius-field`.
- The wireframes are 1920 by 1200. Behavior at narrower widths is undefined.

## Iconography

The nav icons are 16 by 16 pixel grids drawn at `pixel-icon-size` (2x): `about` (profile card), `service` (tiles), `note` (memo pad) and `login` (door and arrow). Solid cells use the text color, soft cells the same color at 30%. Icons are decoration (`aria-hidden`); every nav item keeps its visible label.

## Accessibility

- One `h1` per page, content inside `main`, header before it and footer after it.
- Links get their name from the text inside them. Do not give several links the same `aria-label`.
- Keep the focus ring: 3px in `main-logo`, offset 4px. It clears the 3:1 a focus indicator needs on every surface.

## Not defined yet

Line heights, layouts narrower than 1920px, wiki edit and history screens, and component versions of buttons, inputs and chips.
