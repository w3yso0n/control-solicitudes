# WhatsApp / Twilio (pendiente de implementación)

El envío real **no forma parte de este MVP de vistas**. Cuando se construya el backend, el canal se opera con Twilio WhatsApp Business API.

## Plantillas (categoría UTILITY ante Meta)

### 1. Constancia de recepción (activa en campaña)

Hola {{1}}, soy {{2}}. Quiero agradecerte personalmente por acercarte y compartirme tu petición. La recibí y ya quedó registrada.

Aquí van tus datos por si los necesitas después:

Folio: {{3}} Fecha: {{4}} Lugar: {{5}} Tema: {{6}}

Tu voz cuenta y me la llevo conmigo. Guarda este mensaje, es tu constancia.

Más información sobre cómo cuidamos tus datos: {{7}}
Si no quieres recibir más mensajes, responde BAJA.

Variables: nombre, candidata, folio, fecha DD/MM/AAAA, lugar/evento, categoría en lenguaje ciudadano, URL corta del aviso de privacidad.

### 2. Respuesta a BAJA

Entendido. No te enviaremos más mensajes. Tu petición con folio {{1}} sigue registrada y se toma en cuenta. Gracias.

### 3. Reserva fase gobierno (pre-aprobar, no enviar ahora)

[Gobierno {{1}}] Actualización sobre su petición. Folio: {{2}} Estatus: {{3}} Detalle: {{4}} Consulte el detalle: {{5}} Si no desea recibir más mensajes, responda BAJA.

## Reglas de envío

- Ventana: 24–48 h después de la captura
- Horario: 10:00–19:00 hora local; evitar domingos
- Máximo 2 reintentos por fallo temporal
- Opt-out permanente si responde BAJA, baja, no, stop, cancelar
- Pausar si la tasa de bloqueo supera 2% en un día
- Primeras dos semanas: máximo 500 mensajes/día por número (calentamiento)
- Segundo número Business API como plan B

## Redacción

Nunca prometer resolución. Cierre fijo de campaña: “Tu voz cuenta y me la llevo conmigo”. BAJA siempre al final, en mayúsculas.

El aviso de privacidad vive en `/aviso-privacidad` y debe estar publicado antes del primer envío.
