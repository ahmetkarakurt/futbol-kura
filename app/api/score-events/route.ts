import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { addClient, removeClient } from '../utils/events';

const prisma = new PrismaClient();

// Bu değişken tüm bağlanan istemcileri tutacak
let clients: { id: string; controller: ReadableStreamController<any> }[] = [];

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

// Diğer endpoint'ler maçları güncellediğinde tüm istemcilere haber ver
function notifyClients(data: any) {
  const eventData = `data: ${JSON.stringify(data)}\n\n`;
  
  // Tüm bağlı istemcilere veriyi gönder
  clients.forEach(client => {
    try {
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(eventData);
      client.controller.enqueue(encodedData);
    } catch (error) {
      console.error(`İstemciye bildirim gönderilirken hata: ${error}`);
      // Hata durumunda istemciyi listeden kaldır
      clients = clients.filter(c => c.id !== client.id);
    }
  });
} 