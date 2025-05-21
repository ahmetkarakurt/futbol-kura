import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Grup oluşturma
export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const group = await prisma.group.create({
      data: { name },
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error('Grup oluşturma hatası:', error);
    return NextResponse.json({ error: 'Grup oluşturulamadı' }, { status: 500 });
  }
}

// Grupları listeleme
export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      include: { teams: true },
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Grup listeleme hatası:', error);
    return NextResponse.json({ error: 'Gruplar listelenemedi' }, { status: 500 });
  }
}

// Grup silme - hem tek grup hem tüm grupları silme
export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    
    // Tüm grupları silme (deleteAll parametresi true ise)
    if (data.deleteAll) {
      await prisma.group.deleteMany({});
      return NextResponse.json({ success: true, message: 'Tüm gruplar silindi' });
    }
    
    // Tekil grup silme
    const { id } = data;
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }
    
    await prisma.group.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Grup silme hatası:', error);
    return NextResponse.json({ error: 'Grup silinemedi' }, { status: 500 });
  }
}

// Grup güncelleme ve seri başı atama
export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    
    // Seri başı takım atama işlemi
    if (data.seedTeam) {
      const { groupId, teamId } = data;
      
      // Önce bu takım başka grupta seri başıysa kaldır
      await prisma.team.updateMany({ 
        where: { id: teamId }, 
        data: { isSeed: false } 
      });
      
      // O gruptaki tüm takımların seri başı özelliğini kaldır
      await prisma.team.updateMany({ 
        where: { groupId }, 
        data: { isSeed: false } 
      });
      
      // Seçilen takımı bu gruba ata ve seri başı yap
      const updatedSeed = await prisma.team.update({ 
        where: { id: teamId }, 
        data: { isSeed: true, groupId } 
      });
      
      return NextResponse.json(updatedSeed);
    }
    
    // Normal grup güncelleme
    const { id, name } = data;
    const updated = await prisma.group.update({ where: { id }, data: { name } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Grup güncelleme/seri başı atama hatası:', error);
    return NextResponse.json({ error: 'İşlem başarısız oldu' }, { status: 500 });
  }
} 