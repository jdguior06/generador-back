const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 
require('dotenv').config();

const authRoutes = require('./routes/authRoute');
const proyectoRoutes = require("./routes/proyectoRoute");

const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use("/api/proyectos", proyectoRoutes);

app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on("update-elements", ({ projectId, pageId, elements }) => {
    socket.broadcast.emit("elements-updated", { projectId, pageId, elements });
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor backend y WebSocket corriendo en http://localhost:${PORT}`);
});
