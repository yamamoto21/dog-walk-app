# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Expo Version

This project uses **Expo SDK 54**. Always refer to https://docs.expo.dev/versions/v54.0.0/ before writing any Expo-related code. API signatures change between SDK versions.

## Commands

```bash
# Start development server (smartphone via Expo Go)
npx expo start --tunnel

# Start web preview (browser)
npm run web

# Install new packages (always use expo install for Expo packages)
npx expo install <package>
npm install <package> --legacy-peer-deps  # for non-Expo packages
```

## Architecture

**Entry point:** `App.tsx` — wraps the app in `SafeAreaProvider` + `AuthProvider`, then renders a bottom tab navigator with 6 screens.

**Auth:** `lib/auth.tsx` exports `AuthProvider` and `useAuth`. On mount it checks for an existing session; if none, auto-signs in with credentials from `EXPO_PUBLIC_DEV_EMAIL` / `EXPO_PUBLIC_DEV_PASSWORD`. Screens do not need to handle unauthenticated state.

**Supabase client:** `lib/supabase.ts` — single shared client, configured from `.env`.

**Types:** `types/index.ts` — shared TypeScript types for `Walk`, `FriendDog`, `FriendEncounter`.

## Supabase Schema

- `walks`: id, user_id, started_at, ended_at, distance_meters, route (JSON), poop_count, level, memo, created_at
  - `level` check constraint: `'good' | 'normal' | 'bad' | 'bite'`
- `friend_dogs`: id, name, breed, meeting_spot, compatibility, photo_url, created_at
  - `compatibility` check constraint: `'good' | 'normal' | 'bad'`
- `friend_encounters`: id, walk_id, friend_dog_id, met_at, location
- `dogs`: id, name, breed, birthday, photo_url, created_at
- `profiles`: id, display_name, created_at

## Key Constraints

- `window.confirm()` must be used for delete confirmations — `Alert.alert()` with multiple buttons does not work on web.
- `npm install` requires `--legacy-peer-deps` due to peer dependency conflicts between React Navigation v6 and other packages.
- GPS tracking uses `expo-location` with `distanceInterval: 5` (meters). Route is stored as `Coordinate[]` (`{latitude, longitude, timestamp}`).

# セッション開始時の手順
- 回答は日本語
- まずは既存実装を読む

## Git 運用ルール
- 実装が一段落する（または特定の機能が完了する）ごとにコミットを行う。
- コミットの際は、簡潔な日本語でメッセージを作成する。
- コミット後、必ず自動で `git push` を実行する。

# 変更のステージング
git add CLAUDE.md

# コミット
git commit -m "docs: Claude AI用の開発ルール(CLAUDE.md)を追加"

# リモートリポジトリへPush（mainブランチの例）
git push origin main