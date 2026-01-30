const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config(); // ✅ LOAD ENV VARIABLES

const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ================= ENSURE UPLOADS FOLDER =================
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ================= DATABASE =================
async function connectDB() {
  try {
    console.log("⏳ Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Atlas Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed");
    console.error(err.message);
    process.exit(1);
  }
}

// ================= SCHEMA =================
const MenuSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  subCategory: String,
  rating: String,
  orders: Number,
  image: String
});

const Menu = mongoose.model("Menu", MenuSchema);

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ================= ROUTES =================

// GET all menu items
app.get("/menu", async (req, res) => {
  try {
    const items = await Menu.find();
    res.json(
      items.map(item => ({
        ...item._doc,
        image: item.image
          ? `http://localhost:${PORT}/uploads/${item.image}`
          : ""
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// ADD menu item
app.post("/menu", upload.single("image"), async (req, res) => {
  try {
    await Menu.create({
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,
      subCategory: req.body.subCategory,
      rating: req.body.rating,
      orders: req.body.orders || 0,
      image: req.file ? req.file.filename : ""
    });

    res.json({ message: "Item added successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to add item" });
  }
});

// ================= START SERVER =================
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});
