# MC Panel — Setup

## Archivos
```
mc-panel/
├── server.js    ← Backend Node.js (corre en tu PC)
├── index.html   ← Panel web (abrís en el navegador)
└── README.md
```

## Instalación (una sola vez)

1. Bajá Node.js desde https://nodejs.org (LTS)
2. Abrí una terminal en esta carpeta:
   ```
   npm init -y
   npm install express cors
   ```

## Configuración

### Contraseña
En `server.js`, línea:
```js
const PANEL_PASSWORD = "admin123";
```
Cambiala por la tuya.

### Tus servidores
En `server.js`, editá el array `SERVERS`:
```js
{
  id: "server1",               // identificador único
  name: "DeceasedCraft",       // nombre visible
  version: "1.18",
  description: "Beta DH",
  bat: "G:\\Server\\MC\\...\\run.bat",
  port: 25565,                 // cada servidor necesita un puerto distinto
  maxPlayers: 20,
  icon: "⚔️",
},
```

### Puertos distintos por servidor
En el `server.properties` de cada servidor, cambiá:
```
server-port=25565   ← servidor 1
server-port=25566   ← servidor 2
server-port=25567   ← servidor 3
...
```
Y reflejalo en `port:` de cada entrada del array.

## Iniciar el backend
```
node server.js
```

## Acceso

### Local (vos mismo)
Abrí `index.html` directo en el navegador.
En index.html dejá: `const API = "http://localhost:3001"`

### Red local (amigos en la misma red)
Cambiá en index.html:
```js
const API = "http://192.168.X.X:3001";  // tu IP local
```
Compartiles el archivo HTML.

### Internet (amigos remotos) — más fácil con ngrok
1. Bajá ngrok desde https://ngrok.com
2. Corré: `ngrok http 3001`
3. Te da una URL tipo `https://abc123.ngrok.io`
4. Cambiá en index.html: `const API = "https://abc123.ngrok.io"`
5. Compartiles el HTML

### Firewall Windows
Si usás port forwarding, abrí el puerto 3001 en el firewall:
Panel de Control → Firewall → Reglas de entrada → Nueva regla → Puerto 3001 TCP
