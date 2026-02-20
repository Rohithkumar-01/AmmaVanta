require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const app = express();
const PORT = process.env.PORT || 3000;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

const MenuSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  subCategory: String,
  rating: String,
  orders: { type: Number, default: 0 },
  image: String
}, { timestamps: true });

const Menu = mongoose.model("Menu", MenuSchema);

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.json({ status: "Backend Running" });
});

app.get("/menu", async (req, res) => {
  const items = await Menu.find().sort({ createdAt: -1 });
  res.json(items);
});

app.post("/menu", upload.single("image"), async (req, res) => {
  try {
    let imageUrl = "";

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "ammavanta" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      imageUrl = result.secure_url;
    }

    const newItem = await Menu.create({
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,
      subCategory: req.body.subCategory,
      rating: req.body.rating,
      orders: req.body.orders || 0,
      image: imageUrl
    });

    res.json(newItem);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
