-- Add display_order column to inventory table for custom sorting
ALTER TABLE inventory ADD COLUMN display_order INTEGER;

-- Set default display_order based on current ordering (by item name)
WITH ordered_inventory AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY location_id 
      ORDER BY (SELECT name FROM items WHERE items.id = inventory.item_id)
    ) as new_order
  FROM inventory
)
UPDATE inventory 
SET display_order = ordered_inventory.new_order
FROM ordered_inventory 
WHERE inventory.id = ordered_inventory.id;

-- Add NOT NULL constraint after setting values
ALTER TABLE inventory ALTER COLUMN display_order SET NOT NULL;

-- Create index for better performance
CREATE INDEX idx_inventory_location_display_order ON inventory(location_id, display_order);