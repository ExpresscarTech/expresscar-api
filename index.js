const express = require('express');
const app = express();

// Porta que o Render vai usar (ou 3000 em local)
const PORT = process.env.PORT || 3000;

// Lê a chave da API a partir de uma variável de ambiente
const API_KEY = process.env.API_KEY;

// Middleware simples para obrigar a usar ?key=...
function checkApiKey(req, res, next) {
  const key = req.query.key;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API_KEY not configured on server' });
  }
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// Endpoint de teste - não precisa de key
app.get('/ping', (req, res) => {
  res.json({ ok: true, message: 'EXPRESSCAR API ONLINE' });
});

// Endpoint principal de equivalencias
app.get('/equiv', checkApiKey, async (req, res) => {
  const ref = (req.query.ref || '').toString().trim();
  const marca = (req.query.marca || '').toString().trim();

  if (!ref || !marca) {
    return res.status(400).json({ error: 'missing ref or marca' });
  }

  try {
    // POR AGORA: só tratamos o caso 7O0012 RIDEX com AUTO-DOC
    const equivalentes = await obterEquivalenciasAutoDoc(ref, marca);

    res.json(equivalentes);
  } catch (e) {
    console.error('ERRO AO OBTER EQUIVALENCIAS:', e);
    res.status(500).json({ error: 'erro a obter equivalencias', detalhe: e.toString() });
  }
});

// Função que vai ao AUTO-DOC buscar equivalencias (POC para 7O0012 RIDEX)
async function obterEquivalenciasAutoDoc(refBase, marcaBase) {
  // Para já, usamos o URL fixo que já sabemos corresponder ao 7O0012 da RIDEX
  const url = 'https://www.auto-doc.pt/ridex/8097412';

  // fetch nativo do Node 18+ (Render deve estar em Node LTS recente)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      // User-Agent "normal" de browser
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`AUTO-DOC HTTP ${response.status}`);
  }

  const html = await response.text();

  // Simplificar texto para facilitar regex
  let texto = html.replace(/\s+/g, ' ');

  // Tentar focar no bloco onde aparecem "OE" / "OEM"
  const upper = texto.toUpperCase();
  const idxOE = upper.indexOf('OE');
  if (idxOE > -1) {
    const start = Math.max(0, idxOE - 4000);
    const end = Math.min(texto.length, idxOE + 4000);
    texto = texto.substring(start, end);
  }

  // Regex genérica para apanhar padrões "MARCA REFERENCIA"
  // Ex.: "HONDA 15400-RBA-F01", "FIAT 71736161", etc.
  const regexPairs = /([A-Z0-9]{2,20})[ :\-]+([A-Z0-9]{3,30}(?:[ \-][A-Z0-9]{1,10})*)/g;

  const encontrados = [];
  let match;

  while ((match = regexPairs.exec(texto)) !== null) {
    const marca = match[1].trim().toUpperCase();
    const ref = match[2].trim().toUpperCase();

    // filtros básicos
    if (marca.length < 2 || ref.length < 3) continue;

    // evitar a própria ref base se aparecer tal e qual
    if (ref === refBase.toUpperCase()) continue;

    // evitar duplicados
    const ja = encontrados.some(e => e.marca === marca && e.referencia === ref);
    if (ja) continue;

    encontrados.push({ marca, referencia: ref });
  }

  // Mapear para o formato que a nossa API expõe
  const resultado = encontrados.map(e => ({
    marca: e.marca,
    ref: e.referencia,
    ean: null,
    fonteUrl: url,
    descricao: `EQUIVALENTE A ${refBase} (${marcaBase})`
  }));

  return resultado;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ExpressCar API a escutar na porta ${PORT}`);
});
