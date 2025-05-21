import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Tüm grupları ve takımları getir
    const groups = await prisma.group.findMany({
      include: {
        teams: true
      }
    });

    // Tüm maçları getir
    const matches = await prisma.match.findMany({
      where: {
        played: true
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        fixture: {
          include: {
            group: true
          }
        }
      }
    });

    // Grup bazında puan durumu
    const standings = groups.map(group => {
      const teamStats: Record<string, {
        teamId: string;
        teamName: string;
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
      }> = {};

      // Her grubun takımları için başlangıç durumu
      group.teams.forEach(team => {
        teamStats[team.id] = {
          teamId: team.id,
          teamName: team.name,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        };
      });

      // Bu gruba ait maçları filtrele
      const groupMatches = matches.filter(match => 
        // Maç direkt bu gruba ait veya
        match.fixture.groupId === group.id ||
        // Takımlardan biri bu gruba ait ise (gruplar arası maçlar için)
        group.teams.some(team => team.id === match.homeTeamId || team.id === match.awayTeamId)
      );

      // Her maç için puan hesapla
      groupMatches.forEach(match => {
        const homeTeamId = match.homeTeamId;
        const awayTeamId = match.awayTeamId;
        const homeScore = match.homeScore || 0;
        const awayScore = match.awayScore || 0;

        // Ev sahibi takım bu gruba ait mi?
        if (teamStats[homeTeamId]) {
          teamStats[homeTeamId].played++;
          teamStats[homeTeamId].goalsFor += homeScore;
          teamStats[homeTeamId].goalsAgainst += awayScore;

          if (homeScore > awayScore) {
            teamStats[homeTeamId].won++;
            teamStats[homeTeamId].points += 3;
          } else if (homeScore === awayScore) {
            teamStats[homeTeamId].drawn++;
            teamStats[homeTeamId].points += 1;
          } else {
            teamStats[homeTeamId].lost++;
          }
        }

        // Deplasman takımı bu gruba ait mi?
        if (teamStats[awayTeamId]) {
          teamStats[awayTeamId].played++;
          teamStats[awayTeamId].goalsFor += awayScore;
          teamStats[awayTeamId].goalsAgainst += homeScore;

          if (awayScore > homeScore) {
            teamStats[awayTeamId].won++;
            teamStats[awayTeamId].points += 3;
          } else if (homeScore === awayScore) {
            teamStats[awayTeamId].drawn++;
            teamStats[awayTeamId].points += 1;
          } else {
            teamStats[awayTeamId].lost++;
          }
        }
      });

      // Her takımın gol farkını hesapla
      Object.values(teamStats).forEach(team => {
        team.goalDifference = team.goalsFor - team.goalsAgainst;
      });

      // Takımları puana göre sırala
      const sortedTeams = Object.values(teamStats).sort((a, b) => {
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

      return {
        groupId: group.id,
        groupName: group.name,
        standings: sortedTeams
      };
    });

    return NextResponse.json(standings);
  } catch (error) {
    console.error('Puan durumu hesaplama hatası:', error);
    return NextResponse.json({ error: 'Puan durumu hesaplanamadı' }, { status: 500 });
  }
} 