import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { addClient, removeClient } from '../utils/events';

const prisma = new PrismaClient();

// SSE bağlantısı için endpoint
export async function GET(request: NextRequest) {
  // Her bağlantı için benzersiz bir ID oluştur
  const clientId = Math.random().toString(36).substring(2, 15);
  
  // Stream oluştur
  const stream = new ReadableStream({
    start(controller) {
      // Yeni istemciyi clients listesine ekle
      addClient(clientId, controller);
      
      // İlk bağlantı mesajını gönder
      controller.enqueue(`data: ${JSON.stringify({ type: 'connection', message: 'Bağlantı kuruldu' })}\n\n`);
    },
    cancel() {
      // Bağlantı kapandığında istemciyi listeden kaldır
      removeClient(clientId);
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

 