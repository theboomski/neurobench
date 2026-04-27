export type UgcGameType = "brackets" | "balance";
export type UgcVisibility = "public" | "private" | "closed";

export type UgcCategory = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  order: number;
};

export type UgcProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  created_at: string;
};

export type UgcGame = {
  id: string;
  user_id: string;
  type: UgcGameType;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category_id: number | null;
  language: string;
  visibility: UgcVisibility;
  is_nsfw: boolean;
  is_approved: boolean;
  play_count: number;
  slug: string;
  created_at: string;
};

export type UgcBracketItem = {
  id: string;
  game_id: string;
  name: string;
  image_url: string;
  win_count: number;
  match_count: number;
  order: number;
};

export type UgcBalanceOption = {
  id: string;
  game_id: string;
  option_a: string;
  option_b: string;
  round: number;
  order: number;
};

export type UgcPlayHistory = {
  id: string;
  user_id: string;
  game_id: string;
  played_at: string;
  winner_item_id: string | null;
  winner_option: "a" | "b" | null;
};
