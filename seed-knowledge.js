
require("dotenv").config();
const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
  title: String,
  category: String,
  content: String,
  tags: [String],
  sourceUrl: String
}, { timestamps: true });

const Knowledge = mongoose.model("Knowledge", articleSchema);

const articles = [
  {
    title: "Understanding Temperature",
    category: "Weather Basics",
    content: "Air temperature measures how warm or cold the air is. It is commonly reported in degrees Celsius. Temperature can vary with time of day, season, cloud cover, altitude and location.",
    tags: ["temperature", "celsius", "weather basics"],
    sourceUrl: "https://www.weather.gov/"
  },
  {
    title: "What Is Humidity?",
    category: "Weather Basics",
    content: "Relative humidity is the percentage of water vapour in the air compared with the amount the air can hold at the same temperature. High humidity can make warm conditions feel more uncomfortable.",
    tags: ["humidity", "water vapour", "moisture"],
    sourceUrl: "https://www.weather.gov/"
  },
  {
    title: "Understanding Rainfall",
    category: "Rain and Precipitation",
    content: "Rain occurs when water droplets in clouds grow large enough to fall to the ground. Rainfall measurements help describe precipitation amounts and support water management and flood monitoring.",
    tags: ["rain", "rainfall", "precipitation"],
    sourceUrl: "https://www.noaa.gov/"
  },
  {
    title: "Indian Monsoon",
    category: "Indian Weather",
    content: "The Indian summer monsoon brings seasonal rainfall to much of India. Its timing and intensity vary by region and year. Official forecasts and alerts should be consulted when planning around heavy rain.",
    tags: ["India", "monsoon", "seasonal rainfall"],
    sourceUrl: "https://mausam.imd.gov.in/"
  },
  {
    title: "Wind Speed and Weather",
    category: "Weather Basics",
    content: "Wind speed describes how quickly air moves. Strong winds can affect travel, trees, buildings and outdoor activities. Follow official warnings during severe weather.",
    tags: ["wind", "wind speed", "safety"],
    sourceUrl: "https://www.weather.gov/"
  },
  {
    title: "Thunderstorm Safety",
    category: "Weather Safety",
    content: "During a thunderstorm, move inside a substantial building or an enclosed vehicle. Avoid open areas, isolated trees and water. Wait until the storm has passed before returning outdoors.",
    tags: ["thunderstorm", "lightning", "safety"],
    sourceUrl: "https://www.weather.gov/safety/lightning"
  },
  {
    title: "Weather Forecasts and Uncertainty",
    category: "Forecasting",
    content: "Weather forecasts use observations and numerical models to estimate future conditions. Forecast accuracy varies with the forecast period and weather situation. Check updated official forecasts for important decisions.",
    tags: ["forecast", "weather models", "prediction"],
    sourceUrl: "https://www.noaa.gov/"
  },
  {
    title: "Flood Awareness",
    category: "Weather Safety",
    content: "Heavy or prolonged rainfall can cause flooding. Never walk or drive through floodwater because its depth and current may be difficult to judge. Follow local emergency instructions and official warnings.",
    tags: ["flood", "heavy rain", "safety"],
    sourceUrl: "https://ndma.gov.in/"
  }
];

async function seedKnowledge() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    // Insert only articles whose titles are not already present.
    let inserted = 0;

    for (const article of articles) {
      const exists = await Knowledge.exists({ title: article.title });

      if (!exists) {
        await Knowledge.create(article);
        inserted++;
      }
    }

    console.log(`Knowledge seeding complete. Added ${inserted} new articles.`);
  } catch (error) {
    console.error("Knowledge seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedKnowledge();
