const https = require('https');

const SUPABASE_URL = 'https://yuoftlckoctrkkfajaii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1b2Z0bGNrb2N0cmtrZmFqYWlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTAzOTAzMiwiZXhwIjoyMTA2NjE1MDMyfQ.cYsHHZwW9TGu2PIAdNjk2OL8jhmOYWMHYhYH9-zF2AU';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: new URL(SUPABASE_URL).hostname,
      path: path,
      method: method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', (d) => chunks += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, data: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const roles = (await api('GET', '/rest/v1/roles?select=id,nombre,permisos')).data;
  for (const r of roles) {
    const permisos = r.permisos || [];
    const modulos = permisos.map(p => p.modulo).join(', ');
    const tieneUsuarios = permisos.some(p => p.modulo === 'USUARIOS_ROLES');
    console.log(`${r.id} | ${r.nombre} | USUARIOS_ROLES=${tieneUsuarios}`);
    if (!tieneUsuarios) console.log(`   Módulos: ${modulos}`);
  }
}

main().catch(console.error);
