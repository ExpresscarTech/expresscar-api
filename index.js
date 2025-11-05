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
app.get('/equiv', checkApiKey, (req, res) => {
  const ref = (req.query.ref || '').toString().trim();
  const marca = (req.query.marca || '').toString().trim();

  if (!ref || !marca) {
    return res.status(400).json({ error: 'missing ref or marca' });
  }

  // POR AGORA: devolver só um exemplo fixo.
  // MAIS TARDE: aqui vamos ligar aos restantes sistemas / base de dados.
  const exemplos = [
    {
      marca: 'HONDA',
      ref: '15400-RBA-F01',
      ean: null,
      fonteUrl: null,
      descricao: `EQUIVALENTE A ${ref} (${marca})`
    },
    {
      marca: 'FIAT',
      ref: '71736161',
      ean: null,
      fonteUrl: null,
      descricao: `EQUIVALENTE A ${ref} (${marca})`
    }
  ];

  res.json(exemplos);
});

app.listen(PORT, () => {
  console.log(`ExpressCar API a escutar na porta ${PORT}`);
});
