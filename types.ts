
export interface DrivingRiskData {
  vehicleNumber: string;
  totalDistance: number; // km
  fuelUsed: number; // liters (optional input, or estimated)
  risks: {
    overspeeding: number;      // 과속
    longOverspeeding: number;  // 장기과속
    suddenAccel: number;      // 급가속
    suddenStart: number;      // 급출발
    suddenDecel: number;      // 급감속
    suddenStop: number;       // 급정지
    suddenLeft: number;       // 급좌회전
    suddenRight: number;      // 급우회전
    suddenUturn: number;      // 급U턴
    suddenOvertaking: number;  // 급앞지르기
    suddenLaneChange: number; // 급진로변경
  };
}

export interface AnalysisResult {
  safetyScore: number;
  fuelSavingPotential: number; // KRW
  carbonReductionPotential: number; // kg
  aiReport: string;
}

export const RISK_LABELS: Record<string, string> = {
  overspeeding: "과속",
  longOverspeeding: "장기과속",
  suddenAccel: "급가속",
  suddenStart: "급출발",
  suddenDecel: "급감속",
  suddenStop: "급정지",
  suddenLeft: "급좌회전",
  suddenRight: "급우회전",
  suddenUturn: "급U턴",
  suddenOvertaking: "급앞지르기",
  suddenLaneChange: "급진로변경"
};
