-- Create qr_schedules table for scheduling feature
CREATE TABLE IF NOT EXISTS qr_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID REFERENCES qrcodes(id) ON DELETE CASCADE,
  activation_date DATE,
  activation_time TIME,
  expiration_date DATE,
  expiration_time TIME,
  recurring TEXT CHECK (recurring IN ('none', 'daily', 'weekly', 'monthly')),
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create qr_protection table for password protection
CREATE TABLE IF NOT EXISTS qr_protection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID REFERENCES qrcodes(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  password TEXT,
  one_time BOOLEAN DEFAULT false,
  time_window JSONB,
  allowed_ips TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create ab_tests table for A/B testing
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID REFERENCES qrcodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create ab_variants table
CREATE TABLE IF NOT EXISTS ab_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  weight INTEGER DEFAULT 50,
  scan_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_settings table for notifications
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  scan_milestone_alerts BOOLEAN DEFAULT true,
  milestone_thresholds INTEGER[] DEFAULT '{100, 500, 1000, 5000, 10000}',
  webhook_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
