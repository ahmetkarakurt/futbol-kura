import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Gruplar arası fikstür oluşturma 
export async function POST(request: Request) {
  try {
    const { groupIds } = await request.json();
    
    // groupIds yoksa hata döndür
    if (!groupIds || !Array.isArray(groupIds) || groupIds.length < 2) {
      return NextResponse.json({ 
        error: 'En az iki grup ID\'si gönderilmelidir' 
      }, { status: 400 });
    }

    // Belirtilen grupları getir
    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds } },
      include: { teams: true }
    });

    // Tüm gruplar yoksa hata döndür
    if (groups.length !== groupIds.length) {
      return NextResponse.json({ error: 'Bir veya daha fazla grup bulunamadı' }, { status: 404 });
    }

    // Gruplardan takımları topla ve boş kontrol et
    for (const group of groups) {
      if (group.teams.length === 0) {
        return NextResponse.json({ error: `${group.name} grubunda takım bulunmamaktadır` }, { status: 400 });
      }
    }

    // Mevcut fikstürleri temizleyip yeni fikstürler oluştur
    await prisma.match.deleteMany({});
    await prisma.fixture.deleteMany({});

    let fixtureData = [];
    
    // Tam olarak 4 grup varsa özel fikstür düzeni kullan
    if (groups.length === 4) {
      // Özel fikstür düzeni
      const matchups = [
        // 1. Tur: 1-2 ve 3-4 grupları karşılaşacak
        { round: 1, pairs: [[0, 1], [2, 3]], title: `${groups[0].name} - ${groups[1].name} & ${groups[2].name} - ${groups[3].name}` },
        // 2. Tur: 1-3 ve 2-4 grupları karşılaşacak
        { round: 2, pairs: [[0, 2], [1, 3]], title: `${groups[0].name} - ${groups[2].name} & ${groups[1].name} - ${groups[3].name}` },
        // 3. Tur: 1-4 ve 2-3 grupları karşılaşacak
        { round: 3, pairs: [[0, 3], [1, 2]], title: `${groups[0].name} - ${groups[3].name} & ${groups[1].name} - ${groups[2].name}` }
      ];

      // Her tur için
      for (const matchup of matchups) {
        const roundMatches = [];

        // Her grup çifti için
        for (const [groupIdx1, groupIdx2] of matchup.pairs) {
          const group1 = groups[groupIdx1];
          const group2 = groups[groupIdx2];

          // Her grup çifti için 3 maç oluştur (veya daha az, eğer yeterli takım yoksa)
          const maxMatches = 3;
          const actualMatches = Math.min(maxMatches, Math.max(group1.teams.length, group2.teams.length));

          for (let i = 0; i < actualMatches; i++) {
            // Eğer takım sayısı yeterli değilse, mevcut takımları dönüşümlü olarak kullan
            const homeTeamIdx = i % group1.teams.length;
            const awayTeamIdx = i % group2.teams.length;

            roundMatches.push({
              homeTeamId: group1.teams[homeTeamIdx].id,
              awayTeamId: group2.teams[awayTeamIdx].id,
              homeTeam: group1.teams[homeTeamIdx],
              awayTeam: group2.teams[awayTeamIdx],
              homeGroupName: group1.name,
              awayGroupName: group2.name
            });
          }
        }

        fixtureData.push({
          round: matchup.round,
          title: matchup.title,
          matches: roundMatches
        });
      }
    } else {
      // 4'ten farklı sayıda grup için genel algoritma
      let round = 1;
      
      // Her grup çifti için
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const group1 = groups[i];
          const group2 = groups[j];
          
          const roundMatches = [];
          
          // Her gruptan 3 takım eşleştir (veya daha az, eğer yeterli takım yoksa)
          const maxMatches = 3;
          const actualMatches = Math.min(maxMatches, Math.max(group1.teams.length, group2.teams.length));
          
          for (let k = 0; k < actualMatches; k++) {
            // Eğer takım sayısı yeterli değilse, mevcut takımları dönüşümlü olarak kullan
            const homeTeamIdx = k % group1.teams.length;
            const awayTeamIdx = k % group2.teams.length;
            
            roundMatches.push({
              homeTeamId: group1.teams[homeTeamIdx].id,
              awayTeamId: group2.teams[awayTeamIdx].id,
              homeTeam: group1.teams[homeTeamIdx],
              awayTeam: group2.teams[awayTeamIdx],
              homeGroupName: group1.name,
              awayGroupName: group2.name
            });
          }
          
          if (roundMatches.length > 0) {
            fixtureData.push({
              round,
              title: `${group1.name} - ${group2.name}`,
              matches: roundMatches
            });
            round++;
          }
        }
      }
    }

    if (fixtureData.length === 0) {
      return NextResponse.json({ error: 'Eşleştirilecek yeterli takım yok' }, { status: 400 });
    }

    // Fikstürleri veritabanına kaydet
    let createdFixtures = [];
    
    for (const roundData of fixtureData) {
      const fixture = await prisma.fixture.create({
        data: {
          round: roundData.round,
          name: roundData.title, // Ana grup yerine anlamlı bir başlık kullan
          groupId: null, // Artık belirli bir grup ile ilişkilendirmiyoruz
          matches: {
            create: roundData.matches.map((match) => ({
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId
            }))
          }
        },
        include: {
          matches: {
            include: {
              homeTeam: true,
              awayTeam: true
            }
          }
        }
      });
      
      createdFixtures.push(fixture);
    }
    
    // Toplam maç sayısını hesapla
    const totalMatches = fixtureData.reduce((sum, round) => sum + round.matches.length, 0);
    const matchesPerRound = fixtureData.map(round => round.matches.length);
    const roundInfo = matchesPerRound.map((matches, idx) => `${idx+1}. tur: ${matches} maç`).join(", ");

    return NextResponse.json({ 
      success: true, 
      message: `${fixtureData.length} turda toplam ${totalMatches} gruplar arası maç oluşturuldu. ${roundInfo}`,
      fixtures: createdFixtures 
    });
  } catch (error) {
    console.error('Gruplar arası fikstür oluşturma hatası:', error);
    return NextResponse.json({ error: 'Gruplar arası fikstür oluşturulamadı' }, { status: 500 });
  }
} 