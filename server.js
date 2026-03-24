/**
 * MC Panel - Backend
 * Corre en tu PC con: node server.js
 * Requiere: npm install express cors
 */

const express = require("express");
const { exec, spawn } = require("child_process");
const net = require("net");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(require("cors")());

// ─────────────────────────────────────────────
//  CONFIGURACIÓN DE TUS USUARIOS
// ─────────────────────────────────────────────
function getUsers() {
  try {
    const data = fs.readFileSync(path.join(__dirname, "users.json"), "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error al cargar users.json:", error);
    return [];
  }
}

// ─────────────────────────────────────────────
//  CONFIGURACIÓN DE TUS SERVIDORES
//  Se cargan dinámicamente desde servers.json en cada petición
// ─────────────────────────────────────────────
function getServers() {
  try {
    const data = fs.readFileSync(path.join(__dirname, "servers.json"), "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error al cargar servers.json:", error);
    return [];
  }
}

// Guarda referencias a procesos activos
const runningProcesses = {};

// ─────────────────────────────────────────────
//  MIDDLEWARE: Verificar token
// ─────────────────────────────────────────────
function authMiddleware(req, res, next) {
  if (req.path === "/login" || req.path === "/" || req.path === "/index.html" || req.path.endsWith(".css") || req.path.endsWith(".js")) return next();
  const token = req.headers["x-panel-token"];
  
  const users = getUsers();
  const user = users.find(u => u.password === token);

  if (!user) {
    return res.status(401).json({ error: "No autorizado" });
  }
  
  req.user = user;
  next();
}
app.use(authMiddleware);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ─────────────────────────────────────────────
//  POST /login
// ─────────────────────────────────────────────
app.post("/login", (req, res) => {
  const { password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.password === password);

  if (user) {
    res.json({ ok: true, token: user.password });
  } else {
    res.status(401).json({ error: "Contraseña incorrecta" });
  }
});

// ─────────────────────────────────────────────
//  HELPER: Puerto TCP abierto
// ─────────────────────────────────────────────
function checkPort(port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;
    socket.setTimeout(timeout);
    socket.on("connect", () => { status = true; socket.destroy(); });
    socket.on("timeout", () => socket.destroy());
    socket.on("error", () => socket.destroy());
    socket.on("close", () => resolve(status));
    socket.connect(port, "127.0.0.1");
  });
}

function checkProcess(serverId) {
  return new Promise((resolve) => {
    if (runningProcesses[serverId]) {
      resolve(runningProcesses[serverId].exitCode === null);
      return;
    }
    resolve(false);
  });
}

// ─────────────────────────────────────────────
//  GET /servers
// ─────────────────────────────────────────────
app.get("/servers", async (req, res) => {
  let serversList = getServers();
  
  // Filtramos por los permisos del usuario conectado
  if (!req.user.allowedServers.includes("*")) {
    serversList = serversList.filter(s => req.user.allowedServers.includes(s.id));
  }

  const results = await Promise.all(
    serversList.map(async (srv) => {
      const [portOpen, processRunning] = await Promise.all([
        checkPort(srv.port),
        checkProcess(srv.id),
      ]);
      return {
        id: srv.id,
        name: srv.name,
        version: srv.version,
        description: srv.description,
        port: srv.port,
        status: portOpen ? "online" : processRunning ? "starting" : "offline",
        portOpen,
        processRunning,
      };
    })
  );
  res.json(results);
});

// ─────────────────────────────────────────────
//  POST /servers/:id/start
// ─────────────────────────────────────────────
app.post("/servers/:id/start", (req, res) => {
  // Verificación de permisos
  if (!req.user.allowedServers.includes("*") && !req.user.allowedServers.includes(req.params.id)) {
    return res.status(403).json({ error: "No tienes permiso para operar este servidor" });
  }

  const serversList = getServers();
  const srv = serversList.find((s) => s.id === req.params.id);
  if (!srv) return res.status(404).json({ error: "Servidor no encontrado" });
  if (runningProcesses[srv.id]) {
    return res.status(400).json({ error: "El servidor ya está corriendo" });
  }

  const batDir = path.dirname(srv.bat);
  const batFile = path.basename(srv.bat);
  console.log(`[MC Panel] Iniciando ${srv.name} → ${srv.bat}`);

  try {
    // Evitamos usar 'start' para no perder el tracking del proceso.
    const proc = spawn("cmd.exe", ["/c", batFile], {
      cwd: batDir,
      detached: true,
    });

    proc.on("error", (err) => {
      console.error(`[MC Panel] Error iniciando ${srv.name}:`, err);
      delete runningProcesses[srv.id];
    });

    proc.on("close", (code) => {
      console.log(`[MC Panel] ${srv.name} terminó (código ${code})`);
      delete runningProcesses[srv.id];
    });

    runningProcesses[srv.id] = proc;
    res.json({ ok: true, message: `${srv.name} iniciando...` });
  } catch (err) {
    console.error(`[MC Panel] Excepción iniciando ${srv.name}:`, err);
    res.status(500).json({ error: "Error interno al iniciar servidor" });
  }
});

// ─────────────────────────────────────────────
//  POST /servers/:id/stop
// ─────────────────────────────────────────────
app.post("/servers/:id/stop", (req, res) => {
  // Verificación de permisos
  if (!req.user.allowedServers.includes("*") && !req.user.allowedServers.includes(req.params.id)) {
    return res.status(403).json({ error: "No tienes permiso para operar este servidor" });
  }

  const serversList = getServers();
  const srv = serversList.find((s) => s.id === req.params.id);
  if (!srv) return res.status(404).json({ error: "Servidor no encontrado" });
  if (!runningProcesses[srv.id]) {
    return res.status(400).json({ error: "El servidor no está corriendo" });
  }

  exec(`taskkill /F /T /PID ${runningProcesses[srv.id].pid}`, (err) => {
    if (err) console.error("Error al hacer taskkill:", err);
  });

  delete runningProcesses[srv.id];
  res.json({ ok: true, message: `${srv.name} detenido` });
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   MC Panel Backend corriendo          ║`);
  console.log(`║   http://localhost:${PORT}              ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
  console.log(`Servidores: ${getServers().map((s) => s.name).join(", ")}`);
  console.log(`Usuarios cargados: ${getUsers().map((u) => u.role).join(", ")}\n`);
});
