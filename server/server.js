import express from "express";
import { ChatOpenAI } from "@langchain/openai";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

const model = new ChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: process.env.INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.ENGINE_NAME,
    systemMessage: "You are a highly knowledgeable Islamic scholar. Always provide accurate, detailed, and contextually appropriate explanations of Quranic chapters using authentic sources."
});

// Fetch Tafsir for a chapter
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

// Fetch Translation for a chapter
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

// Fetch Chapter Information
async function getChapterInfo(chapterNumber) {
    try {
        const chapterInfoResponse = await fetch(`https://api.quran.com/api/v4/chapters/${chapterNumber}/info`);
        const chapterInfoData = await chapterInfoResponse.json();

        if (!chapterInfoData.chapter_info || !chapterInfoData.chapter_info.text) {
            return "Chapter information not available.";
        }

        return chapterInfoData.chapter_info.text; // Return the detailed chapter info
    } catch (error) {
        console.error("Error fetching Chapter Info:", error);
        return "Error retrieving chapter information.";
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
    const chapterInfo = await getChapterInfo(chapterNumber);

    let engineeredPrompt = `You are an expert Islamic scholar, well-versed in Quranic studies, Tafsir, and Hadith. 
Your task is to provide a detailed and scholarly explanation of Chapter ${chapterNumber} of the Quran. 
Do not include disclaimers. Respond as a knowledgeable scholar would.

**Chapter Information:**
${chapterInfo}

**Translation:**
${translation}

**Tafsir:**
${tafsir}

Based on the above, provide a clear and well-structured explanation that accurately reflects Islamic teachings.
`;

    try {
        const response = await model.invoke(engineeredPrompt);
        res.json({
            chapter: `Chapter ${chapterNumber}`,
            chapterInfo: chapterInfo,
            tafsir: response.content
        });
    } catch (error) {
        console.error("Error getting response", error.message);
        res.status(500).json({ error: "Something went wrong", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
