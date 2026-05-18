export type WalkLevel = 'good' | 'normal' | 'bad' | 'bite';

export type Walk = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  distance_meters: number;
  poop_count: number;
  level: WalkLevel | null;
  memo: string | null;
  created_at: string;
};

export type WalkPhoto = {
  id: string;
  walk_id: string;
  photo_url: string;
  lat: number | null;
  lng: number | null;
  taken_at: string;
  created_at: string;
};

export type FriendDog = {
  id: string;
  name: string;
  breed: string | null;
  meeting_spot: string | null;
  compatibility: string;
  photo_url: string | null;
  created_at: string;
};

export type FriendEncounter = {
  id: string;
  walk_id: string | null;
  friend_dog_id: string;
  met_at: string;
  location: string | null;
};
