import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Tüm takımları getir
    const teams = await prisma.team.findMany({
      include: {
        group: true
      }
    });

    // Tüm oynanan maçları getir
    const matches = await prisma.match.findMany({
      where: {
        played: true
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    // Takım bazında istatistikler
    const teamStats = teams.map(team => {
      // Takımın ev sahibi olduğu maçlar
      const homeMatches = matches.filter(match => match.homeTeamId === team.id);
      // Takımın deplasmanda olduğu maçlar
      const awayMatches = matches.filter(match => match.awayTeamId === team.id);
      
      // Temel istatistikler
      let played = homeMatches.length + awayMatches.length;
      let won = 0;
      let drawn = 0;
      let lost = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      
      // Ev sahibi olduğu maçlardaki istatistikler
      homeMatches.forEach(match => {
        const homeScore = match.homeScore || 0;
        const awayScore = match.awayScore || 0;
        
        goalsFor += homeScore;
        goalsAgainst += awayScore;
        
        if (homeScore > awayScore) won++;
        else if (homeScore === awayScore) drawn++;
        else lost++;
      });
      
      // Deplasmanda olduğu maçlardaki istatistikler
      awayMatches.forEach(match => {
        const homeScore = match.homeScore || 0;
        const awayScore = match.awayScore || 0;
        
        goalsFor += awayScore;
        goalsAgainst += homeScore;
        
        if (awayScore > homeScore) won++;
        else if (awayScore === homeScore) drawn++;
        else lost++;
      });
      
      // Toplam puanlar (Galibiyet: 3, Beraberlik: 1, Mağlubiyet: 0)
      const points = (won * 3) + (drawn * 1);
      
      return {
        teamId: team.id,
        teamName: team.name,
        groupId: team.groupId,
        groupName: team.group?.name || 'Grupsuz',
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        points
      };
    });
    
    // Takımları puana göre sırala
    const sortedTeams = teamStats.sort((a, b) => {
      // Puan farkı
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // Aynı puanda gol farkı
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      // Aynı gol farkında atılan gol
      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }
      // Alfabetik sıralama
      return a.teamName.localeCompare(b.teamName);
    });

    return NextResponse.json(sortedTeams);
  } catch (error) {
    console.error('Takım istatistikleri hesaplama hatası:', error);
    return NextResponse.json({ error: 'Takım istatistikleri hesaplanamadı' }, { status: 500 });
  }
} 