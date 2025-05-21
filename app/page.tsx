"use client";
import { useState, useEffect } from 'react';

export default function Home() {
  const [teams, setTeams] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('groups'); // 'groups', 'fixtures', 'standings'
  const [matchScores, setMatchScores] = useState<Record<string, { homeScore: string, awayScore: string }>>({});
  
  // Admin girişi için state'ler
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  // Süper yönetici kontrolü için yeni state
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Sayfa yüklendiğinde admin durumunu kontrol et
  useEffect(() => {
    const savedAdmin = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') : null;
    if (savedAdmin === 'true') {
      setIsAdmin(true);
    }
    
    // Süper yönetici kontrolü
    const savedSuperAdmin = typeof window !== 'undefined' ? localStorage.getItem('isSuperAdmin') : null;
    if (savedSuperAdmin === 'true') {
      setIsSuperAdmin(true);
    }
    
    fetchTeams();
    fetchGroups();
    fetchFixtures();
    fetchStandings();
  }, []);

  // Admin girişi yapma fonksiyonu
  const handleAdminLogin = () => {
    if (adminPassword === 'Admin123') {
      setIsAdmin(true);
      setAdminError("");
      setShowAdminLogin(false);
      localStorage.setItem('isAdmin', 'true');
    } else if (adminPassword === 'SuperAdmin456') {
      // Süper yönetici girişi
      setIsAdmin(true);
      setIsSuperAdmin(true);
      setAdminError("");
      setShowAdminLogin(false);
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('isSuperAdmin', 'true');
    } else {
      setAdminError("Yanlış parola!");
    }
  };

  // Admin çıkışı yapma fonksiyonu
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setIsSuperAdmin(false);
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isSuperAdmin');
  };

  const fetchTeams = async () => {
    const res = await fetch('/api/teams');
    const data = await res.json();
    setTeams(data);
  };

  const fetchGroups = async () => {
    const res = await fetch('/api/groups');
    const data = await res.json();
    setGroups(data);
  };

  const fetchFixtures = async () => {
    const res = await fetch('/api/fixtures');
    const data = await res.json();
    setFixtures(data);
    
    // Mevcut skor değerlerini matchScores state'ine aktar
    const initialScores: Record<string, { homeScore: string, awayScore: string }> = {};
    data.forEach((fixture: any) => {
      fixture.matches.forEach((match: any) => {
        initialScores[match.id] = {
          homeScore: match.homeScore !== null ? match.homeScore.toString() : '',
          awayScore: match.awayScore !== null ? match.awayScore.toString() : ''
        };
      });
    });
    setMatchScores(initialScores);
    
    // Skorları yükledikten sonra işlemi tamamla
    console.log("Fikstürler ve skorlar yüklendi");
  };

  const fetchStandings = async () => {
    try {
      // Grup bazlı puan durumu
      const standingsRes = await fetch('/api/standings');
      const standingsData = await standingsRes.json();
      setStandings(standingsData);
      
      // Takım bazlı istatistikler
      const teamStatsRes = await fetch('/api/teams/stats');
      const teamStatsData = await teamStatsRes.json();
      setTeamStats(teamStatsData);
    } catch (error) {
      console.error("Puan durumu yüklenirken hata:", error);
    }
  };

  // Skor güncelleme işlemi
  const updateMatchScore = async (matchId: string, finishMatch = false) => {
    const scoreData = matchScores[matchId];
    
    if (!scoreData || scoreData.homeScore === '' || scoreData.awayScore === '') {
      alert('Lütfen her iki takım için de skor giriniz');
      return;
    }
    
    const homeScore = parseInt(scoreData.homeScore);
    const awayScore = parseInt(scoreData.awayScore);
    
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      alert('Lütfen geçerli bir skor giriniz (pozitif tam sayılar)');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/matches/update-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          matchId, 
          homeScore, 
          awayScore,
          finishMatch
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Skor güncelleme hatası:", error);
        alert(`Skor güncellenemedi: ${error.error || 'Bir hata oluştu'}`);
      } else {
        await fetchFixtures(); // Fikstürleri tekrar yükle
        await fetchStandings(); // Puan durumunu güncelle
      }
    } catch (error) {
      console.error("Skor güncelleme hatası:", error);
      alert("Skor güncellenemedi: Bağlantı hatası oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Skorları girmek için input değeri değiştiğinde
  const handleScoreChange = (matchId: string, team: 'home' | 'away', value: string) => {
    // Sadece boş veya rakam değerleri kabul et
    if (value === '' || /^[0-9]+$/.test(value)) {
      setMatchScores(prev => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          [team === 'home' ? 'homeScore' : 'awayScore']: value
        }
      }));
    }
  };

  const handleAddTeam = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName, isSeed: false }),
    });
    setTeamName("");
    await fetchTeams();
    setLoading(false);
  };

  const handleCreateGroups = async () => {
    setLoading(true);
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Grup ${groups.length + 1}` }),
    });
    await fetchGroups();
    setLoading(false);
  };

  const handleDeleteAll = async () => {
    setLoading(true);
    // Tüm takımları doğrudan silme
    await fetch('/api/teams', { 
      method: 'DELETE', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteAll: true }) 
    });
    // Tüm grupları doğrudan silme  
    await fetch('/api/groups', { 
      method: 'DELETE', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteAll: true }) 
    });
    await fetchTeams();
    await fetchGroups();
    setLoading(false);
  };

  const handleDeleteTeam = async (id: string) => {
    setLoading(true);
    await fetch('/api/teams', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await fetchTeams();
    setLoading(false);
  };

  const handleEditTeam = (id: string, name: string) => {
    setEditTeamId(id);
    setEditTeamName(name);
  };

  const handleUpdateTeam = async (id: string) => {
    setLoading(true);
    await fetch('/api/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editTeamName }),
    });
    setEditTeamId(null);
    setEditTeamName("");
    await fetchTeams();
    setLoading(false);
  };

  const handleDeleteGroup = async (id: string) => {
    setLoading(true);
    await fetch('/api/groups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await fetchGroups();
    setLoading(false);
  };

  const handleEditGroup = (id: string, name: string) => {
    setEditGroupId(id);
    setEditGroupName(name);
  };

  const handleUpdateGroup = async (id: string) => {
    setLoading(true);
    await fetch('/api/groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editGroupName }),
    });
    setEditGroupId(null);
    setEditGroupName("");
    await fetchGroups();
    setLoading(false);
  };

  // Seri başı takım atama fonksiyonu
  const handleSeedTeam = async (groupId: string, teamId: string) => {
    setLoading(true);
    try {
      // Yeni yöntem: /api/groups endpoint'inin PATCH metodunu kullanıyoruz
      await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          seedTeam: true,  // Bu bir seri başı atama işlemi
          groupId, 
          teamId 
        }),
      });
      
      await fetchTeams();
      await fetchGroups();
    } catch (error) {
      console.error("Seri başı atama hatası:", error);
    }
    setLoading(false);
  };

  // Kura çekme fonksiyonu
  const handleDraw = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/groups/draw', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' } 
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Kura çekme hatası:", error);
        alert(`Kura çekilemedi: ${error.error || 'Bir hata oluştu'}`);
      } else {
        const result = await response.json();
        alert(result.message || "Kura başarıyla çekildi!");
      }
      
      await fetchTeams();
      await fetchGroups();
    } catch (error) {
      console.error("Kura çekme hatası:", error);
      alert("Kura çekilemedi: Bağlantı hatası oluştu");
    }
    setLoading(false);
  };

  // Grup içi fikstür oluşturma (her takım kendi grubunda diğer takımlarla karşılaşır)
  const handleCreateFixtures = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fixtures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Fikstür oluşturma hatası:", error);
        alert(`Fikstür oluşturulamadı: ${error.error || 'Bir hata oluştu'}`);
      } else {
        const result = await response.json();
        alert(result.message || "Fikstürler başarıyla oluşturuldu!");
        await fetchFixtures();
        setActiveTab('fixtures');
      }
    } catch (error) {
      console.error("Fikstür oluşturma hatası:", error);
      alert("Fikstür oluşturulamadı: Bağlantı hatası oluştu");
    } finally {
      setLoading(false); // Loading durumunu her durumda kapat
    }
  };

  // Gruplar arası fikstür oluşturma
  const handleCreateCrossGroupFixtures = async () => {
    if (selectedGroupIds.length < 2) {
      alert("Lütfen en az 2 grup seçin");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/fixtures/cross-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds: selectedGroupIds })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Gruplar arası fikstür oluşturma hatası:", error);
        alert(`Gruplar arası fikstür oluşturulamadı: ${error.error || 'Bir hata oluştu'}`);
      } else {
        const result = await response.json();
        alert(result.message || "Gruplar arası fikstürler başarıyla oluşturuldu!");
        await fetchFixtures();
        setActiveTab('fixtures');
      }
    } catch (error) {
      console.error("Gruplar arası fikstür oluşturma hatası:", error);
      alert("Gruplar arası fikstür oluşturulamadı: Bağlantı hatası oluştu");
    } finally {
      setLoading(false); // Loading durumunu her durumda kapat
    }
  };

  // Grup seçme/seçimini kaldırma işlemi
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Tüm fikstürleri silme fonksiyonu
  const handleDeleteFixtures = async () => {
    if (!confirm("Tüm fikstürler silinecek. Emin misiniz?")) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/fixtures/delete-all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Fikstür silme hatası:", error);
        alert(`Fikstürler silinemedi: ${error.error || 'Bir hata oluştu'}`);
      } else {
        const result = await response.json();
        alert(result.message || "Tüm fikstürler başarıyla silindi!");
        await fetchFixtures();
        await fetchStandings(); // Puan durumunu da yenile
      }
    } catch (error) {
      console.error("Fikstür silme hatası:", error);
      alert("Fikstürler silinemedi: Bağlantı hatası oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col items-center justify-start py-10 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl">
        <h1 className="text-4xl font-extrabold text-blue-700 mb-8 text-center">Process Krallar Futbol Ligi</h1>
        
        {/* Admin giriş/çıkış */}
        <div className="flex justify-end mb-4">
          {isAdmin ? (
            <button
              onClick={handleAdminLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Yönetici Çıkışı
            </button>
          ) : (
            <button
              onClick={() => setShowAdminLogin(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Yönetici Girişi
            </button>
          )}
        </div>
        
        {/* Admin giriş modalı */}
        {showAdminLogin && !isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-80">
              <h2 className="text-xl font-bold mb-4">Yönetici Girişi</h2>
              <div className="mb-4">
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Parola"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
                {adminError && <p className="text-red-500 text-sm mt-1">{adminError}</p>}
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAdminLogin(false)}
                  className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
                >
                  İptal
                </button>
                <button
                  onClick={handleAdminLogin}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Giriş
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Sekmeler */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-semibold ${activeTab === 'groups' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('groups')}
          >
            Gruplar ve Takımlar
          </button>
          <button
            className={`px-4 py-2 font-semibold ${activeTab === 'fixtures' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('fixtures')}
          >
            Fikstür
          </button>
          <button
            className={`px-4 py-2 font-semibold ${activeTab === 'standings' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => {
              setActiveTab('standings');
              fetchStandings(); // Puan durumu sekmesine geçince tekrar yükle
            }}
          >
            Puan Durumu
          </button>
          <a
            href="/canli-skorlar"
            className="px-4 py-2 font-semibold text-green-600 hover:text-green-700 hover:border-b-2 hover:border-green-500"
          >
            Canlı Skorlar
          </a>
          <a
            href="/fikstur"
            className="px-4 py-2 font-semibold text-indigo-600 hover:text-indigo-700 hover:border-b-2 hover:border-indigo-500"
          >
            Fikstür
          </a>
        </div>
        
        {activeTab === 'groups' && (
          <>
            {/* Takım ve Grup Ekleme Alanı */}
            {isAdmin ? (
              <div className="flex flex-col md:flex-row gap-4 mb-8 justify-center items-center bg-gray-50 p-4 rounded-lg shadow-inner">
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Takım Adı"
                    className="border border-blue-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full text-lg"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') handleAddTeam();
                    }}
                    disabled={loading}
                  />
                  <button
                    onClick={handleAddTeam}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition text-lg"
                    disabled={loading}
                  >
                    Takım Ekle
                  </button>
                </div>
                <button
                  onClick={handleCreateGroups}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition text-lg"
                  disabled={loading}
                >
                  Grup Oluştur
                </button>
              </div>
            ) : (
              <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                <p className="text-yellow-700">Takım ve grup yönetimi için yönetici girişi gereklidir.</p>
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Yönetici Girişi
                </button>
              </div>
            )}
            
            {/* Ana İçerik - Takımlar ve Gruplar */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
              {/* Takımlar Listesi */}
              <div className="lg:w-1/3 bg-blue-50 rounded-lg p-6 shadow">
                <h2 className="text-2xl font-bold text-blue-700 mb-4 border-b pb-2">Takımlar</h2>
                <ul className="space-y-2">
                  {teams.map((team, index) => (
                    <li key={team.id || index} className="text-blue-900 flex items-center gap-2 border-b border-blue-100 pb-2">
                      {editTeamId === team.id ? (
                        <>
                          <input
                            className="border rounded px-2 py-1 mr-2 flex-1"
                            value={editTeamName}
                            onChange={e => setEditTeamName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleUpdateTeam(team.id);
                              if (e.key === 'Escape') setEditTeamId(null);
                            }}
                            autoFocus
                          />
                          <button onClick={() => handleUpdateTeam(team.id)} className="text-green-600 font-bold">Kaydet</button>
                          <button onClick={() => setEditTeamId(null)} className="text-gray-500">İptal</button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-lg">{index + 1}. {team.name}</span>
                          <button onClick={() => handleEditTeam(team.id, team.name)} className="text-yellow-600 font-bold ml-2 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded">Düzenle</button>
                          <button onClick={() => handleDeleteTeam(team.id)} className="text-red-600 font-bold ml-1 bg-red-100 hover:bg-red-200 px-2 py-1 rounded">Sil</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Gruplar Listesi */}
              <div className="lg:w-2/3 bg-green-50 rounded-lg p-6 shadow">
                <h2 className="text-2xl font-bold text-green-700 mb-4 border-b pb-2">Gruplar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((group, index) => (
                    <div key={group.id || index} className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                      <div className="flex items-center justify-between mb-2 border-b pb-2">
                        {editGroupId === group.id ? (
                          <>
                            <input
                              className="border rounded px-2 py-1 mr-2 flex-1"
                              value={editGroupName}
                              onChange={e => setEditGroupName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleUpdateGroup(group.id);
                                if (e.key === 'Escape') setEditGroupId(null);
                              }}
                              autoFocus
                            />
                            <div>
                              <button onClick={() => handleUpdateGroup(group.id)} className="text-green-600 font-bold mr-1 bg-green-100 hover:bg-green-200 px-2 py-1 rounded">Kaydet</button>
                              <button onClick={() => setEditGroupId(null)} className="text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">İptal</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-xl font-semibold text-green-800">{group.name}</span>
                            <div>
                              {/* Süper yönetici olmayan kullanıcılar için düzenleme ve silme butonlarını gizle */}
                              {isSuperAdmin && (
                                <>
                                  <button onClick={() => handleEditGroup(group.id, group.name)} className="text-yellow-600 font-bold mr-1 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded">Düzenle</button>
                                  <button onClick={() => handleDeleteGroup(group.id)} className="text-red-600 font-bold bg-red-100 hover:bg-red-200 px-2 py-1 rounded">Sil</button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Seri başı takım seçimi */}
                      <div className="flex items-center gap-2 mt-3 mb-2">
                        <span className="text-green-700 font-medium">Seri Başı:</span>
                        <select
                          className="border rounded-lg px-3 py-2 bg-white shadow-sm flex-1"
                          value={group.teams.find((t:any) => t.isSeed)?.id || ''}
                          onChange={e => handleSeedTeam(group.id, e.target.value)}
                          disabled={loading || !teams.length}
                        >
                          <option value="">Seçiniz</option>
                          {teams
                            // İki koşula dikkat et:
                            // 1. Takım başka bir grupta seri başı değilse VEYA bu grubun seri başıysa listelenecek
                            .filter((team:any) => {
                              // Bu takım başka bir grupta seri başı mı?
                              const isAlreadySeedElsewhere = groups.some(g => 
                                g.id !== group.id && // farklı bir grup
                                g.teams.some((t: any) => t.id === team.id && t.isSeed) // ve orada seri başı
                              );
                              // Bu takım bu grubun zaten seri başı mı?
                              const isThisGroupsSeed = group.teams.some((t: any) => t.id === team.id && t.isSeed);
                              
                              // Takım ya başka grupta seri başı değilse YA DA bu grubun seri başıysa listelenecek
                              return !isAlreadySeedElsewhere || isThisGroupsSeed;
                            })
                            .map((team:any) => (
                              <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                      </div>

                      {/* Seri başı takım adı gösterimi */}
                      {group.teams.find((t:any) => t.isSeed) && (
                        <div className="font-bold text-green-700 mt-1 bg-green-100 p-2 rounded-lg shadow-inner">
                          ⭐ Seri Başı: {group.teams.find((t:any) => t.isSeed)?.name}
                        </div>
                      )}

                      {/* Gruptaki tüm takımlar listesi */}
                      {group.teams.length > 0 && (
                        <div className="mt-3 bg-gray-50 p-3 rounded-lg shadow-inner">
                          <h4 className="text-sm font-medium text-green-800 mb-2 border-b pb-1">Takımlar:</h4>
                          <ul className="space-y-1">
                            {group.teams.map((team: any) => (
                              <li key={team.id} className={`pl-2 py-1 ${team.isSeed ? 'font-bold bg-green-50 rounded' : ''}`}>
                                {team.name} {team.isSeed && '⭐'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Kura Çekme Butonu */}
                {groups.length > 1 && isAdmin && (
                  <div className="mt-4 mb-6">
                    <button
                      onClick={handleDraw}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 px-6 rounded-lg font-bold transition flex items-center justify-center"
                      disabled={loading}
                    >
                      <span className="mr-2">🎲</span>
                      Takımları Gruplara Otomatik Dağıt
                    </button>
                  </div>
                )}
                
                {/* Fikstür Oluşturma Düğmeleri */}
                {groups.length > 1 && isAdmin && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-xl font-bold text-blue-700 mb-3">Fikstür Oluşturma</h3>
                    
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      <button
                        onClick={handleCreateFixtures}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-bold transition"
                        disabled={loading || !groups.length}
                      >
                        Grup İçi Fikstür Oluştur
                      </button>
                      
                      <div className="flex-1 flex flex-col">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {groups.map(group => (
                            <label key={group.id} className="inline-flex items-center p-2 bg-white rounded-lg shadow-sm">
                              <input
                                type="checkbox"
                                className="mr-2"
                                checked={selectedGroupIds.includes(group.id)}
                                onChange={() => toggleGroupSelection(group.id)}
                              />
                              {group.name}
                            </label>
                          ))}
                        </div>
                        <button
                          onClick={handleCreateCrossGroupFixtures}
                          className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-bold transition"
                          disabled={loading || selectedGroupIds.length < 2}
                        >
                          Gruplar Arası Fikstür Oluştur
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tüm Verileri Sil Butonu */}
                {isAdmin && (
                  <button
                    onClick={handleDeleteAll}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold transition mt-4 text-lg"
                    disabled={loading}
                  >
                    Tüm Verileri Sil
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'fixtures' && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-blue-700 mb-4 border-b pb-2">Fikstür</h2>
            
            {fixtures.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-4">Henüz bir fikstür oluşturulmamış.</p>
                <button
                  onClick={() => setActiveTab('groups')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Gruplar Sayfasına Dön
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold">Fikstür</h3>
                  <div className="flex space-x-2">
                    {isAdmin && (
                      <>
                        <button
                          onClick={handleCreateFixtures}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                          disabled={loading}
                        >
                          {loading ? 'İşlem Yapılıyor...' : 'Fikstür Oluştur'}
                        </button>
                        <button
                          onClick={handleDeleteFixtures}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                          disabled={loading}
                        >
                          {loading ? 'İşlem Yapılıyor...' : 'Tüm Fikstürleri Sil'}
                        </button>
                      </>
                    )}
                    <a
                      href="/canli-skorlar"
                      className="ml-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center"
                    >
                      <span>Canlı Skorlar</span>
                      <span className="ml-1 inline-block w-2 h-2 rounded-full bg-green-300"></span>
                    </a>
                    <a
                      href="/fikstur"
                      className="ml-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center"
                    >
                      <span>Fikstür Sayfası</span>
                    </a>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {fixtures.sort((a, b) => a.round - b.round).map((fixture) => (
                    <div key={fixture.id} className="border rounded-lg p-4 shadow-sm bg-gray-50">
                      <h3 className="text-lg font-bold mb-2">
                        {fixture.round}. Tur - {fixture.name || 'Maçlar'}
                      </h3>
                      <div className="space-y-3">
                        {fixture.matches.map((match: any) => (
                          <div key={match.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center">
                            <div className="w-4/12 text-right font-medium">
                              <span className="mr-2 text-xs bg-green-100 text-green-700 rounded px-1">
                                {groups.find(g => g.id === match.homeTeam.groupId)?.name}
                              </span>
                              {match.homeTeam.name}
                            </div>
                            
                            <div className="w-4/12 flex justify-center items-center">
                              {isAdmin ? (
                                <>
                                  <input
                                    type="text"
                                    className="w-10 text-center border border-gray-300 rounded-md py-1"
                                    value={matchScores[match.id]?.homeScore || ''}
                                    onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                                    placeholder="0"
                                  />
                                  <span className="mx-2 text-gray-500">-</span>
                                  <input
                                    type="text"
                                    className="w-10 text-center border border-gray-300 rounded-md py-1"
                                    value={matchScores[match.id]?.awayScore || ''}
                                    onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                                    placeholder="0"
                                  />
                                  <button
                                    className="ml-2 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md text-sm"
                                    onClick={() => updateMatchScore(match.id)}
                                  >
                                    Kaydet
                                  </button>
                                  <button
                                    className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-sm"
                                    onClick={() => updateMatchScore(match.id, true)}
                                  >
                                    Maçı Bitir
                                  </button>
                                </>
                              ) : (
                                <span className="bg-gray-100 px-2 py-1 rounded-md">
                                  {match.homeScore !== null && match.awayScore !== null 
                                    ? `${match.homeScore} - ${match.awayScore}` 
                                    : 'vs'}
                                </span>
                              )}
                            </div>
                            
                            <div className="w-4/12 text-left font-medium">
                              <span className="mr-2 text-xs bg-green-100 text-green-700 rounded px-1">
                                {groups.find(g => g.id === match.awayTeam.groupId)?.name}
                              </span>
                              {match.awayTeam.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Puan Durumu Sekmesi - Yeni sekme */}
        {activeTab === 'standings' && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-blue-700 mb-4 border-b pb-2">Puan Durumu</h2>
            
            {standings.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-4">Henüz puan durumu oluşturulmamış.</p>
                <p className="text-gray-500 mb-4">Puan durumunun görüntülenmesi için maç skorlarının girilmesi gerekir.</p>
                <button
                  onClick={() => setActiveTab('fixtures')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Fikstür Sayfasına Dön
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Grupların karşılaştırması - en iyi takımlar */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-blue-600 mb-3">Grup Sıralaması</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sıra</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grup</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">En İyi Takım</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Puan</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">En İyi Puan</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Maç Sayısı</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">G</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">B</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">M</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {standings
                          // Her grup için veri hesapla
                          .map(group => {
                            // En iyi takım
                            const bestTeam = group.standings.length > 0 ? group.standings[0] : null;
                            
                            // Grubun toplam puanı, tüm takımların puanlarının toplamı
                            const totalPoints = group.standings.reduce((sum: number, team: any) => sum + team.points, 0);
                            
                            // Grubun toplam galibiyet, beraberlik, mağlubiyet sayıları
                            const totalWins = group.standings.reduce((sum: number, team: any) => sum + team.won, 0);
                            const totalDraws = group.standings.reduce((sum: number, team: any) => sum + team.drawn, 0);
                            const totalLosses = group.standings.reduce((sum: number, team: any) => sum + team.lost, 0);
                            
                            // Grubun toplam maç sayısı
                            const totalMatches = group.standings.reduce((sum: number, team: any) => sum + team.played, 0);
                            
                            return {
                              groupId: group.groupId,
                              groupName: group.groupName,
                              bestTeam,
                              totalPoints,
                              totalWins,
                              totalDraws,
                              totalLosses,
                              totalMatches
                            };
                          })
                          // Sadece en iyi takımı olan grupları filtrele
                          .filter(group => group.bestTeam)
                          // Grupların toplam puanlarına göre sırala
                          .sort((a, b) => {
                            // Toplam puan farkı
                            if (b.totalPoints !== a.totalPoints) {
                              return b.totalPoints - a.totalPoints;
                            }
                            // Aynı puanda galibiyet sayısı
                            if (b.totalWins !== a.totalWins) {
                              return b.totalWins - a.totalWins;
                            }
                            // Alfabetik sıralama
                            return a.groupName.localeCompare(b.groupName);
                          })
                          .map((group, index) => {
                            if (!group.bestTeam) return null;
                            return (
                              <tr key={group.groupId} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="px-3 py-2 text-center font-bold">{index + 1}</td>
                                <td className="px-3 py-2 whitespace-nowrap font-medium">{group.groupName}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{group.bestTeam.teamName}</td>
                                <td className="px-3 py-2 text-center font-bold">{group.totalPoints}</td>
                                <td className="px-3 py-2 text-center">{group.bestTeam.points}</td>
                                <td className="px-3 py-2 text-center">{group.totalMatches}</td>
                                <td className="px-3 py-2 text-center">{group.totalWins}</td>
                                <td className="px-3 py-2 text-center">{group.totalDraws}</td>
                                <td className="px-3 py-2 text-center">{group.totalLosses}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grup bazlı puan durumu */}
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {standings.map((group) => {
                      // Grubun sıralamasını bul
                      const groupRanking = standings
                        .map(g => ({
                          groupId: g.groupId,
                          totalPoints: g.standings.reduce((sum: number, team: any) => sum + team.points, 0)
                        }))
                        .sort((a, b) => b.totalPoints - a.totalPoints)
                        .findIndex(g => g.groupId === group.groupId) + 1;

                      return (
                        <div key={group.groupId} className="border rounded-lg overflow-hidden">
                          <div className="bg-blue-100 p-2 border-b font-bold flex justify-between items-center">
                            <span>{group.groupName}</span>
                            {groupRanking > 0 && (
                              <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                                {groupRanking}. Sıra
                              </span>
                            )}
                          </div>
                          
                          <table className="min-w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Takım</th>
                                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">O</th>
                                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">G</th>
                                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">B</th>
                                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">M</th>
                                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">AV</th>
                                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">P</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {group.standings.map((team: any, index: number) => (
                                <tr key={team.teamId} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                  <td className="px-2 py-2 whitespace-nowrap font-medium">{team.teamName}</td>
                                  <td className="px-2 py-2 text-center">{team.played}</td>
                                  <td className="px-2 py-2 text-center">{team.won}</td>
                                  <td className="px-2 py-2 text-center">{team.drawn}</td>
                                  <td className="px-2 py-2 text-center">{team.lost}</td>
                                  <td className="px-2 py-2 text-center">{team.goalDifference}</td>
                                  <td className="px-2 py-2 text-center font-bold">{team.points}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Yükleniyor göstergesi */}
        {loading && (
          <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="text-center text-blue-700 text-xl">İşlem yapılıyor...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
