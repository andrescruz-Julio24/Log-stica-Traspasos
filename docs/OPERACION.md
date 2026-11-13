# Operación de pedidos y recepción

## Arranque y actualización

En una base nueva, desde apps/api ejecutar npx prisma migrate deploy. En una instalación existente, comparar primero el esquema con la migración 202611120001_baseline. Si coincide y se creó anteriormente con db push o una migración local, respaldar y marcar esa base inicial con npx prisma migrate resolve --applied 202611120001_baseline antes del deploy. Conservar el historial de migraciones propio de esa instalación. Los pedidos antiguos reciben prioridad normal. Una recepción histórica sin vínculo verificable con un despacho requiere conciliación individual.

## Operadores y aprobaciones

En apps/api/.env definir SGTL_ACCOUNTS como objeto JSON cuyas claves sean nombres individuales. Cada valor contiene role (operator o supervisor) y token, un secreto aleatorio único de al menos 24 caracteres. Generar cada uno con node -e "console.log(require('crypto').randomBytes(32).toString('hex'))". Guardarlos fuera del repositorio. Reiniciar Nest e introducir la credencial en Acceso de operador. Con cuentas configuradas, la API exige autenticación para todas las rutas. Sin cuentas, la demo local permite probar el movimiento ordinario; las decisiones privilegiadas requieren identidad. El modo de producción sigue bloqueado. La integración corporativa de identidades y ámbitos por sucursal necesita datos de la empresa.

## Flujo normal

1. Crear un pedido con una o más líneas, categoría y compromiso opcional. La cola se ordena por Urgente, Alta, Normal y Baja, luego por fecha compromiso, antigüedad e ID. Al modificar el plan indicar el motivo. El detalle conserva fecha original e historial.
2. Crear el traspaso y reservar las líneas en origen. Al despachar se congela la distribución de las reservas de ese SKU por prioridad, compromiso y antigüedad de reserva. Una reserva general tiene prioridad normal. No se retiran asignaciones ya despachadas al cambiar la categoría de otro cliente.
3. Elegir el despacho en recepción. Presentado equivale a aceptado más rechazado. Se acredita a clientes según los tramos del despacho y el pedido queda listo cuando todas sus líneas se completan.
4. Finalizar la inspección cuando ya no se espera otra recepción del despacho. Cada SKU no presentado genera un faltante. Los compromisos incumplidos vuelven a quedar disponibles para abastecer al cliente en otro traspaso. Un cierre físico conforme requiere todas las líneas completas y ninguna incidencia bloqueante.

## Diferencias, cuarentena y corrección

Registrar SKU inesperado, variante incorrecta, daño o sobrante en Incidencias con SKU observado, cantidad, ubicación de resguardo, custodio y despacho. No suma a disponible. La evidencia se registra por referencia al expediente externo. Un supervisor documenta el destino físico y la resolución. El módulo no administra archivos adjuntos ni ejecuta un transporte de devolución. Para un SKU esperado rechazado, la recepción abre una incidencia vinculada automáticamente.

Desde Autorizaciones se solicita cancelación de pedido, reasignación completa de una reserva todavía en origen, compensación de una línea de recepción o cierre con diferencias. Un supervisor distinto decide y la transacción aplica el cambio. Una compensación conserva el conteo original, descuenta únicamente saldos recuperables y reabre la recepción. Si la mercancía ya se comprometió en otro movimiento o la diferencia ya se cerró administrativamente, se requiere conciliación. El cierre excepcional no convierte un pedido incompleto en listo.

## Fuente de inventario

SGTL controla el stock local por defecto. Con SGTL_INVENTORY_SOURCE=ERP, las reservas requieren verificación reciente de la existencia física por SKU y ubicación. El integrador autenticado como supervisor envía POST /api/stock/{id}/verify con physical y observedAt (ISO con zona). Una discrepancia invalida la verificación y la API responde verified=false. Un dato vencido bloquea reservas conforme a SGTL_ERP_MAX_AGE_MINUTES. El adaptador al ERP específico requiere su contrato, credenciales y mapa de SKU. Ante un corte sin aviso el dato permanece válido hasta el vencimiento configurado.

Si la mercancía identificada pertenece a una reserva específica del despacho, elegirla en Asignación recibida. El servidor comprueba el SKU, el despacho y las unidades pendientes de esa reserva. Para cantidades físicamente diferenciadas de dos clientes, capturar dos recepciones parciales. Para mercancía fungible, el operador puede aplicar el orden registrado al despachar.
