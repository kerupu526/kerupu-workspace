export interface HeaderItem {
  /** Pixel icon drawn beside the label. */
  icon: "about" | "service" | "note" | "login";
  /** Visible label. The icon is decoration, so the label is the accessible name. */
  label: string;
  /** Renders a link instead of a button when set. */
  href?: string;
  /** Marks the current page: filled pill and aria-current="page". */
  active?: boolean;
  onClick?: () => void;
}

export interface HeaderProps {
  /** Wordmark text. Defaults to "kerupu_workspace". */
  title?: string;
  /** Where the wordmark links to. */
  homeHref?: string;
  /** Nav items, right aligned. Defaults to about, service, note and login. */
  items?: HeaderItem[];
}

export interface FooterProps {
  /** Defaults to "kerupu_workspace". */
  title?: string;
  /** Second line under the title. Defaults to the copyright line. */
  note?: string;
  /** Right side. Defaults to "kerupu.tech". */
  domain?: string;
}

export interface CardProps {
  /** CSS width. Defaults to the card-width token (450px). */
  width?: string;
  /** CSS height. Defaults to the card-height token (700px). */
  height?: string;
  children?: unknown;
}

export const Header: (props: HeaderProps) => unknown;
export const Footer: (props: FooterProps) => unknown;
export const Card: (props: CardProps) => unknown;
