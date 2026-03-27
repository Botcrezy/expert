const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(JSON.stringify({
        success: false,
        error: 'TELEGRAM_BOT_TOKEN not configured',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, webhook_url, commands } = await req.json();
    
    console.log(`Telegram Setup - Action: ${action}`);

    // Set webhook URL
    if (action === 'setWebhook') {
      if (!webhook_url) {
        return new Response(JSON.stringify({
          success: false,
          error: 'webhook_url is required',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhook_url,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: false,
          max_connections: 100,
        }),
      });
      
      const result = await response.json();
      console.log('setWebhook result:', JSON.stringify(result));
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get webhook info
    if (action === 'getWebhookInfo') {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
      const response = await fetch(url);
      const result = await response.json();
      
      console.log('getWebhookInfo result:', JSON.stringify(result));
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Delete webhook
    if (action === 'deleteWebhook') {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`;
      const response = await fetch(url, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drop_pending_updates: false }),
      });
      const result = await response.json();
      
      console.log('deleteWebhook result:', JSON.stringify(result));
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get bot info
    if (action === 'getMe') {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
      const response = await fetch(url);
      const result = await response.json();
      
      console.log('getMe result:', JSON.stringify(result));
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set bot commands
    if (action === 'setMyCommands') {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`;
      
      const defaultCommands = [
        { command: 'start', description: 'بدء المحادثة' },
        { command: 'link', description: 'ربط حسابك بالمنصة' },
        { command: 'unlink', description: 'فصل ربط حسابك' },
        { command: 'status', description: 'عرض حالة الربط' },
        { command: 'help', description: 'المساعدة والأوامر المتاحة' },
      ];
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: commands || defaultCommands,
        }),
      });
      
      const result = await response.json();
      console.log('setMyCommands result:', JSON.stringify(result));
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get bot commands
    if (action === 'getMyCommands') {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMyCommands`;
      const response = await fetch(url);
      const result = await response.json();
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get updates (for debugging)
    if (action === 'getUpdates') {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
      const response = await fetch(url);
      const result = await response.json();
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send test message
    if (action === 'sendMessage') {
      const { chat_id, text, parse_mode = 'HTML' } = await req.json();
      
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, parse_mode }),
      });
      
      const result = await response.json();
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Invalid action. Supported: setWebhook, getWebhookInfo, deleteWebhook, getMe, setMyCommands, getMyCommands, getUpdates, sendMessage',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    console.error('Setup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});