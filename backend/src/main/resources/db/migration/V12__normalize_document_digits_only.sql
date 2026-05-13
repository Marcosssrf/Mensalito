UPDATE students
SET document = regexp_replace(document, '\D', '', 'g')
WHERE document IS NOT NULL
  AND document ~ '\D';

UPDATE tenants
SET document = regexp_replace(document, '\D', '', 'g')
WHERE document IS NOT NULL
  AND document ~ '\D';
