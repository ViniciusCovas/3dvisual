# Espejo Digital

Try-on virtual de lentes (y próximamente colorimetría y ropa) sobre fotos o webcam, 100% en el navegador. Ninguna imagen sale de tu máquina.

## Uso

```bash
npm install     # instala dependencias y descarga los modelos de MediaPipe a public/models/
npm run dev     # abre http://localhost:5173
```

- **Foto:** sube una foto frontal (se procesa localmente con un object URL, nunca se sube a ningún servidor).
- **Webcam:** requiere permiso de cámara; el video no sale del navegador.

Si `npm install` no pudo descargar los modelos (sin red), la app intenta cargarlos desde el CDN de MediaPipe en el primer arranque y lo avisa en consola. Para trabajar 100% offline, vuelve a ejecutar `node scripts/fetch-models.mjs` con red disponible.

## Documentación

- `CLAUDE.md` — stack, principios de arquitectura y estructura.
- `SPEC.md` — milestones y criterios de aceptación.
