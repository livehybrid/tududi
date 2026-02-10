const { getConfig } = require('../config/config');
const config = getConfig();

async function chatCompletion(prompt, apiKey = null, userContext = null) {
    const keyToUse = apiKey || config.openRouter.apiKey;
    if (!keyToUse) {
        throw new Error('OpenRouter API key not configured');
    }

    // Build messages array with user context if provided
    const messages = [];

    if (userContext) {
        messages.push({
            role: 'system',
            content: `You are a helpful AI assistant. The user has provided the following context about their work and preferences: ${userContext}. Use this context to provide more relevant and personalized responses.`,
        });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch(
        `${config.openRouter.endpoint}/chat/completions`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${keyToUse}`,
            },
            body: JSON.stringify({
                model: config.openRouter.model,
                messages: messages,
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
        data.choices?.[0]?.message?.content?.trim() || 'No response from model'
    );
}

module.exports = { chatCompletion };
