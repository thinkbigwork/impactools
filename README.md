# Impactools · sitio web

Sitio estático con el asistente técnico con IA **Smarty**, listo para publicar en Vercel.

```
index.html        La página completa (catálogo, calculadora de bridas, antichispa, cotización, Smarty)
api/chat.js       Función serverless: puente entre Smarty y la API de Anthropic
api/_rules.js     Instrucciones de Smarty (no es una ruta pública)
vercel.json       Configuración de Vercel
```

## Publicar en Vercel

### Opción A: desde la terminal (más rápida)

1. Instalá Node.js 18 o superior.
2. En esta carpeta, ejecutá:
   ```
   npx vercel
   ```
   Iniciá sesión cuando lo pida y aceptá los valores por defecto (no hay paso de build).
3. Cargá la clave de la API de Anthropic para que Smarty converse con IA:
   ```
   npx vercel env add ANTHROPIC_API_KEY production
   ```
4. Publicá en producción:
   ```
   npx vercel --prod
   ```

### Opción B: desde GitHub

1. Subí esta carpeta a un repositorio de GitHub.
2. En vercel.com → **Add New → Project**, importá el repositorio. Framework: **Other**. Sin comando de build.
3. En **Settings → Environment Variables**, agregá `ANTHROPIC_API_KEY`.
4. **Deploy**. Cada push a la rama principal vuelve a publicar.

## Variables de entorno

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Sí, para el chat con IA | Clave de console.anthropic.com |
| `ANTHROPIC_MODEL` | No | Modelo de Smarty. Por defecto `claude-haiku-5-5` (rápido y económico) |

Sin `ANTHROPIC_API_KEY` la web funciona igual y Smarty responde en **modo búsqueda rápida** (reglas locales sobre el catálogo).

## Cómo funciona Smarty

La página manda la conversación a `/api/chat`. La función agrega las instrucciones y llama a la API de Anthropic. Cuando el modelo pide una herramienta (buscar en catálogo, llave para brida, distribuidor, agregar a cotización), la página la ejecuta en el navegador con el catálogo local y devuelve el resultado. La clave nunca llega al navegador.

## Antes de salir en vivo

- **Catálogo:** es de muestra. Reemplazar el bloque `/* ---------- Datos ---------- */` de `index.html` por los códigos y medidas del catálogo oficial.
- **Distribuidores:** confirmar con cada uno la lista `DISTS`.
- **Costos y abuso:** cada mensaje a Smarty consume la API. Configurá un límite de gasto en console.anthropic.com. Para tráfico alto conviene sumar límite por IP (por ejemplo, Vercel Firewall).
- **Dominio:** en Vercel → **Settings → Domains**, conectá `impactoolssrl.com` y apuntá el DNS como indica Vercel.
