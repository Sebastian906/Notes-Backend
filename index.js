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

app.listen(8000);

module.exports = app;