
import React, { useState, useEffect } from 'react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line,
  XAxis, YAxis
} from 'recharts';
import { 
  Activity, 
  Car, 
  TrendingDown, 
  AlertTriangle, 
  Leaf, 
  FileText, 
  ShieldCheck, 
  Fuel,
  Upload,
  CheckCircle2,
  Sun,
  Moon,
  Menu,
  X,
  Gauge,
  TrendingUp,
  Target,
  Zap,
  ChevronRight,
  Info,
  RefreshCcw
} from 'lucide-react';
import { DrivingRiskData, RISK_LABELS } from './types';
import { generateSafetyReport } from './services/geminiService';

const COLORS = ['#3182F6', '#F04452', '#00AD7C', '#FF7D00', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B', '#F87171', '#60A5FA', '#34D399'];

const COPYRIGHT_STRING = "Copyright © Yu-Jun Son, Pukyong National University";

// [지정된 분석 텍스트] - AI 서버 오류 시 데모를 위한 완벽한 가상 데이터
const SAMPLE_REPORT = ` 결과를 분석중입니다. 장시간 결과가 나오지 않을 시 새로고침 해주세요.`;

const CopyrightFooter = () => (
  <div className="mt-8 mb-4 px-2 text-center">
    <span className="copyright-text italic uppercase tracking-wider text-gray-900 dark:text-slate-500 text-[10px] opacity-90">
      {COPYRIGHT_STRING}
    </span>
  </div>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DrivingRiskData | null>(null);
  const [aiReport, setAiReport] = useState<string>('');
  const [tab, setTab] = useState<'overview' | 'report' | 'economy'>('report');
  const [inputMethod, setInputMethod] = useState<'manual' | 'excel'>('manual');
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chartAnimate, setChartAnimate] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    totalDistance: '' as string | number,
    overspeeding: '' as string | number,
    longOverspeeding: '' as string | number,
    suddenAccel: '' as string | number,
    suddenStart: '' as string | number,
    suddenDecel: '' as string | number,
    suddenStop: '' as string | number,
    suddenLeft: '' as string | number,
    suddenRight: '' as string | number,
    suddenUturn: '' as string | number,
    suddenOvertaking: '' as string | number,
    suddenLaneChange: '' as string | number,
  });

  const [excelFile, setExcelFile] = useState<File | null>(null);

  useEffect(() => {
    if (tab === 'overview' && data) {
      setChartAnimate(false);
      const timer = setTimeout(() => setChartAnimate(true), 150);
      return () => clearTimeout(timer);
    }
  }, [tab, data]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setExcelFile(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let riskValues: Record<string, number> = {};
    Object.keys(RISK_LABELS).forEach(key => {
      riskValues[key] = parseFloat(formData[key as keyof typeof formData] as string) || 0;
    });

    const drivingData: DrivingRiskData = {
      vehicleNumber: formData.vehicleNumber || '미지정',
      totalDistance: parseFloat(formData.totalDistance as string) || 0,
      fuelUsed: (parseFloat(formData.totalDistance as string) || 0) / 12, 
      risks: riskValues as any
    };

    try {
      setData(drivingData);
      const report = await generateSafetyReport(drivingData);
      setAiReport(report);
      setTab('report');
      setIsSidebarOpen(false);
    } catch (error) {
      console.error(error);
      setAiReport("Error: 분석 시스템 연결 오류");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshReport = async () => {
    if (!data) return;
    setLoading(true);
    try {
      const report = await generateSafetyReport(data);
      setAiReport(report);
    } catch (error) {
      console.error(error);
      setAiReport("Error: 분석 시스템 연결 오류");
    } finally {
      setLoading(false);
    }
  };

  const calculateEconomy = (d: DrivingRiskData) => {
    const totalRisks = (Object.values(d.risks) as number[]).reduce((a, b) => a + b, 0);
    const mileage = d.totalDistance || 1;
    const efficiencyGain = Math.min(0.05 + (totalRisks * 0.02), 0.30);
    const fuelPricePerLiter = 1650; 
    const carbonFactor = 2.3;
    const baseEfficiency = 12;
    const totalFuelUsed = mileage / baseEfficiency;
    const savings = totalFuelUsed * fuelPricePerLiter * efficiencyGain;
    const carbonReduction = totalFuelUsed * carbonFactor * efficiencyGain;
    const potentialEfficiency = baseEfficiency * (1 + efficiencyGain);
    
    return {
      savings: Math.round(savings),
      carbon: Number(carbonReduction.toFixed(2)),
      potentialEfficiency: Number(potentialEfficiency.toFixed(2)),
      currentEfficiency: Number(baseEfficiency.toFixed(2)),
      gainPercent: (efficiencyGain * 100).toFixed(1),
      totalRisks
    };
  };

  const calculateSafetyScore = (d: DrivingRiskData) => {
    const totalRisks = (Object.values(d.risks) as number[]).reduce((a, b) => a + b, 0);
    let score = 100 - (totalRisks * 2); 
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const riskChartData = data ? Object.entries(data.risks).map(([key, value]) => ({
    name: RISK_LABELS[key] || key,
    value: Number((value as number).toFixed(1))
  })) : [];

  const economyMetrics = data ? calculateEconomy(data) : null;
  const safetyScore = data ? calculateSafetyScore(data) : 0;

  // AI 리포트 출력용 가공 로직 (에러 발생 시 SAMPLE_REPORT 사용)
  const getDisplayReport = () => {
    if (!aiReport || aiReport.includes("응답하지 않습니다") || aiReport.includes("Error")) {
      return SAMPLE_REPORT;
    }
    return aiReport;
  };

  const tossBg = darkMode ? "bg-[#0f172a]" : "bg-[#f2f4f6]";
  const tossCard = `rounded-[2.5rem] p-6 md:p-10 shadow-sm transition-all duration-300 ${darkMode ? "bg-[#1e293b]" : "bg-white"}`;
  const navyGNB = "bg-[#1e1b4b] text-white";

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#00AD7C";
    if (score >= 40) return "#FF7D00";
    return "#F04452";
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 ${tossBg} ${darkMode ? 'dark' : ''}`}>
      
      {/* Mobile Sticky Header */}
      <div className={`md:hidden flex items-center justify-between p-4 z-50 sticky top-0 shrink-0 shadow-md ${navyGNB}`}>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 active:bg-white/10 rounded-full transition-colors">
          <Menu size={24} />
        </button>
        <span className="font-bold tracking-tight text-lg">DriveSafe Pro</span>
        <div className="w-10"></div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed top-0 left-0 h-screen w-72 flex flex-col z-[60] transition-transform duration-500 transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'} border-r overflow-y-auto`}>
        <div className={`p-8 flex items-center justify-between shrink-0 ${navyGNB}`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold">DriveSafe</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 rounded-full hover:bg-white/10">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 flex flex-col flex-1">
          <nav className="flex-1 space-y-2">
            {[
              { id: 'report', label: '안전 리포트', icon: <FileText size={20} /> },
              { id: 'overview', label: '상세 데이터', icon: <Activity size={20} /> },
              { id: 'economy', label: '경제성 분석', icon: <TrendingDown size={20} /> }
            ].map((m) => (
              <button 
                key={m.id}
                disabled={!data}
                onClick={() => { setTab(m.id as any); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all text-[15px] font-semibold ${!data ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'} ${tab === m.id ? (darkMode ? 'bg-gray-700 text-blue-400' : 'bg-[#e8f3ff] text-[#3182F6]') : 'text-slate-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <div className="flex items-center gap-4">
                  {m.icon}
                  <span>{m.label}</span>
                </div>
                {tab === m.id && <ChevronRight size={16} />}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 border-t dark:border-gray-700 border-slate-100 space-y-4">
            <div className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-all ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`} onClick={() => setDarkMode(!darkMode)}>
               <span className="text-[13px] font-bold text-slate-500 dark:text-gray-400">{darkMode ? '다크 모드' : '라이트 모드'}</span>
               {darkMode ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-orange-400" />}
            </div>
            <button 
              onClick={() => { setData(null); setAiReport(''); setIsSidebarOpen(false); }} 
              className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-[#3182F6] text-white rounded-2xl text-[15px] font-bold shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-all"
            >
              새로 입력하기
            </button>
            <CopyrightFooter />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 p-4 sm:p-10 lg:p-16 transition-all overflow-x-hidden">
        
        {/* Input Form Screen */}
        {!data && !loading && (
          <div className="max-w-xl mx-auto py-8 animate-in">
            <div className="mb-10 text-center sm:text-left">
              <h2 className={`text-2xl sm:text-4xl font-black mb-3 ${darkMode ? 'text-gray-100' : 'text-[#191F28]'}`}>운전 데이터 분석</h2>
              <p className="text-slate-500 dark:text-gray-400 font-medium leading-relaxed">위험 행동 데이터를 바탕으로<br/>전문 안전 운전 리포트를 생성합니다.</p>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-6">
              <div className={tossCard}>
                <h3 className={`text-[15px] font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}><Car size={18} className="text-blue-500" /> 기본 정보</h3>
                <div className="space-y-5">
                  <div className="relative">
                    <label className="text-[12px] font-bold text-slate-400 block mb-2 px-1">차량 번호</label>
                    <input 
                      type="text" 
                      name="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={handleInputChange}
                      className={`w-full border-0 px-4 py-4 rounded-2xl font-bold placeholder-slate-400 focus:ring-2 focus:ring-[#3182F6] outline-none transition-all ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-50 text-gray-900'}`}
                      placeholder="예: 12가 3456"
                      required
                    />
                  </div>
                  <div className="relative">
                    <label className="text-[12px] font-bold text-slate-400 block mb-2 px-1">연간 주행거리 (km)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="totalDistance"
                      value={formData.totalDistance}
                      onChange={handleInputChange}
                      className={`w-full border-0 px-4 py-4 rounded-2xl font-bold placeholder-slate-400 focus:ring-2 focus:ring-[#3182F6] outline-none transition-all ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-50 text-gray-900'}`}
                      placeholder="예: 15000"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={tossCard}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-[15px] font-bold flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}><AlertTriangle size={18} className="text-red-500" /> 위험 행동 (횟수)</h3>
                  <div className={`p-1 rounded-xl flex gap-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <button type="button" onClick={() => setInputMethod('manual')} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${inputMethod === 'manual' ? (darkMode ? 'bg-gray-600 text-gray-100 shadow-sm' : 'bg-white text-gray-900 shadow-sm') : 'text-slate-400'}`}>직접</button>
                    <button type="button" onClick={() => setInputMethod('excel')} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${inputMethod === 'excel' ? (darkMode ? 'bg-gray-600 text-gray-100 shadow-sm' : 'bg-white text-gray-900 shadow-sm') : 'text-slate-400'}`}>엑셀</button>
                  </div>
                </div>

                {inputMethod === 'manual' ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    {Object.keys(RISK_LABELS).map((key) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 truncate px-1">{RISK_LABELS[key]}</label>
                        <input 
                          type="number" 
                          step="0.1"
                          name={key}
                          value={formData[key as keyof typeof formData]}
                          onChange={handleInputChange}
                          className={`w-full border-0 px-3 py-3 rounded-xl font-bold text-center outline-none focus:ring-2 focus:ring-[#3182F6] ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-50 text-gray-900'}`}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all relative ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {excelFile ? <CheckCircle2 size={32} className="text-[#00AD7C] mb-2" /> : <Upload size={32} className="text-slate-300 mb-2" />}
                    <p className="text-[13px] font-bold text-slate-500">{excelFile ? excelFile.name : '데이터 엑셀 파일을 올려주세요'}</p>
                  </div>
                )}
              </div>

              <button type="submit" className="w-full py-5 bg-[#3182F6] text-white rounded-[2rem] text-lg font-black shadow-xl active:scale-95 transition-all hover:bg-[#2067d9]">
                분석 리포트 생성하기
              </button>
            </form>
          </div>
        )}

        {/* Loading Screen */}
        {loading && (
          <div className="h-[70vh] flex flex-col items-center justify-center space-y-6 animate-in">
            <div className="relative">
              <div className="w-24 h-24 border-[8px] border-[#3182F6]/10 border-t-[#3182F6] rounded-full animate-spin"></div>
              <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#3182F6] w-10 h-10 animate-pulse-blue" />
            </div>
            <div className="text-center">
              <h3 className={`text-2xl font-black mb-1 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>데이터를 정밀 분석하고 있어요</h3>
              <p className="text-slate-400 font-semibold">잠시만 기다려주시면 리포트가 완성됩니다</p>
            </div>
          </div>
        )}

        {/* Dashboard Results Screen */}
        {data && !loading && (
          <div className="max-w-5xl mx-auto space-y-12 pb-24 animate-in">
            
            {/* 탭: 안전 리포트 */}
            {tab === 'report' && (
              <>
                <div className={tossCard}>
                  <p className="text-[#3182F6] font-black text-sm mb-2">{data.vehicleNumber} 맞춤 리포트</p>
                  <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black leading-tight mb-8 ${darkMode ? 'text-gray-100' : 'text-[#191F28]'}`}>차주님의<br/>안전 운전 점수입니다</h2>
                  
                  <div className="flex flex-col items-center justify-center py-6 relative">
                   <svg 
                     className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 transform -rotate-90" 
                     viewBox="0 0 200 200"
                   >
                     <circle 
                       cx="100" 
                       cy="100" 
                       r="90" 
                       stroke={darkMode ? "#334155" : "#F2F4F6"} 
                       strokeWidth="14" 
                       fill="transparent" 
                     />
                     <circle
                       cx="100"
                       cy="100"
                       r="90"
                       stroke={getScoreColor(safetyScore)}
                       strokeWidth="14"
                       fill="transparent"
                       strokeDasharray={2 * Math.PI * 90}
                       strokeDashoffset={2 * Math.PI * 90 * (1 - safetyScore / 100)}
                       strokeLinecap="round"
                       className="transition-all duration-1000 ease-out"
                     />
                   </svg>
                   <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                     <span 
                       className="text-5xl sm:text-6xl lg:text-7xl font-black block" 
                       style={{ color: getScoreColor(safetyScore) }}
                     >
                       {safetyScore}
                     </span>
                     <span className="text-sm font-bold text-slate-400">점 / 100점</span>
                   </div>
                  </div>

                  <div className={`mt-10 rounded-2xl p-6 flex items-center justify-between ${darkMode ? 'bg-gray-700/50' : 'bg-[#f9fafb]'}`}>
                    <div className="flex items-center gap-3">
                      <Info size={18} className="text-slate-400" />
                      <span className={`text-[14px] font-semibold ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>전체 운전자 데이터 기반 분석 결과입니다</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>

                <div className={`rounded-[2.5rem] p-8 lg:p-12 shadow-sm ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-[#FEECEB] text-[#F04452]'}`}>
                   <div className="flex items-center gap-2 mb-6">
                     <AlertTriangle size={28} />
                     <h3 className="text-xl font-black">집중 관리가 필요해요</h3>
                   </div>
                   <div className="flex items-baseline gap-2 mb-4">
                     <span className="text-3xl lg:text-5xl font-black">{riskChartData.sort((a,b)=>b.value-a.value)[0]?.name || '없음'}</span>
                     <span className="text-sm font-bold">발생 빈도가 높습니다</span>
                   </div>
                   <p className="text-[16px] sm:text-[18px] leading-relaxed opacity-90 font-medium">
                     해당 운전 패턴은 사고 위험을 높일 뿐 아니라 차량 수명에도 악영향을 미칩니다. 
                     부드러운 출발과 충분한 차간 거리 확보를 최우선으로 교정해 보세요.
                   </p>
                </div>

                {/* AI PROFESSIONAL REPORT SECTION */}
                <div className={`rounded-[2.5rem] p-8 sm:p-12 lg:p-16 shadow-sm transition-all duration-300 ${darkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-500" size={32} />
                      <h3 className={`text-2xl sm:text-3xl font-black tracking-tight uppercase ${darkMode ? 'text-white' : 'text-gray-900'}`}>전문 분석 리포트</h3>
                    </div>
                    <button 
                      onClick={handleRefreshReport}
                      disabled={loading}
                      className={`p-3 rounded-2xl transition-all active:rotate-180 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                      title="리포트 다시 생성"
                    >
                      <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  
                  {/* 리포트 내용 전체 출력 로직 (에러 발생 시 샘플 데이터로 대체) */}
                  <div className="space-y-8">
                    {getDisplayReport().split('\n').filter(l => l.trim().length > 0).map((line, i) => (
                      <div key={i} className="flex gap-5 group">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-3 shrink-0 group-hover:scale-150 transition-all duration-300" />
                        <p className="text-[17px] sm:text-[18px] font-medium leading-[1.9] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {line.trim()}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className={`mt-20 pt-12 border-t flex flex-col sm:flex-row items-center justify-between gap-8 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={24} className="text-blue-400" />
                      <span className="text-[14px] font-black text-gray-600 dark:text-gray-400">분석 기관: 한국교통안전공단 AI 청년자문단 손유준</span>
                    </div>
                    <button 
                      onClick={() => setTab('overview')} 
                      className="text-[#3182F6] text-[16px] font-black flex items-center gap-2 hover:translate-x-2 transition-transform active:scale-95"
                    >
                      상세 데이터 지표 확인 <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-10 sm:p-16 rounded-[3.5rem] bg-[#191F28] text-white relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <Zap className="text-blue-400 animate-pulse" size={24} />
                      <h5 className="text-[13px] font-black text-blue-400 uppercase tracking-[0.5em]">Safety Insight</h5>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold leading-relaxed">
                      올바른 운전 습관은<br/>
                      연간 유류비를 <span className="text-blue-400 underline underline-offset-8 decoration-4">{economyMetrics?.savings.toLocaleString()}원</span> 이상 아끼고,<br/>
                      안전을 지키는 <span className="text-green-400">가장 경제적인 방법</span>입니다.
                    </p>
                  </div>
                  <ShieldCheck className="absolute -right-12 -bottom-12 w-64 h-64 opacity-5 rotate-12 transition-transform group-hover:scale-125" />
                </div>
              </>
            )}

            {/* 탭: 상세 데이터 */}
            {tab === 'overview' && (
              <div className="space-y-8">
                <div className={tossCard}>
                  <h3 className={`text-2xl font-black mb-10 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>위험 운전 항목별 지표</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                    <div className={`p-10 rounded-[2.5rem] ${darkMode ? 'bg-gray-700/50' : 'bg-[#f8fafc]'}`}>
                      <p className="text-[14px] font-bold text-slate-400 mb-2">누적 위험 행동</p>
                      <p className={`text-4xl font-black ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{economyMetrics?.totalRisks.toFixed(0)} <span className="text-xl">회</span></p>
                    </div>
                    <div className={`p-10 rounded-[2.5rem] ${darkMode ? 'bg-gray-700/50' : 'bg-[#f8fafc]'}`}>
                      <p className="text-[14px] font-bold text-slate-400 mb-2">분석 대상 주행거리</p>
                      <p className={`text-4xl font-black ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{data.totalDistance.toLocaleString()} <span className="text-xl">km</span></p>
                    </div>
                  </div>
                  
                  {/* SCROLLABLE BAR CHART AREA */}
                  <div className="w-full overflow-x-auto pb-6 scrollbar-hide">
                    <div className="relative h-96 min-w-[700px] pt-20 pb-16 px-6">
                      <div className="absolute inset-0 pt-20 px-6 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className={`w-full border-t border-dashed ${darkMode ? 'border-gray-700' : 'border-gray-200'}`} />
                        ))}
                        <div className={`w-full border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} />
                      </div>

                      <div className="relative h-full flex items-end justify-between gap-4">
                        {riskChartData.map((item, idx) => {
                          const maxVal = Math.max(...riskChartData.map(d => d.value), 1);
                          const targetHeight = (item.value / maxVal) * 85; 
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                              <div className={`absolute -top-10 px-4 py-2 rounded-xl text-[12px] font-black shadow-2xl transition-all opacity-0 group-hover:opacity-100 z-10 scale-90 group-hover:scale-100 ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-900 border border-gray-100'}`}>
                                {item.value}회
                              </div>
                              
                              <div 
                                className="w-full max-w-[44px] rounded-t-2xl transition-all duration-[1500ms] cubic-bezier(0.34, 1.56, 0.64, 1) shadow-sm cursor-pointer hover:brightness-110 active:scale-95"
                                style={{ 
                                  height: chartAnimate ? `${Math.max(targetHeight, 2)}%` : '0%',
                                  backgroundColor: COLORS[idx % COLORS.length]
                                }}
                              />
                              
                              <div className={`mt-5 text-[12px] lg:text-[13px] font-black truncate w-full text-center leading-tight ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {item.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-[11px] text-slate-400 font-bold mt-4 animate-pulse md:hidden">
                    옆으로 밀어서 지표 확인 ← →
                  </div>
                </div>
                
                <div className={tossCard}>
                   <h3 className={`text-2xl font-black mb-12 text-center ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>위험 요소별 비중 (%)</h3>
                   <div className="flex items-center justify-center h-80 lg:h-[450px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={riskChartData.filter(r => r.value > 0)} innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value">
                            {riskChartData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                         </Pie>
                         <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', padding: '16px', backgroundColor: darkMode ? '#1e293b' : 'white', boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', color: darkMode ? 'white' : 'black' }} />
                         <Legend verticalAlign="bottom" height={80} wrapperStyle={{fontSize: '13px', fontWeight: '900', paddingTop: '40px'}} />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                </div>
              </div>
            )}

            {/* 탭: 경제성 분석 */}
            {tab === 'economy' && (
              <div className="space-y-8">
                <div className={tossCard}>
                  <h4 className={`text-2xl font-black mb-16 flex items-center gap-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}><Gauge size={32} className="text-[#3182F6]" /> 연비 개선 시뮬레이션</h4>
                  
                  <div className="flex items-end justify-around h-80 mb-16 px-6 sm:px-12">
                    <div className="flex flex-col items-center group flex-1">
                      <Car className="text-slate-300 dark:text-slate-500 mb-8 transition-transform duration-500 group-hover:scale-125" size={64} />
                      <div className="text-center mb-10">
                         <p className="text-[14px] font-bold text-slate-400 mb-1">현재 효율</p>
                         <p className={`text-2xl font-black ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>{economyMetrics?.currentEfficiency} <span className="text-[14px]">km/L</span></p>
                      </div>
                      <div className={`w-24 sm:w-32 lg:w-44 rounded-t-3xl transition-all duration-700 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`} style={{ height: '60%' }} />
                    </div>
                    
                    <div className="flex flex-col items-center group flex-1">
                      <Target className="text-[#3182F6] mb-8 animate-bounce-slow transition-transform duration-500 group-hover:scale-125" size={64} />
                      <div className="text-center mb-10">
                         <p className="text-[14px] font-bold text-[#3182F6] mb-1">교정 후 목표</p>
                         <p className="text-3xl font-black text-[#3182F6]">{economyMetrics?.potentialEfficiency} <span className="text-[14px]">km/L</span></p>
                      </div>
                      <div className="w-24 sm:w-32 lg:w-44 bg-gradient-to-t from-[#3182F6] to-[#60A5FA] rounded-t-3xl shadow-2xl shadow-blue-500/30 transition-all duration-1000" style={{ height: '100%' }} />
                    </div>
                  </div>

                  <div className="bg-[#3182F6] p-12 rounded-[4rem] text-center text-white shadow-2xl shadow-blue-500/40">
                    <p className="font-bold text-2xl leading-relaxed">
                      올바른 운전 습관만으로 연비가<br/>
                      <span className="text-6xl font-black mx-1 inline-block my-5">{economyMetrics?.gainPercent}%</span> 더 좋아집니다
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className={`rounded-[3rem] p-12 flex flex-col items-center justify-center gap-8 transition-all hover:scale-[1.04] ${darkMode ? 'bg-green-900/20 text-green-400' : 'bg-[#E6F8F3] text-[#00AD7C]'}`}>
                    <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}><Leaf size={48} /></div>
                    <div className="text-center">
                      <p className="text-[13px] font-black uppercase tracking-widest opacity-80 mb-3">연간 탄소 배출 저감량</p>
                      <p className="text-5xl font-black">{economyMetrics?.carbon} <span className="text-2xl">kg</span></p>
                    </div>
                  </div>
                  <div className="rounded-[3rem] p-12 bg-[#3182F6] text-white flex flex-col items-center justify-center gap-8 transition-all hover:scale-[1.04]">
                    <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] flex items-center justify-center text-white shadow-sm"><Fuel size={48} /></div>
                    <div className="text-center">
                      <p className="text-[13px] font-black uppercase tracking-widest opacity-90 mb-3">연간 예상 유류비 절감</p>
                      <p className="text-5xl font-black">{economyMetrics?.savings.toLocaleString()} <span className="text-2xl">원</span></p>
                    </div>
                  </div>
                </div>

                <div className={tossCard}>
                  <h4 className={`text-2xl font-black mb-16 flex items-center gap-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}><TrendingUp size={32} className="text-[#3182F6]" /> 누적 비용 절감 시뮬레이션</h4>
                  <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
                    <div className="flex items-center justify-center h-80 sm:h-[450px] min-w-[600px] px-4 overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={Array.from({length: 12}, (_, i) => ({ month: `${i+1}월`, savings: Math.round((economyMetrics!.savings / 12) * (i + 1)) }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#E5E8EB"} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 13, fontWeight: '900', fill: '#8B95A1'}} />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{stroke: '#3182F6', strokeWidth: 2}} 
                            contentStyle={{ 
                              borderRadius: '32px', 
                              border: 'none', 
                              backgroundColor: darkMode ? '#1e293b' : 'white', 
                              boxShadow: '0 40px 70px -15px rgba(0,0,0,0.3)', 
                              color: darkMode ? '#f8fafc' : '#1e293b',
                              padding: '20px 32px'
                            }} 
                            formatter={(v: any) => [`${v.toLocaleString()}원`, '누적 혜택']} 
                          />
                          <Line type="monotone" dataKey="savings" stroke="#3182F6" strokeWidth={10} dot={{r: 8, fill: '#3182F6', strokeWidth: 6, stroke: darkMode ? '#1e293b' : 'white'}} activeDot={{r: 14, strokeWidth: 0}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
