import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Takım ekleme
export async function POST(request: Request) {
  try {
    const { name, isSeed } = await request.json();
    const team = await prisma.team.create({
      data: { name, isSeed },
    });
    return NextResponse.json(team);
  } catch (error) {
    console.error('Takım ekleme hatası:', error);
    return NextResponse.json({ error: 'Takım eklenemedi' }, { status: 500 });
  }
}

// Takımları listeleme
export async function GET() {
  try {
    const teams = await prisma.team.findMany();
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Takım listeleme hatası:', error);
    return NextResponse.json({ error: 'Takımlar listelenemedi' }, { status: 500 });
  }
}

// Takım silme - hem tek takım hem tüm takımları silme
export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    
    // Tüm takımları silme (deleteAll parametresi true ise)
    if (data.deleteAll) {
      await prisma.team.deleteMany({});
      return NextResponse.json({ success: true, message: 'Tüm takımlar silindi' });
    }
    
    // Tekil takım silme
    const { id } = data;
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }
    
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Takım silme hatası:', error);
    return NextResponse.json({ error: 'Takım silinemedi' }, { status: 500 });
  }
}

// Takım güncelleme
export async function PATCH(request: Request) {
  try {
    const { id, name } = await request.json();
    const updated = await prisma.team.update({ where: { id }, data: { name } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Takım güncelleme hatası:', error);
    return NextResponse.json({ error: 'Takım güncellenemedi' }, { status: 500 });
  }
} 