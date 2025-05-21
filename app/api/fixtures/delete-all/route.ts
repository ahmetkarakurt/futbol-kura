import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tüm fikstürleri silmek için API endpoint
export async function DELETE() {
  try {
    // Önce tüm maçları sil (foreign key kısıtlaması)
    await prisma.match.deleteMany({});
    
    // Sonra tüm fikstürleri sil
    await prisma.fixture.deleteMany({});
    
    // Maçlar silindiğinde takımların istatistiklerine yansıması için
    // Tüm takımlardaki played alanını false yap
    await prisma.match.updateMany({
      data: {
        played: false,
        homeScore: null,
        awayScore: null
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Tüm fikstürler ve maç sonuçları başarıyla silindi"
    });
  } catch (error) {
    console.error('Fikstür silme hatası:', error);
    return NextResponse.json({ error: 'Fikstürler silinemedi' }, { status: 500 });
  }
} 