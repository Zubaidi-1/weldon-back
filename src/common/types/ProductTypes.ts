export const PRODUCT_STATUS = ['ACTIVE', 'DRAFT', 'OUT_OF_STOCK'] as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[number];
export const PRODUCT_CATEGORIES = [
  'MELA_WHITE',
  'ESSENTIAL',
  'HYDRATING',
  'REGULATING',
  'SENSITIVE',
  'BEAUTY_ELEMENTS',
  'VITALITY',
  'BODY_SCIENCE',
  'HAIR',
  'MEN',
  'GREEN_PEEL',
  'NIGHT_CARE',
  'BODY_CARE',
  'AMPOULE',
  'DRY_SKIN',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
