import { GoogleGenerativeAI } from "@google/generative-ai";

async function testKey() {
    const apiKey = "AIzaSyDOA7J3nGhbTmhxEdrXZtErLMNJTwg8o98";
    try {
        const params = new URLSearchParams({ key: apiKey });
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?${params.toString()}`);
        if (response.ok) {
            const data = await response.json();
            console.log("Success! Models:", data.models.map((m: any) => m.name));
        } else {
            console.error("Failed to fetch. Status:", response.status);
        }
    } catch (e) {
        console.error("Key failed!", e);
    }
}

testKey();
