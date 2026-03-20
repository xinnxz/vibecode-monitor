import { addLog } from './activity-log.js';

export function getWebhookConfig() {
  return {
    discordUrl: localStorage.getItem('webhook_discord_url') || '',
    telegramToken: localStorage.getItem('webhook_telegram_token') || '',
    telegramChatId: localStorage.getItem('webhook_telegram_chatid') || ''
  };
}

export function saveWebhookConfig(config) {
  localStorage.setItem('webhook_discord_url', config.discordUrl);
  localStorage.setItem('webhook_telegram_token', config.telegramToken);
  localStorage.setItem('webhook_telegram_chatid', config.telegramChatId);
}

export async function sendWebhookNotification(accountName) {
  const config = getWebhookConfig();
  const message = `⚠️ Vibe Code Monitor: Account quota limited or refresh timer expired for \`${accountName}\``;

  let success = false;

  // Discord Webhook
  if (config.discordUrl) {
    try {
      await fetch(config.discordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          username: 'VibeCode Monitor',
          avatar_url: 'https://raw.githubusercontent.com/xinnxz/vibecode-monitor/main/public/favicon.svg'
        })
      });
      success = true;
    } catch (err) {
      console.error('Discord webhook failed:', err);
    }
  }

  // Telegram Webhook
  if (config.telegramToken && config.telegramChatId) {
    try {
      const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegramChatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      success = true;
    } catch (err) {
      console.error('Telegram webhook failed:', err);
    }
  }

  if (success) {
    addLog('SYSTEM', `Webhook sent for: ${accountName}`);
  }
}
