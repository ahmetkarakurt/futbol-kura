import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tüm fikstürleri getir
export async function GET() {
  try {
    const fixtures = await prisma.fixture.findMany({
      include: {
        group: true,
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
      orderBy: {
        round: 'asc'
      }
    });
    return NextResponse.json(fixtures);
  } catch (error) {
    console.error('Fikstür listeleme hatası:', error);
    return NextResponse.json({ error: 'Fikstürler listelenemedi' }, { status: 500 });
  }
}

// Fikstür oluştur
export async function POST(request: Request) {
  try {
    // Mevcut fikstürleri temizle
    await prisma.match.deleteMany({});
    await prisma.fixture.deleteMany({});

    // Grupları getir
    const groups = await prisma.group.findMany({
      include: { teams: true }
    });

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Önce gruplar oluşturulmalı' }, { status: 400 });
    }

    let createdFixtures = [];

    // Her grup için fikstür oluştur
    for (const group of groups) {
      if (group.teams.length < 2) {
        continue; // En az 2 takım olmadan fikstür oluşturulamaz
      }

      // Lig usulü fikstür oluştur (her takım birbiriyle bir kez karşılaşır)
      const teams = group.teams;
      const fixtureRounds: any[] = [];
      
      // Round-robin algoritması
      for (let round = 0; round < teams.length - 1; round++) {
        const roundMatches = [];
        for (let i = 0; i < teams.length / 2; i++) {
          const home = i;
          const away = teams.length - 1 - i;
          
          // Çift sayılı takım sayısı için geçerli maç kombinasyonu
          if (home !== away) {
            roundMatches.push({
              homeTeamId: teams[home].id,
              awayTeamId: teams[away].id
            });
          }
        }
        fixtureRounds.push({ round: round + 1, matches: roundMatches });
        
        // Takımları döndür (ilk takım sabit kalır)
        const teamsToRotate = teams.slice(1);
        teams.splice(1, teams.length - 1, teamsToRotate[teamsToRotate.length - 1], ...teamsToRotate.slice(0, teamsToRotate.length - 1));
      }

      // Fikstürleri veritabanına kaydet
      for (const roundData of fixtureRounds) {
        const fixture = await prisma.fixture.create({
          data: {
            round: roundData.round,
            groupId: group.id,
            matches: {
              create: roundData.matches.map((match: any) => ({
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
    }

    return NextResponse.json({ 
      success: true, 
      message: `Fikstürler başarıyla oluşturuldu.`,
      fixtures: createdFixtures
    });
  } catch (error) {
    console.error('Fikstür oluşturma hatası:', error);
    return NextResponse.json({ error: 'Fikstür oluşturulamadı' }, { status: 500 });
  }
} 