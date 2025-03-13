require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 단어 분석 API (뜻, 음소, 음절, 발음 가이드 - 한글 발음 포함)
app.post("/api/word-analysis", async (req, res) => {
  const { word } = req.body;
  if (!word || !word.trim()) {
    return res.status(400).json({ error: "단어가 제공되지 않았습니다." });
  }

  // 프롬프트를 구체적으로 작성하여 OpenAI에 요청합니다.
  const prompt = `
단어 '${word}'를 6세 아이도 쉽게 이해할 수 있도록 분석해줘.
반드시 아래 형식대로 출력해줘:

뜻: <단어의 간단하고 명확한 의미>
음소: <단어의 IPA 표기>
음절: <단어를 음절 단위로 나누고, 어느 음절에 강세가 있는지 포함>
발음 가이드:
1. <첫 번째 음절의 영어 발음 및 한글 설명>
2. <두 번째 음절의 영어 발음 및 한글 설명>
3. <세 번째 음절의 영어 발음 및 한글 설명>
  `;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 250,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const content = response.data.choices[0]?.message?.content || "";

    // 정규식을 사용해 각 항목을 추출합니다.
    const meaningMatch = content.match(/뜻:\s*(.+)/);
    const phonicsMatch = content.match(/음소:\s*(.+)/);
    const syllablesMatch = content.match(/음절:\s*(.+)/);
    const pronunciationMatches = content.match(/발음 가이드:\s*([\s\S]*)/);

    res.json({
      meaning: meaningMatch ? meaningMatch[1].trim() : "❌ 뜻 정보 없음",
      phonics: phonicsMatch ? phonicsMatch[1].trim() : "❌ 음소 정보 없음",
      syllables: syllablesMatch ? syllablesMatch[1].trim() : "❌ 음절 정보 없음",
      pronunciationGuide: pronunciationMatches
        ? pronunciationMatches[1]
            .split("\n")
            .map(line => line.trim())
            .filter(line => line)
        : [],
    });
  } catch (error) {
    console.error("❌ 단어 분석 오류:", error.message);
    res.status(500).json({ error: "단어 분석 요청 실패" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ 백엔드 서버 실행 중 (포트: ${PORT})`);
});
