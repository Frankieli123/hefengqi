UPDATE "Brand"
SET "localizedNames" = jsonb_build_object(
  'zh', "name",
  'en', "name",
  'ru', "name",
  'fr', "name",
  'de', "name",
  'es', "name",
  'ar', "name"
)
WHERE "localizedNames" = '{}'::jsonb;
