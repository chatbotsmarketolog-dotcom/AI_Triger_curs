/**
 * AIRA — AI-агент Кристины
 * Cloudflare Worker с памятью KV и AI @cf/meta/llama-3-8b-instruct
 */

// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
  // Telegram Bot Token (храните в Variables, не в коде!)
  TG_BOT_TOKEN: '', 
  
  // Chat ID для уведомлений админу
  ADMIN_CHAT_ID: '',
  
  // Префикс для ключей в KV
  KV_PREFIX: 'aira_session:',
  
  // Максимальная история сообщений в памяти
  MAX_HISTORY: 10,
  
  // TTL для сессий в секундах (3 дня = 259200)
  SESSION_TTL: 259200,
  
  // Системный промпт для AI
  SYSTEM_PROMPT: `Ты AIRA — AI-агент Кристины, техно-маркетолога и коуча по проработке страхов продаж.

🎯 ТВОЯ ЗАДАЧА:
Помогать коучам, психологам и наставникам автоматизировать продажи через Telegram.

👤 О КРИСТИНЕ:
- Fullstack-разработчик, архитектор автономных систем продаж
- Коуч по проработке страхов продаж
- Основательница Академии "Новые Горизонты Инфобизнеса"
- Сайт: https://chatbotsmarketolog-dotcom.github.io/
- Telegram: @marketologdizayner

💎 СИСТЕМА ПОД КЛЮЧ (250 000 ₽):
• Сайт на чистом коде (загрузка 0.3 сек, идеальное SEO)
• AI-агент AIRA 24/7 без лимитов диалогов
• CRM-панель в Telegram с авто-тегами и напоминаниями
• Интеграция с любыми платёжками и рассылками
• Настройка за 14 дней под ключ
• 🎁 Бонус: 5 сессий проработки страха продаж от Кристины как коуча

📚 БАЗА ЗНАНИЙ (используй для ответов):
- База знаний = диалоги + возражения + ответы + истории успеха
- "Раздевающий вопрос": "На шкале от 1 до 10, насколько [проблема] мешает вам [последствие]?"
- 3 ошибки лид-магнита: полезный мусор, слепая анкета, безликий автомат
- CRM в Telegram: пересылка диалогов, теги, напоминания

🗣 СТИЛЬ ОТВЕТОВ:
- Кратко, по делу, дружелюбно
- Используй эмодзи умеренно 😊
- Если не знаешь точного ответа — предложи оставить заявку
- Всегда давай логические кнопки-подсказки в конце

🚫 НЕ ДЕЛАЙ:
- Не выдумывай цены или условия, которых нет выше
- Не обещай того, что не входит в систему
- Не переходи на личности

Если пользователь хочет купить — направляй на заявку или к @marketologdizayner`,

  // Быстрые ответы (кнопки) для разных сценариев
  QUICK_REPLIES: {
    default: ['Сколько стоит?', 'О Кристине', 'Как работает?', 'Оставить заявку'],
    price: ['Что входит?', 'Как заказать?', 'Есть рассрочка?'],
    about: ['Сколько стоит?', 'Оставить заявку', 'Написать Кристине'],
    order: ['Сколько стоит?', 'Что входит?', 'Написать Кристине'],
  }
};

