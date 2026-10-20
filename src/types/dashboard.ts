import type { Link } from './index';

export type SavedLink = Pick<Link, 'code' | 'title' | 'destination_url' | 'ad_style' | 'style'>;

export type DetailSelection = {
  link: Link;
  onSaved: (next: SavedLink) => void;
};
