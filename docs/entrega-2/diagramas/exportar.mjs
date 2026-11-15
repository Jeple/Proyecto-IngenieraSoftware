#!/usr/bin/env node
// Exporta los .puml de esta carpeta a SVG y PNG con la imagen fijada de PlantUML.
// Uso: node docs/entrega-2/diagramas/exportar.mjs   (requiere Docker)
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const IMAGEN = 'plantuml/plantuml:1.2026.9';
for (const formato of ['-tsvg', '-tpng']) {
  const r = spawnSync('docker', ['run', '--rm', '-v', `${dir}:/data`, '-w', '/data', IMAGEN,
    formato, ...(formato === '-tpng' ? ['-Sdpi=170'] : []), '-charset', 'UTF-8', '-o', 'exportados', 'componentes.puml', 'despliegue.puml', 'estados-pedido.puml',
    'secuencia-consulta.puml', 'secuencia-reserva.puml', 'secuencia-trazabilidad.puml',
    'secuencia-receta-aprobacion.puml', 'secuencia-expiracion.puml', 'secuencia-despacho.puml'], { encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log('Diagramas exportados en ' + dir + '/exportados');
