import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Kura çekme: Seri başı olmayan takımları rastgele gruplara dağıt
export async function POST() {
  try {
    const groups = await prisma.group.findMany();
    
    if (groups.length === 0) {
      return NextResponse.json({ error: 'Önce grup oluşturmalısınız' }, { status: 400 });
    }
    
    // Grupların id listesini alma
    const groupIds = groups.map(g => g.id);
    
    // Seri başı olmayan ve henüz grup atanmayan takımları bulma
    const nonSeedTeams = await prisma.team.findMany({
      where: { 
        isSeed: false
      }
    });
    
    if (nonSeedTeams.length === 0) {
      return NextResponse.json({ error: 'Dağıtılacak takım bulunmuyor' }, { status: 400 });
    }
    
    // Takımları karıştır
    const shuffled = [...nonSeedTeams].sort(() => Math.random() - 0.5);
    
    // Takımları gruplara eşit dağıt
    const groupCount = groups.length;
    
    for (let i = 0; i < shuffled.length; i++) {
      const groupId = groupIds[i % groupCount];
      await prisma.team.update({ 
        where: { id: shuffled[i].id }, 
        data: { groupId } 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${shuffled.length} takım ${groupCount} gruba rastgele dağıtıldı.` 
    });
  } catch (error) {
    console.error('Kura çekme hatası:', error);
    return NextResponse.json({ error: 'Kura çekilemedi' }, { status: 500 });
  }
} 