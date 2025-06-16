// REMPLACER COMPLÈTEMENT votre index.js actuel
const express = require("express")
const cors = require("cors")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const app = express()
const PORT = process.env.PORT || 3000

// ===== CORS POUR VERCEL =====
app.use(
  cors({
    origin: ["https://partie-front.vercel.app", "https://*.vercel.app", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// ===== UPLOADS =====
app.use("/uploads", express.static("uploads"))

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
})

// ===== BASE DE DONNÉES =====
let db = {
  users: [],
  chats: [],
  groups: [],
  stories: [],
  notifications: [],
  calls: [],
}

function loadDB() {
  try {
    if (fs.existsSync("db.json")) {
      const data = fs.readFileSync("db.json", "utf8")
      db = JSON.parse(data)
    }
  } catch (error) {
    console.error("Erreur chargement DB:", error)
  }
}

function saveDB() {
  try {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2))
  } catch (error) {
    console.error("Erreur sauvegarde DB:", error)
  }
}

loadDB()

// ===== ROUTES USERS =====
app.get("/users", (req, res) => res.json(db.users))
app.get("/users/:id", (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id)
  user ? res.json(user) : res.status(404).json({ error: "Utilisateur non trouvé" })
})
app.post("/users", (req, res) => {
  db.users.push(req.body)
  saveDB()
  res.json(req.body)
})
app.put("/users/:id", (req, res) => {
  const index = db.users.findIndex((u) => u.id === req.params.id)
  if (index !== -1) {
    db.users[index] = { ...db.users[index], ...req.body }
    saveDB()
    res.json(db.users[index])
  } else {
    res.status(404).json({ error: "Utilisateur non trouvé" })
  }
})

// ===== ROUTES CHATS =====
app.get("/chats", (req, res) => res.json(db.chats))
app.get("/chats/:id", (req, res) => {
  const chat = db.chats.find((c) => c.id === req.params.id)
  chat ? res.json(chat) : res.status(404).json({ error: "Chat non trouvé" })
})
app.post("/chats", (req, res) => {
  db.chats.push(req.body)
  saveDB()
  res.json(req.body)
})
app.put("/chats/:id", (req, res) => {
  const index = db.chats.findIndex((c) => c.id === req.params.id)
  if (index !== -1) {
    db.chats[index] = { ...db.chats[index], ...req.body }
    saveDB()
    res.json(db.chats[index])
  } else {
    res.status(404).json({ error: "Chat non trouvé" })
  }
})
app.delete("/chats/:id", (req, res) => {
  const index = db.chats.findIndex((c) => c.id === req.params.id)
  if (index !== -1) {
    db.chats.splice(index, 1)
    saveDB()
    res.json({ message: "Chat supprimé" })
  } else {
    res.status(404).json({ error: "Chat non trouvé" })
  }
})

// ===== ROUTES GROUPES =====
app.get("/groups", (req, res) => res.json(db.groups))
app.get("/groups/:id", (req, res) => {
  const group = db.groups.find((g) => g.id === req.params.id)
  group ? res.json(group) : res.status(404).json({ error: "Groupe non trouvé" })
})
app.post("/groups", (req, res) => {
  db.groups.push(req.body)
  saveDB()
  res.json(req.body)
})
app.put("/groups/:id", (req, res) => {
  const index = db.groups.findIndex((g) => g.id === req.params.id)
  if (index !== -1) {
    db.groups[index] = { ...db.groups[index], ...req.body }
    saveDB()
    res.json(db.groups[index])
  } else {
    res.status(404).json({ error: "Groupe non trouvé" })
  }
})

// ===== ROUTES UPLOAD (NOUVELLES) =====
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier uploadé" })
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      type: req.file.mimetype,
    })
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'upload" })
  }
})

app.post("/upload-voice", (req, res) => {
  try {
    const { audioData, filename } = req.body
    if (!audioData) {
      return res.status(400).json({ error: "Données audio manquantes" })
    }
    const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")
    const fileName = filename || `voice-${Date.now()}.webm`
    const filePath = path.join("uploads", fileName)
    fs.writeFileSync(filePath, buffer)
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`
    res.json({
      success: true,
      filename: fileName,
      url: fileUrl,
      size: buffer.length,
    })
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'upload vocal" })
  }
})

// ===== AUTRES ROUTES =====
app.get("/calls", (req, res) => res.json(db.calls || []))
app.post("/calls", (req, res) => {
  if (!db.calls) db.calls = []
  db.calls.push(req.body)
  saveDB()
  res.json(req.body)
})

app.get("/notifications", (req, res) => {
  const userId = req.query.userId
  if (userId) {
    const userNotifications = (db.notifications || []).filter((n) => n.userId === userId)
    res.json(userNotifications)
  } else {
    res.json(db.notifications || [])
  }
})

app.post("/notifications", (req, res) => {
  if (!db.notifications) db.notifications = []
  db.notifications.push(req.body)
  saveDB()
  res.json(req.body)
})

app.get("/stories", (req, res) => res.json(db.stories || []))
app.post("/stories", (req, res) => {
  if (!db.stories) db.stories = []
  db.stories.push(req.body)
  saveDB()
  res.json(req.body)
})

// ===== ROUTE SANTÉ (NOUVELLE) =====
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: {
      users: db.users.length,
      chats: db.chats.length,
      groups: db.groups.length,
    },
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`)
  console.log(`📊 Base de données: ${db.users.length} users, ${db.chats.length} chats`)
})
