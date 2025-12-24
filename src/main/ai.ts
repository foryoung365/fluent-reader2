import { ipcMain } from "electron"
import OpenAI from "openai"
import { AIProvider, AISettings } from "../schema-types"

export function setAIListeners() {
    ipcMain.handle("generate-ai-summary", async (_, settings: AISettings, title: string, content: string, targetLanguage: string) => {
        try {
            const client = new OpenAI({
                apiKey: settings.apiKey,
                baseURL: settings.apiUrl || undefined,
            })

            const systemPrompt = `You are a helpful assistant that summarizes RSS articles. Use ${targetLanguage} for the summary.`
            const userPrompt = `Please provide a concise summary of the following article titled "${title}" in ${targetLanguage}.\n\nContent:\n${content}`

            const response = await client.chat.completions.create({
                model: settings.model || (settings.provider === AIProvider.Gemini ? "gemini-flash-latest" : "gpt-5-mini"),
                messages: [
                    { role: "user", content: `${systemPrompt}\n\n${userPrompt}` },
                ]
            })

            const result = response.choices[0]?.message?.content
            if (!result) {
                const finishReason = response.choices[0]?.finish_reason
                return `Failed to generate summary. (Reason: ${finishReason || "empty response"})`
            }
            return result
        } catch (error) {
            console.error("AI Summary Generation Error:", error)
            return `Error: ${error.message}${error.code ? ` (${error.code})` : ""}`
        }
    })

    ipcMain.handle("generate-ai-translation", async (_, settings: AISettings, targetLanguage: string, jsonContent: string) => {
        try {
            const client = new OpenAI({
                apiKey: settings.apiKey,
                baseURL: settings.apiUrl || undefined,
            })

            const systemPrompt = `You are a professional translator. Translate the values in the following JSON object into ${targetLanguage}. Keep the keys unchanged and return only the translated JSON object. Do not include any other text or markdown formatting in your response.`
            const userPrompt = `JSON to translate:\n${jsonContent}`

            const response = await client.chat.completions.create({
                model: settings.model || (settings.provider === AIProvider.Gemini ? "gemini-flash-latest" : "gpt-5-mini"),
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" }
            })

            const result = response.choices[0]?.message?.content
            return result || "{}"
        } catch (error) {
            console.error("AI Translation Error:", error)
            return JSON.stringify({ error: error.message })
        }
    })

    ipcMain.handle("test-ai-settings", async (_, settings: AISettings) => {
        try {
            const client = new OpenAI({
                apiKey: settings.apiKey,
                baseURL: settings.apiUrl || undefined,
            })

            await client.chat.completions.create({
                model: settings.model || (settings.provider === AIProvider.Gemini ? "gemini-pro" : "gpt-3.5-turbo"),
                messages: [
                    { role: "user", content: "Hello, this is a test connection." },
                ],
                max_tokens: 5,
            })

            return { success: true }
        } catch (error) {
            console.error("AI Test Connection Error:", error)
            return { success: false, message: error.message }
        }
    })
}
