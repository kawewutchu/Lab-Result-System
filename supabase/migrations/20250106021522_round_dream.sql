/*
  # Fix date handling for Buddhist Era dates

  1. Changes
    - Add check constraint to ensure birth_date is in valid BE range (2400-2600)
    - Add trigger to validate BE dates on insert/update
  
  2. Security
    - No changes to RLS policies
*/

-- Add check constraint for valid BE years
ALTER TABLE lab_results
ADD CONSTRAINT birth_date_be_year_check 
CHECK (
  EXTRACT(YEAR FROM birth_date) BETWEEN 2400 AND 2600
);

-- Create function to validate BE dates
CREATE OR REPLACE FUNCTION validate_be_date()
RETURNS TRIGGER AS $$
BEGIN
  IF EXTRACT(YEAR FROM NEW.birth_date) < 2400 OR 
     EXTRACT(YEAR FROM NEW.birth_date) > 2600 THEN
    RAISE EXCEPTION 'Birth date must be in Buddhist Era (BE) format';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate BE dates
CREATE TRIGGER validate_be_date_trigger
BEFORE INSERT OR UPDATE ON lab_results
FOR EACH ROW
EXECUTE FUNCTION validate_be_date();