/**
 * Catálogo de los workflows que se importan y publican en n8n.
 *
 * Los ID son fijos: el router (US-17) invoca a los subflujos por ID y todos
 * apuntan a US-21 como flujo de errores. US-09 por correo queda fuera
 * (postergado) y la PWA no es un workflow.
 */
export const FLUJOS = [
  { archivo: 'US-21-alertas-errores.json', id: 'farmaciaUS21aler', nombre: 'Alertas de error' },
  { archivo: 'US-04-consulta-stock.json', id: 'farmaciaUS04cons', nombre: 'Consulta de stock' },
  { archivo: 'US-05-reserva.json', id: 'farmaciaUS05rese', nombre: 'Reserva' },
  { archivo: 'US-06-trazabilidad.json', id: 'farmaciaUS06traz', nombre: 'Estado del pedido' },
  { archivo: 'US-09-recetas-telegram.json', id: 'farmaciaUS09rect', nombre: 'Recetas por Telegram' },
  { archivo: 'US-10-cron-expiracion.json', id: 'farmaciaUS10cron', nombre: 'Expiración a 12 horas' },
  { archivo: 'US-20-aprobacion-recetas.json', id: 'farmaciaUS20apro', nombre: 'Aprobación farmacéutica' },
  { archivo: 'US-22-despacho-personal.json', id: 'farmaciaUS22desp', nombre: 'Despacho por el personal' },
  { archivo: 'US-17-router-telegram.json', id: 'farmaciaUS17rout', nombre: 'Router de Telegram' }
];

/** Imagen fijada de n8n (la misma de docker-compose.yml). */
export const N8N_IMAGEN = process.env.N8N_IMAGE || 'n8nio/n8n:2.44.2';

/** Ruta del único webhook público del bot. */
export const WEBHOOK_PATH = 'telegram-bot';

/** Credencial de Google (cuenta de servicio) que usan todos los nodos de Sheets. */
export const CREDENCIAL_GOOGLE = { id: 'farmaciaGoogleSA', name: 'Google (cuenta de servicio)', type: 'googleApi' };

/**
 * Credencial OAuth2 con la que US-09 sube las recetas al Drive del usuario.
 * Se crea desde secrets/oauth-client.json y se conecta una vez en el editor.
 */
export const CREDENCIAL_DRIVE_OAUTH = { id: 'farmaciaGoogleDriveOAuth', name: 'Google Drive (OAuth)', type: 'googleDriveOAuth2Api' };
export const OAUTH_CALLBACK = 'http://localhost:5678/rest/oauth2-credential/callback';
