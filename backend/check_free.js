import https from "https";

https.get("https://openrouter.ai/api/v1/models", (res) => {
    let data = "";
    res.on("data", (chunk) => {
        data += chunk;
    });
    res.on("end", () => {
        try {
            const json = JSON.parse(data);
            const freeModels = json.data
                .filter(m => m.id.includes(':free'))
                .map(m => ({ id: m.id, name: m.name }));
            console.log("Current Free Models:", JSON.stringify(freeModels, null, 2));
        } catch (error) {
            console.error("JSON Parse Error:", error);
        }
    });
}).on("error", (error) => {
    console.error("Request Error:", error);
});
