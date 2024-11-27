const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// LINE Channel Access Token และ OpenAI API Key
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Middleware to parse JSON
app.use(bodyParser.json());

// ฟังก์ชันส่งข้อความกลับไปยัง LINE
const sendMessageToLine = async (replyToken, message) => {
  try {
    const response = await axios.post(
      'https://api.line.me/v2/bot/message/reply',
      {
        replyToken,
        messages: [{ type: 'text', text: message }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    );
    console.log('Message sent to LINE:', response.data);
  } catch (error) {
    console.error('Error sending message to LINE:', error);
  }
};

// ฟังก์ชันเรียกใช้ OpenAI API (ChatGPT)
const getChatGptResponse = async (userMessage) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: 150
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return 'Sorry, I am having trouble understanding your request.';
  }
};

// Webhook endpoint ที่รับข้อความจาก LINE
app.post('/callback', async (req, res) => {
  const events = req.body.events;

  // วนลูปแต่ละ event ที่ส่งมาจาก LINE
  for (let event of events) {
    const replyToken = event.replyToken;
    const userMessage = event.message.text;

    // เรียกใช้ OpenAI API เพื่อตอบกลับข้อความ
    const chatGptResponse = await getChatGptResponse(userMessage);

    // ส่งข้อความกลับไปยัง LINE
    await sendMessageToLine(replyToken, chatGptResponse);
  }

  // ส่ง response กลับไปยัง LINE ว่า webhook ทำงานสำเร็จ
  res.status(200).send('OK');
});

// เริ่มต้นเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
