## Qué cambia

Resumen en dos o tres líneas. Refs #

## Cómo se verificó

- [ ] `node scripts/correr-pruebas.mjs` en verde
- [ ] `bash scripts/check_secrets.sh` sin hallazgos
- [ ] Si cambia un flujo: `node scripts/local/prueba-integracion.mjs` en verde (también corre en la CI)
- [ ] Si cambia lo que ve el vecino: probado en el bot con datos sintéticos

## Antes de fusionar

- [ ] Lo revisa y lo fusiona una persona distinta de quien lo abrió
- [ ] CHANGELOG actualizado si el cambio es visible para usuarios
- [ ] Sin `.env`, claves ni datos reales en el diff
