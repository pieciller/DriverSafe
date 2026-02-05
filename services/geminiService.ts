
import { GoogleGenAI } from "@google/genai";
import { DrivingRiskData, RISK_LABELS } from "../types";

export const generateSafetyReport = async (data: DrivingRiskData): Promise<string> => {
  // Use a fresh instance for each call to ensure proper API key management
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const riskSummary = Object.entries(data.risks)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => `${RISK_LABELS[key]}: ${value}회`)
    .join(", ");

  const prompt = `
    차량번호 ${data.vehicleNumber}의 운전 데이터를 분석하여 전문적인 '안전운전 및 경제운전 교정 리포트'를 작성하세요.
    
    데이터 요약:
    - 총 주행거리: ${data.totalDistance}km
    - 검출된 위험 행동: ${riskSummary || "없음 (매우 안전함)"}

    리포트 구성 가이드:
    1. 운전자의 전반적인 운전 스타일 평가 (칭찬과 조언 포함)
    2. 가장 두드러진 위험 요소의 위험성(사고 확률 등) 분석
    3. 구체적인 교정 방법 (예: 급가속 방지를 위한 페달링 기법 등)
    4. 경제성 분석 결과(유류비 절감)에 대한 코멘트
    5. 마지막 한마디: 운전자를 격려하는 따뜻한 메시지

    작성 규칙:
    - 텍스트 강조를 위한 특수 기호(별표, 대시, 백틱 등)는 절대 사용하지 마세요.
    - 읽기 편하게 문단 사이에 줄바꿈을 충분히 사용하세요.
    - 마지막 줄에는 반드시 "분석 기관: 한국교통안전공단 AI 청년자문단 손유준"을 명시하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.9,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    // Remove any markdown formatting that the model might have still included
    return text.replace(/\*\*/g, '').replace(/###/g, '').replace(/--/g, '').trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Return a structured error message instead of throwing
    return "현재 AI 분석 서버가 일시적으로 응답하지 않습니다. 데이터를 확인하여 직접적인 분석 결과를 참고해 주시기 바랍니다.\n\n분석 기관: 한국교통안전공단 AI 청년자문단 손유준";
  }
};
