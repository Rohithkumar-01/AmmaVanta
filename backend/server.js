require("dotenv").config();

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
  console.error("❌ MONGO_URI not found in environment variables");
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

// ================= DATABASE CONNECTION =================
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

// ================= MULTER CONFIG =================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  }
});

// ================= ROUTES =================

// 🟢 Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    status: "AmmaVanta backend running ✅"
  });
});

// 🟢 GET ALL MENU ITEMS
app.get("/menu", async (req, res) => {
  try {
    const items = await Menu.find().sort({ createdAt: -1 });

    const formattedItems = items.map(item => ({
      _id: item._id,
      name: item.name,
      price: item.price,
      category: item.category,
      subCategory: item.subCategory,
      rating: item.rating,
      orders: item.orders,
      createdAt: item.createdAt,
      image: item.image
        ? `${BASE_URL}/uploads/${item.image}`
        : ""
    }));

    res.status(200).json(formattedItems);

  } catch (error) {
    console.error("❌ Error fetching menu:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu items"
    });
  }
});

// 🟢 ADD MENU ITEM
app.post("/menu", upload.single("image"), async (req, res) => {
  try {
    const newItem = await Menu.create({
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,
      subCategory: req.body.subCategory,
      rating: req.body.rating,
      orders: req.body.orders || 0,
      image: req.file ? req.file.filename : ""
    });

    res.status(201).json({
      success: true,
      message: "Item added successfully",
      data: newItem
    });

  } catch (err) {
    console.error("❌ Error adding item:", err.message);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to add item"
    });
  }
});

// 🟢 DELETE MENU ITEM
app.delete("/menu/:id", async (req, res) => {
  try {
    const deleted = await Menu.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Item deleted successfully"
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to delete item"
    });
  }
});

// ================= START SERVER =================
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at ${BASE_URL}`);
  });
});
