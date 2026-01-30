require("dotenv").config(); // ✅ Load env variables

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ================= SAFETY CHECK =================
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env file");
  process.exit(1);
}

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
const MenuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    subCategory: String,
    rating: String,
    orders: { type: Number, default: 0 },
    image: String
  },
  { timestamps: true }
);

const Menu = mongoose.model("Menu", MenuSchema);

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  }
});

// ================= ROUTES =================

// 🟢 Health check
app.get("/", (req, res) => {
  res.json({ status: "AmmaVanta backend running ✅" });
});

// 🟢 GET all menu items
app.get("/menu", async (req, res) => {
  try {
    const items = await Menu.find();
    res.json(
      items.map(item => ({
        ...item._doc,
        image: item.image ? `${BASE_URL}/uploads/${item.image}` : ""
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// 🟢 ADD menu item
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
    res.status(400).json({ error: err.message || "Failed to add item" });
  }
});

// ================= START SERVER =================
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at ${BASE_URL}`);
  });
});
