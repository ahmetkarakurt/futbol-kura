import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE() {
  try {
    await prisma.group.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Grup silme hatası:', error);
    return NextResponse.json({ error: 'Gruplar silinemedi' }, { status: 500 });
  }
} 