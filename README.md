# 🚀 NexChat – Setup Anleitung

## Was ist NexChat?
Ein Echtzeit-Messenger mit:
- 💬 Live-Typing (andere sehen jeden Buchstaben sofort)
- 📢 Discord-ähnliche Kanäle
- 📎 Datei-Upload mit Host-Genehmigung
- 👥 Online-User-Liste

---

## 📦 OPTION 1: Lokales Netzwerk (LAN/WLAN)

### Voraussetzungen
- [Node.js](https://nodejs.org) installiert (v16+)

### Schritte

```bash
# 1. In den nexchat Ordner wechseln
cd nexchat

# 2. Abhängigkeiten installieren
npm install

# 3. Server starten
node server.js
```

Der Server zeigt dir dann:
```
╔══════════════════════════════════════════╗
║       NexChat Server läuft! 🚀            ║
╠══════════════════════════════════════════╣
║  Lokal:    http://localhost:3000           ║
║  LAN:      http://192.168.1.XX:3000       ║
╚══════════════════════════════════════════╝
```

### Verbinden
- **Du (Host):**  
  Browser öffnen → `http://localhost:3000`  
  → Rolle: HOST, Server: `localhost:3000`

- **Freunde im gleichen WLAN:**  
  Browser öffnen → `http://192.168.1.XX:3000`  
  → Rolle: CLIENT, Server: `192.168.1.XX:3000`

> ⚠️ Freunde müssen im **gleichen WLAN/LAN** sein.  
> Für Internet: Ports freischalten (3000 TCP) oder Option 2 nutzen.

---

## 🌐 OPTION 2: Online über das Internet (Render.com – kostenlos)

### Schritt 1 – GitHub Repo erstellen
1. Gehe zu [github.com](https://github.com) → „New Repository"
2. Lade die 3 Dateien hoch: `server.js`, `index.html`, `package.json`

### Schritt 2 – Render.com deployen
1. Gehe zu [render.com](https://render.com) und erstelle einen Account
2. Klicke auf **„New +"** → **„Web Service"**
3. Verbinde dein GitHub-Repo
4. Einstellungen:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
5. Klicke **„Create Web Service"**

### Schritt 3 – Verbinden
Nach dem Deploy bekommst du eine URL wie:  
`nexchat.onrender.com`

- **Du und Freunde:** Browser öffnen → `https://nexchat.onrender.com`
- Server-Adresse eingeben: `nexchat.onrender.com` (ohne https://)

> 💡 Der kostenlose Render-Plan schläft nach 15 Min Inaktivität ein.  
> Beim ersten Aufruf kann es 30–60 Sek dauern bis der Server aufwacht.

---

## 🎮 Benutzung

| Rolle | Beschreibung |
|-------|-------------|
| **HOST** | Sieht Upload-Anfragen im Seitenpanel, kann genehmigen/ablehnen |
| **CLIENT** | Normaler Nutzer, muss Uploads vom Host genehmigen lassen |

### Tastenkürzel
- `Enter` → Nachricht senden
- `Shift+Enter` → Neue Zeile
- `📎` Button → Datei hochladen

---

## 🔧 Eigener Port

```bash
PORT=8080 node server.js
```

---

## ❓ Probleme?

**"Verbindung fehlgeschlagen"**  
→ Prüfe ob `node server.js` läuft  
→ Prüfe die IP-Adresse  
→ Firewall prüfen: Port 3000 muss offen sein  

**Freund kann nicht verbinden (LAN)**  
→ Windows Firewall: `node.exe` als Ausnahme hinzufügen  
→ Router: kein Client-Isolation-Modus  
