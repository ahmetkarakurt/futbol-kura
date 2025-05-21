'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FixturePage() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Sayfa yüklendiğinde verileri çek
    fetchFixtures();
  }, []);

  const fetchFixtures = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fixtures');
      const data = await res.json();
      setFixtures(data);
      
      // Eğer varsa, ilk tur seçilsin
      if (data.length > 0) {
        // Tüm turları sayı olarak dönüştür ve sırala
        const rounds: number[] = [];
        data.forEach((fixture: any) => {
          if (typeof fixture.round === 'number') {
            rounds.push(fixture.round);
          }
        });
        
        // Benzersiz turları bul ve sırala
        const uniqueRounds = [...new Set(rounds)].sort((a, b) => a - b);
        
        if (uniqueRounds.length > 0) {
          setSelectedRound(uniqueRounds[0]);
        }
      }
    } catch (error) {
      console.error("Fikstür verileri yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col items-center justify-start py-10 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl">
        <h1 className="text-4xl font-extrabold text-blue-700 mb-8 text-center">Process Krallar Futbol Ligi</h1>
        
        {/* Sekmeler */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className="px-4 py-2 font-semibold text-gray-500 hover:text-gray-700"
            onClick={() => router.push('/')}
          >
            Ana Sayfa
          </button>
          <button 
            className="px-4 py-2 font-semibold text-gray-500 hover:text-gray-700"
            onClick={() => router.push('/canli-skorlar')}
          >
            Canlı Skorlar
          </button>
          <button
            className="px-4 py-2 font-semibold text-blue-600 border-b-2 border-blue-500"
          >
            Fikstür
          </button>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-blue-700">Fikstür</h2>
            
            {fixtures.length > 0 && (
              <div className="flex items-center">
                <select
                  className="border rounded-md p-2"
                  value={selectedRound || ''}
                  onChange={(e) => setSelectedRound(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Tur Seçin</option>
                  {[...new Set(fixtures.map(f => f.round))].sort((a, b) => a - b).map(round => (
                    <option key={round} value={round}>{round}. Tur</option>
                  ))}
                </select>
                <button 
                  className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md"
                  onClick={fetchFixtures}
                >
                  Yenile
                </button>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="text-center p-8">
              <p className="text-gray-500">Veriler yükleniyor...</p>
            </div>
          ) : fixtures.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">Henüz bir fikstür oluşturulmamış.</p>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Ana Sayfaya Dön
              </button>
            </div>
          ) : selectedRound !== null ? (
            <div className="space-y-4">
              {fixtures
                .filter(fixture => fixture.round === selectedRound)
                .map((fixture) => (
                  <div key={fixture.id} className="border rounded-lg p-4 shadow-sm bg-gray-50">
                    <h3 className="text-lg font-bold mb-2">
                      {fixture.round}. Tur - {fixture.name || 'Maçlar'}
                    </h3>
                    <div className="space-y-3">
                      {fixture.matches.map((match: any) => (
                        <div key={match.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center">
                          <div className="w-5/12 text-right font-medium truncate">
                            {match.homeTeam.name}
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
                          <div className="w-5/12 text-left font-medium truncate">
                            {match.awayTeam.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Lütfen bir tur seçin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 