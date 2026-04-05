# Supabase Migration Design

## Overview
Migrate QuickQR from PHP backend to Supabase (Auth + Postgres + RLS).

## Authentication
- **Email/password**: Supabase built-in email provider
- **Google OAuth**: Via Supabase Google provider
- **Session**: Supabase session management (replaces PHP sessions)

## Database Schema

### profiles (extends auth.users)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users |
| email | text | |
| phone | text | nullable |
| admin | boolean | default false |
| first_name | text | nullable |
| last_name | text | nullable |
| created_at | timestamptz | default now() |

### qrcodes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | FK → profiles(id), cascade delete |
| name | text | not null |
| type | text | url\|text\|email\|phone\|sms\|location\|vcard\|wifi\|event |
| content | jsonb | not null |
| styling | jsonb | nullable |
| mode | text | 'static'\|'dynamic', default 'static' |
| expirytime | timestamptz | nullable |
| scan_count | integer | default 0 |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### scans
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| qrcode_id | uuid | FK → qrcodes(id), cascade delete |
| user_id | uuid | FK → profiles(id) |
| os | text | nullable |
| scanned_at | timestamptz | default now() |

## Row Level Security

### profiles
- Users can read/update their own profile only

### qrcodes
- Owners: SELECT, INSERT, UPDATE, DELETE their own qrcodes
- Admins: SELECT all qrcodes

### scans
- Owners: SELECT scans for their qrcodes

## API Replacement

| PHP Service | Replacement |
|-------------|-------------|
| authService.ts | @supabase/supabase-js Auth |
| qrCodeService.ts | Supabase DB queries |
| qrCodeCreateService.ts | Supabase DB insert |
| statsService.ts | Supabase DB aggregations |
| adminService.ts | RLS policies + service role |

## Implementation Order
1. Create Supabase tables + RLS
2. Install @supabase/supabase-js
3. Create supabase client
4. Replace auth service
5. Replace QR code services
6. Replace stats service
7. Replace admin service
8. Update AuthContext
