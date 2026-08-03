import { GRID } from "./constants.js";

/**
 * Calcula el área de un rectángulo.
 */
export function getRectangleArea(rectangle) {
  return rectangle.width * rectangle.height;
}

/**
 * Calcula la intersección sobre unión entre dos rectángulos.
 * Sirve para detectar rectángulos duplicados.
 */
export function intersectionOverUnion(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  const intersectionWidth = Math.max(0, right - left);

  const intersectionHeight = Math.max(0, bottom - top);

  const intersectionArea = intersectionWidth * intersectionHeight;

  const areaA = getRectangleArea(a);
  const areaB = getRectangleArea(b);

  const unionArea = areaA + areaB - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

/**
 * Elimina rectángulos duplicados.
 * Conserva primero los de mayor superficie.
 */
export function removeDuplicateRectangles(rectangles) {
  const ordered = [...rectangles].sort(
    (a, b) => getRectangleArea(b) - getRectangleArea(a),
  );

  const accepted = [];

  for (const rectangle of ordered) {
    const duplicated = accepted.some(
      (other) => intersectionOverUnion(rectangle, other) >= GRID.DUPLICATE_IOU,
    );

    if (!duplicated) {
      accepted.push(rectangle);
    }
  }

  return accepted;
}

/**
 * Ordena rectángulos visualmente:
 * primero de arriba hacia abajo
 * y luego de izquierda a derecha.
 */
export function sortRectanglesReadingOrder(rectangles) {
  return [...rectangles].sort((a, b) => {
    const sameRow = Math.abs(a.y - b.y) < GRID.ROW_TOLERANCE;

    if (sameRow) {
      return a.x - b.x;
    }

    return a.y - b.y;
  });
}

/**
 * Agrupa rectángulos que pertenecen
 * aproximadamente a la misma fila.
 */
export function groupRectanglesByRows(rectangles) {
  const sorted = sortRectanglesReadingOrder(rectangles);

  const rows = [];

  for (const rectangle of sorted) {
    let targetRow = null;

    for (const row of rows) {
      const referenceY =
        row.reduce((sum, item) => sum + item.y, 0) / row.length;

      const belongsToRow =
        Math.abs(rectangle.y - referenceY) < GRID.ROW_TOLERANCE;

      if (belongsToRow) {
        targetRow = row;
        break;
      }
    }

    if (targetRow) {
      targetRow.push(rectangle);
    } else {
      rows.push([rectangle]);
    }
  }

  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }

  rows.sort((a, b) => {
    const yA = Math.min(...a.map((item) => item.y));

    const yB = Math.min(...b.map((item) => item.y));

    return yA - yB;
  });

  return rows;
}

/**
 * Aplana las filas nuevamente en una sola lista.
 */
export function flattenRows(rows) {
  return rows.flat();
}

/**
 * Agrega un margen alrededor del rectángulo
 * evitando salir de los límites de la imagen.
 */
export function expandRectangle(rectangle, pageWidth, pageHeight, padding = 0) {
  const left = Math.max(0, rectangle.x - padding);

  const top = Math.max(0, rectangle.y - padding);

  const right = Math.min(pageWidth, rectangle.x + rectangle.width + padding);

  const bottom = Math.min(pageHeight, rectangle.y + rectangle.height + padding);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Devuelve estadísticas básicas de los rectángulos.
 */
export function getRectangleStats(rectangles) {
  if (rectangles.length === 0) {
    return {
      count: 0,
      averageWidth: 0,
      averageHeight: 0,
      averageArea: 0,
    };
  }

  const totals = rectangles.reduce(
    (accumulator, rectangle) => {
      accumulator.width += rectangle.width;

      accumulator.height += rectangle.height;

      accumulator.area += getRectangleArea(rectangle);

      return accumulator;
    },
    {
      width: 0,
      height: 0,
      area: 0,
    },
  );

  return {
    count: rectangles.length,

    averageWidth: Math.round(totals.width / rectangles.length),

    averageHeight: Math.round(totals.height / rectangles.length),

    averageArea: Math.round(totals.area / rectangles.length),
  };
}
