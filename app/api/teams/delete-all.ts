import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE() {
  try {
    await prisma.team.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Takım silme hatası:', error);
    return NextResponse.json({ error: 'Takımlar silinemedi' }, { status: 500 });
  }
} 