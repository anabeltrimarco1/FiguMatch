/**
 * FIGUMATCH
 * Motor de Visión Artificial
 * Parámetros generales
 */

/*
|--------------------------------------------------------------------------
| Tamaño esperado de una figurita
|--------------------------------------------------------------------------
|
| Estos valores son porcentajes del tamaño de la página.
| Más adelante podremos ajustarlos sin modificar el algoritmo.
|
*/

export const STICKER = {
  MIN_WIDTH_PERCENT: 0.17,

  MAX_WIDTH_PERCENT: 0.31,

  MIN_HEIGHT_PERCENT: 0.19,

  MAX_HEIGHT_PERCENT: 0.34,

  MIN_ASPECT_RATIO: 0.55,

  MAX_ASPECT_RATIO: 0.95,
};

/*
|--------------------------------------------------------------------------
| Agrupación por filas
|--------------------------------------------------------------------------
*/

export const GRID = {
  ROW_TOLERANCE: 80,

  DUPLICATE_IOU: 0.55,
};

/*
|--------------------------------------------------------------------------
| Detector Canny
|--------------------------------------------------------------------------
*/

export const CANNY = {
  LOW_THRESHOLD: 45,

  HIGH_THRESHOLD: 135,
};

/*
|--------------------------------------------------------------------------
| Desenfoque Gaussiano
|--------------------------------------------------------------------------
*/

export const BLUR = {
  KERNEL_SIZE: 5,
};

/*
|--------------------------------------------------------------------------
| Operaciones morfológicas
|--------------------------------------------------------------------------
*/

export const MORPH = {
  KERNEL_WIDTH: 13,

  KERNEL_HEIGHT: 13,
};

/*
|--------------------------------------------------------------------------
| Salida de imágenes
|--------------------------------------------------------------------------
*/

export const OUTPUT = {
  JPEG_QUALITY: 96,

  CHROMA_SUBSAMPLING: "4:4:4",
};
