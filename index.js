require("dotenv").config();

const config = require("./config.json");
const mongoose = require("mongoose");

//mongoose.connect(config.connectionString);

const connectionString = process.env.MONGODB_CONNECTION

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Conectado a MongoDB');
}).catch((error) => {
    console.error('Error conectandose a MongoDB:', error);
});

const Usuario = require("./models/user.model.js");
const Notas = require("./models/note.model.js");

const express = require("express");
const cors = require("cors");
const app = express();

const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./utilities");

app.use(express.json());

app.use(
    cors({
        origin: "*",
    })
);

app.get("/", (req, res) => {
    res.json({ data: "Hello" });
});

// Crear cuenta

app.post("/crear-cuenta", async (req, res) => {
    const { fullName, email, password } = req.body;

    if(!fullName) {
        return res
            .status(400)
            .json({ error: true, message: "El nombre completo es requerido." });
    }

    if(!email) {
        return res
            .status(400)
            .json({ error: true, message: "El correo es requerido." });
    }

    if(!email) {
        return res
            .status(400)
            .json({ error: true, message: "La contraseña es requerida." });
    }

    const isUser = await Usuario.findOne({ email: email });

    if(isUser) {
        return res.json({
            error: true,
            message: "El usuario ya existe.",
        });
    }

    const usuario = new Usuario({
        fullName,
        email,
        password
    });

    await usuario.save();

    const accessToken = jwt.sign({ usuario }, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: "3600m",
    });

    return res.json({
        error: false,
        usuario,
        accessToken,
        message: "Registro exitoso.",
    });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if(!email) { 
        return res.status(400).json({ message: "Se require un correo." });
    }

    if(!password) {
        return res.status(400).json({ message: "Se require una contraseña." });
    }

    const userInfo = await Usuario.findOne({ email: email });

    if(!userInfo) {
        return res.status(400).json({ message: "Usuario no encontrado." });
    }

    if (userInfo.email == email && userInfo.password == password) {
        const user = { user: userInfo };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "3600m",
        });

        return res.json({
            error: false,
            message: "Inicio de sesión exitoso.",
            email,
            accessToken,
        });
    } else {
        return res.status(400).json({
            error: true,
            message: "Credenciales incorrectas.",
        });
    }
});

// Obtener Usuarios

app.get("/get-user", authenticateToken, async (req, res) => {
    const { user } = req.user;

    const isUser = await Usuario.findOne({ _id: user._id });

    if (!isUser) {
        return res.sendStatus(401);
    }

    return res.json({
        user: {
            fullName: isUser.fullName,
            email: isUser.email,
            _id: isUser._id,
            createdOn: isUser.createdOn,
        },
        message: "",
    });
});

// Agregar Nota

app.post("/add-note", authenticateToken, async (req, res) => {
    const { title, content, tags } = req.body;
    const { user } = req.user;

    if(!title) {
        return res.status(400).json({ error: true, message: "Se require un titulo." });
    }

    if (!content) {
        return res.status(400).json({ error: true, message: "Se require un contenido." });
    }

    try {
        const note = new Notas({
            title,
            content,
            tags: tags || [],
            userId: user._id,
        });

        await note.save();

        return res.json({
            error: false,
            note,
            message: "Nota añadida exitosamente.",
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: `Internal Server Error: ${error.message}`,
        });
    }    
});

app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned } = req.body;
    const { user } = req.user;

    if(!title && !content && !tags) {
        return res
            .status(400)
            .json({ error: true, message: "No se requieren cambios." });
    }

    try {
        const note = await Notas.findOne({ _id: noteId, userId: user._id });

        if(!note) {
            return res.status(404).json({ error: true, message: "No se encontró la nota." });
        }

        if (title) note.title = title;
        if (content) note.content = content;
        if (tags) note.tags = tags;
        if (isPinned) note.isPinned = isPinned;

        await note.save();

        return res.json({
            error: false,
            note,
            message: "Nota actualizada correctamente."
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: `Internal Server Error: ${error.message}`,
        });
    }
});

app.get("/get-notes", authenticateToken, async (req, res) => {
    const { user } = req.user;

    try {
        const notes = await Notas.find({ userId: user._id 
        }).sort({ isPinned: -1 
        });

        return res.json({
            error: false,
            notes,
            message: "Se han encontrado todas las notas.",
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: `Internal Server Error: ${error.message}`,
        });
    }
});

// Borrar Notas

app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { user } = req.user;

    try {
        const note = await Notas.findOne({ _id: noteId, userId: user._id });

        if (!note) {
            return res.status(404).json({ error: true, message: "No se encontró la nota." });
        }

        await Notas.deleteOne({ _id: noteId, userId: user._id });

        return res.json({
            error: false,
            message: "Nota eliminada correctamente.",
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: `Internal Server Error: ${error.message}`,
        });
    }
});

// Actualizar valor de pin

app.put("/update-note-pinned/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { isPinned } = req.body;
    const { user } = req.user;
    
    try {
        const note = await Notas.findOne({ _id: noteId, userId: user._id });

        if(!note) {
            return res.status(404).json({ error: true, message: "No se encontró la nota." });
        }

        note.isPinned = isPinned;

        await note.save();

        return res.json({
            error: false,
            note,
            message: "Nota actualizada correctamente."
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: `Internal Server Error: ${error.message}`,
        });
    }
});

app.listen(8000);

module.exports = app;