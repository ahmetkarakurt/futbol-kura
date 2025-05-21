import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Test verisi oluştur
    const testTeam = await prisma.team.create({
      data: {
        name: "Test Takım",
        isSeed: false
      }
    });

    // Tüm takımları getir
    const teams = await prisma.team.findMany();

    return NextResponse.json({
      success: true,
      message: "Veritabanı bağlantısı başarılı",
      testTeam,
      allTeams: teams
    });
  } catch (error) {
    console.error('Veritabanı test hatası:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      details: error
    }, { status: 500 });
  }
} 