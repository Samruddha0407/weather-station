
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please configure MONGODB_URI in your .env file.");
}

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

// -------------------- WEATHER MODEL --------------------

const weatherSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    temperature: {
      type: Number,
      required: true
    },
    humidity: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      required: true
    },
    windSpeed: {
      type: Number,
      default: 0
    },
    weatherCode: Number,
    feelsLike: Number,
    precipitation: Number,
    pressure: Number,
    source: {
      type: String,
      default: "Open-Meteo"
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

const Weather = mongoose.model("Weather", weatherSchema);

// -------------------- KNOWLEDGE MODEL --------------------

const knowledgeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000
    },
    tags: [{
      type: String,
      trim: true
    }],
    sourceUrl: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

const Knowledge = mongoose.model("Knowledge", knowledgeSchema);

// Escape search text before using it in a regular expression.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// -------------------- HOME PAGE --------------------

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -------------------- HEALTH CHECK --------------------

app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? "healthy" : "database disconnected",
    database: mongoose.connection.name || null,
    timestamp: new Date().toISOString()
  });
});

// -------------------- SAVE WEATHER REPORT --------------------

app.post("/weather/update", async (req, res) => {
  try {
    const {
      city,
      temperature,
      humidity,
      status,
      windSpeed,
      weatherCode,
      feelsLike,
      precipitation,
      pressure
    } = req.body;

    if (
      typeof city !== "string" ||
      !city.trim() ||
      typeof temperature !== "number" ||
      !Number.isFinite(temperature) ||
      typeof humidity !== "number" ||
      !Number.isFinite(humidity) ||
      humidity < 0 ||
      humidity > 100 ||
      typeof status !== "string" ||
      !status.trim()
    ) {
      return res.status(400).json({
        message: "Invalid weather data."
      });
    }

    const report = await Weather.create({
      city: city.trim(),
      temperature,
      humidity,
      status: status.trim(),
      windSpeed: Number.isFinite(windSpeed) ? windSpeed : 0,
      weatherCode,
      feelsLike,
      precipitation,
      pressure
    });

    res.status(201).json({
      message: "Weather report saved successfully.",
      data: report
    });
  } catch (error) {
    console.error("Weather save error:", error.message);

    res.status(500).json({
      message: "Could not save weather report."
    });
  }
});

// -------------------- GET LATEST WEATHER --------------------

app.get("/weather/now", async (req, res) => {
  try {
    const report = await Weather.findOne()
      .sort({ timestamp: -1, _id: -1 });

    if (!report) {
      return res.status(404).json({
        message: "No weather reports are saved yet."
      });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({
      message: "Could not retrieve the latest report."
    });
  }
});

// -------------------- WEATHER HISTORY --------------------

app.get("/weather/history", async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      200
    );

    const filter = {};

    if (typeof req.query.city === "string" && req.query.city.trim()) {
      filter.city = {
        $regex: escapeRegex(req.query.city.trim()),
        $options: "i"
      };
    }

    if (req.query.from || req.query.to) {
      filter.timestamp = {};

      if (req.query.from && !Number.isNaN(Date.parse(req.query.from))) {
        filter.timestamp.$gte = new Date(req.query.from);
      }

      if (req.query.to && !Number.isNaN(Date.parse(req.query.to))) {
        filter.timestamp.$lte = new Date(req.query.to);
      }
    }

    const reports = await Weather.find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit);

    res.json(reports);
  } catch (error) {
    res.status(500).json({
      message: "Could not retrieve weather history."
    });
  }
});

// -------------------- WEATHER KNOWLEDGE SEARCH --------------------

app.get("/knowledge", async (req, res) => {
  try {
    const filter = {};

    if (typeof req.query.category === "string" && req.query.category.trim()) {
      filter.category = {
        $regex: escapeRegex(req.query.category.trim()),
        $options: "i"
      };
    }

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const search = escapeRegex(req.query.q.trim().slice(0, 100));

      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } }
      ];
    }

    const articles = await Knowledge.find(filter)
      .sort({ updatedAt: -1 })
      .limit(100);

    res.json(articles);
  } catch (error) {
    res.status(500).json({
      message: "Could not retrieve knowledge articles."
    });
  }
});

// -------------------- ADD KNOWLEDGE ARTICLE --------------------

app.post("/knowledge", async (req, res) => {
  try {
    const {
      title,
      category,
      content,
      tags = [],
      sourceUrl = ""
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof content !== "string" ||
      !content.trim() ||
      !Array.isArray(tags) ||
      tags.length > 20 ||
      tags.some(tag => typeof tag !== "string") ||
      typeof sourceUrl !== "string" ||
      (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl))
    ) {
      return res.status(400).json({
        message: "Enter a valid title, category, content, tags and source URL."
      });
    }

    const article = await Knowledge.create({
      title: title.trim(),
      category: category.trim(),
      content: content.trim(),
      tags: tags.map(tag => tag.trim()).filter(Boolean),
      sourceUrl
    });

    res.status(201).json({
      message: "Knowledge article added successfully.",
      data: article
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not save the knowledge article."
    });
  }
});

// -------------------- START SERVER --------------------

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("Connected to MongoDB Atlas.");
    console.log("Database:", mongoose.connection.name);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Weather Station running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
