-- Bilingual service labels (Greek in name/description, English in name_en/description_en)
-- Prefer: npm run migrate:services-i18n

ALTER TABLE services ADD COLUMN name_en TEXT;
ALTER TABLE services ADD COLUMN description_en TEXT;

UPDATE services SET name_en = 'Haircut', description_en = 'Classic haircut' WHERE name = 'Κούρεμα';
UPDATE services SET name_en = 'Side trim', description_en = 'Sides and sideburns trim' WHERE name = 'Πλαινό';
UPDATE services SET name_en = 'Blow dry', description_en = 'Hair styling and blow dry' WHERE name = 'Χτένισμα';
UPDATE services SET name_en = 'Hair wash', description_en = 'Shampoo and rinse' WHERE name = 'Λούσιμο';
UPDATE services SET name_en = 'Traditional straight razor shave', description_en = 'Hot towel straight razor shave'
  WHERE name = 'Ξύρισμα ( με φαλτσέτα - παραδοσιακό )';
UPDATE services SET name_en = 'Beard trim', description_en = 'Beard and moustache shaping' WHERE name = 'Μούσια';
UPDATE services SET name_en = 'Haircut + beard', description_en = 'Includes hair wash and blow dry' WHERE name = 'Κούρεμα - Μούσια';
UPDATE services SET name_en = 'Facial treatment', description_en = 'Face care and grooming' WHERE name = 'Περιποίηση προσώπου';

UPDATE services SET name_en = name WHERE name_en IS NULL OR name_en = '';
UPDATE services SET description_en = description
WHERE description IS NOT NULL AND (description_en IS NULL OR description_en = '');
