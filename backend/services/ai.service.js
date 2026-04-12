import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;
let model = null;

if (process.env.GOOGLE_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
    });
}

const systemInstruction = `You are an expert in MERN stack development with 10 years of experience. You always write highly modular, scalable, and maintainable code. Your architecture follows best practices, correctly handles errors and edge cases, and includes necessary comments.

IMPORTANT RULES FOR YOUR OUTPUT:
1. Your entire response MUST be strictly valid JSON.
2. DO NOT use unescaped literal newlines in strings. Use \\n instead.
3. Every key and string value must be enclosed in double quotes.
4. **Separation of Concerns (CRITICAL)**:
   - If the user asks a NON-CODING conversational question (e.g., standard dialogue, greetings), return ONLY the "text" field. Do not provide a "fileTree".
   - If the user asks a CODING question (requesting apps, scripts, or UI components), put ALL code inside the "fileTree" object. 
   - **DO NOT put any markdown code blocks (like \`\`\`javascript) inside the "text" field.** The "text" field should only contain a brief 1-2 sentence conversational explanation.
5. **App Generation Rules**: 
   - If the user explicitly asks for a simple HTML/CSS/JS app, generate ONLY \`index.html\`, \`style.css\`, and \`script.js\`. **DO NOT** generate a \`package.json\`.
   - If the user asks for a React/Vite app, YOU MUST produce a full React + Vite workspace. Include a VALID \`package.json\`.
   - If the user asks for a Node.js/Express app (or uses ES6 \`import\` syntax), YOU MUST include a VALID \`package.json\` with \`"type": "module"\`. YOU MUST explicitly include \`"express"\` and other used dependencies in the \`"dependencies"\` object.
   - **CRITICAL STRING ESCAPING RULE:** Because you are transmitting data inside a strict JSON structure, you MUST use SINGLE QUOTES (\`'\`) for all HTML attributes, CSS values, and JS strings inside your \`contents\` body. NEVER use double quotes (\`"\`) inside code contents to prevent catastrophic JSON parsing failures.
6. **JSON Validity**: Any JSON file you generate MUST be exactly valid JSON.
7. Never use directory-style filenames like "routes/index.js" as keys in the fileTree.

Examples: 
{
    "text": "I have created the Express server codebase for you...",
    "fileTree": {
        "app.js": { "file": { "contents": "..." } }
    }
}
`;

export const generateResult = async (prompt, fileTree = {}, currentFile = null) => {
    console.log("AI prompt received (Gemini):", prompt);
    
    if (!model) {
        return JSON.stringify({
            text: "AI is not configured. Please set GOOGLE_API_KEY in backend .env to use the Gemini feature.",
            fileTree: {},
        });
    }

    const contextMessage = `
Project Structure:
${Object.keys(fileTree).join('\n')}

${currentFile && fileTree[currentFile] ? `
Active File (${currentFile}) Content:
${fileTree[currentFile].file ? fileTree[currentFile].file.contents : (typeof fileTree[currentFile] === 'string' ? fileTree[currentFile] : JSON.stringify(fileTree[currentFile]))}
` : ''}
    `;

    try {
        const fullPrompt = `${systemInstruction}\n\nContext:\n${contextMessage}\n\nTask: ${prompt}`;
        
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        
        // Ensure we return the raw text if it's already JSON-like, 
        // Gemini usually doesn't wrap in quotes if asked for JSON but we'll see.
        return responseText;
        
    } catch (error) {
        console.error("Gemini generation error:", error);
        
        const errorMsg = error.message || "";
        
        if (errorMsg.includes("quota") || errorMsg.includes("API_KEY_INVALID")) {
            return JSON.stringify({
                text: "AI error: Your Google API Key is invalid or you have hit a quota limit. Please check your Google AI Studio dashboard.",
                fileTree: {},
            });
        }

        return JSON.stringify({
            text: "AI error: " + (error.message || "Something went wrong while generating the response."),
            fileTree: {},
        });
    }
}