// ==================== БАЗА ЗНАНИЙ (локальный кэш) ====================
const KNOWLEDGE_BASE = [
  {
    keywords: ['кто ты', 'что ты', 'aira', 'ты кто', 'бот'],
    answer: 'Я AIRA — AI-агент Кристины, техно-маркетолога и коуча по проработке страхов продаж. Я обучена на реальных продажах коучей, психологов и наставников. Могу ответить на вопросы о «Системе под ключ», помочь с автоматизацией и провести мини-консультацию. Чем могу помочь? 😊',
    quick: ['Сколько стоит?', 'О Кристине', 'Как работает?']
  },
  {
    keywords: ['кристина', 'кто кристина', 'автор', 'создатель'],
    answer: 'Кристина — техно-маркетолог, Fullstack-разработчик и архитектор автономных систем продаж. Также коуч по проработке страхов продаж и основательница Академии «Новые Горизонты Инфобизнеса».\n\nОна не делает красивые сайты «под ключ» — она проектирует системы, которые приносят деньги без участия владельца.\n\n📱 Telegram: @marketologdizayner\n🌐 Сайт: https://chatbotsmarketolog-dotcom.github.io/',
    quick: ['Что такое Система под ключ?', 'Сколько стоит?', 'Оставить заявку']
  },
  {
    keywords: ['система под ключ', 'что предлагаете', 'что входит', 'услуги'],
    answer: '«Система под ключ» — полное решение для автоматизации продаж:\n\n✅ Сайт на чистом коде (загрузка 0.3 сек, идеальное SEO)\n✅ AI-агент AIRA 24/7 без лимитов диалогов\n✅ CRM-панель в Telegram с авто-тегами и напоминаниями\n✅ Интеграция с любыми платёжками и рассылками\n✅ Настройка за 14 дней под ключ\n🎁 Бонус: 5 сессий проработки страха продаж от Кристины',
    quick: ['Сколько стоит?', 'Как заказать?', 'Что входит?']
  },
  {
    keywords: ['сколько стоит', 'цена', 'стоимость', 'прайс', 'дорого'],
    answer: '«Система под ключ» стоит 250 000 ₽.\n\nВключает:\n• Сайт на чистом коде (0.3 сек загрузка)\n• AI-агент AIRA 24/7 без лимитов\n• CRM-панель в Telegram\n• Все интеграции с платёжками/рассылками\n• Настройку за 14 дней от Кристины\n\n🎁 В подарок: 5 сессий проработки страха продаж.\n💰 Окупаемость: 1–2 месяца.',
    quick: ['Что входит?', 'Как заказать?', 'Есть рассрочка?']
  },
  {
    keywords: ['заказать', 'купить', 'заявка', 'оформить', 'хочу'],
    answer: 'Отлично! 🎉 Для оформления заявки:\n\n1️⃣ Напишите Кристине напрямую: @marketologdizayner\n2️⃣ Или оставьте заявку на сайте: https://chatbotsmarketolog-dotcom.github.io/\n\nМы созвонимся на 15 минут — бесплатно. Обсудим вашу ситуацию и план запуска.\n\n⚠️ У Кристины всего 5 слотов в месяц!',
    quick: ['Сколько стоит?', 'Что входит?', 'Написать Кристине']
  },
  {
    keywords: ['как работает', 'принцип', 'технология', 'бот'],
    answer: 'AIRA работает по технологии AI + ваша база знаний:\n\n1️⃣ Вы собираете базу знаний (диалоги, возражения, ответы) — это Модуль 1 курса\n2️⃣ AIRA обучается на ваших реальных диалогах через @cf/meta/llama-3-8b-instruct\n3️⃣ Бот общается с клиентами как ВЫ — задаёт «Раздевающий вопрос», обрабатывает возражения\n4️⃣ Доводит клиента до покупки диагностики\n5️⃣ Все диалоги пересылаются в вашу CRM-панель в Telegram\n\nВсё без вашего участия! 24/7. 🤖✨',
    quick: ['Сколько стоит?', 'Оставить заявку', 'Что входит?']
  },
  {
    keywords: ['база знаний', 'диалоги', 'возражения', 'модуль'],
    answer: 'База знаний — это файл, куда вы собираете:\n• Реальные диалоги с клиентами из Telegram/WhatsApp\n• Возражения и ваши ответы, которые закрывали сделку\n• Частые вопросы про цену, формат, сроки\n• Истории успеха с цифрами (увеличил доход, снизил тревогу и т.д.)\n\nКогда вы передаёте этот файл, AI-агент обучается именно вашему стилю. Он перестаёт быть «роботом» и становится вашим цифровым двойником. 🎯',
    quick: ['Как собрать базу?', 'Сколько стоит система?', 'Оставить заявку']
  },
  {
    keywords: ['демо', 'тест', 'попробовать', 'бесплатно'],
    answer: 'Демо-доступ к AIRA — 3 дня, 10 диалогов в день.\n\nОн активируется автоматически после прохождения модулей 1–3 курса «Как заставить Telegram продавать за тебя».\n\nПосле 3 дней демо-бот уснёт. И вы выберете: вернуться к ручному режиму или купить «Систему под ключ» за 250 000 ₽.',
    quick: ['Сколько стоит?', 'Оставить заявку', 'Как работает?']
  },
  {
    keywords: ['страх', 'продажи', 'коуч', 'сессии', 'проработка'],
    answer: 'Вместе с «Системой под ключ» Кристина дарит 5 сессий по проработке страха продаж! 🎁\n\nКак коуч, она поможет:\n• Снять блоки и неуверенность в продажах\n• Найти уверенность продавать без страха и вины\n• Проработать внутренние барьеры «я не достойна/не могу»\n• Настроить мышление на результат и деньги\n\nЭто не просто техническое решение — это трансформация вашего отношения к продажам. 💪✨',
    quick: ['Сколько стоит?', 'Оставить заявку', 'О Кристине']
  },
  {
    keywords: ['привет', 'здравствуй', 'хай', 'добрый', 'hello'],
    answer: 'Привет! 😊 Я AIRA — AI-агент Кристины. Готова помочь с вопросами о «Системе под ключ», автоматизации продаж и курсе.\n\nЧто вас интересует?',
    quick: ['О Кристине', 'Сколько стоит?', 'Как работает?', 'Оставить заявку']
  },
  {
    keywords: ['спасибо', 'благодарю', 'спс'],
    answer: 'Всегда рада помочь! 😊 Если появятся ещё вопросы — я здесь. А если готовы к действиям — напишите Кристине @marketologdizayner, и она свяжется с вами лично!',
    quick: ['Оставить заявку', 'Сколько стоит?', 'Написать Кристине']
  }
];

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Поиск ответа в базе знаний по ключевым словам
 */
