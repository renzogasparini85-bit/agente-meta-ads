# Mensaje WhatsApp para IFPA — Bloqueo de número

---

Hola, quería comunicarme por el bloqueo del número de WhatsApp que ocurrió el martes 12 de mayo, ya que entiendo que puede generar dudas dado que fui quien gestionó las campañas durante los últimos meses.

Primero quiero aclarar que desde el 1 de mayo fui dado de baja del WhatsApp Web de IFPA, y en esa misma fecha también se me revocaron los accesos a la cuenta publicitaria. Esto quedó registrado y lo puedo acreditar: al consultar la API de Meta hoy, devuelve explícitamente que mi token no tiene permisos sobre la cuenta.

Es decir, al momento del bloqueo (12 de mayo) yo no tenía ningún acceso técnico ni operativo sobre las campañas ni sobre el número.

Respecto a las posibles causas del bloqueo, hay algunas situaciones que suelen generar este tipo de problema con Meta:

1. *Alto volumen de conversaciones sin respuesta* — cuando muchos usuarios inician un chat y no reciben respuesta, Meta lo puede interpretar como spam y bloquea el número.

2. *Campañas con objetivo "Mensajes" (deprecado)* — el 5 de mayo se activaron nuevas campañas con ese objetivo, que Meta está discontinuando. Este objetivo puede generar flags en cuentas con alto volumen de mensajes.

3. *Frecuencia de anuncios elevada* — algunas campañas venían con frecuencia alta (los mismos usuarios recibiendo el anuncio varias veces), lo que incrementa reportes de spam.

4. *Intento de reconexión del número a WhatsApp Business API* — si en algún momento se intentó vincular el número a la API oficial de Meta, un proceso incorrecto puede derivar en suspensión.

Durante los 4 meses que trabajé con IFPA el número nunca tuvo inconvenientes, y el sistema que construí era solo de lectura de datos — nunca enviaba mensajes masivos ni modificaba configuraciones de WhatsApp.

Quedo a disposición si necesitan información adicional o algún reporte de actividad para presentar ante Meta y gestionar el desbloqueo.

Saludos,
Renzo
