// Función serverless de Vercel para el asistente Smarty.
// Recibe la conversación desde la página, agrega las instrucciones y las herramientas,
// y llama a la API de Anthropic. Las herramientas (catálogo, bridas, distribuidores,
// cotización) se ejecutan en el navegador del visitante; esta función solo hace de puente.
import { RULES } from './_rules.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const MAX_MESSAGES = 40;
const MAX_BODY_CHARS = 80_000;

const TOOLS = [
  {
    name: 'buscar_catalogo',
    description: 'Busca piezas en el catálogo de Impactools. Devuelve hasta 8 piezas con código, producto, medida, encastre, material y norma. Acepta texto libre en español (medida en mm o pulgadas, tipo, material, encastre) y filtros opcionales.',
    input_schema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Consulta, ej. "llave de golpe estrella 2-3/16 antichispa" o "bocallave 46 mm encastre 1"' },
        familia: { type: 'string', enum: ['golpe', 'er', 'ea', 'hx', 'bf', 'bh', 'be', 'bl', 'ns', 'nc', 'mz'], description: 'golpe=todas las llaves de golpe; er estrella recta; ea acodada; hx hexagonal; bf boca fija; bh bocallave hexagonal; be estriada; bl larga; ns golpe antichispa; nc combinada antichispa; mz mazas' },
        material: { type: 'string', enum: ['acero', 'ns', 'albr', 'cube', 'bronce', 'cobre'] },
        medida_mm: { type: 'number' },
        medida_pulgadas: { type: 'string', description: 'ej. "2-3/16"' },
        encastre: { type: 'string', enum: ['1/2"', '3/4"', '1"', '1-1/2"', '2-1/2"'] }
      }
    }
  },
  {
    name: 'llave_para_brida',
    description: 'Calcula el espárrago, la medida entre caras de la tuerca pesada 2H y el encastre sugerido para una brida ASME B16.5, y busca las llaves de golpe y bocallaves que corresponden.',
    input_schema: {
      type: 'object',
      properties: {
        clase: { type: 'string', enum: ['150', '300', '600', '900', '1500', '2500'] },
        nps: { type: 'string', enum: ['2', '3', '4', '6', '8', '10', '12', '16', '20', '24'] }
      },
      required: ['clase', 'nps']
    }
  },
  {
    name: 'distribuidor_cercano',
    description: 'Devuelve el distribuidor oficial de Impactools para una localidad o provincia argentina, o indica atención directa de fábrica.',
    input_schema: { type: 'object', properties: { ubicacion: { type: 'string' } }, required: ['ubicacion'] }
  },
  {
    name: 'agregar_a_cotizacion',
    description: 'Agrega una pieza del catálogo al pedido de cotización del visitante, por código exacto.',
    input_schema: { type: 'object', properties: { codigo: { type: 'string' }, cantidad: { type: 'number' } }, required: ['codigo'] }
  }
];
const TOOL_NAMES = new Set(TOOLS.map(t => t.name));

function validMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return false;
  if (messages[0].role !== 'user') return false;
  for (const m of messages) {
    if (m.role !== 'user' && m.role !== 'assistant') return false;
    if (typeof m.content === 'string') { if (!m.content.trim()) return false; continue; }
    if (!Array.isArray(m.content)) return false;
    for (const b of m.content) {
      if (!b || typeof b !== 'object') return false;
      if (b.type === 'tool_use' && !TOOL_NAMES.has(b.name)) return false;
      if (!['text', 'tool_use', 'tool_result'].includes(b.type)) return false;
    }
  }
  return true;
}

export default async function handler(req, res) {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, ai: hasKey });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!hasKey) return res.status(503).json({ error: 'ai_not_configured' });

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body || JSON.stringify(body).length > MAX_BODY_CHARS) return res.status(413).json({ error: 'too_large' });
  const { messages } = body;
  if (!validMessages(messages)) return res.status(400).json({ error: 'invalid_messages' });

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: RULES, tools: TOOLS, messages })
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 502;
      return res.status(status).json({ error: data?.error?.type || 'upstream_error' });
    }
    return res.status(200).json({ content: data.content, stop_reason: data.stop_reason });
  } catch (err) {
    return res.status(502).json({ error: 'upstream_error' });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