function findInKB(message) {
  const lower = message.toLowerCase().trim();
  
  for (const item of KNOWLEDGE_BASE) {
    for (const keyword of item.keywords) {
      if (lower.includes(keyword)) {
        return {
          text: item.answer,
          quick: item.quick || CONFIG.QUICK_REPLIES.default
        };
      }
    }
  }
  return null;
}

/**
 * Форматирование истории для AI
 */
function formatHistory(history) {
  return history.map(msg => 
    `${msg.role === 'user' ? 'Клиент' : 'AIRA'}: ${msg.content}`
  ).join('\n');
}

/**
 * Генерация клавиатуры для Telegram
 */
function createKeyboard(quickReplies) {
  if (!quickReplies || quickReplies.length === 0) return {};
  
  const keyboard = [];
  for (let i = 0; i < quickReplies.length; i += 2) {
    keyboard.push(quickReplies.slice(i, i + 2).map(text => ({ text })));
  }
  
  return {
    reply_markup: {
      one_time_keyboard: true,
      resize_keyboard: true,
      keyboard: keyboard
    }
  };
}

/**
 * Отправка сообщения в Telegram
 */
async function sendTelegramMessage(chatId, text, options = {}) {
  const url = `https://api.telegram.org/bot${CONFIG.TG_BOT_TOKEN}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    ...options,
    ...createKeyboard(options.quickReplies)
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  return await response.json();
}

// ==================== ОБРАБОТЧИК ЗАПРОСОВ ====================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === '/health') {
      return new Response('AIRA is running 🤖', { status: 200 });
    }
    
    // Telegram webhook handler
    if (url.pathname === '/webhook') {
      return handleWebhook(request, env);
    }
    
    // API endpoint for frontend
    if (url.pathname === '/api/chat') {
      return handleAPI(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

// ==================== TELEGRAM WEBHOOK ====================

async function handleWebhook(request, env) {
  try {
    const update = await request.json();
    
    // Ignore non-message updates
    if (!update.message || !update.message.text) {
      return new Response('OK', { status: 200 });
    }
    
    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;
    const userName = message.from.first_name || 'Пользователь';
    
    // Команда /start
    if (text === '/start') {
      await sendTelegramMessage(chatId, 
        `Привет, ${userName}! 👋\n\nЯ AIRA — AI-агент Кристины. Помогаю коучам, психологам и наставникам автоматизировать продажи через Telegram.\n\nЧто вас интересует?`,
        { quickReplies: CONFIG.QUICK_REPLIES.default }
      );
      return new Response('OK', { status: 200 });
    }
    
    // Получаем историю из KV
    const sessionKey = `${CONFIG.KV_PREFIX}${userId}`;
    let history = [];
    
    if (env.AIRA_KV) {
      const stored = await env.AIRA_KV.get(sessionKey);
      if (stored) {
        history = JSON.parse(stored);
      }
    }
    
    // Добавляем новое сообщение пользователя
    history.push({ role: 'user', content: text, timestamp: Date.now() });
    
    // Обрезаем историю до максимума
    if (history.length > CONFIG.MAX_HISTORY * 2) {
      history = history.slice(-CONFIG.MAX_HISTORY * 2);
    }
    
    // Пытаемся найти ответ в базе знаний
    const kbResponse = findInKB(text);
    
    let aiResponse, quickReplies;
    
    if (kbResponse) {
      // Используем ответ из базы знаний
      aiResponse = kbResponse.text;
      quickReplies = kbResponse.quick;
    } else if (env.AI) {
      // Используем Cloudflare AI
      try {
        const formattedHistory = formatHistory(history);
        
        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: CONFIG.SYSTEM_PROMPT },
            { role: 'user', content: `История диалога:\n${formattedHistory}\n\nПоследнее сообщение клиента: ${text}` }
          ],
          max_tokens: 500,
          temperature: 0.7
        });
        
        aiResponse = response.response?.trim() || 'Произошла ошибка. Попробуйте ещё раз.';
        quickReplies = CONFIG.QUICK_REPLIES.default;
        
      } catch (aiError) {
        console.error('AI Error:', aiError);
        aiResponse = 'Сейчас я на техническом обслуживании 🔧 Попробуйте написать Кристине напрямую: @marketologdizayner';
        quickReplies: ['Написать Кристине', 'Сколько стоит?', 'Оставить заявку']
      }
    } else {
      // Fallback без AI
      aiResponse = 'Спасибо за вопрос! 🙏 Для детальной консультации напишите Кристине: @marketologdizayner';
      quickReplies = ['Написать Кристине', 'Сколько стоит?', 'Оставить заявку'];
    }
    
    // Добавляем ответ бота в историю
    history.push({ role: 'assistant', content: aiResponse, timestamp: Date.now() });
    
    // Сохраняем историю в KV
    if (env.AIRA_KV) {
      await env.AIRA_KV.put(sessionKey, JSON.stringify(history), {
        expirationTtl: CONFIG.SESSION_TTL
      });
    }
    
    // Отправляем ответ пользователю
    await sendTelegramMessage(chatId, aiResponse, { quickReplies });
    
    // Уведомляем админа о новом диалоге (опционально)
    if (CONFIG.ADMIN_CHAT_ID && text.toLowerCase().includes('купить') || text.toLowerCase().includes('заказать')) {
      await sendTelegramMessage(CONFIG.ADMIN_CHAT_ID, 
        `🔔 *Горячий лид!*\n👤 ${userName} (ID: ${userId})\n💬 "${text}"\n🤖 Ответ: "${aiResponse}"`
      );
    }
    
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}

// ==================== API ENDPOINT (для фронтенда) ====================

async function handleAPI(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const { userId, message, sessionId } = await request.json();
    
    if (!userId || !message) {
      return new Response(JSON.stringify({ error: 'Missing userId or message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const sessionKey = `${CONFIG.KV_PREFIX}${sessionId || userId}`;
    let history = [];
    
    // Загружаем историю
    if (env.AIRA_KV) {
      const stored = await env.AIRA_KV.get(sessionKey);
      if (stored) history = JSON.parse(stored);
    }
    
    history.push({ role: 'user', content: message, timestamp: Date.now() });
    if (history.length > CONFIG.MAX_HISTORY * 2) {
      history = history.slice(-CONFIG.MAX_HISTORY * 2);
    }
    
    // Поиск в базе знаний или AI
    const kbResponse = findInKB(message);
    let response, quick;
    
    if (kbResponse) {
      response = kbResponse.text;
      quick = kbResponse.quick;
    } else if (env.AI) {
      const formattedHistory = formatHistory(history);
      const aiResult = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: CONFIG.SYSTEM_PROMPT },
          { role: 'user', content: `История:\n${formattedHistory}\n\nВопрос: ${message}` }
        ],
        max_tokens: 500
      });
      response = aiResult.response?.trim() || 'Произошла ошибка.';
      quick = CONFIG.QUICK_REPLIES.default;
    } else {
      response = 'Для консультации напишите Кристине: @marketologdizayner';
      quick = ['Написать Кристине'];
    }
    
    history.push({ role: 'assistant', content: response, timestamp: Date.now() });
    
    if (env.AIRA_KV) {
      await env.AIRA_KV.put(sessionKey, JSON.stringify(history), {
        expirationTtl: CONFIG.SESSION_TTL
      });
    }
    
    return new Response(JSON.stringify({
      response,
      quickReplies: quick,
      history: history.slice(-4) // Возвращаем последние 4 сообщения
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
