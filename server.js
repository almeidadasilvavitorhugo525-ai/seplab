const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.get('/api/data', (req, res) => {
  res.json(readData());
});

app.post('/api/data', (req, res) => {
  try {
    writeData(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/network-info', (req, res) => {
  const ip = getLocalIP();
  res.json({ ip, port: PORT, url: `http://${ip}:${PORT}` });
});

const PORT = 3000;
const localIP = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n ╔══════════════════════════════════════════╗');
  console.log(' ║        SepLab Tooling - ATIVO            ║');
  console.log(' ╠══════════════════════════════════════════╣');
  console.log(` ║  Local:  http://localhost:${PORT}           ║`);
  console.log(` ║  Rede:   http://${localIP}:${PORT}     ║`);
  console.log(' ╠══════════════════════════════════════════╣');
  console.log(' ║  Acesse pelo celular usando o IP da Rede ║');
  console.log(' ║  Pressione Ctrl+C para parar             ║');
  console.log(' ╚══════════════════════════════════════════╝\n');
});
