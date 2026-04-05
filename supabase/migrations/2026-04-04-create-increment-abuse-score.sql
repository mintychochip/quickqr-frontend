CREATE OR REPLACE FUNCTION increment_abuse_score(user_id UUID, increment INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    abuse_score = LEAST(abuse_score + increment, 100),
    is_blocked = CASE WHEN abuse_score + increment >= 100 THEN TRUE ELSE is_blocked END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
