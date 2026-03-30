import OpenAI from "openai";

let openai = null;

if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENAI_API_KEY,
        defaultHeaders: {
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "ChatApp",
        }
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

<example>
user: "Create an express application"
response: {
    "text": "I have created the Express server codebase for you. Click 'Run Output' to start the application.",
    "fileTree": {
        "app.js": {
            "file": {
                "contents": "const express = require('express');\\n\\nconst app = express();\\n\\napp.get('/', (req, res) => {\\n    res.send('Hello World!');\\n});\\n\\napp.listen(3000, () => {\\n    console.log('Server is running on port 3000');\\n});"
            }
        },
        "package.json": {
            "file": {
                "contents": "{\\n  \\"name\\": \\"temp-server\\",\\n  \\"version\\": \\"1.0.0\\",\\n  \\"main\\": \\"app.js\\",\\n  \\"scripts\\": {\\n    \\"start\\": \\"node app.js\\"\\n  },\\n  \\"dependencies\\": {\\n    \\"express\\": \\"^4.21.2\\"\\n  }\\n}"
            }
        }
    },
    "buildCommand": {
        "mainItem": "npm",
        "commands": [ "install" ]
    },
    "startCommand": {
        "mainItem": "npm",
        "commands": [ "start" ]
    }
}
</example>

<example>
user: "Hello! How do you work?"
response: {
    "text": "Hello! I am your AI programming assistant. Ask me to build web applications, design UI components, or solve MERN stack bugs, and I will generate the code directly into your workspace editor!"
}
</example>
`;

export const generateResult = async (prompt, fileTree = {}, currentFile = null) => {
    console.log("AI prompt received:", prompt);
    
    if (!openai) {
        return JSON.stringify({
            text: "AI is not configured. Please set OPENAI_API_KEY in backend .env to use the @ai feature.",
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
        const response = await openai.chat.completions.create({
            model: "stepfun/step-3.5-flash:free", 
            messages: [
                { role: "system", content: systemInstruction },
                { role: "system", content: "CRITICAL: You are aware of the project structure and the active file content provided below. Use it to answer the user's questions or suggest improvements." },
                { role: "user", content: `Context:\n${contextMessage}\n\nTask: ${prompt}` }
            ],
            temperature: 0.4
        });
        
        return response.choices[0].message.content;
    } catch (error) {
        console.error("AI generation error:", error);
        
        const errorMsg = error.message || "";
        
        // Handle credit/balance/rate issues specifically
        if (error.status === 429 || errorMsg.includes("credit") || errorMsg.includes("insufficient") || errorMsg.includes("balance")) {
            return JSON.stringify({
                text: "AI error: Your OpenRouter account may have insufficient credits or hit a rate limit. Some 'free' models require a small balance to work. Please check your OpenRouter dashboard or try another truly free model.",
                fileTree: {},
            });
        }

        return JSON.stringify({
            text: "AI error: " + (error.message || "Something went wrong while generating the response."),
            fileTree: {},
        });
    }
}