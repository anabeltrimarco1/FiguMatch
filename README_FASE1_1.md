# FiguMatch - Fase 1.1

Catálogo maestro inicial para:

- México (`MEX 1` a `MEX 20`)
- Sudáfrica (`RSA 1` a `RSA 20`)

## Archivos

- `catalogo_grupo_A_MEX_RSA_v1.csv`: catálogo editable/importable.
- `catalogo_grupo_A_MEX_RSA_v1.xlsx`: versión Excel para revisar.
- `catalogo_grupo_A_MEX_RSA_v1.json`: versión útil para React/API.
- `actualizar_catalogo_grupo_A_MEX_RSA_v1.sql`: actualiza la tabla `stickers`.

## Importante

El SQL **no toca** la tabla `user_stickers`, por lo tanto no modifica:

- Tengo
- Repetidas
- Me falta

Solo actualiza datos del catálogo:

- nombre
- categoría
- selección
- grupo
- ruta de imagen

## Cómo ejecutar

En pgAdmin, base `figuritas`:

1. Abrir Query Tool.
2. Abrir `actualizar_catalogo_grupo_A_MEX_RSA_v1.sql`.
3. Ejecutar con F5.

Después verificar:

```sql
SELECT code, team, category, name, image_path
FROM stickers
WHERE code LIKE 'MEX %' OR code LIKE 'RSA %'
ORDER BY team, number;
```

