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
        message: "Registro exitoso",
    });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if(!email) { 
        return res.status(400).json({ message: "Se require un correo" });
    }

    if(!password) {
        return res.status(400).json({ message: "Se require una contraseña" });
    }

    const userInfo = await Usuario.findOne({ email: email });

    if(!userInfo) {
        return res.status(400).json({ message: "Usuario no encontrado" });
    }

    if (userInfo.email == email && userInfo.password == password) {
        const user = { user: userInfo };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "3600m",
        });

        return res.json({
            error: false,
            message: "Inicio de sesión exitoso",
            email,
            accessToken,
        });
    } else {
        return res.status(400).json({
            error: true,
            message: "Credenciales incorrectas",
        });
    }
});

app.listen(8000);

module.exports = app;