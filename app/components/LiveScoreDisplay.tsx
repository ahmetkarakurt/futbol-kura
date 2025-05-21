'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Konfeti bileşenini dinamik olarak import ediyoruz (SSR ile uyumlu olması için)
const ReactConfetti = dynamic(() => import('react-confetti'), { ssr: false });

type Match = {
  id: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
};

type LiveScoreDisplayProps = {
  initialMatches: Match[];
  round: number;
};

export default function LiveScoreDisplay({ initialMatches, round }: LiveScoreDisplayProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [isConnected, setIsConnected] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiDuration, setConfettiDuration] = useState(0);
  const [scoringTeam, setScoringTeam] = useState<{matchId: string, team: 'home' | 'away'} | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Tarayıcı boyutlarını al (konfeti için)
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600
  });

  // Ses efektini yükle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/goal.mp3');
    }
  }, []);

  // Ekran boyutlarını takip et (konfeti için)
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    // Güncellenmiş maçları göstermek için initialMatches değiştiğinde state'i güncelle
    setMatches(initialMatches);
  }, [initialMatches]);

  // Konfeti efekti için timer
  useEffect(() => {
    if (confettiDuration > 0) {
      const timer = setTimeout(() => {
        setConfettiDuration(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (confettiDuration === 0) {
      setShowConfetti(false);
    }
  }, [confettiDuration]);

  // Takım adının yanıp sönmesi için timer
  useEffect(() => {
    if (scoringTeam) {
      const timer = setTimeout(() => {
        setScoringTeam(null);
      }, 10000); // 10 saniye (6 saniye yerine)
      
      return () => clearTimeout(timer);
    }
  }, [scoringTeam]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    const connectToSSE = () => {
      // Server-Sent Events bağlantısı kur
      eventSource = new EventSource('/api/score-events');
      
      eventSource.onopen = () => {
        setIsConnected(true);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'score-update') {
            // Gelen maç güncellemesi bu turun bir parçası mı kontrol et
            if (data.match.fixture.round === round) {
              // Maç listesini güncelle
              setMatches(prevMatches => 
                prevMatches.map(match => 
                  match.id === data.match.id ? data.match : match
                )
              );
              
              // Eğer gol olduysa konfeti efektini göster ve ses çal
              if (data.goalScored && data.scoringTeam) {
                setShowConfetti(true);
                setConfettiDuration(8); // 5 yerine 8 saniye boyunca konfeti göster
                setScoringTeam({
                  matchId: data.match.id,
                  team: data.scoringTeam
                });
                
                // Gol sesi çal
                if (audioRef.current) {
                  audioRef.current.volume = 0.8; // Ses seviyesini artır
                  audioRef.current.currentTime = 0; // Sesi baştan başlat
                  audioRef.current.play().catch(e => console.log("Ses çalınamadı:", e));
                }
              }
            }
          }
        } catch (error) {
          console.error('Gelen veriyi işlerken hata:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE bağlantı hatası:', error);
        setIsConnected(false);
        
        // Bağlantıyı kapat ve yeniden bağlanmayı dene
        if (eventSource) {
          eventSource.close();
          
          // 3 saniye sonra yeniden bağlan
          setTimeout(connectToSSE, 3000);
        }
      };
    };
    
    // Bağlantıyı başlat
    connectToSSE();
    
    // Temizleme fonksiyonu
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [round]); // round değişirse bağlantıyı yeniden kur

  return (
    <div className="bg-white rounded-lg shadow-md p-4 my-4 relative overflow-hidden">
      {/* Konfeti efekti */}
      {showConfetti && (
        <ReactConfetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={true}
          numberOfPieces={800}
          gravity={0.2}
          colors={['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']}
          tweenDuration={5000}
          initialVelocityY={20}
          initialVelocityX={10}
          confettiSource={{x: 0, y: 0, w: dimensions.width, h: 0}}
          friction={0.97}
        />
      )}
      
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold">{round}. Tur Canlı Skorlar</h2>
        <span className={`ml-2 inline-block w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span className="ml-1 text-sm text-gray-500">{isConnected ? 'Bağlı' : 'Bağlantı Kesik'}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map(match => (
          <div 
            key={match.id} 
            className={`border rounded-lg p-3 ${match.played ? 'bg-blue-50' : 'bg-gray-50'}`}
          >
            <div className="flex justify-between items-center">
              <div className={`w-5/12 text-right font-medium truncate 
                ${scoringTeam?.matchId === match.id && scoringTeam?.team === 'home' 
                  ? 'animate-bounce text-red-600 font-extrabold text-2xl bg-yellow-200 px-3 py-2 mb-1 rounded-lg shadow-md'
                  : ''}`}
              >
                {match.homeTeam.name}
                {scoringTeam?.matchId === match.id && scoringTeam?.team === 'home' && (
                  <span className="ml-2 text-green-600 font-bold">⚽ GOL!</span>
                )}
              </div>
              <div className="w-2/12 flex justify-center font-bold">
                {match.homeScore !== null && match.awayScore !== null ? (
                  <span className="bg-gray-100 px-2 py-1 rounded-md">
                    {match.homeScore} - {match.awayScore}
                  </span>
                ) : (
                  <span className="text-gray-400">vs</span>
                )}
              </div>
              <div className={`w-5/12 text-left font-medium truncate 
                ${scoringTeam?.matchId === match.id && scoringTeam?.team === 'away' 
                  ? 'animate-bounce text-red-600 font-extrabold text-2xl bg-yellow-200 px-3 py-2 mb-1 rounded-lg shadow-md' 
                  : ''}`}
              >
                {match.awayTeam.name}
                {scoringTeam?.matchId === match.id && scoringTeam?.team === 'away' && (
                  <span className="mr-2 text-green-600 font-bold">⚽ GOL!</span>
                )}
              </div>
            </div>
            {match.played && (
              <div className="mt-2 text-center text-xs">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  Maç Tamamlandı
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 