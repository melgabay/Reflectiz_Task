-- 1. Retrieve All Records
SELECT * FROM form_data;

-- 2. Search by Field
SELECT * FROM form_data
WHERE field_name = 'Email' AND section = 'account';

-- 3. Update Record
UPDATE form_data
SET value = 'Sarah'
WHERE field_name = 'FirstName' AND section = 'personal';

SELECT * FROM form_data
WHERE field_name = 'FirstName' AND section = 'personal';

-- 4. Delete Record
DELETE FROM form_data
WHERE field_name = 'cardNumber' AND section = 'payment';

SELECT * FROM form_data
WHERE field_name = 'cardNumber' AND section = 'payment';