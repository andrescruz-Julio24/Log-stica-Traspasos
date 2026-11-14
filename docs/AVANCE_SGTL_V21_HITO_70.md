# SGTL v2.1 — Hito de consolidación hacia 70%

**Origen de requisitos:** `Planteamiento_Sistema_Trazabilidad_Logistica_v2.1_Integrado` (13-nov-2026); incluye las decisiones del usuario posteriores a la entrevista.

## Decisiones confirmadas y modelos

- **D-01 RESUELTA:** SGTL administra inventario por Almacén, Distribuidora y PVT; reemplaza la actualización en papel. El conteo se sigue realizando físicamente y se registra con hora/usuario en la aplicación.
- **D-02 PARCIAL:** un producto posee clave **interna** generada por SGTL, nombre, presentación, variante, etiqueta externa y **unidad base** inmutable tras alta (PIEZA, KG o CAJA). No se presupone que la empresa tuviera SKU original.
- **D-13 PARCIAL:** los kg se almacenan con precisión decimal (3 decimales), se conserva peso teórico/cajas estimadas y peso despachado/recibido. **No hay conversiones ni cálculos monetarios inventados**.

## Funcionalidades y evidencia

| Área / referencia | Implementación real | Prueba |
|---|---|---|
| LOG-04 / D-01 | Conteo físico digital y ajuste oficial auditado por ubicación y unidad PIEZA, KG o CAJA; versión y bloqueo de saldos obsoletos | `conteos.integration.spec.ts` |
| LOG-04 / D-02 | Código interno para productos sin SKU homogéneo y etiqueta original, catálogo de unidades con supervisor | `proveedores.integration.spec.ts` |
| LOG-04 / LOG-06 | Entrada de proveedor en varias líneas, recepción parcial, cantidades declaradas/presentadas/aceptadas/bloqueadas, hora, responsable y referencia | `proveedores.integration.spec.ts` |
| LOG-06 / LOG-07 | Mercancía bloqueada físicamente registrada sin disponibilidad, incidente vinculado y retorno al proveedor autorizado sin doble descuento | `proveedores.integration.spec.ts` |
| LOG-04 / T-18 | Solicitud 30 kg; peso real despachado y recibido 29.4 kg. Conservar diferencia 0.6 kg, cajas estimadas y promedio, sin inventar precio | `medidos.integration.spec.ts` |
| LOG-04 / T-19 | Salida de 20 kg descuenta físicamente el origen, no aumenta destino hasta recepción | `medidos.integration.spec.ts` |
| LOG-06 / T-20 | Llegada 20 kg, se aceptan 18 y se bloquean 2. Disponible destino 18, con incidencia y audit trail | `medidos.integration.spec.ts` |
| LOG-06 / T-16 | Traspaso bidireccional por piezas ya implementado en seis sentidos | `traspasos.integration.spec.ts` |
| LOG-12 / T-26/T-27/T-30 | Salida y recepción comercial, bloqueo de rechazos y stock local verificado | `entregas.integration.spec.ts` |

Los nuevos flujos tienen frontend real: `/proveedores`, `/inventario` con saldo por unidad, `/conteos`, `/traspasos-peso` y alta de producto en `/administracion`. Los componentes se encuentran en módulos funcionales con CSS Modules homónimos en `styles/`.

## Brechas que no se deben cerrar por suposición

- Los **pedidos de cliente por KG** y la facturación/precio variable requieren definir D-13 y el contrato comercial/contable; los pedidos anteriores permanecen expresamente en PIEZA.
- Traspasos por pieza y medidos usan el agregado `Transfer`, con líneas específicas por unidad y dos interfaces operativas. La unificación visual y la priorización compartida son trabajo posterior.
- Falta la política de conversión de CAJA a KG o PIEZA: nunca se convierten automáticamente.
- D-07 permisos por persona, sede, delegación y suplencias: hoy solo hay rol genérico operador/supervisor, por lo que **no está listo para producción**.
- Firma de conformidad real, archivos de evidencia, tiempos de retención y papeletas de Contabilidad requieren políticas D-14/D-17 y su implementación.
- Devoluciones comerciales y de traspasos en tránsito, más allá del retorno de proveedor bloqueado, aún tienen cobertura parcial.
- Falta la validación de todos los escenarios T-01..T-30 con los responsables operativos reales, y la migración de registros antiguos en papel.
- Sin inventario multunidad conciliado para todas las presentaciones, no se debe declarar completitud de la plataforma.

## Reestimación provisional

La referencia anterior situó el desarrollo alrededor de **60%** (estimación, no medición oficial). Esta iteración incorpora recepción de proveedor, KG/CAJA sin conversión artificial, catálogo interno, incidentes y traspasos de kg con respaldo de PostgreSQL y UI. La estimación razonable **si CI del HEAD es exitosa** es de **68–70% de cobertura funcional**.

**No equivale a certificación exacta del 70%, aprobación de operaciones reales ni preparación para producción.** El porcentaje se revisará con la matriz v2.1 y UAT con Almacén/Distribuidora/PVT.

**Regla de despliegue:** PR en borrador, basado en la rama del PR #4. No fusionar hasta revisión, migraciones y CI satisfactorios; no ejecutar pruebas de integración sobre datos reales.
