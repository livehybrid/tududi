-- Add timestamp columns to tasks table
-- Check if columns exist first to avoid errors

-- Add created_at column if it doesn't exist
ALTER TABLE tasks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at column if it doesn't exist  
ALTER TABLE tasks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have non-null timestamps
UPDATE tasks SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL;
UPDATE tasks SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL;
