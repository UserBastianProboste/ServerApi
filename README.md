# Minecraft Server Web Controller

Una interfaz web sencilla y eficiente para gestionar y controlar múltiples servidores de Minecraft desde un único panel.

## Características

- **Inicio/Parada de Servidores**: Controla el estado de tus servidores con un solo clic.
- **Monitoreo en Tiempo Real**: Revisa si cada servidor está Online u Offline.
- **Configuración Dinámica**: Añade o modifica servidores editando el archivo `servers.json`, sin necesidad de reiniciar el panel.
- **Control de Acceso**: Autenticación de usuarios mediante `users.json`.
- **Backend Ligero**: Construido desde cero con Node.js y un frontend sin frameworks pesados.

## Instalación y Uso

1. Instala las dependencias necesarias:
   ```bash
   npm install
   ```

2. Configura los directorios de tus servidores en `servers.json`:
   ```json
   [
     {
       "id": "server1",
       "name": "Survival",
       "path": "C:/ruta/a/tu/servidor",
       "startCommand": "start.bat"
     }
   ]
   ```

3. Inicia el controlador web:
   ```bash
   node server.js
   ```

4. Abre tu navegador y accede al panel, por lo general en: `http://localhost:3000`.
---
Creado para simplificar la administración de redes de Minecraft.