-- Schema for Advanced Product Expiry Management
-- This extends the legacy inventory system to support granular batch-level tracking.

-- 1. Batch Tracking Table
-- Instead of a single expiry date per product, this allows multiple batches 
-- with different expiry dates for the same item.
CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    manufacture_date DATE,
    expiry_date DATE NOT NULL,
    received_date TIMESTAMPTZ DEFAULT NOW(),
    supplier VARCHAR(255),
    cost_price DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'active', -- active, expired, quarantined, finished
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_item ON inventory_batches(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_status ON inventory_batches(status);

-- 3. Expiring Products View
-- Provides a clean interface for the dashboard to show alerts (default 90 days).
CREATE OR REPLACE VIEW v_expiring_products AS
SELECT 
    i.id as product_id,
    i.item_name,
    i.item_code,
    i.category,
    b.batch_number,
    b.quantity,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE) as days_until_expiry,
    CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'critical'
        WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'warning'
        ELSE 'safe'
    END as urgency_level
FROM 
    inventory i
JOIN 
    inventory_batches b ON i.id = b.inventory_item_id
WHERE 
    b.quantity > 0
    AND b.status = 'active'
ORDER BY 
    b.expiry_date ASC;

-- 4. Automated Timestamp Management
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_batches_modtime
    BEFORE UPDATE ON inventory_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- 5. Helper Function: Get Total Stock (Optional)
-- Useful if you want to sync the legacy 'current_stock' field in the inventory table.
CREATE OR REPLACE FUNCTION sync_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory 
    SET current_stock = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM inventory_batches 
        WHERE inventory_item_id = NEW.inventory_item_id AND status = 'active'
    )
    WHERE id = NEW.inventory_item_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_sync_stock
    AFTER INSERT OR UPDATE OR DELETE ON inventory_batches
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_stock();
