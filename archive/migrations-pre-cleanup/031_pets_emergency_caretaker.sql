-- Add emergency caretaker fields to pets table
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS emergency_caretaker TEXT,
ADD COLUMN IF NOT EXISTS emergency_caretaker_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_caretaker_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS emergency_caretaker_ids UUID[] DEFAULT '{}';

-- Add comments
COMMENT ON COLUMN pets.emergency_caretaker IS 'Name of person who should care for this pet in case of emergency (legacy)';
COMMENT ON COLUMN pets.emergency_caretaker_phone IS 'Phone number of emergency caretaker (legacy)';
COMMENT ON COLUMN pets.emergency_caretaker_id IS 'Reference to contact who will care for pet in emergency (legacy single)';
COMMENT ON COLUMN pets.emergency_caretaker_ids IS 'Array of contact IDs who will care for pet in emergency';
