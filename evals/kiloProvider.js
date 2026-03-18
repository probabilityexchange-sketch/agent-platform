module.exports = {
  id: 'kilo-gateway',
  async call(prompt, context) {
    const { vars } = context;

    const response = await fetch('https://api.kilo.ai/api/gateway/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KILO_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'kilo-auto/free',
        messages: [
          { role: 'system', content: vars.system_prompt },
          { role: 'user', content: vars.query },
        ],
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    return {
      output: data.choices[0].message.content,
      tokenUsage: data.usage,
    };
  },
};
