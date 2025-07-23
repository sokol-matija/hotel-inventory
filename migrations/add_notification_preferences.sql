-- Migration: Add notification preferences to user_profiles table
-- Date: 2025-01-23
-- Description: Add push notification settings for expiration alerts

-- Add push notification columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_subscription TEXT DEFAULT NULL;

-- Update existing users to have notifications disabled by default
UPDATE user_profiles 
SET push_notifications_enabled = false, 
    push_subscription = NULL 
WHERE push_notifications_enabled IS NULL;

-- Add index on push_notifications_enabled for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_push_enabled 
ON user_profiles(push_notifications_enabled) 
WHERE push_notifications_enabled = true;

-- Create function to get users with notifications enabled (for edge function)
CREATE OR REPLACE FUNCTION get_notification_enabled_users()
RETURNS TABLE(
    user_id uuid,
    push_subscription text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        up.user_id::uuid,
        up.push_subscription
    FROM user_profiles up
    WHERE up.push_notifications_enabled = true 
    AND up.push_subscription IS NOT NULL
    AND up.is_active = true;
$$;

-- Create function to get expiring inventory items
CREATE OR REPLACE FUNCTION get_expiring_inventory(days_ahead integer DEFAULT 30)
RETURNS TABLE(
    id integer,
    quantity integer,
    expiration_date timestamp with time zone,
    item_name text,
    location_name text,
    category_requires_expiration boolean,
    days_until_expiration integer
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        i.id,
        i.quantity,
        i.expiration_date,
        it.name as item_name,
        l.name as location_name,
        c.requires_expiration as category_requires_expiration,
        CEIL(EXTRACT(epoch FROM (i.expiration_date - NOW())) / 86400)::integer as days_until_expiration
    FROM inventory i
    JOIN items it ON i.item_id = it.id
    JOIN locations l ON i.location_id = l.id
    JOIN categories c ON it.category_id = c.id
    WHERE i.expiration_date IS NOT NULL
    AND c.requires_expiration = true
    AND i.expiration_date >= NOW()
    AND i.expiration_date <= (NOW() + INTERVAL '1 day' * days_ahead)
    ORDER BY i.expiration_date ASC, days_until_expiration ASC;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_notification_enabled_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_inventory(integer) TO authenticated;

-- Create audit log entry for this migration
INSERT INTO audit_logs (
    user_id, 
    table_name, 
    operation, 
    old_values, 
    new_values, 
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'user_profiles',
    'ALTER',
    '{}',
    '{"migration": "add_notification_preferences", "changes": ["push_notifications_enabled", "push_subscription"]}',
    NOW()
);