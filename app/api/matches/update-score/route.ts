import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { notifyClients } from '../../utils/events';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { matchId, homeScore, awayScore, finishMatch } = await request.json();

    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json(
        { error: 'Tüm alanlar gereklidir (matchId, homeScore, awayScore)' },
        { status: 400 }
      );
    }

    // Negatif skor olamaz
    if (homeScore < 0 || awayScore < 0) {
      return NextResponse.json(
        { error: 'Skorlar negatif olamaz' },
        { status: 400 }
      );
    }

    // Maçın son durumunu kontrol et
    const currentMatch = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeScore: true, awayScore: true }
    });

    if (!currentMatch) {
      return NextResponse.json(
        { error: 'Maç bulunamadı' },
        { status: 404 }
      );
    }

    // Gol oldu mu kontrol et
    const goalScored = (
      (currentMatch.homeScore !== homeScore || currentMatch.awayScore !== awayScore) && 
      (currentMatch.homeScore !== null || currentMatch.awayScore !== null)
    );

    // Hangi takım gol attı?
    let scoringTeam = null;
    if (goalScored) {
      if (currentMatch.homeScore !== null && homeScore > currentMatch.homeScore) {
        scoringTeam = 'home';
      } else if (currentMatch.awayScore !== null && awayScore > currentMatch.awayScore) {
        scoringTeam = 'away';
      }
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        // Eğer finishMatch parametresi varsa ve true ise maçı tamamla
        ...(finishMatch ? { played: true } : {})
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        fixture: true
      }
    });

    // Tüm istemcilere güncelleme bildir
    notifyClients({
      type: 'score-update',
      match: updatedMatch,
      goalScored,
      scoringTeam,
      finishMatch: finishMatch === true
    });

    return NextResponse.json({
      success: true,
      message: finishMatch ? 'Maç tamamlandı' : 'Maç skoru başarıyla güncellendi',
      match: updatedMatch
    });
  } catch (error) {
    console.error('Skor güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Skor güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 