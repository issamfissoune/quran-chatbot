import express from "express";
import { ChatOpenAI } from "@langchain/openai";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch"; // Ensure this is installed

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

const model = new ChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: process.env.INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.ENGINE_NAME,
});

// Function to fetch Tafsir for the first verse of a chapter
async function getTafsir(chapterNumber) {
    try {
        const tafsirResponse = await fetch(`https://api.quran.com/api/v4/verses/by_key/${chapterNumber}:1`);
        const tafsirData = await tafsirResponse.json();

        if (!tafsirData.verse || !tafsirData.verse.tafsirs || tafsirData.verse.tafsirs.length === 0) {
            return "Tafsir not available for this chapter.";
        }

        return tafsirData.verse.tafsirs[0].text; // Use the first Tafsir available
    } catch (error) {
        console.error("Error fetching Tafsir:", error);
        return "Error retrieving Tafsir.";
    }
}

// Function to fetch translations for all verses in a chapter
async function getTranslation(chapterNumber) {
    try {
        const translationResponse = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${chapterNumber}`);
        const translationData = await translationResponse.json();

        if (!translationData.verses || translationData.verses.length === 0) {
            return "Translation not available for this chapter.";
        }

        return translationData.verses.map(verse => verse.translations[0].text).join(" "); // Join translations of all verses
    } catch (error) {
        console.error("Error fetching Translation:", error);
        return "Error retrieving translation.";
    }
}

// Handle /ask POST requests
app.post("/ask", async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Query is required" });
    }

    const match = prompt.match(/\d+/); // Extract chapter number from input
    const chapterNumber = match ? match[0] : null;

    if (!chapterNumber) {
        return res.status(400).json({ error: "Please include a chapter number in your question." });
    }

    const tafsir = await getTafsir(chapterNumber);
    const translation = await getTranslation(chapterNumber);

    let engineeredPrompt = `Provide a detailed explanation of Chapter ${chapterNumber} of the Quran.
Here is the translation of the chapter: 
${translation}

Here is the Tafsir (interpretation) of the chapter: 
${tafsir}

Explain the meaning in a clear and concise manner, as an Islamic scholar would, without prefacing with disclaimers.`;


    try {
        const response = await model.invoke(engineeredPrompt);
        res.json({ chapter: `Chapter ${chapterNumber}`, tafsir: response.content });
    } catch (error) {
        console.error("Error getting response", error.message);
        res.status(500).json({ error: "Something went wrong", details: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
