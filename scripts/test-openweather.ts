import { getAgentToolsFromConfig, executeOpenAIToolCall } from '../src/lib/composio/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testOpenWeather() {
  const testUserId = 'test-user-123';
  console.log('=== TESTING OPENWEATHER INTEGRATION ===');

  // 1. Verify tool discovery
  console.log("\n[1/2] Discovering tools for toolkit: 'openweather'...");
  const tools = await getAgentToolsFromConfig(
    JSON.stringify({ toolkits: ['openweather'] }),
    testUserId
  );

  if (tools.length === 0) {
    console.error(
      '❌ No OpenWeather tools found! Check your COMPOSIO_API_KEY and toolkit registration.'
    );
    return;
  }

  console.log(`✅ Found ${tools.length} curated OpenWeather tools:`);
  tools.forEach(t => console.log(`   - ${t.slug}`));

  // 2. Verify execution
  const executionTool = 'openweather_get_current_weather_data';
  console.log(`\n[2/2] Executing tool: '${executionTool}' for 'London'...`);

  try {
    const result = await executeOpenAIToolCall(testUserId, {
      name: executionTool,
      arguments: { q: 'London' },
    });

    const parsed = JSON.parse(result);
    if (parsed.error) {
      console.error('❌ Execution failed:', parsed.error);
      if (parsed.details) console.error('   Details:', JSON.stringify(parsed.details, null, 2));
    } else {
      console.log('✅ Execution successful!');
      console.log('   Result Preview:', result.substring(0, 200) + '...');
    }
  } catch (e: any) {
    console.error('❌ Execution crashed:', e.message);
  }
}

testOpenWeather().catch(console.error);
