const { getConfig } = require('../config/config');
const config = getConfig();

async function chatCompletion(prompt) {
    if (!config.openRouter.apiKey) {
        throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch(
        `${config.openRouter.endpoint}/chat/completions`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.openRouter.apiKey}`,
            },
            body: JSON.stringify({
                model: config.openRouter.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: config.openRouter.temperature,
            }),
        }
    );

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter request failed: ${text}`);
    }

    const data = await response.json();
    return (
        data.choices?.[0]?.message?.content?.trim() ||
        'No response from model'
    );
}

module.exports = { chatCompletion };
